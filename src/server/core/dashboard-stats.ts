// Aggregates ps_aggregator_dispatch_log into the top-of-dashboard summary
// (Profits Protected hero, sparkline, and the four stat tiles). This never
// existed before — the hero and stat cards were hardcoded placeholders
// ("—", "No activity yet") with no data fetch at all, even for merchants
// with real dispatch history.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { summarizeRestaurantOrderEconomics } from "@/server/restaurant-commerce-handlers";

export type DashboardStats = {
  has_activity: boolean;
  profits_protected_this_month: number;
  price_updates_this_month: number;
  price_updates_today: number;
  avg_margin_saved_pct: number | null;
  tracked_products: number;
  // Last 33 days, oldest first, one QAR total per day — drives the sparkline.
  daily_series: number[];
  economic_twin: EconomicTwinSummary;
};

export type EconomicTwinDimension = {
  key: string;
  gross_sales: number;
  net_revenue: number;
  fees: number;
  discounts: number;
  product_cost: number;
  contribution: number;
  orders: number;
  margin_pct: number | null;
};
export type EconomicTwinSummary = {
  currency: string | null;
  gross_sales: number;
  net_revenue: number;
  fees: number;
  discounts: number;
  refunds: number;
  product_cost: number;
  contribution: number;
  contribution_margin_pct: number | null;
  expected_payout: number;
  actual_payout: number;
  variance: number;
  orders: number;
  recoverable_amount: number;
  by_channel: EconomicTwinDimension[];
  by_branch: EconomicTwinDimension[];
  by_sku: EconomicTwinDimension[];
};

const money = (value: unknown) =>
  Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : 0;
const obj = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function summarizeEconomicTwin(events: any[], recoveries: any[] = []): EconomicTwinSummary {
  const orders = events.filter((row) => row.event_kind === "order_snapshot"),
    payouts = events.filter(
      (row) => row.event_kind === "payout_total" || row.event_kind === "receipt_confirmation",
    );
  const dimension = (
    keyOf: (row: any, line?: Record<string, unknown>) => string,
    lines = false,
  ) => {
    const map = new Map<string, EconomicTwinDimension>();
    for (const row of orders) {
      const payload = obj(row.normalized_payload),
        entries = lines && Array.isArray(payload.lines) ? payload.lines.map(obj) : [undefined];
      for (const line of entries) {
        const key = keyOf(row, line) || "unassigned",
          share = lines
            ? money(line?.net_amount ?? line?.gross_amount) /
              Math.max(0.01, money(row.net_amount || row.gross_amount))
            : 1,
          gross = lines ? money(line?.gross_amount) : money(row.gross_amount),
          net = lines ? money(line?.net_amount) : money(row.net_amount),
          fees = money(row.fee_amount) * share,
          discounts = lines ? money(line?.discount_amount) : money(row.discount_amount),
          cost = lines ? money(line?.product_cost_amount) : money(payload.product_cost_amount),
          current = map.get(key) ?? {
            key,
            gross_sales: 0,
            net_revenue: 0,
            fees: 0,
            discounts: 0,
            product_cost: 0,
            contribution: 0,
            orders: 0,
            margin_pct: null,
          };
        current.gross_sales += gross;
        current.net_revenue += net;
        current.fees += fees;
        current.discounts += discounts;
        current.product_cost += cost;
        current.contribution += net - cost;
        current.orders += 1;
        map.set(key, current);
      }
    }
    return [...map.values()]
      .map((row) => ({
        ...row,
        gross_sales: money(row.gross_sales),
        net_revenue: money(row.net_revenue),
        fees: money(row.fees),
        discounts: money(row.discounts),
        product_cost: money(row.product_cost),
        contribution: money(row.contribution),
        margin_pct: row.net_revenue
          ? Math.round((row.contribution / row.net_revenue) * 10000) / 100
          : null,
      }))
      .sort((a, b) => b.contribution - a.contribution);
  };
  const gross = orders.reduce((sum, row) => sum + money(row.gross_amount), 0),
    net = orders.reduce((sum, row) => sum + money(row.net_amount), 0),
    fees = orders.reduce((sum, row) => sum + money(row.fee_amount), 0),
    discounts = orders.reduce((sum, row) => sum + money(row.discount_amount), 0),
    cost = orders.reduce(
      (sum, row) => sum + money(obj(row.normalized_payload).product_cost_amount),
      0,
    ),
    refunds = orders.reduce(
      (sum, row) => sum + money(obj(row.normalized_payload).refund_amount),
      0,
    ),
    expected = payouts
      .filter((row) => row.event_kind === "payout_total")
      .reduce((sum, row) => sum + money(row.net_amount ?? row.gross_amount), 0),
    actual = payouts
      .filter((row) => row.event_kind === "receipt_confirmation")
      .reduce((sum, row) => sum + money(row.net_amount ?? row.gross_amount), 0),
    recoverable = recoveries.reduce(
      (sum, row) => sum + Math.max(0, money(row.claims_ready_amount) - money(row.recovered_amount)),
      0,
    );
  return {
    currency: orders.find((row) => row.currency)?.currency ?? null,
    gross_sales: money(gross),
    net_revenue: money(net),
    fees: money(fees),
    discounts: money(discounts),
    refunds: money(refunds),
    product_cost: money(cost),
    contribution: money(net - cost),
    contribution_margin_pct: net ? Math.round(((net - cost) / net) * 10000) / 100 : null,
    expected_payout: money(expected),
    actual_payout: money(actual),
    variance: money(actual - expected),
    orders: orders.length,
    recoverable_amount: money(recoverable),
    by_channel: dimension((row) => String(row.channel ?? "unassigned")),
    by_branch: dimension((row) => String(row.branch_external_id ?? "unassigned")),
    by_sku: dimension((_row, line) => String(line?.sku ?? line?.name ?? "unassigned"), true),
  };
}

const SPARKLINE_DAYS = 33;

export async function getDashboardStats(accountId: string): Promise<DashboardStats> {
  const now = new Date();
  const seriesStart = new Date(now);
  seriesStart.setDate(seriesStart.getDate() - (SPARKLINE_DAYS - 1));
  seriesStart.setHours(0, 0, 0, 0);

  const [
    { data, error },
    { data: catalogRows, error: catalogError },
    { data: normalizedRows },
    { data: heads },
    { data: recoveries },
    { data: costRows },
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
    (supabaseAdmin as any)
      .from("ps_normalized_commerce_events")
      .select(
        "id,event_kind,channel,branch_external_id,currency,gross_amount,discount_amount,fee_amount,net_amount,normalized_payload,occurred_at",
      )
      .eq("account_id", accountId)
      .gte("occurred_at", seriesStart.toISOString())
      .limit(10000),
    (supabaseAdmin as any)
      .from("ps_normalized_event_heads")
      .select("current_event_id")
      .eq("account_id", accountId)
      .limit(10000),
    (supabaseAdmin as any)
      .from("ps_recovery_cases")
      .select("claims_ready_amount,recovered_amount")
      .eq("account_id", accountId)
      .limit(5000),
    (supabaseAdmin as any)
      .from("ps_product_cost_evidence")
      .select(
        "id,sku,brand_external_id,branch_external_id,currency,unit_cost,effective_from,effective_to,source_provider,created_at",
      )
      .eq("account_id", accountId)
      .limit(10000),
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
  const currentEventIds = new Set((heads ?? []).map((head: any) => head.current_event_id));
  const currentEvents = (normalizedRows ?? [])
    .filter((row: any) => currentEventIds.has(row.id))
    .map((row: any) => {
      if (row.event_kind !== "order_snapshot") return row;
      const summary = summarizeRestaurantOrderEconomics(row, costRows ?? []);
      return {
        ...row,
        normalized_payload: {
          ...obj(row.normalized_payload),
          product_cost_amount: summary.economics.product_cost_amount,
        },
      };
    });

  for (const row of rows) {
    const created = new Date(row.created_at);
    const delta = (row.new_price ?? 0) - (row.old_price ?? 0);

    if (created >= monthStart) {
      profitsProtected += delta;
      priceUpdatesThisMonth++;
    }
    if (created >= todayStart) priceUpdatesToday++;
    if (row.sku) skus.add(row.sku);

    const snap = row.audit_snapshot as Record<string, unknown> | null;
    const before = typeof snap?.margin_before_pct === "number" ? snap.margin_before_pct : null;
    const after = typeof snap?.margin_after_pct === "number" ? snap.margin_after_pct : null;
    if (before != null && after != null) marginDeltas.push(after - before);

    const dayIndex = Math.floor(
      (created.getTime() - seriesStart.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (dayIndex >= 0 && dayIndex < SPARKLINE_DAYS) daily_series[dayIndex] += delta;
  }

  return {
    profits_protected_this_month: Math.round(profitsProtected * 100) / 100,
    price_updates_this_month: priceUpdatesThisMonth,
    price_updates_today: priceUpdatesToday,
    avg_margin_saved_pct:
      marginDeltas.length > 0
        ? Math.round((marginDeltas.reduce((a, b) => a + b, 0) / marginDeltas.length) * 100) / 100
        : null,
    has_activity: rows.length > 0 || catalogSkus.size > 0,
    tracked_products: catalogSkus.size,
    daily_series,
    economic_twin: summarizeEconomicTwin(currentEvents, recoveries ?? []),
  };
}
