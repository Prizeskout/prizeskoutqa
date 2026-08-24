// Read / write the signed-in user's language preference
// (profiles.preferred_locale). This is the account setting that decides which
// language every server-fired email is rendered in. The bearer token is
// verified against Supabase auth first — the write is always scoped to the
// verified user id, never to anything the client supplies.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeLocale, EMAIL_LOCALES } from "@/server/email/locale";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function userIdFromRequest(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export const Route = createFileRoute("/api/settings/locale")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = await userIdFromRequest(request);
        if (!userId) return json({ error: "Invalid or expired session." }, 401);
        const { data } = await (supabaseAdmin.from("profiles") as any)
          .select("preferred_locale")
          .eq("id", userId)
          .maybeSingle();
        return json({ locale: normalizeLocale(data?.preferred_locale) });
      },

      POST: async ({ request }) => {
        const rate = checkRateLimit(request, { name: "settings-locale", max: 60, windowMs: 15 * 60_000 });
        if (rate.limited) return tooManyRequests(rate.retryAfterSeconds);

        const userId = await userIdFromRequest(request);
        if (!userId) return json({ error: "Invalid or expired session." }, 401);

        let locale: string;
        try {
          const body = await request.json();
          locale = normalizeLocale(body?.locale);
        } catch {
          return json({ error: "Invalid request body." }, 400);
        }
        // normalizeLocale already guarantees a supported value, but assert
        // explicitly so an unexpected code can never reach the column.
        if (!(EMAIL_LOCALES as readonly string[]).includes(locale)) {
          return json({ error: "Unsupported locale." }, 400);
        }

        const { error } = await (supabaseAdmin.from("profiles") as any).upsert(
          { id: userId, preferred_locale: locale, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
        if (error) {
          console.error("[settings/locale] upsert failed", error);
          return json({ error: "Could not save your language preference." }, 500);
        }
        return json({ ok: true, locale });
      },
    },
  },
});
