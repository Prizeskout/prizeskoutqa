import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const attempts = new Map<string, { count: number; resetAt: number }>();
function limited(request: Request) {
  const key = (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const now = Date.now();
  const current = attempts.get(key);
  const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + 15 * 60_000 } : { ...current, count: current.count + 1 };
  attempts.set(key, next);
  return next.count > 8;
}

export const Route = createFileRoute("/api/restore")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (limited(request)) return new Response(JSON.stringify({ error: "Unable to restore access" }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "900" } });
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
          return new Response(JSON.stringify({ error: "Unable to restore access" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ merchant_id: data.merchant_id }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
