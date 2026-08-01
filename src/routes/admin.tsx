import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { adminGlobalSearch, type AdminSearchResult } from "@/server/admin-console.functions";
import {
  LayoutGrid,
  ClipboardList,
  Activity,
  Users,
  ShieldCheck,
  Wifi,
  KeyRound,
  Search,
  RefreshCcw,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Console | PrizeSkout" }] }),
  component: AdminShell,
});

type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  badge?: boolean;
};

const MONITOR_NAV: AdminNavItem[] = [
  { to: "/admin",        label: "Overview",      icon: LayoutGrid,    exact: true  },
  { to: "/admin/audit",  label: "Audit Log",     icon: ClipboardList, exact: false },
  { to: "/admin/system", label: "System Health", icon: Activity,      exact: false },
];

const MANAGE_NAV: AdminNavItem[] = [
  { to: "/admin/merchants",   label: "Merchants",    icon: Users,       exact: false },
  { to: "/admin/live-access", label: "Live Access",  icon: ShieldCheck, exact: false, badge: true },
  { to: "/admin/channels",    label: "Channels",     icon: Wifi,        exact: false },
  { to: "/admin/codes",       label: "Access Codes", icon: KeyRound,    exact: false },
];

const PAGE_LABELS: Record<string, string> = {
  "/admin":             "Overview",
  "/admin/":            "Overview",
  "/admin/audit":       "Audit Log",
  "/admin/system":      "System Health",
  "/admin/merchants":   "Merchants",
  "/admin/live-access": "Live Access",
  "/admin/channels":    "Channels",
  "/admin/codes":       "Access Codes",
};

function AdminShell() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [pending, setPending] = useState(0);
  const searchFn = useServerFn(adminGlobalSearch);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchBusy, setSearchBusy]       = useState(false);

  useEffect(() => {
    supabase
      .from("licensee_applications")
      .select("*", { count: "exact", head: true })
      .eq("live_status", "pending")
      .then(({ count }) => setPending(count ?? 0));
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setSearchBusy(false); return; }
    setSearchBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await (searchFn as any)({ data: { query: q } });
        setSearchResults(res.results as AdminSearchResult[]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, searchFn]);

  const goToResult = (r: AdminSearchResult) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate({ to: r.to });
  };

  const isActive = (to: string, exact: boolean) =>
    exact
      ? pathname === to || pathname === to + "/"
      : pathname === to || pathname.startsWith(to + "/");

  const title = PAGE_LABELS[pathname] ?? "Admin Console";
  const initials = (user?.email ?? "PS").slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#FAFAF9" }}>
        <div style={{ color: "#8A8A8A", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#FAFAF9" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            backgroundColor: "#FEE2E2",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
          }}>
            <ShieldCheck size={24} color="#DC2626" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A18" }}>Access denied</div>
          <div style={{ fontSize: 13, color: "#6B6B6B", marginTop: 8 }}>
            Admin role required. Contact a PrizeSkout super-admin.
          </div>
          <Link
            to="/api-reference"
            style={{
              display: "inline-block", marginTop: 22,
              padding: "9px 22px", backgroundColor: "#EA580C",
              color: "#fff", borderRadius: 9, textDecoration: "none",
              fontSize: 13, fontWeight: 600,
            }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#F3F2EF",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 228,
        flexShrink: 0,
        backgroundColor: "#FAFAF9",
        borderRight: "1px solid #E5E2DB",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              backgroundColor: "#EA580C",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>P</span>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1A1A18", lineHeight: 1.15 }}>PrizeSkout</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9A9A9A", marginTop: 2 }}>
                Admin Console
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "#E5E2DB" }} />

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 0 10px" }}>
          <NavGroup label="Monitor" items={MONITOR_NAV} isActive={isActive} />
          <NavGroup label="Manage"  items={MANAGE_NAV}  isActive={isActive} pendingCount={pending} />
        </nav>

        <div style={{ height: 1, backgroundColor: "#E5E2DB" }} />

        {/* User panel */}
        <div style={{ padding: "11px 14px 14px", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            backgroundColor: "#EA580C", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>Admin</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9A9A" }}>
              Super_Admin
            </div>
          </div>
          <button
            type="button"
            title="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9A9A9A", padding: 4, borderRadius: 6, display: "flex",
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <header style={{
          height: 54,
          backgroundColor: "#fff",
          borderBottom: "1px solid #E5E2DB",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 24px",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A18" }}>{title}</span>
          <div style={{ flex: 1 }} />

          <div style={{ position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              border: "1px solid #E5E2DB", borderRadius: 8,
              padding: "6px 12px", backgroundColor: "#FAFAF9",
            }}>
              <Search size={13} color="#9A9A9A" />
              <input
                type="search"
                placeholder="Search merchants, codes…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                style={{
                  border: "none", outline: "none", fontSize: 13,
                  color: "#1A1A18", backgroundColor: "transparent", width: 200,
                }}
              />
            </div>
            {searchOpen && searchQuery.trim() && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, width: 320,
                backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 50,
              }}>
                {searchBusy ? (
                  <div style={{ padding: "14px 16px", fontSize: 12.5, color: "#8A8A8A" }}>Searching…</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: "14px 16px", fontSize: 12.5, color: "#8A8A8A" }}>No matches for "{searchQuery}".</div>
                ) : (
                  searchResults.map((r, i) => (
                    <button
                      key={`${r.type}-${r.label}-${i}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToResult(r)}
                      style={{
                        display: "flex", flexDirection: "column", gap: 2, width: "100%",
                        padding: "9px 14px", border: "none", background: "none", cursor: "pointer",
                        textAlign: "left", borderBottom: i < searchResults.length - 1 ? "1px solid #F1EFE9" : "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#1A1A18" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                          color: "#EA580C", backgroundColor: "#FFF4EC", borderRadius: 4, padding: "1px 5px",
                        }}>
                          {r.type}
                        </span>
                        {r.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#8A8A8A" }}>{r.sublabel}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", backgroundColor: "#EA580C",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  isActive,
  pendingCount = 0,
}: {
  label: string;
  items: AdminNavItem[];
  isActive: (to: string, exact: boolean) => boolean;
  pendingCount?: number;
}) {
  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{
        padding: "10px 20px 4px",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#9A9A9A",
      }}>
        {label}
      </div>
      {items.map((item) => {
        const active = isActive(item.to, item.exact);
        const Icon = item.icon;
        const badge = item.badge && pendingCount > 0 ? pendingCount : 0;
        return (
          <Link
            key={item.to}
            to={item.to}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px",
              fontSize: 13.5,
              fontWeight: active ? 600 : 500,
              color: active ? "#EA580C" : "#4A4A48",
              backgroundColor: active ? "#FFF4EC" : "transparent",
              textDecoration: "none",
              position: "relative",
              transition: "background-color 0.1s, color 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = "#F4F3F0";
                e.currentTarget.style.color = "#1A1A18";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#4A4A48";
              }
            }}
          >
            {active && (
              <span style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: 3,
                backgroundColor: "#EA580C",
                borderRadius: "0 2px 2px 0",
              }} />
            )}
            <Icon size={15} strokeWidth={1.75} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {badge > 0 && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: "#EA580C",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "0 4px",
              }}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
