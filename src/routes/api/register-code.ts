import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/register-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = await request.json().catch(() => null) as { merchant_id?: string; code?: string } | null;
        const merchant_id = json?.merchant_id?.trim();
        const code = json?.code?.trim().toUpperCase();

        if (!merchant_id || !code) {
          return new Response(JSON.stringify({ error: "merchant_id and code required" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const { error } = await supabaseAdmin
          .from("ps_access_codes" as never)
          .upsert({ code, merchant_id }, { onConflict: "code" });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
