import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BrainCircuit, HandCoins, Headphones, PlugZap, RefreshCw, TriangleAlert, Users } from "lucide-react";
import { getPlatformOverview } from "@/server/platform-admin.functions";

export const Route = createFileRoute("/admin/")({ component: Overview });

function Overview() {
  const fn = useServerFn(getPlatformOverview);
  const [data, setData] = useState<any>(); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [updated, setUpdated] = useState<Date>();
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setData(await fn()); setUpdated(new Date()); } catch (e) { setError(e instanceof Error ? e.message : "Could not load platform data."); } finally { setLoading(false); } }, [fn]);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 60_000); return () => window.clearInterval(timer); }, [refresh]);
  const cards = [
    { label: "Merchants", value: data?.users, icon: Users, to: "/admin/merchants", detail: "Registered platform accounts" },
    { label: "Connected channels", value: data?.channels, icon: PlugZap, to: "/admin/merchants", detail: "Live commerce connections" },
    { label: "Decisions in 24h", value: data?.actions, icon: BrainCircuit, to: "/admin/operations", detail: "Automation decisions processed" },
    { label: "Open recoveries", value: data?.recoveries, icon: HandCoins, to: "/admin/operations", detail: "Cases still being recovered" },
    { label: "Needs attention", value: data?.attention, icon: TriangleAlert, to: "/admin/operations", detail: `${data?.urgentAttention ?? 0} urgent items`, danger: Boolean(data?.urgentAttention) },
    { label: "Support queue", value: data?.tickets, icon: Headphones, to: "/admin/support", detail: `${data?.urgentTickets ?? 0} urgent · ${data?.staleTickets ?? 0} outside SLA`, danger: Boolean(data?.urgentTickets || data?.staleTickets) },
  ];
  return <><Title title="Platform overview" sub="Current Revenue Protection operations across every merchant account." actions={<button onClick={() => void refresh()} disabled={loading} style={secondaryButton}><RefreshCw size={14} className={loading ? "spin" : ""}/>{loading ? "Refreshing" : "Refresh"}</button>}/>
    {error ? <ErrorState message={error} onRetry={() => void refresh()}/> : null}
    <div className="admin-grid">{cards.map(({ label, value, icon: Icon, to, detail, danger }) => <Link to={to} key={label} className="admin-card" style={{ padding: 20, textDecoration: "none", color: "inherit", borderColor: danger ? "#FECACA" : undefined }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 9, background: danger ? "#FEF2F2" : "#FFF7ED" }}><Icon size={18} color={danger ? "#DC2626" : "#EA580C"}/></span><ArrowRight size={15} color="#9CA3AF"/></div><div style={{ fontSize: 31, fontWeight: 800, marginTop: 16 }}>{loading && !data ? <Skeleton width={50}/> : value ?? "—"}</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{label}</div><div style={{ fontSize: 11, color: danger ? "#B91C1C" : "#6B7280", marginTop: 4 }}>{detail}</div></Link>)}</div>
    <div className="admin-title-row" style={{ margin: "26px 0 10px", alignItems: "center" }}><h2 style={{ fontSize: 14, margin: 0 }}>Latest platform activity</h2><small style={{ color: "#6B7280" }}>{updated ? `Updated ${updated.toLocaleTimeString()}` : "Connecting…"}</small></div>
    <div className="admin-card" style={{ overflow: "hidden" }}>{loading && !data ? <LoadingRows/> : (data?.audit ?? []).map((x: any) => <div className="admin-row" key={`${x.trace_id}-${x.created_at}`} style={{ padding: "12px 16px", borderBottom: "1px solid #F0F1F3", fontSize: 12 }}><b>{x.event_type?.replaceAll("_", " ")}</b><span>{x.summary_en || `${x.source_platform || "PrizeSkout"} → ${x.target_channel || "internal"}`}</span><time style={{ color: "#6B7280" }}>{new Date(x.created_at).toLocaleString()}</time></div>)}{data && !data.audit.length && <Empty text="No platform activity has been recorded yet."/>}</div>
  </>;
}

export function Title({ title, sub, actions }: { title: string; sub: string; actions?: React.ReactNode }) { return <div className="admin-title-row"><div><h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1><p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7280" }}>{sub}</p></div>{actions && <div className="admin-actions">{actions}</div>}</div>; }
export function Empty({ text = "No records found." }: { text?: string }) { return <div style={{ padding: 35, textAlign: "center", color: "#8A8A8A", fontSize: 13 }}>{text}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" style={{ padding: 14, border: "1px solid #FECACA", borderRadius: 10, background: "#FEF2F2", color: "#991B1B", marginBottom: 14, fontSize: 12 }}>{message}<button onClick={onRetry} style={{ ...secondaryButton, marginLeft: 12 }}>Try again</button></div>; }
export function Skeleton({ width = "100%" }: { width?: number | string }) { return <span aria-hidden style={{ display: "inline-block", width, height: 18, borderRadius: 5, background: "#E5E7EB" }}/>; }
function LoadingRows() { return <div style={{ padding: 16, display: "grid", gap: 14 }}>{[1, 2, 3, 4].map((x) => <Skeleton key={x}/>)}</div>; }
export const secondaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 11px", border: "1px solid #D1D5DB", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer" };
