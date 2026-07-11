import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/restore")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = await request.json().catch(() => null) as { code?: string } | null;
        const code = json?.code?.trim().toUpperCase();

        if (!code) {
          return new Response(JSON.stringify({ error: "code required" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabaseAdmin
          .from("ps_access_codes" as never)
          .select("merchant_id")
          .eq("code", code)
          .maybeSingle() as { data: { merchant_id: string } | null; error: unknown };

        if (error) {
          return new Response(JSON.stringify({ error: "lookup failed" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        if (!data?.merchant_id) {
          return new Response(JSON.stringify({ error: "code not found" }), {
            status: 404, headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ merchant_id: data.merchant_id }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
