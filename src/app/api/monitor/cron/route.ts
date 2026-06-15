import { NextRequest, NextResponse } from "next/server";
import { getDuedomains, checkDomainsAndStore } from "@/lib/monitor";

function isAuthorized(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  return !!(apiKey && apiKey === process.env.MONITOR_API_KEY);
}

/**
 * POST /api/monitor/cron
 * Interval-based trigger: only checks domains whose checkInterval has elapsed
 * since their last check. Called every minute by the dashboard auto-poller.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dueDomains = await getDuedomains();

    if (dueDomains.length === 0) {
      return NextResponse.json({
        message: "No domains due for checking",
        checked: 0,
      });
    }

    const checkLogs = await checkDomainsAndStore(
      dueDomains.map((d) => ({ id: d.id, url: d.url }))
    );

    return NextResponse.json({
      message: `Checked ${checkLogs.length} due domains`,
      checked: checkLogs.length,
      results: checkLogs.map((log) => ({
        domainId: log.domainId,
        isUp: log.isUp,
        statusCode: log.statusCode,
        latency: log.latency,
      })),
    });
  } catch (err) {
    console.error("Monitor cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

