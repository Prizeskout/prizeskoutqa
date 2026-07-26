import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function escapeScriptValue(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function page(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrizeSkout</title></head><body style="font-family:system-ui;padding:32px">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

// Zid appends the UUID registered during OAuth as ?token=..., allowing the
// iframe to identify its store without a separate PrizeSkout login.
export const Route = createFileRoute("/embedded/zid")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token")?.trim();
        if (!token) return page("<h2>Missing Zid session</h2><p>Please reinstall PrizeSkout from Zid.</p>", 400);

        const { data: channel } = await supabaseAdmin
          .from("ps_merchant_channels")
          .select("merchant_id")
          .eq("platform", "zid")
          .eq("status", "connected")
          .contains("metadata", { embedded_token: token })
          .maybeSingle();

        if (!channel) {
          return page("<h2>Zid session not found</h2><p>Please deactivate and reactivate PrizeSkout once.</p>", 404);
        }

        const merchantId = channel.merchant_id;
        let { data: access } = await supabaseAdmin
          .from("ps_access_codes")
          .select("code")
          .eq("merchant_id", merchantId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!access) {
          const code = `PSK-ZID-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
          const result = await supabaseAdmin
            .from("ps_access_codes")
            .insert({ code, merchant_id: merchantId, store_name: "Zid Store" })
            .select("code")
            .single();
          access = result.data;
        }

        if (!access) return page("<h2>Could not create your PrizeSkout session</h2><p>Please try again.</p>", 500);

        return new Response(
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening PrizeSkout</title></head>
          <body><script>
            localStorage.setItem("ps_merchant_id", ${escapeScriptValue(merchantId)});
            localStorage.setItem("ps_access_code", ${escapeScriptValue(access.code)});
            location.replace("/dashboard/revenue-hub");
          </script></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
