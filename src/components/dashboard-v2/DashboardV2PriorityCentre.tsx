import { CircleAlert, FileSearch, ShieldCheck } from "lucide-react";
import { DashboardV2Shell } from "./DashboardV2Shell";
import { useDashboardV2Summary } from "./useDashboardV2Summary";
import { buildDashboardV2ChromeData } from "./dashboard-v2-chrome";

function formatAmount(value: number | null, currency: string | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${currency ? `${currency} ` : ""}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}`;
}

export function DashboardV2PriorityCentre() {
  const load = useDashboardV2Summary();
  const decisions = load.summary?.priority_decisions;
  const state =
    load.phase === "loading"
      ? "loading"
      : load.phase === "unavailable"
        ? "unavailable"
        : (decisions?.state ?? "unavailable");

  const emptyCopy =
    state === "loading"
      ? "Checking what needs your attention."
      : state === "empty"
        ? "Nothing needs a decision for the selected period."
        : state === "blocked"
          ? (decisions?.blockers[0] ??
            "More information is needed before PrizeSkout can suggest a decision.")
          : (load.message ??
            decisions?.blockers[0] ??
            "Priority decisions are not available right now.");

  return (
    <DashboardV2Shell activePage="priority" chromeData={buildDashboardV2ChromeData(load.summary)}>
      <div className="ps-v2-page-heading">
        <div>
          <p className="ps-v2-eyebrow">Priority centre / Decisions</p>
          <h1>See what needs your attention next.</h1>
          <p>Review the most important issues first. Nothing is sent or changed from this page.</p>
        </div>
        <span className="ps-v2-readonly">Read-only</span>
      </div>

      <section className="ps-v2-priority-boundary" aria-label="Priority Centre safeguards">
        <div>
          <FileSearch size={17} aria-hidden="true" />
          <span>
            <strong>Check the details first</strong>
            <small>A payout difference is not linked to an order until the records prove it.</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={17} aria-hidden="true" />
          <span>
            <strong>You stay in control</strong>
            <small>PrizeSkout asks for your approval before taking an outside action.</small>
          </span>
        </div>
      </section>

      <section
        className="ps-v2-card ps-v2-priority-centre-card"
        aria-labelledby="priority-centre-title"
        data-contract-state={state}
      >
        <div className="ps-v2-section-heading">
          <div>
            <span className="ps-v2-label">Most important first</span>
            <h2 id="priority-centre-title">Priority decisions</h2>
            <p>Up to three open issues that need your attention.</p>
          </div>
          <span className="ps-v2-priority-contract-state">{state.replaceAll("_", " ")}</span>
        </div>

        {decisions?.items.length ? (
          <ol className="ps-v2-priority-centre-list">
            {decisions.items.map((item) => {
              const amount = formatAmount(item.amount, item.currency);
              return (
                <li key={item.id} data-state={item.state}>
                  <div className="ps-v2-priority-centre-rank">
                    <span>{item.rank}</span>
                    <CircleAlert size={17} aria-hidden="true" />
                  </div>
                  <div className="ps-v2-priority-centre-body">
                    <div className="ps-v2-priority-title-row">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.reference ?? "Recorded issue"}</span>
                      </div>
                      <span className="ps-v2-priority-state">
                        {item.state.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="ps-v2-priority-next">
                      <strong>Next safe action</strong>
                      {item.next_safe_action}
                    </p>
                    <dl className="ps-v2-priority-provenance">
                      <div>
                        <dt>Finding</dt>
                        <dd>{item.finding_id}</dd>
                      </div>
                      <div>
                        <dt>Recovery case</dt>
                        <dd>{item.recovery_case_id ?? "No linked case"}</dd>
                      </div>
                      <div>
                        <dt>Evidence strength</dt>
                        <dd>{item.evidence_strength ?? "Not recorded"}</dd>
                      </div>
                      <div>
                        <dt>Supported amount</dt>
                        <dd>{amount ?? "Not claims-ready"}</dd>
                      </div>
                    </dl>
                    {!!item.blockers.length && (
                      <div className="ps-v2-priority-blocker">
                        <strong>Blocked</strong>
                        <span>{item.blockers.join(" ")}</span>
                      </div>
                    )}
                    <div className="ps-v2-priority-approval" data-required={item.approval_required}>
                      <ShieldCheck size={15} aria-hidden="true" />
                      <span>
                        {item.approval_required
                          ? "Merchant approval is required before any protected external action."
                          : "No protected action is available from this read-only route."}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="ps-v2-priority-empty" role="status">
            <CircleAlert size={22} aria-hidden="true" />
            <div>
              <strong>
                {state === "empty"
                  ? "Nothing requires a decision"
                  : state === "blocked"
                    ? "Evidence boundary reached"
                    : state === "loading"
                      ? "Checking your records"
                      : "Priority Centre unavailable"}
              </strong>
              <p>{emptyCopy}</p>
            </div>
          </div>
        )}
      </section>
    </DashboardV2Shell>
  );
}
