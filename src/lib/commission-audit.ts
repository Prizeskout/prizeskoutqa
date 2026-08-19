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
  transaction_rows?: { order_id:string; date:string; gross_sales:number; refund_amount:number; status:string; eligible:boolean; claims_ready?:boolean }[] | null;
  settlement_rows?: { settlement_reference:string; order_id:string|null; amount:number; currency:string }[] | null;
  settlement_reference?: string|null;
  duplicate_order_ids?: string[] | null;
  cancelled_orders_total?: number | null;
  charge_explainers?: { label: string; value: number }[] | null;
  // "merchant_received" documents only — what the merchant typed as the
  // amount that actually landed in their bank. Deliberately a distinct
  // field from expected_payout (which always means "a platform-computed or
  // platform-stated figure") so the two are never confused downstream.
  received_amount?: number | null;
  bank_transaction_date?: string | null;
  bank_reference?: string | null;
  deposit_type?: string | null;
  currency?: string | null;
  evidence_file_name?: string | null;
  evidence_sha256?: string | null;
  evidence_level?: "manual_assertion" | "document_supported" | null;
};

// classifyResult() can only ever return one of these three — it infers the
// type purely from which parser produced the result. "merchant_received" is
// never structurally inferred; it's only ever assigned directly (manual
// entry, or an explicit user correction of a file's detected type).
export type StructuralDocumentType = "daily_log" | "statement" | "summary_pdf";
export type DocumentType = StructuralDocumentType | "platform_transaction" | "merchant_received";

export type Finding = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  amount?: number;
  evidence_level?: "merchant_asserted" | "single_source" | "corroborated";
  recoverability?: "unquantified" | "estimated" | "claims_ready";
  assertion?: "completeness" | "accuracy" | "cutoff" | "authorization" | "occurrence" | "settlement";
  // Structured version of what the detail sentence already says in prose —
  // lets the UI/PDF show the actual investigation (columns checked, rates
  // derived) instead of just the summary sentence.
  trace?: {
    checkedColumns?: { label: string; value: number }[];
    perOrder?: { rate: number; count: number };
    perCancelled?: { rate: number; count: number };
    // Structured version of the "spread evenly across days, as a % of each
    // day's own sales" test in computeUnexplainedChargeFinding — kept
    // alongside the prose in `detail` for the same reason perOrder/
    // perCancelled are: a future structured renderer can use it without
    // re-deriving it, even though nothing parses prose today.
    dailySpread?: { avgPerDay: number; windowDays: number; worstDate: string; worstPct: number; bestDate: string; bestPct: number };
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
  // Explicit, merchant-set override — "daily_log" documents only. When
  // true, this document's Sales figures are treated as already net of
  // commission (no further deduction is applied to its ledger rows). This
  // is a disclosed override of the merchant's own choosing, not a verified
  // fact: the engine's own cross-check (see describeSalesComposition) keeps
  // running and is surfaced regardless, precisely so a merchant who sets
  // this can still see the evidence next to their chosen treatment rather
  // than have it silently disappear.
  treat_sales_as_net?: boolean;
};

export type AuditAssertion = {
  id: "completeness" | "accuracy" | "cutoff" | "authorization" | "occurrence" | "settlement";
  label: string;
  status: "passed" | "partial" | "missing";
  detail: string;
};

export type AuditAssurance = {
  opinion: "insufficient_evidence" | "exceptions_found" | "reconciled_with_limitations" | "reconciled";
  opinionLabel: string;
  evidenceScore: number;
  claimsReadyAmount: number;
  estimatedExposure: number;
  assertions: AuditAssertion[];
  limitations: string[];
  engineVersion: "revenue-assurance-v1";
  rateAuthority?: AuditRateAuthority;
};

export type AuditRateAuthority = {
  source: "approved_contract" | "merchant_entered";
  platform?: string | null;
  contractId?: string | null;
  contractName?: string | null;
  reviewedBy?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type FourWayStage = {
  id: "order_activity"|"platform_transactions"|"platform_settlement"|"merchant_receipt";
  label: string;
  status: "verified"|"partial"|"asserted"|"missing";
  amount: number | null;
  evidenceIds: string[];
  evidenceBasis: string;
  coverage: { start:string; end:string } | null;
};

export type FourWayReconciliation = {
  stages: FourWayStage[];
  links: {
    from: FourWayStage["id"];
    to: FourWayStage["id"];
    status: "matched"|"partial"|"unmatched"|"not_testable";
    variance: number | null;
    explanation: string;
  }[];
  documentaryReceipt: boolean;
  merchantAssertionOnly: boolean;
  unresolvedVariance: number | null;
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

// ---- Date formatting & arithmetic. Dates throughout this module are plain
// ISO "YYYY-MM-DD" strings; all arithmetic goes through UTC Date objects
// (never local time) so day counts are never off by one across a DST
// boundary or timezone.
function parseISODate(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}
function addDaysISO(dateISO: string, delta: number): string {
  const d = parseISODate(dateISO);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function daysBetweenInclusive(startISO: string, endISO: string): number {
  const ms = parseISODate(endISO).getTime() - parseISODate(startISO).getTime();
  return Math.round(ms / 86400000) + 1;
}

// "2026-06-19" -> "Jun 19, 2026". Falls back to the raw string if it isn't a
// parseable date, so a malformed value never crashes the whole finding.
function formatDate(dateISO: string): string {
  const d = parseISODate(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// "2026-06-19" + "2026-07-18" -> "Jun 19 - Jul 18, 2026"; collapses the
// month/year when both ends share them ("Jun 19-30, 2026").
export function formatDateRange(startISO: string, endISO?: string | null): string {
  if (!endISO || endISO === startISO) return formatDate(startISO);
  const s = parseISODate(startISO);
  const e = parseISODate(endISO);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startISO} - ${endISO}`;
  const sMonth = s.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const sYear = s.getUTCFullYear();
  const eYear = e.getUTCFullYear();
  const sDay = s.getUTCDate();
  const eDay = e.getUTCDate();
  if (sYear === eYear && sMonth === eMonth) return `${sMonth} ${sDay}-${eDay}, ${sYear}`;
  if (sYear === eYear) return `${sMonth} ${sDay} - ${eMonth} ${eDay}, ${sYear}`;
  return `${sMonth} ${sDay}, ${sYear} - ${eMonth} ${eDay}, ${eYear}`;
}

// Contiguous date ranges within [rangeStart, rangeEnd] that coveredDates has
// no entry for — used to name exactly which days are missing from a daily
// log relative to a statement's period, rather than just saying "partial."
function findMissingDateRanges(coveredDates: Set<string>, rangeStart: string, rangeEnd: string): { start: string; end: string }[] {
  const gaps: { start: string; end: string }[] = [];
  let gapStart: string | null = null;
  let cursor = rangeStart;
  const totalDays = daysBetweenInclusive(rangeStart, rangeEnd);
  for (let i = 0; i < totalDays; i++) {
    const covered = coveredDates.has(cursor);
    if (!covered && gapStart === null) gapStart = cursor;
    if (covered && gapStart !== null) {
      gaps.push({ start: gapStart, end: addDaysISO(cursor, -1) });
      gapStart = null;
    }
    cursor = addDaysISO(cursor, 1);
  }
  if (gapStart !== null) gaps.push({ start: gapStart, end: rangeEnd });
  return gaps;
}

// A readable stand-in for a raw (often auto-generated, timestamp-laden)
// filename in finding prose — prefers the merchant's own description, falls
// back to a plain-English name for the document's role. A description is
// only used when it's actually label-length: merchants sometimes type
// instructions or multi-sentence notes into the description box (useful
// context for the LLM classifier, which sees it in full), and quoting one
// of those verbatim mid-sentence in every finding title makes the whole
// report unreadable — so anything longer than a short phrase falls back to
// the plain-English role name instead of being truncated into a fragment.
const LABEL_MAX_LEN = 60;
function friendlyLabel(doc: ClassifiedDocument): string {
  const description = doc.description?.trim();
  if (description && description.length <= LABEL_MAX_LEN) return `"${description}"`;
  switch (doc.document_type) {
    // Capitalized so this reads correctly whether it opens a sentence or
    // sits mid-sentence (findings compose these into prose in both
    // positions) — treated like a defined term, not a plain noun phrase.
    case "daily_log": return "Your daily order log";
    case "statement": return "Your payout statement";
    case "platform_transaction": return "Your platform transaction export";
    case "summary_pdf": return "Your brand performance report";
    case "merchant_received": return "Bank settlement evidence";
    default: return doc.file_name;
  }
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
      ? `Commission charged above the agreed rate in ${friendlyLabel(doc)}`
      : `Commission charged below the agreed rate in ${friendlyLabel(doc)}`,
    detail: `You agreed to ${r.commission_rate_pct}% commission; ${friendlyLabel(doc)} shows an effective rate of ${r.effective_commission_pct}% — about ${Math.abs(delta).toFixed(2)} ${shortfall ? "more than you agreed to" : "less than you agreed to"}.`,
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
  if (perOrder != null) clues.push(`about ${perOrder.toFixed(2)} per order (${orderCount} orders)`);
  if (perCancelled != null) clues.push(`about ${perCancelled.toFixed(2)} per cancelled order (${cancelledInWindow} cancelled)`);
  const traceNote = clues.length ? ` Spread evenly, that's ${clues.join(", or ")} — worth asking the platform which one it actually is.` : "";

  // Spread the charge across the actual daily sales the merchant logged for
  // this statement's period — not to "find" it in the data (nothing in the
  // statement explains it), but to show how inconsistent a single flat
  // charge is once measured against real day-to-day activity. A genuine
  // per-order or per-incident fee scales with volume; if spreading it evenly
  // across days means it swings between a trivial % of a busy day's sales
  // and a huge % of a slow day's sales, that inconsistency is itself the red
  // flag — the charge isn't tracking anything that actually happened.
  const salesByDate = new Map<string, number>();
  if (stmtStart && stmtEnd) {
    for (const d of dailyDocs) {
      for (const row of d.result.daily_rows ?? []) {
        if (row.date >= stmtStart && row.date <= stmtEnd) {
          salesByDate.set(row.date, (salesByDate.get(row.date) ?? 0) + row.sales);
        }
      }
    }
  }
  let dailySpreadNote = "";
  let dailySpread: { avgPerDay: number; windowDays: number; worstDate: string; worstPct: number; bestDate: string; bestPct: number } | undefined;
  if (salesByDate.size > 0) {
    const avgPerDay = uc.amount / salesByDate.size;
    const withPct = [...salesByDate.entries()]
      .filter(([, sales]) => sales > 0)
      .map(([date, sales]) => ({ date, sales, pct: (avgPerDay / sales) * 100 }));
    if (withPct.length > 0) {
      const worst = withPct.reduce((a, b) => (b.pct > a.pct ? b : a));
      const best = withPct.reduce((a, b) => (b.pct < a.pct ? b : a));
      dailySpread = {
        avgPerDay: round2(avgPerDay),
        windowDays: salesByDate.size,
        worstDate: worst.date,
        worstPct: round2(worst.pct),
        bestDate: best.date,
        bestPct: round2(best.pct),
      };
      dailySpreadNote = worst.date === best.date
        ? ` Spread evenly across the ${salesByDate.size} day this period actually shows in your daily log, that's about ${avgPerDay.toFixed(2)} a day — ${worst.pct.toFixed(1)}% of that entire day's sales. A real per-order or per-incident fee doesn't land as one flat, unexplained lump like this — this is a genuine red flag, not rounding noise.`
        : ` Spread evenly across the ${salesByDate.size} days this period actually shows in your daily log, that's about ${avgPerDay.toFixed(2)} a day. That doesn't hold still, though: on ${formatDate(worst.date)}, your slowest day here, it would swallow ${worst.pct.toFixed(1)}% of that entire day's sales — but on ${formatDate(best.date)}, your busiest day, it's only ${best.pct.toFixed(1)}%. A genuine per-order or per-incident charge doesn't swing like that from day to day. The math doesn't reconcile with anything that actually happened — this is a huge red flag, and it's worth pushing back on hard rather than writing off.`;
    }
  }

  return {
    id: `unexplained-charge-${doc.id}`,
    severity: "critical",
    title: `Red flag: unexplained charge in ${friendlyLabel(doc)} doesn't add up`,
    detail: `${friendlyLabel(doc)} shows ${uc.label} of ${uc.amount.toFixed(2)} with no breakdown anywhere else in the statement.${traceNote}${dailySpreadNote}`,
    amount: uc.amount,
    trace: {
      checkedColumns: doc.result.charge_explainers ?? undefined,
      perOrder: perOrder != null ? { rate: round2(perOrder), count: orderCount } : undefined,
      perCancelled: perCancelled != null ? { rate: round2(perCancelled), count: cancelledInWindow } : undefined,
      dailySpread,
    },
  };
}

function computeCancelledOpenQuestion(doc: ClassifiedDocument): Finding | null {
  const total = doc.result.cancelled_orders_total;
  if (!total) return null;
  return {
    id: `cancelled-open-question-${doc.id}`,
    severity: "info",
    title: `Cancelled orders reported in ${friendlyLabel(doc)}`,
    detail: `${total} order(s) were cancelled in ${friendlyLabel(doc)}. It's unclear whether the Sales figures already exclude them — worth confirming with the platform, since it affects how accurate this ledger is.`,
  };
}

function computeDuplicateDateFinding(dateCollisions: string[]): Finding | null {
  if (!dateCollisions.length) return null;
  const shown = dateCollisions.slice(0, 10).map(d => formatDate(d)).join(", ");
  return {
    id: "duplicate-dates",
    severity: "info",
    title: "Overlapping dates across uploaded daily logs",
    detail: `${dateCollisions.length} date(s) appear in more than one uploaded daily-log file and were quarantined from all payout calculations: ${shown}${dateCollisions.length > 10 ? "…" : ""}. Resolve which source is authoritative, then rerun the audit.`,
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

// Tests whether a daily log's Sales figures are pre-commission (gross) or
// already post-commission (net) against an independent reference figure
// (either the statement's own Gross Sales for a fully-covered period, or a
// prorated estimate of it) — a merchant can reasonably read either way, and
// this is the actual evidence-based way to settle it rather than assuming.
// Grossing the reported Sales back up at the agreed rate and comparing both
// readings' error against the reference figure; whichever reading is closer
// is reported as the more likely basis, never asserted as certain.
function describeSalesComposition(overlapSum: number, referenceGross: number, ratePct: number): string {
  if (!(ratePct > 0 && ratePct < 100) || referenceGross <= 0) return "";
  const grossPct = Math.abs(overlapSum - referenceGross) / referenceGross;
  const netImpliedGross = overlapSum / (1 - ratePct / 100);
  const netPct = Math.abs(netImpliedGross - referenceGross) / referenceGross;
  if (grossPct <= netPct) {
    return ` This also indicates your daily log's Sales figures are pre-commission (gross), not already net of commission: if Sales were already post-commission and grossed back up at ${ratePct}%, the implied gross (${netImpliedGross.toFixed(2)}) would be off by ${(netPct * 100).toFixed(1)}% instead of ${(grossPct * 100).toFixed(1)}%.`;
  }
  return ` Note: your daily log's Sales figures actually fit better as already net of commission — grossing them up at ${ratePct}% (implying ${netImpliedGross.toFixed(2)}) comes within ${(netPct * 100).toFixed(1)}% of the reference figure, versus ${(grossPct * 100).toFixed(1)}% if taken as gross directly. Worth confirming with the platform which basis their export uses.`;
}

function computePeriodFindings(
  coverage: { start: string; end: string } | null,
  ledgerRows: LedgerRow[],
  statementDocs: ClassifiedDocument[],
  commissionRatePct: number,
): { findings: Finding[]; windows: CrossCheckWindow[] } {
  if (!coverage) return { findings: [], windows: [] };
  const findings: Finding[] = [];
  const windows: CrossCheckWindow[] = [];
  const ledgerDates = new Set(ledgerRows.map(r => r.date));
  const totalLedgerOrders = ledgerRows.reduce((s, r) => s + r.orders, 0);

  for (const doc of statementDocs) {
    const stmtStart = doc.result.period_start;
    const stmtEnd = doc.result.period_end ?? stmtStart;
    if (!stmtStart || !stmtEnd) continue;
    const stmtLabel = friendlyLabel(doc);

    if (relatePeriods(coverage.start, coverage.end, stmtStart, stmtEnd).kind === "disjoint") {
      findings.push({
        id: `period-disjoint-${doc.id}`,
        severity: "info",
        title: `Your daily log and ${stmtLabel} cover different periods`,
        detail: `Your daily order log covers ${formatDateRange(coverage.start, coverage.end)}; ${stmtLabel} covers ${formatDateRange(stmtStart, stmtEnd)}. These don't overlap at all, so their totals can't be compared.`,
      });
      continue;
    }

    // Exactly which days of the statement's period the daily log has no
    // data for at all — not just "partial," but named, so the merchant
    // knows precisely what to add. This is also what stops an order-count
    // gap (e.g. 280 vs. 213) from ever reading as an anomaly: it's shown as
    // two different date ranges, not a discrepancy.
    const missingRanges = findMissingDateRanges(ledgerDates, stmtStart, stmtEnd);
    const overlapRows = ledgerRows.filter(r => r.date >= stmtStart && r.date <= stmtEnd);
    const overlapSum = overlapRows.reduce((s, r) => s + r.sales, 0);
    const overlapOrders = overlapRows.reduce((s, r) => s + r.orders, 0);
    const overlapDayCount = overlapRows.length;
    const statementGross = doc.result.sub_total_sum;
    const stmtTotalDays = daysBetweenInclusive(stmtStart, stmtEnd);

    if (missingRanges.length > 0) {
      const missingDayCount = missingRanges.reduce((s, g) => s + daysBetweenInclusive(g.start, g.end), 0);
      const missingList = missingRanges.map(g => formatDateRange(g.start, g.end)).join(", ");
      const orderNote = doc.result.order_count != null
        ? ` ${stmtLabel} shows ${doc.result.order_count} orders for its full ${formatDateRange(stmtStart, stmtEnd)} period. Your daily log shows ${totalLedgerOrders} orders in total, but for ${formatDateRange(coverage.start, coverage.end)} — a different window that only overlaps ${stmtLabel}'s period for ${overlapDayCount} day(s), accounting for ${overlapOrders} of those orders. ${doc.result.order_count} vs. ${totalLedgerOrders} isn't a real mismatch; they're simply two different date ranges.`
        : "";
      findings.push({
        id: `period-missing-days-${doc.id}`,
        severity: "warning",
        title: `${missingDayCount} day(s) of ${stmtLabel}'s period ${missingDayCount > 1 ? "are" : "is"} missing from your daily log`,
        detail: `${stmtLabel} covers ${formatDateRange(stmtStart, stmtEnd)}, but your daily log has no data for ${missingList}.${orderNote} Add your daily log for ${missingRanges.length > 1 ? "those dates" : "that range"} to complete a full comparison.`,
      });
    }

    if (overlapDayCount === 0 || statementGross == null) continue;

    if (missingRanges.length === 0) {
      // Fully covered, day for day — a real, exact cross-check.
      const diff = overlapSum - statementGross;
      const withinTolerance = statementGross > 0 && Math.abs(diff) / statementGross <= CROSS_CHECK_TOLERANCE_PCT;
      findings.push({
        id: `period-cross-check-${doc.id}`,
        severity: withinTolerance ? "info" : "critical",
        title: withinTolerance
          ? `Daily log sales reconcile against ${stmtLabel}`
          : `Daily log sales don't match ${stmtLabel}`,
        detail: `Your daily order log sums to ${overlapSum.toFixed(2)} in sales for ${formatDateRange(stmtStart, stmtEnd)}; ${stmtLabel} states Gross Sales of ${statementGross.toFixed(2)} for the same period — a difference of ${diff.toFixed(2)}.${describeSalesComposition(overlapSum, statementGross, commissionRatePct)}`,
        amount: round2(Math.abs(diff)),
      });
      windows.push({ start: stmtStart, end: stmtEnd, label: stmtLabel, matched: withinTolerance });
    } else if (stmtTotalDays > 0) {
      // Only some days are covered — never present this as a verdict.
      // Spreading the statement's total evenly across its days is an
      // approximation (real daily volume is visibly uneven), so it's
      // capped at "warning," never "critical," and always labeled as an
      // estimate in its own text.
      const proratedEstimate = (statementGross / stmtTotalDays) * overlapDayCount;
      const diff = overlapSum - proratedEstimate;
      const diffPct = proratedEstimate > 0 ? Math.abs(diff) / proratedEstimate : 0;
      const coveredDatesSorted = overlapRows.map(r => r.date).sort();
      findings.push({
        id: `period-estimate-${doc.id}`,
        severity: diffPct > 0.15 ? "warning" : "info",
        title: `Estimated check on the ${overlapDayCount} overlapping day(s): ${diffPct <= 0.15 ? "roughly consistent" : "worth a closer look"}`,
        detail: `Approximate only, since your daily log doesn't cover ${stmtLabel}'s full period — spreading its ${statementGross.toFixed(2)} Gross Sales evenly across ${stmtTotalDays} days gives an expected ${proratedEstimate.toFixed(2)} for the ${overlapDayCount} day(s) your daily log actually covers here. Your daily log shows ${overlapSum.toFixed(2)} for those same days — a difference of ${diff.toFixed(2)} (${(diffPct * 100).toFixed(1)}%). Daily volume is rarely perfectly even, so treat this as a sanity check, not a verdict.${describeSalesComposition(overlapSum, proratedEstimate, commissionRatePct)}`,
      });
      windows.push({ start: coveredDatesSorted[0], end: coveredDatesSorted[coveredDatesSorted.length - 1], label: stmtLabel, matched: diffPct <= CROSS_CHECK_TOLERANCE_PCT });
    }
  }

  return { findings, windows };
}

// Defense in depth: "merchant_received" should only ever come from a
// manual entry (which always sets received_amount/period), never from a
// corrected file (a parsed file has no such field). If one somehow ends up
// here without an amount, say so explicitly instead of silently producing
// nothing — a "What I Received" item with no visible effect on the audit
// is exactly the kind of confusing dead end this engine exists to avoid.
function computeMissingAmountFinding(doc: ClassifiedDocument): Finding | null {
  if (doc.result.received_amount != null && doc.result.period_start) return null;
  return {
    id: `received-missing-amount-${doc.id}`,
    severity: "warning",
    title: `${friendlyLabel(doc)} has no amount recorded`,
    detail: `This item is marked as what you received, but has no amount and/or period attached, so it can't be compared to anything. If this came from an uploaded file, correct its type back to what the file actually is — "What I Received" only applies to a manual entry.`,
  };
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
    const label = friendlyLabel(recv);

    for (const stmt of statementDocs) {
      const stmtStart = stmt.result.period_start;
      const stmtEnd = stmt.result.period_end ?? stmtStart;
      const stmtAmount = stmt.result.expected_payout;
      if (!stmtStart || !stmtEnd || stmtAmount == null) continue;
      const stmtLabel = friendlyLabel(stmt);

      const relation = relatePeriods(recvStart, recvEnd, stmtStart, stmtEnd);

      if (relation.kind === "disjoint") {
        findings.push({
          id: `received-vs-statement-disjoint-${recv.id}-${stmt.id}`,
          severity: "info",
          title: `${label} and ${stmtLabel} cover different periods`,
          detail: `You said you received ${recvAmount.toFixed(2)} for ${formatDateRange(recvStart, recvEnd)}; ${stmtLabel} covers ${formatDateRange(stmtStart, stmtEnd)}. These don't overlap, so they weren't compared.`,
        });
        continue;
      }

      if (relation.kind === "partial") {
        findings.push({
          id: `received-vs-statement-partial-${recv.id}-${stmt.id}`,
          severity: "warning",
          title: `${label} only partially overlaps ${stmtLabel}'s period`,
          detail: `You said you received ${recvAmount.toFixed(2)} for ${formatDateRange(recvStart, recvEnd)}; ${stmtLabel} covers ${formatDateRange(stmtStart, stmtEnd)}. Only ${formatDateRange(relation.overlapStart, relation.overlapEnd)} overlaps — not a reliable comparison, so no dollar cross-check was attempted.`,
        });
        windows.push({ start: relation.overlapStart, end: relation.overlapEnd, label, matched: false });
        continue;
      }

      const diff = recvAmount - stmtAmount;
      const withinTolerance = stmtAmount > 0 && Math.abs(diff) / stmtAmount <= CROSS_CHECK_TOLERANCE_PCT;
      findings.push({
        id: `received-vs-statement-${recv.id}-${stmt.id}`,
        evidence_level: recv.result.evidence_level === "document_supported" ? "single_source" : "merchant_asserted",
        recoverability: "estimated",
        assertion: "settlement",
        severity: withinTolerance ? "info" : "critical",
        title: withinTolerance
          ? `What you received matches ${stmtLabel}`
          : `What you received doesn't match ${stmtLabel}`,
        detail: `You said you received ${recvAmount.toFixed(2)} for ${formatDateRange(recvStart, recvEnd)}; ${stmtLabel} states a Total Payout of ${stmtAmount.toFixed(2)} for the same period — a difference of ${diff.toFixed(2)}.`,
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
  rateAuthority: AuditRateAuthority = { source: "merchant_entered" },
): {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
  crossCheckWindows: CrossCheckWindow[];
  // Labels of documents the merchant explicitly marked as "Sales already
  // net of commission" — non-empty only when that override is in play, so
  // the UI/PDF can render an unmissable disclosure rather than let the
  // override change numbers silently.
  netSalesOverrideDocs: string[];
  assurance: AuditAssurance;
  fourWay: FourWayReconciliation;
} {
  const dailyDocs = docs.filter(d => d.document_type === "daily_log" && (d.result.daily_rows?.length ?? 0) > 0);
  const statementDocs = docs.filter(d => d.document_type === "statement");
  const transactionDocs = docs.filter(d => d.document_type === "platform_transaction");
  const receivedCandidates = docs.filter(d => d.document_type === "merchant_received");
  const receiptGroups=new Map<string,ClassifiedDocument[]>();
  const unkeyedReceipts:ClassifiedDocument[]=[];
  for(const doc of receivedCandidates){
    const result=doc.result;
    const key=result.evidence_sha256?`sha:${result.evidence_sha256}`:result.bank_reference?`bank:${result.bank_reference.trim().toLowerCase()}`:null;
    if(!key){unkeyedReceipts.push(doc);continue;}
    const group=receiptGroups.get(key)??[];group.push(doc);receiptGroups.set(key,group);
  }
  const duplicateReceiptGroups=[...receiptGroups.values()].filter(group=>group.length>1);
  const conflictingReceiptGroups=duplicateReceiptGroups.filter(group=>new Set(group.map(doc=>`${doc.result.received_amount??""}:${(doc.result.currency??"").toUpperCase()}:${doc.result.bank_transaction_date??""}`)).size>1);
  const receivedDocs=[...unkeyedReceipts,...[...receiptGroups.values()].filter(group=>group.length===1||!conflictingReceiptGroups.includes(group)).map(group=>group[0])];
  const transactionContributions=new Map<string,Array<{docId:string;row:NonNullable<PayoutResultLike["transaction_rows"]>[number]}>>();
  for(const doc of transactionDocs)for(const row of doc.result.transaction_rows??[]){
    const entries=transactionContributions.get(row.order_id)??[];entries.push({docId:doc.id,row});transactionContributions.set(row.order_id,entries);
  }
  const duplicateTransactionIds=new Set<string>();
  for(const doc of transactionDocs)for(const id of doc.result.duplicate_order_ids??[])duplicateTransactionIds.add(id);
  for(const [id,entries]of transactionContributions)if(entries.length>1)duplicateTransactionIds.add(id);

  const byDate = new Map<string, { orders: number; sales: number }>();
  const sources = new Map<string, Set<string>>();
  // Dates contributed by a document the merchant explicitly marked as
  // "Sales already net of commission" — see ClassifiedDocument.treat_sales_
  // as_net. Tracked per-date (not just per-document) so a mix of overridden
  // and normal daily-log documents in the same audit still computes each
  // day correctly.
  const netDates = new Set<string>();
  const netSalesOverrideDocs: string[] = [];
  const contributions = new Map<string, { docId: string; orders: number; sales: number; isNet: boolean }[]>();
  for (const doc of dailyDocs) {
    if (doc.treat_sales_as_net) netSalesOverrideDocs.push(friendlyLabel(doc));
    for (const row of doc.result.daily_rows ?? []) {
      const rows = contributions.get(row.date) ?? [];
      rows.push({ docId: doc.id, orders: row.orders, sales: row.sales, isNet: !!doc.treat_sales_as_net });
      contributions.set(row.date, rows);
      const srcSet = sources.get(row.date) ?? new Set<string>();
      srcSet.add(doc.id);
      sources.set(row.date, srcSet);
    }
  }
  for (const [date, rows] of contributions) {
    // Never manufacture turnover by summing the same date from two files.
    // Ambiguous dates remain visible as a finding but are excluded from math.
    if (new Set(rows.map(r => r.docId)).size > 1) continue;
    byDate.set(date, rows.reduce((a, r) => ({ orders: a.orders + r.orders, sales: a.sales + r.sales }), { orders: 0, sales: 0 }));
    if (rows.some(r => r.isNet)) netDates.add(date);
  }

  const rate = Number.isFinite(commissionRatePct) ? commissionRatePct : 0;
  const ledger: LedgerRow[] = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, v]) => {
      // A date covered by the "already net" override treats this Sales
      // figure as already post-commission — Expected Net stays equal to it
      // (no further deduction on top). Commission (Agreed) is instead backed
      // out via the reverse formula (net * rate / (100 - rate)) so the
      // column still shows what the platform must have already taken to
      // arrive at that net figure, rather than reading as "no commission was
      // charged that day" — which isn't the merchant's claim. This is the
      // merchant's disclosed choice, not something this engine verified; see
      // netSalesOverrideDocs / the disclosure banner this powers.
      const isNet = netDates.has(date);
      const commission = isNet
        ? (rate < 100 ? round2((v.sales * rate) / (100 - rate)) : 0)
        : round2((v.sales * rate) / 100);
      return {
        date,
        orders: v.orders,
        sales: round2(v.sales),
        commission_at_agreed_rate: commission,
        expected_net: isNet ? round2(v.sales) : round2(v.sales - commission),
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
  if(duplicateReceiptGroups.length)findings.push({id:"duplicate-bank-evidence",severity:conflictingReceiptGroups.length?"critical":"warning",title:conflictingReceiptGroups.length?"Conflicting bank reference reuse quarantined":"Duplicate bank evidence counted once",detail:conflictingReceiptGroups.length?`${conflictingReceiptGroups.length} bank reference or evidence fingerprint group(s) contain conflicting amount, currency, or date details and were excluded from settlement matching.`:`${duplicateReceiptGroups.length} repeated bank evidence group(s) were deduplicated so the same deposit cannot satisfy more than one settlement.`,evidence_level:"single_source",recoverability:"unquantified",assertion:"settlement"});
  const evidencedCurrencies=new Set(docs.map(doc=>doc.result.currency?.trim().toUpperCase()).filter((value):value is string=>!!value));
  const mixedCurrencies=evidencedCurrencies.size>1;
  if(mixedCurrencies)findings.push({id:"mixed-currency-evidence",severity:"critical",title:"Mixed currencies cannot be reconciled together",detail:`This audit contains ${[...evidencedCurrencies].join(", ")}. Split the evidence by currency or provide an approved conversion record; no cross-currency variance is claims-ready.`,evidence_level:"single_source",recoverability:"unquantified",assertion:"accuracy"});
  if(duplicateTransactionIds.size)findings.push({id:"duplicate-platform-order-ids",severity:"critical",title:"Duplicate platform order IDs quarantined",detail:`${duplicateTransactionIds.size} platform order ID(s) occurred more than once and were excluded from transaction-level calculations: ${[...duplicateTransactionIds].slice(0,10).join(", ")}${duplicateTransactionIds.size>10?"â€¦":""}.`,evidence_level:"single_source",recoverability:"unquantified",assertion:"completeness"});
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
  for (const doc of receivedDocs) {
    const missingAmountFinding = computeMissingAmountFinding(doc);
    if (missingAmountFinding) findings.push(missingAmountFinding);
  }

  // Cross-document period comparisons only make sense once there's at least
  // one of each relevant type to actually compare.
  const crossCheckWindows: CrossCheckWindow[] = [];
  if (dailyDocs.length > 0 && statementDocs.length > 0) {
    const periodResult = computePeriodFindings(coverage, ledger, statementDocs, rate);
    findings.push(...periodResult.findings);
    crossCheckWindows.push(...periodResult.windows);
  }
  if (receivedDocs.length > 0 && statementDocs.length > 0 && !mixedCurrencies && conflictingReceiptGroups.length===0) {
    const receivedResult = computeMerchantReceivedFindings(receivedDocs, statementDocs);
    findings.push(...receivedResult.findings);
    crossCheckWindows.push(...receivedResult.windows);
  }

  for (const finding of findings) {
    finding.evidence_level ??= finding.id.startsWith("received-vs-statement-") &&
      !finding.id.includes("partial") && !finding.id.includes("disjoint") ? "corroborated" : "single_source";
    finding.recoverability ??= finding.amount == null ? "unquantified"
      : finding.evidence_level === "corroborated" && finding.severity === "critical" ? "claims_ready" : "estimated";
  }
  const exactPeriodCheck = findings.some(f => f.id.startsWith("period-cross-check-") || (
    f.id.startsWith("received-vs-statement-") && !f.id.includes("partial") && !f.id.includes("disjoint")
  ));
  const evidencedStarts = docs.map(doc => doc.result.period_start).filter((value): value is string => !!value).sort();
  const evidencedEnds = docs.map(doc => doc.result.period_end ?? doc.result.period_start).filter((value): value is string => !!value).sort();
  const evidencedCoverage = evidencedStarts.length && evidencedEnds.length
    ? { start:evidencedStarts[0], end:evidencedEnds[evidencedEnds.length - 1] }
    : coverage;
  const documentPlatforms = new Set(docs.map(doc => (doc.result.platform || doc.platform_guess || "").toLowerCase()).filter(Boolean));
  const contractMatchesPlatform = documentPlatforms.size === 1
    && !!rateAuthority.platform
    && documentPlatforms.has(rateAuthority.platform.toLowerCase());
  const contractCoversPeriod = rateAuthority.source === "approved_contract"
    && contractMatchesPlatform
    && (!evidencedCoverage?.start || !rateAuthority.effectiveFrom || rateAuthority.effectiveFrom <= evidencedCoverage.start)
    && (!evidencedCoverage?.end || !rateAuthority.effectiveTo || rateAuthority.effectiveTo >= evidencedCoverage.end);
  const assertions: AuditAssertion[] = [
    { id: "completeness", label: "Completeness", status: dailyDocs.length && !dateCollisions.length ? "passed" : dailyDocs.length ? "partial" : "missing", detail: dailyDocs.length ? (dateCollisions.length ? `${dateCollisions.length} duplicate date(s) quarantined from the calculation.` : "Daily activity supplied without duplicate dates.") : "Order-level or daily sales evidence is missing." },
    { id: "accuracy", label: "Accuracy", status: dailyDocs.length && statementDocs.length ? "partial" : "missing", detail: dailyDocs.length && statementDocs.length ? "Aggregate figures were cross-checked; individual fees, refunds and taxes were not recomputed." : "Activity and platform settlement evidence are both required." },
    { id: "cutoff", label: "Cut-off", status: exactPeriodCheck ? "passed" : coverage ? "partial" : "missing", detail: exactPeriodCheck ? "At least one like-for-like period was compared." : "No complete like-for-like settlement period was proven." },
    { id: "authorization", label: "Contract terms", status: contractCoversPeriod ? "passed" : "missing", detail: contractCoversPeriod
      ? `${rateAuthority.contractName ?? "Reviewed contract"} authorizes the ${rate}% rate for this audit period${rateAuthority.reviewedBy ? `; approved by ${rateAuthority.reviewedBy}.` : "."}`
      : rateAuthority.source === "approved_contract"
        ? !contractMatchesPlatform
          ? "The selected approved contract does not match the platform evidenced by this audit. The rate is not authorized for this conclusion."
          : "The selected approved contract does not cover the complete audit period. The rate is not authorized for this conclusion."
        : "The configured commission rate is merchant-entered; no approved, effective-dated contract is attached to this calculation." },
    { id: "occurrence", label: "Occurrence", status: dailyDocs.length ? "partial" : "missing", detail: dailyDocs.length ? "Aggregated activity exists, but individual orders and cancellations are not vouched." : "No underlying transaction evidence supplied." },
    { id: "settlement", label: "Bank settlement", status: receivedDocs.some(d => d.result.evidence_level === "document_supported") ? "partial" : "missing", detail: receivedDocs.some(d => d.result.evidence_level === "document_supported") ? "The bank-issued evidence fingerprint is recorded; the file remains with the merchant and its contents still require review." : receivedDocs.length ? "Deposit is manually asserted and has no evidence fingerprint." : "No bank settlement evidence supplied." },
  ];
  const evidenceScore = Math.round(assertions.reduce((n, a) => n + (a.status === "passed" ? 1 : a.status === "partial" ? 0.5 : 0), 0) / assertions.length * 100);
  // A mathematically corroborated difference is not claim-ready unless the
  // rate used to calculate it is authorized by an approved contract covering
  // the audit period. Keep the amount visible as estimated exposure instead.
  if (!contractCoversPeriod||mixedCurrencies||conflictingReceiptGroups.length>0) {
    for (const finding of findings) {
      if (finding.recoverability === "claims_ready") finding.recoverability = "estimated";
    }
  }
  const claimsReadyAmount = round2(findings.filter(f => f.recoverability === "claims_ready").reduce((n, f) => n + (f.amount ?? 0), 0));
  const estimatedExposure = round2(findings.filter(f => f.recoverability === "estimated").reduce((n, f) => n + (f.amount ?? 0), 0));
  const limitations = assertions.filter(a => a.status !== "passed").map(a => a.detail);
  const opinion: AuditAssurance["opinion"] = evidenceScore < 60 ? "insufficient_evidence"
    : findings.some(f => f.severity === "critical") ? "exceptions_found"
    : limitations.length ? "reconciled_with_limitations" : "reconciled";
  const opinionLabel = opinion === "insufficient_evidence" ? "Insufficient evidence — no audit conclusion"
    : opinion === "exceptions_found" ? "Exceptions identified"
    : opinion === "reconciled_with_limitations" ? "Reconciled with limitations" : "Reconciled";
  const assurance: AuditAssurance = {
    opinion, opinionLabel, evidenceScore, claimsReadyAmount, estimatedExposure,
    assertions, limitations, engineVersion: "revenue-assurance-v1", rateAuthority,
  };

  const statementAmount = statementDocs.reduce((sum,doc)=>sum+(doc.result.expected_payout??0),0);
  const uniqueTransactionRows=[...transactionContributions].filter(([id,entries])=>!duplicateTransactionIds.has(id)&&entries.length===1).map(([,entries])=>entries[0].row);
  const transactionExpected = uniqueTransactionRows.length
    ? round2(uniqueTransactionRows.filter(row=>row.eligible).reduce((sum,row)=>sum+Math.max(0,row.gross_sales-row.refund_amount)*(1-rate/100),0))
    : transactionDocs.reduce((sum,doc)=>sum+(doc.result.expected_payout??0),0);
  const transactionGross=uniqueTransactionRows.length
    ? round2(uniqueTransactionRows.filter(row=>row.eligible).reduce((sum,row)=>sum+Math.max(0,row.gross_sales-row.refund_amount),0))
    : transactionDocs.reduce((sum,doc)=>sum+(doc.result.sub_total_sum??0),0);
  const receivedAmount = mixedCurrencies?0:receivedDocs.reduce((sum,doc)=>sum+(doc.result.received_amount??0),0);
  const documentaryReceipt = receivedDocs.some(doc=>doc.result.evidence_level==="document_supported");
  const merchantAssertionOnly = receivedDocs.length>0&&!documentaryReceipt;
  const statementCoverage = statementDocs.find(doc=>doc.result.period_start&&doc.result.period_end);
  const receiptCoverage = receivedDocs.find(doc=>doc.result.period_start&&doc.result.period_end);
  const stageCoverage=(doc:ClassifiedDocument|undefined)=>doc?.result.period_start&&doc.result.period_end
    ? {start:doc.result.period_start,end:doc.result.period_end}:null;
  // The current intake can prove activity and settlement evidence, but does
  // not yet claim that an aggregate daily log is a platform transaction
  // export. That intermediate stage therefore stays explicitly missing.
  const stages:FourWayStage[]=[
    {id:"order_activity",label:"POS / order activity",status:dailyDocs.length?(ledger.length?"partial":"missing"):"missing",amount:ledgerTotals?.sales??null,evidenceIds:dailyDocs.map(doc=>doc.id),evidenceBasis:dailyDocs.length?"Daily activity supplied; aggregate rows are not order-level vouching.":"No order activity supplied.",coverage},
    {id:"platform_transactions",label:"Platform transactions",status:transactionDocs.length?(uniqueTransactionRows.length&&!duplicateTransactionIds.size?"verified":"partial"):"missing",amount:transactionDocs.length?round2(transactionExpected):null,evidenceIds:transactionDocs.map(doc=>doc.id),evidenceBasis:uniqueTransactionRows.length?`${uniqueTransactionRows.length} unique platform order ID(s) retained; duplicates were quarantined.`:transactionDocs.length?"Platform transaction export supplied, but no usable order IDs were retained.":"No separately identified platform transaction export was supplied.",coverage:stageCoverage(transactionDocs.find(doc=>doc.result.period_start&&doc.result.period_end))},
    {id:"platform_settlement",label:"Platform settlement",status:statementDocs.length?"verified":"missing",amount:statementDocs.length?round2(statementAmount):null,evidenceIds:statementDocs.map(doc=>doc.id),evidenceBasis:statementDocs.length?"Platform-issued settlement statement parsed.":"No platform settlement statement supplied.",coverage:stageCoverage(statementCoverage)},
    {id:"merchant_receipt",label:"Merchant settlement evidence",status:mixedCurrencies||conflictingReceiptGroups.length?"partial":documentaryReceipt?"partial":merchantAssertionOnly?"asserted":"missing",amount:receivedDocs.length&&!mixedCurrencies?round2(receivedAmount):null,evidenceIds:receivedDocs.map(doc=>doc.id),evidenceBasis:mixedCurrencies?"Mixed currencies were not summed.":conflictingReceiptGroups.length?"Conflicting bank reference reuse was quarantined.":documentaryReceipt?"Bank-generated evidence fingerprint recorded; content review remains pending.":merchantAssertionOnly?"Merchant-entered receipt only; no supporting document.":"No merchant settlement evidence supplied.",coverage:stageCoverage(receiptCoverage)},
  ];
  const tolerance=(a:number|null,b:number|null)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.max(1,Math.abs(a)*0.0005);
  const orderToTransactionVariance=ledgerTotals&&transactionDocs.length
    ? round2(transactionGross-ledgerTotals.sales):null;
  const transactionToSettlementVariance=transactionDocs.length&&statementDocs.length
    ? round2(statementAmount-transactionExpected):null;
  const links:FourWayReconciliation["links"]=[
    {from:"order_activity",to:"platform_transactions",status:orderToTransactionVariance==null?"not_testable":Math.abs(orderToTransactionVariance)<=1?"matched":"unmatched",variance:orderToTransactionVariance,explanation:orderToTransactionVariance==null?"A separately identified platform transaction export is required for order-to-platform matching.":uniqueTransactionRows.length?"Quarantined duplicate IDs, then compared unique eligible platform transactions with the activity ledger total.":"Aggregate eligible sales compared; order-ID matching is not available from daily totals."},
    {from:"platform_transactions",to:"platform_settlement",status:transactionToSettlementVariance==null?"not_testable":Math.abs(transactionToSettlementVariance)<=1?"matched":"unmatched",variance:transactionToSettlementVariance,explanation:transactionToSettlementVariance==null?"Both platform transactions and a settlement statement are required.":"Expected transaction net compared with platform-reported settlement; inspect fee findings for the variance."},
    {from:"platform_settlement",to:"merchant_receipt",status:mixedCurrencies||conflictingReceiptGroups.length?"not_testable":statementDocs.length&&receivedDocs.length?(tolerance(statementAmount,receivedAmount)?"matched":"unmatched"):"not_testable",variance:!mixedCurrencies&&!conflictingReceiptGroups.length&&statementDocs.length&&receivedDocs.length?round2(receivedAmount-statementAmount):null,explanation:mixedCurrencies?"Mixed currencies require separate reconciliation or an approved conversion record.":conflictingReceiptGroups.length?"Conflicting reuse of bank references or evidence fingerprints must be resolved first.":statementDocs.length&&receivedDocs.length?"Compared like-for-like evidence where periods permit; inspect cross-check windows for cut-off limitations.":"Both a platform statement and merchant settlement evidence are required."},
  ];
  const fourWay:FourWayReconciliation={
    stages,links,documentaryReceipt,merchantAssertionOnly,
    unresolvedVariance:!mixedCurrencies&&!conflictingReceiptGroups.length&&statementDocs.length&&receivedDocs.length?round2(receivedAmount-statementAmount):null,
  };

  return { ledger, ledgerTotals, findings, coverage, crossCheckWindows, netSalesOverrideDocs, assurance, fourWay };
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
  claimsReadyAmount: number;
  estimatedExposure: number;
  evidenceScore: number;
  opinionLabel: string;
};

export function summarizeAudit(
  result: { ledger: LedgerRow[]; ledgerTotals: LedgerRow | null; findings: Finding[]; coverage: { start: string; end: string } | null; assurance?: AuditAssurance },
  documentCount: number,
): AuditSummary {
  const critical = result.findings.filter(f => f.severity === "critical");
  const warning = result.findings.filter(f => f.severity === "warning");
  const info = result.findings.filter(f => f.severity === "info");
  const totalFlaggedAmount = round2(result.findings.reduce((s, f) => s + (f.amount ?? 0), 0));
  const claimsReadyAmount = result.assurance?.claimsReadyAmount ?? 0;
  const estimatedExposure = result.assurance?.estimatedExposure ?? totalFlaggedAmount;
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
  if (result.assurance?.opinion === "insufficient_evidence") {
    headline = `No independent conclusion can be issued yet. Evidence readiness is ${result.assurance.evidenceScore}% across ${docsLabel}; complete the missing evidence before treating exceptions as recoverable claims.`;
  } else if (critical.length > 0) {
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
    claimsReadyAmount,
    estimatedExposure,
    evidenceScore: result.assurance?.evidenceScore ?? 0,
    opinionLabel: result.assurance?.opinionLabel ?? "Legacy calculation — assurance not assessed",
  };
}
