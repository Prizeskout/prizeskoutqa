// Parses the daily-orders CSV export merchants can already pull from their
// own Talabat dashboard (no API access needed) — used only for demos and
// one-off checks when a merchant isn't live-connected yet. Not the real
// product mechanism: the live path (expected-payout.ts) pulls real orders
// via API and separates food value from delivery fee per order. This file
// only has a daily "Sales" total with no such split, so unlike the live
// path, commission here is applied to that total as-is — this is a known,
// disclosed precision gap, not something to confuse with the real feature.
import type { ExpectedPayoutResult } from "./expected-payout";

function parseCsvLine(line: string): string[] {
  // Talabat's export has no quoted/escaped commas in practice — a plain
  // split is correct here and avoids pulling in a CSV library for one format.
  return line.split(",").map(cell => cell.trim());
}

export function parseTalabatDailyCsv(
  csvText: string,
  commissionRatePct: number,
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
  const dateIdx   = header.indexOf("Date");
  const ordersIdx = header.indexOf("Orders");
  const salesIdx  = header.indexOf("Sales");

  if (dateIdx === -1 || ordersIdx === -1 || salesIdx === -1) {
    return { ok: false, error: "Couldn't find Date, Orders, and Sales columns in that file — is this a Talabat daily orders export?" };
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
    order_count: orderCount,
    sub_total_sum: Math.round(salesSum * 100) / 100,
    commission_rate_pct: commissionRatePct,
    expected_payout: Math.round(expectedPayout * 100) / 100,
    period_start: firstDate ?? undefined,
    period_end: lastDate ?? undefined,
  };
}
