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
import { classifyOrder, commissionBaseForOrder, duplicateOrderIds, orderIdentity, type OrderEligibility } from "./payout-order-accounting";
import {applyMinimumPayoutThreshold, expectedSettlementDate, type SettlementCalendarTerms} from "./settlement-calendar";

const MAX_WINDOW_DAYS = 60; // Talabat's own limit on start_time lookback

export type ExpectedPayoutResult = {
  ok: boolean;
  error?: string;
  order_count?: number;
  sub_total_sum?: number;
  commission_rate_pct?: number;
  expected_payout?: number;
  estimated_payout?: number;
  claims_ready_payout?: number;
  claims_ready_order_count?: number;
  payout_confidence?: "claims_ready"|"estimated"|"insufficient_evidence";
  accounting_blockers?: string[];
  eligible_orders?: number;
  excluded_cancelled_orders?: number;
  excluded_pending_orders?: number;
  unknown_status_orders?: number;
  duplicate_order_ids?: string[];
  refund_total?: number;
  period_start?: string;
  period_end?: string;
  // "live" = pulled from Talabat's real Order API, sub_total_sum is food
  // value only (delivery fee confirmed separate). "upload" = from a daily
  // totals CSV with no such split — sub_total_sum there is the whole daily
  // "Sales" figure as-is. Not the same precision; the UI must label them
  // differently rather than imply both are equally exact.
  source?: "live" | "upload";
  platform?: string;
  currency?:string;
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
  branch_external_id?:string|null;
  legal_entity?:string|null;
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
  transaction_rows?: { order_id:string; date:string; gross_sales:number; refund_amount:number; status:string; eligible:boolean; claims_ready?:boolean }[];
  settlement_rows?: { settlement_reference:string; order_id:string|null; amount:number; currency:string }[];
  settlement_reference?: string|null;
  adjustment_amount?:number|null;
  adjustment_direction?:"credit"|"debit"|"unknown";
  adjustment_reason?:string|null;
  promotion_discount_total?:number|null;
  platform_funding_amount?:number|null;
  merchant_funding_amount?:number|null;
  cancellation_amount?:number|null;
  received_amount?:number|null;
  confirmation_reference?:string|null;
  order_references?:string[];
  settlement_references?:string[];
  cancelled_orders_total?: number;
  deduction_breakdown?: {
    gross_sales: number;
    commission: number;
    vat_on_fees: number;
    payment_fees: number;
    fixed_order_fees: number;
    delivery_contribution: number;
    expected_net: number;
  };
  commercial_terms?: {
    commission_rate_pct: number;
    vat_on_fees_pct: number;
    payment_fee_pct: number;
    fixed_order_fee: number;
    delivery_contribution: number;
    commission_base?: string;
    promotion_funding_platform_pct?: number | null;
    refund_liability?: string;
    cancellation_liability?: string;
    settlement_frequency?: string | null;
    settlement_days?: number | null;
    settlement_day_basis?: string|null;
    settlement_schedule_type?: string|null;
    settlement_weekday?: number|null;
    settlement_month_days?: number[];
    settlement_cutoff_hour?: number|null;
    settlement_timezone?: string|null;
    settlement_weekend_days?: number[];
    settlement_holidays?: string[];
    settlement_reserve_days?: number;
    minimum_payout_threshold?: number|null;
    dispute_deadline_days?: number | null;
    currency?: string | null;
    contract_term_id?: string | null;
    source: string;
  };
  sale_lines?: {
    order_id: string;
    product_name: string;
    sku: string | null;
    quantity: number;
    gross_sale: number;
    commission: number;
    vat_on_fees: number;
    payment_fee: number;
    fixed_order_fee: number;
    delivery_contribution: number;
    expected_net: number;
    lifecycle_status: string;
    eligibility: OrderEligibility;
    refund_amount: number;
    claims_ready: boolean;
    order_date: string | null;
    expected_settlement_date: string | null;
  }[];
  settlement_forecast?: {
    as_of: string;
    confidence: "verified_contract" | "incomplete_contract" | "estimated_schedule";
    blockers: string[];
    expected_today: number;
    expected_next_settlement: { date: string; amount: number } | null;
    by_settlement_date: { date: string; amount: number; orders: number }[];
    by_product: { product_name: string; sku: string | null; amount: number; quantity: number }[];
    by_platform: { platform: string; amount: number; orders: number }[];
    transaction_count: number;
  };
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
  const vatOnFeesPct = typeof metadata.vat_on_fees_pct === "number" ? metadata.vat_on_fees_pct : 0;
  const paymentFeePct = typeof metadata.payment_fee_pct === "number" ? metadata.payment_fee_pct : 0;
  const fixedOrderFee = typeof metadata.fixed_order_fee === "number" ? metadata.fixed_order_fee : 0;
  const deliveryContribution = typeof metadata.delivery_contribution === "number" ? metadata.delivery_contribution : 0;
  const settlementDays = typeof metadata.settlement_days === "number" ? metadata.settlement_days : null;
  const commissionBase = typeof metadata.commission_base === "string" ? metadata.commission_base : "unknown";
  const refundLiability = typeof metadata.refund_liability === "string" ? metadata.refund_liability : "unknown";
  const cancellationLiability = typeof metadata.cancellation_liability === "string" ? metadata.cancellation_liability : "unknown";
  const reviewedContract = metadata.commercial_terms_source === "reviewed_contract";
  const calendarTerms:SettlementCalendarTerms={
    settlementDays,
    dayBasis:metadata.settlement_day_basis==="calendar_days"||metadata.settlement_day_basis==="business_days"?metadata.settlement_day_basis:null,
    scheduleType:["daily","weekly","twice_monthly","monthly"].includes(String(metadata.settlement_schedule_type))?metadata.settlement_schedule_type as SettlementCalendarTerms["scheduleType"]:null,
    weekday:typeof metadata.settlement_weekday==="number"?metadata.settlement_weekday:null,
    monthDays:Array.isArray(metadata.settlement_month_days)?metadata.settlement_month_days.filter(v=>typeof v==="number"):[],
    cutoffHour:typeof metadata.settlement_cutoff_hour==="number"?metadata.settlement_cutoff_hour:null,
    timeZone:typeof metadata.settlement_timezone==="string"?metadata.settlement_timezone:null,
    weekendDays:Array.isArray(metadata.settlement_weekend_days)?metadata.settlement_weekend_days.filter(v=>typeof v==="number"):[],
    holidays:Array.isArray(metadata.settlement_holidays)?metadata.settlement_holidays.filter(v=>typeof v==="string"):[],
    reserveDays:typeof metadata.settlement_reserve_days==="number"?metadata.settlement_reserve_days:0,
    minimumPayoutThreshold:typeof metadata.minimum_payout_threshold==="number"?metadata.minimum_payout_threshold:null,
  };
  const calendarBlockers=new Set<string>();

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
    environment: metadata.environment === "sandbox" ? "sandbox" : "production",
  });

  if (!ordersResult.ok || !ordersResult.data) {
    return { ok: false, error: ordersResult.message ?? "Could not pull Talabat order history." };
  }

  let subTotalSum = 0;
  let orderCount = 0;
  const saleLines: NonNullable<ExpectedPayoutResult["sale_lines"]> = [];
  let commissionTotal = 0, vatTotal = 0, paymentFeeTotal = 0, fixedFeeTotal = 0, deliveryTotal = 0;
  let claimsReadyPayout=0,claimsReadyOrderCount=0,cancelledOrders=0,cancelledGmv=0,pendingOrders=0,unknownStatusOrders=0,refundTotal=0;
  const accountingBlockers=new Set<string>();
  const duplicateIds=duplicateOrderIds(ordersResult.data);
  if(duplicateIds.size)accountingBlockers.add("Duplicate order IDs were quarantined.");
  if(!reviewedContract)accountingBlockers.add("Commercial terms are not backed by a reviewed contract.");
  if(commissionBase==="unknown")accountingBlockers.add("The contractual commission calculation base is unknown.");
  if(paymentFeePct>0)accountingBlockers.add("The payment-fee calculation base is not separately evidenced at transaction level.");
  const round = (n: number) => Math.round(n * 100) / 100;
  for (const order of ordersResult.data) {
    const subTotal = order.payment?.sub_total;
    if (typeof subTotal === "number") {
      const identity=orderIdentity(order);
      if(identity&&duplicateIds.has(identity))continue;
      const lifecycle=classifyOrder(order);
      if(lifecycle.eligibility==="cancelled"){
        cancelledOrders++;cancelledGmv+=subTotal;
        if(cancellationLiability==="unknown")accountingBlockers.add("Cancelled sales were excluded, but cancellation-fee liability is not established.");
        continue;
      }
      if(lifecycle.eligibility==="pending"){
        pendingOrders++;accountingBlockers.add("Pending orders were excluded until their final status is known.");
        continue;
      }
      if(lifecycle.eligibility==="unknown"){
        unknownStatusOrders++;accountingBlockers.add("Some orders have no recognized final lifecycle status.");
      }
      const recognizedRefund=Math.min(subTotal,lifecycle.refundAmount);
      const eligibleSales=Math.max(0,subTotal-recognizedRefund);
      refundTotal+=recognizedRefund;
      if(lifecycle.eligibility==="refunded")accountingBlockers.add("Refunded orders remain estimated until refund liability and settlement adjustments are transaction-evidenced.");
      if(lifecycle.eligibility==="refunded"&&refundLiability==="unknown")accountingBlockers.add("Refund liability is not established in the approved commercial terms.");
      const commissionBaseResult=commissionBaseForOrder(order,eligibleSales,commissionBase);
      if(!commissionBaseResult.evidenced)accountingBlockers.add("The required commission base is not present on every order.");
      subTotalSum += eligibleSales;
      orderCount++;
      const commission = commissionBaseResult.amount * commissionRatePct / 100;
      const vat = commission * vatOnFeesPct / 100;
      const paymentFee = eligibleSales * paymentFeePct / 100;
      commissionTotal += commission;
      vatTotal += vat;
      paymentFeeTotal += paymentFee;
      fixedFeeTotal += fixedOrderFee;
      deliveryTotal += deliveryContribution;
      const orderExpectedNet=eligibleSales-commission-vat-paymentFee-fixedOrderFee-deliveryContribution;
      const lineClaimsReady=Boolean(identity&&lifecycle.eligibility==="eligible"&&reviewedContract&&commissionBaseResult.evidenced&&paymentFeePct===0);
      if(lineClaimsReady){claimsReadyPayout+=orderExpectedNet;claimsReadyOrderCount++;}

      const items = order.products ?? order.items ?? [];
      const normalizedItems = items.length ? items : [{ name: "Order total", quantity: 1, total_price: eligibleSales }];
      const itemGrosses = normalizedItems.map(item => {
        const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
        const gross = typeof item.total_price === "number" ? item.total_price
          : (typeof item.unit_price === "number" ? item.unit_price : typeof item.price === "number" ? item.price : 0) * quantity;
        return { item, quantity, gross };
      });
      const knownGross = itemGrosses.reduce((n, item) => n + item.gross, 0);
      itemGrosses.forEach((entry, index) => {
        const share = knownGross > 0 ? entry.gross / knownGross : 1 / itemGrosses.length;
        const grossSale = knownGross > 0 ? eligibleSales*share : eligibleSales * share;
        const lineCommission = commission * share;
        const lineVat = vat * share;
        const linePayment = paymentFee * share;
        const lineFixed = fixedOrderFee * share;
        const lineDelivery = deliveryContribution * share;
        const rawOrderDate = [order.created_at, order.created_at_utc, order.order_time, order.timestamp]
          .find(value => typeof value === "string") as string | undefined;
        const parsedOrderDate = rawOrderDate && Number.isFinite(Date.parse(rawOrderDate))
          ? new Date(rawOrderDate) : null;
        const settlementResult=parsedOrderDate?expectedSettlementDate(parsedOrderDate.toISOString(),calendarTerms):{date:null,blockers:[]};
        settlementResult.blockers.forEach(item=>calendarBlockers.add(item));
        const settlementDate=settlementResult.date;
        saleLines.push({
          order_id: order.order_id ?? order.order_code ?? `order-${orderCount}`,
          product_name: entry.item.name ?? `Item ${index + 1}`,
          sku: entry.item.sku ?? entry.item.id ?? null,
          quantity: entry.quantity,
          gross_sale: round(grossSale),
          commission: round(lineCommission),
          vat_on_fees: round(lineVat),
          payment_fee: round(linePayment),
          fixed_order_fee: round(lineFixed),
          delivery_contribution: round(lineDelivery),
          expected_net: round(grossSale - lineCommission - lineVat - linePayment - lineFixed - lineDelivery),
          lifecycle_status:lifecycle.status,eligibility:lifecycle.eligibility,
          refund_amount:round(recognizedRefund*share),claims_ready:lineClaimsReady,
          order_date: parsedOrderDate?.toISOString() ?? null,
          expected_settlement_date: settlementDate,
        });
      });
    }
  }

  const expectedPayout = subTotalSum - commissionTotal - vatTotal - paymentFeeTotal - fixedFeeTotal - deliveryTotal;
  const datedLines = saleLines.filter(line=>line.expected_settlement_date);
  const settlementMap = new Map<string,{ amount:number; orders:Set<string> }>();
  for (const line of datedLines) {
    const key = line.expected_settlement_date!;
    const current = settlementMap.get(key) ?? { amount:0, orders:new Set<string>() };
    current.amount += line.expected_net;
    current.orders.add(line.order_id);
    settlementMap.set(key,current);
  }
  const rawSettlementDates = [...settlementMap.entries()]
    .map(([date,value])=>({date,amount:round(value.amount),orders:value.orders.size}))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const thresholdResult=applyMinimumPayoutThreshold(rawSettlementDates,calendarTerms.minimumPayoutThreshold);
  const bySettlementDate=thresholdResult.rows.map(row=>({...row,amount:round(row.amount)}));
  const today = new Date().toISOString().slice(0,10);
  const nextSettlement = bySettlementDate.find(item=>item.date>=today) ?? null;
  const productMap = new Map<string,{product_name:string;sku:string|null;amount:number;quantity:number}>();
  for (const line of saleLines) {
    const key = line.sku || line.product_name;
    const current = productMap.get(key) ?? {product_name:line.product_name,sku:line.sku,amount:0,quantity:0};
    current.amount += line.expected_net; current.quantity += line.quantity;
    productMap.set(key,current);
  }
  const blockers = [
    !reviewedContract && "Commercial terms have not been approved from a reviewed contract.",
    commissionBase === "unknown" && "Commission calculation base is not established.",
    settlementDays == null && "Settlement lag is not established, so settlement dates cannot be forecast.",
    datedLines.length < saleLines.length && "Some Talabat orders do not expose a usable order timestamp.",
    ...calendarBlockers,
    thresholdResult.heldAmount>0 && `Expected payouts below the minimum threshold are being carried forward (${round(thresholdResult.heldAmount)} currently held).`,
    ...accountingBlockers,
  ].filter(Boolean) as string[];

  return {
    ok: true,
    source: "live",
    platform: "talabat",
    order_count: orderCount,
    sub_total_sum: Math.round(subTotalSum * 100) / 100,
    commission_rate_pct: commissionRatePct,
    expected_payout: Math.round(expectedPayout * 100) / 100,
    estimated_payout:round(expectedPayout),
    claims_ready_payout:round(claimsReadyPayout),
    claims_ready_order_count:claimsReadyOrderCount,
    payout_confidence:accountingBlockers.size===0&&claimsReadyOrderCount===orderCount?"claims_ready":orderCount?"estimated":"insufficient_evidence",
    accounting_blockers:[...accountingBlockers],eligible_orders:orderCount,
    excluded_cancelled_orders:cancelledOrders,excluded_pending_orders:pendingOrders,unknown_status_orders:unknownStatusOrders,
    duplicate_order_ids:[...duplicateIds],refund_total:round(refundTotal),cancelled_orders:cancelledOrders,cancelled_gmv:round(cancelledGmv),
    commission_amount: round(commissionTotal),
    deduction_breakdown: {
      gross_sales: round(subTotalSum), commission: round(commissionTotal), vat_on_fees: round(vatTotal),
      payment_fees: round(paymentFeeTotal), fixed_order_fees: round(fixedFeeTotal),
      delivery_contribution: round(deliveryTotal), expected_net: round(expectedPayout),
    },
    commercial_terms: {
      commission_rate_pct: commissionRatePct, vat_on_fees_pct: vatOnFeesPct,
      payment_fee_pct: paymentFeePct, fixed_order_fee: fixedOrderFee,
      delivery_contribution: deliveryContribution,
      commission_base: typeof metadata.commission_base === "string" ? metadata.commission_base : "unknown",
      promotion_funding_platform_pct: typeof metadata.promotion_funding_platform_pct === "number" ? metadata.promotion_funding_platform_pct : null,
      refund_liability: refundLiability,
      cancellation_liability: cancellationLiability,
      settlement_frequency: typeof metadata.settlement_frequency === "string" ? metadata.settlement_frequency : null,
      settlement_days: typeof metadata.settlement_days === "number" ? metadata.settlement_days : null,
      settlement_day_basis:calendarTerms.dayBasis,
      settlement_schedule_type:calendarTerms.scheduleType,
      settlement_weekday:calendarTerms.weekday,
      settlement_month_days:calendarTerms.monthDays,
      settlement_cutoff_hour:calendarTerms.cutoffHour,
      settlement_timezone:calendarTerms.timeZone,
      settlement_weekend_days:calendarTerms.weekendDays,
      settlement_holidays:calendarTerms.holidays,
      settlement_reserve_days:calendarTerms.reserveDays,
      minimum_payout_threshold:calendarTerms.minimumPayoutThreshold,
      dispute_deadline_days: typeof metadata.dispute_deadline_days === "number" ? metadata.dispute_deadline_days : null,
      currency: typeof metadata.contract_currency === "string" ? metadata.contract_currency : null,
      contract_term_id: typeof metadata.contract_term_id === "string" ? metadata.contract_term_id : null,
      source: typeof metadata.commercial_terms_source === "string" ? metadata.commercial_terms_source : "merchant_contract",
    },
    sale_lines: saleLines,
    settlement_forecast: {
      as_of: new Date().toISOString(),
      confidence: !reviewedContract || commissionBase === "unknown"
        ? "incomplete_contract"
        : blockers.length ? "estimated_schedule" : "verified_contract",
      blockers,
      expected_today: round(bySettlementDate.find(item=>item.date===today)?.amount ?? 0),
      expected_next_settlement: nextSettlement ? {date:nextSettlement.date,amount:nextSettlement.amount} : null,
      by_settlement_date: bySettlementDate,
      by_product: [...productMap.values()].map(item=>({...item,amount:round(item.amount)})).sort((a,b)=>b.amount-a.amount),
      by_platform: [{platform:"talabat",amount:round(expectedPayout),orders:orderCount}],
      transaction_count: orderCount,
    },
    period_start: startTime.toISOString(),
    period_end: endTime.toISOString(),
  };
}
