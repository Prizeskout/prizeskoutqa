import assert from "node:assert/strict";
import { summarizeDashboardV2Evidence, verifyDashboardV2Parity } from "../src/server/core/dashboard-v2-summary";

const now = new Date("2026-10-04T12:00:00.000Z");
const strongEvent = (kind: string, currency = "QAR") => ({
  id: kind,
  event_kind: kind,
  source_kind: "file_upload",
  source_provider: "merchant",
  occurred_at: "2026-10-03T12:00:00.000Z",
  currency,
  evidence_strength: "strong",
});

const complete = summarizeDashboardV2Evidence({
  accountId: "acct-1",
  merchantId: "acct-1",
  now,
  events: [strongEvent("order_snapshot"), strongEvent("payout_total"), strongEvent("receipt_confirmation")],
  agreementMatches: [{ id: "match-1", contract_term_id: "term-1", state: "confirmed", currency: "QAR", evidence_date_start: "2026-10-01", evidence_date_end: "2026-10-31", matcher_version: "v1", created_at: "2026-10-03T12:00:00.000Z" }],
  findings: [{ id: "finding-confirmed", conclusion: "confirmed_discrepancy", recoverability: "claims_ready", evidence_strength: "confirmed", currency: "QAR", expected_amount: 820, reported_amount: 800, variance: -20, order_external_id: "ORDER-18", settlement_reference: "SET-1", contract_term_id: "term-1", blockers: [], explanation: "Allocated order evidence supports a payout shortfall.", created_at: "2026-10-03T13:00:00.000Z" }],
  recoveryCases: [{ id: "case-1", reconciliation_finding_id: "finding-confirmed", status: "ready", claims_ready_amount: 20, exception_amount: 20, currency: "QAR", created_at: "2026-10-03T14:00:00.000Z" }],
  economicTwin: { currency: "QAR", gross_sales: 1000, net_revenue: 800, fees: 120, discounts: 80, refunds: 0, product_cost: 400, orders: 18, contribution: 400, contribution_margin_pct: 50, variance: -20, recoverable_amount: 10, cost_coverage: { orders_total: 18, orders_complete: 18, pct: 100, complete: true }, by_channel: [{ key: "talabat", gross_sales: 1000, net_revenue: 800, fees: 120, discounts: 80, product_cost: 400, orders: 18, contribution: 400, margin_pct: 50 }], by_branch: [{ key: "west-bay", gross_sales: 600, net_revenue: 500, fees: 70, discounts: 30, product_cost: 220, orders: 10, contribution: 280, margin_pct: 56 }, { key: "lusail", gross_sales: 400, net_revenue: 300, fees: 50, discounts: 50, product_cost: 180, orders: 8, contribution: 120, margin_pct: 40 }], by_sku: [{ key: "NR-ZOBO", gross_sales: 140, net_revenue: 120, fees: 20, discounts: 20, product_cost: 35, orders: 5, contribution: 65, margin_pct: 54.17 }] },
  previousEconomicTwin: { currency: "QAR", gross_sales: 900, net_revenue: 750, orders: 15, product_cost: 375, contribution: 375, contribution_margin_pct: 50, cost_coverage: { orders_total: 15, orders_complete: 15, pct: 100, complete: true } },
});
assert.equal(complete.conclusion.state, "ready_for_reconciliation");
assert.equal(complete.truths.orders.status, "verified");
assert.equal(complete.truths.receipt.status, "verified");
assert.deepEqual(complete.currency_integrity.currencies, ["QAR"]);
assert.equal(complete.metrics.gross_sales, 1000);
assert.equal(complete.metrics.net_revenue, 800);
assert.equal(complete.metrics.true_contribution, 400);
assert.equal(complete.metrics.contribution_margin_pct, 50);
assert.equal(complete.metrics.cost_coverage.complete, true);
assert.deepEqual(complete.metrics.profit_bridge.map((row) => row.amount), [1000, 200, 400, 400]);
assert.equal(complete.metrics.settlement_variance, -20);
assert.equal(complete.reconciliation.state, "confirmed");
assert.equal(complete.reconciliation.allocation_scope, "order");
assert.equal(complete.reconciliation.claims_ready_amount, 20);
assert.equal(complete.metrics.by_channel[0]?.contribution, 400);
assert.deepEqual(complete.metrics.by_sku[0], { sku: "NR-ZOBO", gross_sales: 140, revenue: 120, orders: 5, fees: 20, discounts: 20, product_cost: 35, contribution: 65, margin_pct: 54.17 });
assert.equal(complete.metrics.branch_performance.ranked, true);
assert.equal(complete.metrics.branch_performance.rows[0]?.contribution, 280);
assert.equal(complete.comparison.state, "available");
assert.equal(complete.comparison.movements.find((row) => row.key === "gross_sales")?.change, 100);
assert.match(complete.comparison.summary, /increased/);
assert.equal(complete.priority_decisions.state, "available");
assert.equal(complete.priority_decisions.items[0]?.state, "claims_ready");
assert.equal(complete.priority_decisions.items[0]?.finding_id, "finding-confirmed");
assert.equal(complete.priority_decisions.items[0]?.recovery_case_id, "case-1");
assert.equal(complete.priority_decisions.items[0]?.amount, 20);
assert.equal(complete.priority_decisions.items[0]?.approval_required, true);
const parityReference = { currency: "QAR", gross_sales: 1000, net_revenue: 800, orders: 18, contribution: 400, contribution_margin_pct: 50, variance: -20, recoverable_amount: 10, cost_coverage: { orders_total: 18, orders_complete: 18, pct: 100, complete: true } };
const parity = verifyDashboardV2Parity(complete, parityReference);
assert.equal(parity.ok, true);
assert.deepEqual(parity.mismatches, []);
assert.ok(parity.checked.includes("true_contribution"));
assert.ok(parity.checked.includes("cost_coverage"));
assert.ok(parity.checked.includes("settlement_variance_finding"));

const incompleteCosts = summarizeDashboardV2Evidence({
  accountId: "acct-cost-gap",
  merchantId: "acct-cost-gap",
  now,
  events: [strongEvent("order_snapshot"), strongEvent("payout_total"), strongEvent("receipt_confirmation")],
  agreementMatches: [{ id: "match-cost", contract_term_id: "term-cost", state: "confirmed", currency: "QAR", evidence_date_start: "2026-10-01", matcher_version: "v1", created_at: "2026-10-03T12:00:00.000Z" }],
  findings: [],
  economicTwin: { currency: "QAR", gross_sales: 1000, net_revenue: 800, product_cost: 100, orders: 18, contribution: 700, contribution_margin_pct: 87.5, cost_coverage: { orders_total: 18, orders_complete: 4, pct: 22.22, complete: false }, by_channel: [{ key: "talabat", gross_sales: 1000, net_revenue: 800, product_cost: 100, orders: 18, contribution: 700, margin_pct: 87.5 }], by_sku: [{ key: "NR-ZOBO", net_revenue: 120, fees: 20, product_cost: 35, orders: 5, contribution: 65, margin_pct: 54.17 }] },
});
assert.equal(incompleteCosts.metrics.true_contribution, null);
assert.equal(incompleteCosts.metrics.profit_bridge.at(-1)?.amount, null);
assert.equal(incompleteCosts.metrics.by_channel[0]?.contribution, null);
assert.equal(incompleteCosts.metrics.by_sku[0]?.contribution, null);
assert.equal(incompleteCosts.metrics.by_sku[0]?.product_cost, null);
assert.match(incompleteCosts.metrics.blockers.join(" "), /4 of 18/);

const unallocated = summarizeDashboardV2Evidence({
  accountId: "acct-batch",
  merchantId: "acct-batch",
  now,
  events: [strongEvent("order_snapshot"), strongEvent("payout_total")],
  agreementMatches: [{ id: "match-batch", contract_term_id: "term-batch", state: "confirmed", currency: "QAR", evidence_date_start: "2026-10-01", matcher_version: "v1", created_at: "2026-10-03T12:00:00.000Z" }],
  findings: [{ id: "finding-batch", conclusion: "unallocated_batch_difference", recoverability: "review_required", evidence_strength: "strong", currency: "QAR", expected_amount: 1000, reported_amount: 960, variance: -40, settlement_reference: "BATCH-7", contract_term_id: "term-batch", blockers: [], explanation: "The batch differs but cannot be assigned to an order.", created_at: "2026-10-03T13:00:00.000Z" }],
  economicTwin: { currency: "QAR", gross_sales: 1200, net_revenue: 1000, orders: 20, variance: -40, cost_coverage: { orders_total: 20, orders_complete: 0, pct: 0, complete: false } },
});
assert.equal(unallocated.reconciliation.state, "unallocated");
assert.equal(unallocated.reconciliation.allocation_scope, "batch");
assert.equal(unallocated.reconciliation.claims_ready_amount, null);
assert.equal(unallocated.reconciliation.order_external_id, null);
assert.equal(unallocated.priority_decisions.items[0]?.state, "evidence_required");
assert.equal(unallocated.priority_decisions.items[0]?.amount, null);
assert.match(unallocated.priority_decisions.items[0]?.next_safe_action ?? "", /order-level evidence/);

const unidentifiedBranch = summarizeDashboardV2Evidence({
  accountId: "acct-branch-gap",
  merchantId: "acct-branch-gap",
  now,
  events: [strongEvent("order_snapshot"), strongEvent("payout_total")],
  agreementMatches: [{ id: "match-branch", contract_term_id: "term-branch", state: "confirmed", currency: "QAR", evidence_date_start: "2026-10-01", matcher_version: "v1", created_at: "2026-10-03T12:00:00.000Z" }],
  findings: [],
  economicTwin: { currency: "QAR", gross_sales: 1000, net_revenue: 800, product_cost: 400, orders: 18, contribution: 400, contribution_margin_pct: 50, cost_coverage: { orders_total: 18, orders_complete: 18, pct: 100, complete: true }, by_branch: [{ key: "west-bay", net_revenue: 600, orders: 12, product_cost: 300, contribution: 300, margin_pct: 50 }, { key: "unassigned", net_revenue: 200, orders: 6, product_cost: 100, contribution: 100, margin_pct: 50 }] },
});
assert.equal(unidentifiedBranch.metrics.branch_performance.state, "partial");
assert.equal(unidentifiedBranch.metrics.branch_performance.ranked, false);
assert.equal(unidentifiedBranch.metrics.branch_performance.unassigned_orders, 6);
assert.equal(unidentifiedBranch.metrics.branch_performance.rows.length, 1);
assert.match(unidentifiedBranch.metrics.branch_performance.blockers.join(" "), /not ranked/);

const partial = summarizeDashboardV2Evidence({
  accountId: "acct-2",
  merchantId: "acct-2",
  now,
  events: [strongEvent("order_snapshot", "SAR")],
  agreementMatches: [],
  findings: [],
  economicTwin: { currency: "SAR", gross_sales: 200, net_revenue: 180, orders: 2 },
});
assert.equal(partial.conclusion.state, "partial_evidence");
assert.equal(partial.truths.contract.status, "missing");
assert.equal(partial.truths.payout.status, "missing");
assert.equal(partial.truths.receipt.status, "missing");

const mixed = summarizeDashboardV2Evidence({
  accountId: "acct-3",
  merchantId: "acct-3",
  now,
  events: [strongEvent("order_snapshot", "SAR"), strongEvent("payout_total", "QAR")],
  agreementMatches: [{ id: "match-2", contract_term_id: "term-2", state: "confirmed", currency: "SAR", evidence_date_start: "2026-10-01", matcher_version: "v1", created_at: "2026-10-03T12:00:00.000Z" }],
  findings: [],
  economicTwin: { currency: "SAR", gross_sales: 300, net_revenue: 240, orders: 3 },
});
assert.equal(mixed.currency_integrity.mixed, true);
assert.notEqual(mixed.truths.orders.status, "verified");
assert.notEqual(mixed.conclusion.state, "ready_for_reconciliation");
assert.equal(mixed.metrics.gross_sales, null);

const unavailable = summarizeDashboardV2Evidence({
  accountId: "acct-4",
  merchantId: "acct-4",
  now,
  events: [],
  agreementMatches: [],
  findings: [],
  availability: { events: false },
});
assert.equal(unavailable.conclusion.state, "unavailable");
assert.equal(unavailable.truths.orders.status, "unavailable");
assert.equal(unavailable.truths.payout.status, "unavailable");

console.log("Dashboard V2 evidence-summary contract verified.");
