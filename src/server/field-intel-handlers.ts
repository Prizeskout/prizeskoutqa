// ============================================================================
// Real handlers for the /v1/field-intel/* read endpoints (Week 10 — pillar 4).
//
// Reads from `recent_observations` and `price_gaps`. Falls back to the
// documented sample response when the user has no rows so the docs sandbox
// stays useful.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

function toObsId(uuid: string): string {
  return `obs_${uuid.replace(/-/g, "").slice(0, 8)}`;
}
function toGapId(uuid: string): string {
  return `gap_${uuid.replace(/-/g, "").slice(0, 8)}`;
}

const SAMPLE_OBSERVATIONS = [
  {
    id: "obs_2c11",
    product: "Samsung Galaxy S24 Ultra 256GB",
    store: "Carrefour - Doha Festival City",
    price: 3849,
    currency: "QAR",
    condition: "Regular price",
    promo_detail: null,
    status: "reviewed",
    agent: "Ahmad K.",
    observed_at: "2026-04-23T08:00:00Z",
  },
];

const SAMPLE_GAPS = [
  {
    id: "gap_19",
    product: "Sony WH-1000XM5",
    competitor: "Carrefour",
    online_price: 1199,
    in_store_price: 1149,
    gap_pct: -4.2,
    direction: "down",
    observed_at: "2026-04-23T05:00:00Z",
  },
];

// ============================================================================
// GET /v1/field-intel/observations
// ============================================================================
export async function handleListObservations(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const store = url.searchParams.get("store");
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

  let q = supabaseAdmin
    .from("recent_observations")
    .select("id, product, store, price, condition, promo_detail, status, agent, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) q = q.eq("status", status);
  if (store) q = q.ilike("store", `%${store}%`);

  const { data, error } = await q;
  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_OBSERVATIONS, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => ({
      id: toObsId(r.id),
      product: r.product,
      store: r.store,
      price: Number(r.price),
      currency: "QAR",
      condition: r.condition,
      promo_detail: r.promo_detail,
      status: r.status,
      agent: r.agent,
      observed_at: r.created_at,
    })),
  });
}

// ============================================================================
// GET /v1/field-intel/price-gaps
// ============================================================================
export async function handleListPriceGaps(_request: Request, ctx: V1Context): Promise<V1Result> {
  const { data, error } = await supabaseAdmin
    .from("price_gaps")
    .select("id, product, competitor, online_price, in_store_price, direction, created_at")
    .eq("user_id", ctx.userId)
    .order("position");

  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_GAPS, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => {
      const online = Number(r.online_price);
      const instore = Number(r.in_store_price);
      const gapPct = online > 0 ? Math.round(((instore - online) / online) * 1000) / 10 : 0;
      return {
        id: toGapId(r.id),
        product: r.product,
        competitor: r.competitor,
        online_price: online,
        in_store_price: instore,
        gap_pct: gapPct,
        direction: r.direction,
        observed_at: r.created_at,
      };
    }),
  });
}
