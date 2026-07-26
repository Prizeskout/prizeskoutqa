// Aggregates ps_aggregator_dispatch_log into the top-of-dashboard summary
// (Profits Protected hero, sparkline, and the four stat tiles). This never
// existed before — the hero and stat cards were hardcoded placeholders
// ("—", "No activity yet") with no data fetch at all, even for merchants
// with real dispatch history.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DashboardStats = {
  has_activity: boolean;
  profits_protected_this_month: number;
  price_updates_this_month: number;
  price_updates_today: number;
  avg_margin_saved_pct: number | null;
  tracked_products: number;
  // Last 33 days, oldest first, one QAR total per day — drives the sparkline.
  daily_series: number[];
};

const SPARKLINE_DAYS = 33;

export async function getDashboardStats(accountId: string): Promise<DashboardStats> {
  const now = new Date();
  const seriesStart = new Date(now);
  seriesStart.setDate(seriesStart.getDate() - (SPARKLINE_DAYS - 1));
  seriesStart.setHours(0, 0, 0, 0);

  const [
    { data, error },
    { data: catalogRows, error: catalogError },
  ] = await Promise.all([
    supabaseAdmin
      .from("ps_aggregator_dispatch_log")
      .select("sku, old_price, new_price, created_at, audit_snapshot")
      .eq("account_id", accountId)
      .eq("status", "success")
      .gte("created_at", seriesStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000),
    // A product becomes tracked when it is imported, not only after its first
    // outbound price update. Counting dispatch rows made successful catalogue
    // syncs appear as "No activity yet" on the Revenue Hub.
    supabaseAdmin
      .from("ps_ingest_events")
      .select("sku")
      .eq("account_id", accountId)
      .not("sku", "is", null)
      .limit(5000),
  ]);

  const rows = error || !data ? [] : data;
  const catalogSkus = new Set(
    (catalogError || !catalogRows ? [] : catalogRows)
      .map((row) => row.sku)
      .filter((sku): sku is string => Boolean(sku)),
  );

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let profitsProtected = 0;
  let priceUpdatesThisMonth = 0;
  let priceUpdatesToday = 0;
  const skus = new Set<string>();
  const marginDeltas: number[] = [];
  const daily_series = new Array(SPARKLINE_DAYS).fill(0);

  for (const row of rows) {
    const created = new Date(row.created_at);
    const delta = (row.new_price ?? 0) - (row.old_price ?? 0);

    if (created >= monthStart) { profitsProtected += delta; priceUpdatesThisMonth++; }
    if (created >= todayStart) priceUpdatesToday++;
    if (row.sku) skus.add(row.sku);

    const snap = row.audit_snapshot as Record<string, unknown> | null;
    const before = typeof snap?.margin_before_pct === "number" ? snap.margin_before_pct : null;
    const after = typeof snap?.margin_after_pct === "number" ? snap.margin_after_pct : null;
    if (before != null && after != null) marginDeltas.push(after - before);

    const dayIndex = Math.floor((created.getTime() - seriesStart.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < SPARKLINE_DAYS) daily_series[dayIndex] += delta;
  }

  return {
    profits_protected_this_month: Math.round(profitsProtected * 100) / 100,
    price_updates_this_month: priceUpdatesThisMonth,
    price_updates_today: priceUpdatesToday,
    avg_margin_saved_pct: marginDeltas.length > 0
      ? Math.round((marginDeltas.reduce((a, b) => a + b, 0) / marginDeltas.length) * 100) / 100
      : null,
    has_activity: rows.length > 0 || catalogSkus.size > 0,
    tracked_products: catalogSkus.size,
    daily_series,
  };
}
