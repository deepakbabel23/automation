/**
 * Transactional email via Resend. No-ops when RESEND_API_KEY is unset (offline /
 * tests), so payment flows are fully testable without an email provider.
 */
export async function sendReceipt(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "MockCred <receipts@mockcred.app>",
      to,
      subject,
      html,
    }),
  }).catch(() => {});
}
