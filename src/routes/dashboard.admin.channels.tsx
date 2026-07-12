import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wifi } from "lucide-react";
import { getAllChannels, adminRevokeChannel } from "@/server/admin-console.functions";

export const Route = createFileRoute("/dashboard/admin/channels")({
  head: () => ({ meta: [{ title: "Channels | Admin Console | PrizeSkout" }] }),
  component: ChannelsPage,
});

type Channel = {
  account_id: string;
  platform: string;
  status: string;
  connected_at: string | null;
};

const ALL_PLATFORMS = ["talabat", "jahez", "snoonu", "deliveroo", "salla", "foodics", "zid"];

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  connected:     { bg: "#DCFCE7", fg: "#166534" },
  pending:       { bg: "#FEF3C7", fg: "#92400E" },
  error:         { bg: "#FEE2E2", fg: "#991B1B" },
  revoked:       { bg: "#F1F5F9", fg: "#475569" },
  not_connected: { bg: "#F1F5F9", fg: "#475569" },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function ChannelsPage() {
  const fetchChannels = useServerFn(getAllChannels);
  const revokeFn      = useServerFn(adminRevokeChannel);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");
  const [search, setSearch]     = useState("");
  const [busy, setBusy]         = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await (fetchChannels as any)()) as Awaited<ReturnType<typeof getAllChannels>>;
      setChannels(res.channels as Channel[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [fetchChannels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((c) => {
      const pok = platform === "all" || c.platform === platform;
      const sok = !q || c.account_id.toLowerCase().includes(q) || c.platform.includes(q);
      return pok && sok;
    });
  }, [channels, platform, search]);

  const handleRevoke = async (c: Channel) => {
    if (!confirm(`Revoke ${c.platform} connection for ${c.account_id}?`)) return;
    const key = `${c.account_id}:${c.platform}`;
    setBusy(key);
    try {
      await revokeFn({ data: { accountId: c.account_id, platform: c.platform } });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorBox>{error}</ErrorBox>}

      {/* Platform filter + search */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setPlatform("all")}
          style={filterBtn(platform === "all")}
        >
          All platforms
        </button>
        {ALL_PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            style={filterBtn(platform === p)}
          >
            {p}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={searchWrap}>
          <input
            type="search"
            placeholder="Filter by merchant ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInput}
          />
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #E5E2DB", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
          <thead>
            <tr style={{ backgroundColor: "#FAFAF9" }}>
              <Th>Merchant ID</Th>
              <Th>Platform</Th>
              <Th>Status</Th>
              <Th>Connected</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: "#8A8A8A", fontSize: 13 }}>
                  Loading channels…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center" }}>
                  <Wifi size={22} color="#9A9A9A" style={{ display: "block", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, color: "#6B6B6B" }}>
                    No channel connections match the current filter.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.not_connected;
                const key = `${c.account_id}:${c.platform}`;
                return (
                  <tr key={key} style={{ borderTop: i === 0 ? "none" : "1px solid #F1EFE9" }}>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                          fontSize: 12.5,
                          color: "#1A1A18",
                        }}
                      >
                        {c.account_id}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ textTransform: "capitalize", color: "#1A1A18" }}>
                        {c.platform}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: st.bg,
                          color: st.fg,
                          textTransform: "capitalize",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        fontSize: 12,
                        color: "#6B6B6B",
                      }}
                    >
                      {fmt(c.connected_at)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      {c.status !== "revoked" && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(c)}
                          disabled={busy === key}
                          style={dangerBtn}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "#8A8A8A" }}>
        {filtered.length} connection{filtered.length !== 1 ? "s" : ""} shown. No credentials are
        displayed here.
      </div>
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
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
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

const tdStyle: React.CSSProperties = { padding: "11px 14px", fontSize: 13 };

const dangerBtn: React.CSSProperties = {
  padding: "5px 11px",
  border: "1px solid #FECACA",
  borderRadius: 7,
  backgroundColor: "#fff",
  color: "#991B1B",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const filterBtn = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  border: `1px solid ${active ? "#EA580C" : "#E5E2DB"}`,
  backgroundColor: active ? "#FFF7ED" : "#fff",
  color: active ? "#EA580C" : "#6B6B6B",
  cursor: "pointer",
  textTransform: "capitalize",
});

const searchWrap: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #E5E2DB",
  borderRadius: 8,
  padding: "6px 10px",
  backgroundColor: "#fff",
};

const searchInput: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: 13,
  minWidth: 200,
  backgroundColor: "transparent",
};
