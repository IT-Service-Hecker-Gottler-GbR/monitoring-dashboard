/**
 * Next.js Instrumentation Hook
 * Runs server-side when the Next.js server starts.
 * Starts a background interval that checks due domains every 60 seconds.
 */

let cronStarted = false;

export async function onRequestError() {
  // Required export - no-op
}

export async function register() {
  // Only run on the server (Node.js runtime)
  if (typeof window !== "undefined") return;
  if (cronStarted) return;
  cronStarted = true;

  const CRON_INTERVAL_MS = 60 * 1000; // 1 minute

  console.log("[Monitor] Server-side cron scheduler starting...");

  // Wait a few seconds for the server to fully initialize
  setTimeout(async () => {
    console.log("[Monitor] Running initial check...");
    await runCronCheck();

    // Then run every minute
    setInterval(async () => {
      await runCronCheck();
    }, CRON_INTERVAL_MS);

    console.log("[Monitor] Background cron active – checking due domains every 60s");
  }, 5000);
}

async function runCronCheck() {
  try {
    // Dynamic import to avoid issues during build
    const { getDuedomains, checkDomainsAndStore } = await import("@/lib/monitor");

    const dueDomains = await getDuedomains();

    if (dueDomains.length === 0) {
      console.log("[Monitor] No domains due for checking");
      return;
    }

    const results = await checkDomainsAndStore(
      dueDomains.map((d) => ({ id: d.id, url: d.url }))
    );

    console.log(
      `[Monitor] Checked ${results.length} domains:`,
      results.map((r) => `${r.domainId}=${r.isUp ? "UP" : "DOWN"}`).join(", ")
    );
  } catch (err) {
    console.error("[Monitor] Cron check failed:", err);
  }
}
