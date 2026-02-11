import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as tls from "tls";

// Allow the monitor to be triggered by API key (for cron jobs) or by authenticated users
function isAuthorized(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.MONITOR_API_KEY) {
    return true;
  }
  return false;
}

interface CheckResult {
  domainId: string;
  statusCode: number | null;
  latency: number;
  isUp: boolean;
  sslValid: boolean | null;
  sslExpiry: Date | null;
  error: string | null;
}

async function checkSSL(hostname: string): Promise<{ valid: boolean; expiry: Date | null }> {
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

async function checkDomain(domain: { id: string; url: string }): Promise<CheckResult> {
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

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active domains
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      select: { id: true, url: true },
    });

    if (domains.length === 0) {
      return NextResponse.json({ message: "No active domains to check", results: [] });
    }

    // Check all domains concurrently using Promise.allSettled
    const results = await Promise.allSettled(
      domains.map((domain) => checkDomain(domain))
    );

    // Process results and store in database
    const checkLogs = results
      .filter(
        (r): r is PromiseFulfilledResult<CheckResult> => r.status === "fulfilled"
      )
      .map((r) => r.value);

    // Batch insert all check logs
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

    return NextResponse.json({
      message: `Checked ${checkLogs.length} domains`,
      results: checkLogs.map((log) => ({
        domainId: log.domainId,
        isUp: log.isUp,
        statusCode: log.statusCode,
        latency: log.latency,
      })),
    });
  } catch (err) {
    console.error("Monitor run error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

