import { supabaseAdmin } from "@/integrations/supabase/client.server";

const number = (value: unknown) => {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const rounded = (value: number) => Math.round(value * 100) / 100;
const isoDate = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;

type CommerceEvent = {
  event_kind?: string;
  channel?: string | null;
  occurred_at?: string | null;
  currency?: string | null;
  gross_amount?: unknown;
  discount_amount?: unknown;
  tax_amount?: unknown;
  fee_amount?: unknown;
  net_amount?: unknown;
  evidence_strength?: string;
  limitations?: unknown;
};

type EvidenceRow = Record<string, unknown>;
type ReconciliationRow = EvidenceRow & { summary?: Record<string, unknown> | null };
type FindingRow = EvidenceRow & {
  recoverability?: unknown;
  variance?: unknown;
  blockers?: unknown;
};
type CostRow = EvidenceRow & {
  sku?: unknown;
  created_at?: unknown;
  effective_from?: unknown;
};

function summarizeEvents(events: CommerceEvent[]) {
  const byChannel = new Map<
    string,
    {
      events: number;
      gross: number;
      discounts: number;
      tax: number;
      fees: number;
      net: number;
      latest: string | null;
      currencies: Set<string>;
      strengths: Set<string>;
    }
  >();
  const byKind = new Map<string, { events: number; gross: number; fees: number; net: number }>();
  for (const row of events) {
    const channel = (row.channel || "unassigned").toLowerCase(),
      kind = row.event_kind || "unknown";
    const current = byChannel.get(channel) ?? {
      events: 0,
      gross: 0,
      discounts: 0,
      tax: 0,
      fees: 0,
      net: 0,
      latest: null,
      currencies: new Set<string>(),
      strengths: new Set<string>(),
    };
    current.events += 1;
    current.gross += number(row.gross_amount) ?? 0;
    current.discounts += number(row.discount_amount) ?? 0;
    current.tax += number(row.tax_amount) ?? 0;
    current.fees += number(row.fee_amount) ?? 0;
    current.net += number(row.net_amount) ?? 0;
    const occurred = isoDate(row.occurred_at);
    if (occurred && (!current.latest || Date.parse(occurred) > Date.parse(current.latest)))
      current.latest = occurred;
    if (row.currency) current.currencies.add(row.currency);
    if (row.evidence_strength) current.strengths.add(row.evidence_strength);
    byChannel.set(channel, current);
    const kindSummary = byKind.get(kind) ?? { events: 0, gross: 0, fees: 0, net: 0 };
    kindSummary.events += 1;
    kindSummary.gross += number(row.gross_amount) ?? 0;
    kindSummary.fees += number(row.fee_amount) ?? 0;
    kindSummary.net += number(row.net_amount) ?? 0;
    byKind.set(kind, kindSummary);
  }
  const channels = [...byChannel.entries()].map(([channel, row]) => ({
    channel,
    events: row.events,
    gross: rounded(row.gross),
    discounts: rounded(row.discounts),
    tax: rounded(row.tax),
    fees: rounded(row.fees),
    net: rounded(row.net),
    currencies: [...row.currencies],
    evidence_strengths: [...row.strengths],
    latest_event_at: row.latest,
  }));
  const event_kinds = [...byKind.entries()].map(([event_kind, row]) => ({
    event_kind,
    events: row.events,
    gross: rounded(row.gross),
    fees: rounded(row.fees),
    net: rounded(row.net),
  }));
  return { event_count: events.length, channels, event_kinds };
}

function periodComparison(events: CommerceEvent[], now = new Date()) {
  const currentStart = new Date(now);
  currentStart.setUTCDate(currentStart.getUTCDate() - 30);
  const previousStart = new Date(now);
  previousStart.setUTCDate(previousStart.getUTCDate() - 60);
  const preferredKind = events.some((row) => row.event_kind === "order_snapshot")
    ? "order_snapshot"
    : "order_line";
  const usable = events.filter(
    (row) => row.event_kind === preferredKind && isoDate(row.occurred_at),
  );
  const sum = (rows: CommerceEvent[]) => ({
    orders: rows.length,
    gross: rounded(rows.reduce((total, row) => total + (number(row.gross_amount) ?? 0), 0)),
    fees: rounded(rows.reduce((total, row) => total + (number(row.fee_amount) ?? 0), 0)),
    net: rounded(rows.reduce((total, row) => total + (number(row.net_amount) ?? 0), 0)),
  });
  const current = usable.filter(
    (row) => Date.parse(String(row.occurred_at)) >= currentStart.getTime(),
  );
  const previous = usable.filter((row) => {
    const time = Date.parse(String(row.occurred_at));
    return time >= previousStart.getTime() && time < currentStart.getTime();
  });
  const currentTotals = sum(current),
    previousTotals = sum(previous);
  return {
    basis_event_kind: preferredKind,
    current_30_days: {
      period_start: currentStart.toISOString(),
      period_end: now.toISOString(),
      ...currentTotals,
    },
    previous_30_days: {
      period_start: previousStart.toISOString(),
      period_end: currentStart.toISOString(),
      ...previousTotals,
    },
    change: {
      orders: currentTotals.orders - previousTotals.orders,
      gross: rounded(currentTotals.gross - previousTotals.gross),
      fees: rounded(currentTotals.fees - previousTotals.fees),
      net: rounded(currentTotals.net - previousTotals.net),
    },
  };
}

export function summarizeCopilotFinancialEvidence(input: {
  runs: ReconciliationRow[];
  findings: FindingRow[];
  contracts: EvidenceRow[];
  cases: EvidenceRow[];
  evidenceCount: number;
  events?: CommerceEvent[];
  costs?: CostRow[];
  now?: Date;
}) {
  const claimsReady = input.findings.filter((row) => row.recoverability === "claims_ready"),
    recoverable = claimsReady.reduce(
      (sum, row) => sum + Math.max(0, -(number(row.variance) ?? 0)),
      0,
    );
  const events = input.events ?? [],
    costs = input.costs ?? [],
    latestEvent =
      events
        .map((row) => isoDate(row.occurred_at))
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const latestCost =
    costs
      .map(
        (row) =>
          isoDate(row.created_at) ??
          (typeof row.effective_from === "string" ? row.effective_from : null),
      )
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  return {
    generated_at: (input.now ?? new Date()).toISOString(),
    reviewed_evidence_count: input.evidenceCount,
    commerce: {
      ...summarizeEvents(events),
      period_comparison: periodComparison(events, input.now ?? new Date()),
      latest_event_at: latestEvent,
      truncated: events.length >= 1000,
    },
    product_costs: {
      evidence_rows: costs.length,
      covered_skus: [...new Set(costs.map((row) => String(row.sku ?? "")).filter(Boolean))].length,
      latest_evidence_at: latestCost,
      items: costs.slice(0, 100).map((row) => ({
        sku: row.sku,
        currency: row.currency,
        unit_cost: number(row.unit_cost),
        effective_from: row.effective_from,
        effective_to: row.effective_to,
        source_provider: row.source_provider,
        created_at: row.created_at,
      })),
    },
    latest_reconciliations: input.runs.map((row) => ({
      id: row.id,
      platform: row.platform,
      currency: row.currency,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status,
      created_at: row.created_at,
      readiness: row.summary?.readiness ?? null,
      claims_ready_amount: row.summary?.claims_ready_amount ?? null,
    })),
    findings: {
      total: input.findings.length,
      claims_ready: claimsReady.length,
      claims_ready_amount: rounded(recoverable),
      items: input.findings.map((row) => ({
        id: row.id,
        run_id: row.run_id,
        conclusion: row.conclusion,
        recoverability: row.recoverability,
        currency: row.currency,
        variance: number(row.variance),
        evidence_strength: row.evidence_strength,
        explanation: row.explanation,
        blockers: row.blockers,
        created_at: row.created_at,
      })),
    },
    approved_agreements: input.contracts.map((row) => ({
      id: row.id,
      platform: row.platform,
      contract_name: row.contract_name,
      currency: row.currency,
      commission_rate_pct: number(row.commission_rate_pct),
      vat_on_fees_pct: number(row.vat_on_fees_pct),
      payment_fee_pct: number(row.payment_fee_pct),
      fixed_order_fee: number(row.fixed_order_fee),
      delivery_contribution: number(row.delivery_contribution),
      commission_base: row.commission_base,
      promotion_funding_platform_pct: number(row.promotion_funding_platform_pct),
      refund_liability: row.refund_liability,
      cancellation_liability: row.cancellation_liability,
      settlement_frequency: row.settlement_frequency,
      settlement_days: row.settlement_days,
      dispute_deadline_days: row.dispute_deadline_days,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      status: row.status,
    })),
    recovery_cases: input.cases.map((row) => ({
      id: row.id,
      title: row.title,
      platform: row.platform,
      status: row.status,
      claims_ready_amount: number(row.claims_ready_amount),
      recovered_amount: number(row.recovered_amount),
      submission_reference: row.submission_reference,
      updated_at: row.updated_at,
    })),
    limitations: [
      "Only reviewed and stored PrizeSkout evidence is included.",
      "Absence from this snapshot does not prove that a platform paid correctly.",
      ...(events.length >= 1000
        ? ["Commerce detail is capped at the 1,000 most recent retained events."]
        : []),
      ...(!events.length
        ? [
            "No retained normalized commerce events are available for period or channel comparisons.",
          ]
        : []),
      ...(!costs.length
        ? ["No effective-dated product cost evidence is available for contribution analysis."]
        : []),
    ],
  };
}

export async function getCopilotFinancialEvidence(accountId: string) {
  // These evidence tables are deployed ahead of the generated Supabase schema types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 365);
  const [runs, findings, contracts, cases, evidence, events, costs] = await Promise.all([
    db
      .from("ps_settlement_reconciliation_runs")
      .select("id,platform,currency,period_start,period_end,status,summary,created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("ps_reconciliation_findings")
      .select(
        "id,run_id,conclusion,recoverability,currency,variance,evidence_strength,explanation,blockers,created_at",
      )
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(25),
    db
      .from("ps_marketplace_contract_terms")
      .select(
        "id,platform,contract_name,currency,commission_rate_pct,vat_on_fees_pct,payment_fee_pct,fixed_order_fee,delivery_contribution,commission_base,promotion_funding_platform_pct,refund_liability,cancellation_liability,settlement_frequency,settlement_days,dispute_deadline_days,effective_from,effective_to,status",
      )
      .eq("account_id", accountId)
      .eq("status", "approved")
      .order("effective_from", { ascending: false })
      .limit(20),
    db
      .from("ps_recovery_cases")
      .select(
        "id,title,platform,status,claims_ready_amount,recovered_amount,submission_reference,updated_at",
      )
      .eq("account_id", accountId)
      .order("updated_at", { ascending: false })
      .limit(20),
    db
      .from("ps_merchant_evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    db
      .from("ps_normalized_commerce_events")
      .select(
        "event_kind,channel,occurred_at,currency,gross_amount,discount_amount,tax_amount,fee_amount,net_amount,evidence_strength,limitations",
      )
      .eq("account_id", accountId)
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(1000),
    db
      .from("ps_product_cost_evidence")
      .select("sku,currency,unit_cost,effective_from,effective_to,source_provider,created_at")
      .eq("account_id", accountId)
      .order("effective_from", { ascending: false })
      .limit(1000),
  ]);
  for (const result of [runs, findings, contracts, cases, evidence, events, costs])
    if (result.error) throw new Error(result.error.message);
  return summarizeCopilotFinancialEvidence({
    runs: runs.data ?? [],
    findings: findings.data ?? [],
    contracts: contracts.data ?? [],
    cases: cases.data ?? [],
    evidenceCount: evidence.count ?? 0,
    events: events.data ?? [],
    costs: costs.data ?? [],
  });
}
