import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Layers,
  Package,
  Settings,
  LogOut,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV: NavItem[] = [
  { to: "/margin-dashboard",          label: "Overview",  icon: LayoutDashboard },
  { to: "/margin-dashboard/demo",     label: "Demo",      icon: Sparkles },
  { to: "/margin-dashboard/upload",   label: "Upload",    icon: Upload },
  { to: "/margin-dashboard/channels", label: "Channels",  icon: Layers },
  { to: "/margin-dashboard/items",    label: "Items",     icon: Package },
  { to: "/margin-dashboard/settings", label: "Settings",  icon: Settings },
];

const BRAND_COLOR = "#10B981"; // emerald — distinct from PrizeSkout orange

export function MarginSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { user } = useAuth();

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const isActive = (to: string) =>
    to === "/margin-dashboard"
      ? pathname === "/margin-dashboard" || pathname === "/margin-dashboard/"
      : pathname.startsWith(to);

  const w = collapsed ? 64 : 240;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: w,
          backgroundColor: "#0F1A15",
          display: "flex",
          flexDirection: "column",
          zIndex: 40,
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? "20px 0" : "20px 16px",
            borderBottom: "1px solid #1A2D22",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {!collapsed && (
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#FAFAF9",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                PrizeSkout
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: BRAND_COLOR,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginTop: 1,
                }}
              >
                Margin
              </div>
            </div>
          )}
          {collapsed && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: BRAND_COLOR,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                color: "#0F1A15",
                flexShrink: 0,
              }}
            >
              M
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4A7A5A",
                display: "flex",
                padding: 4,
                borderRadius: 6,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FAFAF9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#4A7A5A"; }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              style={{
                position: "absolute",
                bottom: 72,
                left: 0,
                right: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4A7A5A",
                display: "flex",
                justifyContent: "center",
                padding: "8px 0",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FAFAF9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#4A7A5A"; }}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {NAV.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "9px 0" : "9px 10px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#FAFAF9" : "#6A9A7A",
                  backgroundColor: active ? `${BRAND_COLOR}22` : "transparent",
                  transition: "background-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "#1A2D22";
                    e.currentTarget.style.color = "#FAFAF9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#6A9A7A";
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={16}
                  strokeWidth={2}
                  color={active ? BRAND_COLOR : "currentColor"}
                  style={{ flexShrink: 0 }}
                />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "10px 8px",
            borderTop: "1px solid #1A2D22",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flexShrink: 0,
          }}
        >
          {/* Switch product */}
          <Link
            to="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px 0" : "8px 10px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 500,
              color: "#4A7A5A",
              transition: "color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FAFAF9";
              e.currentTarget.style.backgroundColor = "#1A2D22";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#4A7A5A";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title={collapsed ? "Switch to PrizeSkout Intelligence" : undefined}
          >
            <ArrowLeftRight size={14} style={{ flexShrink: 0 }} />
            {!collapsed && "Switch to Intelligence"}
          </Link>

          {/* User + sign out */}
          {!collapsed && user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#4A7A5A",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {user.email}
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                title="Sign out"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#4A7A5A",
                  display: "flex",
                  padding: 4,
                  borderRadius: 4,
                  flexShrink: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#4A7A5A"; }}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              title="Sign out"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4A7A5A",
                display: "flex",
                justifyContent: "center",
                padding: "8px 0",
                width: "100%",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#4A7A5A"; }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Sidebar spacer */}
      <div style={{ width: w, flexShrink: 0, transition: "width 0.2s ease" }} />
    </>
  );
}
