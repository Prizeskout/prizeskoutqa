import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Crosshair,
  TrendingUp,
  BarChart3,
  Megaphone,
  Target,
  MapPin,
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
  type LucideIcon,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/logo-dark.svg";
import { useSidebarCollapse } from "./SidebarCollapseContext";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Developers",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { to: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
      { to: "/dashboard/usage", label: "Usage", icon: Activity },
      { to: "/dashboard/logs", label: "Logs", icon: FileCode2 },
      { to: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/dashboard/competitors", label: "Competitors", icon: Crosshair },
      { to: "/dashboard/field-intel", label: "Field Intel", icon: MapPin },
      { to: "/dashboard/pricing", label: "Pricing", icon: TrendingUp },
      { to: "/dashboard/promotions", label: "Promotions", icon: Megaphone },
      { to: "/dashboard/market", label: "Market", icon: BarChart3 },
      { to: "/dashboard/benchmarks", label: "Benchmarks", icon: Target },
    ],
  },
];

const settingsNav: NavItem = {
  to: "/dashboard/settings",
  label: "Settings",
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
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
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
          className="absolute left-0 top-0 h-full"
          style={{ width: 3, backgroundColor: "#EA580C" }}
        />
      )}
      <Icon size={18} strokeWidth={1.75} />
      {!collapsed && <span>{item.label}</span>}
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { toggle } = useSidebarCollapse();

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
            aria-label="PrizeSkout home"
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
          <Link to="/dashboard" onClick={onNavigate} aria-label="PrizeSkout home" className="flex flex-col gap-1">
            <img
              src={logoDark}
              alt="PrizeSkout"
              style={{ height: 28, width: "auto", display: "block" }}
            />
            <span style={{ fontSize: 11, fontWeight: 400, color: "#8A8A8A", paddingLeft: 2 }}>
              Commerce Intelligence
            </span>
          </Link>
        )}
        {onNavigate && !collapsed && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onNavigate}
            className="flex items-center justify-center md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/40"
            style={{ width: 32, height: 32, borderRadius: 8, color: "#8A8A8A" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Primary nav grouped by intent */}
      <nav aria-label="Primary navigation" className="mt-6 flex flex-col gap-1">
        {navGroups.map((group) => (
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
                {group.label}
              </div>
            ) : (
              <div
                aria-hidden
                style={{
                  margin: "8px 12px 4px",
                  height: 1,
                  backgroundColor: "#1A1A1A",
                }}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider + Settings */}
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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-keyshortcuts="Control+B Meta+B"
          title={`${collapsed ? "Expand sidebar" : "Collapse sidebar"} (⌘/Ctrl+B)`}
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
          {!collapsed && <span>Collapse</span>}
        </button>
      )}

      {/* User */}
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
      <div
        className="flex flex-col items-center"
        style={{ padding: "8px 0 16px", gap: 8 }}
      >
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
          aria-label="Sign out"
          title="Sign out"
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
        aria-label="Sign out"
        title="Sign out"
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
      className="dark-scroll fixed left-0 top-0 hidden h-screen flex-col md:flex"
      style={{
        width: collapsed ? 64 : 240,
        backgroundColor: "#050505",
        borderRight: "1px solid #1A1A1A",
        zIndex: 30,
        transition: "width 0.2s ease",
      }}
    >
      <SidebarContent collapsed={collapsed} showCollapseToggle />
    </aside>
  );
}

/**
 * Mobile sidebar.
 *
 * Two modes, both controlled by the same `collapsed` setting that drives
 * desktop:
 *   - collapsed=true  → a thin always-visible icon rail (56px) on the left
 *   - collapsed=false → an off-canvas drawer that opens when the user taps
 *     the hamburger in TopBar. Tapping a nav item or the overlay closes it.
 *
 * The rail itself exposes the collapse toggle so users can switch between
 * the two modes on small screens too. The setting is persisted in
 * localStorage by SidebarCollapseProvider.
 */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { collapsed } = useSidebarCollapse();

  return (
    <>
      {/* Always-on icon rail when collapsed (mobile only) */}
      {collapsed && (
        <aside
          className="dark-scroll md:hidden"
          aria-label="Primary navigation"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            width: 56,
            backgroundColor: "#050505",
            borderRight: "1px solid #1A1A1A",
            display: "flex",
            flexDirection: "column",
            zIndex: 30,
          }}
        >
          <SidebarContent collapsed showCollapseToggle />
        </aside>
      )}

      {/* Off-canvas overlay drawer (only meaningful when expanded) */}
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
          left: 0,
          top: 0,
          bottom: 0,
          width: 260,
          backgroundColor: "#050505",
          borderRight: "1px solid #1A1A1A",
          display: "flex",
          flexDirection: "column",
          transform: open && !collapsed ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease-out",
          zIndex: 50,
        }}
      >
        <SidebarContent onNavigate={onClose} showCollapseToggle />
      </aside>
    </>
  );
}

