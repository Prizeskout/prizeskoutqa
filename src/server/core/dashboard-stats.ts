// Aggregates ps_aggregator_dispatch_log into the top-of-dashboard summary
// (Profits Protected hero, sparkline, and the four stat tiles). This never
// existed before — the hero and stat cards were hardcoded placeholders
// ("—", "No activity yet") with no data fetch at all, even for merchants
// with real dispatch history.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { summarizeRestaurantOrderEconomics } from "@/server/restaurant-commerce-handlers";
import { evaluateFinancialAlerts } from "./financial-alerts";

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

  const economicTwin=summarizeEconomicTwin(currentEvents, recoveries ?? []);
  await evaluateFinancialAlerts(accountId,economicTwin);
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
    economic_twin: economicTwin,
  };
}

// ---------------------------------------------------------------------------
// Profitability trends — time-bucketed contribution/margin over the economic
// twin, optionally filtered by a single channel, branch, or SKU. Reuses
// summarizeEconomicTwin per bucket so the numbers match the rest of the
// dashboard exactly. Category and campaign are intentionally NOT offered:
// order events carry no category tag and no campaign association, so those
// filters cannot be backed by real data today.
// ---------------------------------------------------------------------------
export type TrendGranularity = "day" | "week" | "month" | "quarter";
export type TrendDimension = "all" | "channel" | "branch" | "sku";
export type TrendPoint = {
  bucket: string;
  start: string;
  gross_sales: number;
  net_revenue: number;
  contribution: number;
  orders: number;
  margin_pct: number | null;
};
export type ProfitabilityTrends = {
  granularity: TrendGranularity;
  dimension: TrendDimension;
  key: string | null;
  currency: string | null;
  from: string;
  to: string;
  points: TrendPoint[];
  available: { channels: string[]; branches: string[]; skus: string[] };
};

const TREND_WINDOW_DAYS: Record<TrendGranularity, number> = {
  day: 90,
  week: 182,
  month: 365,
  quarter: 730,
};

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function bucketInfo(date: Date, granularity: TrendGranularity): { key: string; start: Date } {
  const year = date.getUTCFullYear();
  if (granularity === "day") {
    const start = startOfUTCDay(date);
    return { key: start.toISOString().slice(0, 10), start };
  }
  if (granularity === "week") {
    const start = startOfUTCDay(date);
    const mondayOffset = (start.getUTCDay() + 6) % 7; // Monday = 0
    start.setUTCDate(start.getUTCDate() - mondayOffset);
    return { key: start.toISOString().slice(0, 10), start };
  }
  if (granularity === "month") {
    return {
      key: `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      start: new Date(Date.UTC(year, date.getUTCMonth(), 1)),
    };
  }
  const quarter = Math.floor(date.getUTCMonth() / 3);
  return { key: `${year}-Q${quarter + 1}`, start: new Date(Date.UTC(year, quarter * 3, 1)) };
}

function advanceBucket(start: Date, granularity: TrendGranularity): Date {
  const next = new Date(start);
  if (granularity === "day") next.setUTCDate(next.getUTCDate() + 1);
  else if (granularity === "week") next.setUTCDate(next.getUTCDate() + 7);
  else if (granularity === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 3);
  return next;
}

export async function getProfitabilityTrends(
  accountId: string,
  params: { granularity?: string; dimension?: string; key?: string | null },
): Promise<ProfitabilityTrends> {
  const granularity: TrendGranularity = (["day", "week", "month", "quarter"] as const).includes(
    params.granularity as TrendGranularity,
  )
    ? (params.granularity as TrendGranularity)
    : "month";
  const dimension: TrendDimension = (["all", "channel", "branch", "sku"] as const).includes(
    params.dimension as TrendDimension,
  )
    ? (params.dimension as TrendDimension)
    : "all";
  const key = params.key && String(params.key).trim() ? String(params.key).trim() : null;

  const now = new Date();
  const windowStart = startOfUTCDay(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - (TREND_WINDOW_DAYS[granularity] - 1));

  const [{ data: normalizedRows }, { data: heads }, { data: costRows }] = await Promise.all([
    (supabaseAdmin as any)
      .from("ps_normalized_commerce_events")
      .select(
        "id,event_kind,channel,branch_external_id,currency,gross_amount,discount_amount,fee_amount,net_amount,normalized_payload,occurred_at",
      )
      .eq("account_id", accountId)
      .eq("event_kind", "order_snapshot")
      .gte("occurred_at", windowStart.toISOString())
      .limit(20000),
    (supabaseAdmin as any)
      .from("ps_normalized_event_heads")
      .select("current_event_id")
      .eq("account_id", accountId)
      .limit(20000),
    (supabaseAdmin as any)
      .from("ps_product_cost_evidence")
      .select(
        "id,sku,brand_external_id,branch_external_id,currency,unit_cost,effective_from,effective_to,source_provider,created_at",
      )
      .eq("account_id", accountId)
      .limit(10000),
  ]);

  const currentIds = new Set((heads ?? []).map((head: any) => head.current_event_id));
  const events = (normalizedRows ?? [])
    .filter((row: any) => currentIds.has(row.id))
    .map((row: any) => {
      const summary = summarizeRestaurantOrderEconomics(row, costRows ?? []);
      return {
        ...row,
        normalized_payload: {
          ...obj(row.normalized_payload),
          product_cost_amount: summary.economics.product_cost_amount,
        },
      };
    });

  const channels = new Set<string>();
  const branches = new Set<string>();
  const skus = new Set<string>();
  for (const event of events) {
    if (event.channel) channels.add(String(event.channel));
    if (event.branch_external_id) branches.add(String(event.branch_external_id));
    const lines = Array.isArray(obj(event.normalized_payload).lines)
      ? (obj(event.normalized_payload).lines as unknown[])
      : [];
    for (const line of lines) {
      const sku = obj(line).sku ?? obj(line).name;
      if (sku) skus.add(String(sku));
    }
  }

  // channel/branch narrow the event set; sku is read from the per-bucket by_sku
  // dimension, so it does not pre-filter whole orders.
  const scoped = events.filter((event: any) => {
    if (dimension === "channel" && key) return String(event.channel ?? "") === key;
    if (dimension === "branch" && key) return String(event.branch_external_id ?? "") === key;
    return true;
  });

  const byBucket = new Map<string, any[]>();
  for (const event of scoped) {
    if (!event.occurred_at) continue;
    const info = bucketInfo(new Date(event.occurred_at), granularity);
    const existing = byBucket.get(info.key);
    if (existing) existing.push(event);
    else byBucket.set(info.key, [event]);
  }

  const points: TrendPoint[] = [];
  let currency: string | null = null;
  let cursor = bucketInfo(windowStart, granularity).start;
  while (cursor <= now) {
    const info = bucketInfo(cursor, granularity);
    const bucketEvents = byBucket.get(info.key) ?? [];
    const summary = summarizeEconomicTwin(bucketEvents, []);
    if (!currency && summary.currency) currency = summary.currency;
    if (dimension === "sku" && key) {
      const dim = summary.by_sku.find((row) => row.key === key);
      points.push({
        bucket: info.key,
        start: info.start.toISOString(),
        gross_sales: dim?.gross_sales ?? 0,
        net_revenue: dim?.net_revenue ?? 0,
        contribution: dim?.contribution ?? 0,
        orders: dim?.orders ?? 0,
        margin_pct: dim?.margin_pct ?? null,
      });
    } else {
      points.push({
        bucket: info.key,
        start: info.start.toISOString(),
        gross_sales: summary.gross_sales,
        net_revenue: summary.net_revenue,
        contribution: summary.contribution,
        orders: summary.orders,
        margin_pct: summary.contribution_margin_pct,
      });
    }
    cursor = advanceBucket(info.start, granularity);
  }

  return {
    granularity,
    dimension,
    key,
    currency,
    from: windowStart.toISOString(),
    to: now.toISOString(),
    points,
    available: {
      channels: [...channels].sort(),
      branches: [...branches].sort(),
      skus: [...skus].sort().slice(0, 200),
    },
  };
}
