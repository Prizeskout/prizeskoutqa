import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/admin/merchants")({
  head: () => ({ meta: [{ title: "Merchants | Admin Console | PrizeSkout" }] }),
  component: MerchantsPage,
});

type Merchant = {
  user_id: string;
  live_status: "approved" | "pending" | "rejected" | "none";
  company_name: string | null;
  company_domain: string | null;
  billing_email: string | null;
  expected_volume: string | null;
  decided_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "approved" | "pending">("all");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("licensee_applications")
      .select("user_id, live_status, company_name, company_domain, billing_email, expected_volume, decided_at")
      .order("decided_at", { ascending: false, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setMerchants((data ?? []) as Merchant[]);
        setLoading(false);
      });
  }, []);

  const counts = useMemo(() => ({
    all:      merchants.length,
    approved: merchants.filter((m) => m.live_status === "approved").length,
    pending:  merchants.filter((m) => m.live_status === "pending").length,
  }), [merchants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merchants.filter((m) => {
      if (filter !== "all" && m.live_status !== filter) return false;
      if (!q) return true;
      return (
        (m.company_name   ?? "").toLowerCase().includes(q) ||
        (m.company_domain ?? "").toLowerCase().includes(q) ||
        (m.billing_email  ?? "").toLowerCase().includes(q)
      );
    });
  }, [merchants, filter, search]);

  const STATUS: Record<string, { bg: string; fg: string; label: string }> = {
    approved: { bg: "#DCFCE7", fg: "#166534", label: "Approved"   },
    pending:  { bg: "#FEF3C7", fg: "#92400E", label: "Pending"    },
    rejected: { bg: "#FEE2E2", fg: "#991B1B", label: "Rejected"   },
    none:     { bg: "#F1F5F9", fg: "#475569", label: "No request" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ padding: 14, border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#991B1B", borderRadius: 10, fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {(["all", "approved", "pending"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1px solid ${filter === f ? "#EA580C" : "#E5E2DB"}`, backgroundColor: filter === f ? "#FFF7ED" : "#fff", color: filter === f ? "#EA580C" : "#6B6B6B", cursor: "pointer", textTransform: "capitalize" }}
          >
            {f} ({counts[f]})
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E5E2DB", borderRadius: 8, padding: "6px 10px", backgroundColor: "#fff" }}>
          <Search size={13} color="#9A9A9A" />
          <input type="search" placeholder="Search company, email…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, minWidth: 200, backgroundColor: "transparent" }} />
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #E5E2DB", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
          <thead>
            <tr style={{ backgroundColor: "#FAFAF9" }}>
              {["Company", "Domain", "Billing Email", "Volume", "Status", "Approved"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#6B6B6B", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, color: "#8A8A8A", fontSize: 13 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center" }}>
                  <Users size={22} color="#9A9A9A" style={{ display: "block", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, color: "#6B6B6B" }}>No merchants found.</div>
                </td>
              </tr>
            ) : filtered.map((m, i) => {
              const s = STATUS[m.live_status] ?? STATUS.none;
              return (
                <tr key={m.user_id} style={{ borderTop: i === 0 ? "none" : "1px solid #F1EFE9" }}>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{m.company_name || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12.5, color: "#6B6B6B", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{m.company_domain || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12.5, color: "#6B6B6B" }}>{m.billing_email || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12.5, color: "#6B6B6B" }}>{m.expected_volume || "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.fg }}>{s.label}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12, color: "#6B6B6B" }}>{fmt(m.decided_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "#8A8A8A" }}>{filtered.length} merchant{filtered.length !== 1 ? "s" : ""} shown.</div>
    </div>
  );
}
