import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileCode2, Search, X } from "lucide-react";
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
  api_key_id: string | null;
};

type ApiKeyRow = {
  id: string;
  name: string;
  mode: string;
  key_prefix: string;
  last_four: string;
};

type StatusBucket = "all" | "2xx" | "3xx" | "4xx" | "5xx";
type Range = "1h" | "24h" | "7d" | "30d" | "custom";

function rangeToFrom(range: Range, customFrom: string): string | null {
  const now = Date.now();
  switch (range) {
    case "1h":
      return new Date(now - 60 * 60 * 1000).toISOString();
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "custom":
      return customFrom ? new Date(customFrom).toISOString() : null;
  }
}

function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [keyFilter, setKeyFilter] = useState<string>("all");
  const [statusBucket, setStatusBucket] = useState<StatusBucket>("all");
  const [range, setRange] = useState<Range>("7d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selected, setSelected] = useState<LogRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("api_request_logs")
        .select("id,occurred_at,method,path,status_code,duration_ms,request_id,error,api_key_id")
        .order("occurred_at", { ascending: false })
        .limit(500);

      const from = rangeToFrom(range, customFrom);
      if (from) q = q.gte("occurred_at", from);
      if (range === "custom" && customTo) q = q.lte("occurred_at", new Date(customTo).toISOString());

      if (statusBucket !== "all") {
        const min = Number(statusBucket.charAt(0)) * 100;
        q = q.gte("status_code", min).lt("status_code", min + 100);
      }

      const [logRes, keyRes] = await Promise.all([
        q,
        supabase
          .from("api_keys")
          .select("id,name,mode,key_prefix,last_four")
          .order("created_at", { ascending: false }),
      ]);
      setLogs((logRes.data ?? []) as LogRow[]);
      setKeys((keyRes.data ?? []) as ApiKeyRow[]);
      setLoading(false);
    })();
  }, [statusBucket, range, customFrom, customTo]);

  // Derive endpoint + event options from the current dataset.
  const endpointOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      // Take path root like /v1/pricing or /v1/competitors
      const seg = l.path.split("?")[0].split("/").filter(Boolean).slice(0, 2).join("/");
      if (seg) set.add("/" + seg);
    }
    return ["all", ...Array.from(set).sort()];
  }, [logs]);

  const eventOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      const m = l.path.match(/event=([a-z0-9._-]+)/i);
      if (m) set.add(m[1]);
    }
    return ["all", ...Array.from(set).sort()];
  }, [logs]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (endpointFilter !== "all" && !l.path.startsWith(endpointFilter)) return false;
      if (eventFilter !== "all" && !l.path.toLowerCase().includes(`event=${eventFilter.toLowerCase()}`)) return false;
      if (keyFilter !== "all") {
        if (keyFilter === "none" && l.api_key_id) return false;
        if (keyFilter !== "none" && l.api_key_id !== keyFilter) return false;
      }
      if (needle) {
        const hay = `${l.method} ${l.path} ${l.request_id ?? ""} ${l.error ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [logs, query, endpointFilter, eventFilter, keyFilter]);

  const resetFilters = () => {
    setQuery("");
    setEndpointFilter("all");
    setEventFilter("all");
    setKeyFilter("all");
    setStatusBucket("all");
    setRange("7d");
    setCustomFrom("");
    setCustomTo("");
  };

  const activeCount =
    (query ? 1 : 0) +
    (endpointFilter !== "all" ? 1 : 0) +
    (eventFilter !== "all" ? 1 : 0) +
    (keyFilter !== "all" ? 1 : 0) +
    (statusBucket !== "all" ? 1 : 0) +
    (range !== "7d" ? 1 : 0);

  const keyLookup = useMemo(() => {
    const m = new Map<string, ApiKeyRow>();
    for (const k of keys) m.set(k.id, k);
    return m;
  }, [keys]);

  const keyOptions = useMemo(
    () => [
      { value: "all", label: "All keys" },
      { value: "none", label: "Unattributed" },
      ...keys.map((k) => ({
        value: k.id,
        label: `${k.name} · ${k.mode} · …${k.last_four}`,
      })),
    ],
    [keys],
  );

  return (
    <DashboardLayout
      title="Logs"
      subtitle="Every API request made with your keys, with status, latency, and request ID for debugging."
      helpItems={[
        "Filter to errors-only when triaging a failing integration.",
        "Copy the request ID into your logs to correlate with your app-side trace.",
        "Logs are retained for 30 days on the default plan.",
      ]}
    >
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          padding: 12,
          backgroundColor: "#fff",
          border: "1px solid #E5E2DB",
          borderRadius: 12,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#9A9A9A" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search path, request ID, or error"
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
              fontSize: 12.5,
            }}
          />
        </div>

        <Select
          label="Endpoint"
          value={endpointFilter}
          onChange={setEndpointFilter}
          options={endpointOptions.map((o) => ({ value: o, label: o === "all" ? "All endpoints" : o }))}
        />
        <Select
          label="Event"
          value={eventFilter}
          onChange={setEventFilter}
          options={eventOptions.map((o) => ({ value: o, label: o === "all" ? "All events" : o }))}
        />
        <Select
          label="API key"
          value={keyFilter}
          onChange={setKeyFilter}
          options={keyOptions}
        />
        <Select
          label="Status"
          value={statusBucket}
          onChange={(v) => setStatusBucket(v as StatusBucket)}
          options={[
            { value: "all", label: "All statuses" },
            { value: "2xx", label: "2xx success" },
            { value: "3xx", label: "3xx redirect" },
            { value: "4xx", label: "4xx client error" },
            { value: "5xx", label: "5xx server error" },
          ]}
        />
        <Select
          label="Range"
          value={range}
          onChange={(v) => setRange(v as Range)}
          options={[
            { value: "1h", label: "Last hour" },
            { value: "24h", label: "Last 24 hours" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "custom", label: "Custom range" },
          ]}
        />

        {range === "custom" && (
          <>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: "7px 8px", border: "1px solid #E5E2DB", borderRadius: 8, fontSize: 12.5 }}
            />
            <span style={{ fontSize: 12, color: "#6B6B6B" }}>to</span>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: "7px 8px", border: "1px solid #E5E2DB", borderRadius: 8, fontSize: 12.5 }}
            />
          </>
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 10px",
              backgroundColor: "transparent",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              color: "#6B6B6B",
            }}
          >
            <X size={12} /> Clear filters
          </button>
        )}

        <div style={{ marginLeft: "auto", fontSize: 11.5, color: "#8A8A8A" }}>
          {loading ? "Loading…" : `${filtered.length.toLocaleString()} of ${logs.length.toLocaleString()} requests`}
        </div>
      </div>

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
            color: "#9A9A9A",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
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
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <FileCode2 size={24} color="#9A9A9A" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, color: "#6B6B6B" }}>
              {logs.length === 0
                ? "No requests logged yet. Calls made with your API keys will show up here."
                : "No requests match the current filters."}
            </div>
          </div>
        ) : (
          filtered.map((l) => {
            const isError = l.status_code >= 400;
            return (
              <button
                type="button"
                key={l.id}
                onClick={() => setSelected(l)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 60px 1.6fr 70px 80px 1fr",
                  alignItems: "center",
                  padding: "10px 16px",
                  fontSize: 12.5,
                  color: "#1A1A18",
                  borderBottom: "1px solid #F1EDE4",
                  backgroundColor: selected?.id === l.id ? "#FFF7ED" : "transparent",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  borderBottomColor: "#F1EDE4",
                  cursor: "pointer",
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
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#6B6B6B", fontFamily: "ui-monospace, monospace" }}>
                  {l.method}
                </span>
                <code style={{ fontSize: 12, color: "#1A1A18", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.path}
                </code>
                <span style={{ fontSize: 11, fontWeight: 600, color: isError ? "#DC2626" : "#166534" }}>
                  {l.status_code}
                </span>
                <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                  {l.duration_ms != null ? `${l.duration_ms}ms` : "—"}
                </span>
                <code style={{ fontSize: 10.5, color: "#8A8A8A", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.request_id ?? "—"}
                </code>
              </button>
            );
          })
        )}
      </div>

      {selected && (
        <Drawer onClose={() => setSelected(null)} title="Request detail">
          <DetailRow label="Time" value={new Date(selected.occurred_at).toLocaleString()} />
          <DetailRow label="Method" value={selected.method} mono />
          <DetailRow label="Path" value={selected.path} mono />
          <DetailRow label="Status" value={String(selected.status_code)} mono color={selected.status_code >= 400 ? "#DC2626" : "#166534"} />
          <DetailRow label="Latency" value={selected.duration_ms != null ? `${selected.duration_ms} ms` : "—"} />
          <DetailRow label="Request ID" value={selected.request_id ?? "—"} mono />
          <DetailRow
            label="API key"
            value={
              selected.api_key_id
                ? (() => {
                    const k = keyLookup.get(selected.api_key_id);
                    return k ? `${k.name} · ${k.mode} · …${k.last_four}` : selected.api_key_id;
                  })()
                : "—"
            }
            mono={!keyLookup.get(selected.api_key_id ?? "")}
          />
          {selected.error && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Error
              </div>
              <pre style={{ margin: 0, padding: 10, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap", color: "#991B1B" }}>
                {selected.error}
              </pre>
            </div>
          )}
        </Drawer>
      )}
    </DashboardLayout>
  );
}

// ---------- primitives ----------

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B6B6B" }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "7px 8px",
          border: "1px solid #E5E2DB",
          borderRadius: 8,
          fontSize: 12.5,
          backgroundColor: "#fff",
          color: "#1A1A18",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Drawer({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(17,24,39,0.35)" }} />
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 100%)",
          backgroundColor: "#fff",
          boxShadow: "-12px 0 30px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E2DB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B6B6B" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
      </aside>
    </div>
  );
}

function DetailRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #F1EDE4" }}>
      <span style={{ fontSize: 12, color: "#8A8A8A" }}>{label}</span>
      <span
        style={{
          fontSize: 12.5,
          color: color ?? "#1A1A18",
          fontFamily: mono ? "ui-monospace, monospace" : undefined,
          fontWeight: mono ? 600 : 400,
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
