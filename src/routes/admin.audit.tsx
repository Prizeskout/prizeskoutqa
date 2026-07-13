import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList } from "lucide-react";
import { getAuditLog } from "@/server/admin-console.functions";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log | Admin Console | PrizeSkout" }] }),
  component: AuditPage,
});

type AuditEvent = {
  trace_id: string; event_type: string; account_id: string; merchant_id: string;
  sku: string; region: string; source_platform: string | null; target_channel: string | null;
  summary_en: string; pdpl_compliant: boolean; created_at: string | null;
};

const ALL_TYPES = ["ingest", "decide", "dispatch", "channel_connect", "error"] as const;

const EVENT_STYLE: Record<string, { bg: string; fg: string }> = {
  ingest:          { bg: "#DBEAFE", fg: "#1E40AF" },
  decide:          { bg: "#EDE9FE", fg: "#5B21B6" },
  dispatch:        { bg: "#DCFCE7", fg: "#166534" },
  channel_connect: { bg: "#FFF7ED", fg: "#92400E" },
  error:           { bg: "#FEE2E2", fg: "#991B1B" },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function AuditPage() {
  const fetchLog = useServerFn(getAuditLog);
  const [events, setEvents]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [typeFilter, setType] = useState("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await (fetchLog as any)()) as Awaited<ReturnType<typeof getAuditLog>>;
        if (!cancelled) setEvents(res.events as AuditEvent[]);
      } catch (e) { if (!cancelled) setError((e as Error).message); }
      finally     { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [fetchLog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const tok = typeFilter === "all" || e.event_type === typeFilter;
      const sok = !q || (e.merchant_id ?? "").toLowerCase().includes(q) || (e.sku ?? "").toLowerCase().includes(q) || (e.summary_en ?? "").toLowerCase().includes(q) || (e.trace_id ?? "").toLowerCase().includes(q);
      return tok && sok;
    });
  }, [events, typeFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const e of events) { c[e.event_type] = (c[e.event_type] ?? 0) + 1; }
    return c;
  }, [events]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={() => setType("all")} style={filterBtn(typeFilter === "all")}>All ({counts.all ?? 0})</button>
        {ALL_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} style={filterBtn(typeFilter === t, t)}>
            {t} ({counts[t] ?? 0})
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={searchWrap}>
          <input type="search" placeholder="Search merchant, SKU, summary…" value={search} onChange={(e) => setSearch(e.target.value)} style={searchInput} />
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #E5E2DB", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
          <thead>
            <tr style={{ backgroundColor: "#FAFAF9" }}>
              <Th>Timestamp</Th><Th>Type</Th><Th>Merchant</Th><Th>SKU</Th><Th>Region</Th><Th>Platform</Th><Th>Summary</Th><Th>PDPL</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 24, color: "#8A8A8A", fontSize: 13 }}>Loading audit log…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: "center" }}>
                  <ClipboardList size={22} color="#9A9A9A" style={{ display: "block", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, color: "#6B6B6B" }}>{events.length === 0 ? "No audit events yet." : "No events match the current filter."}</div>
                </td>
              </tr>
            ) : filtered.map((ev, i) => {
              const st = EVENT_STYLE[ev.event_type] ?? { bg: "#F1F5F9", fg: "#475569" };
              return (
                <tr key={ev.trace_id || i} style={{ borderTop: i === 0 ? "none" : "1px solid #F1EFE9" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11.5, color: "#6B6B6B", whiteSpace: "nowrap" }}>{fmt(ev.created_at)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, fontSize: 10.5, fontWeight: 700, backgroundColor: st.bg, color: st.fg, fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{ev.event_type}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11.5, color: "#1A1A18", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.merchant_id || "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11.5, color: "#6B6B6B" }}>{ev.sku || "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11.5, color: "#6B6B6B" }}>{ev.region || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B6B6B", textTransform: "capitalize" }}>{ev.source_platform || ev.target_channel || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#1A1A18", maxWidth: 260 }}>{ev.summary_en || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12 }}>
                    {ev.pdpl_compliant ? <span style={{ color: "#166534", fontWeight: 600 }}>✓</span> : <span style={{ color: "#991B1B", fontWeight: 600 }}>✗</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "#8A8A8A" }}>Showing {filtered.length} of {events.length} events (latest 200 loaded). Events are immutable once written.</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#6B6B6B", whiteSpace: "nowrap" }}>{children}</th>;
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 14, border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#991B1B", borderRadius: 10, fontSize: 13 }}>{children}</div>;
}

const filterBtn = (active: boolean, type?: string): React.CSSProperties => {
  const colors: Record<string, string> = { error: "#DC2626", dispatch: "#16A34A", channel_connect: "#EA580C" };
  const accent = type && colors[type] ? colors[type] : "#EA580C";
  return { padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: active ? 600 : 500, border: `1px solid ${active ? accent : "#E5E2DB"}`, backgroundColor: active ? (type === "error" ? "#FEF2F2" : "#FFF7ED") : "#fff", color: active ? accent : "#6B6B6B", cursor: "pointer", fontFamily: type ? "ui-monospace, SFMono-Regular, monospace" : undefined };
};
const searchWrap: React.CSSProperties  = { display: "inline-flex", alignItems: "center", border: "1px solid #E5E2DB", borderRadius: 8, padding: "6px 10px", backgroundColor: "#fff" };
const searchInput: React.CSSProperties = { border: "none", outline: "none", fontSize: 13, minWidth: 220, backgroundColor: "transparent" };
