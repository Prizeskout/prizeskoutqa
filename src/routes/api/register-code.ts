import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { secureAccessCode, verifyOnboardingCapability } from "@/server/onboarding-capability";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";
import { sendWelcomeEmail } from "@/server/email";

export const Route = createFileRoute("/api/register-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Unauthenticated: gate volume so the code space can't be probed and
        // registration can't be spammed from one source.
        const rate = checkRateLimit(request, { name: "register-code", max: 15, windowMs: 15 * 60_000 });
        if (rate.limited) return tooManyRequests(rate.retryAfterSeconds);

        const json = await request.json().catch(() => null) as { merchant_id?: string; access_code?: string; onboarding_token?: string; region_code?: string; email?: string; store_name?: string; locale?: string } | null;
        const merchant_id = json?.merchant_id?.trim();
        const existingCode = json?.access_code?.trim().toUpperCase();
        const email = json?.email?.trim().toLowerCase() || null;
        const store_name = json?.store_name?.trim() || null;
        const locale = json?.locale;
        const isNewRegistration = !existingCode;

        if (!merchant_id) {
          return new Response(JSON.stringify({ error: "merchant_id required" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        let code = existingCode ?? "";
        if (code) {
          const { data } = await supabaseAdmin.from("ps_access_codes").select("merchant_id").eq("code", code).maybeSingle();
          if (!data || data.merchant_id !== merchant_id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        } else {
          if (!verifyOnboardingCapability(json?.onboarding_token ?? "", merchant_id)) return new Response(JSON.stringify({ error: "Onboarding session expired" }), { status: 401, headers: { "Content-Type": "application/json" } });
          code = secureAccessCode(json?.region_code);
        }

        const { error } = await supabaseAdmin
          .from("ps_access_codes")
          .upsert({ code, merchant_id, email, store_name }, { onConflict: "code" });

        if (error) {
          return new Response(JSON.stringify({ error: "Registration failed. Please try again." }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        // Fresh onboarding only (not re-validation of an existing code):
        // greet the merchant in the language they onboarded in. Never blocks
        // or fails registration \u2014 the send swallows its own errors.
        if (isNewRegistration && email) {
          try {
            await sendWelcomeEmail({ to: email, locale, store: store_name ?? undefined });
          } catch { /* non-fatal */ }
        }

        return new Response(JSON.stringify({ ok: true, code }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
