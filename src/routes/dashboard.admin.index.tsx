import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Wifi,
  KeyRound,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import { getAdminStats } from "@/server/admin-console.functions";

export const Route = createFileRoute("/dashboard/admin/")({
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
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function AdminOverview() {
  const fetchStats = useServerFn(getAdminStats);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!stats) return null;

  const kpis = [
    {
      icon: ShieldCheck,
      label: "Licensee applications",
      value: stats.totalApps,
      sub: stats.pendingApps > 0
        ? `${stats.pendingApps} pending review`
        : "No pending applications",
      alert: stats.pendingApps > 0,
      to: "/dashboard/admin/live-access",
    },
    {
      icon: Wifi,
      label: "Active channel connections",
      value: stats.activeChannels,
      sub: "Connected aggregators across all merchants",
      alert: false,
      to: "/dashboard/admin/channels",
    },
    {
      icon: KeyRound,
      label: "Access codes",
      value: stats.totalCodes,
      sub: "PSK-* onboarding codes in the database",
      alert: false,
      to: "/dashboard/admin/codes",
    },
    {
      icon: ClipboardList,
      label: "Govern log events",
      value: stats.totalAuditEvents,
      sub: stats.totalAuditEvents > 0
        ? "Price pipeline events recorded"
        : "No audit events yet",
      alert: false,
      to: "/dashboard/admin/audit",
    },
  ];

  const platformOrder = ["talabat", "jahez", "snoonu", "deliveroo", "salla", "foodics", "zid"];
  const sortedPlatforms = Object.entries(stats.channelBreakdown).sort(
    ([a], [b]) => platformOrder.indexOf(a) - platformOrder.indexOf(b),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPI cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              to={k.to}
              style={{
                display: "block",
                border: `1px solid ${k.alert ? "#FED7AA" : "#E5E2DB"}`,
                borderRadius: 12,
                padding: 16,
                backgroundColor: k.alert ? "#FFF7ED" : "#FFFFFF",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#EA580C"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = k.alert ? "#FED7AA" : "#E5E2DB"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Icon size={16} color={k.alert ? "#EA580C" : "#6B6B6B"} />
                <ArrowUpRight size={13} color="#9A9A9A" />
              </div>
              <div style={{ marginTop: 12, fontSize: 26, fontWeight: 700, color: "#1A1A18" }}>
                {k.value}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#6B6B6B" }}>{k.label}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: k.alert ? "#B45309" : "#8A8A8A" }}>
                {k.sub}
              </div>
            </Link>
          );
        })}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Recent audit activity */}
        <section
          style={{
            border: "1px solid #E5E2DB",
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 18px",
              borderBottom: "1px solid #F1EFE9",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>
              Recent govern events
            </div>
            <Link
              to="/dashboard/admin/audit"
              style={{ fontSize: 12, fontWeight: 600, color: "#EA580C", textDecoration: "none" }}
            >
              Full log →
            </Link>
          </header>
          {stats.recentAudit.length === 0 ? (
            <div style={{ padding: 24, color: "#8A8A8A", fontSize: 13 }}>
              No govern events yet. Price pipeline activity will appear here.
            </div>
          ) : (
            <div>
              {stats.recentAudit.map((ev: any, i: number) => (
                <div
                  key={ev.trace_id ?? i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "11px 18px",
                    borderBottom: i < stats.recentAudit.length - 1 ? "1px solid #F5F3EF" : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: EVENT_COLORS[ev.event_type] ?? "#9A9A9A",
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "#1A1A18" }}>
                      {ev.summary_en || ev.event_type}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#8A8A8A",
                        marginTop: 2,
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      }}
                    >
                      {ev.merchant_id ?? "—"}
                      {ev.sku ? ` · ${ev.sku}` : ""}
                      {ev.region ? ` · ${ev.region}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9A9A9A",
                      flexShrink: 0,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    }}
                  >
                    {relativeTime(ev.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Channel breakdown */}
        <section
          style={{
            border: "1px solid #E5E2DB",
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <header style={{ padding: "14px 18px", borderBottom: "1px solid #F1EFE9" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>
              Connections by platform
            </div>
          </header>
          {sortedPlatforms.length === 0 ? (
            <div style={{ padding: 18, color: "#8A8A8A", fontSize: 13 }}>
              No active channel connections yet.
            </div>
          ) : (
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedPlatforms.map(([platform, count]) => {
                const total = stats.activeChannels || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={platform}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        fontSize: 12.5,
                      }}
                    >
                      <span style={{ color: "#1A1A18", textTransform: "capitalize" }}>{platform}</span>
                      <span
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                          color: "#6B6B6B",
                          fontSize: 12,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        backgroundColor: "#F1EFE9",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: "#EA580C",
                          borderRadius: 3,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #FCA5A5",
        backgroundColor: "#FEF2F2",
        color: "#991B1B",
        borderRadius: 10,
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}
