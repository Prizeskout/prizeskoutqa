// ============================================================================
// Real handlers for the /v1/pricing/* read endpoints (Week 10 — pillar 2).
//
// Reads from `pricing_recommendations` and `pricing_rules`, scoped by
// user_id. Mock fallback when the user has no rows so the docs sandbox
// always shows realistic output.
//
// The POST /v1/pricing/decisions handler is intentionally not yet
// implemented — we'll layer that in alongside the audit-log work so writes
// are captured properly.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";

function ok(body: unknown, status = 200, headers?: Record<string, string>): V1Result {
  return { status, body, headers };
}

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

function toRecId(uuid: string): string {
  return `rec_${uuid.replace(/-/g, "").slice(0, 10)}`;
}

function shapeRecommendationRow(row: any) {
  return {
    id: toRecId(row.id),
    _row_id: row.id,
    product: row.product,
    category: row.category,
    // Normalize channel casing for API consumers (lowercased dash form).
    channel: typeof row.channel === "string" ? row.channel.toLowerCase().replace(/\s+/g, "-") : row.channel,
    current_price: Number(row.current_price),
    recommended_price: Number(row.recommended_price),
    currency: "QAR",
    confidence: row.confidence,
    reason: row.reason,
    expected: {
      net_monthly: row.net_monthly,
      margin_impact: row.margin_impact,
      unit_impact: row.unit_impact,
    },
    source: row.source === "seed" ? "engine_seed" : "engine_v3",
    generated_at: row.created_at,
  };
}

// ============================================================================
// GET /v1/pricing/recommendations
// ============================================================================
export async function handleListRecommendations(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const channel = url.searchParams.get("channel");
  const minConfRaw = parseInt(url.searchParams.get("min_confidence") ?? "60", 10);
  const minConfidence = Math.min(Math.max(Number.isFinite(minConfRaw) ? minConfRaw : 60, 0), 100);
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "25", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100);

  let q = supabaseAdmin
    .from("pricing_recommendations")
    .select("*")
    .eq("user_id", ctx.userId)
    .gte("confidence", minConfidence)
    .order("position", { ascending: true })
    .limit(limit);

  if (category) q = q.eq("category", category);
  if (channel) {
    // Accept either "online" or "Online".
    const normalized = channel.toLowerCase() === "online"
      ? "Online"
      : channel.toLowerCase() === "in-store"
        ? "In-Store"
        : channel;
    q = q.eq("channel", normalized);
  }

  const { data, error } = await q;
  if (error) {
    console.error("list-recommendations: query failed", error);
    return err("internal_error", "Failed to load recommendations.", 500);
  }

  const rows = (data ?? []) as any[];
  if (rows.length === 0) {
    return ok({
      data: [
        {
          id: "rec_9a2c1",
          product: "Sony WH-1000XM5",
          category: "Electronics",
          channel: "online",
          current_price: 1199,
          recommended_price: 1149,
          currency: "QAR",
          confidence: 87,
          reason: "Carrefour and Amazon both undercutting by 4-8% over the last 36 hours.",
          expected: { net_monthly: "+QAR 14,200", margin_impact: "-1.8pp", unit_impact: "+22%" },
          source: "engine_v3",
          generated_at: "2026-04-23T08:02:00Z",
        },
      ],
      _fallback: "sample",
    });
  }

  return ok({ data: rows.map(shapeRecommendationRow) });
}

// ============================================================================
// GET /v1/pricing/recommendations/{id}
// ============================================================================
export async function handleGetRecommendation(
  _request: Request,
  ctx: V1Context,
  recId: string,
): Promise<V1Result> {
  const short = recId.replace(/^rec_/, "").trim();
  if (!short) return err("validation_failed", "Invalid recommendation id.", 422);

  const { data, error } = await supabaseAdmin
    .from("pricing_recommendations")
    .select("*")
    .eq("user_id", ctx.userId);

  if (error) {
    console.error("get-recommendation: query failed", error);
    return err("internal_error", "Failed to load recommendation.", 500);
  }

  const row = (data ?? []).find((r: any) => (r.id as string).replace(/-/g, "").startsWith(short));
  if (!row) {
    return ok({
      id: recId,
      product: "Sony WH-1000XM5",
      category: "Electronics",
      channel: "online",
      current_price: 1199,
      recommended_price: 1149,
      currency: "QAR",
      confidence: 87,
      reason: "Carrefour and Amazon both undercutting by 4-8% over the last 36 hours.",
      expected: { net_monthly: "+QAR 14,200", margin_impact: "-1.8pp", unit_impact: "+22%" },
      evidence: [
        { source: "carrefour", price: 1149, observed_at: "2026-04-23T10:14:00Z" },
        { source: "amazon", price: 1179, observed_at: "2026-04-23T10:09:00Z" },
      ],
      generated_at: "2026-04-23T08:02:00Z",
      _fallback: "sample",
    });
  }

  // Best-effort evidence: pull this user's competitor_prices row for the same
  // product, if any, and translate the per-competitor jsonb blobs into the
  // documented evidence array.
  const { data: priceRow } = await supabaseAdmin
    .from("competitor_prices")
    .select("talabat, carrefour, amazon, noon, lulu")
    .eq("user_id", ctx.userId)
    .eq("product", row.product)
    .maybeSingle();

  const evidence: Array<{ source: string; price: number; observed_at?: string }> = [];
  if (priceRow) {
    for (const key of ["talabat", "carrefour", "amazon", "noon", "lulu"] as const) {
      const blob = (priceRow as any)[key];
      if (blob && typeof blob === "object" && typeof blob.price === "number") {
        evidence.push({ source: key, price: blob.price, observed_at: blob.observed_at });
      }
    }
  }

  return ok({ ...shapeRecommendationRow(row), evidence });
}

// ============================================================================
// GET /v1/pricing/rules
// ============================================================================
export async function handleListRules(_request: Request, ctx: V1Context): Promise<V1Result> {
  const { data, error } = await supabaseAdmin
    .from("pricing_rules")
    .select("id, rule_text, enabled, position")
    .eq("user_id", ctx.userId)
    .order("position", { ascending: true })
    .limit(200);

  if (error) {
    console.error("list-rules: query failed", error);
    return err("internal_error", "Failed to load rules.", 500);
  }

  const rows = (data ?? []) as any[];
  if (rows.length === 0) {
    return ok({
      data: [
        { id: "rul_1", rule_text: "Never price below 8% gross margin on Electronics", enabled: true },
        { id: "rul_2", rule_text: "Stay within ±3% of Talabat on grocery essentials", enabled: true },
        { id: "rul_3", rule_text: "Never undercut iPhone pricing on weekends", enabled: false },
      ],
      _fallback: "sample",
    });
  }

  return ok({
    data: rows.map((r) => ({
      id: `rul_${(r.id as string).replace(/-/g, "").slice(0, 6)}`,
      rule_text: r.rule_text,
      enabled: !!r.enabled,
    })),
  });
}
