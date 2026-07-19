// GET/POST /api/pricing/margin-floor — read or set a merchant's global margin
// floor. Backs the "Global margin floor" slider in the dashboard's Active
// Guardrails panel; the value set here is what decide-engine.ts actually
// enforces on every real order (see merchant-pricing-config.ts), not just
// what's shown on screen.
//
// Auth: same pattern as /api/repricing/catalog — ps_access_codes (merchant_id
// + access_code) validation, no session cookie required.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getMerchantMarginFloor, setMerchantMarginFloor } from "@/server/core/merchant-pricing-config";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyAccess(merchantId: string, accessCode: string): Promise<boolean> {
  if (!merchantId || !accessCode) return false;
  const { data } = await supabaseAdmin
    .from("ps_access_codes" as never)
    .select("merchant_id")
    .eq("code", accessCode.toUpperCase())
    .maybeSingle() as { data: { merchant_id: string } | null };
  return data?.merchant_id === merchantId;
}

export const Route = createFileRoute("/api/pricing/margin-floor")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const merchantId = url.searchParams.get("merchant_id")?.trim() ?? "";
        const accessCode = url.searchParams.get("access_code")?.trim() ?? "";

        if (!(await verifyAccess(merchantId, accessCode))) {
          return json({ error: "Invalid access code" }, 403);
        }

        const marginFloorPct = await getMerchantMarginFloor(merchantId);
        return json({ margin_floor_pct: marginFloorPct });
      },

      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as
          { merchant_id?: string; access_code?: string; margin_floor_pct?: number } | null;

        const merchantId = body?.merchant_id?.trim() ?? "";
        const accessCode = body?.access_code?.trim() ?? "";
        const marginFloorPct = body?.margin_floor_pct;

        if (!(await verifyAccess(merchantId, accessCode))) {
          return json({ error: "Invalid access code" }, 403);
        }
        if (typeof marginFloorPct !== "number") {
          return json({ error: "margin_floor_pct (number) is required" }, 400);
        }

        const result = await setMerchantMarginFloor(merchantId, marginFloorPct);
        if (!result.ok) return json({ error: result.error }, 400);
        return json({ ok: true, margin_floor_pct: marginFloorPct });
      },
    },
  },
});
