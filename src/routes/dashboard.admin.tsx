import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Check, X, RotateCcw, Search } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  approveLiveAccess,
  rejectLiveAccess,
  revokeLiveAccess,
} from "@/server/developer-console.functions";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({ meta: [{ title: "Admin · Live Access | PrizeSkout" }] }),
  component: AdminPage,
});

type AccountRow = {
  user_id: string;
  live_status: "none" | "pending" | "approved" | "rejected";
  company_name: string | null;
  company_domain: string | null;
  use_case: string | null;
  expected_volume: string | null;
  billing_email: string | null;
  requested_at: string | null;
  decided_at: string | null;
  decision_note: string | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "none";

function AdminPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const approveFn = useServerFn(approveLiveAccess);
  const rejectFn = useServerFn(rejectLiveAccess);
  const revokeFn = useServerFn(revokeLiveAccess);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("licensee_applications")
      .select(
        "user_id, live_status, company_name, company_domain, use_case, expected_volume, billing_email, requested_at, decided_at, decision_note",
      )
      .order("requested_at", { ascending: false, nullsFirst: false });
    setRows((data ?? []) as AccountRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.live_status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.company_name ?? "").toLowerCase().includes(q) ||
        (r.company_domain ?? "").toLowerCase().includes(q) ||
        (r.billing_email ?? "").toLowerCase().includes(q) ||
        (r.use_case ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0, none: 0 };
    for (const r of rows) c[r.live_status]++;
    return c;
  }, [rows]);

  if (adminLoading) {
    return (
      <DashboardLayout title="Admin">
        <div style={{ padding: 32, color: "#6B6B6B", fontSize: 13 }}>Checking access…</div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Admin">
        <div
          style={{
            padding: 24,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            color: "#991B1B",
            fontSize: 13,
          }}
        >
          You don't have access to this page. Admin role required.
        </div>
      </DashboardLayout>
    );
  }

  const handleApprove = async (uid: string) => {
    setBusy(uid);
    try {
      await approveFn({ data: { userId: uid } });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (uid: string) => {
    const note = prompt("Reason for rejection (optional, shown to applicant):") ?? "";
    setBusy(uid);
    try {
      await rejectFn({ data: { userId: uid, note } });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (uid: string) => {
    if (
      !confirm(
        "Revoke live access for this account? All existing live API keys will be revoked immediately.",
      )
    )
      return;
    setBusy(uid);
    try {
      await revokeFn({ data: { userId: uid } });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };


  return (
    <DashboardLayout
      title="Live Access Approvals"
      subtitle="Review live API key requests and gate production traffic per account."
      helpItems={[
        "Approving an account unlocks live key creation for the developer immediately.",
        "Rejecting writes a note that is visible to the applicant on the API Keys page.",
        "Revoking removes live status and revokes every existing live key for that account.",
      ]}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        {(["pending", "approved", "rejected", "none", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${statusFilter === s ? "#EA580C" : "#E5E2DB"}`,
              backgroundColor: statusFilter === s ? "#FFF7ED" : "#fff",
              color: statusFilter === s ? "#EA580C" : "#6B6B6B",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s} ({counts[s]})
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: "6px 10px",
            backgroundColor: "#fff",
          }}
        >
          <Search size={14} color="#9A9A9A" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, email, domain…"
            style={{
              border: "none",
              outline: "none",
              fontSize: 13,
              minWidth: 220,
              backgroundColor: "transparent",
            }}
          />
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
        {loading ? (
          <div style={{ padding: 24, fontSize: 13, color: "#8A8A8A" }}>Loading accounts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <ShieldCheck size={24} color="#9A9A9A" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, color: "#6B6B6B" }}>
              No accounts match the current filter.
            </div>
          </div>
        ) : (
          filtered.map((r) => (
            <AccountRowCard
              key={r.user_id}
              row={r}
              busy={busy === r.user_id}
              onApprove={() => handleApprove(r.user_id)}
              onReject={() => handleReject(r.user_id)}
              onRevoke={() => handleRevoke(r.user_id)}
            />
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusPill({ status }: { status: AccountRow["live_status"] }) {
  const palette: Record<AccountRow["live_status"], { bg: string; fg: string; label: string }> = {
    none: { bg: "#F1F5F9", fg: "#475569", label: "No request" },
    pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
    approved: { bg: "#DCFCE7", fg: "#166534", label: "Approved" },
    rejected: { bg: "#FEE2E2", fg: "#991B1B", label: "Rejected" },
  };
  const p = palette[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: p.bg,
        color: p.fg,
      }}
    >
      {p.label}
    </span>
  );
}

function AccountRowCard({
  row,
  busy,
  onApprove,
  onReject,
  onRevoke,
}: {
  row: AccountRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRevoke: () => void;
}) {
  return (
    <div style={{ padding: 16, borderBottom: "1px solid #F1EDE4" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>
          {row.company_name || "Untitled account"}
        </div>
        <StatusPill status={row.live_status} />
        {row.company_domain && (
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>· {row.company_domain}</span>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 10,
          fontSize: 12,
          color: "#6B6B6B",
        }}
      >
        <KV label="Billing email" value={row.billing_email || "—"} />
        <KV label="Expected volume" value={row.expected_volume || "—"} />
        <KV
          label="Requested"
          value={row.requested_at ? new Date(row.requested_at).toLocaleString() : "—"}
        />
        <KV
          label="Decided"
          value={row.decided_at ? new Date(row.decided_at).toLocaleString() : "—"}
        />
      </div>
      {row.use_case && (
        <div
          style={{
            backgroundColor: "#FAFAF9",
            border: "1px solid #F1EDE4",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12.5,
            color: "#1A1A18",
            marginBottom: 10,
            whiteSpace: "pre-wrap",
          }}
        >
          {row.use_case}
        </div>
      )}
      {row.decision_note && (
        <div
          style={{
            fontSize: 12,
            color: "#6B6B6B",
            marginBottom: 10,
            fontStyle: "italic",
          }}
        >
          Decision note: {row.decision_note}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {row.live_status !== "approved" && (
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            style={btn("#16A34A", "#fff")}
          >
            <Check size={14} /> Approve
          </button>
        )}
        {row.live_status === "pending" && (
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            style={btn("#fff", "#991B1B", "#FECACA")}
          >
            <X size={14} /> Reject
          </button>
        )}
        {row.live_status === "approved" && (
          <button
            type="button"
            onClick={onRevoke}
            disabled={busy}
            style={btn("#fff", "#991B1B", "#FECACA")}
          >
            <RotateCcw size={14} /> Revoke access
          </button>
        )}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#9A9A9A",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: "#1A1A18", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function btn(bg: string, fg: string, border?: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    backgroundColor: bg,
    color: fg,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  };
}
