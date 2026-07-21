// Computes "what a merchant should have been paid" directly from their real
// Talabat order history — no settlement file, no manual entry. Pulls real
// orders via getTalabatOrders(), sums each order's sub_total (food value,
// never delivery_fee or order_total — confirmed separate fields per
// Talabat's docs), and applies the commission rate the merchant told us
// they agreed to (not something any platform API exposes).
//
// The merchant compares the resulting number to their own bank deposit —
// we're not fetching their actual payout from anywhere, because none of
// the platforms we integrate with expose that via API (confirmed by
// research, not assumed).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getValidTalabatAccessToken, getTalabatOrders } from "./talabat-client";

const MAX_WINDOW_DAYS = 60; // Talabat's own limit on start_time lookback

export type ExpectedPayoutResult = {
  ok: boolean;
  error?: string;
  order_count?: number;
  sub_total_sum?: number;
  commission_rate_pct?: number;
  expected_payout?: number;
  period_start?: string;
  period_end?: string;
  // "live" = pulled from Talabat's real Order API, sub_total_sum is food
  // value only (delivery fee confirmed separate). "upload" = from a daily
  // totals CSV with no such split — sub_total_sum there is the whole daily
  // "Sales" figure as-is. Not the same precision; the UI must label them
  // differently rather than imply both are equally exact.
  source?: "live" | "upload";
  platform?: string;
  // Upload path only — how many data rows were dropped for not parsing
  // (bad date/number format) vs. the total seen, so the UI can disclose
  // partial data instead of presenting a total as if it covered everything.
  rows_skipped?: number;
  rows_total?: number;
  // PDF upload path only (see payout-pdf-parser.ts) — extra fields the
  // report itself carries but that don't feed the payout math, surfaced so
  // the merchant can eyeball the parse against their own PDF rather than
  // trust it blindly.
  brand?: string;
  cancelled_gmv?: number;
  cancelled_orders?: number;
  // Real Talabat payout statement path only (see payout-statement-parser.ts)
  // — expected_payout here is Talabat's own stated Total Payout, not a
  // recomputed estimate. These are the line items behind it, plus the
  // actual effective commission rate so it can be compared against
  // commission_rate_pct (what the merchant agreed to, if they entered one).
  commission_amount?: number;
  additional_charges?: number;
  additional_income?: number;
  effective_commission_pct?: number;
  // Every nonzero line item beyond the 4 headline buckets above (Delivery
  // Fee, Marketing Charges, etc.) — most real exports have these all at
  // zero, but if one is ever populated it would otherwise be invisible.
  extra_line_items?: { label: string; value: number }[];
  // Set when a deduction (currently just Additional Charges) is nonzero but
  // every column that could itemize it is zero — flags a charge Talabat's
  // own export doesn't explain, worth escalating directly.
  unexplained_charge?: { label: string; amount: number } | null;
  // Every column that COULD explain unexplained_charge, and its actual value
  // (usually all zero) — so the audit can show its work, not just assert a
  // conclusion. Only present when Additional Charges is nonzero.
  charge_explainers?: { label: string; value: number }[];
  // Daily-totals CSV upload path only (see payout-csv-parser.ts) — the raw
  // per-day breakdown behind sub_total_sum/order_count, so a merchant can see
  // exactly how each day tallies against the agreed commission rate instead
  // of just the period's grand total. Also feeds the commission-audit
  // engine's per-day ledger (src/lib/commission-audit.ts).
  daily_rows?: { date: string; orders: number; sales: number; cancelled?: number }[];
  cancelled_orders_total?: number;
};

export async function getTalabatExpectedPayout(
  merchantId: string,
  windowDays = 30,
): Promise<ExpectedPayoutResult> {
  const { data: channel } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id, manager_token, bearer_token, metadata")
    .eq("account_id", merchantId)
    .eq("merchant_id", merchantId)
    .eq("platform", "talabat")
    .eq("status", "connected")
    .maybeSingle();

  if (!channel) {
    return { ok: false, error: "Talabat is not connected yet." };
  }

  const metadata = (channel.metadata as Record<string, unknown> | null) ?? {};
  const chainId = metadata.chain_id;
  const vendorId = metadata.vendor_id;
  const commissionRatePct = metadata.commission_rate_pct;

  if (typeof chainId !== "string" || typeof vendorId !== "string" || !chainId || !vendorId) {
    return { ok: false, error: "Talabat connection is missing chain_id/vendor_id." };
  }
  if (typeof commissionRatePct !== "number" || !(commissionRatePct > 0 && commissionRatePct < 100)) {
    return { ok: false, error: "No commission rate on file for Talabat. Reconnect and enter the rate you agreed to." };
  }

  const clampedDays = Math.min(Math.max(windowDays, 1), MAX_WINDOW_DAYS);
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - clampedDays * 24 * 60 * 60 * 1000);

  const token = await getValidTalabatAccessToken({
    id: channel.id,
    manager_token: channel.manager_token ?? null,
    bearer_token: channel.bearer_token ?? null,
    metadata: channel.metadata as Record<string, unknown> | null,
  });
  if (!token.accessToken) {
    return { ok: false, error: token.error ?? "Could not get a valid Talabat access token." };
  }

  const ordersResult = await getTalabatOrders({
    chainId,
    vendorId,
    accessToken: token.accessToken,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  if (!ordersResult.ok || !ordersResult.data) {
    return { ok: false, error: ordersResult.message ?? "Could not pull Talabat order history." };
  }

  let subTotalSum = 0;
  let orderCount = 0;
  for (const order of ordersResult.data) {
    const subTotal = order.payment?.sub_total;
    if (typeof subTotal === "number") {
      subTotalSum += subTotal;
      orderCount++;
    }
  }

  const expectedPayout = subTotalSum * (1 - commissionRatePct / 100);

  return {
    ok: true,
    source: "live",
    platform: "talabat",
    order_count: orderCount,
    sub_total_sum: Math.round(subTotalSum * 100) / 100,
    commission_rate_pct: commissionRatePct,
    expected_payout: Math.round(expectedPayout * 100) / 100,
    period_start: startTime.toISOString(),
    period_end: endTime.toISOString(),
  };
}
