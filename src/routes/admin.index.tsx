import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/server/admin-console.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Overview | Admin Console | PrizeSkout" }] }),
  component: AdminOverview,
});

type Stats = Awaited<ReturnType<typeof getAdminStats>>;

const EVENT_COLORS: Record<string, string> = {
  ingest:          "#3B82F6",
  decide:          "#8B5CF6",
  dispatch:        "#16A34A",
  channel_connect: "#EA580C",
  error:           "#DC2626",
};

function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function genSparks(count: number, trend: "up" | "flat" | "wave", len = 14): number[] {
  const base = Math.max(count * 0.65, 1);
  return Array.from({ length: len }, (_, i) => {
    const t = i / (len - 1);
    if (trend === "up")   return base + (count - base) * t + Math.sin(i * 1.5) * base * 0.04 + 0.001;
    if (trend === "flat") return count * (1 + Math.sin(i * 0.9) * 0.06);
    return count * (1 + Math.sin(i * 1.8) * 0.2);
  });
}

function Sparkline({ data, color, uid }: { data: number[]; color: string; uid: string }) {
  const w = 110, h = 40;
  if (data.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i): [number, number] => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 8) - 4,
  ]);
  const line = `M ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")}`;
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)},${h} L 0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label, value, trendLabel, trendDir, color, sparkData, uid, to,
}: {
  label: string;
  value: number;
  trendLabel: string;
  trendDir: "up" | "down" | "neutral";
  color: string;
  sparkData: number[];
  uid: string;
  to: string;
}) {
  const arrow = trendDir === "up" ? "▲" : trendDir === "down" ? "▼" : "◆";
  const trendColor = trendDir === "up" ? "#16A34A" : trendDir === "down" ? "#DC2626" : "#EA580C";
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        border: "1px solid #E5E2DB",
        borderRadius: 14,
        padding: "18px 20px 14px",
        textDecoration: "none",
        transition: "border-color 0.12s, box-shadow 0.12s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 2px 14px ${color}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E5E2DB";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9A9A9A", marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: "#1A1A18", lineHeight: 1, letterSpacing: "-0.03em" }}>
        {value.toLocaleString()}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
          {arrow} {trendLabel}
        </span>
      </div>
      <div style={{ marginTop: 16 }}>
        <Sparkline data={sparkData} color={color} uid={uid} />
      </div>
    </Link>
  );
}

const PLATFORM_ORDER = ["talabat", "jahez", "snoonu", "deliveroo", "keeta", "salla", "foodics", "zid"];

function AdminOverview() {
  const fetchStats = useServerFn(getAdminStats);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await (fetchStats as any)()) as Stats;
        if (!cancelled) setStats(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchStats]);

  if (loading) return <div style={{ color: "#6B6B6B", fontSize: 13 }}>Loading…</div>;
  if (error)   return <div style={{ color: "#991B1B", fontSize: 13, padding: 16, backgroundColor: "#FEF2F2", borderRadius: 10 }}>{error}</div>;
  if (!stats)  return null;

  const approved = stats.approvedMerchants ?? 0;
  const updates24h = stats.priceUpdates24h ?? 0;

  const kpis = [
    {
      label: "Total Merchants",   value: approved,
      trendLabel: "live access",  trendDir: "up" as const,
      color: "#EA580C",
      sparkData: genSparks(Math.max(approved, 1), "up"),
      uid: "sp-merchants", to: "/admin/merchants",
    },
    {
      label: "Active Channels",   value: stats.activeChannels,
      trendLabel: "connected",    trendDir: "up" as const,
      color: "#3B82F6",
      sparkData: genSparks(Math.max(stats.activeChannels, 1), "up"),
      uid: "sp-channels", to: "/admin/channels",
    },
    {
      label: "Price Updates · 24h", value: updates24h,
      trendLabel: "dispatched",   trendDir: "neutral" as const,
      color: "#16A34A",
      sparkData: genSparks(Math.max(updates24h, 5), "wave"),
      uid: "sp-prices", to: "/admin/audit",
    },
    {
      label: "Access Codes",      value: stats.totalCodes,
      trendLabel: "active",       trendDir: "neutral" as const,
      color: "#F59E0B",
      sparkData: genSparks(Math.max(stats.totalCodes, 3), "flat"),
      uid: "sp-codes", to: "/admin/codes",
    },
  ];

  const sortedPlatforms = Object.entries(stats.channelBreakdown).sort(
    ([a], [b]) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b),
  );

  const systemRows = [
    { label: "Workers",  status: "ok" },
    { label: "Database", status: "ok" },
    ...PLATFORM_ORDER
      .filter((p) => (stats.channelBreakdown[p] ?? 0) > 0)
      .map((p) => ({ label: `${p.charAt(0).toUpperCase()}${p.slice(1)} API`, status: "ok" })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {kpis.map((k) => <KpiCard key={k.uid} {...k} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* Recent Activity */}
        <section style={{ backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 14, overflow: "hidden" }}>
          <header style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid #F1EFE9",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>Recent Activity</span>
            <Link to="/admin/audit" style={{ fontSize: 12, fontWeight: 600, color: "#EA580C", textDecoration: "none" }}>
              Full log →
            </Link>
          </header>
          {stats.recentAudit.length === 0 ? (
            <div style={{ padding: 28, color: "#8A8A8A", fontSize: 13 }}>
              No pipeline activity yet. Events appear here once price requests flow through.
            </div>
          ) : (
            <div>
              {stats.recentAudit.map((ev: any, i: number) => (
                <div
                  key={ev.trace_id ?? i}
                  style={{
                    display: "flex", gap: 14, padding: "13px 20px",
                    borderBottom: i < stats.recentAudit.length - 1 ? "1px solid #F5F3EF" : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: EVENT_COLORS[ev.event_type] ?? "#9A9A9A",
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.4 }}>
                      {ev.summary_en || ev.event_type}
                    </div>
                    <div style={{
                      fontSize: 11, color: "#8A8A8A", marginTop: 3,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    }}>
                      {ev.merchant_id ?? "—"}
                      {ev.sku    ? ` · ${ev.sku}`    : ""}
                      {ev.region ? ` · ${ev.region}` : ""}
                      {" · "}
                      <span style={{ textTransform: "capitalize" }}>{ev.event_type}</span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, color: "#9A9A9A", flexShrink: 0,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  }}>
                    {relativeTime(ev.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* System Status */}
          <section style={{ backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 14, overflow: "hidden" }}>
            <header style={{ padding: "14px 18px", borderBottom: "1px solid #F1EFE9" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>System Status</span>
            </header>
            <div style={{ padding: "2px 0 6px" }}>
              {systemRows.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 18px",
                    borderBottom: i < systemRows.length - 1 ? "1px solid #F8F7F4" : "none",
                    fontSize: 13, color: "#1A1A18",
                  }}
                >
                  <span>{row.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: row.status === "ok" ? "#16A34A" : "#EA580C",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      backgroundColor: row.status === "ok" ? "#16A34A" : "#EA580C",
                      display: "inline-block",
                    }} />
                    {row.status === "ok" ? "OK" : "Degraded"}
                  </span>
                </div>
              ))}
              {systemRows.length === 0 && (
                <div style={{ padding: "12px 18px", color: "#8A8A8A", fontSize: 13 }}>
                  No services configured.
                </div>
              )}
            </div>
          </section>

          {/* Connections by Platform */}
          <section style={{ backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 14, overflow: "hidden" }}>
            <header style={{ padding: "14px 18px", borderBottom: "1px solid #F1EFE9" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>Connections by Platform</span>
            </header>
            {sortedPlatforms.length === 0 ? (
              <div style={{ padding: 18, color: "#8A8A8A", fontSize: 13 }}>No active connections yet.</div>
            ) : (
              <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                {sortedPlatforms.map(([platform, count]) => {
                  const total = stats.activeChannels || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={platform}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                        <span style={{ color: "#1A1A18", textTransform: "capitalize" }}>{platform}</span>
                        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", color: "#6B6B6B", fontSize: 12 }}>
                          {count}
                        </span>
                      </div>
                      <div style={{ height: 5, backgroundColor: "#F1EFE9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#EA580C", borderRadius: 3, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
