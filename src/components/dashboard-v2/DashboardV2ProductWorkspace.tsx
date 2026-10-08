import { useState } from "react";
import { Bot, Check, Clipboard, Download, FileJson, LoaderCircle, Send } from "lucide-react";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { MerchantOperatingLoop } from "@/components/dashboard/MerchantOperatingLoop";
import { DashboardV2Shell } from "./DashboardV2Shell";
import { buildDashboardV2ChromeData } from "./dashboard-v2-chrome";
import { useDashboardV2Activity } from "./useDashboardV2Activity";
import { useDashboardV2Context } from "./useDashboardV2Context";
import { useDashboardV2Summary } from "./useDashboardV2Summary";
import type { DashboardV2WorkspaceId } from "./DashboardV2Workspace";

const money = (value: number | null | undefined, currency: string | null | undefined) =>
  value == null
    ? "Not calculated"
    : `${currency ?? ""} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}`.trim();
const text = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;
const date = (value: unknown) =>
  typeof value === "string" ? new Date(value).toLocaleString() : "—";

function download(filename: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Copilot({ role = "cfo" }: { role?: "cfo" | "manager" }) {
  const context = useDashboardV2Context();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function ask(value = prompt) {
    const question = value.trim();
    if (!question || busy) return;
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
      accessCode = localStorage.getItem("ps_access_code") ?? "";
    setMessages((rows) => [...rows, { role: "user", text: question }]);
    setPrompt("");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/copilot/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question,
          requested_role: role,
          merchant_id: merchantId,
          access_code: accessCode,
          context: {
            current_page: `dashboard/${role === "manager" ? "store-manager" : "ai-copilot"}`,
            currency: context?.currency,
            connected_channels: context?.channels,
            conversation: messages.slice(-8),
          },
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Copilot could not answer.");
      setMessages((rows) => [
        ...rows,
        {
          role: "assistant",
          text: body.message || "PrizeSkout could not find enough information to answer.",
        },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Copilot could not answer.");
    } finally {
      setBusy(false);
    }
  }
  const manager = role === "manager";
  return (
    <section className="ps-v2-card ps-v2-module-card">
      <header>
        <div>
          <h2>{manager ? "Chat with your Store Manager" : "Ask about your finances"}</h2>
          <p>
            {manager
              ? "Ask for help with store work. You will review any change before it happens."
              : "Answers use the financial records available in PrizeSkout. This chat cannot make changes on its own."}
          </p>
        </div>
        <span className="ps-v2-readonly">
          <Bot size={13} /> {manager ? "AI Store Manager" : "CFO Copilot"}
        </span>
      </header>
      <div className="ps-v2-copilot-thread" aria-live="polite">
        {messages.length ? (
          messages.map((message, index) => (
            <article key={index} data-role={message.role}>
              <strong>{message.role === "user" ? "You" : "PrizeSkout"}</strong>
              <p>{message.text}</p>
            </article>
          ))
        ) : (
          <div className="ps-v2-empty-workspace">
            <Bot size={28} />
            <strong>
              {manager ? "What would you like help with?" : "Ask a financial question"}
            </strong>
            <p>
              {manager
                ? "Try “What needs attention today?” or “Prepare a catalogue update.”"
                : "Try “What information is missing?” or “Which channel needs attention?”"}
            </p>
          </div>
        )}
        {busy && (
          <p>
            <LoaderCircle className="ps-v2-spin" size={16} /> Checking your records…
          </p>
        )}
      </div>
      {error && (
        <p className="ps-v2-form-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="ps-v2-copilot-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label htmlFor={`v2-${role}-prompt`}>{manager ? "Request" : "Question"}</label>
        <textarea
          id={`v2-${role}-prompt`}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={2000}
          placeholder={
            manager
              ? "Ask the Store Manager to inspect, prepare, or organize work"
              : "Ask about profit, payouts, fees, trends, or missing evidence"
          }
        />
        <button className="ps-v2-action" disabled={!prompt.trim() || busy}>
          <Send size={14} /> {manager ? "Ask Store Manager" : "Ask Copilot"}
        </button>
      </form>
    </section>
  );
}

function Reports({ summary }: { summary: ReturnType<typeof useDashboardV2Summary>["summary"] }) {
  const disabled = !summary;
  const exportJson = () =>
    summary &&
    download(
      `prizeskout-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(summary, null, 2),
      "application/json",
    );
  const exportCsv = () =>
    summary &&
    download(
      `prizeskout-report-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "metric,value,currency",
        `gross_sales,${summary.metrics.gross_sales ?? ""},${summary.metrics.currency ?? ""}`,
        `net_revenue,${summary.metrics.net_revenue ?? ""},${summary.metrics.currency ?? ""}`,
        `orders,${summary.metrics.orders ?? ""},`,
        `true_contribution,${summary.metrics.true_contribution ?? ""},${summary.metrics.currency ?? ""}`,
        `settlement_variance,${summary.metrics.settlement_variance ?? ""},${summary.metrics.currency ?? ""}`,
      ].join("\n"),
      "text/csv",
    );
  return (
    <section className="ps-v2-card ps-v2-module-card">
      <header>
        <div>
          <h2>Financial report</h2>
          <p>
            Your download uses the dates and currency shown above. Missing numbers stay clearly
            marked.
          </p>
        </div>
      </header>
      <div className="ps-v2-report-actions">
        <button className="ps-v2-action" disabled={disabled} onClick={exportCsv}>
          <Download size={14} /> Download CSV
        </button>
        <button className="ps-v2-action" disabled={disabled} onClick={exportJson}>
          <FileJson size={14} /> Download evidence JSON
        </button>
      </div>
      <div className="ps-v2-placeholder-table">
        <div>
          <span>Metric</span>
          <span>Value</span>
          <span>Evidence state</span>
          <span>Period</span>
        </div>
        {[
          ["Gross sales", money(summary?.metrics.gross_sales, summary?.metrics.currency)],
          ["Net revenue", money(summary?.metrics.net_revenue, summary?.metrics.currency)],
          ["Orders", summary?.metrics.orders ?? "Not calculated"],
          ["Contribution", money(summary?.metrics.true_contribution, summary?.metrics.currency)],
          [
            "Settlement variance",
            money(summary?.metrics.settlement_variance, summary?.metrics.currency),
          ],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <span>{value}</span>
            <span>{summary?.metrics.state ?? "unavailable"}</span>
            <span>{summary ? `${summary.scope.days} days` : "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardV2ProductWorkspace({ workspace }: { workspace: DashboardV2WorkspaceId }) {
  const load = useDashboardV2Summary(),
    summary = load.summary,
    context = useDashboardV2Context(),
    activity = useDashboardV2Activity();
  const chrome = buildDashboardV2ChromeData(summary);
  const configs: Partial<Record<DashboardV2WorkspaceId, [string, string]>> = {
    "ai-copilot": ["AI Copilot", "Ask questions about your business finances."],
    "profit-intelligence": ["Profit intelligence", "See your sales, costs, and true profit."],
    "menu-intelligence": [
      "Menu intelligence",
      "See which menu items make money and which need attention.",
    ],
    channels: ["Channels", "Connect and manage your sales channels."],
    settlements: ["Settlements", "Compare what you expected with what the platform reported."],
    reports: ["Reports", "View and download your financial summary."],
    integrations: ["Integrations", "Connect the tools and services you use."],
    "api-developers": ["API & Developers", "Build with the PrizeSkout API."],
    settings: ["Settings", "Manage your account and preferences."],
    "store-access": ["Store access", "Control who can open this store."],
    "audit-log": ["Audit log", "See what changed, when it changed, and where it came from."],
  };
  configs["store-manager"] = [
    "AI Store Manager",
    "Get help with daily store work and review changes before they happen.",
  ];
  const [label, title] = configs[workspace] ?? [workspace, workspace];
  const auditRows = activity.data?.audit.rows ?? [],
    channelRows = activity.data?.channels.rows ?? [],
    costRows = activity.data?.costs.rows ?? [];
  return (
    <DashboardV2Shell activePage={workspace} chromeData={chrome}>
      <div className="ps-v2-page-heading">
        <div>
          <p className="ps-v2-eyebrow">Workspace / {label}</p>
          <h1>{title}</h1>
        </div>
      </div>
      {workspace === "ai-copilot" && <Copilot />}
      {workspace === "store-manager" && (
        <>
          <Copilot role="manager" />
          <section className="ps-v2-store-manager">
            <MerchantOperatingLoop />
          </section>
        </>
      )}
      {workspace === "settings" && (
        <section className="ps-v2-card ps-v2-module-card">
          <SettingsTabs initialTab="Margin Rules" />
        </section>
      )}
      {workspace === "store-access" && (
        <section className="ps-v2-card ps-v2-module-card">
          <SettingsTabs initialTab="Store Access" />
        </section>
      )}
      {(workspace === "integrations" || workspace === "channels") && (
        <>
          <section className="ps-v2-card ps-v2-module-card">
            <SettingsTabs initialTab="Channels" />
          </section>
          <section className="ps-v2-card ps-v2-module-card">
            <header>
              <div>
                <h2>Connection status</h2>
                <p>See which sales channels are connected and when they were last checked.</p>
              </div>
            </header>
            <div className="ps-v2-placeholder-table">
              <div>
                <span>Platform</span>
                <span>Status</span>
                <span>Last verified</span>
                <span>Issue</span>
              </div>
              {channelRows.length ? (
                channelRows.map((row) => (
                  <div key={String(row.id)}>
                    <span>{text(row.platform)}</span>
                    <span>{text(row.status)}</span>
                    <span>{date(row.last_verified_at ?? row.updated_at)}</span>
                    <span>{text(row.error_message, "None recorded")}</span>
                  </div>
                ))
              ) : (
                <div>
                  <span>No channels connected yet</span>
                  <span>
                    {activity.loading
                      ? "Loading"
                      : (activity.data?.channels.state ?? "Unavailable")}
                  </span>
                  <span>—</span>
                  <span>
                    {activity.error ??
                      activity.data?.channels.blocker ??
                      "Connect a supported channel above"}
                  </span>
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {workspace === "reports" && <Reports summary={summary} />}
      {workspace === "profit-intelligence" && (
        <section className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Profit summary</h2>
              <p>True profit appears when every order has the product costs it needs.</p>
            </div>
          </header>
          <div className="ps-v2-metric-grid">
            <div>
              <span>Gross sales</span>
              <strong>{money(summary?.metrics.gross_sales, summary?.metrics.currency)}</strong>
            </div>
            <div>
              <span>Net revenue</span>
              <strong>{money(summary?.metrics.net_revenue, summary?.metrics.currency)}</strong>
            </div>
            <div>
              <span>Product-cost coverage</span>
              <strong>{summary ? `${summary.metrics.cost_coverage.pct}%` : "—"}</strong>
            </div>
            <div>
              <span>True contribution</span>
              <strong>
                {money(summary?.metrics.true_contribution, summary?.metrics.currency)}
              </strong>
            </div>
            <div>
              <span>Margin</span>
              <strong>
                {summary?.metrics.contribution_margin_pct == null
                  ? "Not calculated"
                  : `${summary.metrics.contribution_margin_pct}%`}
              </strong>
            </div>
            <div>
              <span>Currency</span>
              <strong>{summary?.metrics.currency ?? context?.currency ?? "—"}</strong>
            </div>
          </div>
        </section>
      )}
      {workspace === "menu-intelligence" && (
        <section className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Product costs</h2>
              <p>See the cost recorded for each item and when that cost started.</p>
            </div>
          </header>
          <div className="ps-v2-placeholder-table">
            <div>
              <span>SKU</span>
              <span>Unit cost</span>
              <span>Source</span>
              <span>Effective from</span>
            </div>
            {costRows.length ? (
              costRows.map((row) => (
                <div key={String(row.id)}>
                  <span>{text(row.sku)}</span>
                  <span>{money(Number(row.unit_cost), text(row.currency, ""))}</span>
                  <span>{text(row.source_provider)}</span>
                  <span>{date(row.effective_from ?? row.created_at)}</span>
                </div>
              ))
            ) : (
              <div>
                <span>No product costs added yet</span>
                <span>—</span>
                <span>
                  {activity.data?.costs.state ?? (activity.loading ? "Loading" : "Unavailable")}
                </span>
                <span>
                  {activity.error ?? activity.data?.costs.blocker ?? "Add product cost evidence"}
                </span>
              </div>
            )}
          </div>
        </section>
      )}
      {workspace === "settlements" && (
        <section className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Latest payout check</h2>
              <p>
                Compare what PrizeSkout expected with what the platform reported.
              </p>
            </div>
          </header>
          {summary?.reconciliation ? (
            <div className="ps-v2-placeholder-table">
              <div>
                <span>Conclusion</span>
                <span>Expected</span>
                <span>Reported</span>
                <span>Variance / allocation</span>
              </div>
              <div>
                <span>{summary.reconciliation.label}</span>
                <span>
                  {money(summary.reconciliation.expected_amount, summary.reconciliation.currency)}
                </span>
                <span>
                  {money(summary.reconciliation.reported_amount, summary.reconciliation.currency)}
                </span>
                <span>
                  {money(summary.reconciliation.variance, summary.reconciliation.currency)} ·{" "}
                  {summary.reconciliation.allocation_scope}
                </span>
              </div>
            </div>
          ) : (
            <div className="ps-v2-empty-workspace">
              <strong>No payout check available yet</strong>
              <p>Add a payout statement before PrizeSkout checks for a difference.</p>
            </div>
          )}
        </section>
      )}
      {workspace === "audit-log" && (
        <section className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Activity history</h2>
              <p>See what changed, when it changed, and where it came from.</p>
            </div>
            <span className="ps-v2-readonly">
              <Check size={13} /> Append-only
            </span>
          </header>
          <div className="ps-v2-placeholder-table">
            <div>
              <span>Event</span>
              <span>Summary</span>
              <span>Source / target</span>
              <span>Recorded</span>
            </div>
            {auditRows.length ? (
              auditRows.map((row) => (
                <div key={String(row.id)}>
                  <span>{text(row.event_type)}</span>
                  <span>{text(row.summary_en)}</span>
                  <span>
                    {text(row.source_platform)} / {text(row.target_channel)}
                  </span>
                  <span>{date(row.created_at)}</span>
                </div>
              ))
            ) : (
              <div>
                <span>No activity recorded yet</span>
                <span>
                  {activity.error ??
                    activity.data?.audit.blocker ??
                    "No activity has been recorded for this account"}
                </span>
                <span>—</span>
                <span>{activity.loading ? "Loading" : "—"}</span>
              </div>
            )}
          </div>
        </section>
      )}
      {workspace === "api-developers" && (
        <section className="ps-v2-card ps-v2-module-card">
          <header>
            <div>
              <h2>Developer access</h2>
              <p>Build and test your integration before requesting live access.</p>
            </div>
            <a className="ps-v2-action" href="/docs">
              Open API reference
            </a>
          </header>
          <div className="ps-v2-api-example">
            <code>POST https://prizeskout.qa/v1/margin</code>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText("POST https://prizeskout.qa/v1/margin")
              }
            >
              <Clipboard size={14} /> Copy
            </button>
          </div>
          <p>
            API keys are created only in the secure developer area and are never created
            automatically.
          </p>
        </section>
      )}
    </DashboardV2Shell>
  );
}
