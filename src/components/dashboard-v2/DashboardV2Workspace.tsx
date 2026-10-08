import {
  Bot,
  ChartNoAxesCombined,
  Code2,
  FileCheck2,
  History,
  PackageCheck,
  PlugZap,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardV2Shell, EvidenceStateCard, type DashboardV2Page } from "./DashboardV2Shell";
import { buildDashboardV2ChromeData } from "./dashboard-v2-chrome";
import { useDashboardV2Context } from "./useDashboardV2Context";
import { useDashboardV2Summary } from "./useDashboardV2Summary";

export type DashboardV2WorkspaceId = Exclude<
  DashboardV2Page,
  "overview" | "priority" | "automation" | "orders" | "promotions"
>;

const WORKSPACES: Record<
  DashboardV2WorkspaceId,
  { eyebrow: string; title: string; description: string; boundary: string; icon: typeof Bot }
> = {
  "ai-copilot": {
    eyebrow: "Intelligence / AI Copilot",
    title: "Ask about your business finances.",
    description:
      "Copilot uses the same account, dates, and financial records shown across your dashboard.",
    boundary:
      "You must approve any action that could change your store or contact someone outside PrizeSkout.",
    icon: Bot,
  },
  "store-manager": {
    eyebrow: "Operations / AI Store Manager",
    title: "Manage daily store work in one place.",
    description: "Review issues, prepare work, and approve changes before they happen.",
    boundary: "Store changes need your approval and are checked after they run.",
    icon: Bot,
  },
  "profit-intelligence": {
    eyebrow: "Intelligence / Profit intelligence",
    title: "See what you truly earn.",
    description: "Review sales, costs, and profit using the records available for your account.",
    boundary: "Profit stays Not calculated until all required product costs are available.",
    icon: ChartNoAxesCombined,
  },
  "menu-intelligence": {
    eyebrow: "Intelligence / Menu intelligence",
    title: "See which menu items make money.",
    description: "Review product costs and channel fees before making menu or price decisions.",
    boundary:
      "PrizeSkout will not rank or reprice an item when key costs or channel terms are missing.",
    icon: PackageCheck,
  },
  channels: {
    eyebrow: "Commercial / Channels",
    title: "Manage your connected sales channels.",
    description: "See which channels are connected and when they were last checked.",
    boundary: "A connection alone does not mean all orders, fees, or payouts are available.",
    icon: ShieldCheck,
  },
  settlements: {
    eyebrow: "Finance / Settlements",
    title: "Settlement truth stays separate from bank receipt.",
    description:
      "Expected amount, platform-reported amount, allocation scope, and receipt confirmation remain distinct.",
    boundary: "Batch differences cannot become order claims without order-level evidence.",
    icon: ReceiptText,
  },
  reports: {
    eyebrow: "Finance / Reports",
    title: "Download a clear financial summary.",
    description: "Reports keep the selected dates, currency, and any missing information visible.",
    boundary: "A report will not fill in numbers that PrizeSkout cannot verify.",
    icon: FileCheck2,
  },
  integrations: {
    eyebrow: "Infrastructure / Integrations",
    title: "Connect the tools you already use.",
    description: "Check and manage the services that send information to PrizeSkout.",
    boundary: "Only you can add a connection or update its login details.",
    icon: PlugZap,
  },
  "api-developers": {
    eyebrow: "Infrastructure / API & Developers",
    title: "Build safely with the PrizeSkout API.",
    description: "Test your integration before requesting live access.",
    boundary: "API keys and live access are managed only in the secure developer area.",
    icon: Code2,
  },
  settings: {
    eyebrow: "Account / Settings",
    title: "Manage your account and preferences.",
    description: "Update your business details, currency, notifications, and protection settings.",
    boundary: "Some settings stay locked until the related feature is ready.",
    icon: Settings,
  },
  "store-access": {
    eyebrow: "Account / Store access",
    title: "Control who can open this store.",
    description: "Manage access without showing private sign-in details on the page.",
    boundary: "Private access codes are never displayed here.",
    icon: Users,
  },
  "audit-log": {
    eyebrow: "Governance / Audit log",
    title: "Audit history stays evidence-linked.",
    description:
      "Priority findings retain immutable finding references, evidence strength, blockers, and safe next actions.",
    boundary: "No missing event or recovery case is reconstructed from browser state.",
    icon: History,
  },
};

const money = (value: number | null | undefined, currency: string | null | undefined) =>
  value == null
    ? "Not calculated"
    : `${currency ? `${currency} ` : ""}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}`;

export function DashboardV2Workspace({ workspace }: { workspace: DashboardV2WorkspaceId }) {
  const config = WORKSPACES[workspace];
  const load = useDashboardV2Summary();
  const summary = load.summary;
  const context = useDashboardV2Context();
  const Icon = config.icon;
  const truthCount = summary
    ? Object.values(summary.truths).filter((truth) => truth.status === "verified").length
    : 0;

  return (
    <DashboardV2Shell activePage={workspace} chromeData={buildDashboardV2ChromeData(summary)}>
      <div className="ps-v2-page-heading">
        <div>
          <p className="ps-v2-eyebrow">{config.eyebrow}</p>
          <h1>
            {config.title} <span className="ps-v2-muted">{config.description}</span>
          </h1>
        </div>
        <span className="ps-v2-readonly">
          <Icon size={13} aria-hidden="true" /> New workspace
        </span>
      </div>

      <section className="ps-v2-hero" aria-label={`${config.title} summary`}>
        <div className="ps-v2-hero-main">
          <span className="ps-v2-label">Current status</span>
          <h2 className="ps-v2-dominant-metric">
            {load.phase === "ready"
              ? summary?.conclusion.title
              : load.phase === "loading"
                ? "Loading your records"
                : "Information unavailable"}
          </h2>
          <p>
            {load.phase === "ready"
              ? summary?.conclusion.detail
              : (load.message ?? "Your financial information is still loading.")}
          </p>
          <span className="ps-v2-evidence-reference">
            SOURCE · DASHBOARD_V2_SUMMARY · {load.phase.toUpperCase()}
          </span>
        </div>
        <div className="ps-v2-metric-grid">
          <div>
            <span>Merchant</span>
            <strong>{context?.merchant_label ?? "—"}</strong>
          </div>
          <div>
            <span>Currency</span>
            <strong>{context?.currency ?? "—"}</strong>
          </div>
          <div>
            <span>Connected channels</span>
            <strong>{context?.channels.length ?? "—"}</strong>
          </div>
          <div>
            <span>Verified truths</span>
            <strong>{summary ? `${truthCount}/4` : "—"}</strong>
          </div>
          <div>
            <span>Orders</span>
            <strong>{summary?.metrics.orders ?? "Not calculated"}</strong>
          </div>
          <div data-tone="brand">
            <span>Recoverable margin</span>
            <strong>{money(summary?.metrics.recoverable_margin, summary?.metrics.currency)}</strong>
          </div>
        </div>
      </section>

      <section className="ps-v2-card ps-v2-module-card">
        <header>
          <div>
            <h2>What PrizeSkout can confirm</h2>
            <p>See what information is ready and what still needs attention.</p>
          </div>
          <span className="ps-v2-readonly">No legacy fallback</span>
        </header>
        <div className="ps-v2-truth-grid">
          <EvidenceStateCard
            icon={Icon}
            label="Merchant scope"
            state={
              context?.state === "available"
                ? "verified"
                : context?.state === "partial"
                  ? "partial"
                  : "unavailable"
            }
            detail={
              context
                ? `${context.brand_label} · ${context.location_label} · ${context.channel_label}`
                : "Merchant scope has not loaded."
            }
          />
          <EvidenceStateCard
            icon={ShieldCheck}
            label="Financial evidence"
            state={
              summary?.conclusion.state === "ready_for_reconciliation"
                ? "verified"
                : summary
                  ? "partial"
                  : load.phase === "loading"
                    ? "loading"
                    : "unavailable"
            }
            detail={summary?.conclusion.next_action ?? "Financial evidence has not loaded."}
          />
          <EvidenceStateCard
            icon={FileCheck2}
            label="Safety boundary"
            state="partial"
            detail={config.boundary}
          />
        </div>
      </section>

      <section className="ps-v2-card ps-v2-module-card">
        <header>
          <div>
            <h2>Available now</h2>
            <p>PrizeSkout shows only the information it can confirm.</p>
          </div>
        </header>
        <div className="ps-v2-placeholder-table">
          <div>
            <span>Area</span>
            <span>State</span>
            <span>Evidence</span>
            <span>Next safe action</span>
          </div>
          <div>
            <span>Account details</span>
            <span>{context?.state ?? "loading"}</span>
            <span>{context?.currency ?? "Not proven"}</span>
            <span>{context?.blockers[0] ?? "Review account details"}</span>
          </div>
          <div>
            <span>Financial summary</span>
            <span>{summary?.metrics.state ?? load.phase}</span>
            <span>{summary?.scope.days ? `${summary.scope.days} day window` : "Not loaded"}</span>
            <span>{summary?.conclusion.next_action ?? "Add the missing financial records"}</span>
          </div>
          <div>
            <span>Protected actions</span>
            <span>Disabled</span>
            <span>Merchant approval required</span>
            <span>Use the available review and approval steps</span>
          </div>
        </div>
      </section>
    </DashboardV2Shell>
  );
}

export const dashboardV2WorkspaceIds = Object.keys(WORKSPACES) as DashboardV2WorkspaceId[];
