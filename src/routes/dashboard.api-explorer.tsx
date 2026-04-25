import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Play, Copy, Check, KeyRound, Lock, ChevronRight, AlertCircle, FlaskConical } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  API_GROUPS,
  PILLARS,
  getGroupsByPillar,
  type EndpointSpec,
  type GroupSpec,
  type PillarSlug,
} from "@/lib/api-spec";

export const Route = createFileRoute("/dashboard/api-explorer")({
  head: () => ({
    meta: [
      { title: "API Explorer | PrizeSkout" },
      {
        name: "description",
        content:
          "Sandbox API Explorer — pick an endpoint, sign with your sk_test_ key, and run it against the PrizeSkout test-mode dispatcher.",
      },
    ],
  }),
  component: ApiExplorerPage,
});

type ApiKeyRow = {
  id: string;
  name: string;
  mode: "test" | "live";
  key_prefix: string;
  last_four: string;
  revoked_at: string | null;
};

type RunResult = {
  status: number;
  durationMs: number;
  headers: Record<string, string>;
  body: unknown;
  rawText: string;
};

function buildSampleBody(spec: EndpointSpec): string {
  if (!spec.body || spec.body.length === 0) return "";
  const out: Record<string, unknown> = {};
  for (const f of spec.body) {
    if (f.example !== undefined) {
      // Try to parse JSON-ish examples (arrays/objects/numbers/booleans).
      const trimmed = f.example.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          out[f.name] = JSON.parse(trimmed);
          continue;
        } catch {
          // fall through
        }
      }
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        out[f.name] = Number(trimmed);
        continue;
      }
      if (trimmed === "true" || trimmed === "false") {
        out[f.name] = trimmed === "true";
        continue;
      }
      out[f.name] = f.example;
    } else {
      out[f.name] = null;
    }
  }
  return JSON.stringify(out, null, 2);
}

function buildSamplePathParams(spec: EndpointSpec): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of spec.pathParams ?? []) {
    out[p.name] = p.example ?? "";
  }
  return out;
}

function fillPath(path: string, params: Record<string, string>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(params[key] ?? `{${key}}`));
}

function ApiExplorerPage() {
  // ---- Endpoint picker state ----
  const groupsByPillar = useMemo(() => getGroupsByPillar(), []);
  const allEndpoints = useMemo(
    () =>
      API_GROUPS.flatMap((g) =>
        g.endpoints.map((e) => ({ group: g, endpoint: e })),
      ),
    [],
  );
  const [selectedSlug, setSelectedSlug] = useState<string>(
    `${allEndpoints[0]?.group.slug}/${allEndpoints[0]?.endpoint.slug}`,
  );
  const selected = useMemo(() => {
    const [g, e] = selectedSlug.split("/");
    const found = allEndpoints.find((x) => x.group.slug === g && x.endpoint.slug === e);
    return found ?? allEndpoints[0];
  }, [selectedSlug, allEndpoints]);

  // ---- API key state ----
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [revealedKeyId, setRevealedKeyId] = useState<string>("");
  const [pasteSecret, setPasteSecret] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKeysLoading(true);
      const { data } = await supabase
        .from("api_keys")
        .select("id,name,mode,key_prefix,last_four,revoked_at")
        .eq("mode", "test")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as ApiKeyRow[];
      setKeys(rows);
      if (rows[0]) setSelectedKeyId(rows[0].id);
      setKeysLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Request editor state ----
  const [pathParams, setPathParams] = useState<Record<string, string>>(() =>
    buildSamplePathParams(selected.endpoint),
  );
  const [bodyText, setBodyText] = useState<string>(() => buildSampleBody(selected.endpoint));
  const [idemKey, setIdemKey] = useState<string>("");

  // Reset editor when endpoint changes.
  useEffect(() => {
    setPathParams(buildSamplePathParams(selected.endpoint));
    setBodyText(buildSampleBody(selected.endpoint));
    setIdemKey("");
    setResult(null);
    setRunError(null);
  }, [selected]);

  // ---- Run state ----
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResp, setCopiedResp] = useState(false);

  const effectiveSecret = useMemo(() => {
    if (pasteSecret.trim().startsWith("sk_test_")) return pasteSecret.trim();
    if (revealedKeyId && revealedKeyId === selectedKeyId) return pasteSecret.trim();
    return "";
  }, [pasteSecret, revealedKeyId, selectedKeyId]);

  const filledPath = useMemo(() => fillPath(selected.endpoint.path, pathParams), [
    selected.endpoint.path,
    pathParams,
  ]);

  const requiresBody = selected.endpoint.method === "POST" || selected.endpoint.method === "PATCH";
  const requiresIdemKey = selected.endpoint.path === "/v1/sync";

  const curlPreview = useMemo(() => {
    const tokenPlaceholder = effectiveSecret ? effectiveSecret : "$PRIZESKOUT_TEST_KEY";
    const lines = [
      `curl -X ${selected.endpoint.method} \\\n  '${typeof window !== "undefined" ? window.location.origin : "https://prizeskout.qa"}${filledPath}' \\`,
      `  -H 'Authorization: Bearer ${tokenPlaceholder}' \\`,
      `  -H 'Content-Type: application/json'`,
    ];
    if (requiresIdemKey) {
      lines[lines.length - 1] = `  -H 'Content-Type: application/json' \\`;
      lines.push(`  -H 'Idempotency-Key: ${idemKey || "REPLACE_WITH_UNIQUE_KEY"}' \\`);
    }
    if (requiresBody && bodyText.trim()) {
      const last = lines.length - 1;
      if (!lines[last].endsWith("\\")) lines[last] = `${lines[last]} \\`;
      lines.push(`  -d '${bodyText.replace(/'/g, "'\\''")}'`);
    }
    return lines.join("\n");
  }, [selected.endpoint.method, filledPath, effectiveSecret, bodyText, requiresBody, requiresIdemKey, idemKey]);

  const handleRun = async () => {
    if (running) return;
    setRunError(null);
    setResult(null);

    if (!effectiveSecret) {
      setRunError(
        "Paste a test secret to run. Lovable Cloud only stores a one-way hash of your key; it can't be re-displayed automatically. Generate a fresh key from API Keys if you don't have it saved.",
      );
      return;
    }

    if (requiresIdemKey && !idemKey.trim()) {
      setRunError("Idempotency-Key is required for /v1/sync.");
      return;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${effectiveSecret}`,
      "Content-Type": "application/json",
    };
    if (requiresIdemKey) headers["Idempotency-Key"] = idemKey.trim();

    let body: BodyInit | undefined;
    if (requiresBody && bodyText.trim()) {
      try {
        // Validate it's parseable JSON before sending.
        JSON.parse(bodyText);
      } catch (e) {
        setRunError(`Request body is not valid JSON: ${(e as Error).message}`);
        return;
      }
      body = bodyText;
    }

    setRunning(true);
    const start = performance.now();
    try {
      const res = await fetch(filledPath, {
        method: selected.endpoint.method,
        headers,
        body,
      });
      const duration = Math.round(performance.now() - start);
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // leave as raw text
      }
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        respHeaders[k] = v;
      });
      setResult({
        status: res.status,
        durationMs: duration,
        headers: respHeaders,
        body: parsed,
        rawText: text,
      });
    } catch (e) {
      setRunError((e as Error).message || "Request failed");
    } finally {
      setRunning(false);
    }
  };

  const copy = async (text: string, which: "curl" | "resp") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
    if (which === "curl") {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 1200);
    } else {
      setCopiedResp(true);
      setTimeout(() => setCopiedResp(false), 1200);
    }
  };

  return (
    <DashboardLayout
      title="API Explorer"
      subtitle="Build and run sandbox requests against any v1 endpoint. Every call is signed with your sk_test_ key, routed through the test-mode dispatcher, and logged in Usage."
      helpItems={[
        "Test-mode keys never touch live data. Sample responses come from the documented spec; new vertical-slice endpoints (sync, margin, dynprice, webhooks/enrich) hit real per-account Postgres tables seeded for you.",
        "Lovable Cloud stores a one-way hash of every key. To run, paste your sk_test_ secret here once per session — it is held in memory only.",
        "Use the cURL preview to copy the request into your terminal or a CI runner.",
      ]}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
        className="api-explorer-grid"
      >
        {/* ---------------- LEFT: ENDPOINT PICKER ---------------- */}
        <aside
          style={{
            backgroundColor: "#fff",
            border: "1px solid #E5E2DB",
            borderRadius: 12,
            padding: 12,
            position: "sticky",
            top: 16,
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#6B6B6B",
              padding: "4px 6px 8px",
            }}
          >
            Endpoints
          </div>
          {(Object.keys(PILLARS) as PillarSlug[]).map((pillarSlug) => {
            const groups: GroupSpec[] = groupsByPillar[pillarSlug] ?? [];
            if (groups.length === 0) return null;
            const pillar = PILLARS[pillarSlug];
            return (
              <div key={pillarSlug} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1A1A18",
                    padding: "8px 6px 4px",
                  }}
                >
                  {pillar.name}
                </div>
                {groups.map((g) => (
                  <div key={g.slug} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: "#8A8A8A", padding: "4px 6px" }}>{g.name}</div>
                    {g.endpoints.map((e) => {
                      const slug = `${g.slug}/${e.slug}`;
                      const active = slug === selectedSlug;
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => setSelectedSlug(slug)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "none",
                            textAlign: "left",
                            backgroundColor: active ? "#FFF7ED" : "transparent",
                            color: active ? "#9A3412" : "#1A1A18",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: active ? 600 : 500,
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                            <MethodChip method={e.method} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.title}
                            </span>
                          </span>
                          {active && <ChevronRight size={12} aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </aside>

        {/* ---------------- RIGHT: REQUEST + RESPONSE ---------------- */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Endpoint header */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #E5E2DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <MethodChip method={selected.endpoint.method} large />
              <code
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 13,
                  color: "#1A1A18",
                  backgroundColor: "#FAFAF9",
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #E5E2DB",
                }}
              >
                {selected.endpoint.path}
              </code>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18", marginBottom: 4 }}>
              {selected.endpoint.title}
            </div>
            <div style={{ fontSize: 12.5, color: "#6B6B6B", lineHeight: 1.5 }}>
              {selected.endpoint.summary}
            </div>
            {selected.endpoint.scopes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {selected.endpoint.scopes.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#3730A3",
                      backgroundColor: "#EEF2FF",
                      border: "1px solid #C7D2FE",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Auth: choose key + paste secret */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #E5E2DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <KeyRound size={14} color="#6B6B6B" />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Authentication</div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#78350F",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginLeft: "auto",
                }}
              >
                <FlaskConical size={10} style={{ display: "inline", marginRight: 3, verticalAlign: "-1px" }} />
                Test mode only
              </span>
            </div>

            {keysLoading ? (
              <div style={{ fontSize: 12, color: "#8A8A8A" }}>Loading your test keys…</div>
            ) : keys.length === 0 ? (
              <div
                style={{
                  fontSize: 12.5,
                  color: "#92400E",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                No active test keys. Create one from{" "}
                <a href="/dashboard/api-keys" style={{ color: "#9A3412", fontWeight: 600 }}>
                  API Keys
                </a>{" "}
                first.
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 11.5, color: "#6B6B6B", marginBottom: 4 }}>
                  Test key
                </label>
                <select
                  value={selectedKeyId}
                  onChange={(e) => {
                    setSelectedKeyId(e.target.value);
                    setRevealedKeyId("");
                    setPasteSecret("");
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #E5E2DB",
                    borderRadius: 6,
                    fontSize: 13,
                    backgroundColor: "#fff",
                    marginBottom: 10,
                  }}
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} — {k.key_prefix}_…{k.last_four}
                    </option>
                  ))}
                </select>

                <label style={{ display: "block", fontSize: 11.5, color: "#6B6B6B", marginBottom: 4 }}>
                  Paste full secret (held in memory only)
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                  <input
                    type={revealedKeyId === selectedKeyId ? "text" : "password"}
                    value={pasteSecret}
                    onChange={(e) => setPasteSecret(e.target.value)}
                    placeholder="sk_test_..."
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedKeyId(revealedKeyId === selectedKeyId ? "" : selectedKeyId)
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      background: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                      color: "#6B6B6B",
                    }}
                  >
                    {revealedKeyId === selectedKeyId ? "Hide" : "Reveal"}
                  </button>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#8A8A8A", marginTop: 6 }}>
                  <Lock size={11} />
                  PrizeSkout stores only a SHA-256 hash. We can't display the secret again.
                </div>
              </>
            )}
          </div>

          {/* Request editor */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #E5E2DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Request</div>

            {/* Path params */}
            {(selected.endpoint.pathParams ?? []).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, color: "#6B6B6B", marginBottom: 6 }}>Path params</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {(selected.endpoint.pathParams ?? []).map((p) => (
                    <div key={p.name} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, alignItems: "center" }}>
                      <code style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, monospace", color: "#9A3412" }}>
                        {p.name}
                      </code>
                      <input
                        type="text"
                        value={pathParams[p.name] ?? ""}
                        onChange={(e) => setPathParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                        placeholder={p.example ?? p.description}
                        style={{
                          padding: "6px 8px",
                          border: "1px solid #E5E2DB",
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Idempotency key for /v1/sync */}
            {requiresIdemKey && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, color: "#6B6B6B", marginBottom: 6 }}>
                  Idempotency-Key (required)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={idemKey}
                    onChange={(e) => setIdemKey(e.target.value)}
                    placeholder="A unique value per logical batch (e.g. UUID)"
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setIdemKey(
                        typeof crypto !== "undefined" && "randomUUID" in crypto
                          ? crypto.randomUUID()
                          : `idem_${Math.random().toString(36).slice(2, 14)}`,
                      )
                    }
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      background: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                      color: "#6B6B6B",
                    }}
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            {requiresBody && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11.5, color: "#6B6B6B" }}>JSON body</div>
                  <button
                    type="button"
                    onClick={() => setBodyText(buildSampleBody(selected.endpoint))}
                    style={{
                      padding: "2px 8px",
                      border: "1px solid #E5E2DB",
                      borderRadius: 4,
                      background: "#fff",
                      fontSize: 11,
                      cursor: "pointer",
                      color: "#6B6B6B",
                    }}
                  >
                    Reset to example
                  </button>
                </div>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={Math.min(20, Math.max(6, bodyText.split("\n").length + 1))}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #E5E2DB",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    color: "#1A1A18",
                    backgroundColor: "#FAFAF9",
                    resize: "vertical",
                  }}
                />
              </div>
            )}

            {/* Run + cURL preview */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleRun}
                disabled={running || keys.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: running ? "#FB923C" : "#EA580C",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: running || keys.length === 0 ? "not-allowed" : "pointer",
                  opacity: keys.length === 0 ? 0.6 : 1,
                }}
              >
                <Play size={13} />
                {running ? "Running…" : "Run request"}
              </button>
              <button
                type="button"
                onClick={() => copy(curlPreview, "curl")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 14px",
                  border: "1px solid #E5E2DB",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#1A1A18",
                }}
              >
                {copiedCurl ? <Check size={13} /> : <Copy size={13} />}
                {copiedCurl ? "Copied" : "Copy as cURL"}
              </button>
            </div>

            {runError && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #FCA5A5",
                  backgroundColor: "#FEF2F2",
                  color: "#991B1B",
                  fontSize: 12.5,
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{runError}</span>
              </div>
            )}
          </div>

          {/* cURL preview */}
          <div
            style={{
              backgroundColor: "#0B0B0B",
              borderRadius: 12,
              padding: 14,
              color: "#E5E2DB",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9A9A9A", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              cURL
            </div>
            <pre
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: "#E5E2DB",
                margin: 0,
              }}
            >
              {curlPreview}
            </pre>
          </div>

          {/* Response */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #E5E2DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Response</div>
                {result && <StatusChip status={result.status} />}
                {result && (
                  <span style={{ fontSize: 11, color: "#8A8A8A" }}>{result.durationMs} ms</span>
                )}
              </div>
              {result && (
                <button
                  type="button"
                  onClick={() => copy(result.rawText, "resp")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    border: "1px solid #E5E2DB",
                    borderRadius: 6,
                    background: "#fff",
                    fontSize: 11.5,
                    cursor: "pointer",
                    color: "#6B6B6B",
                  }}
                >
                  {copiedResp ? <Check size={12} /> : <Copy size={12} />}
                  {copiedResp ? "Copied" : "Copy body"}
                </button>
              )}
            </div>
            {!result ? (
              <div style={{ fontSize: 12.5, color: "#8A8A8A" }}>
                Run a request to see the response body, status, and headers here.
              </div>
            ) : (
              <>
                <pre
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "#1A1A18",
                    backgroundColor: "#FAFAF9",
                    border: "1px solid #E5E2DB",
                    borderRadius: 8,
                    padding: 12,
                    overflow: "auto",
                    maxHeight: 480,
                    margin: 0,
                  }}
                >
                  {typeof result.body === "string"
                    ? result.body
                    : JSON.stringify(result.body, null, 2)}
                </pre>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: 12, color: "#6B6B6B", cursor: "pointer" }}>
                    Response headers
                  </summary>
                  <pre
                    style={{
                      marginTop: 8,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: "#6B6B6B",
                      backgroundColor: "#FAFAF9",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      padding: 10,
                      overflow: "auto",
                      maxHeight: 200,
                    }}
                  >
                    {Object.entries(result.headers)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                  </pre>
                </details>
              </>
            )}
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .api-explorer-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .api-explorer-grid > aside { position: relative !important; max-height: 320px !important; top: 0 !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}

function MethodChip({ method, large = false }: { method: string; large?: boolean }) {
  const palette: Record<string, { bg: string; fg: string }> = {
    GET: { bg: "#DBEAFE", fg: "#1E3A8A" },
    POST: { bg: "#DCFCE7", fg: "#14532D" },
    PATCH: { bg: "#FEF3C7", fg: "#78350F" },
    DELETE: { bg: "#FEE2E2", fg: "#7F1D1D" },
  };
  const c = palette[method] ?? { bg: "#E5E2DB", fg: "#1A1A18" };
  return (
    <span
      style={{
        fontSize: large ? 11 : 10,
        fontWeight: 700,
        backgroundColor: c.bg,
        color: c.fg,
        padding: large ? "3px 8px" : "2px 6px",
        borderRadius: 4,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        letterSpacing: "0.04em",
      }}
    >
      {method}
    </span>
  );
}

function StatusChip({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  const partial = status === 207;
  const clientErr = status >= 400 && status < 500;
  const bg = ok ? "#DCFCE7" : partial ? "#FEF3C7" : clientErr ? "#FEE2E2" : "#FEE2E2";
  const fg = ok ? "#14532D" : partial ? "#78350F" : "#7F1D1D";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        backgroundColor: bg,
        color: fg,
        padding: "2px 8px",
        borderRadius: 4,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
      }}
    >
      {status}
    </span>
  );
}
