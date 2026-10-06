import { ArrowRight, FileCheck2, Landmark, ReceiptText, ScrollText, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardV2Shell, EvidenceStateCard } from "./DashboardV2Shell";
import type { DashboardV2Summary, DashboardV2TruthKey } from "@/server/core/dashboard-v2-summary";
import { useDashboardV2Summary } from "./useDashboardV2Summary";

const TRUTH_COPY: Record<DashboardV2TruthKey, { label: string; fallback: string }> = {
  orders: { label: "Order truth", fallback: "Merchant order or POS records" },
  contract: { label: "Contract truth", fallback: "Approved terms effective for the period" },
  payout: { label: "Payout truth", fallback: "Platform statement and deductions" },
  receipt: { label: "Receipt confirmation", fallback: "Optional proof that funds arrived" },
};

function formatObserved(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return `Observed through ${parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatMetric(value: number | null | undefined, currency?: string | null): string {
  if (value == null || !Number.isFinite(value)) return "Not calculated";
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${formatted}` : formatted;
}

function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not calculated";
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function channelName(value: string): string {
  return value === "unassigned" ? "Unassigned channel" : value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardV2Overview() {
  const load = useDashboardV2Summary();

  const summary = load.summary;
  const conclusion = summary?.conclusion ?? {
    title: load.phase === "loading" ? "Loading retained financial evidence..." : "Financial evidence is unavailable in this session.",
    detail: load.message ?? "PrizeSkout is not presenting a financial conclusion while the merchant-scoped evidence contract is unavailable.",
    next_action: load.phase === "loading" ? "Please wait while the read-only evidence contract is checked." : "Continue in the current workspace or restore the verified merchant session.",
  };
  const bridge = summary?.metrics.profit_bridge ?? [];
  const bridgeMaximum = Math.max(1, ...bridge.map((row) => row.amount ?? 0));
  const channels = summary?.metrics.by_channel ?? [];

  return (
    <DashboardV2Shell>
      <div className="ps-v2-page-heading">
        <div>
          <p className="ps-v2-eyebrow">Overview / Financial position</p>
          <h1>{conclusion.title}</h1>
          <p>{conclusion.detail} <strong>Next safe action:</strong> {conclusion.next_action}</p>
        </div>
        <span className="ps-v2-readonly">Read-only foundation</span>
      </div>

      <section className="ps-v2-hero" aria-labelledby="v2-decision-title">
        <div className="ps-v2-hero-main">
          <span className="ps-v2-label">True contribution profit</span>
          <h2 id="v2-decision-title" className="ps-v2-dominant-metric">
            {formatMetric(summary?.metrics.true_contribution, summary?.metrics.currency)}
          </h2>
          <p>{summary?.metrics.cost_coverage.complete
            ? `Complete product-cost evidence across ${summary.metrics.cost_coverage.orders_complete} evidenced orders.`
            : summary?.metrics.blockers.find((blocker) => blocker.includes("product-cost coverage")) ?? "Waiting for the governed evidence contract."}</p>
          <span className="ps-v2-evidence-reference">{summary?.latest_finding ? `Evidence ${summary.latest_finding.id}` : summary?.version ?? "Evidence contract loading"}</span>
        </div>
        <div className="ps-v2-metric-grid" aria-label="Financial summary">
          <div><span>Gross sales</span><strong>{formatMetric(summary?.metrics.gross_sales, summary?.metrics.currency)}</strong></div>
          <div><span>Net revenue</span><strong>{formatMetric(summary?.metrics.net_revenue, summary?.metrics.currency)}</strong></div>
          <div><span>Contribution margin</span><strong>{summary?.metrics.contribution_margin_pct == null ? "Not calculated" : `${summary.metrics.contribution_margin_pct.toFixed(1)}%`}</strong></div>
          <div data-tone="risk"><span>Settlement variance</span><strong>{formatMetric(summary?.metrics.settlement_variance, summary?.metrics.currency)}</strong></div>
          <div><span>Orders evidenced</span><strong>{formatMetric(summary?.metrics.orders)}</strong></div>
          <div data-tone="brand"><span>Recoverable margin</span><strong>{formatMetric(summary?.metrics.recoverable_margin, summary?.metrics.currency)}</strong></div>
        </div>
      </section>

      <section className="ps-v2-signal-strip" aria-label="Operational signals">
        <div><span className="ps-v2-label">Operational signals</span><strong>Protected modules remain evidence-gated</strong></div>
        <div><span className="ps-v2-signal-dot" data-tone="muted" /> <span><strong>Order Automation</strong><small>Unavailable until Order Guard is provisioned</small></span></div>
        <div><span className="ps-v2-signal-dot" data-tone="warning" /> <span><strong>Promotion Health</strong><small>Simulator wiring is a later protected slice</small></span></div>
      </section>

      <section className="ps-v2-change-card" aria-labelledby="v2-change-title">
        <div><span className="ps-v2-change-mark" aria-hidden="true" /><h2 id="v2-change-title">What changed?</h2></div>
        <p>{summary?.comparison?.summary ?? "Waiting for a governed previous-period comparison."}</p>
        {!!summary?.comparison?.movements.length && <div className="ps-v2-movement-grid">{summary.comparison.movements.map((movement) => <div key={movement.key}><span>{movement.label}</span><strong>{movement.change >= 0 ? "+" : "−"}{movement.unit === "points" ? `${Math.abs(movement.change).toFixed(1)} pts` : formatMetric(Math.abs(movement.change), movement.unit === "money" ? summary.metrics.currency : null)}</strong><small>{movement.change_pct == null ? "Measured difference" : `${movement.change_pct >= 0 ? "+" : "−"}${Math.abs(movement.change_pct).toFixed(1)}% vs previous period`}</small></div>)}</div>}
        {!!summary?.comparison?.blockers.length && <small className="ps-v2-change-boundary">Evidence boundary: {summary.comparison.blockers[0]} No cause is inferred.</small>}
      </section>

      <section className="ps-v2-card ps-v2-priority-card" aria-labelledby="v2-priority-title">
        <div className="ps-v2-section-heading">
          <div>
            <span className="ps-v2-label">Evidence-linked decisions</span>
            <h2 id="v2-priority-title">Priority decisions</h2>
            <p>Unresolved retained findings only. Nothing here sends a dispute or changes merchant data.</p>
          </div>
          <span className="ps-v2-readonly">Read-only</span>
        </div>
        {summary?.priority_decisions?.items.length ? (
          <ol className="ps-v2-priority-list">
            {summary.priority_decisions.items.map((item) => (
              <li key={item.id} data-state={item.state}>
                <span className="ps-v2-priority-rank" aria-hidden="true">{item.rank}</span>
                <div className="ps-v2-priority-body">
                  <div className="ps-v2-priority-title-row">
                    <div><strong>{item.title}</strong><span>{item.reference ?? "Retained finding"}</span></div>
                    <span className="ps-v2-priority-state">{item.state.replaceAll("_", " ")}</span>
                  </div>
                  <p>{item.next_safe_action}</p>
                  <div className="ps-v2-priority-meta">
                    <span>Finding {item.finding_id}</span>
                    <span>Evidence {item.evidence_strength ?? "not recorded"}</span>
                    {item.recovery_case_id && <span>Case {item.recovery_case_id}</span>}
                    {item.amount != null && <strong>{formatMetric(item.amount, item.currency)}</strong>}
                  </div>
                  {item.approval_required && <small>Merchant approval is required before any protected external action.</small>}
                  {!!item.blockers.length && <small>Blocked: {item.blockers[0]}</small>}
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="ps-v2-empty-copy">{summary?.priority_decisions?.blockers[0] ?? (summary?.priority_decisions?.state === "empty" ? "No unresolved retained findings require a priority decision in this period." : "Priority decisions have not loaded.")}</p>}
      </section>

      <section className="ps-v2-card ps-v2-profit-bridge" aria-labelledby="v2-bridge-title">
        <div className="ps-v2-section-heading">
          <div>
            <h2 id="v2-bridge-title">Profit bridge</h2>
            <p>Where evidenced gross sales go before they become true contribution.</p>
          </div>
          <span className="ps-v2-coverage-badge" data-complete={summary?.metrics.cost_coverage.complete ?? false}>
            Cost coverage {summary ? `${summary.metrics.cost_coverage.orders_complete}/${summary.metrics.cost_coverage.orders_total}` : "not loaded"}
          </span>
        </div>
        {bridge.length ? (
          <div className="ps-v2-bridge-chart" role="img" aria-label="Financial bridge from gross sales through recorded reductions and product cost to true contribution">
            {bridge.map((row) => (
              <div className="ps-v2-bridge-step" data-kind={row.kind} key={row.key}>
                <strong>{row.kind === "deduction" || row.kind === "cost" ? "−" : ""}{formatCompact(row.amount)}</strong>
                <div className="ps-v2-bridge-track"><span style={{ height: row.amount == null ? "2px" : `${Math.max(3, (Math.abs(row.amount) / bridgeMaximum) * 100)}%` }} /></div>
                <span>{row.label}</span>
              </div>
            ))}
          </div>
        ) : <p className="ps-v2-empty-copy">The merchant-scoped Economic Twin has not loaded, so no bridge is shown.</p>}
        <div className="ps-v2-bridge-note">
          <div><strong>{summary?.metrics.cost_coverage.complete ? "Contribution is evidence-complete for the selected orders." : "Contribution is intentionally withheld."}</strong><span>{summary?.metrics.cost_coverage.complete ? "Gross-to-net reductions remain grouped because retained order evidence does not safely classify every reduction." : "Complete product costs for every evidenced order to unlock the final bridge result."}</span></div>
          <b>{formatMetric(summary?.metrics.true_contribution, summary?.metrics.currency)}</b>
        </div>
      </section>

      <section className="ps-v2-card ps-v2-channel-card" aria-labelledby="v2-channel-title">
        <div className="ps-v2-section-heading">
          <div>
            <h2 id="v2-channel-title">Channel profitability</h2>
            <p>Revenue is not profit. Contribution stays unavailable by channel until cost coverage is complete.</p>
          </div>
          <span className="ps-v2-readonly">Economic Twin</span>
        </div>
        {channels.length ? (
          <div className="ps-v2-table-wrap">
            <table className="ps-v2-channel-table">
              <caption className="ps-v2-sr-only">Revenue, orders, recorded costs, contribution, and margin by channel</caption>
              <thead><tr><th scope="col">Channel</th><th scope="col">Revenue</th><th scope="col">Orders</th><th scope="col">AOV</th><th scope="col">Fees</th><th scope="col">Promotions</th><th scope="col">Product cost</th><th scope="col">Contribution</th><th scope="col">Margin</th></tr></thead>
              <tbody>{channels.map((row) => (
                <tr key={row.channel}>
                  <th scope="row"><span className="ps-v2-channel-mark" aria-hidden="true">{channelName(row.channel).charAt(0)}</span>{channelName(row.channel)}</th>
                  <td>{formatMetric(row.revenue, summary?.metrics.currency)}</td>
                  <td>{formatMetric(row.orders)}</td>
                  <td>{formatMetric(row.orders ? row.revenue / row.orders : null, summary?.metrics.currency)}</td>
                  <td>{formatMetric(row.fees, summary?.metrics.currency)}</td>
                  <td>{formatMetric(row.discounts, summary?.metrics.currency)}</td>
                  <td>{formatMetric(row.product_cost, summary?.metrics.currency)}</td>
                  <td><strong>{formatMetric(row.contribution, summary?.metrics.currency)}</strong></td>
                  <td><strong>{row.margin_pct == null ? "Not calculated" : `${row.margin_pct.toFixed(1)}%`}</strong></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="ps-v2-empty-copy">No evidenced channel rows are available for this period.</p>}
      </section>

      <section className="ps-v2-card ps-v2-reconciliation-card" aria-labelledby="v2-reconciliation-title" data-state={summary?.reconciliation.state ?? "unavailable"}>
        <div className="ps-v2-section-heading">
          <div>
            <h2 id="v2-reconciliation-title">Settlement reconciliation</h2>
            <p>Expected and reported payout stay tied to one retained finding and its allocation scope.</p>
          </div>
          <span className="ps-v2-finding-state">{summary?.reconciliation.label ?? "Finding not loaded"}</span>
        </div>
        <div className="ps-v2-reconciliation-layout">
          <div className="ps-v2-reconciliation-amounts">
            <div><span>Expected payout</span><strong>{formatMetric(summary?.reconciliation.expected_amount, summary?.reconciliation.currency)}</strong></div>
            <div><span>Reported payout</span><strong>{formatMetric(summary?.reconciliation.reported_amount, summary?.reconciliation.currency)}</strong></div>
            <div data-variance><span>Finding variance</span><strong>{formatMetric(summary?.reconciliation.variance, summary?.reconciliation.currency)}</strong></div>
          </div>
          <div className="ps-v2-finding-detail">
            <div className="ps-v2-allocation-row">
              <span className="ps-v2-label">Allocation boundary</span>
              <strong>{summary?.reconciliation.allocation_scope === "order" ? `Order ${summary.reconciliation.order_external_id}` : summary?.reconciliation.allocation_scope === "batch" ? `Batch ${summary.reconciliation.settlement_reference}` : "No allocation proven"}</strong>
            </div>
            <p>{summary?.reconciliation.explanation ?? "No applicable retained reconciliation finding is available for this period and currency."}</p>
            {summary?.reconciliation.state === "unallocated" && <p className="ps-v2-boundary-note"><strong>Not allocated to an order.</strong> This batch difference cannot become an order claim without order-level evidence.</p>}
            {summary?.reconciliation.claims_ready_amount != null && <p className="ps-v2-claims-note"><strong>{formatMetric(summary.reconciliation.claims_ready_amount, summary.reconciliation.currency)} supported shortfall.</strong> Merchant review and approval are still required before any external action.</p>}
            {!!summary?.reconciliation.blockers.length && <p className="ps-v2-boundary-note"><strong>Blocked:</strong> {summary.reconciliation.blockers[0]}</p>}
            <span className="ps-v2-evidence-reference">{summary?.reconciliation.finding_id ? `Finding ${summary.reconciliation.finding_id} · ${summary.reconciliation.evidence_strength ?? "strength not recorded"}` : "No applicable finding reference"}</span>
          </div>
        </div>
      </section>

      <section className="ps-v2-card ps-v2-branch-card" aria-labelledby="v2-branch-title">
        <div className="ps-v2-section-heading">
          <div>
            <h2 id="v2-branch-title">Branch performance</h2>
            <p>{summary?.metrics.branch_performance.ranked ? `${summary.metrics.branch_performance.rows.length} evidenced branches · ranked by contribution margin` : "Evidence-backed branch rows · ranking withheld until identity and cost coverage are complete"}</p>
          </div>
          <span className="ps-v2-coverage-badge" data-complete={summary?.metrics.branch_performance.ranked ?? false}>{summary?.metrics.branch_performance.ranked ? "Ranking ready" : "Ranking blocked"}</span>
        </div>
        {!!summary?.metrics.branch_performance.blockers.length && <p className="ps-v2-branch-blocker"><strong>Evidence boundary:</strong> {summary.metrics.branch_performance.blockers[0]}</p>}
        {summary?.metrics.branch_performance.rows.length ? (
          <div className="ps-v2-table-wrap ps-v2-branch-table-wrap">
            <table className="ps-v2-channel-table ps-v2-branch-table">
              <caption className="ps-v2-sr-only">Evidence-backed revenue, orders, costs, contribution, and margin by identified branch</caption>
              <thead><tr><th scope="col">{summary.metrics.branch_performance.ranked ? "Rank / branch" : "Branch"}</th><th scope="col">Revenue</th><th scope="col">Orders</th><th scope="col">Average order</th><th scope="col">Product cost</th><th scope="col">Contribution</th><th scope="col">Margin</th></tr></thead>
              <tbody>{summary.metrics.branch_performance.rows.map((row, index) => (
                <tr key={row.branch}>
                  <th scope="row"><span className="ps-v2-branch-rank" data-ranked={summary.metrics.branch_performance.ranked}>{summary.metrics.branch_performance.ranked ? index + 1 : "—"}</span>{channelName(row.branch)}</th>
                  <td>{formatMetric(row.revenue, summary.metrics.currency)}</td>
                  <td>{formatMetric(row.orders)}</td>
                  <td>{formatMetric(row.orders ? row.revenue / row.orders : null, summary.metrics.currency)}</td>
                  <td>{formatMetric(row.product_cost, summary.metrics.currency)}</td>
                  <td><strong>{formatMetric(row.contribution, summary.metrics.currency)}</strong></td>
                  <td><span className="ps-v2-margin-cell"><i style={{ width: row.margin_pct == null ? "0%" : `${Math.max(0, Math.min(100, row.margin_pct))}%` }} /><strong>{row.margin_pct == null ? "Not calculated" : `${row.margin_pct.toFixed(1)}%`}</strong></span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="ps-v2-empty-copy">{summary?.metrics.branch_performance.blockers[0] ?? "No identified branch evidence is available for this period."}</p>}
        {!!summary?.metrics.branch_performance.unassigned_orders && <p className="ps-v2-branch-footnote">{summary.metrics.branch_performance.unassigned_orders} unassigned order{summary.metrics.branch_performance.unassigned_orders === 1 ? "" : "s"} remain outside the branch rows and are not silently attributed.</p>}
      </section>

      <section aria-labelledby="v2-truth-title">
        <div className="ps-v2-section-heading">
          <div>
            <h2 id="v2-truth-title">Financial truth boundaries</h2>
            <p>Each source is loaded and evaluated independently.</p>
          </div>
        </div>
        <div className="ps-v2-evidence-grid">
          {(["orders", "contract", "payout", "receipt"] as const).map((key) => {
            const truth = summary?.truths[key];
            const copy = TRUTH_COPY[key];
            const Icon = key === "orders" ? FileCheck2 : key === "contract" ? ScrollText : key === "payout" ? ReceiptText : Landmark;
            const observed = truth ? formatObserved(truth.observed_through) : undefined;
            return (
              <EvidenceStateCard
                key={key}
                icon={Icon}
                label={copy.label}
                detail={truth?.blockers[0] ?? copy.fallback}
                state={truth?.status ?? (load.phase === "loading" ? "loading" : "unavailable")}
                meta={truth ? `${truth.record_count} current record${truth.record_count === 1 ? "" : "s"}${observed ? ` · ${observed}` : ""}` : undefined}
              />
            );
          })}
        </div>
      </section>

      <div className="ps-v2-two-column">
        <section className="ps-v2-card" aria-labelledby="v2-wiring-title">
          <span className="ps-v2-label">Evidence contract</span>
          <h2 id="v2-wiring-title">Backend wiring</h2>
          <ol className="ps-v2-checklist">
            <li><span>1</span><div><strong>Merchant scope</strong><p>{summary ? `Verified account scope · ${summary.scope.days}-day period` : "Waiting for a verified merchant session."}</p></div></li>
            <li><span>2</span><div><strong>Evidence summary</strong><p>{summary ? `${summary.version} · ${summary.currency_integrity.mixed ? "Currencies remain separated" : summary.currency_integrity.currencies[0] ?? "Currency not proven"}` : "No financial contract is being assumed."}</p></div></li>
            <li><span>3</span><div><strong>Parity audit</strong><p>Compare V2 and the current dashboard before enabling any production cutover.</p></div></li>
          </ol>
        </section>

        <section className="ps-v2-card ps-v2-warning-card" aria-labelledby="v2-automation-title">
          <span className="ps-v2-warning-icon"><ShieldAlert size={18} aria-hidden="true" /></span>
          <div>
            <span className="ps-v2-label">Protected capability</span>
            <h2 id="v2-automation-title">Order Automation remains unavailable</h2>
            <p>Order Guard database state is not verified in production. No live rate, order feed, rule toggle, or protected action is simulated in this preview.</p>
          </div>
        </section>
      </div>

      <div className="ps-v2-current-workspace-link">
        <Link to="/dashboard/revenue-hub" className="ps-v2-primary-link">Continue in the current workspace <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </DashboardV2Shell>
  );
}
