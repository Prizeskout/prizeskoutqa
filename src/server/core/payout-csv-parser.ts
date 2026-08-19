// Parses the daily-orders CSV export a merchant can already pull from their
// own aggregator dashboard — no API access needed. Used for demos and for
// merchants not yet live-connected. Not the real product mechanism: the
// live path (expected-payout.ts) pulls real orders via API and separates
// food value from delivery fee per order. A daily CSV only has a single
// "Sales"-style total with no such split, so commission here is applied to
// that total as-is — a known, disclosed precision gap, not something to
// confuse with the live check's per-order accuracy.
//
// Column matching is exact-first, then fuzzy: this keeps Talabat's
// confirmed-working format (Date/Orders/Sales, verified against a real
// export) matching exactly as before, while giving other platforms' exports
// a real chance without hardcoding formats I've never actually seen. If a
// file doesn't match, it fails with a clear error rather than guessing.
//
// Two failure modes matter beyond "wrong columns": silently mis-parsing
// numbers (thousands separators, currency prefixes) and silently dropping
// rows. Either one can hand the merchant a confidently-wrong low number
// with no indication anything went wrong. Both are guarded below: numbers
// go through a locale-aware cleaner, and if too large a share of rows fail
// to parse, the whole file is rejected rather than quietly summed over a
// fraction of the data.
import type { ExpectedPayoutResult } from "./expected-payout";

// Fraction of data rows allowed to fail parsing before the file is rejected
// outright instead of returning a total computed from the rows that did work.
const MAX_SKIP_RATIO = 0.2;

// Many daily-export files append a trailing summary row ("Total"/"Grand
// Total") whose Date cell isn't a real date at all. Left in, it parses as
// an extra "day" that repeats the file's own grand total — silently
// doubling every sum and adding a fake final data point that wrecks the
// per-day ledger/chart (confirmed against a real Orders Per Day export).
const TOTAL_ROW_LABELS = new Set(["total", "totals", "grand total", "sub total", "subtotal", "sum", "summary"]);

function parseCsvLine(line: string): string[] {
  // Handles quoted cells (commas/quotes inside "...") per RFC 4180's common
  // case — a real export can legitimately have a comma inside a store-name
  // or notes field, which would otherwise silently shift every column after it.
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

// Strips currency symbols/codes ("QAR 12,663", "﷼12,663") and resolves
// whether "," is a thousands separator or a decimal separator, since both
// show up across real exports. Rule: a single comma followed by exactly 2
// digits at the end (and no "." already present) is treated as a decimal
// separator; every other comma usage is treated as thousands grouping.
function parseLocaleNumber(raw: string): number {
  const cleaned = (raw ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return NaN;
  const hasDot = cleaned.includes(".");
  const commaCount = (cleaned.match(/,/g) ?? []).length;
  if (commaCount > 0 && !hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const digitsAfter = cleaned.length - lastComma - 1;
    if (commaCount === 1 && digitsAfter === 2) {
      return Number(cleaned.replace(",", "."));
    }
  }
  return Number(cleaned.replace(/,/g, ""));
}

function findColumn(header: string[], exact: string[], fuzzy: string[], exclude: string[] = []): number {
  const lower = header.map(h => h.toLowerCase());
  for (const name of exact) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (let i = 0; i < lower.length; i++) {
    if (exclude.some(x => lower[i].includes(x))) continue;
    if (fuzzy.some(f => lower[i].includes(f))) return i;
  }
  return -1;
}

export function parseAggregatorDailyCsv(
  csvText: string,
  commissionRatePct: number,
  platform: string,
): ExpectedPayoutResult {
  if (!(commissionRatePct >= 0 && commissionRatePct < 100)) {
    return { ok: false, error: "Commission rate must be at least 0 and below 100." };
  }

  // Strip a UTF-8 BOM if present — Talabat's own export includes one.
  const cleaned = csvText.replace(/^﻿/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "That file doesn't look like a valid export — no data rows found." };
  }

  const header = parseCsvLine(lines[0]);
  const dateIdx      = findColumn(header, ["Date"], ["date"]);
  const ordersIdx    = findColumn(header, ["Orders"], ["order"], ["cancel"]);
  const orderIdIdx   = findColumn(header, ["Order ID","Order Number","Transaction ID"], ["order id","order number","transaction id"]);
  const salesIdx     = findColumn(header, ["Sales", "GMV", "Revenue", "Total Sales"], ["sales", "gmv", "revenue"], ["cancel"]);
  const cancelledIdx = findColumn(header, ["Cancelled"], ["cancel"]);
  const statusIdx    = findColumn(header,["Status","Order Status","Transaction Status"],["status"]);
  const refundIdx    = findColumn(header,["Refund Amount","Refunded Amount"],["refund"]);
  const settlementRefIdx=findColumn(header,["Settlement Reference","Settlement ID","Payout Reference","Payout ID"],["settlement reference","settlement id","payout reference","payout id"]);
  const settledAmountIdx=findColumn(header,["Settlement Amount","Net Payout","Paid Amount","Net Amount"],["settlement amount","net payout","paid amount","net amount"]);
  const currencyIdx=findColumn(header,["Currency"],["currency"]);

  if (dateIdx === -1 || (ordersIdx === -1 && orderIdIdx === -1) || salesIdx === -1) {
    return { ok: false, error: "Couldn't find date, orders, and sales/GMV columns in that file. CSV only for now — if this is a real export and it's not matching, the column names may differ from what we expect." };
  }

  // Drop a trailing totals row before it ever reaches the sums below — see
  // TOTAL_ROW_LABELS comment. Parsed once here rather than filtering raw
  // strings, so the loop below doesn't re-parse each line a second time.
  const dataCells = lines.slice(1).map(parseCsvLine).filter(cells => {
    const label = (cells[dateIdx] ?? "").trim().toLowerCase();
    return !TOTAL_ROW_LABELS.has(label);
  });

  let salesSum = 0;
  let orderCount = 0;
  let cancelledSum = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  let rowsSkipped = 0;
  const rowsTotal = dataCells.length;
  // Keyed by date so multiple rows for the same day (or the same file
  // parsed twice within a batch) sum rather than overwrite — the audit
  // engine merges several of these per-day maps across files the same way.
  const byDate = new Map<string, { orders: number; sales: number; cancelled: number }>();
  const transactionRows:NonNullable<ExpectedPayoutResult["transaction_rows"]>=[];
  const settlementRows:NonNullable<ExpectedPayoutResult["settlement_rows"]>=[];
  const parsedCurrencies=new Set<string>();
  const idCounts=new Map<string,number>();
  if(orderIdIdx!==-1)for(const cells of dataCells){const id=(cells[orderIdIdx]??"").trim();if(id)idCounts.set(id,(idCounts.get(id)??0)+1);}
  const duplicateOrderIds=[...idCounts].filter(([,count])=>count>1).map(([id])=>id);

  for (const cells of dataCells) {
    const date = cells[dateIdx];
    const orders = orderIdIdx!==-1?1:parseLocaleNumber(cells[ordersIdx]);
    const rawSales = parseLocaleNumber(cells[salesIdx]);
    const orderId=orderIdIdx!==-1?(cells[orderIdIdx]??"").trim():"";
    if(orderId&&idCounts.get(orderId)!>1)continue;
    const status=statusIdx!==-1?(cells[statusIdx]??"").trim().toLowerCase():"not supplied";
    const refund=refundIdx!==-1?parseLocaleNumber(cells[refundIdx]):0;
    const cancelledStatus=/cancel|reject|void|failed/.test(status);
    const pendingStatus=/pending|prepar|dispatch|ready|open|new/.test(status);
    const eligible=!cancelledStatus&&!pendingStatus;
    const sales=orderIdIdx!==-1?(eligible?Math.max(0,rawSales-(Number.isFinite(refund)?refund:0)):0):rawSales;
    const cancelled = cancelledIdx !== -1 ? parseLocaleNumber(cells[cancelledIdx]) : orderIdIdx!==-1&&cancelledStatus?1:0;
    const eligibleOrders=orderIdIdx!==-1?(eligible?1:0):orders;
    if (!date || !Number.isFinite(orders) || !Number.isFinite(sales)) {
      rowsSkipped++;
      continue;
    }

    salesSum += sales;
    orderCount += eligibleOrders;
    if (Number.isFinite(cancelled)) cancelledSum += cancelled;
    if (!firstDate || date < firstDate) firstDate = date;
    if (!lastDate || date > lastDate) lastDate = date;

    const existing = byDate.get(date) ?? { orders: 0, sales: 0, cancelled: 0 };
    existing.orders += eligibleOrders;
    existing.sales += sales;
    if (Number.isFinite(cancelled)) existing.cancelled += cancelled;
    byDate.set(date, existing);
    if(orderId)transactionRows.push({order_id:orderId,date,gross_sales:Math.round(rawSales*100)/100,refund_amount:Number.isFinite(refund)?Math.round(refund*100)/100:0,status,eligible});
    if(orderId&&settlementRefIdx!==-1&&settledAmountIdx!==-1){const reference=(cells[settlementRefIdx]??"").trim(),amount=parseLocaleNumber(cells[settledAmountIdx]),currency=currencyIdx!==-1?(cells[currencyIdx]??"").trim().toUpperCase():"UNKNOWN";if(reference&&Number.isFinite(amount)){settlementRows.push({settlement_reference:reference,order_id:orderId,amount:Math.round(amount*100)/100,currency:currency||"UNKNOWN"});parsedCurrencies.add(currency||"UNKNOWN");}}
  }

  if (orderCount === 0) {
    return { ok: false, error: "No valid order rows found in that file." };
  }

  if (rowsTotal > 0 && rowsSkipped / rowsTotal > MAX_SKIP_RATIO) {
    return {
      ok: false,
      error: `${rowsSkipped} of ${rowsTotal} rows in that file couldn't be read — the date or number format doesn't match what we expect, so the total would be unreliable. Please check the file and try again.`,
    };
  }

  const expectedPayout = salesSum * (1 - commissionRatePct / 100);

  const daily_rows = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, v]) => ({
      date,
      orders: v.orders,
      sales: Math.round(v.sales * 100) / 100,
      ...(cancelledIdx !== -1||orderIdIdx!==-1 ? { cancelled: v.cancelled } : {}),
    }));

  return {
    ok: true,
    source: "upload",
    platform,
    currency:parsedCurrencies.size===1?[...parsedCurrencies][0]:parsedCurrencies.size>1?"MIXED":undefined,
    order_count: orderCount,
    sub_total_sum: Math.round(salesSum * 100) / 100,
    commission_rate_pct: commissionRatePct,
    expected_payout: Math.round(expectedPayout * 100) / 100,
    period_start: firstDate ?? undefined,
    period_end: lastDate ?? undefined,
    rows_skipped: rowsSkipped,
    rows_total: rowsTotal,
    daily_rows,
    ...(transactionRows.length?{transaction_rows:transactionRows,duplicate_order_ids:duplicateOrderIds}:{}),
    ...(settlementRows.length?{settlement_rows:settlementRows}:{}),
    ...(cancelledIdx !== -1||orderIdIdx!==-1 ? { cancelled_orders_total: cancelledSum } : {}),
  };
}
