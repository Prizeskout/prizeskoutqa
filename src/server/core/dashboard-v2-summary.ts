export const DASHBOARD_V2_SUMMARY_VERSION = "dashboard-v2-summary-v1";

export type DashboardV2TruthKey = "orders" | "contract" | "payout" | "receipt";
export type DashboardV2TruthStatus = "verified" | "partial" | "stale" | "missing" | "unavailable";
export type DashboardV2EvidenceStrength = "confirmed" | "strong" | "partial" | "insufficient" | null;

export type DashboardV2Truth = {
  key: DashboardV2TruthKey;
  status: DashboardV2TruthStatus;
  record_count: number;
  strongest_evidence: DashboardV2EvidenceStrength;
  observed_through: string | null;
  effective_from: string | null;
  effective_to: string | null;
  currencies: string[];
  provenance: string[];
  blockers: string[];
};

export type DashboardV2Summary = {
  version: typeof DASHBOARD_V2_SUMMARY_VERSION;
  generated_at: string;
  scope: {
    account_id: string;
    merchant_id: string;
    period_start: string;
    period_end: string;
    days: number;
  };
  currency_integrity: {
    currencies: string[];
    mixed: boolean;
  };
  metrics: {
    state: "available" | "partial" | "blocked" | "unavailable";
    currency: string | null;
    gross_sales: number | null;
    net_revenue: number | null;
    orders: number | null;
    true_contribution: number | null;
    contribution_margin_pct: number | null;
    settlement_variance: number | null;
    recoverable_margin: number | null;
    cost_coverage: {
      orders_total: number;
      orders_complete: number;
      pct: number;
      complete: boolean;
    };
    profit_bridge: Array<{
      key: "gross_sales" | "gross_to_net" | "product_cost" | "contribution";
      label: string;
      amount: number | null;
      kind: "total" | "deduction" | "cost" | "result";
    }>;
    source: "economic-twin";
    blockers: string[];
    by_channel: Array<{
      channel: string;
      gross_sales: number;
      revenue: number;
      orders: number;
      fees: number;
      discounts: number;
      product_cost: number | null;
      contribution: number | null;
      margin_pct: number | null;
    }>;
    by_sku: Array<{
      sku: string;
      gross_sales: number;
      revenue: number;
      orders: number;
      fees: number;
      discounts: number;
      product_cost: number | null;
      contribution: number | null;
      margin_pct: number | null;
    }>;
    branch_performance: {
      state: "available" | "partial" | "blocked" | "missing";
      ranked: boolean;
      identified_orders: number;
      unassigned_orders: number;
      blockers: string[];
      rows: Array<{
        branch: string;
        gross_sales: number;
        revenue: number;
        orders: number;
        fees: number;
        discounts: number;
        product_cost: number | null;
        contribution: number | null;
        margin_pct: number | null;
      }>;
    };
  };
  reconciliation: {
    state: "confirmed" | "probable" | "unallocated" | "insufficient" | "reconciled" | "missing" | "unavailable";
    finding_id: string | null;
    conclusion: string | null;
    label: string;
    currency: string | null;
    expected_amount: number | null;
    reported_amount: number | null;
    variance: number | null;
    allocation_scope: "order" | "batch" | "unknown";
    order_external_id: string | null;
    settlement_reference: string | null;
    evidence_strength: string | null;
    recoverability: string | null;
    claims_ready_amount: number | null;
    explanation: string;
    blockers: string[];
    created_at: string | null;
  };
  comparison: {
    state: "available" | "blocked" | "unavailable";
    previous_period_start: string;
    previous_period_end: string;
    movements: Array<{ key: "gross_sales" | "net_revenue" | "orders" | "contribution" | "margin"; label: string; current: number; previous: number; change: number; change_pct: number | null; unit: "money" | "count" | "points" }>;
    summary: string;
    blockers: string[];
  };
  priority_decisions: {
    state: "available" | "empty" | "blocked" | "unavailable";
    items: Array<{
      id: string;
      rank: number;
      title: string;
      state: "claims_ready" | "review_required" | "evidence_required" | "in_progress";
      amount: number | null;
      currency: string | null;
      evidence_strength: string | null;
      finding_id: string;
      recovery_case_id: string | null;
      reference: string | null;
      next_safe_action: string;
      approval_required: boolean;
      blockers: string[];
    }>;
    blockers: string[];
  };
  truths: Record<DashboardV2TruthKey, DashboardV2Truth>;
  conclusion: {
    state: "ready_for_reconciliation" | "partial_evidence" | "insufficient_evidence" | "unavailable";
    title: string;
    detail: string;
    next_action: string;
  };
  latest_finding: {
    id: string;
    conclusion: string;
    recoverability: string;
    evidence_strength: string;
    currency: string;
    explanation: string;
    expected_amount: number | null;
    reported_amount: number | null;
    variance: number | null;
    order_external_id: string | null;
    settlement_reference: string | null;
    contract_term_id: string | null;
    blockers: string[];
    created_at: string;
  } | null;
};

type CommerceEvent = {
  id?: string;
  event_kind?: string | null;
  evidence_item_id?: string | null;
  source_kind?: string | null;
  source_provider?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  currency?: string | null;
  evidence_strength?: string | null;
};

type AgreementMatch = {
  id?: string;
  evidence_item_id?: string | null;
  contract_term_id?: string | null;
  state?: string | null;
  platform?: string | null;
  evidence_date_start?: string | null;
  evidence_date_end?: string | null;
  currency?: string | null;
  matcher_version?: string | null;
  created_at?: string | null;
};

type Finding = {
  id?: string;
  conclusion?: string | null;
  recoverability?: string | null;
  evidence_strength?: string | null;
  currency?: string | null;
  explanation?: string | null;
  expected_amount?: number | null;
  reported_amount?: number | null;
  variance?: number | null;
  order_external_id?: string | null;
  settlement_reference?: string | null;
  contract_term_id?: string | null;
  blockers?: string[] | null;
  created_at?: string | null;
};

type RecoveryCase = {
  id?: string;
  reconciliation_finding_id?: string | null;
  status?: string | null;
  claims_ready_amount?: number | null;
  exception_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
};

export type DashboardV2SummaryInput = {
  accountId: string;
  merchantId: string;
  days?: number;
  now?: Date;
  events: CommerceEvent[];
  currentEventIds?: string[];
  agreementMatches: AgreementMatch[];
  findings: Finding[];
  recoveryCases?: RecoveryCase[];
  economicTwin?: {
    currency?: string | null;
    gross_sales?: number;
    net_revenue?: number;
    orders?: number;
    contribution?: number;
    contribution_margin_pct?: number | null;
    variance?: number;
    recoverable_amount?: number;
    fees?: number;
    discounts?: number;
    refunds?: number;
    product_cost?: number;
    cost_coverage?: { orders_total?: number; orders_complete?: number; pct?: number; complete?: boolean };
    by_channel?: Array<{ key?: string; gross_sales?: number; net_revenue?: number; orders?: number; fees?: number; discounts?: number; product_cost?: number; contribution?: number; margin_pct?: number | null }>;
    by_branch?: Array<{ key?: string; gross_sales?: number; net_revenue?: number; orders?: number; fees?: number; discounts?: number; product_cost?: number; contribution?: number; margin_pct?: number | null }>;
    by_sku?: Array<{ key?: string; gross_sales?: number; net_revenue?: number; orders?: number; fees?: number; discounts?: number; product_cost?: number; contribution?: number; margin_pct?: number | null }>;
  } | null;
  previousEconomicTwin?: DashboardV2SummaryInput["economicTwin"];
  availability?: {
    events?: boolean;
    agreements?: boolean;
    findings?: boolean;
    recoveryCases?: boolean;
    economicTwin?: boolean;
  };
};

const STRENGTH_ORDER: Record<Exclude<DashboardV2EvidenceStrength, null>, number> = {
  insufficient: 0,
  partial: 1,
  strong: 2,
  confirmed: 3,
};

function iso(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function latest(values: Array<string | null | undefined>): string | null {
  const valid = values.map(iso).filter((value): value is string => Boolean(value)).sort();
  return valid.at(-1) ?? null;
}

function earliest(values: Array<string | null | undefined>): string | null {
  const valid = values.map(iso).filter((value): value is string => Boolean(value)).sort();
  return valid[0] ?? null;
}

function strongest(values: Array<string | null | undefined>): DashboardV2EvidenceStrength {
  let result: DashboardV2EvidenceStrength = null;
  for (const value of values) {
    if (!(value && value in STRENGTH_ORDER)) continue;
    const normalized = value as Exclude<DashboardV2EvidenceStrength, null>;
    if (!result || STRENGTH_ORDER[normalized] > STRENGTH_ORDER[result]) result = normalized;
  }
  return result;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();
}

function eventTruth(
  key: DashboardV2TruthKey,
  allRows: CommerceEvent[],
  kinds: string[],
  periodStart: Date,
  available: boolean,
): DashboardV2Truth {
  if (!available) {
    return {
      key,
      status: "unavailable",
      record_count: 0,
      strongest_evidence: null,
      observed_through: null,
      effective_from: null,
      effective_to: null,
      currencies: [],
      provenance: [],
      blockers: ["The retained evidence service could not be read."],
    };
  }

  const relevant = allRows.filter((row) => kinds.includes(String(row.event_kind ?? "")));
  const inPeriod = relevant.filter((row) => {
    const value = iso(row.occurred_at ?? row.created_at);
    return value ? new Date(value) >= periodStart : false;
  });
  const rows = inPeriod.length ? inPeriod : relevant;
  const currencies = unique(rows.map((row) => row.currency?.toUpperCase()));
  const provenance = unique(rows.map((row) => {
    const kind = row.source_kind?.trim();
    const provider = row.source_provider?.trim();
    return kind && provider ? `${kind}:${provider}` : provider || kind || null;
  }));
  const observedThrough = latest(rows.map((row) => row.occurred_at ?? row.created_at));
  const evidence = strongest(rows.map((row) => row.evidence_strength));
  const blockers: string[] = [];

  if (!relevant.length) blockers.push(key === "receipt" ? "Receipt confirmation is optional and has not been provided." : `No ${key} evidence is retained.`);
  if (relevant.length && !inPeriod.length) blockers.push(`The latest ${key} evidence predates the selected period.`);
  if (inPeriod.some((row) => !["strong", "confirmed"].includes(String(row.evidence_strength)))) blockers.push(`Some ${key} records have partial or insufficient evidence strength.`);
  if (inPeriod.length && !currencies.length) blockers.push(`The ${key} evidence does not prove a currency.`);
  if (currencies.length > 1) blockers.push(`The ${key} evidence contains multiple currencies and cannot be combined.`);

  let status: DashboardV2TruthStatus = "missing";
  if (relevant.length && !inPeriod.length) status = "stale";
  else if (inPeriod.length && (blockers.length || !["strong", "confirmed"].includes(String(evidence)))) status = "partial";
  else if (inPeriod.length) status = "verified";

  return {
    key,
    status,
    record_count: inPeriod.length,
    strongest_evidence: evidence,
    observed_through: observedThrough,
    effective_from: earliest(inPeriod.map((row) => row.occurred_at ?? row.created_at)),
    effective_to: latest(inPeriod.map((row) => row.occurred_at ?? row.created_at)),
    currencies,
    provenance,
    blockers,
  };
}

function contractTruth(matches: AgreementMatch[], periodStart: Date, available: boolean): DashboardV2Truth {
  const key: DashboardV2TruthKey = "contract";
  if (!available) {
    return { key, status: "unavailable", record_count: 0, strongest_evidence: null, observed_through: null, effective_from: null, effective_to: null, currencies: [], provenance: [], blockers: ["The approved agreement service could not be read."] };
  }
  const applicable = matches.filter((match) => {
    if (!["automatic", "confirmed"].includes(String(match.state)) || !match.contract_term_id) return false;
    const end = match.evidence_date_end ? new Date(`${match.evidence_date_end}T23:59:59.999Z`) : null;
    return !end || end >= periodStart;
  });
  const pending = matches.filter((match) => ["needs_confirmation", "no_match"].includes(String(match.state)));
  const blockers: string[] = [];
  if (!applicable.length) blockers.push("No approved, applicable channel agreement covers the selected evidence period.");
  if (pending.length) blockers.push(`${pending.length} agreement match${pending.length === 1 ? "" : "es"} still require evidence or confirmation.`);
  const currencies = unique(applicable.map((match) => match.currency?.toUpperCase()));
  if (applicable.length && !currencies.length) blockers.push("The applicable agreement does not prove a currency.");
  if (currencies.length > 1) blockers.push("Applicable agreements contain multiple currencies and must remain separated.");
  return {
    key,
    status: applicable.length ? (blockers.length ? "partial" : "verified") : pending.length ? "partial" : "missing",
    record_count: applicable.length,
    strongest_evidence: applicable.length ? "confirmed" : pending.length ? "partial" : null,
    observed_through: latest(applicable.map((match) => match.created_at)),
    effective_from: earliest(applicable.map((match) => match.evidence_date_start)),
    effective_to: latest(applicable.map((match) => match.evidence_date_end)),
    currencies,
    provenance: unique(applicable.map((match) => match.matcher_version ? `agreement_match:${match.matcher_version}` : "agreement_match")),
    blockers,
  };
}

export function summarizeDashboardV2Evidence(input: DashboardV2SummaryInput): DashboardV2Summary {
  const now = input.now ?? new Date();
  const days = Math.max(1, Math.min(90, Math.floor(input.days ?? 30)));
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
  periodStart.setUTCHours(0, 0, 0, 0);
  const availability = { events: true, agreements: true, findings: true, recoveryCases: true, economicTwin: true, ...input.availability };
  const currentIds = new Set(input.currentEventIds ?? []);
  const events = currentIds.size ? input.events.filter((row) => row.id && currentIds.has(row.id)) : input.events;

  const orders = eventTruth("orders", events, ["order_snapshot"], periodStart, availability.events);
  const contract = contractTruth(input.agreementMatches, periodStart, availability.agreements);
  const payout = eventTruth("payout", events, ["settlement_line", "payout_total"], periodStart, availability.events);
  const receipt = eventTruth("receipt", events, ["receipt_confirmation"], periodStart, availability.events);
  const truths = { orders, contract, payout, receipt };
  const currencies = unique([orders, contract, payout, receipt].flatMap((truth) => truth.currencies));
  if (currencies.length > 1) {
    for (const truth of [orders, contract, payout]) {
      if (truth.status === "verified") truth.status = "partial";
      if (!truth.blockers.some((blocker) => blocker.includes("multiple currencies"))) truth.blockers.push("Cross-source currencies differ and cannot be combined into one conclusion.");
    }
  }

  const latestFindingRaw = availability.findings && currencies.length === 1
    ? [...input.findings]
        .filter((finding) => {
          const createdAt = iso(finding.created_at);
          return createdAt && new Date(createdAt) >= periodStart && finding.currency?.trim().toUpperCase() === currencies[0];
        })
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0]
    : undefined;
  const latestFinding = latestFindingRaw?.id && latestFindingRaw.created_at
    ? {
        id: latestFindingRaw.id,
        conclusion: String(latestFindingRaw.conclusion ?? ""),
        recoverability: String(latestFindingRaw.recoverability ?? ""),
        evidence_strength: String(latestFindingRaw.evidence_strength ?? ""),
        currency: String(latestFindingRaw.currency ?? ""),
        explanation: String(latestFindingRaw.explanation ?? ""),
        expected_amount: latestFindingRaw.expected_amount != null && Number.isFinite(Number(latestFindingRaw.expected_amount)) ? Number(latestFindingRaw.expected_amount) : null,
        reported_amount: latestFindingRaw.reported_amount != null && Number.isFinite(Number(latestFindingRaw.reported_amount)) ? Number(latestFindingRaw.reported_amount) : null,
        variance: latestFindingRaw.variance != null && Number.isFinite(Number(latestFindingRaw.variance)) ? Number(latestFindingRaw.variance) : null,
        order_external_id: latestFindingRaw.order_external_id ? String(latestFindingRaw.order_external_id) : null,
        settlement_reference: latestFindingRaw.settlement_reference ? String(latestFindingRaw.settlement_reference) : null,
        contract_term_id: latestFindingRaw.contract_term_id ? String(latestFindingRaw.contract_term_id) : null,
        blockers: Array.isArray(latestFindingRaw.blockers) ? latestFindingRaw.blockers.map(String) : [],
        created_at: latestFindingRaw.created_at,
      }
    : null;

  const unavailable = [orders, contract, payout].some((truth) => truth.status === "unavailable");
  const requiredVerified = [orders, contract, payout].every((truth) => truth.status === "verified");
  const anyRequired = [orders, contract, payout].some((truth) => truth.record_count > 0);
  const conclusion: DashboardV2Summary["conclusion"] = unavailable
    ? { state: "unavailable", title: "Financial evidence could not be loaded.", detail: "The dashboard is not presenting a financial conclusion because at least one required evidence service is unavailable.", next_action: "Retry the read-only evidence check or continue in the current workspace." }
    : requiredVerified && !currencies.length
      ? { state: "partial_evidence", title: "Currency evidence is still required.", detail: "Orders, terms, and payout records exist, but their currency is not proven consistently enough to combine.", next_action: "Confirm the currency on the retained evidence before calculating a financial result." }
      : requiredVerified && currencies.length === 1
        ? { state: "ready_for_reconciliation", title: "The selected period has the required reconciliation evidence.", detail: "Order records, approved channel terms, and the platform payout statement are present in one currency.", next_action: "Review the governed reconciliation result; do not infer a discrepancy from totals alone." }
        : anyRequired
          ? { state: "partial_evidence", title: "The selected period has partial financial evidence.", detail: "PrizeSkout will not calculate or present a verified profit or payout conclusion until the required evidence boundaries are complete.", next_action: [orders, contract, payout].find((truth) => truth.status !== "verified")?.blockers[0] ?? "Complete the missing evidence." }
          : { state: "insufficient_evidence", title: "There is not enough retained evidence for this period.", detail: "No verified financial conclusion is shown. Missing evidence is not treated as zero activity.", next_action: "Add order records, approve applicable channel terms, and provide payout evidence." };

  const twin = input.economicTwin;
  const twinCurrency = twin?.currency?.trim().toUpperCase() || null;
  const orderMetricsReady = availability.economicTwin && Boolean(twin) && orders.status === "verified" && currencies.length === 1 && twinCurrency === currencies[0];
  const reconciliationMetricsReady = orderMetricsReady && conclusion.state === "ready_for_reconciliation";
  const findingCreatedAt = latestFinding ? iso(latestFinding.created_at) : null;
  const findingInPeriod = findingCreatedAt ? new Date(findingCreatedAt) >= periodStart : false;
  const findingCurrency = latestFinding?.currency.trim().toUpperCase() || null;
  const findingApplicable = Boolean(latestFinding && findingInPeriod && currencies.length === 1 && findingCurrency === currencies[0]);
  const conclusionState: DashboardV2Summary["reconciliation"]["state"] = !availability.findings
    ? "unavailable"
    : !findingApplicable
      ? "missing"
      : latestFinding?.conclusion === "confirmed_discrepancy"
        ? "confirmed"
        : latestFinding?.conclusion === "probable_discrepancy"
          ? "probable"
          : latestFinding?.conclusion === "unallocated_batch_difference"
            ? "unallocated"
            : latestFinding?.conclusion === "reconciled"
              ? "reconciled"
              : "insufficient";
  const findingVariance = findingApplicable ? latestFinding?.variance ?? null : null;
  const allocationScope = latestFinding?.order_external_id ? "order" : latestFinding?.settlement_reference ? "batch" : "unknown";
  const claimsReady = findingApplicable
    && latestFinding?.conclusion === "confirmed_discrepancy"
    && latestFinding.recoverability === "claims_ready"
    && allocationScope === "order"
    && Boolean(latestFinding.contract_term_id)
    && !latestFinding.blockers.length
    && findingVariance != null
    && findingVariance < 0;
  const reconciliationLabels: Record<DashboardV2Summary["reconciliation"]["state"], string> = {
    confirmed: "Confirmed order-level discrepancy",
    probable: "Probable discrepancy — review required",
    unallocated: "Unallocated batch difference",
    insufficient: "Insufficient reconciliation evidence",
    reconciled: "Reconciled — no discrepancy",
    missing: "No applicable retained finding",
    unavailable: "Reconciliation findings unavailable",
  };
  const reconciliation: DashboardV2Summary["reconciliation"] = {
    state: conclusionState,
    finding_id: findingApplicable ? latestFinding?.id ?? null : null,
    conclusion: findingApplicable ? latestFinding?.conclusion ?? null : null,
    label: reconciliationLabels[conclusionState],
    currency: findingApplicable ? findingCurrency : null,
    expected_amount: findingApplicable ? latestFinding?.expected_amount ?? null : null,
    reported_amount: findingApplicable ? latestFinding?.reported_amount ?? null : null,
    variance: findingVariance,
    allocation_scope: findingApplicable ? allocationScope : "unknown",
    order_external_id: findingApplicable ? latestFinding?.order_external_id ?? null : null,
    settlement_reference: findingApplicable ? latestFinding?.settlement_reference ?? null : null,
    evidence_strength: findingApplicable ? latestFinding?.evidence_strength ?? null : null,
    recoverability: findingApplicable ? latestFinding?.recoverability ?? null : null,
    claims_ready_amount: claimsReady ? Math.abs(findingVariance ?? 0) : null,
    explanation: findingApplicable ? latestFinding?.explanation || reconciliationLabels[conclusionState] : reconciliationLabels[conclusionState],
    blockers: findingApplicable ? latestFinding?.blockers ?? [] : [availability.findings ? "No finding in the selected period matches the proven evidence currency." : "The retained finding service could not be read."],
    created_at: findingApplicable ? latestFinding?.created_at ?? null : null,
  };
  const previousEnd = new Date(periodStart.getTime() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - (days - 1));
  previousStart.setUTCHours(0, 0, 0, 0);
  const previous = input.previousEconomicTwin;
  const comparisonBlockers: string[] = [];
  const comparable = Boolean(previous && orderMetricsReady && previous.currency?.trim().toUpperCase() === twinCurrency);
  if (!previous) comparisonBlockers.push("The governed previous-period Economic Twin could not be loaded.");
  if (previous && previous.currency?.trim().toUpperCase() !== twinCurrency) comparisonBlockers.push("Current and previous periods do not share one proven currency.");
  const movements: DashboardV2Summary["comparison"]["movements"] = [];
  const addMovement = (key: "gross_sales" | "net_revenue" | "orders", label: string, current: number | undefined, prior: number | undefined, unit: "money" | "count") => {
    if (!comparable || !Number.isFinite(current) || !Number.isFinite(prior)) return;
    const change = Number(current) - Number(prior);
    movements.push({ key, label, current: Number(current), previous: Number(prior), change, change_pct: Number(prior) === 0 ? null : Math.round((change / Math.abs(Number(prior))) * 10000) / 100, unit });
  };
  addMovement("gross_sales", "Gross sales", twin?.gross_sales, previous?.gross_sales, "money");
  addMovement("net_revenue", "Net revenue", twin?.net_revenue, previous?.net_revenue, "money");
  addMovement("orders", "Orders", twin?.orders, previous?.orders, "count");
  if (comparable && twin?.cost_coverage?.complete && previous?.cost_coverage?.complete && Number.isFinite(twin?.contribution) && Number.isFinite(previous.contribution)) {
    const change = Number(twin?.contribution) - Number(previous.contribution);
    movements.push({ key: "contribution", label: "True contribution", current: Number(twin?.contribution), previous: Number(previous.contribution), change, change_pct: Number(previous.contribution) === 0 ? null : Math.round((change / Math.abs(Number(previous.contribution))) * 10000) / 100, unit: "money" });
  } else if (comparable) comparisonBlockers.push("Contribution movement requires complete product-cost coverage in both periods.");
  if (comparable && twin?.cost_coverage?.complete && previous?.cost_coverage?.complete && Number.isFinite(twin?.contribution_margin_pct) && Number.isFinite(previous.contribution_margin_pct)) {
    movements.push({ key: "margin", label: "Contribution margin", current: Number(twin?.contribution_margin_pct), previous: Number(previous.contribution_margin_pct), change: Number(twin?.contribution_margin_pct) - Number(previous.contribution_margin_pct), change_pct: null, unit: "points" });
  }
  const leading = movements.slice().sort((a, b) => Math.abs(b.change_pct ?? b.change) - Math.abs(a.change_pct ?? a.change))[0];
  const comparison: DashboardV2Summary["comparison"] = {
    state: !previous ? "unavailable" : movements.length ? "available" : "blocked",
    previous_period_start: previousStart.toISOString(), previous_period_end: previousEnd.toISOString(), movements,
    summary: leading ? `${leading.label} ${leading.change >= 0 ? "increased" : "decreased"}${leading.change_pct == null ? "" : ` by ${Math.abs(leading.change_pct).toFixed(1)}%`} versus the previous ${days}-day period.` : "No governed prior-period movement is available.",
    blockers: comparisonBlockers,
  };
  const costCoverage = {
    orders_total: Number(twin?.cost_coverage?.orders_total ?? 0),
    orders_complete: Number(twin?.cost_coverage?.orders_complete ?? 0),
    pct: Number(twin?.cost_coverage?.pct ?? 0),
    complete: Boolean(twin?.cost_coverage?.complete) && Number(twin?.cost_coverage?.orders_total ?? 0) > 0,
  };
  const contributionReady = orderMetricsReady && costCoverage.complete;
  const metricBlockers: string[] = [];
  if (!availability.economicTwin || !twin) metricBlockers.push("The governed Economic Twin could not be loaded.");
  if (orders.status !== "verified") metricBlockers.push("Verified order truth is required before sales metrics can be shown.");
  if (currencies.length !== 1 || twinCurrency !== currencies[0]) metricBlockers.push("Economic Twin currency does not match one proven evidence currency.");
  if (!costCoverage.complete) metricBlockers.push(`True contribution remains blocked until product-cost coverage is complete (${costCoverage.orders_complete} of ${costCoverage.orders_total} evidenced orders).`);
  if (!reconciliationMetricsReady) metricBlockers.push("Settlement variance remains blocked until order, agreement, and payout truth are reconciliation-ready.");

  const metrics: DashboardV2Summary["metrics"] = {
    state: !availability.economicTwin || !twin ? "unavailable" : orderMetricsReady ? "partial" : "blocked",
    currency: orderMetricsReady ? twinCurrency : null,
    gross_sales: orderMetricsReady && Number.isFinite(twin?.gross_sales) ? Number(twin?.gross_sales) : null,
    net_revenue: orderMetricsReady && Number.isFinite(twin?.net_revenue) ? Number(twin?.net_revenue) : null,
    orders: orderMetricsReady && Number.isFinite(twin?.orders) ? Number(twin?.orders) : null,
    true_contribution: contributionReady && Number.isFinite(twin?.contribution) ? Number(twin?.contribution) : null,
    contribution_margin_pct: contributionReady && Number.isFinite(twin?.contribution_margin_pct) ? Number(twin?.contribution_margin_pct) : null,
    settlement_variance: reconciliationMetricsReady && findingApplicable && findingVariance != null ? findingVariance : null,
    recoverable_margin: reconciliationMetricsReady && Number.isFinite(twin?.recoverable_amount) ? Number(twin?.recoverable_amount) : null,
    source: "economic-twin",
    blockers: [...new Set(metricBlockers)],
    cost_coverage: costCoverage,
    profit_bridge: [
      { key: "gross_sales", label: "Gross sales", amount: orderMetricsReady && Number.isFinite(twin?.gross_sales) ? Number(twin?.gross_sales) : null, kind: "total" },
      { key: "gross_to_net", label: "Recorded gross-to-net reductions", amount: orderMetricsReady && Number.isFinite(twin?.gross_sales) && Number.isFinite(twin?.net_revenue) ? Math.max(0, Number(twin?.gross_sales) - Number(twin?.net_revenue)) : null, kind: "deduction" },
      { key: "product_cost", label: "Product cost", amount: contributionReady && Number.isFinite(twin?.product_cost) ? Number(twin?.product_cost) : null, kind: "cost" },
      { key: "contribution", label: "True contribution", amount: contributionReady && Number.isFinite(twin?.contribution) ? Number(twin?.contribution) : null, kind: "result" },
    ],
    by_channel: orderMetricsReady
      ? (twin?.by_channel ?? []).map((row) => ({
          channel: String(row.key ?? "unassigned"),
          gross_sales: Number.isFinite(row.gross_sales) ? Number(row.gross_sales) : 0,
          revenue: Number.isFinite(row.net_revenue) ? Number(row.net_revenue) : 0,
          orders: Number.isFinite(row.orders) ? Number(row.orders) : 0,
          fees: Number.isFinite(row.fees) ? Number(row.fees) : 0,
          discounts: Number.isFinite(row.discounts) ? Number(row.discounts) : 0,
          product_cost: contributionReady && Number.isFinite(row.product_cost) ? Number(row.product_cost) : null,
          contribution: contributionReady && Number.isFinite(row.contribution) ? Number(row.contribution) : null,
          margin_pct: contributionReady && Number.isFinite(row.margin_pct) ? Number(row.margin_pct) : null,
        }))
      : [],
    by_sku: orderMetricsReady
      ? (twin?.by_sku ?? []).map((row) => ({
          sku: String(row.key ?? "unassigned"),
          gross_sales: Number.isFinite(row.gross_sales) ? Number(row.gross_sales) : 0,
          revenue: Number.isFinite(row.net_revenue) ? Number(row.net_revenue) : 0,
          orders: Number.isFinite(row.orders) ? Number(row.orders) : 0,
          fees: Number.isFinite(row.fees) ? Number(row.fees) : 0,
          discounts: Number.isFinite(row.discounts) ? Number(row.discounts) : 0,
          product_cost: contributionReady && Number.isFinite(row.product_cost) ? Number(row.product_cost) : null,
          contribution: contributionReady && Number.isFinite(row.contribution) ? Number(row.contribution) : null,
          margin_pct: contributionReady && Number.isFinite(row.margin_pct) ? Number(row.margin_pct) : null,
        }))
      : [],
    branch_performance: (() => {
      const sourceRows = orderMetricsReady ? twin?.by_branch ?? [] : [];
      const unassigned = sourceRows.filter((row) => !row.key || row.key === "unassigned");
      const identified = sourceRows.filter((row) => row.key && row.key !== "unassigned");
      const identifiedOrders = identified.reduce((sum, row) => sum + (Number.isFinite(row.orders) ? Number(row.orders) : 0), 0);
      const unassignedOrders = unassigned.reduce((sum, row) => sum + (Number.isFinite(row.orders) ? Number(row.orders) : 0), 0);
      const blockers: string[] = [];
      if (!orderMetricsReady) blockers.push("Verified order truth and one proven currency are required before branch performance can be shown.");
      if (orderMetricsReady && !identified.length) blockers.push("No selected orders have a retained branch identifier.");
      if (unassignedOrders > 0) blockers.push(`${unassignedOrders} order${unassignedOrders === 1 ? "" : "s"} have no retained branch identifier, so branches are not ranked.`);
      if (!costCoverage.complete) blockers.push("Complete product-cost evidence is required before branches can be ranked by contribution.");
      const ranked = identified.length > 0 && unassignedOrders === 0 && contributionReady;
      return {
        state: !orderMetricsReady ? "blocked" : !identified.length ? "missing" : ranked ? "available" : "partial",
        ranked,
        identified_orders: identifiedOrders,
        unassigned_orders: unassignedOrders,
        blockers,
        rows: identified.map((row) => ({
          branch: String(row.key),
          gross_sales: Number.isFinite(row.gross_sales) ? Number(row.gross_sales) : 0,
          revenue: Number.isFinite(row.net_revenue) ? Number(row.net_revenue) : 0,
          orders: Number.isFinite(row.orders) ? Number(row.orders) : 0,
          fees: Number.isFinite(row.fees) ? Number(row.fees) : 0,
          discounts: Number.isFinite(row.discounts) ? Number(row.discounts) : 0,
          product_cost: contributionReady && Number.isFinite(row.product_cost) ? Number(row.product_cost) : null,
          contribution: contributionReady && Number.isFinite(row.contribution) ? Number(row.contribution) : null,
          margin_pct: contributionReady && Number.isFinite(row.margin_pct) ? Number(row.margin_pct) : null,
        })),
      };
    })(),
  };

  const closedCaseStates = new Set(["accepted", "rejected", "recovered", "closed"]);
  const casesByFinding = new Map(
    (input.recoveryCases ?? [])
      .filter((row) => row.reconciliation_finding_id && !closedCaseStates.has(String(row.status ?? "")))
      .map((row) => [String(row.reconciliation_finding_id), row]),
  );
  const priorityCandidates = currencies.length === 1
    ? input.findings.filter((finding) => {
        const createdAt = iso(finding.created_at);
        return Boolean(finding.id && createdAt && new Date(createdAt!) >= periodStart && finding.currency?.trim().toUpperCase() === currencies[0] && finding.conclusion !== "reconciled");
      })
    : [];
  const priorityWeight = (finding: Finding, recoveryCase?: RecoveryCase) => {
    if (recoveryCase && ["submitted_manually", "platform_review"].includes(String(recoveryCase.status))) return 0;
    if (finding.recoverability === "claims_ready") return 1;
    if (finding.conclusion === "confirmed_discrepancy") return 2;
    if (finding.conclusion === "probable_discrepancy") return 3;
    if (finding.conclusion === "unallocated_batch_difference") return 4;
    return 5;
  };
  const priorityItems: DashboardV2Summary["priority_decisions"]["items"] = availability.findings && availability.recoveryCases
    ? priorityCandidates
        .map((finding) => ({ finding, recoveryCase: casesByFinding.get(String(finding.id)) }))
        .sort((a, b) => priorityWeight(a.finding, a.recoveryCase) - priorityWeight(b.finding, b.recoveryCase)
          || Math.abs(Number(b.recoveryCase?.claims_ready_amount ?? b.finding.variance ?? 0)) - Math.abs(Number(a.recoveryCase?.claims_ready_amount ?? a.finding.variance ?? 0))
          || String(b.finding.created_at ?? "").localeCompare(String(a.finding.created_at ?? "")))
        .slice(0, 3)
        .map(({ finding, recoveryCase }, index) => {
          const caseStatus = String(recoveryCase?.status ?? "");
          const blocked = Array.isArray(finding.blockers) ? finding.blockers.map(String) : [];
          const inProgress = ["submitted_manually", "platform_review"].includes(caseStatus);
          const claimsReady = finding.recoverability === "claims_ready" && finding.conclusion === "confirmed_discrepancy" && blocked.length === 0;
          const state = inProgress ? "in_progress" : claimsReady ? "claims_ready" : finding.conclusion === "unallocated_batch_difference" || blocked.length ? "evidence_required" : "review_required";
          const title = finding.conclusion === "confirmed_discrepancy"
            ? "Review confirmed payout discrepancy"
            : finding.conclusion === "probable_discrepancy"
              ? "Review probable payout discrepancy"
              : finding.conclusion === "unallocated_batch_difference"
                ? "Allocate batch difference to order evidence"
                : "Complete reconciliation evidence";
          const nextSafeAction = inProgress
            ? "Review the recorded submission status; do not send another external message automatically."
            : claimsReady
              ? "Review the evidence pack and request merchant approval before any external submission."
              : finding.conclusion === "unallocated_batch_difference"
                ? "Add order-level evidence before preparing any claim."
                : blocked[0] ?? "Review the retained evidence before changing the recovery state.";
          const caseAmount = recoveryCase?.claims_ready_amount ?? recoveryCase?.exception_amount;
          const amount = claimsReady
            ? Number.isFinite(Number(caseAmount)) && Number(caseAmount) > 0 ? Number(caseAmount) : finding.variance != null && Number(finding.variance) < 0 ? Math.abs(Number(finding.variance)) : null
            : null;
          return {
            id: recoveryCase?.id ? `case:${recoveryCase.id}` : `finding:${finding.id}`,
            rank: index + 1,
            title,
            state,
            amount,
            currency: finding.currency?.trim().toUpperCase() || null,
            evidence_strength: finding.evidence_strength ? String(finding.evidence_strength) : null,
            finding_id: String(finding.id),
            recovery_case_id: recoveryCase?.id ? String(recoveryCase.id) : null,
            reference: finding.order_external_id ? `Order ${finding.order_external_id}` : finding.settlement_reference ? `Batch ${finding.settlement_reference}` : null,
            next_safe_action: nextSafeAction,
            approval_required: claimsReady || inProgress,
            blockers: blocked,
          };
        })
    : [];
  const priorityBlockers: string[] = [];
  if (!availability.findings) priorityBlockers.push("Reconciliation findings could not be loaded.");
  if (!availability.recoveryCases) priorityBlockers.push("Recovery case state could not be loaded.");
  if (currencies.length !== 1) priorityBlockers.push("Priority decisions require one proven evidence currency.");
  const priorityDecisions: DashboardV2Summary["priority_decisions"] = {
    state: !availability.findings || !availability.recoveryCases ? "unavailable" : currencies.length !== 1 ? "blocked" : priorityItems.length ? "available" : "empty",
    items: priorityItems,
    blockers: priorityBlockers,
  };

  return {
    version: DASHBOARD_V2_SUMMARY_VERSION,
    generated_at: now.toISOString(),
    scope: { account_id: input.accountId, merchant_id: input.merchantId, period_start: periodStart.toISOString(), period_end: now.toISOString(), days },
    currency_integrity: { currencies, mixed: currencies.length > 1 },
    metrics,
    truths,
    conclusion,
    reconciliation,
    comparison,
    priority_decisions: priorityDecisions,
    latest_finding: latestFinding,
  };
}

export function verifyDashboardV2Parity(
  summary: DashboardV2Summary,
  reference: NonNullable<DashboardV2SummaryInput["economicTwin"]>,
): { ok: boolean; checked: string[]; mismatches: string[] } {
  const checked: string[] = [];
  const mismatches: string[] = [];
  const pairs: Array<[string, number | null, number | undefined]> = [
    ["gross_sales", summary.metrics.gross_sales, reference.gross_sales],
    ["net_revenue", summary.metrics.net_revenue, reference.net_revenue],
    ["orders", summary.metrics.orders, reference.orders],
    ["true_contribution", summary.metrics.true_contribution, reference.contribution],
    ["contribution_margin_pct", summary.metrics.contribution_margin_pct, reference.contribution_margin_pct ?? undefined],
    ["recoverable_margin", summary.metrics.recoverable_margin, reference.recoverable_amount],
  ];
  for (const [key, actual, expected] of pairs) {
    if (actual === null) continue;
    checked.push(key);
    if (!Number.isFinite(expected) || Math.abs(actual - Number(expected)) > 0.005) mismatches.push(key);
  }
  if (summary.metrics.currency) {
    checked.push("currency");
    if (summary.metrics.currency !== reference.currency?.trim().toUpperCase()) mismatches.push("currency");
  }
  if (summary.metrics.cost_coverage.complete) {
    checked.push("cost_coverage");
    if (!reference.cost_coverage?.complete || reference.cost_coverage.orders_complete !== reference.cost_coverage.orders_total) mismatches.push("cost_coverage");
  }
  if (summary.metrics.settlement_variance !== null) {
    checked.push("settlement_variance_finding");
    if (summary.metrics.settlement_variance !== summary.reconciliation.variance || !summary.reconciliation.finding_id) mismatches.push("settlement_variance_finding");
  }
  return { ok: mismatches.length === 0, checked, mismatches };
}
