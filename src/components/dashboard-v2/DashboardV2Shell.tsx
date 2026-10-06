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
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/logo-light.svg";
import "./dashboard-v2.css";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  state: "planned" | "available";
  to?: "/dashboard/v2" | "/dashboard/v2/priority-centre";
};

const NAV_GROUPS: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { label: "Executive overview", icon: LayoutDashboard, state: "available", to: "/dashboard/v2" },
      { label: "Priority centre", icon: CircleAlert, state: "available", to: "/dashboard/v2/priority-centre" },
      { label: "AI Copilot", icon: Bot, state: "available" },
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
      { label: "Order automation", icon: Store, state: "planned" },
      { label: "Promotions & discounts", icon: BadgePercent, state: "planned" },
      { label: "Settlements", icon: ReceiptText, state: "planned" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Integrations", icon: PlugZap, state: "available" },
      { label: "Evidence & audit", icon: History, state: "available" },
      { label: "Settings", icon: Settings, state: "available" },
    ],
  },
];

function Sidebar({ open, onClose, activePage }: { open: boolean; onClose: () => void; activePage: "overview" | "priority" }) {
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
                const active = item.to === (activePage === "overview" ? "/dashboard/v2" : "/dashboard/v2/priority-centre");
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
                  </Link>
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
                    {item.state === "planned" && <small>Next</small>}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="ps-v2-user">
          <span className="ps-v2-avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{name}</strong>
            <small>Dashboard V2 preview</small>
          </span>
        </div>
      </aside>
    </>
  );
}

export function DashboardV2Shell({ children, activePage = "overview" }: { children: ReactNode; activePage?: "overview" | "priority" }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="ps-v2-root">
      <a className="ps-v2-skip" href="#dashboard-v2-content">Skip to dashboard content</a>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} activePage={activePage} />
      <div className="ps-v2-workspace">
        <header className="ps-v2-topbar">
          <button type="button" className="ps-v2-icon-button ps-v2-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={19} />
          </button>
          <button type="button" className="ps-v2-scope" disabled title="Scope wiring is intentionally disabled in the shell slice">
            <span>All connected commerce</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <div className="ps-v2-topbar-spacer" />
          <span className="ps-v2-preview-badge">Internal preview</span>
          <Link className="ps-v2-secondary-link" to="/dashboard/revenue-hub">Current dashboard</Link>
        </header>
        <main id="dashboard-v2-content" tabIndex={-1} className="ps-v2-main">
          {children}
        </main>
      </div>
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
