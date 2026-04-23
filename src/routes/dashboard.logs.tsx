import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileCode2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/logs")({
  head: () => ({ meta: [{ title: "Logs | PrizeSkout" }] }),
  component: LogsPage,
});

type LogRow = {
  id: string;
  occurred_at: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number | null;
  request_id: string | null;
  error: string | null;
};

function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "errors">("all");

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("api_request_logs")
        .select("id,occurred_at,method,path,status_code,duration_ms,request_id,error")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (filter === "errors") q = q.gte("status_code", 400);
      const { data } = await q;
      setLogs((data ?? []) as LogRow[]);
      setLoading(false);
    })();
  }, [filter]);

  return (
    <DashboardLayout
      title="Logs"
      subtitle="Every API request made with your keys, with status, latency, and request ID for debugging."
      helpItems={[
        "Filter to errors-only when triaging a failing integration.",
        "Copy the request ID into your logs to correlate with your app-side trace.",
        "Logs are retained for 30 days on the default plan.",
      ]}
      primaryAction={
        <div style={{ display: "flex", gap: 4, backgroundColor: "#F1EDE4", borderRadius: 8, padding: 3 }}>
          {(["all", "errors"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              style={{
                padding: "5px 12px",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: filter === v ? "#fff" : "transparent",
                color: filter === v ? "#1A1A18" : "#6B6B6B",
              }}
            >
              {v === "all" ? "All" : "Errors"}
            </button>
          ))}
        </div>
      }
    >
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #E5E2DB",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px 60px 1.6fr 70px 80px 1fr",
            padding: "10px 16px",
            fontSize: 11,
            fontWeight: 600,
            color: "#8A8A8A",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderBottom: "1px solid #E5E2DB",
            backgroundColor: "#FAFAF9",
          }}
        >
          <span>Time</span>
          <span>Method</span>
          <span>Path</span>
          <span>Status</span>
          <span>Latency</span>
          <span>Request ID</span>
        </div>
        {loading ? (
          <div style={{ padding: 24, fontSize: 13, color: "#8A8A8A" }}>Loading logs…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <FileCode2 size={24} color="#9A9A9A" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, color: "#6B6B6B" }}>
              No requests logged yet. Calls made with your API keys will show up here.
            </div>
          </div>
        ) : (
          logs.map((l) => {
            const isError = l.status_code >= 400;
            return (
              <div
                key={l.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 60px 1.6fr 70px 80px 1fr",
                  alignItems: "center",
                  padding: "10px 16px",
                  fontSize: 12.5,
                  color: "#1A1A18",
                  borderBottom: "1px solid #F1EDE4",
                }}
              >
                <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                  {new Date(l.occurred_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "#6B6B6B",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {l.method}
                </span>
                <code style={{ fontSize: 12, color: "#1A1A18", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.path}
                </code>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isError ? "#DC2626" : "#166534",
                  }}
                >
                  {l.status_code}
                </span>
                <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                  {l.duration_ms != null ? `${l.duration_ms}ms` : "—"}
                </span>
                <code style={{ fontSize: 10.5, color: "#8A8A8A", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.request_id ?? "—"}
                </code>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
