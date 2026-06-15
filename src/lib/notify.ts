// Best-effort alert email. No-ops (just logs) unless Resend env vars are set,
// so the app works out of the box and gains email when configured.
//   RESEND_API_KEY, ALERT_EMAIL_FROM, ALERT_EMAIL_TO
export async function sendAlertEmail(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM;
  const to = process.env.ALERT_EMAIL_TO;

  if (!apiKey || !from || !to) {
    console.warn(`[alert] ${subject} — ${body} (email not configured)`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error(`[alert] email failed: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("[alert] email error:", err);
  }
}
