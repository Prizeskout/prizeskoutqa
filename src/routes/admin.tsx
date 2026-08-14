import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Headphones, LogOut, Menu, ShieldCheck, Users, Workflow, X } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/admin-console.css";

export const Route = createFileRoute("/admin")({ head: () => ({ meta: [{ title: "Platform Admin | PrizeSkout" }] }), component: AdminShell });
const nav = [{ to: "/admin", label: "Overview", icon: BarChart3 }, { to: "/admin/merchants", label: "Merchants", icon: Users }, { to: "/admin/operations", label: "Operations", icon: Workflow }, { to: "/admin/support", label: "Support", icon: Headphones }] as const;

function AdminShell() {
  const { data: admin, isLoading } = useIsAdmin();
  const { user, loading: authLoading } = useAuth();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const publicAdminRoute = path === "/admin/sign-in" || path === "/admin/callback";
  useEffect(() => { setMenuOpen(false); }, [path]);
  useEffect(() => { if (!publicAdminRoute && !authLoading && !user) void navigate({ to: "/admin/sign-in", replace: true }); }, [publicAdminRoute, authLoading, user, navigate]);
  if (publicAdminRoute) return <Outlet/>;
  if (authLoading || isLoading || !user) return <Gate text="Checking administrator access…"/>;
  if (!admin) return <Gate text="This account does not have platform administrator access." email={user.email} denied/>;
  return <div className="admin-shell">
    {menuOpen && <button className="admin-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>}
    <aside className={`admin-sidebar${menuOpen ? " open" : ""}`}>
      <div style={{ padding: "24px 20px", borderBottom: "1px solid #263142", display: "flex", justifyContent: "space-between" }}><div><b style={{ fontSize: 18 }}>PrizeSkout</b><div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, marginTop: 3 }}>PLATFORM ADMIN</div></div><button className="admin-mobile-only" onClick={() => setMenuOpen(false)} aria-label="Close menu" style={bareButton}><X size={18}/></button></div>
      <nav style={{ padding: 12, flex: 1 }}>{nav.map(({ to, label, icon: Icon }) => { const active = to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(to); return <Link key={to} to={to} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 4, borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#fff" : "#AAB2C0", background: active ? "#EA580C" : "transparent" }}><Icon size={17}/>{label}</Link>; })}</nav>
      <div style={{ padding: 14, borderTop: "1px solid #263142" }}><Link to="/dashboard/revenue-hub" style={{ display: "flex", gap: 8, alignItems: "center", color: "#AAB2C0", textDecoration: "none", fontSize: 12 }}><ArrowLeft size={14}/>Merchant product</Link><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 11, color: "#7F8A9B" }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{user.email}</span><button aria-label="Sign out" onClick={() => void supabase.auth.signOut().then(() => location.assign("/admin/sign-in"))} style={bareButton}><LogOut size={14}/></button></div></div>
    </aside>
    <main className="admin-main"><header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation" style={{ ...bareButton, marginRight: 10 }}><Menu size={20}/></button><ShieldCheck size={18} color="#EA580C"/><b style={{ marginLeft: 9 }}>Revenue Protection Operations</b><span style={{ marginLeft: "auto", fontSize: 12, color: "#6B7280" }}>Live platform data</span></header><div className="admin-content"><Outlet/></div></main>
  </div>;
}

function Gate({ text, denied = false, email }: { text: string; denied?: boolean; email?: string }) { return <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "#F7F7F5", padding: 20 }}><div style={{ textAlign: "center", maxWidth: 420 }}><ShieldCheck size={34} color={denied ? "#DC2626" : "#EA580C"}/><h1 style={{ fontSize: 19 }}>{denied ? "Access denied" : "PrizeSkout Admin"}</h1><p style={{ fontSize: 13, color: "#6B7280" }}>{text}</p>{denied && email && <p style={{ fontSize: 12, color: "#6B7280" }}>Signed in as <b>{email}</b></p>}{denied && <button onClick={() => void supabase.auth.signOut().then(() => location.assign("/admin/sign-in"))} style={{ border: 0, background: "transparent", color: "#EA580C", cursor: "pointer" }}>Sign in with another account</button>}</div></div>; }
const bareButton: React.CSSProperties = { background: "transparent", border: 0, color: "inherit", cursor: "pointer", padding: 4 };
