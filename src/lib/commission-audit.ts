// Cross-document commission reconciliation — runs entirely in the browser.
// Each uploaded file is still parsed server-side through the existing
// Expected Payout Check upload path (see payout-csv-parser.ts /
// payout-statement-parser.ts / payout-pdf-parser.ts); this module only
// combines the already-parsed results. No DB dependency, no network call —
// pure computation over ExpectedPayoutResult-shaped objects.
//
// Core rule this module exists to enforce: never diff grand totals across
// documents that cover different date ranges and call the gap a finding.
// A daily order log and a payout statement can legitimately cover different,
// only partially-overlapping periods — that's not an anomaly, it's two
// documents about different windows of time. Real findings come from
// aligning periods first, then comparing what's actually comparable.

// Structural subset of ExpectedPayoutResult (src/server/core/expected-payout.ts),
// duplicated here rather than imported so this module has zero dependency on
// server code — it runs entirely client-side.
export type PayoutResultLike = {
  order_count?: number | null;
  sub_total_sum?: number | null;
  commission_rate_pct?: number | null;
  expected_payout?: number | null;
  source?: string | null;
  platform?: string | null;
  brand?: string | null;
  commission_amount?: number | null;
  additional_charges?: number | null;
  additional_income?: number | null;
  effective_commission_pct?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  extra_line_items?: { label: string; value: number }[] | null;
  unexplained_charge?: { label: string; amount: number } | null;
  daily_rows?: { date: string; orders: number; sales: number; cancelled?: number }[] | null;
  cancelled_orders_total?: number | null;
};

export type DocumentType = "daily_log" | "statement" | "summary_pdf";

export type Finding = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  amount?: number;
};

export type LedgerRow = {
  date: string;
  orders: number;
  sales: number;
  commission_at_agreed_rate: number;
  expected_net: number;
};

export type ClassifiedDocument = {
  id: string;
  file_name: string;
  document_type: DocumentType;
  result: PayoutResultLike;
};

// Talabat's real statement parser only ever sets effective_commission_pct;
// the Snoonu PDF parser only ever sets brand; anything else that came back
// ok:true from the upload path is the generic daily-totals CSV parser, which
// always populates daily_rows.
export function classifyResult(result: PayoutResultLike): DocumentType {
  if (result.effective_commission_pct != null) return "statement";
  if (result.brand != null) return "summary_pdf";
  return "daily_log";
}

// Small formatting/rounding gaps aren't a real discrepancy — only flag a
// cross-check mismatch once it's clearly outside normal rounding noise.
const CROSS_CHECK_TOLERANCE_PCT = 0.02;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeAgreedRateFinding(doc: ClassifiedDocument): Finding | null {
  const r = doc.result;
  if (r.commission_rate_pct == null || r.effective_commission_pct == null) return null;
  const subTotal = r.sub_total_sum ?? 0;
  const expectedPayout = r.expected_payout ?? 0;
  const expectedAtAgreed = expectedPayout + ((r.commission_amount ?? 0) - (subTotal * r.commission_rate_pct) / 100);
  const delta = expectedAtAgreed - expectedPayout;
  if (Math.abs(delta) <= 0.01) return null;
  const shortfall = delta > 0;
  return {
    id: `rate-deviation-${doc.id}`,
    severity: shortfall ? "warning" : "info",
    title: shortfall
      ? `Commission charged above the agreed rate in ${doc.file_name}`
      : `Commission charged below the agreed rate in ${doc.file_name}`,
    detail: `Agreed ${r.commission_rate_pct}% vs. actual effective ${r.effective_commission_pct}% — ${shortfall ? "this cost" : "this saved"} approximately ${Math.abs(delta).toFixed(2)} relative to the agreed rate.`,
    amount: round2(Math.abs(delta)),
  };
}

// Talabat's own statement genuinely has no itemized column for this charge
// (every explainer column reads zero) — so "tracing" it means deriving a
// rate from data already in hand, not finding a hidden line item. A per-unit
// rate is something a merchant can actually take back to the platform
// ("does this match a flat per-order fee?"), which a bare total does not.
function computeUnexplainedChargeFinding(doc: ClassifiedDocument, dailyDocs: ClassifiedDocument[]): Finding | null {
  const uc = doc.result.unexplained_charge;
  if (!uc) return null;

  const orderCount = doc.result.order_count ?? 0;
  const perOrder = orderCount > 0 ? uc.amount / orderCount : null;

  // If a daily-log document overlaps this statement's period, also trace a
  // per-cancelled-order rate — cancellations are the one thing "Avoidable
  // cancellation fee"/"Avoidable Wait Time" columns imply could be charged
  // per-incident, even though those columns read zero here.
  const stmtStart = doc.result.period_start;
  const stmtEnd = doc.result.period_end ?? stmtStart;
  let cancelledInWindow = 0;
  if (stmtStart && stmtEnd) {
    for (const d of dailyDocs) {
      for (const row of d.result.daily_rows ?? []) {
        if (row.date >= stmtStart && row.date <= stmtEnd && row.cancelled) {
          cancelledInWindow += row.cancelled;
        }
      }
    }
  }
  const perCancelled = cancelledInWindow > 0 ? uc.amount / cancelledInWindow : null;

  const clues: string[] = [];
  if (perOrder != null) clues.push(`${perOrder.toFixed(2)} per order across ${orderCount} orders`);
  if (perCancelled != null) clues.push(`${perCancelled.toFixed(2)} per cancelled order across ${cancelledInWindow} cancelled order(s) in this period`);
  const traceNote = clues.length ? ` Traced as a rate: ${clues.join(", or ")} — worth asking the platform whether either matches a flat per-order or per-cancellation fee.` : "";

  return {
    id: `unexplained-charge-${doc.id}`,
    severity: "warning",
    title: `Unexplained charge in ${doc.file_name}`,
    detail: `${uc.label} of ${uc.amount.toFixed(2)} has no itemized explanation anywhere else in this statement.${traceNote}`,
    amount: uc.amount,
  };
}

function computeCancelledOpenQuestion(doc: ClassifiedDocument): Finding | null {
  const total = doc.result.cancelled_orders_total;
  if (!total) return null;
  return {
    id: `cancelled-open-question-${doc.id}`,
    severity: "info",
    title: `Cancelled orders reported in ${doc.file_name}`,
    detail: `${total} cancelled order(s) appear in this file. It isn't possible to confirm from this file alone whether the Sales figures already exclude them — worth confirming directly with the platform, since it affects the ledger's accuracy.`,
  };
}

function computeDuplicateDateFinding(dateCollisions: string[]): Finding | null {
  if (!dateCollisions.length) return null;
  const shown = dateCollisions.slice(0, 10).join(", ");
  return {
    id: "duplicate-dates",
    severity: "info",
    title: "Overlapping dates across uploaded daily logs",
    detail: `${dateCollisions.length} date(s) appear in more than one uploaded daily-log file (values were summed): ${shown}${dateCollisions.length > 10 ? "…" : ""}. Confirm you didn't upload overlapping periods twice.`,
  };
}

function computePeriodFindings(
  coverage: { start: string; end: string } | null,
  ledgerRows: LedgerRow[],
  statementDocs: ClassifiedDocument[],
): Finding[] {
  if (!coverage) return [];
  const findings: Finding[] = [];

  for (const doc of statementDocs) {
    const stmtStart = doc.result.period_start;
    const stmtEnd = doc.result.period_end ?? stmtStart;
    if (!stmtStart || !stmtEnd) continue;

    const disjoint = coverage.end < stmtStart || coverage.start > stmtEnd;
    if (disjoint) {
      findings.push({
        id: `period-disjoint-${doc.id}`,
        severity: "info",
        title: `Daily log and ${doc.file_name} cover different periods`,
        detail: `Daily order log covers ${coverage.start} to ${coverage.end}; ${doc.file_name} covers ${stmtStart} to ${stmtEnd}. These don't overlap, so their totals aren't directly comparable and weren't cross-checked.`,
      });
      continue;
    }

    const fullySubset = coverage.start >= stmtStart && coverage.end <= stmtEnd;
    if (fullySubset) {
      const overlapSum = ledgerRows
        .filter(r => r.date >= stmtStart && r.date <= stmtEnd)
        .reduce((s, r) => s + r.sales, 0);
      const statementGross = doc.result.sub_total_sum ?? 0;
      const diff = overlapSum - statementGross;
      const withinTolerance = statementGross > 0 && Math.abs(diff) / statementGross <= CROSS_CHECK_TOLERANCE_PCT;
      findings.push({
        id: `period-cross-check-${doc.id}`,
        severity: withinTolerance ? "info" : "critical",
        title: withinTolerance
          ? `Daily log sales reconcile against ${doc.file_name}`
          : `Daily log sales don't match ${doc.file_name}`,
        detail: `Daily order log sums to ${overlapSum.toFixed(2)} in sales for ${stmtStart} to ${stmtEnd}; ${doc.file_name} states Gross Sales of ${statementGross.toFixed(2)} for the same period — a difference of ${diff.toFixed(2)}.`,
        amount: round2(Math.abs(diff)),
      });
      continue;
    }

    const overlapStart = coverage.start > stmtStart ? coverage.start : stmtStart;
    const overlapEnd = coverage.end < stmtEnd ? coverage.end : stmtEnd;
    findings.push({
      id: `period-partial-${doc.id}`,
      severity: "warning",
      title: `Daily log only partially covers ${doc.file_name}'s period`,
      detail: `Daily order log covers ${coverage.start} to ${coverage.end}; ${doc.file_name} covers ${stmtStart} to ${stmtEnd}. Only ${overlapStart} to ${overlapEnd} overlaps — a full total comparison isn't reliable across a partial window, so no dollar cross-check was attempted.`,
    });
  }

  return findings;
}

export function reconcile(
  docs: ClassifiedDocument[],
  commissionRatePct: number,
): {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
} {
  const dailyDocs = docs.filter(d => d.document_type === "daily_log" && (d.result.daily_rows?.length ?? 0) > 0);
  const statementDocs = docs.filter(d => d.document_type === "statement");

  const byDate = new Map<string, { orders: number; sales: number }>();
  const sources = new Map<string, Set<string>>();
  for (const doc of dailyDocs) {
    for (const row of doc.result.daily_rows ?? []) {
      const existing = byDate.get(row.date) ?? { orders: 0, sales: 0 };
      existing.orders += row.orders;
      existing.sales += row.sales;
      byDate.set(row.date, existing);
      const srcSet = sources.get(row.date) ?? new Set<string>();
      srcSet.add(doc.id);
      sources.set(row.date, srcSet);
    }
  }

  const rate = Number.isFinite(commissionRatePct) ? commissionRatePct : 0;
  const ledger: LedgerRow[] = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, v]) => {
      const commission = round2((v.sales * rate) / 100);
      return {
        date,
        orders: v.orders,
        sales: round2(v.sales),
        commission_at_agreed_rate: commission,
        expected_net: round2(v.sales - commission),
      };
    });

  const ledgerTotals: LedgerRow | null = ledger.length
    ? ledger.reduce(
        (acc, r) => ({
          date: "Total",
          orders: acc.orders + r.orders,
          sales: round2(acc.sales + r.sales),
          commission_at_agreed_rate: round2(acc.commission_at_agreed_rate + r.commission_at_agreed_rate),
          expected_net: round2(acc.expected_net + r.expected_net),
        }),
        { date: "Total", orders: 0, sales: 0, commission_at_agreed_rate: 0, expected_net: 0 },
      )
    : null;

  const coverage = ledger.length ? { start: ledger[0].date, end: ledger[ledger.length - 1].date } : null;
  const dateCollisions = [...sources.entries()].filter(([, s]) => s.size > 1).map(([d]) => d).sort();

  const findings: Finding[] = [];
  const dupFinding = computeDuplicateDateFinding(dateCollisions);
  if (dupFinding) findings.push(dupFinding);

  for (const doc of statementDocs) {
    const rateFinding = computeAgreedRateFinding(doc);
    if (rateFinding) findings.push(rateFinding);
    const chargeFinding = computeUnexplainedChargeFinding(doc, dailyDocs);
    if (chargeFinding) findings.push(chargeFinding);
  }
  for (const doc of dailyDocs) {
    const cancelledFinding = computeCancelledOpenQuestion(doc);
    if (cancelledFinding) findings.push(cancelledFinding);
  }

  // Cross-document period comparisons only make sense once there's more than
  // one document AND at least one of each type to actually compare.
  if (docs.length >= 2 && dailyDocs.length > 0 && statementDocs.length > 0) {
    findings.push(...computePeriodFindings(coverage, ledger, statementDocs));
  }

  return { ledger, ledgerTotals, findings, coverage };
}

export const SEVERITY_ORDER: Record<Finding["severity"], number> = { critical: 0, warning: 1, info: 2 };
