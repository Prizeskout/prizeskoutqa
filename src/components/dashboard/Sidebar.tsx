import { Link, useRouterState } from "@tanstack/react-router";
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
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const primaryNav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/competitors", label: "Competitors", icon: Crosshair },
  { to: "/dashboard/pricing", label: "Pricing", icon: TrendingUp },
  { to: "/dashboard/market", label: "Market", icon: BarChart3 },
  { to: "/dashboard/promotions", label: "Promotions", icon: Megaphone },
  { to: "/dashboard/benchmarks", label: "Benchmarks", icon: Target },
  { to: "/dashboard/field-intel", label: "Field Intel", icon: MapPin },
];

const settingsNav: NavItem = {
  to: "/dashboard/settings",
  label: "Settings",
  icon: Settings,
};

function NavLinkItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className="relative flex items-center gap-3 px-5 py-2.5 text-[14px] font-medium transition-colors"
      style={{
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
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname === "/dashboard" : pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: "#EA580C",
            }}
          />
          <div className="flex flex-col leading-tight">
            <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>PrizeSkout</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "#8A8A8A" }}>
              Commerce Intelligence
            </span>
          </div>
        </div>
        {onNavigate && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onNavigate}
            className="flex items-center justify-center md:hidden"
            style={{ width: 32, height: 32, borderRadius: 8, color: "#8A8A8A" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Primary nav */}
      <nav aria-label="Primary" className="mt-8 flex flex-col">
        {primaryNav.map((item) => (
          <NavLinkItem
            key={item.to}
            item={item}
            active={isActive(item.to)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider + Settings */}
      <div style={{ margin: "0 16px", height: 1, backgroundColor: "#1A1A1A" }} />
      <nav aria-label="Settings" className="py-2">
        <NavLinkItem
          item={settingsNav}
          active={isActive(settingsNav.to)}
          onNavigate={onNavigate}
        />
      </nav>

      {/* User */}
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
          }}
        >
          SM
        </div>
        <div className="flex flex-col leading-tight">
          <span style={{ fontSize: 13, color: "#8A8A8A" }}>Snoonu Qatar</span>
          <span style={{ fontSize: 11, color: "#6B6B6B" }}>Category Manager</span>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside
      className="dark-scroll fixed left-0 top-0 hidden h-screen flex-col md:flex"
      style={{
        width: 240,
        backgroundColor: "#050505",
        borderRight: "1px solid #1A1A1A",
        zIndex: 30,
      }}
    >
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        aria-hidden
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s",
          zIndex: 40,
        }}
      />
      {/* Drawer */}
      <aside
        className="dark-scroll md:hidden"
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
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease-out",
          zIndex: 50,
        }}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}
