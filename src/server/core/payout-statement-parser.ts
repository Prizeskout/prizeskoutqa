// Parses Talabat's REAL payout statement export ("Payout Metadata" CSV, one
// row per payout cycle) — the format actually used by Talabat's finance/
// payouts screen, confirmed against a real export and cross-checked field by
// field against the matching in-app "Payout details" breakdown.
//
// This replaces an earlier, wrong assumption: PrizeSkout used to treat a
// merchant-supplied "Sales" figure as gross revenue and estimate payout as
// sales * (1 - commission%). That's not how Talabat's real payout works —
// it also nets in Additional Charges (wait-time/cancellation fees etc.) and
// Additional Income (platform-funded vouchers), which a flat commission%
// calculation can't see. Concretely, for a real June 2026 statement:
//   Gross Sales 14,603 * (1 - 19%) = 11,828.43   (old estimate)
//   Actual stated Total Payout     = 11,868.30   (real number, from the file)
// The gap is small here only because that period's extra charges and extra
// income happened to roughly offset — it won't always be that close, so this
// parser reads Talabat's own stated Total Payout directly instead of
// recomputing it, and surfaces the full breakdown so a merchant can see
// exactly what moved between Gross Sales and the number that hit their bank.
import type { ExpectedPayoutResult } from "./expected-payout";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function num(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Columns that feed the cross-check sum against the stated Total Payout.
// Deliberately excludes "Total Earnings" — that column reads 0 in every
// real sample seen and sits where a subtotal would; including it risked
// double-counting Gross Sales/Additional Income if Talabat ever populates it.
const LINE_ITEM_COLUMNS = [
  "gross sales", "additional income", "delivery fee", "packaging fee",
  "minimum order value fee", "commission charge", "tax charge",
  "cash collection", "additional charges", "discounts funded by you",
  "vouchers funded by you", "discounts funded by brand",
  "voucher funded from platform", "marketing charges",
  "avoidable wait time", "loans installments", "opening balance",
  "vendor charges", "avoidable cancellation fee",
];

// Columns beyond the 4 headline buckets (Gross Sales, Commission, Additional
// Charges, Additional Income+Vouchers) — every real export seen so far has
// these all at zero, but if Talabat ever populates one, it would otherwise
// be silently invisible to the merchant despite feeding the cross-check sum.
const EXTRA_ITEM_COLUMNS: { key: string; label: string }[] = [
  { key: "delivery fee", label: "Delivery Fee" },
  { key: "packaging fee", label: "Packaging Fee" },
  { key: "minimum order value fee", label: "Minimum Order Value Fee" },
  { key: "tax charge", label: "Tax Charge" },
  { key: "cash collection", label: "Cash Collection" },
  { key: "discounts funded by you", label: "Discounts Funded By You" },
  { key: "vouchers funded by you", label: "Vouchers Funded By You" },
  { key: "discounts funded by brand", label: "Discounts Funded By Brand" },
  { key: "marketing charges", label: "Marketing Charges" },
  { key: "avoidable wait time", label: "Avoidable Wait Time" },
  { key: "loans installments", label: "Loans Installments" },
  { key: "opening balance", label: "Opening Balance" },
  { key: "vendor charges", label: "Vendor Charges" },
  { key: "avoidable cancellation fee", label: "Avoidable Cancellation Fee" },
];

// The specific columns that COULD explain a nonzero "Additional Charges" —
// if all of these are zero while Additional Charges isn't, that charge has
// no itemized explanation anywhere in Talabat's own export.
const CHARGE_EXPLAINER_KEYS = [
  "tax charge", "cash collection", "marketing charges", "avoidable wait time",
  "vendor charges", "avoidable cancellation fee",
];

export function parseTalabatPayoutStatementCsv(
  csvText: string,
  agreedCommissionRatePct?: number,
): ExpectedPayoutResult {
  const cleaned = csvText.replace(/^﻿/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
  // Real export has a grouping row ("Payout Metadata,,,Earnings,,,...") above
  // the actual column-name row — skip it and use row 2 as the header.
  if (lines.length < 3) {
    return { ok: false, error: "That file doesn't look like a Talabat payout statement — expected a header row and at least one payout period." };
  }

  const header = parseCsvLine(lines[1]).map(h => h.toLowerCase().trim());
  const idx = (name: string) => header.indexOf(name);

  const earningsRangeIdx = idx("earnings range");
  const ordersIdx = idx("orders count");
  const totalPayoutIdx = idx("total payout");
  const grossSalesIdx = idx("gross sales");

  if (earningsRangeIdx === -1 || ordersIdx === -1 || totalPayoutIdx === -1 || grossSalesIdx === -1) {
    return { ok: false, error: "Couldn't find the expected Talabat payout columns (Earnings Range, Orders Count, Total Payout, Gross Sales) in that file." };
  }

  const commissionIdx = idx("commission charge");
  const additionalChargesIdx = idx("additional charges");
  const additionalIncomeIdx = idx("additional income");
  const voucherIdx = idx("voucher funded from platform");
  const lineItemIdxs = LINE_ITEM_COLUMNS.map(name => idx(name)).filter(i => i !== -1);

  // Talabat's own export has at least one column whose real label is a raw,
  // untranslated i18n key ("plugins.finance.earnings_summary_export.titles.
  // customer_fee_total") — a bug on their side, not ours. Match it fuzzily
  // and give it a readable label rather than showing the broken key.
  const customerFeeIdx = header.findIndex(h => h.includes("customer_fee_total"));
  const extraColumns = [
    ...EXTRA_ITEM_COLUMNS.map(c => ({ ...c, colIdx: idx(c.key) })),
    ...(customerFeeIdx !== -1 ? [{ key: "customer_fee_total", label: "Customer Fee Total", colIdx: customerFeeIdx }] : []),
  ].filter(c => c.colIdx !== -1);
  const explainerIdxs = [
    ...CHARGE_EXPLAINER_KEYS.map(k => idx(k)),
    ...(customerFeeIdx !== -1 ? [customerFeeIdx] : []),
  ].filter(i => i !== -1);

  let orderCount = 0;
  let grossSales = 0;
  let totalPayout = 0;
  let commissionAmount = 0;
  let additionalCharges = 0;
  let additionalIncome = 0;
  let voucherFunded = 0;
  let firstPeriod: string | null = null;
  let lastPeriod: string | null = null;
  let rowsParsed = 0;
  const extraSums = new Map<string, number>(extraColumns.map(c => [c.label, 0]));
  let explainerSum = 0;

  for (let i = 2; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const range = cells[earningsRangeIdx];
    const orders = num(cells[ordersIdx]);
    const stated = num(cells[totalPayoutIdx]);
    const gross = num(cells[grossSalesIdx]);
    if (!range || gross <= 0) continue;

    rowsParsed++;
    orderCount += orders;
    grossSales += gross;
    totalPayout += stated;
    if (commissionIdx !== -1) commissionAmount += Math.abs(num(cells[commissionIdx]));
    if (additionalChargesIdx !== -1) additionalCharges += Math.abs(num(cells[additionalChargesIdx]));
    if (additionalIncomeIdx !== -1) additionalIncome += num(cells[additionalIncomeIdx]);
    if (voucherIdx !== -1) voucherFunded += num(cells[voucherIdx]);

    for (const c of extraColumns) {
      extraSums.set(c.label, (extraSums.get(c.label) ?? 0) + num(cells[c.colIdx]));
    }
    explainerSum += explainerIdxs.reduce((acc, colIdx) => acc + num(cells[colIdx]), 0);

    const sumCheck = lineItemIdxs.reduce((acc, colIdx) => acc + num(cells[colIdx]), 0);
    if (Math.abs(sumCheck - stated) > 0.05) {
      console.error(`[payout-statement-parser] row ${i}: line items sum to ${sumCheck} but stated Total Payout is ${stated} — Talabat's export format may have changed.`);
    }

    const [start, end] = range.split(" - ").map(s => s.trim());
    if (start && (!firstPeriod || start < firstPeriod)) firstPeriod = start;
    if ((end ?? start) && (!lastPeriod || (end ?? start) > lastPeriod)) lastPeriod = end ?? start;
  }

  if (rowsParsed === 0 || grossSales <= 0) {
    return { ok: false, error: "No valid payout periods found in that file." };
  }

  const extra_line_items = extraColumns
    .map(c => ({ label: c.label, value: Math.round((extraSums.get(c.label) ?? 0) * 100) / 100 }))
    .filter(li => li.value !== 0);

  // Additional Charges has no itemized explanation anywhere in this file if
  // every column that could plausibly account for it is zero — confirmed
  // against a real statement where this was exactly the case.
  const unexplained_charge = additionalCharges !== 0 && explainerSum === 0
    ? { label: "Additional Charges", amount: Math.round(additionalCharges * 100) / 100 }
    : null;

  return {
    ok: true,
    source: "upload",
    platform: "talabat",
    order_count: orderCount,
    sub_total_sum: Math.round(grossSales * 100) / 100,
    expected_payout: Math.round(totalPayout * 100) / 100,
    commission_rate_pct: agreedCommissionRatePct,
    commission_amount: Math.round(commissionAmount * 100) / 100,
    additional_charges: Math.round(additionalCharges * 100) / 100,
    additional_income: Math.round((additionalIncome + voucherFunded) * 100) / 100,
    effective_commission_pct: Math.round((commissionAmount / grossSales) * 10000) / 100,
    period_start: firstPeriod ?? undefined,
    period_end: lastPeriod ?? undefined,
    extra_line_items: extra_line_items.length > 0 ? extra_line_items : undefined,
    unexplained_charge,
  };
}
