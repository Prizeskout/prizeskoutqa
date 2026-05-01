// ============================================================================
// Real handlers for the /v1/promotions/* read endpoints (Week 10 — pillar 3).
//
// Reads from `promotion_calendar` and `promotions_scenarios`. Falls back to
// the documented sample response when the user has no rows so the docs
// sandbox stays useful.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

function toPromId(uuid: string): string {
  return `prm_${uuid.replace(/-/g, "").slice(0, 8)}`;
}
function toCmpId(uuid: string): string {
  return `cmp_${uuid.replace(/-/g, "").slice(0, 8)}`;
}

const SAMPLE_CALENDAR = [
  {
    id: "prm_42",
    competitor: "Talabat",
    campaign: "Eid Al-Fitr Mega Sale",
    channel: "both",
    dates: "Mar 28 - Apr 5",
    duration: "9 days",
    depth: "15-25%",
    categories: "All categories",
    status: "live",
  },
];

const SAMPLE_CAMPAIGNS = [
  {
    id: "cmp_18",
    name: "Eid Electronics Blitz (Mar 2026)",
    discount: "20% off all electronics",
    total_gmv: "+QAR 312K",
    incremental_gmv: "+QAR 187K",
    cannibalized: "QAR 125K (40%)",
    roi: 1.4,
    verdict: "Moderate cannibalization. Recommend reducing to 15% next time.",
  },
];

// ============================================================================
// GET /v1/promotions/calendar
// ============================================================================
export async function handleListCalendar(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const competitor = url.searchParams.get("competitor");

  let q = supabaseAdmin
    .from("promotion_calendar")
    .select("id, competitor, campaign, channel, dates, duration, depth, categories, status")
    .eq("user_id", ctx.userId)
    .order("position");

  if (status) q = q.eq("status", status);
  if (competitor) q = q.ilike("competitor", competitor);

  const { data, error } = await q;
  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_CALENDAR, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => ({
      id: toPromId(r.id),
      competitor: r.competitor,
      campaign: r.campaign,
      channel: r.channel,
      dates: r.dates,
      duration: r.duration,
      depth: r.depth,
      categories: r.categories,
      status: r.status,
    })),
  });
}

// ============================================================================
// GET /v1/promotions/campaigns
// ============================================================================
export async function handleListCampaigns(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

  // Past, measured campaigns = scenarios that have actually been simulated.
  const { data, error } = await supabaseAdmin
    .from("promotions_scenarios")
    .select("id, category, channel, depth, duration, gmv_uplift, incremental_orders, cannibalization_pct, net_roi, healthy, simulated_at")
    .eq("user_id", ctx.userId)
    .eq("is_baseline", false)
    .order("simulated_at", { ascending: false })
    .limit(limit);

  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_CAMPAIGNS, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => {
      const gmv = Number(r.gmv_uplift);
      const cann = Number(r.cannibalization_pct);
      const incremental = gmv * (1 - cann / 100);
      const cannibalized = gmv - incremental;
      return {
        id: toCmpId(r.id),
        name: `${r.category} ${r.depth} (${r.channel}, ${r.duration})`,
        discount: `${r.depth} off ${r.category}`,
        total_gmv: formatQAR(gmv),
        incremental_gmv: formatQAR(incremental),
        cannibalized: `${formatQAR(cannibalized).replace("+", "")} (${Math.round(cann)}%)`,
        roi: Number(r.net_roi),
        verdict: r.healthy
          ? "Healthy ROI. Cannibalization within target."
          : "Elevated cannibalization. Consider trimming depth or duration.",
        simulated_at: r.simulated_at,
      };
    }),
  });
}

function formatQAR(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1000) {
    return `${sign}QAR ${Math.round(abs / 1000)}K`;
  }
  return `${sign}QAR ${Math.round(abs)}`;
}
