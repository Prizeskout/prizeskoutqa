// Supabase Auth "Send Email Hook" receiver.
// ---------------------------------------------------------------------------
// When enabled in the Supabase dashboard (Authentication -> Emails -> Send email
// hook), GoTrue calls THIS endpoint instead of sending its own auth emails. We
// render the sign-in / signup / recovery / invite / email-change message in the
// user's saved language and send it via Resend.
//
// Security: the request is signed with the Standard Webhooks scheme using the
// hook secret from the dashboard (format "v1,whsec_<base64>"), delivered in the
// SEND_EMAIL_HOOK_SECRET env var. We verify the signature over the raw body
// before doing anything. Unsigned/invalid requests are rejected.
//
// Dashboard/env setup is documented in EMAIL_SETUP.md at the repo root.
import { createFileRoute } from "@tanstack/react-router";
import { sendAuthEmail, resolveUserLocale, normalizeLocale, type EmailLocale } from "@/server/email";
import type { AuthEmailType } from "@/server/email/templates";

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, headers: Headers): Promise<boolean> {
  const secretRaw = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secretRaw) return false;

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretB64 = secretRaw.replace(/^v1,/, "").replace(/^whsec_/, "");
  let keyBytes: Uint8Array<ArrayBuffer>;
  try {
    keyBytes = base64ToBytes(secretB64);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = bytesToBase64(mac);

  for (const part of signatureHeader.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    if (sig && timingSafeEqual(sig, expected)) return true;
  }
  return false;
}

const ACTION_TO_TEMPLATE: Record<string, AuthEmailType> = {
  signup: "signup",
  magiclink: "magiclink",
  login: "magiclink",
  recovery: "recovery",
  invite: "invite",
  email_change: "email_change",
  email_change_new: "email_change",
};

type HookPayload = {
  user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
  email_data?: {
    token_hash?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
};

function buildVerifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const params = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

export const Route = createFileRoute("/api/public/hooks/auth-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        if (!(await verifySignature(raw, request.headers))) {
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        let payload: HookPayload;
        try {
          payload = JSON.parse(raw) as HookPayload;
        } catch {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const to = payload.user?.email;
        const action = payload.email_data?.email_action_type ?? "";
        const template = ACTION_TO_TEMPLATE[action];
        const tokenHash = payload.email_data?.token_hash;
        if (!to || !template || !tokenHash) {
          console.warn(`[auth-email] unhandled hook: action=${action} hasEmail=${Boolean(to)}`);
          return Response.json({ ok: true, handled: false });
        }

        const metaLocale = payload.user?.user_metadata?.locale;
        const locale: EmailLocale = metaLocale
          ? normalizeLocale(metaLocale)
          : await resolveUserLocale(payload.user?.id);

        const actionUrl = buildVerifyUrl(
          tokenHash,
          action,
          payload.email_data?.redirect_to ?? payload.email_data?.site_url ?? "",
        );

        const result = await sendAuthEmail({ to, type: template, actionUrl, locale });
        if (!result.ok && !result.skipped) {
          return Response.json({ error: result.error ?? "send failed" }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
