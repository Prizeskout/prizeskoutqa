import { Bot, ShieldAlert } from "lucide-react";
import { DashboardV2Shell } from "./DashboardV2Shell";
import { useDashboardV2Modules } from "./useDashboardV2Modules";
import { useDashboardV2Summary } from "./useDashboardV2Summary";
import { buildDashboardV2ChromeData } from "./dashboard-v2-chrome";
import { PromotionsReferenceDemo } from "./PromotionsReferenceDemo";

const simulatorFields = [
  "Branches",
  "Menu items",
  "Discount",
  "Merchant-funded share",
  "Expected uplift",
  "Duration",
];
const guardrails = [
  ["Minimum contribution margin", "Campaign margin below floor", "Require approval"],
  ["Merchant-funded share", "Merchant funding above limit", "Warn finance team"],
  ["SKU already below target", "Selected SKU margin below floor", "Block promotion"],
  ["Discount stacking", "2+ discounts on one order", "Alert ops & finance"],
  ["Promotion cost cap", "Monthly cost above cap", "Alert, pause at 120%"],
  ["Deep discount approval", "Discount above 30%", "Require manager approval"],
];

export function DashboardV2Promotions() {
  const { promotions } = useDashboardV2Modules();
  const summary = useDashboardV2Summary().summary;
  const scenarios = promotions?.scenarios ?? [];
  const selected = scenarios[0];
  const demo = promotions?.demo as any;
  if (demo) return (
    <DashboardV2Shell activePage="promotions" chromeData={buildDashboardV2ChromeData(summary)}>
      <PromotionsReferenceDemo />
    </DashboardV2Shell>
  );

  return (
    <DashboardV2Shell activePage="promotions" chromeData={buildDashboardV2ChromeData(summary)}>
      <div className="ps-v2-page-heading">
        <div>
          <p className="ps-v2-eyebrow">Commercial / Promotions & Discounts / Last 30 days</p>
          <h1>
            {demo ? "14 campaigns generated QAR 231K in revenue." : "Campaign contribution is not calculated."}{" "}
            <span className="ps-v2-muted">
              {demo ? "3 are growing revenue while shrinking contribution." : "Verified campaign terms, SKU costs, and attributable orders are required."}
            </span>
          </h1>
        </div>
        <div className="ps-v2-status-actions">
          <button className="ps-v2-action" disabled>
            Guardrails
          </button>
          <button className="ps-v2-action ps-v2-action-dark" disabled>
            Simulate campaign
          </button>
        </div>
      </div>

      <section className="ps-v2-hero ps-v2-promotions-hero" aria-label="Promotion summary">
        <div className="ps-v2-hero-main">
          <span className="ps-v2-label">Incremental contribution from promotions</span>
          <h2 className="ps-v2-dominant-metric">{demo ? `QAR ${Number(demo.incremental).toLocaleString()}` : "Not calculated"}</h2>
          <p>
            {demo ? "Each QAR 1 of merchant spend returned QAR 0.67 in contribution" : promotions?.blockers[0] ??
              "PrizeSkout needs matching sales and cost records before it can calculate promotion profit."}
          </p>
          <div className="ps-v2-funding-caption">
            <span>Who funds the discounts</span>
            <span>Guardrail: merchant &lt; 50%</span>
          </div>
          <div className="ps-v2-funding-bar">
            <span />
            <i aria-label="50 percent guardrail" />
          </div>
          <div className="ps-v2-funding-legend">
            <span>{demo ? `Merchant-funded QAR ${Number(demo.merchant_spend).toLocaleString()} · 57.8%` : "Merchant-funded —"}</span>
            <span>{demo ? `Platform-funded QAR ${Number(demo.platform_spend).toLocaleString()}` : "Platform-funded —"}</span>
          </div>
          <span className="ps-v2-evidence-reference">
            SOURCE · PROMOTION_SCENARIOS · {promotions?.state.toUpperCase() ?? "UNAVAILABLE"}
          </span>
        </div>
        <div className="ps-v2-metric-grid">
          <div>
            <span>Active promotions</span>
            <strong>{promotions ? promotions.counts.active : "—"}</strong>
          </div>
          <div>
            <span>Revenue generated</span>
            <strong>{demo ? `QAR ${(demo.revenue / 1000).toFixed(1)}K` : "—"}</strong>
          </div>
          <div>
            <span>Avg promotion margin</span>
            <strong>{demo ? `${demo.avg_margin}%` : "—"}</strong>
          </div>
          <div>
            <span>Merchant-funded spend</span>
            <strong>{demo ? Number(demo.merchant_spend).toLocaleString() : "—"}</strong>
          </div>
          <div>
            <span>Platform-funded spend</span>
            <strong>{demo ? Number(demo.platform_spend).toLocaleString() : "—"}</strong>
            <small>{demo ? "Talabat co-funds 40% max" : "Not attributable"}</small>
          </div>
          <div data-tone="risk">
            <span>Campaigns at risk</span>
            <strong>{demo ? demo.at_risk : "—"}</strong>
            <small>{demo ? `QAR ${Number(demo.margin_at_risk).toLocaleString()} margin at risk / month` : "Waiting for campaign results"}</small>
          </div>
        </div>
      </section>

      <section className="ps-v2-card ps-v2-module-card ps-v2-campaign-card">
        <header>
          <div>
            <h2>Campaigns</h2>
            <p>Saved campaigns and the results PrizeSkout can confirm.</p>
          </div>
          <div className="ps-v2-period">
            <button disabled className="active">
              All
            </button>
            <button disabled>At risk</button>
            <button disabled>Watch</button>
            <button disabled>Healthy</button>
          </div>
        </header>
        <div className="ps-v2-table-wrap ps-v2-campaign-table">
          <table className="ps-v2-channel-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Platform</th>
                <th>Branch</th>
                <th>Discount</th>
                <th>Funding</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Contribution</th>
                <th>Margin</th>
                <th>Health</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.length ? (
                scenarios.map((row, index) => (
                  <tr key={row.id} data-selected={index === 0}>
                    <th scope="row">
                      <strong>{row.name}</strong>
                      <small>{formatCreated(row.created_at)}</small>
                    </th>
                    <td>{row.platform}</td>
                    <td>{textInput(row.inputs.branch) ?? "—"}</td>
                    <td>{textInput(row.inputs.discount) ?? "—"}</td>
                    <td>
                      <span className="ps-v2-mini-funding">
                        <i />
                      </span>
                      {textInput(row.inputs.merchant_funding) ? `${textInput(row.inputs.merchant_funding)}% merchant` : "—"}
                    </td>
                    <td>{numberResult(row.results.orders)}</td>
                    <td>{numberResult(row.results.revenue)}</td>
                    <td>{numberResult(row.results.contribution)}</td>
                    <td>{numberResult(row.results.margin_before, 1)}% → {numberResult(row.results.margin_after, 1)}%</td>
                    <td>{numberResult(row.results.health)}</td>
                    <td>
                      <span className="ps-v2-status-pill">{textInput(row.results.display_status) ?? row.status.replaceAll("_", " ")}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <th scope="row">No verified campaigns in scope</th>
                  {Array.from({ length: 10 }, (_, index) => (
                    <td key={index}>—</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="ps-v2-health-panel">
          <div>
            <span className="ps-v2-label">Promotion health score</span>
            <h3>{selected?.name ?? "No campaign selected"}</h3>
            <div className="ps-v2-health-score">
              <strong>{demo ? "62" : "—"}</strong>
              <span>/ 100</span>
            </div>
            <div className="ps-v2-health-segments">
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            {[
              "Order volume change",
              "Revenue change",
              "Contribution margin change",
              "Merchant funding guardrail",
              "Low-margin SKUs included",
            ].map((label) => (
              <p className="ps-v2-health-line" key={label}>
                <span>{demo ? (label === "Order volume change" || label === "Revenue change" ? "↑" : "↓") : "—"}</span>
                {label}
                <b>{demo ? ({"Order volume change":"+28%","Revenue change":"+19%","Contribution margin change":"−5.8 pts","Merchant funding guardrail":"60% — above 50%","Low-margin SKUs included":"6"} as Record<string,string>)[label] : "Not calculated"}</b>
              </p>
            ))}
            <small className="ps-v2-evidence-reference">
              Campaign health requires attributable evidence.
            </small>
          </div>
          <div>
            <span className="ps-v2-label">Recommended actions · pick one</span>
            <label>
              <input type="radio" disabled />
              <span>
                <strong>Recommendation not ready yet</strong>
                <small>Add campaign funding and matching order results first</small>
              </span>
              <b>—</b>
            </label>
            <label>
              <input type="radio" disabled />
              <span>
                <strong>Alternative scenario unavailable</strong>
                <small>Add product-level cost and margin information first</small>
              </span>
              <b>—</b>
            </label>
            <div className="ps-v2-health-actions">
              <small>Protected actions require manager approval</small>
              <div className="ps-v2-status-actions">
                <button className="ps-v2-action" disabled>
                  Simulate
                </button>
                <button className="ps-v2-action ps-v2-action-dark" disabled>
                  Request approval
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="simulator" className="ps-v2-card ps-v2-module-card ps-v2-simulator">
        <header>
          <div>
            <h2>Promotion simulator</h2>
            <p>Uses your recorded commission, product costs, and platform fees.</p>
          </div>
          <span className="ps-v2-readonly">Scenario only</span>
        </header>
        <div className="ps-v2-dashboard-row">
          <div className="ps-v2-simulator-inputs">
            <span className="ps-v2-label">Inputs</span>
            <label>
              <span>Platform</span>
              <div className="ps-v2-period">
                <button disabled className="active">
                  Talabat
                </button>
                <button disabled>Snoonu</button>
                <button disabled>Keeta</button>
                <button disabled>Jahez</button>
              </div>
            </label>
            {simulatorFields.map((field) => (
              <label key={field}>
                <span>
                  {field}
                  <b>Evidence required</b>
                </span>
                {["Discount", "Merchant-funded share", "Expected uplift", "Duration"].includes(
                  field,
                ) ? (
                  <span className="ps-v2-disabled-slider">
                    <i />
                  </span>
                ) : (
                  <div className="ps-v2-disabled-field">Evidence required</div>
                )}
              </label>
            ))}
          </div>
          <div className="ps-v2-simulator-output">
            <span className="ps-v2-label">Projected outcome</span>
            <div className="ps-v2-verdict">
              <ShieldAlert size={18} />
              <div>
                <strong>Simulation unavailable</strong>
                <p>Add product costs, commission, fees, and past order results first.</p>
              </div>
            </div>
            <div className="ps-v2-placeholder-table">
              <div>
                <span>14-day projection</span>
                <span>Baseline</span>
                <span>With promotion</span>
                <span>Change</span>
                <span>Evidence</span>
              </div>
              {[
                "Orders",
                "Gross revenue",
                "COGS",
                "Platform commission & fees",
                "Merchant promotion cost",
                "Contribution profit",
                "Contribution margin",
              ].map((metric) => (
                <div key={metric}>
                  <span>{metric}</span>
                  <span>—</span>
                  <span>—</span>
                  <span>—</span>
                  <span>Missing</span>
                </div>
              ))}
            </div>
            <div className="ps-v2-guardrail-check">
              <strong>Guardrail check</strong>
              <span>
                Contribution margin floor <b>Not evaluated</b>
              </span>
              <span>
                Merchant funding limit <b>Not evaluated</b>
              </span>
              <span>
                Loss-making SKU block <b>Not evaluated</b>
              </span>
              <span>
                Discount depth <b>Not evaluated</b>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="ps-v2-dashboard-row ps-v2-promotions-bottom">
        <section id="guardrails" className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Margin guardrails</h2>
              <p>Checked on every new or changed campaign</p>
            </div>
            <button className="ps-v2-action ps-v2-action-dark" disabled>
              + Guardrail
            </button>
          </header>
          <div className="ps-v2-placeholder-table ps-v2-guardrail-table">
            <div>
              <span>Guardrail</span>
              <span>Condition</span>
              <span>Action</span>
              <span>Hits 30d</span>
              <span>Status</span>
            </div>
            {guardrails.map(([name, condition, action]) => (
              <div key={name}>
                <span>
                  <strong>{name}</strong>
                  <small>No verified hits</small>
                </span>
                <span>{condition}</span>
                <span>
                  <strong>{action}</strong>
                </span>
                <span>—</span>
                <span className="ps-v2-switch-off">Off</span>
              </div>
            ))}
          </div>
          <p className="ps-v2-protected-note">
            <ShieldAlert size={16} /> Role checks and merchant approval are required before
            activation.
          </p>
        </section>
        <section className="ps-v2-card ps-v2-module-card ps-v2-ai-card">
          <header>
            <div>
              <h2>◆ Ask Copilot</h2>
              <p>Campaign + SKU + settlement data</p>
            </div>
          </header>
          <div className="ps-v2-question-chips">
            <button disabled>Which promotion is losing the most money?</button>
            <button disabled>What if Weekend 25% Off drops to 15%?</button>
            <button disabled>Which SKUs should be excluded?</button>
            <button disabled>Which promotion grows revenue but destroys margin?</button>
          </div>
          <Unavailable
            dark
            title="Copilot is waiting for evidence"
            detail="No campaign claim is generated without attributable revenue, funding, and cost evidence."
          />
          <div className="ps-v2-copilot-actions">
            <button disabled>View evidence</button>
            <button disabled>Create action</button>
            <button disabled>Simulate</button>
          </div>
        </section>
      </div>
    </DashboardV2Shell>
  );
}

function textInput(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value
    : typeof value === "number"
      ? String(value)
      : null;
}

function numberResult(value: unknown, digits = 0): string {
  return typeof value === "number" ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";
}

function formatCreated(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Saved scenario"
    : `Saved · ${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

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
