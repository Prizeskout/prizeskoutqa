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
  if (!(commissionRatePct > 0 && commissionRatePct < 100)) {
    return { ok: false, error: "Commission rate must be between 0 and 100." };
  }

  // Strip a UTF-8 BOM if present — Talabat's own export includes one.
  const cleaned = csvText.replace(/^﻿/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "That file doesn't look like a valid export — no data rows found." };
  }

  const header = parseCsvLine(lines[0]);
  const dateIdx   = findColumn(header, ["Date"], ["date"]);
  const ordersIdx = findColumn(header, ["Orders"], ["order"], ["cancel"]);
  const salesIdx  = findColumn(header, ["Sales", "GMV", "Revenue", "Total Sales"], ["sales", "gmv", "revenue"], ["cancel"]);

  if (dateIdx === -1 || ordersIdx === -1 || salesIdx === -1) {
    return { ok: false, error: "Couldn't find date, orders, and sales/GMV columns in that file. CSV only for now — if this is a real export and it's not matching, the column names may differ from what we expect." };
  }

  let salesSum = 0;
  let orderCount = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  let rowsSkipped = 0;
  const rowsTotal = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const date = cells[dateIdx];
    const orders = parseLocaleNumber(cells[ordersIdx]);
    const sales = parseLocaleNumber(cells[salesIdx]);
    if (!date || !Number.isFinite(orders) || !Number.isFinite(sales)) {
      rowsSkipped++;
      continue;
    }

    salesSum += sales;
    orderCount += orders;
    if (!firstDate || date < firstDate) firstDate = date;
    if (!lastDate || date > lastDate) lastDate = date;
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

  return {
    ok: true,
    source: "upload",
    platform,
    order_count: orderCount,
    sub_total_sum: Math.round(salesSum * 100) / 100,
    commission_rate_pct: commissionRatePct,
    expected_payout: Math.round(expectedPayout * 100) / 100,
    period_start: firstDate ?? undefined,
    period_end: lastDate ?? undefined,
    rows_skipped: rowsSkipped,
    rows_total: rowsTotal,
  };
}
