import * as tls from "tls";
import { prisma } from "@/lib/prisma";

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

