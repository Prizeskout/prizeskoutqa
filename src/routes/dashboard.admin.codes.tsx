import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Plus, Copy } from "lucide-react";
import {
  getAllAccessCodes,
  generateAccessCode,
  deleteAccessCode,
} from "@/server/admin-console.functions";

export const Route = createFileRoute("/dashboard/admin/codes")({
  head: () => ({ meta: [{ title: "Access Codes | Admin Console | PrizeSkout" }] }),
  component: CodesPage,
});

type Code = { code: string; merchant_id: string; created_at: string | null };

const REGIONS = ["QA", "SA", "AE", "KW", "BH", "OM"];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function CodesPage() {
  const fetchCodes = useServerFn(getAllAccessCodes);
  const genFn      = useServerFn(generateAccessCode);
  const deleteFn   = useServerFn(deleteAccessCode);

  const [codes, setCodes]       = useState<Code[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [busy, setBusy]         = useState<string | null>(null);
  const [showGen, setShowGen]   = useState(false);
  const [region, setRegion]     = useState("QA");
  const [merchantId, setMid]    = useState("");
  const [genBusy, setGenBusy]   = useState(false);
  const [lastGen, setLastGen]   = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await (fetchCodes as any)()) as Awaited<ReturnType<typeof getAllAccessCodes>>;
      setCodes(res.codes as Code[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [fetchCodes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.merchant_id ?? "").toLowerCase().includes(q),
    );
  }, [codes, search]);

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete code ${code}? This cannot be undone and will prevent the merchant from connecting.`))
      return;
    setBusy(code);
    try {
      await deleteFn({ data: { code } });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    setGenBusy(true);
    try {
      const res = await genFn({ data: { region, merchantId } });
      setLastGen(res.code);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGenBusy(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorBox>{error}</ErrorBox>}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={searchWrap}>
          <input
            type="search"
            placeholder="Search codes or merchant ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInput}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => { setShowGen(!showGen); setLastGen(null); }}
          style={primaryBtn}
        >
          <Plus size={14} /> Generate code
        </button>
      </div>

      {/* Generate panel */}
      {showGen && (
        <div
          style={{
            border: "1px solid #FED7AA",
            backgroundColor: "#FFF7ED",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18", marginBottom: 12 }}>
            Generate access code
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={fieldLabel}>
              Region
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={selectStyle}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label style={fieldLabel}>
              Merchant ID (optional)
              <input
                type="text"
                value={merchantId}
                onChange={(e) => setMid(e.target.value)}
                placeholder="Leave blank to assign later"
                style={inputStyle}
              />
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={genBusy}
              style={{ ...primaryBtn, opacity: genBusy ? 0.6 : 1 }}
            >
              {genBusy ? "Generating…" : "Generate"}
            </button>
          </div>
          {lastGen && (
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                backgroundColor: "#fff",
                border: "1px solid #E5E2DB",
                borderRadius: 8,
              }}
            >
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: "#6B6B6B", display: "block", marginBottom: 2 }}>
                  Generated code
                </span>
                <code
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#EA580C",
                    letterSpacing: "0.04em",
                  }}
                >
                  {lastGen}
                </code>
              </span>
              <button
                type="button"
                onClick={() => copyCode(lastGen)}
                style={iconBtn}
                title="Copy to clipboard"
              >
                <Copy size={14} />
                {copied ? " Copied!" : " Copy"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", border: "1px solid #E5E2DB", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
          <thead>
            <tr style={{ backgroundColor: "#FAFAF9" }}>
              <Th>Code</Th>
              <Th>Merchant ID</Th>
              <Th>Created</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, color: "#8A8A8A", fontSize: 13 }}>
                  Loading codes…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 32, textAlign: "center" }}>
                  <KeyRound size={22} color="#9A9A9A" style={{ display: "block", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, color: "#6B6B6B" }}>No access codes found.</div>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.code} style={{ borderTop: i === 0 ? "none" : "1px solid #F1EFE9" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#EA580C",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {c.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9A9A9A",
                          padding: 2,
                          display: "flex",
                        }}
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 12.5,
                      color: c.merchant_id ? "#1A1A18" : "#9A9A9A",
                    }}
                  >
                    {c.merchant_id || "—"}
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 12,
                      color: "#6B6B6B",
                    }}
                  >
                    {fmt(c.created_at)}
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.code)}
                      disabled={busy === c.code}
                      style={dangerBtn}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "#8A8A8A" }}>
        {filtered.length} code{filtered.length !== 1 ? "s" : ""}. Deleting a code prevents the
        merchant from connecting with it.
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

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  backgroundColor: "#EA580C",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

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

const iconBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  border: "1px solid #E5E2DB",
  borderRadius: 7,
  backgroundColor: "#fff",
  color: "#6B6B6B",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11.5,
  fontWeight: 600,
  color: "#6B6B6B",
};

const selectStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #E5E2DB",
  borderRadius: 6,
  fontSize: 13,
  backgroundColor: "#fff",
  marginTop: 2,
};

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #E5E2DB",
  borderRadius: 6,
  fontSize: 13,
  backgroundColor: "#fff",
  minWidth: 240,
  marginTop: 2,
};

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
  minWidth: 220,
  backgroundColor: "transparent",
};
