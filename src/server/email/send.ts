// Transport: Resend REST API (https://resend.com/docs/api-reference/emails).
//
// Called directly over fetch (works on Cloudflare Workers, no SDK/bundle
// weight). Fails soft: if RESEND_API_KEY / EMAIL_FROM are unset, or the API
// errors, it logs and returns { ok:false } rather than throwing — a failed
// email must never break the request or cron run that triggered it. Mirrors
// the fail-closed-but-non-fatal posture of the Keeta/aggregator paths.
export type SendResult = { ok: boolean; id?: string; skipped?: boolean; error?: string };

export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional Reply-To (e.g. support inbox). */
  replyTo?: string;
};

export function emailTransportConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: SendInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      `[email] transport not configured (RESEND_API_KEY / EMAIL_FROM missing) — skipped "${input.subject}" to ${input.to}`,
    );
    return { ok: false, skipped: true };
  }

  const payload: Record<string, unknown> = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.text) payload.text = input.text;
  if (input.replyTo) payload.reply_to = input.replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => String(res.status));
      console.error(`[email] Resend rejected send (${res.status}) to ${input.to}: ${detail}`);
      return { ok: false, error: `${res.status} ${detail}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown send error";
    console.error(`[email] send threw for ${input.to}: ${message}`);
    return { ok: false, error: message };
  }
}
