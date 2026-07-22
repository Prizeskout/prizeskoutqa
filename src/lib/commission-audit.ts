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
  charge_explainers?: { label: string; value: number }[] | null;
  // "merchant_received" documents only — what the merchant typed as the
  // amount that actually landed in their bank. Deliberately a distinct
  // field from expected_payout (which always means "a platform-computed or
  // platform-stated figure") so the two are never confused downstream.
  received_amount?: number | null;
};

// classifyResult() can only ever return one of these three — it infers the
// type purely from which parser produced the result. "merchant_received" is
// never structurally inferred; it's only ever assigned directly (manual
// entry, or an explicit user correction of a file's detected type).
export type StructuralDocumentType = "daily_log" | "statement" | "summary_pdf";
export type DocumentType = StructuralDocumentType | "merchant_received";

export type Finding = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  amount?: number;
  // Structured version of what the detail sentence already says in prose —
  // lets the UI/PDF show the actual investigation (columns checked, rates
  // derived) instead of just the summary sentence.
  trace?: {
    checkedColumns?: { label: string; value: number }[];
    perOrder?: { rate: number; count: number };
    perCancelled?: { rate: number; count: number };
  };
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
  // The merchant's own free-text note on what this document is, shown in
  // findings/UI (e.g. "what Talabat compiled"). Optional — most documents
  // still have none, classified purely by file structure as before.
  description?: string;
  platform_guess?: string | null;
};

// Talabat's real statement parser only ever sets effective_commission_pct;
// the Snoonu PDF parser only ever sets brand; anything else that came back
// ok:true from the upload path is the generic daily-totals CSV parser, which
// always populates daily_rows.
export function classifyResult(result: PayoutResultLike): StructuralDocumentType {
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
    trace: {
      checkedColumns: doc.result.charge_explainers ?? undefined,
      perOrder: perOrder != null ? { rate: round2(perOrder), count: orderCount } : undefined,
      perCancelled: perCancelled != null ? { rate: round2(perCancelled), count: cancelledInWindow } : undefined,
    },
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

export type CrossCheckWindow = { start: string; end: string; label: string; matched: boolean };

type PeriodRelation =
  | { kind: "disjoint" }
  | { kind: "subset" }
  | { kind: "partial"; overlapStart: string; overlapEnd: string };

// Shared interval logic for every cross-document period comparison in this
// engine — the one rule this whole module exists to enforce: never treat
// two non-overlapping (or only partially-overlapping) periods as directly
// comparable. Dates are plain ISO "YYYY-MM-DD" strings, so lexicographic
// comparison is correct.
function relatePeriods(aStart: string, aEnd: string, bStart: string, bEnd: string): PeriodRelation {
  if (aEnd < bStart || aStart > bEnd) return { kind: "disjoint" };
  if (aStart >= bStart && aEnd <= bEnd) return { kind: "subset" };
  const overlapStart = aStart > bStart ? aStart : bStart;
  const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
  return { kind: "partial", overlapStart, overlapEnd };
}

function computePeriodFindings(
  coverage: { start: string; end: string } | null,
  ledgerRows: LedgerRow[],
  statementDocs: ClassifiedDocument[],
): { findings: Finding[]; windows: CrossCheckWindow[] } {
  if (!coverage) return { findings: [], windows: [] };
  const findings: Finding[] = [];
  const windows: CrossCheckWindow[] = [];

  for (const doc of statementDocs) {
    const stmtStart = doc.result.period_start;
    const stmtEnd = doc.result.period_end ?? stmtStart;
    if (!stmtStart || !stmtEnd) continue;

    const relation = relatePeriods(coverage.start, coverage.end, stmtStart, stmtEnd);

    if (relation.kind === "disjoint") {
      findings.push({
        id: `period-disjoint-${doc.id}`,
        severity: "info",
        title: `Daily log and ${doc.file_name} cover different periods`,
        detail: `Daily order log covers ${coverage.start} to ${coverage.end}; ${doc.file_name} covers ${stmtStart} to ${stmtEnd}. These don't overlap, so their totals aren't directly comparable and weren't cross-checked.`,
      });
      continue;
    }

    if (relation.kind === "subset") {
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
      windows.push({ start: stmtStart, end: stmtEnd, label: doc.file_name, matched: withinTolerance });
      continue;
    }

    findings.push({
      id: `period-partial-${doc.id}`,
      severity: "warning",
      title: `Daily log only partially covers ${doc.file_name}'s period`,
      detail: `Daily order log covers ${coverage.start} to ${coverage.end}; ${doc.file_name} covers ${stmtStart} to ${stmtEnd}. Only ${relation.overlapStart} to ${relation.overlapEnd} overlaps — a full total comparison isn't reliable across a partial window, so no dollar cross-check was attempted.`,
    });
    windows.push({ start: relation.overlapStart, end: relation.overlapEnd, label: doc.file_name, matched: false });
  }

  return { findings, windows };
}

// "What you said you actually received" vs "what the platform's statement
// says it paid" — a real cross-check the daily-log/statement comparison
// above can't do, since a daily order log has no payout figure at all.
function computeMerchantReceivedFindings(
  receivedDocs: ClassifiedDocument[],
  statementDocs: ClassifiedDocument[],
): { findings: Finding[]; windows: CrossCheckWindow[] } {
  const findings: Finding[] = [];
  const windows: CrossCheckWindow[] = [];

  for (const recv of receivedDocs) {
    const recvAmount = recv.result.received_amount;
    const recvStart = recv.result.period_start;
    const recvEnd = recv.result.period_end ?? recvStart;
    if (recvAmount == null || !recvStart || !recvEnd) continue;
    const label = recv.description?.trim() || recv.file_name;

    for (const stmt of statementDocs) {
      const stmtStart = stmt.result.period_start;
      const stmtEnd = stmt.result.period_end ?? stmtStart;
      const stmtAmount = stmt.result.expected_payout;
      if (!stmtStart || !stmtEnd || stmtAmount == null) continue;

      const relation = relatePeriods(recvStart, recvEnd, stmtStart, stmtEnd);

      if (relation.kind === "disjoint") {
        findings.push({
          id: `received-vs-statement-disjoint-${recv.id}-${stmt.id}`,
          severity: "info",
          title: `"${label}" and ${stmt.file_name} cover different periods`,
          detail: `You said you received ${recvAmount.toFixed(2)} for ${recvStart} to ${recvEnd}; ${stmt.file_name} covers ${stmtStart} to ${stmtEnd}. These don't overlap, so they weren't compared.`,
        });
        continue;
      }

      if (relation.kind === "partial") {
        findings.push({
          id: `received-vs-statement-partial-${recv.id}-${stmt.id}`,
          severity: "warning",
          title: `"${label}" only partially overlaps ${stmt.file_name}'s period`,
          detail: `You said you received ${recvAmount.toFixed(2)} for ${recvStart} to ${recvEnd}; ${stmt.file_name} covers ${stmtStart} to ${stmtEnd}. Only ${relation.overlapStart} to ${relation.overlapEnd} overlaps — not a reliable comparison, so no dollar cross-check was attempted.`,
        });
        windows.push({ start: relation.overlapStart, end: relation.overlapEnd, label, matched: false });
        continue;
      }

      const diff = recvAmount - stmtAmount;
      const withinTolerance = stmtAmount > 0 && Math.abs(diff) / stmtAmount <= CROSS_CHECK_TOLERANCE_PCT;
      findings.push({
        id: `received-vs-statement-${recv.id}-${stmt.id}`,
        severity: withinTolerance ? "info" : "critical",
        title: withinTolerance
          ? `What you received matches ${stmt.file_name}`
          : `What you received doesn't match ${stmt.file_name}`,
        detail: `You said you received ${recvAmount.toFixed(2)} for ${recvStart} to ${recvEnd}; ${stmt.file_name} states a Total Payout of ${stmtAmount.toFixed(2)} for the same period — a difference of ${diff.toFixed(2)}.`,
        amount: round2(Math.abs(diff)),
      });
      windows.push({ start: recvStart, end: recvEnd, label, matched: withinTolerance });
    }
  }

  return { findings, windows };
}

export function reconcile(
  docs: ClassifiedDocument[],
  commissionRatePct: number,
): {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
  crossCheckWindows: CrossCheckWindow[];
} {
  const dailyDocs = docs.filter(d => d.document_type === "daily_log" && (d.result.daily_rows?.length ?? 0) > 0);
  const statementDocs = docs.filter(d => d.document_type === "statement");
  const receivedDocs = docs.filter(d => d.document_type === "merchant_received");

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

  // Cross-document period comparisons only make sense once there's at least
  // one of each relevant type to actually compare.
  const crossCheckWindows: CrossCheckWindow[] = [];
  if (dailyDocs.length > 0 && statementDocs.length > 0) {
    const periodResult = computePeriodFindings(coverage, ledger, statementDocs);
    findings.push(...periodResult.findings);
    crossCheckWindows.push(...periodResult.windows);
  }
  if (receivedDocs.length > 0 && statementDocs.length > 0) {
    const receivedResult = computeMerchantReceivedFindings(receivedDocs, statementDocs);
    findings.push(...receivedResult.findings);
    crossCheckWindows.push(...receivedResult.windows);
  }

  return { ledger, ledgerTotals, findings, coverage, crossCheckWindows };
}

export const SEVERITY_ORDER: Record<Finding["severity"], number> = { critical: 0, warning: 1, info: 2 };

export type AuditSummary = {
  documentCount: number;
  daysCovered: number;
  totalOrders: number;
  totalSales: number;
  totalCommissionAtAgreed: number;
  totalExpectedNet: number;
  // Total commission-at-agreed-rate divided by total orders across the
  // ledger — the per-order commission metric a merchant should be able to
  // see at a glance, not have to derive by dividing two other numbers.
  commissionPerOrder: number | null;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  // Sum of every finding's amount — a "total dollars flagged" figure, not a
  // claim that all of it is independently collectible (a rate-deviation
  // amount and an unexplained-charge amount are different kinds of gaps).
  totalFlaggedAmount: number;
  topFinding: Finding | null;
  headline: string;
};

export function summarizeAudit(
  result: { ledger: LedgerRow[]; ledgerTotals: LedgerRow | null; findings: Finding[]; coverage: { start: string; end: string } | null },
  documentCount: number,
): AuditSummary {
  const critical = result.findings.filter(f => f.severity === "critical");
  const warning = result.findings.filter(f => f.severity === "warning");
  const info = result.findings.filter(f => f.severity === "info");
  const totalFlaggedAmount = round2(result.findings.reduce((s, f) => s + (f.amount ?? 0), 0));
  const topFinding = [...result.findings].sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.amount ?? 0) - (a.amount ?? 0),
  )[0] ?? null;

  const totalOrders = result.ledgerTotals?.orders ?? 0;
  const totalSales = result.ledgerTotals?.sales ?? 0;
  const totalCommissionAtAgreed = result.ledgerTotals?.commission_at_agreed_rate ?? 0;
  const totalExpectedNet = result.ledgerTotals?.expected_net ?? 0;
  const commissionPerOrder = totalOrders > 0 ? round2(totalCommissionAtAgreed / totalOrders) : null;
  const docsLabel = `${documentCount} document${documentCount === 1 ? "" : "s"}`;

  let headline: string;
  if (critical.length > 0) {
    headline = `${critical.length} critical finding${critical.length === 1 ? "" : "s"} across ${docsLabel} — approximately ${totalFlaggedAmount.toFixed(2)} flagged, worth resolving before trusting this payout.`;
  } else if (warning.length > 0) {
    headline = `${warning.length} item${warning.length === 1 ? "" : "s"} worth reviewing across ${docsLabel} — approximately ${totalFlaggedAmount.toFixed(2)} flagged, nothing that blocks trusting the payout outright.`;
  } else if (result.findings.length > 0) {
    headline = `No critical or warning issues — ${info.length} informational note${info.length === 1 ? "" : "s"} across ${docsLabel}.`;
  } else {
    headline = `No discrepancies found across ${docsLabel}.`;
  }

  return {
    documentCount,
    daysCovered: result.ledger.length,
    totalOrders,
    totalSales,
    totalCommissionAtAgreed,
    totalExpectedNet,
    commissionPerOrder,
    criticalCount: critical.length,
    warningCount: warning.length,
    infoCount: info.length,
    totalFlaggedAmount,
    topFinding,
    headline,
  };
}
