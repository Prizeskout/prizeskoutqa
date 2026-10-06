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
import "./dashboard-v2.css";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  state: "planned" | "available";
  to?: "/dashboard/v2" | "/dashboard/v2/priority-centre" | "/dashboard/v2/order-automation" | "/dashboard/v2/promotions";
  legacyHref?: string;
  badge?: string;
};

const NAV_GROUPS: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { label: "Overview", icon: LayoutDashboard, state: "available", to: "/dashboard/v2" },
      { label: "Priority Centre", icon: CircleAlert, state: "available", to: "/dashboard/v2/priority-centre", badge: "0" },
      { label: "AI Copilot", icon: Bot, state: "planned", badge: "⌘K" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Profit intelligence", icon: ChartNoAxesCombined, state: "planned" },
      { label: "Margin leakage", icon: ShieldCheck, state: "planned" },
      { label: "Menu intelligence", icon: PackageCheck, state: "planned" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Order Automation", icon: Store, state: "available", to: "/dashboard/v2/order-automation" },
      { label: "Orders", icon: ListChecks, state: "planned" },
      { label: "Branches", icon: Building2, state: "planned" },
    ],
  },
  {
    label: "Commercial",
    items: [
      { label: "Promotions & Discounts", icon: BadgePercent, state: "available", to: "/dashboard/v2/promotions" },
      { label: "Channels", icon: Sparkles, state: "planned" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Settlements", icon: ReceiptText, state: "planned" },
      { label: "Reports", icon: FileCheck2, state: "planned" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Integrations", icon: PlugZap, state: "available", legacyHref: "/dashboard/revenue-hub?workspace=settings" },
      { label: "API / Developers", icon: Code2, state: "planned" },
    ],
  },
];

type DashboardV2Page = "overview" | "priority" | "automation" | "promotions";

export type DashboardV2ChromeData = {
  confidenceLabel: string;
  confidenceDetail: string;
  confidenceMissing?: string;
  priorityItems: Array<{ id: string; title: string; detail: string; amount?: string | null; state: string }>;
};

const PAGE_PATHS: Record<DashboardV2Page, NonNullable<NavItem["to"]>> = {
  overview: "/dashboard/v2",
  priority: "/dashboard/v2/priority-centre",
  automation: "/dashboard/v2/order-automation",
  promotions: "/dashboard/v2/promotions",
};

function Sidebar({ open, onClose, activePage }: { open: boolean; onClose: () => void; activePage: DashboardV2Page }) {
  const { user } = useAuth();
  const name =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "PrizeSkout merchant";

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
          <button type="button" className="ps-v2-icon-button ps-v2-sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>
        <nav className="ps-v2-nav">
          {NAV_GROUPS.map((group, groupIndex) => (
            <section key={group.label ?? `primary-${groupIndex}`}>
              {group.label && <h2>{group.label}</h2>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.to === PAGE_PATHS[activePage];
                return item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="ps-v2-nav-item"
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.badge && <small>{item.badge}</small>}
                  </Link>
                ) : item.legacyHref ? (
                  <a key={item.label} href={item.legacyHref} className="ps-v2-nav-item" onClick={onClose}>
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    className="ps-v2-nav-item"
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    disabled={!active}
                    title={!active ? "This module will be wired in a later protected slice" : undefined}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.badge && <small>{item.badge}</small>}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="ps-v2-sidebar-footer">
          <a className="ps-v2-nav-item" href="/dashboard/revenue-hub?workspace=settings"><Settings size={16} /><span>Settings</span></a>
          <button type="button" className="ps-v2-nav-item" disabled><Users size={16} /><span>Team & Permissions</span></button>
          <a className="ps-v2-nav-item" href="/dashboard/revenue-hub?workspace=vault"><History size={16} /><span>Audit Log</span></a>
        <div className="ps-v2-user">
          <span className="ps-v2-avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{name}</strong>
            <small>Merchant operator</small>
          </span>
        </div>
        </div>
      </aside>
    </>
  );
}

export function DashboardV2Shell({ children, activePage = "overview", chromeData }: { children: ReactNode; activePage?: DashboardV2Page; chromeData?: DashboardV2ChromeData }) {
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
      <a className="ps-v2-skip" href="#dashboard-v2-content">Skip to dashboard content</a>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} activePage={activePage} />
      <div className="ps-v2-workspace">
        <header className="ps-v2-topbar">
          <button type="button" className="ps-v2-icon-button ps-v2-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={19} />
          </button>
          <div className="ps-v2-scope" aria-label="Current financial scope">
            <button type="button" disabled>Group <ChevronDown size={12} /></button>
            <button type="button" disabled>All brands <ChevronDown size={12} /></button>
            <button type="button" disabled>Qatar · all branches <ChevronDown size={12} /></button>
            <button type="button" disabled>All channels <ChevronDown size={12} /></button>
          </div>
          <div className="ps-v2-topbar-spacer" />
          <div className="ps-v2-period" aria-label="Reporting period"><button disabled>7D</button><button disabled className="active">30D</button><button disabled>QTD</button><button disabled>YTD</button></div>
          <span className="ps-v2-currency">QAR</span>
          <div className="ps-v2-confidence-wrap">
            <button type="button" className="ps-v2-confidence" aria-expanded={confidenceOpen} onClick={() => setConfidenceOpen((open) => !open)}><span /> <em>Confidence</em> <b>{chromeData?.confidenceLabel ?? "—"}</b></button>
            {confidenceOpen && <section className="ps-v2-confidence-popover" aria-label="Evidence confidence"><div><strong>Evidence confidence</strong><button type="button" onClick={() => setConfidenceOpen(false)} aria-label="Close confidence details"><X size={14} /></button></div><div className="ps-v2-confidence-meter"><i style={{ width: chromeData ? chromeData.confidenceLabel : "0%" }} /></div><p>{chromeData?.confidenceDetail ?? "Confidence is unavailable until retained evidence is loaded."}</p>{chromeData?.confidenceMissing && <small><strong>Missing:</strong> {chromeData.confidenceMissing}</small>}</section>}
          </div>
          <button type="button" className="ps-v2-priority-link" aria-expanded={priorityOpen} onClick={() => setPriorityOpen(true)}>Priority <b>{chromeData?.priorityItems.length ?? 0}</b></button>
        </header>
        <main id="dashboard-v2-content" tabIndex={-1} className="ps-v2-main">
          {children}
        </main>
      </div>
      {priorityOpen && <><button type="button" className="ps-v2-drawer-scrim" aria-label="Close Priority Centre" onClick={() => setPriorityOpen(false)} /><aside className="ps-v2-priority-drawer" role="dialog" aria-modal="true" aria-labelledby="ps-v2-priority-drawer-title"><header><div><strong id="ps-v2-priority-drawer-title">Priority Centre</strong><span>{chromeData?.priorityItems.length ? `${chromeData.priorityItems.length} evidence-backed decisions need review` : "No evidence-backed decision is waiting"}</span></div><button type="button" onClick={() => setPriorityOpen(false)} aria-label="Close Priority Centre"><X size={16} /></button></header><div className="ps-v2-priority-drawer-list">{chromeData?.priorityItems.length ? chromeData.priorityItems.map((item, index) => <article key={item.id}><i /><div><small>{String(index + 1).padStart(2, "0")} · {item.state.replaceAll("_", " ")}</small><strong>{item.title}</strong><p>{item.detail}</p><footer><span>{item.id}</span>{item.amount && <b>{item.amount}</b>}</footer></div></article>) : <p className="ps-v2-drawer-empty">No retained finding currently supports a priority decision.</p>}</div><Link to="/dashboard/v2/priority-centre" className="ps-v2-drawer-full-link" onClick={() => setPriorityOpen(false)}>Open full Priority Centre →</Link></aside></>}
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
      <span className="ps-v2-evidence-icon"><Icon size={17} aria-hidden="true" /></span>
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
        {meta && <small className="ps-v2-evidence-meta">{meta}</small>}
      </div>
      <span className="ps-v2-state">{stateLabel[state]}</span>
    </article>
  );
}
