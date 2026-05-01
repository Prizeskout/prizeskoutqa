// ============================================================================
// Real handlers for the /v1/network/* read endpoints (Week 10 — pillar 6).
//
// Reads from `market_benchmarks` (per-tenant snapshot of cross-tenant
// aggregates). The /v1/network/patterns endpoint is an alias of
// /v1/competitors/patterns — we re-export the competitors handler and apply
// the same fallback semantics.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

function toBmId(uuid: string): string {
  return `bm_${uuid.replace(/-/g, "").slice(0, 6)}`;
}

const SAMPLE_BENCHMARKS = [
  {
    id: "bm_vol",
    metric: "Avg price volatility (Electronics)",
    you: 4.2,
    market_avg: 6.8,
    top: 3.1,
    position: "top quartile",
  },
];

// ============================================================================
// GET /v1/network/benchmarks
// ============================================================================
export async function handleListBenchmarks(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const metric = url.searchParams.get("metric");

  let q = supabaseAdmin
    .from("market_benchmarks")
    .select("id, metric, you, you_display, market_avg, market_avg_display, top, top_display, position")
    .eq("user_id", ctx.userId)
    .order("position");

  if (metric) q = q.ilike("metric", `%${metric}%`);

  const { data, error } = await q;
  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_BENCHMARKS, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => ({
      id: toBmId(r.id),
      metric: r.metric,
      you: r.you,
      you_display: r.you_display,
      market_avg: r.market_avg,
      market_avg_display: r.market_avg_display,
      top: r.top,
      top_display: r.top_display,
      position: r.position,
    })),
  });
}
