import { useEffect, useState } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Settings,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Activity,
  FileCode2,
  Webhook,
  ShieldCheck,
  Terminal,
  Layers,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/logo-dark.svg";
import { useSidebarCollapse } from "./SidebarCollapseContext";

type NavItem = {
  to: string;
  // label is the English fallback used as translation key lookup
  label: string;
  tKey: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  tKey: string;
  items: NavItem[];
};

const adminGroup: NavGroup = {
  label: "Admin",
  tKey: "nav.groups.admin",
  items: [
    { to: "/admin", label: "Admin Console", tKey: "nav.admin", icon: ShieldCheck },
  ],
};

const navGroups: NavGroup[] = [
  {
    label: "Intelligence",
    tKey: "nav.groups.intelligence",
    items: [
      { to: "/dashboard/pricing", label: "Repricing", tKey: "nav.repricing", icon: TrendingUp },
    ],
  },
  {
    label: "Platform",
    tKey: "nav.groups.developers",
    items: [
      { to: "/dashboard/api-keys",     label: "API Keys",     tKey: "nav.apiKeys",     icon: KeyRound  },
      { to: "/dashboard/api-explorer", label: "API Explorer", tKey: "nav.apiExplorer", icon: Terminal  },
      { to: "/dashboard/webhooks",     label: "Webhooks",     tKey: "nav.webhooks",    icon: Webhook   },
      { to: "/dashboard/usage",        label: "Usage",        tKey: "nav.usage",       icon: Activity  },
      { to: "/dashboard/logs",         label: "Logs",         tKey: "nav.logs",        icon: FileCode2 },
      { to: "/dashboard/console",      label: "Console",      tKey: "nav.console",     icon: Layers    },
    ],
  },
];

const settingsNav: NavItem = {
  to: "/dashboard/settings",
  label: "Settings",
  tKey: "nav.settings",
  icon: Settings,
};

function NavLinkItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const label = t(item.tKey, item.label);
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className="relative flex items-center gap-3 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40 focus-visible:ring-inset"
      style={{
        padding: collapsed ? "10px 0" : "10px 20px",
        justifyContent: collapsed ? "center" : "flex-start",
        color: active ? "#FAFAF9" : "#8A8A8A",
        backgroundColor: active ? "rgba(234, 88, 12, 0.06)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#FAFAF9";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "#8A8A8A";
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-0 h-full"
          style={{ insetInlineStart: 0, width: 3, backgroundColor: "#EA580C" }}
        />
      )}
      <Icon size={18} strokeWidth={1.75} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
  collapsed = false,
  showCollapseToggle = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  showCollapseToggle?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { toggle } = useSidebarCollapse();
  const { data: isAdmin } = useIsAdmin();

  const groups: NavGroup[] = isAdmin ? [adminGroup, ...navGroups] : navGroups;

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname === "/dashboard" : pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      {/* Logo */}
      <div
        className="flex items-center justify-between"
        style={{ padding: collapsed ? "20px 0 0" : "24px 20px 0" }}
      >
        {collapsed ? (
          <Link
            to="/dashboard"
            onClick={onNavigate}
            aria-label={t("sidebar.home")}
            className="mx-auto flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#EA580C",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            P
          </Link>
        ) : (
          <Link to="/dashboard" onClick={onNavigate} aria-label={t("sidebar.home")} className="flex flex-col gap-1">
            <img
              src={logoDark}
              alt="Logo"
              style={{ height: 28, width: "auto", display: "block" }}
            />
            <span style={{ fontSize: 11, fontWeight: 400, color: "#8A8A8A", paddingInlineStart: 2 }}>
              {t("sidebar.commerceIntelligence")}
            </span>
          </Link>
        )}
        {onNavigate && !collapsed && (
          <button
            type="button"
            aria-label={t("sidebar.closeMenu")}
            onClick={onNavigate}
            className="flex items-center justify-center md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40"
            style={{ width: 32, height: 32, borderRadius: 8, color: "#8A8A8A" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Primary nav */}
      <nav aria-label="Primary navigation" className="dark-scroll mt-6 flex flex-col gap-1" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col">
            {!collapsed ? (
              <div
                style={{
                  padding: "10px 20px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#5A5A5A",
                }}
              >
                {t(group.tKey, group.label)}
              </div>
            ) : (
              <div
                aria-hidden
                style={{ margin: "8px 12px 4px", height: 1, backgroundColor: "#1A1A1A" }}
              />
            )}
            {group.items.map((item) => (
              <NavLinkItem
                key={item.to}
                item={item}
                active={isActive(item.to)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div style={{ margin: "0 16px", height: 1, backgroundColor: "#1A1A1A" }} />
      <nav aria-label="Settings navigation" className="py-2">
        <NavLinkItem
          item={settingsNav}
          active={isActive(settingsNav.to)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Collapse toggle (desktop only) */}
      {showCollapseToggle && (
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
          aria-keyshortcuts="Control+B Meta+B"
          title={collapsed ? t("sidebar.expandTitle") : t("sidebar.collapseTitle")}
          className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40"
          style={{
            margin: collapsed ? "4px auto 8px" : "4px 16px 8px",
            padding: collapsed ? 8 : "8px 12px",
            gap: 8,
            justifyContent: collapsed ? "center" : "flex-start",
            width: collapsed ? 32 : "calc(100% - 32px)",
            borderRadius: 8,
            background: "transparent",
            border: "1px solid #1A1A1A",
            color: "#8A8A8A",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "color 0.15s, background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FAFAF9";
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#8A8A8A";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          {!collapsed && <span>{t("sidebar.collapse")}</span>}
        </button>
      )}

      <UserPanel collapsed={collapsed} />
    </>
  );
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "").trim();
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function UserPanel({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";
  const company = (user?.user_metadata?.company as string | undefined) || "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/login" });
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center" style={{ padding: "8px 0 16px", gap: 8 }}>
        <div
          className="flex items-center justify-center"
          title={displayName}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9999,
            backgroundColor: "#EA580C",
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {getInitials(displayName, user?.email)}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label={t("sidebar.signOut")}
          title={t("sidebar.signOut")}
          className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "transparent",
            border: "none",
            color: "#8A8A8A",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FAFAF9";
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#8A8A8A";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 pb-4 pt-2">
      <div
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 9999,
          backgroundColor: "#EA580C",
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {getInitials(displayName, user?.email)}
      </div>
      <div className="flex flex-col leading-tight" style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 13,
            color: "#FAFAF9",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#6B6B6B",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {company || user?.email || ""}
        </span>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label={t("sidebar.signOut")}
        title={t("sidebar.signOut")}
        className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "transparent",
          border: "none",
          color: "#8A8A8A",
          cursor: "pointer",
          flexShrink: 0,
          transition: "color 0.15s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#FAFAF9";
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#8A8A8A";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <LogOut size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function Sidebar() {
  const { collapsed } = useSidebarCollapse();
  return (
    <aside
      className="dark-scroll fixed top-0 hidden h-screen flex-col md:flex"
      style={{
        insetInlineStart: 0,
        width: collapsed ? 64 : 240,
        backgroundColor: "#050505",
        borderInlineEnd: "1px solid #1A1A1A",
        zIndex: 30,
        transition: "width 0.2s ease",
      }}
    >
      <SidebarContent collapsed={collapsed} showCollapseToggle />
    </aside>
  );
}

function useIsRTL() {
  const [rtl, setRtl] = useState(false);
  useEffect(() => {
    setRtl(document.documentElement.dir === "rtl");
    const obs = new MutationObserver(() =>
      setRtl(document.documentElement.dir === "rtl")
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => obs.disconnect();
  }, []);
  return rtl;
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { collapsed } = useSidebarCollapse();
  const isRTL = useIsRTL();

  return (
    <>
      {collapsed && (
        <aside
          className="dark-scroll md:hidden"
          aria-label="Primary navigation"
          style={{
            position: "fixed",
            insetInlineStart: 0,
            top: 0,
            bottom: 0,
            width: 56,
            backgroundColor: "#050505",
            borderInlineEnd: "1px solid #1A1A1A",
            display: "flex",
            flexDirection: "column",
            zIndex: 30,
          }}
        >
          <SidebarContent collapsed showCollapseToggle />
        </aside>
      )}

      <div
        onClick={onClose}
        aria-hidden
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: open && !collapsed ? 1 : 0,
          pointerEvents: open && !collapsed ? "auto" : "none",
          transition: "opacity 0.2s",
          zIndex: 40,
        }}
      />
      <aside
        className="dark-scroll md:hidden"
        aria-hidden={!open || collapsed}
        style={{
          position: "fixed",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 260,
          backgroundColor: "#050505",
          borderInlineEnd: "1px solid #1A1A1A",
          display: "flex",
          flexDirection: "column",
          transform: open && !collapsed ? "translateX(0)" : isRTL ? "translateX(100%)" : "translateX(-100%)",
          transition: "transform 0.25s ease-out",
          zIndex: 50,
        }}
      >
        <SidebarContent onNavigate={onClose} showCollapseToggle />
      </aside>
    </>
  );
}
