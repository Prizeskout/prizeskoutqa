import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "./v1-handlers";

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200, headers?: Record<string, string>): V1Result {
  return { status, body, headers };
}

function canReadAudit(ctx: V1Context): boolean {
  const s = ctx.scopes;
  return s.includes("audit:read") || s.includes("read") || s.includes("admin") || s.includes("write");
}

// ============================================================================
// GET /v1/audit/decisions
// Query params: product, channel, decision, source, from (ISO date), to (ISO date),
//               limit (max 500, default 50), offset (default 0)
// ============================================================================
export async function handleListDecisions(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canReadAudit(ctx)) return err("forbidden", "This API key lacks the `audit:read` scope.", 403);

  const url = new URL(request.url);
  const product  = url.searchParams.get("product") ?? null;
  const channel  = url.searchParams.get("channel") ?? null;
  const decision = url.searchParams.get("decision") ?? null;
  const source   = url.searchParams.get("source") ?? null;
  const from     = url.searchParams.get("from") ?? null;
  const to       = url.searchParams.get("to") ?? null;
  const limit    = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);
  const offset   = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);

  let q = (supabaseAdmin as any)
    .from("pricing_decisions")
    .select(
      "id, user_id, product, category, channel, current_price, recommended_price, " +
      "expected_net_monthly, decision, source, trigger_type, rule_fired, rule_reason, " +
      "inputs_snapshot, alternatives, cost_snapshot, snooze_until, note, created_at",
      { count: "exact" }
    )
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (product)  q = q.ilike("product", `%${product}%`);
  if (channel)  q = q.eq("channel", channel);
  if (decision) q = q.eq("decision", decision);
  if (source)   q = q.eq("source", source);
  if (from)     q = q.gte("created_at", from);
  if (to)       q = q.lte("created_at", to);

  const { data, error, count } = await q;
  if (error) return err("internal_error", error.message, 500);

  return ok({ data: data ?? [], total: count ?? 0, limit, offset });
}

// ============================================================================
// GET /v1/audit/decisions/:id
// ============================================================================
export async function handleGetDecision(
  request: Request,
  ctx: V1Context,
  id: string,
): Promise<V1Result> {
  if (!canReadAudit(ctx)) return err("forbidden", "This API key lacks the `audit:read` scope.", 403);
  if (!id) return err("validation_failed", "`id` path param is required.", 422);

  const { data, error } = await (supabaseAdmin as any)
    .from("pricing_decisions")
    .select("*, decision_outcome_attributions(*)")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) return err("internal_error", error.message, 500);
  if (!data) return err("not_found", `Decision ${id} not found.`, 404);

  return ok(data);
}

// ============================================================================
// GET /v1/audit/summary
// Query params: days (default 30, max 365)
// Returns: decisions/day, by_type breakdown, floor_enforcement_rate, avg_price_delta_pct
// ============================================================================
export async function handleAuditSummary(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canReadAudit(ctx)) return err("forbidden", "This API key lacks the `audit:read` scope.", 403);

  const url  = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "30", 10), 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await (supabaseAdmin as any)
    .from("pricing_decisions")
    .select("id, decision, source, rule_fired, current_price, recommended_price, created_at")
    .eq("user_id", ctx.userId)
    .gte("created_at", since);

  if (error) return err("internal_error", error.message, 500);
  const rows = (data ?? []) as Array<{
    id: string; decision: string; source: string;
    rule_fired: string | null; current_price: number; recommended_price: number;
    created_at: string;
  }>;

  const total = rows.length;
  const byType: Record<string, number> = {};
  let totalPriceDelta = 0;
  let floorEnforcedCount = 0;
  let engineRecCount = 0;

  for (const r of rows) {
    byType[r.decision] = (byType[r.decision] ?? 0) + 1;
    if (r.decision === "engine_rec") {
      engineRecCount++;
      if (r.rule_fired) floorEnforcedCount++;
      const delta = r.current_price > 0
        ? (r.recommended_price - r.current_price) / r.current_price
        : 0;
      totalPriceDelta += delta;
    }
  }

  // Group by date for decisions/day
  const byDate: Record<string, number> = {};
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    byDate[day] = (byDate[day] ?? 0) + 1;
  }
  const activeDays = Object.keys(byDate).length;

  return ok({
    period_days: days,
    since: since,
    total_decisions: total,
    decisions_per_day: activeDays > 0 ? +(total / activeDays).toFixed(2) : 0,
    by_type: byType,
    engine_recs: engineRecCount,
    floor_enforcement_rate: engineRecCount > 0
      ? +(floorEnforcedCount / engineRecCount).toFixed(4)
      : 0,
    avg_price_delta_pct: engineRecCount > 0
      ? +(totalPriceDelta / engineRecCount).toFixed(4)
      : 0,
    daily_breakdown: Object.entries(byDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([date, count]) => ({ date, count })),
  });
}

// ============================================================================
// GET /v1/audit/report — CSV export
// Query params: same as /decisions (product, channel, decision, source, from, to)
// ============================================================================
export async function handleAuditReport(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canReadAudit(ctx)) return err("forbidden", "This API key lacks the `audit:read` scope.", 403);

  const url = new URL(request.url);
  const product  = url.searchParams.get("product") ?? null;
  const channel  = url.searchParams.get("channel") ?? null;
  const decision = url.searchParams.get("decision") ?? null;
  const source   = url.searchParams.get("source") ?? null;
  const from     = url.searchParams.get("from") ?? null;
  const to       = url.searchParams.get("to") ?? null;

  let q = (supabaseAdmin as any)
    .from("pricing_decisions")
    .select(
      "id, product, category, channel, current_price, recommended_price, " +
      "decision, source, trigger_type, rule_fired, rule_reason, " +
      "expected_net_monthly, note, created_at"
    )
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (product)  q = q.ilike("product", `%${product}%`);
  if (channel)  q = q.eq("channel", channel);
  if (decision) q = q.eq("decision", decision);
  if (source)   q = q.eq("source", source);
  if (from)     q = q.gte("created_at", from);
  if (to)       q = q.lte("created_at", to);

  const { data, error } = await q;
  if (error) return err("internal_error", error.message, 500);

  const rows = (data ?? []) as Record<string, unknown>[];

  function csvEscape(v: unknown): string {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const headers = [
    "id", "product", "category", "channel",
    "current_price", "recommended_price",
    "decision", "source", "trigger_type",
    "rule_fired", "rule_reason",
    "expected_net_monthly", "note", "created_at",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  const csv = lines.join("\r\n");

  const filename = `audit-decisions-${new Date().toISOString().slice(0, 10)}.csv`;
  return ok(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
}
