import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Users,
  KeyRound,
  Activity,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { getConsoleOverview } from "@/server/licensee-console.functions";

export const Route = createFileRoute("/dashboard/console/")({
  head: () => ({ meta: [{ title: "Console Overview | PrizeSkout" }] }),
  component: ConsoleOverviewPage,
});

type Overview = Awaited<ReturnType<typeof getConsoleOverview>>;

function ConsoleOverviewPage() {
  const fetchOverview = useServerFn(getConsoleOverview);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await (fetchOverview as any)();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  if (loading) {
    return <div style={{ padding: 24, color: "#6B6B6B", fontSize: 13 }}>Loading…</div>;
  }
  if (error) {
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
        {error}
      </div>
    );
  }
  if (!data || !data.licensee) {
    return <div style={{ color: "#6B6B6B", fontSize: 13 }}>No licensee found.</div>;
  }

  const lic = data.licensee;
  const stats = [
    {
      icon: Building2,
      label: "Tenants (accounts)",
      value: data.stats.accountCount,
      sub: `${data.accounts.filter((a) => a.is_default).length} default`,
      to: "/dashboard/console/tenants",
    },
    {
      icon: Users,
      label: "Team members",
      value: data.stats.memberCount,
      sub: `you are ${data.callerRole}`,
      to: "/dashboard/console/team",
    },
    {
      icon: KeyRound,
      label: "Active API keys",
      value: data.stats.activeKeyCount,
      sub: `${data.stats.testKeyCount} test, ${data.stats.liveKeyCount} live`,
      to: "/dashboard/api-keys",
    },
    {
      icon: Activity,
      label: "Recent API calls",
      value: data.recentActivity.length,
      sub: data.recentActivity.length ? "in this session view" : "no activity yet",
      to: "/dashboard/logs",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Licensee summary */}
      <section
        style={{
          border: "1px solid #E5E2DB",
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#FFF7ED",
              border: "1px solid #FED7AA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={18} color="#EA580C" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A18" }}>{lic.name}</div>
            <div style={{ fontSize: 12, color: "#6B6B6B" }}>
              <code style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                {lic.slug}
              </code>{" "}
              · status{" "}
              <span style={{ fontWeight: 600, color: lic.status === "trial" ? "#B45309" : "#1A1A18" }}>
                {lic.status}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <KV label="Contact email" value={lic.contact_email ?? "—"} />
          <KV label="Billing email" value={lic.billing_email ?? "—"} />
          <KV
            label="Created"
            value={new Date(lic.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
        </div>
      </section>

      {/* Stat cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              style={{
                display: "block",
                border: "1px solid #E5E2DB",
                borderRadius: 12,
                padding: 16,
                backgroundColor: "#FFFFFF",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#FED7AA";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E2DB";
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <Icon size={16} color="#6B6B6B" />
                <ArrowUpRight size={14} color="#9A9A9A" />
              </div>
              <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: "#1A1A18" }}>
                {s.value}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#6B6B6B" }}>{s.label}</div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#8A8A8A" }}>{s.sub}</div>
            </Link>
          );
        })}
      </section>

      {/* Accounts list */}
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
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>Tenants</div>
            <div style={{ fontSize: 12, color: "#6B6B6B" }}>
              Operating units under this licensee. Each one has its own catalog and pricing decisions.
            </div>
          </div>
          <Link
            to="/dashboard/console/tenants"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#EA580C",
              textDecoration: "none",
            }}
          >
            Manage →
          </Link>
        </header>
        {data.accounts.length === 0 ? (
          <div style={{ padding: 18, color: "#6B6B6B", fontSize: 13 }}>No accounts yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAFAF9" }}>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Region</Th>
                <Th>Currency</Th>
                <Th>Default</Th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #F1EFE9" }}>
                  <Td bold>{a.name}</Td>
                  <Td mono>{a.slug}</Td>
                  <Td>{a.region ?? "—"}</Td>
                  <Td>{a.currency}</Td>
                  <Td>{a.is_default ? "Yes" : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent activity */}
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
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>Recent API activity</div>
            <div style={{ fontSize: 12, color: "#6B6B6B" }}>
              Last 8 calls scoped to this user. Full history lives in Logs.
            </div>
          </div>
          <Link
            to="/dashboard/logs"
            style={{ fontSize: 12, fontWeight: 600, color: "#EA580C", textDecoration: "none" }}
          >
            View all →
          </Link>
        </header>
        {data.recentActivity.length === 0 ? (
          <div style={{ padding: 18, color: "#6B6B6B", fontSize: 13 }}>
            No requests logged yet. Open the API Explorer and fire a test request to see logs here.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAFAF9" }}>
                <Th>Method</Th>
                <Th>Path</Th>
                <Th>Status</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #F1EFE9" }}>
                  <Td mono bold>{r.method}</Td>
                  <Td mono>{r.path}</Td>
                  <Td>
                    <StatusPill code={r.status_code} />
                  </Td>
                  <Td>{relativeTime(r.occurred_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#8A8A8A",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#1A1A18", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "#6B6B6B",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  bold,
  mono,
}: {
  children: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "10px 14px",
        color: "#1A1A18",
        fontWeight: bold ? 600 : 400,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : undefined,
        fontSize: mono ? 12.5 : 13,
      }}
    >
      {children}
    </td>
  );
}

function StatusPill({ code }: { code: number }) {
  const ok = code >= 200 && code < 300;
  const warn = code >= 300 && code < 500;
  const bg = ok ? "#DCFCE7" : warn ? "#FEF3C7" : "#FEE2E2";
  const fg = ok ? "#166534" : warn ? "#92400E" : "#991B1B";
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: bg,
        color: fg,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 11.5,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      {code}
    </span>
  );
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
