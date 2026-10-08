import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BadgePercent,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  FileCheck2,
  History,
  LayoutDashboard,
  Menu,
  PackageCheck,
  PlugZap,
  ReceiptText,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Building2,
  Code2,
  ListChecks,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/prizeskout-dashboard-logo.png";
import { useDashboardV2Context } from "./useDashboardV2Context";
import { setDashboardV2Period, useDashboardV2Period } from "./useDashboardV2Period";
import "./dashboard-v2.css";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  to?: string;
  href?: string;
  badge?: string;
};

const NAV_GROUPS: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
      { label: "Priority Centre", icon: CircleAlert, to: "/dashboard/priority-centre", badge: "0" },
      { label: "AI Copilot", icon: Bot, to: "/dashboard/ai-copilot", badge: "⌘K" },
      { label: "AI Store Manager", icon: Sparkles, to: "/dashboard/store-manager" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "Profit intelligence",
        icon: ChartNoAxesCombined,
        to: "/dashboard/profit-intelligence",
      },
      { label: "Margin leakage", icon: ShieldCheck, href: "/dashboard#margin-leakage" },
      { label: "Menu intelligence", icon: PackageCheck, to: "/dashboard/menu-intelligence" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Order Automation", icon: Store, to: "/dashboard/order-automation" },
      { label: "Orders", icon: ListChecks, to: "/dashboard/orders" },
      { label: "Branches", icon: Building2, href: "/dashboard#branch-performance" },
    ],
  },
  {
    label: "Commercial",
    items: [
      { label: "Promotions & Discounts", icon: BadgePercent, to: "/dashboard/promotions" },
      { label: "Channels", icon: Sparkles, to: "/dashboard/channels" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Settlements", icon: ReceiptText, to: "/dashboard/settlements" },
      { label: "Reports", icon: FileCheck2, to: "/dashboard/reports" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Integrations", icon: PlugZap, to: "/dashboard/integrations" },
      { label: "API / Developers", icon: Code2, to: "/dashboard/api-developers" },
    ],
  },
];

export type DashboardV2Page =
  | "overview"
  | "priority"
  | "automation"
  | "orders"
  | "promotions"
  | "ai-copilot"
  | "store-manager"
  | "profit-intelligence"
  | "menu-intelligence"
  | "channels"
  | "settlements"
  | "reports"
  | "integrations"
  | "api-developers"
  | "settings"
  | "store-access"
  | "audit-log";

export type DashboardV2ChromeData = {
  confidenceLabel: string;
  confidenceDetail: string;
  confidenceMissing?: string;
  priorityItems: Array<{
    id: string;
    title: string;
    detail: string;
    amount?: string | null;
    state: string;
  }>;
};

const PAGE_PATHS: Record<DashboardV2Page, string> = {
  overview: "/dashboard",
  priority: "/dashboard/priority-centre",
  automation: "/dashboard/order-automation",
  orders: "/dashboard/orders",
  promotions: "/dashboard/promotions",
  "ai-copilot": "/dashboard/ai-copilot",
  "store-manager": "/dashboard/store-manager",
  "profit-intelligence": "/dashboard/profit-intelligence",
  "menu-intelligence": "/dashboard/menu-intelligence",
  channels: "/dashboard/channels",
  settlements: "/dashboard/settlements",
  reports: "/dashboard/reports",
  integrations: "/dashboard/integrations",
  "api-developers": "/dashboard/api-developers",
  settings: "/dashboard/settings",
  "store-access": "/dashboard/store-access",
  "audit-log": "/dashboard/audit-log",
};

function Sidebar({
  open,
  onClose,
  activePage,
  roleLabel,
  functionalRole,
}: {
  open: boolean;
  onClose: () => void;
  activePage: DashboardV2Page;
  roleLabel: string;
  functionalRole?: string | null;
}) {
  const { user } = useAuth();
  const name =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "PrizeSkout merchant";
  const preferredGroup =
    functionalRole === "finance" || functionalRole === "accounting"
      ? "Finance"
      : functionalRole === "operations"
        ? "Operations"
        : null;
  const navGroups = preferredGroup
    ? [
        NAV_GROUPS[0],
        ...NAV_GROUPS.slice(1).sort(
          (a, b) => Number(b.label === preferredGroup) - Number(a.label === preferredGroup),
        ),
      ]
    : NAV_GROUPS;

  return (
    <>
      <button
        className="ps-v2-scrim"
        data-open={open}
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside className="ps-v2-sidebar" data-open={open} aria-label="Dashboard navigation">
        <div className="ps-v2-logo-row">
          <img src={logo} alt="PrizeSkout" />
          <button
            type="button"
            className="ps-v2-icon-button ps-v2-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="ps-v2-nav">
          {navGroups.map((group, groupIndex) => (
            <section key={group.label ?? `primary-${groupIndex}`}>
              {group.label && <h2>{group.label}</h2>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.to === PAGE_PATHS[activePage];
                return item.to ? (
                  <a
                    key={item.label}
                    href={item.to}
                    className="ps-v2-nav-item"
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.badge && <small>{item.badge}</small>}
                  </a>
                ) : (
                  <a key={item.label} href={item.href} className="ps-v2-nav-item" onClick={onClose}>
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.badge && <small>{item.badge}</small>}
                  </a>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="ps-v2-sidebar-footer">
          <a
            className="ps-v2-nav-item"
            data-active={activePage === "settings"}
            aria-current={activePage === "settings" ? "page" : undefined}
            href="/dashboard/settings"
          >
            <Settings size={16} aria-hidden="true" />
            <span>Settings</span>
          </a>
          <a
            className="ps-v2-nav-item"
            data-active={activePage === "store-access"}
            aria-current={activePage === "store-access" ? "page" : undefined}
            href="/dashboard/store-access"
          >
            <Users size={16} aria-hidden="true" />
            <span>Store Access</span>
          </a>
          <a
            className="ps-v2-nav-item"
            data-active={activePage === "audit-log"}
            aria-current={activePage === "audit-log" ? "page" : undefined}
            href="/dashboard/audit-log"
          >
            <History size={16} aria-hidden="true" />
            <span>Audit Log</span>
          </a>
          <div className="ps-v2-user">
            <span className="ps-v2-avatar" aria-hidden="true">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{name}</strong>
              <small>{roleLabel}</small>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

export function DashboardV2Shell({
  children,
  activePage = "overview",
  chromeData,
}: {
  children: ReactNode;
  activePage?: DashboardV2Page;
  chromeData?: DashboardV2ChromeData;
}) {
  const context = useDashboardV2Context();
  const period = useDashboardV2Period();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setConfidenceOpen(false);
        setPriorityOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="ps-v2-root">
      <a className="ps-v2-skip" href="#dashboard-v2-content">
        Skip to dashboard content
      </a>
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activePage={activePage}
        roleLabel={context?.role_label ?? "Merchant operator"}
        functionalRole={context?.functional_role}
      />
      <div className="ps-v2-workspace">
        <header className="ps-v2-topbar">
          <button
            type="button"
            className="ps-v2-icon-button ps-v2-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div className="ps-v2-scope" aria-label="Current financial scope">
            <button type="button" disabled>
              {context?.merchant_label ?? "Merchant account"} <ChevronDown size={12} />
            </button>
            <button type="button" disabled>
              {context?.brand_label ?? "Brand scope loading"} <ChevronDown size={12} />
            </button>
            <button type="button" disabled>
              {context?.location_label ?? "Location scope loading"} <ChevronDown size={12} />
            </button>
            <button type="button" disabled>
              {context?.channel_label ?? "Channel scope loading"} <ChevronDown size={12} />
            </button>
          </div>
          <div className="ps-v2-topbar-spacer" />
          <span className="ps-v2-role-context" title={context?.role_description}>
            {context?.role_label ?? "Merchant operator"}
          </span>
          <div className="ps-v2-period" aria-label="Reporting period">
            <button
              type="button"
              className={period === 7 ? "active" : undefined}
              aria-pressed={period === 7}
              onClick={() => setDashboardV2Period(7)}
            >
              7D
            </button>
            <button
              type="button"
              className={period === 30 ? "active" : undefined}
              aria-pressed={period === 30}
              onClick={() => setDashboardV2Period(30)}
            >
              30D
            </button>
            <button
              type="button"
              className={period === "qtd" ? "active" : undefined}
              aria-pressed={period === "qtd"}
              onClick={() => setDashboardV2Period("qtd")}
            >
              QTD
            </button>
            <button
              type="button"
              className={period === "ytd" ? "active" : undefined}
              aria-pressed={period === "ytd"}
              onClick={() => setDashboardV2Period("ytd")}
            >
              YTD
            </button>
          </div>
          <span className="ps-v2-currency">{context?.currency ?? "—"}</span>
          <div className="ps-v2-confidence-wrap">
            <button
              type="button"
              className="ps-v2-confidence"
              aria-expanded={confidenceOpen}
              onClick={() => setConfidenceOpen((open) => !open)}
            >
              <span /> <em>Confidence</em> <b>{chromeData?.confidenceLabel ?? "—"}</b>
            </button>
            {confidenceOpen && (
              <section className="ps-v2-confidence-popover" aria-label="Evidence confidence">
                <div>
                  <strong>Data confidence</strong>
                  <button
                    type="button"
                    onClick={() => setConfidenceOpen(false)}
                    aria-label="Close confidence details"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="ps-v2-confidence-meter">
                  <i style={{ width: chromeData ? chromeData.confidenceLabel : "0%" }} />
                </div>
                <p>
                  {chromeData?.confidenceDetail ??
                    "Confidence will appear when your financial records finish loading."}
                </p>
                {chromeData?.confidenceMissing && (
                  <small>
                    <strong>Still needed:</strong> {chromeData.confidenceMissing}
                  </small>
                )}
              </section>
            )}
          </div>
          <button
            type="button"
            className="ps-v2-priority-link"
            aria-expanded={priorityOpen}
            onClick={() => setPriorityOpen(true)}
          >
            Priority <b>{chromeData?.priorityItems.length ?? 0}</b>
          </button>
        </header>
        <main id="dashboard-v2-content" tabIndex={-1} className="ps-v2-main">
          {context?.demo_mode && (
            <div className="ps-v2-demo-banner" role="status">
              <strong>Demo data</strong>
              <span>{context.demo_label ?? "Controlled demonstration data - not live financial evidence"}</span>
            </div>
          )}
          {children}
        </main>
      </div>
      {priorityOpen && (
        <>
          <button
            type="button"
            className="ps-v2-drawer-scrim"
            aria-label="Close Priority Centre"
            onClick={() => setPriorityOpen(false)}
          />
          <aside
            className="ps-v2-priority-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-v2-priority-drawer-title"
          >
            <header>
              <div>
                <strong id="ps-v2-priority-drawer-title">Priority Centre</strong>
                <span>
                  {chromeData?.priorityItems.length
                    ? `${chromeData.priorityItems.length} decisions need your review`
                    : "Nothing needs your review"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPriorityOpen(false)}
                aria-label="Close Priority Centre"
              >
                <X size={16} />
              </button>
            </header>
            <div className="ps-v2-priority-drawer-list">
              {chromeData?.priorityItems.length ? (
                chromeData.priorityItems.map((item, index) => (
                  <article key={item.id}>
                    <i />
                    <div>
                      <small>
                        {String(index + 1).padStart(2, "0")} · {item.state.replaceAll("_", " ")}
                      </small>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <footer>
                        <span>{item.id}</span>
                        {item.amount && <b>{item.amount}</b>}
                      </footer>
                    </div>
                  </article>
                ))
              ) : (
                <p className="ps-v2-drawer-empty">
                  No issues need a priority decision right now.
                </p>
              )}
            </div>
            <Link
              to="/dashboard/priority-centre"
              className="ps-v2-drawer-full-link"
              onClick={() => setPriorityOpen(false)}
            >
              Open full Priority Centre →
            </Link>
          </aside>
        </>
      )}
    </div>
  );
}

export function EvidenceStateCard({
  icon: Icon,
  label,
  detail,
  state,
  meta,
}: {
  icon: typeof FileCheck2;
  label: string;
  detail: string;
  state: "loading" | "verified" | "partial" | "stale" | "missing" | "unavailable";
  meta?: string;
}) {
  const stateLabel: Record<typeof state, string> = {
    loading: "Loading",
    verified: "Verified",
    partial: "Partial",
    stale: "Stale",
    missing: "Missing",
    unavailable: "Unavailable",
  };
  return (
    <article className="ps-v2-evidence-card" data-state={state}>
      <span className="ps-v2-evidence-icon">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
        {meta && <small className="ps-v2-evidence-meta">{meta}</small>}
      </div>
      <span className="ps-v2-state">{stateLabel[state]}</span>
    </article>
  );
}
