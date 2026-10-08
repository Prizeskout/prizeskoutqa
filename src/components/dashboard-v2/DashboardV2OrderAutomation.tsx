import { Bot, Radio, ShieldAlert } from "lucide-react";
import { DashboardV2Shell, type DashboardV2Page } from "./DashboardV2Shell";
import { useDashboardV2Modules } from "./useDashboardV2Modules";
import { useDashboardV2Summary } from "./useDashboardV2Summary";
import { buildDashboardV2ChromeData } from "./dashboard-v2-chrome";
import { OrderReferenceDemo } from "./OrderReferenceDemo";

const stages = [
  "Incoming",
  "Validation",
  "Availability check",
  "Automation rule",
  "Accepted",
  "POS sync",
];

export function DashboardV2OrderAutomation({
  activePage = "automation",
}: {
  activePage?: Extract<DashboardV2Page, "automation" | "orders">;
}) {
  const { order } = useDashboardV2Modules();
  const summary = useDashboardV2Summary().summary;
  const hasOrders = Boolean(order?.orders.length);
  const demo = order?.demo as any;
  if (demo && activePage === "automation") return (
    <DashboardV2Shell activePage={activePage} chromeData={buildDashboardV2ChromeData(summary)}>
      <OrderReferenceDemo />
    </DashboardV2Shell>
  );
  return (
    <DashboardV2Shell activePage={activePage} chromeData={buildDashboardV2ChromeData(summary)}>
      <div className="ps-v2-page-heading">
        <div>
          <p className="ps-v2-eyebrow">
            Operations / {activePage === "orders" ? "Orders" : "Order Automation"}
          </p>
          <h1>
            {activePage === "orders"
              ? "See your recent orders and their status."
              : demo ? "92.4% of today's orders were accepted without staff." : "Automation performance is not calculated."}{" "}
            <span className="ps-v2-muted">
              {demo ? "4 exceptions need a decision." : "Finish setting up Order Guard to see live order decisions."}
            </span>
          </h1>
        </div>
        <div className="ps-v2-status-actions">
          <button className="ps-v2-action" disabled>
            Branch override
          </button>
          <button className="ps-v2-action" disabled>
            New rule
          </button>
        </div>
      </div>

      <section className="ps-v2-hero" aria-label="Automation summary">
        <div className="ps-v2-hero-main">
          <span className="ps-v2-label">Automation rate</span>
          <h2 className="ps-v2-dominant-metric">{demo ? "92.4%" : "Not calculated"}</h2>
          <p>{demo ? "1,284 of 1,389 orders auto-accepted · 99.2% rule success" : order?.blockers[0] ?? "No live order information is available yet."}</p>
          <div className="ps-v2-outcome-bar" aria-label="Automation outcomes unavailable">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="ps-v2-evidence-reference">
            SOURCE · ORDER_GUARD · {order?.state.toUpperCase() ?? "UNAVAILABLE"}
          </span>
        </div>
        <div className="ps-v2-metric-grid">
          <div>
            <span>Orders received</span>
            <strong>{order ? order.received : "—"}</strong>
          </div>
          <div>
            <span>{demo ? "Avg acceptance time" : "Live orders"}</span>
            <strong>{demo ? "4.2 sec" : order ? order.live : "—"}</strong>
          </div>
          <div>
            <span>{demo ? "Manually accepted" : "Need attention"}</span>
            <strong>{demo ? demo.manual : order ? order.attention : "—"}</strong>
          </div>
          <div>
            <span>{demo ? "Rejected" : "Critical"}</span>
            <strong>{demo ? demo.rejected : order ? order.critical : "—"}</strong>
          </div>
          <div data-tone="risk">
            <span>SLA breaches</span>
            <strong>{demo ? demo.sla : "—"}</strong>
          </div>
          <div data-tone="brand">
            <span>Revenue protected</span>
            <strong>{demo ? `QAR ${Number(demo.protected).toLocaleString()}` : "—"}</strong>
            <small>{demo ? `${demo.prevented} missed orders prevented` : "Waiting for enough order information"}</small>
          </div>
        </div>
      </section>

      <section className="ps-v2-card ps-v2-module-card ps-v2-flow-card">
        <header>
          <div>
            <h2>Order flow monitor</h2>
            <p>Follow each order from arrival to POS confirmation.</p>
          </div>
          <span className="ps-v2-readonly">
            <Radio size={12} /> {hasOrders ? "Live" : "Offline"}
          </span>
        </header>
        <ol className="ps-v2-flow-stages">
          {(demo?.stages ?? stages.map((stage) => [stage, indexSafe(order?.received), "Not proven"])).map((stage: any[], index: number) => (
            <li key={String(stage[0])}>
              <span>{index + 1}</span>
              <strong>{stage[0]}</strong>
              <small><b>{stage[1]}</b> {stage[2]}</small>
            </li>
          ))}
        </ol>
        <div className="ps-v2-dashboard-row ps-v2-order-monitor">
          <section className="ps-v2-inset-panel">
            <div className="ps-v2-section-heading">
              <div>
                <h3>Recent orders</h3>
                <p>The latest orders received by PrizeSkout.</p>
              </div>
              <span className="ps-v2-evidence-reference">Validation → POS sync</span>
            </div>
            {hasOrders ? (
              <div className="ps-v2-retained-list">
                {order!.orders.slice(0, 7).map((row) => (
                  <div key={row.id}>
                    <time>
                      {new Date(row.placed_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <span>{row.channel?.slice(0, 1) ?? "?"}</span>
                    <p>
                      <strong>#{row.external_order_id}</strong>
                      <small>
                        {row.branch ?? "Unassigned"} · {row.status.replaceAll("_", " ")}
                      </small>
                    </p>
                    <b>
                      {row.order_total == null
                        ? "—"
                        : `${row.currency} ${row.order_total.toLocaleString()}`}
                    </b>
                  </div>
                ))}
              </div>
            ) : (
              <Unavailable
                title="Live order flow is unavailable"
                detail="Live orders will appear here when a channel starts sending them."
              />
            )}
          </section>
          <section className="ps-v2-inset-panel">
            <div className="ps-v2-section-heading">
              <div>
                <h3>Exceptions</h3>
                <p>Orders requiring attention</p>
              </div>
              <span className="ps-v2-evidence-reference">Feeds Priority Centre</span>
            </div>
            {order?.attention ? (
              <div className="ps-v2-exception-list">
                {order.orders
                  .filter((row) => ["attention", "manager", "critical"].includes(row.risk_level))
                  .map((row) => (
                    <article key={row.id}>
                      <header>
                        <strong>
                          {row.channel ?? "Channel"} order #{row.external_order_id}
                        </strong>
                        <span>{row.branch ?? "Unassigned"}</span>
                      </header>
                      <b>{row.status.replaceAll("_", " ")}</b>
                      <p>Status: {row.risk_level}. Check the order details before taking action.</p>
                      <button type="button" disabled>
                        Review
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              <Unavailable
                title="No orders need attention"
                detail="There are no current order issues to review."
              />
            )}
          </section>
        </div>
      </section>

      <div className="ps-v2-dashboard-row">
        <section className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Automation by branch</h2>
              <p>Order volume and issues by branch.</p>
            </div>
          </header>
          <div className="ps-v2-placeholder-table ps-v2-automation-table">
            <div>
              <span>Branch</span>
              <span>Orders</span>
              <span>Live</span>
              <span>Attention</span>
              <span>Critical</span>
            </div>
            {demo?.branches ? (
              demo.branches.map((row: string[]) => <div key={row[0]}><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]} · {row[5]}</span></div>)
            ) : order?.branches.length ? (
              order.branches.map((row) => (
                <div key={row.branch}>
                  <span>{row.branch}</span>
                  <span>{row.received}</span>
                  <span>{row.live}</span>
                  <span>{row.attention}</span>
                  <span>{row.critical}</span>
                </div>
              ))
            ) : (
              <div>
                <span>No verified branch automation data</span>
                <span>—</span>
                <span>—</span>
                <span>—</span>
                <span>—</span>
              </div>
            )}
          </div>
        </section>
        <section className="ps-v2-card ps-v2-module-card ps-v2-ai-card">
          <header>
            <div>
              <h2>Ask Copilot</h2>
              <p>Ask questions about your orders.</p>
            </div>
          </header>
          <div className="ps-v2-question-chips">
            <button disabled>Why are orders manual?</button>
            <button disabled>Where are SLA breaches?</button>
            <button disabled>What should I automate?</button>
          </div>
          <Unavailable
            dark
            title="Copilot is waiting for evidence"
            detail="Copilot will be ready when enough order information is available."
          />
        </section>
      </div>

      <section id="rules" className="ps-v2-card ps-v2-module-card ps-v2-rules">
        <header>
          <div>
            <h2>Order rules</h2>
            <p>Rules run top to bottom; the first verified match wins.</p>
          </div>
          <button className="ps-v2-action" disabled>
            + New rule
          </button>
        </header>
        <div className="ps-v2-placeholder-table ps-v2-rules-table">
          <div>
            <span># / Rule</span>
            <span>Status</span>
            <span>Platforms</span>
            <span>Branches</span>
            <span>Triggers 30d / Success</span>
          </div>
          {(demo?.rules ?? Array.from({ length: 6 }, (_, index) => [index === 0 ? "No order rules yet" : "Rule slot unavailable","—","—","—","—"])).map((row: string[], index: number) => (
            <div className="ps-v2-empty-rule-row" key={index}>
              <span>{row[0]}</span><span>{index < 5 && demo ? "On" : "Off"}</span><span>S · T · K · J</span><span>{row[1]}</span><span>{row[2]} · {row[3]} · {row[4]}</span>
            </div>
          ))}
        </div>
        <div className="ps-v2-rule-editing-heading">
          <span>Editing rule</span>
          <strong>No rule selected</strong>
          <button type="button" disabled>
            Test on last 30 days
          </button>
        </div>
        <div className="ps-v2-rule-editor" aria-label="Disabled rule editor">
          <div>
            <span className="ps-v2-label">Trigger</span>
            <strong>New order received</strong>
            <small>Choose a platform and branch</small>
          </div>
          <b>→</b>
          <div>
            <span className="ps-v2-label">When</span>
            <strong>Verified conditions</strong>
            <small>Choose the conditions for this rule</small>
            <div className="ps-v2-rule-chips">
              <span>Platform</span>
              <span>Branch</span>
              <span>Day</span>
              <span>Time</span>
              <span>Order value</span>
              <span>SKU</span>
              <span>Inventory</span>
              <span>POS status</span>
            </div>
          </div>
          <b>→</b>
          <div>
            <span className="ps-v2-label">Then</span>
            <strong>Protected action</strong>
            <small>Merchant approval required</small>
            <div className="ps-v2-rule-chips">
              <span>Auto accept</span>
              <span>Manual review</span>
              <span>Reject</span>
              <span>Notify manager</span>
              <span>Sync POS</span>
            </div>
          </div>
        </div>
        <div className="ps-v2-rule-note">
          <ShieldAlert size={16} />
          <span>
            <strong>Rule editing is not ready yet.</strong> It will become available after Order
            Guard setup and permission checks are complete.
          </span>
          <button className="ps-v2-action" disabled>
            Save rule
          </button>
        </div>
      </section>
    </DashboardV2Shell>
  );
}

function indexSafe(value: number | undefined) { return value == null ? "—" : value.toLocaleString(); }

function Unavailable({
  title,
  detail,
  dark = false,
}: {
  title: string;
  detail: string;
  dark?: boolean;
}) {
  return (
    <div className="ps-v2-unavailable">
      {dark ? <Bot size={24} aria-hidden="true" /> : <ShieldAlert size={24} aria-hidden="true" />}
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
