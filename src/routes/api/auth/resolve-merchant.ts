// Called by /auth/callback once the browser has a Supabase session from a
// clicked magic link. Never trusts a client-supplied email — the bearer
// token is verified against Supabase auth first, and the merchant lookup
// runs against that verified email only. This is what actually gates
// dashboard access for the email login path, replacing the old behavior of
// trusting whatever merchant_id happened to already be in localStorage.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/auth/resolve-merchant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token) {
          return new Response(JSON.stringify({ error: "Missing session token." }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
        const email = userData?.user?.email?.trim().toLowerCase();
        if (userError || !email) {
          return new Response(JSON.stringify({ error: "Invalid or expired session." }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { data: row } = await supabaseAdmin
          .from("ps_access_codes")
          .select("merchant_id, code")
          .eq("email", email)
          .limit(1)
          .maybeSingle();

        if (!row) {
          return new Response(
            JSON.stringify({ error: "No PrizeSkout account found for this email. Complete onboarding to get access." }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ merchant_id: row.merchant_id, code: row.code }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
