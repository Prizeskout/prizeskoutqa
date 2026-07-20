// Parses Snoonu's monthly "Brand Performance Report" PDF — specifically
// verified against a real export. Deliberately narrow: that report's 12-
// month trend charts (Delivered Orders, Cancelled GMV, etc.) extract as flat
// number sequences with no reliable link back to which month each number
// belongs to — checked by hand against a real sample and found an outright
// contradiction (the Cancelled Orders trend chart's last value didn't match
// the report's own summary line for the same month). Those are NOT parsed.
//
// The one part that IS unambiguous is the top summary line: a fixed list of
// column labels immediately followed by that many values, for the report's
// single named month — e.g.
//   GMV Orders AOV OPU Cancelled GMV Cancelled Orders MP Ratio
//   2,501 35 71.44 2.19 236 5 100.0%
// This is a single month's totals, not a date range like the CSV upload
// path gives — the UI must not imply otherwise.
import type { ExpectedPayoutResult } from "./expected-payout";

const SUMMARY_LINE =
  /GMV\s+Orders\s+AOV\s+OPU\s+Cancelled\s+GMV\s+Cancelled\s+Orders\s+MP\s+Ratio\s+([\d,]+)\s+([\d,]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,]+)\s+([\d,]+)\s+([\d.]+)%/;
const BRAND_LINE = /Brand:\s*([A-Za-z0-9 &'.-]+?)\s+Active Branches/;
const MONTH_LINE = /Report Month:\s*([A-Za-z]+ \d{4})/;

function num(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

export function parseSnoonuBrandReportPdf(
  pdfText: string,
  commissionRatePct: number,
): ExpectedPayoutResult {
  if (!(commissionRatePct > 0 && commissionRatePct < 100)) {
    return { ok: false, error: "Commission rate must be between 0 and 100." };
  }

  const match = SUMMARY_LINE.exec(pdfText);
  if (!match) {
    return {
      ok: false,
      error: "Couldn't find Snoonu's Brand Performance Report summary line in that PDF. This parser is only verified against that exact report format — if this is a different Snoonu export, it isn't supported yet.",
    };
  }

  const gmv = num(match[1]);
  const orders = num(match[2]);
  const cancelledGmv = num(match[5]);
  const cancelledOrders = num(match[6]);

  if (!Number.isFinite(gmv) || gmv <= 0 || !Number.isFinite(orders) || orders <= 0) {
    return { ok: false, error: "Found the summary line but couldn't read GMV/Orders as numbers. Please check the file." };
  }

  const month = MONTH_LINE.exec(pdfText)?.[1];
  const brand = BRAND_LINE.exec(pdfText)?.[1]?.trim();
  const expectedPayout = gmv * (1 - commissionRatePct / 100);

  return {
    ok: true,
    source: "upload",
    platform: "snoonu",
    order_count: orders,
    sub_total_sum: gmv,
    commission_rate_pct: commissionRatePct,
    expected_payout: Math.round(expectedPayout * 100) / 100,
    period_start: month,
    period_end: month,
    brand,
    cancelled_gmv: Number.isFinite(cancelledGmv) ? cancelledGmv : undefined,
    cancelled_orders: Number.isFinite(cancelledOrders) ? cancelledOrders : undefined,
  };
}
