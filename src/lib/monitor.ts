import * as tls from "tls";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/notify";

const SSL_WARN_DAYS = 30;

// Create alerts for down / SSL-expiry transitions and email them (best effort).
// Reads each domain's previous status, so must run BEFORE new logs are inserted.
async function processAlerts(
  results: CheckResult[],
  domainsById: Map<string, { id: string; url: string }>
): Promise<number> {
  const ids = results.map((r) => r.domainId);

  const prevLogs = await Promise.all(
    ids.map((domainId) =>
      prisma.checkLog.findFirst({
        where: { domainId },
        orderBy: { checkedAt: "desc" },
        select: { isUp: true },
      })
    )
  );
  const prevByDomain = new Map(ids.map((id, i) => [id, prevLogs[i]]));

  const openSsl = await prisma.alert.findMany({
    where: { type: "ssl_expiring", readAt: null, domainId: { in: ids } },
    select: { domainId: true },
  });
  const openSslDomains = new Set(openSsl.map((a) => a.domainId));

  const toCreate: { domainId: string; type: string; message: string }[] = [];

  for (const r of results) {
    const url = domainsById.get(r.domainId)?.url ?? r.domainId;

    const prev = prevByDomain.get(r.domainId);
    if (!r.isUp && prev?.isUp !== false) {
      toCreate.push({
        domainId: r.domainId,
        type: "down",
        message: `${url} is down${
          r.statusCode ? ` (HTTP ${r.statusCode})` : r.error ? ` (${r.error})` : ""
        }`,
      });
    }

    if (r.isUp && r.sslExpiry && !openSslDomains.has(r.domainId)) {
      const days = Math.ceil(
        (r.sslExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 0 && days <= SSL_WARN_DAYS) {
        toCreate.push({
          domainId: r.domainId,
          type: "ssl_expiring",
          message: `SSL certificate for ${url} expires in ${days} day(s)`,
        });
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.alert.createMany({ data: toCreate });
    await Promise.all(
      toCreate.map((a) =>
        sendAlertEmail(
          a.type === "down" ? "Domain down" : "SSL expiring soon",
          a.message
        )
      )
    );
  }

  return toCreate.length;
}

export interface CheckResult {
  domainId: string;
  statusCode: number | null;
  latency: number;
  isUp: boolean;
  sslValid: boolean | null;
  sslExpiry: Date | null;
  error: string | null;
}

export async function checkSSL(
  hostname: string
): Promise<{ valid: boolean; expiry: Date | null }> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(
        {
          host: hostname,
          port: 443,
          servername: hostname,
          timeout: 10000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (cert && cert.valid_to) {
            const expiry = new Date(cert.valid_to);
            const now = new Date();
            resolve({
              valid: expiry > now,
              expiry,
            });
          } else {
            resolve({ valid: false, expiry: null });
          }
        }
      );

      socket.on("error", () => {
        socket.destroy();
        resolve({ valid: false, expiry: null });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ valid: false, expiry: null });
      });
    } catch {
      resolve({ valid: false, expiry: null });
    }
  });
}

export async function checkDomain(domain: {
  id: string;
  url: string;
}): Promise<CheckResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(domain.url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    // Check SSL if HTTPS
    let sslValid: boolean | null = null;
    let sslExpiry: Date | null = null;

    if (domain.url.startsWith("https://")) {
      try {
        const hostname = new URL(domain.url).hostname;
        const sslResult = await checkSSL(hostname);
        sslValid = sslResult.valid;
        sslExpiry = sslResult.expiry;
      } catch {
        sslValid = false;
      }
    }

    return {
      domainId: domain.id,
      statusCode: response.status,
      latency,
      isUp: response.status >= 200 && response.status < 400,
      sslValid,
      sslExpiry,
      error: null,
    };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      domainId: domain.id,
      statusCode: null,
      latency,
      isUp: false,
      sslValid: null,
      sslExpiry: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Check multiple domains concurrently and store results.
 * Returns the check results.
 */
export async function checkDomainsAndStore(
  domains: { id: string; url: string }[]
): Promise<CheckResult[]> {
  if (domains.length === 0) return [];

  // Check all domains concurrently using Promise.allSettled
  const results = await Promise.allSettled(
    domains.map((domain) => checkDomain(domain))
  );

  // Process results
  const checkLogs = results
    .filter(
      (r): r is PromiseFulfilledResult<CheckResult> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  // Evaluate alerts against the previous state BEFORE inserting new logs.
  if (checkLogs.length > 0) {
    const domainsById = new Map(domains.map((d) => [d.id, d]));
    await processAlerts(checkLogs, domainsById);
  }

  // Batch insert all check logs
  if (checkLogs.length > 0) {
    await prisma.checkLog.createMany({
      data: checkLogs.map((log) => ({
        domainId: log.domainId,
        statusCode: log.statusCode,
        latency: log.latency,
        isUp: log.isUp,
        sslValid: log.sslValid,
        sslExpiry: log.sslExpiry,
        error: log.error,
      })),
    });
  }

  return checkLogs;
}

/**
 * Get all active domains that are due for a check based on their checkInterval.
 * A domain is "due" if it has never been checked, or if the time since the last
 * check is >= its checkInterval (in minutes).
 */
export async function getDuedomains() {
  const now = new Date();

  const domains = await prisma.domain.findMany({
    where: { isActive: true },
    include: {
      checkLogs: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
  });

  return domains.filter((domain) => {
    // Never checked → due
    if (domain.checkLogs.length === 0) return true;

    const lastCheck = domain.checkLogs[0].checkedAt;
    const intervalMs = domain.checkInterval * 60 * 1000;
    const elapsed = now.getTime() - new Date(lastCheck).getTime();

    return elapsed >= intervalMs;
  });
}

