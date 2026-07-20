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
import type { ExpectedPayoutResult } from "./expected-payout";

function parseCsvLine(line: string): string[] {
  // No quoted/escaped commas observed in any real export seen so far — a
  // plain split is correct and avoids pulling in a CSV library for this.
  return line.split(",").map(cell => cell.trim());
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

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const date = cells[dateIdx];
    const orders = Number(cells[ordersIdx]);
    const sales = Number(cells[salesIdx]);
    if (!date || !Number.isFinite(orders) || !Number.isFinite(sales)) continue;

    salesSum += sales;
    orderCount += orders;
    if (!firstDate || date < firstDate) firstDate = date;
    if (!lastDate || date > lastDate) lastDate = date;
  }

  if (orderCount === 0) {
    return { ok: false, error: "No valid order rows found in that file." };
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
  };
}
