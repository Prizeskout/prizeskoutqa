import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/usage")({
  head: () => ({ meta: [{ title: "Usage | PrizeSkout" }] }),
  component: UsagePage,
});

type LogRow = {
  occurred_at: string;
  status_code: number;
  duration_ms: number | null;
  path: string;
};

function UsagePage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("api_request_logs")
        .select("occurred_at,status_code,duration_ms,path")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(1000);
      setLogs((data ?? []) as LogRow[]);
      setLoading(false);
    })();
  }, []);

  const metrics = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => l.status_code >= 400).length;
    const errorRate = total ? (errors / total) * 100 : 0;
    const durs = logs.map((l) => l.duration_ms).filter((v): v is number => typeof v === "number");
    durs.sort((a, b) => a - b);
    const p50 = durs.length ? durs[Math.floor(durs.length * 0.5)] : 0;
    const p95 = durs.length ? durs[Math.floor(durs.length * 0.95)] : 0;
    const byEndpoint = new Map<string, number>();
    logs.forEach((l) => byEndpoint.set(l.path, (byEndpoint.get(l.path) ?? 0) + 1));
    const top = Array.from(byEndpoint.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    // bucket by day (last 14 days)
    const days: { label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = logs.filter((l) => {
        const t = new Date(l.occurred_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, count });
    }
    return { total, errorRate, p50, p95, top, days };
  }, [logs]);

  const maxBar = Math.max(1, ...metrics.days.map((d) => d.count));

  return (
    <DashboardLayout
      title="Usage"
      subtitle="Call volume, latency, and error rate across all your API keys."
      helpItems={[
        "Numbers cover the last 30 days of traffic across test and live keys.",
        "p50 / p95 latency tells you how most requests and the slowest 5% are performing.",
        "Error rate above ~1% usually means a bad key, rate-limit issue, or malformed requests.",
      ]}
    >
      {loading ? (
        <div style={{ fontSize: 13, color: "#8A8A8A" }}>Loading usage…</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <MetricCard label="Requests (30d)" value={metrics.total.toLocaleString()} />
            <MetricCard label="Error rate" value={`${metrics.errorRate.toFixed(2)}%`} accent={metrics.errorRate > 1 ? "#DC2626" : "#22C55E"} />
            <MetricCard label="Latency p50" value={`${metrics.p50} ms`} />
            <MetricCard label="Latency p95" value={`${metrics.p95} ms`} />
          </div>

          <Card title="Requests per day (last 14 days)">
            {metrics.total === 0 ? (
              <EmptyBlurb />
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
                {metrics.days.map((d) => (
                  <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div
                        title={`${d.count} requests`}
                        style={{
                          width: "100%",
                          height: `${(d.count / maxBar) * 100}%`,
                          backgroundColor: "#EA580C",
                          borderRadius: "4px 4px 0 0",
                          minHeight: d.count > 0 ? 2 : 0,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: "#8A8A8A" }}>{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Top endpoints">
            {metrics.top.length === 0 ? (
              <EmptyBlurb />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {metrics.top.map(([path, count]) => (
                  <div key={path} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <code style={{ flex: 1, fontSize: 12, color: "#1A1A18", fontFamily: "ui-monospace, monospace" }}>
                      {path}
                    </code>
                    <span style={{ fontSize: 12, color: "#6B6B6B" }}>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, color: "#8A8A8A", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? "#1A1A18", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyBlurb() {
  return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "#8A8A8A" }}>
      <Activity size={20} style={{ margin: "0 auto 8px" }} />
      <div style={{ fontSize: 13 }}>No API traffic yet. Start making calls to see usage here.</div>
    </div>
  );
}
