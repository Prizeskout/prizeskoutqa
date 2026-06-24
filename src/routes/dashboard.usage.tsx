// Week 6: per-endpoint and per-key call breakdowns, plus an error-rate trend
// alongside the daily volume chart. Still client-only — pulls the last 30
// days of api_request_logs and aggregates in-memory. Pre-computed rollups
// can come later if these queries get slow.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, KeyRound } from "lucide-react";
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
  api_key_id: string | null;
};

type ApiKeyRow = {
  id: string;
  name: string;
  mode: string;
  key_prefix: string;
  last_four: string;
};

function UsagePage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [logRes, keyRes] = await Promise.all([
        supabase
          .from("api_request_logs")
          .select("occurred_at,status_code,duration_ms,path,api_key_id")
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: false })
          .limit(1000),
        supabase
          .from("api_keys")
          .select("id,name,mode,key_prefix,last_four")
          .order("created_at", { ascending: false }),
      ]);
      setLogs((logRes.data ?? []) as LogRow[]);
      setKeys((keyRes.data ?? []) as ApiKeyRow[]);
      setLoading(false);
    })();
  }, []);

  const keyLookup = useMemo(() => {
    const m = new Map<string, ApiKeyRow>();
    for (const k of keys) m.set(k.id, k);
    return m;
  }, [keys]);

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

    // Per-key breakdown.
    const byKey = new Map<string, { total: number; errors: number }>();
    logs.forEach((l) => {
      const id = l.api_key_id ?? "unknown";
      const cur = byKey.get(id) ?? { total: 0, errors: 0 };
      cur.total += 1;
      if (l.status_code >= 400) cur.errors += 1;
      byKey.set(id, cur);
    });
    const perKey = Array.from(byKey.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.total - a.total);

    // Bucket by day (last 14 days) for both volume + error count.
    const days: { label: string; count: number; errors: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      let count = 0;
      let errs = 0;
      for (const l of logs) {
        const t = new Date(l.occurred_at).getTime();
        if (t >= d.getTime() && t < next.getTime()) {
          count += 1;
          if (l.status_code >= 400) errs += 1;
        }
      }
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, count, errors: errs });
    }
    return { total, errorRate, p50, p95, top, days, perKey };
  }, [logs]);

  const maxBar = Math.max(1, ...metrics.days.map((d) => d.count));
  const maxKey = Math.max(1, ...metrics.perKey.map((k) => k.total));

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
            <MetricCard
              label="Error rate"
              value={`${metrics.errorRate.toFixed(2)}%`}
              accent={metrics.errorRate > 1 ? "#DC2626" : "#22C55E"}
            />
            <MetricCard label="Latency p50" value={`${metrics.p50} ms`} />
            <MetricCard label="Latency p95" value={`${metrics.p95} ms`} />
          </div>

          <Card title="Requests per day (last 14 days)">
            {metrics.total === 0 ? (
              <EmptyBlurb />
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
                  {metrics.days.map((d) => {
                    const errPct = d.count > 0 ? (d.errors / d.count) * 100 : 0;
                    return (
                      <div
                        key={d.label}
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                      >
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", position: "relative" }}>
                          <div
                            title={`${d.count} requests, ${d.errors} errors`}
                            style={{
                              width: "100%",
                              height: `${(d.count / maxBar) * 100}%`,
                              backgroundColor: "#EA580C",
                              borderRadius: "4px 4px 0 0",
                              minHeight: d.count > 0 ? 2 : 0,
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            {d.errors > 0 && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: `${errPct}%`,
                                  backgroundColor: "#DC2626",
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: "#8A8A8A" }}>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "#6B6B6B" }}>
                  <Legend color="#EA580C" label="Successful requests" />
                  <Legend color="#DC2626" label="Errors (4xx / 5xx)" />
                </div>
              </>
            )}
          </Card>

          <Card title="Calls per API key">
            {metrics.perKey.length === 0 ? (
              <EmptyBlurb />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {metrics.perKey.map((k) => {
                  const meta = keyLookup.get(k.id);
                  const name = meta ? meta.name : "Unattributed";
                  const tag = meta
                    ? `${meta.mode} · ${meta.key_prefix}…${meta.last_four}`
                    : "no key recorded";
                  const errPct = k.total > 0 ? (k.errors / k.total) * 100 : 0;
                  return (
                    <div key={k.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <KeyRound size={11} color="#8A8A8A" />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1A1A18" }}>{name}</span>
                          <span
                            style={{
                              fontSize: 10.5,
                              color: "#6B6B6B",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            {tag}
                          </span>
                          {k.errors > 0 && (
                            <span
                              style={{
                                fontSize: 10.5,
                                color: "#DC2626",
                                fontWeight: 600,
                                marginLeft: "auto",
                              }}
                            >
                              {errPct.toFixed(1)}% errors
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            position: "relative",
                            height: 8,
                            backgroundColor: "#F1EDE4",
                            borderRadius: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${(k.total / maxKey) * 100}%`,
                              backgroundColor: "#EA580C",
                            }}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: 12.5, color: "#1A1A18", fontWeight: 600, textAlign: "right" }}>
                        {k.total.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
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
      <div style={{ fontSize: 11, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, display: "inline-block" }} />
      {label}
    </span>
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
