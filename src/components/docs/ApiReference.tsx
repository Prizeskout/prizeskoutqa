// Three-pane API reference UI.
// Left: grouped endpoint nav with search.
// Center: endpoint detail (auth, params, body, responses, errors, notes).
// Right: cURL/JS request examples + sample response + live "Try it out".

import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, Copy, Check, Play, Loader2, Lock, Menu, X } from "lucide-react";
import {
  API_GROUPS,
  API_BASE_URL,
  type EndpointSpec,
  type GroupSpec,
  type FieldSpec,
} from "@/lib/api-spec";

const FONT_MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

const METHOD_COLORS: Record<EndpointSpec["method"], { bg: string; fg: string }> = {
  GET: { bg: "rgba(34, 197, 94, 0.10)", fg: "#16A34A" },
  POST: { bg: "rgba(59, 130, 246, 0.10)", fg: "#2563EB" },
  PATCH: { bg: "rgba(234, 179, 8, 0.10)", fg: "#CA8A04" },
  DELETE: { bg: "rgba(239, 68, 68, 0.10)", fg: "#DC2626" },
};

function MethodBadge({ method, size = "sm" }: { method: EndpointSpec["method"]; size?: "sm" | "md" }) {
  const c = METHOD_COLORS[method];
  return (
    <span
      style={{
        display: "inline-block",
        padding: size === "md" ? "4px 8px" : "2px 6px",
        background: c.bg,
        color: c.fg,
        fontSize: size === "md" ? 11 : 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        borderRadius: 4,
        fontFamily: FONT_MONO,
        minWidth: size === "md" ? 56 : 44,
        textAlign: "center",
      }}
    >
      {method}
    </span>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: "transparent",
        border: "1px solid #2A2A2A",
        borderRadius: 6,
        color: "#9A9A9A",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function buildCurl(spec: EndpointSpec, apiKey: string) {
  const path = spec.path.replace(/\{(\w+)\}/g, (_, n) => spec.pathParams?.find((p) => p.name === n)?.example ?? `{${n}}`);
  const lines = [`curl -X ${spec.method} "${API_BASE_URL}${path}" \\`, `  -H "Authorization: Bearer ${apiKey}"`];
  if (spec.body && spec.body.length > 0) {
    const body: Record<string, unknown> = {};
    spec.body.forEach((f) => {
      if (f.example !== undefined) {
        const num = Number(f.example);
        body[f.name] = !Number.isNaN(num) && /^\d+(\.\d+)?$/.test(f.example) ? num : f.example;
      }
    });
    lines[1] += ` \\`;
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '${JSON.stringify(body)}'`);
  }
  return lines.join("\n");
}

function buildJs(spec: EndpointSpec, apiKey: string) {
  const path = spec.path.replace(/\{(\w+)\}/g, (_, n) => spec.pathParams?.find((p) => p.name === n)?.example ?? `{${n}}`);
  const hasBody = spec.body && spec.body.length > 0;
  const bodyObj: Record<string, unknown> = {};
  if (hasBody) {
    spec.body!.forEach((f) => {
      if (f.example !== undefined) {
        const num = Number(f.example);
        bodyObj[f.name] = !Number.isNaN(num) && /^\d+(\.\d+)?$/.test(f.example) ? num : f.example;
      }
    });
  }
  return `const res = await fetch("${API_BASE_URL}${path}", {
  method: "${spec.method}",
  headers: {
    "Authorization": "Bearer ${apiKey}",${hasBody ? `\n    "Content-Type": "application/json",` : ""}
  },${hasBody ? `\n  body: JSON.stringify(${JSON.stringify(bodyObj, null, 2).replace(/\n/g, "\n  ")}),` : ""}
});
const data = await res.json();
console.log(data);`;
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function ApiReference() {
  const [selected, setSelected] = useState<{ group: string; endpoint: string }>({
    group: API_GROUPS[0].slug,
    endpoint: API_GROUPS[0].endpoints[0].slug,
  });
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(API_GROUPS.map((g) => [g.slug, true])),
  );
  const [tab, setTab] = useState<"curl" | "js">("curl");
  const [apiKey, setApiKey] = useState("sk_test_YOUR_KEY");
  const [tryStatus, setTryStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [tryResponse, setTryResponse] = useState<{ status: number; body: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Read deep link from hash
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (!h) return;
      const [g, e] = h.split("/");
      const grp = API_GROUPS.find((x) => x.slug === g);
      const ep = grp?.endpoints.find((x) => x.slug === e);
      if (grp && ep) setSelected({ group: g, endpoint: e });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // Keep hash in sync
  useEffect(() => {
    const target = `#${selected.group}/${selected.endpoint}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
    setTryResponse(null);
    setTryStatus("idle");
  }, [selected]);

  // Restore key from local storage
  useEffect(() => {
    const k = localStorage.getItem("ps_docs_test_key");
    if (k) setApiKey(k);
  }, []);
  useEffect(() => {
    if (apiKey && apiKey !== "sk_test_YOUR_KEY") {
      localStorage.setItem("ps_docs_test_key", apiKey);
    }
  }, [apiKey]);

  const current = useMemo(() => {
    const group = API_GROUPS.find((g) => g.slug === selected.group) ?? API_GROUPS[0];
    const endpoint = group.endpoints.find((e) => e.slug === selected.endpoint) ?? group.endpoints[0];
    return { group, endpoint };
  }, [selected]);

  const filteredGroups = useMemo<GroupSpec[]>(() => {
    if (!search.trim()) return API_GROUPS;
    const q = search.toLowerCase();
    return API_GROUPS.map((g) => ({
      ...g,
      endpoints: g.endpoints.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.path.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q),
      ),
    })).filter((g) => g.endpoints.length > 0);
  }, [search]);

  const handleTryIt = async () => {
    if (!apiKey || apiKey === "sk_test_YOUR_KEY") {
      setTryResponse({ status: 0, body: "Paste a test API key (sk_test_...) above to run this request." });
      setTryStatus("error");
      return;
    }
    setTryStatus("loading");
    setTryResponse(null);
    try {
      const path = current.endpoint.path.replace(/\/v1\//, "/api/public/v1/").replace(/\{(\w+)\}/g, (_, n) => {
        return current.endpoint.pathParams?.find((p) => p.name === n)?.example ?? "demo";
      });
      const init: RequestInit = {
        method: current.endpoint.method,
        headers: { Authorization: `Bearer ${apiKey}` },
      };
      if (current.endpoint.body && current.endpoint.body.length > 0) {
        const body: Record<string, unknown> = {};
        current.endpoint.body.forEach((f) => {
          if (f.example !== undefined) {
            const num = Number(f.example);
            body[f.name] = !Number.isNaN(num) && /^\d+(\.\d+)?$/.test(f.example) ? num : f.example;
          }
        });
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }
      const res = await fetch(path, init);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not json
      }
      setTryResponse({ status: res.status, body: pretty });
      setTryStatus(res.ok ? "done" : "error");
    } catch (err) {
      setTryResponse({ status: 0, body: err instanceof Error ? err.message : "Request failed" });
      setTryStatus("error");
    }
  };

  const codeText = tab === "curl" ? buildCurl(current.endpoint, apiKey) : buildJs(current.endpoint, apiKey);

  return (
    <div
      style={{
        background: "#FAFAFA",
        minHeight: "calc(100vh - 64px)",
        color: "#1A1A18",
      }}
    >
      <style>{`
        .docs-grid { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 900px) { .docs-grid { grid-template-columns: 280px 1fr; } }
        @media (min-width: 1280px) { .docs-grid { grid-template-columns: 280px 1fr 480px; } }
        .docs-sidebar-mobile { display: block; }
        @media (min-width: 900px) { .docs-sidebar-mobile { display: none !important; } }
        .docs-sidebar-desktop { display: none; }
        @media (min-width: 900px) { .docs-sidebar-desktop { display: block !important; } }
        .docs-rightpane-bottom { display: block; }
        @media (min-width: 1280px) { .docs-rightpane-bottom { display: none !important; } }
        .docs-rightpane-side { display: none; }
        @media (min-width: 1280px) { .docs-rightpane-side { display: block !important; } }
      `}</style>

      {/* Mobile nav toggle */}
      <div
        className="docs-sidebar-mobile"
        style={{ borderBottom: "1px solid #E8E8E5", padding: "10px 16px", background: "#FFF" }}
      >
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "#F4F4F2",
            border: "1px solid #E8E8E5",
            borderRadius: 6,
            color: "#1A1A18",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {mobileNavOpen ? <X size={14} /> : <Menu size={14} />} Endpoints
        </button>
      </div>

      <div className="docs-grid">
        {/* SIDEBAR */}
        <SidebarPane
          desktop
          search={search}
          setSearch={setSearch}
          filteredGroups={filteredGroups}
          openGroups={openGroups}
          setOpenGroups={setOpenGroups}
          selected={selected}
          setSelected={setSelected}
        />
        {mobileNavOpen && (
          <SidebarPane
            search={search}
            setSearch={setSearch}
            filteredGroups={filteredGroups}
            openGroups={openGroups}
            setOpenGroups={setOpenGroups}
            selected={selected}
            setSelected={(s) => {
              setSelected(s);
              setMobileNavOpen(false);
            }}
          />
        )}

        {/* CENTER */}
        <main style={{ padding: "32px 28px 80px", maxWidth: 760, margin: "0 auto", width: "100%" }}>
          <EndpointDetail group={current.group} endpoint={current.endpoint} />

          {/* Right pane shown inline below content on smaller screens */}
          <div className="docs-rightpane-bottom" style={{ marginTop: 32 }}>
            <RightPane
              endpoint={current.endpoint}
              apiKey={apiKey}
              setApiKey={setApiKey}
              tab={tab}
              setTab={setTab}
              codeText={codeText}
              tryStatus={tryStatus}
              tryResponse={tryResponse}
              onTry={handleTryIt}
            />
          </div>
        </main>

        {/* RIGHT (sticky on wide screens) */}
        <aside
          className="docs-rightpane-side"
          style={{
            background: "#0A0A0A",
            color: "#E5E5E2",
            borderLeft: "1px solid #1A1A1A",
            position: "sticky",
            top: 64,
            alignSelf: "start",
            height: "calc(100vh - 64px)",
            overflowY: "auto",
          }}
        >
          <RightPane
            endpoint={current.endpoint}
            apiKey={apiKey}
            setApiKey={setApiKey}
            tab={tab}
            setTab={setTab}
            codeText={codeText}
            tryStatus={tryStatus}
            tryResponse={tryResponse}
            onTry={handleTryIt}
          />
        </aside>
      </div>
    </div>
  );
}

// ---------- Sidebar ----------

function SidebarPane({
  desktop,
  search,
  setSearch,
  filteredGroups,
  openGroups,
  setOpenGroups,
  selected,
  setSelected,
}: {
  desktop?: boolean;
  search: string;
  setSearch: (v: string) => void;
  filteredGroups: GroupSpec[];
  openGroups: Record<string, boolean>;
  setOpenGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selected: { group: string; endpoint: string };
  setSelected: (s: { group: string; endpoint: string }) => void;
}) {
  return (
    <aside
      className={desktop ? "docs-sidebar-desktop" : ""}
      style={{
        background: "#FFFFFF",
        borderRight: "1px solid #E8E8E5",
        padding: "20px 14px 60px",
        position: desktop ? "sticky" : "static",
        top: desktop ? 64 : undefined,
        alignSelf: "start",
        height: desktop ? "calc(100vh - 64px)" : "auto",
        overflowY: "auto",
      }}
    >
      <div style={{ position: "relative", marginBottom: 18 }}>
        <Search
          size={14}
          style={{ position: "absolute", top: 10, left: 10, color: "#9A9A9A", pointerEvents: "none" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search endpoints..."
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            background: "#F4F4F2",
            border: "1px solid #E8E8E5",
            borderRadius: 6,
            fontSize: 13,
            color: "#1A1A18",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#8A8A8A",
          padding: "0 8px 8px",
        }}
      >
        API Reference
      </div>

      {filteredGroups.map((group) => (
        <div key={group.slug} style={{ marginBottom: 4 }}>
          <button
            onClick={() => setOpenGroups((s) => ({ ...s, [group.slug]: !s[group.slug] }))}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "8px 8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#1A1A18",
              fontFamily: "inherit",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {group.name}
              <span style={{ fontSize: 11, color: "#8A8A8A", fontWeight: 500 }}>{group.endpoints.length}</span>
            </span>
            <ChevronDown
              size={14}
              style={{
                color: "#8A8A8A",
                transform: openGroups[group.slug] ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 0.15s",
              }}
            />
          </button>
          {openGroups[group.slug] && (
            <div style={{ paddingLeft: 4, marginBottom: 6 }}>
              {group.endpoints.map((ep) => {
                const active = selected.group === group.slug && selected.endpoint === ep.slug;
                return (
                  <button
                    key={ep.slug}
                    onClick={() => setSelected({ group: group.slug, endpoint: ep.slug })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "7px 8px",
                      background: active ? "rgba(234, 88, 12, 0.08)" : "transparent",
                      border: "none",
                      borderLeft: active ? "2px solid #EA580C" : "2px solid transparent",
                      cursor: "pointer",
                      fontSize: 12.5,
                      color: active ? "#1A1A18" : "#5A5A58",
                      fontWeight: active ? 600 : 500,
                      textAlign: "left",
                      fontFamily: "inherit",
                      borderRadius: 0,
                    }}
                  >
                    <MethodBadge method={ep.method} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ep.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}

// ---------- Center detail ----------

function FieldsTable({ fields, title }: { fields: FieldSpec[]; title: string }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#1A1A18" }}>{title}</h3>
      <div style={{ border: "1px solid #E8E8E5", borderRadius: 8, overflow: "hidden", background: "#FFF" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 120px 90px 1fr",
            padding: "9px 14px",
            background: "#F8F8F6",
            borderBottom: "1px solid #E8E8E5",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6B6B6B",
          }}
        >
          <div>Field</div>
          <div>Type</div>
          <div>Required</div>
          <div>Description</div>
        </div>
        {fields.map((f, i) => (
          <div
            key={f.name}
            style={{
              display: "grid",
              gridTemplateColumns: "160px 120px 90px 1fr",
              padding: "12px 14px",
              borderBottom: i === fields.length - 1 ? "none" : "1px solid #F0F0EE",
              fontSize: 13,
              alignItems: "start",
            }}
          >
            <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: "#1A1A18", fontWeight: 600 }}>{f.name}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#6B6B6B" }}>{f.type}</div>
            <div>
              {f.required ? (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 7px",
                    background: "rgba(239, 68, 68, 0.10)",
                    color: "#DC2626",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 4,
                  }}
                >
                  required
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#9A9A9A" }}>optional</span>
              )}
            </div>
            <div style={{ color: "#3A3A38", lineHeight: 1.5 }}>
              {f.description}
              {f.example && (
                <div style={{ marginTop: 4, fontSize: 11.5, color: "#8A8A8A" }}>
                  e.g. <code style={{ fontFamily: FONT_MONO }}>{f.example}</code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EndpointDetail({ group, endpoint }: { group: GroupSpec; endpoint: EndpointSpec }) {
  return (
    <article>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8A8A", marginBottom: 8 }}>
        {group.name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <MethodBadge method={endpoint.method} size="md" />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A18", letterSpacing: "-0.01em", margin: 0 }}>
          {endpoint.title}
        </h1>
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          background: "#F4F4F2",
          border: "1px solid #E8E8E5",
          borderRadius: 6,
          fontFamily: FONT_MONO,
          fontSize: 12.5,
          color: "#1A1A18",
          marginBottom: 18,
        }}
      >
        <MethodBadge method={endpoint.method} />
        <span>{endpoint.path}</span>
      </div>

      <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#3A3A38", marginBottom: 28 }}>{endpoint.summary}</p>
      {endpoint.description && (
        <p style={{ fontSize: 14, lineHeight: 1.65, color: "#3A3A38", marginBottom: 28 }}>{endpoint.description}</p>
      )}

      {/* Auth */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "#1A1A18" }}>Authentication</h3>
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(234, 88, 12, 0.05)",
            border: "1px solid rgba(234, 88, 12, 0.18)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Lock size={14} color="#EA580C" />
            <span style={{ fontWeight: 600, fontSize: 13.5, color: "#1A1A18" }}>Bearer token</span>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: "#3A3A38" }}>
            Authorization: Bearer &lt;your_api_key&gt;
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: "#5A5A58" }}>
            Required scope{endpoint.scopes.length > 1 ? "s" : ""}:{" "}
            {endpoint.scopes.map((s, i) => (
              <span key={s}>
                <code
                  style={{
                    fontFamily: FONT_MONO,
                    background: "#FFF",
                    border: "1px solid #E8E8E5",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: 11.5,
                  }}
                >
                  {s}
                </code>
                {i < endpoint.scopes.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </section>

      {endpoint.pathParams && endpoint.pathParams.length > 0 && (
        <FieldsTable title="Path parameters" fields={endpoint.pathParams} />
      )}
      {endpoint.queryParams && endpoint.queryParams.length > 0 && (
        <FieldsTable title="Query parameters" fields={endpoint.queryParams} />
      )}
      {endpoint.body && endpoint.body.length > 0 && <FieldsTable title="Request body" fields={endpoint.body} />}

      {/* Responses */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#1A1A18" }}>Responses</h3>
        {endpoint.responses.map((r) => (
          <div key={r.status} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  background: r.status >= 200 && r.status < 300 ? "rgba(34, 197, 94, 0.10)" : "rgba(239, 68, 68, 0.10)",
                  color: r.status >= 200 && r.status < 300 ? "#16A34A" : "#DC2626",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: FONT_MONO,
                  borderRadius: 4,
                }}
              >
                {r.status}
              </span>
              <span style={{ fontSize: 13, color: "#3A3A38", fontWeight: 500 }}>{r.label}</span>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "14px 16px",
                background: "#0A0A0A",
                color: "#E5E5E2",
                fontFamily: FONT_MONO,
                fontSize: 12,
                lineHeight: 1.6,
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 380,
              }}
            >
              {pretty(r.example)}
            </pre>
          </div>
        ))}
      </section>

      {endpoint.notes && endpoint.notes.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "#1A1A18" }}>Important notes</h3>
          <div
            style={{
              padding: "14px 16px",
              background: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.18)",
              borderRadius: 8,
            }}
          >
            <ul style={{ margin: 0, paddingLeft: 20, color: "#3A3A38", fontSize: 13.5, lineHeight: 1.65 }}>
              {endpoint.notes.map((n, i) => (
                <li key={i} style={{ marginBottom: i === endpoint.notes!.length - 1 ? 0 : 6 }}>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {endpoint.errors && endpoint.errors.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#1A1A18" }}>Errors</h3>
          <div style={{ border: "1px solid #E8E8E5", borderRadius: 8, overflow: "hidden", background: "#FFF" }}>
            {endpoint.errors.map((er, i) => (
              <div
                key={er.status + er.code}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 160px 1fr",
                  padding: "10px 14px",
                  borderBottom: i === endpoint.errors!.length - 1 ? "none" : "1px solid #F0F0EE",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#DC2626",
                  }}
                >
                  {er.status}
                </span>
                <code style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#1A1A18" }}>{er.code}</code>
                <span style={{ color: "#3A3A38" }}>{er.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

// ---------- Right pane ----------

function RightPane({
  endpoint,
  apiKey,
  setApiKey,
  tab,
  setTab,
  codeText,
  tryStatus,
  tryResponse,
  onTry,
}: {
  endpoint: EndpointSpec;
  apiKey: string;
  setApiKey: (v: string) => void;
  tab: "curl" | "js";
  setTab: (v: "curl" | "js") => void;
  codeText: string;
  tryStatus: "idle" | "loading" | "done" | "error";
  tryResponse: { status: number; body: string } | null;
  onTry: () => void;
}) {
  const sample = endpoint.responses[0];
  return (
    <div style={{ padding: "20px 18px" }}>
      {/* Test key input */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            display: "block",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6B6B6B",
            marginBottom: 6,
          }}
        >
          Test API key
        </label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_test_..."
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 6,
            color: "#FAFAF9",
            fontFamily: FONT_MONO,
            fontSize: 12,
            outline: "none",
          }}
        />
        <div style={{ fontSize: 10.5, color: "#8A8A8A", marginTop: 6, lineHeight: 1.5 }}>
          Mint a test key in Dashboard → API Keys. Test mode never touches real account data.
        </div>
      </div>

      {/* Request */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#8A8A8A",
          }}
        >
          Request
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", background: "#1A1A1A", borderRadius: 6, padding: 2 }}>
            {(["curl", "js"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  background: tab === t ? "#2A2A2A" : "transparent",
                  color: tab === t ? "#FAFAF9" : "#8A8A8A",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t === "curl" ? "cURL" : "JavaScript"}
              </button>
            ))}
          </div>
          <CopyButton text={codeText} />
        </div>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 14,
          background: "#050505",
          border: "1px solid #1A1A1A",
          borderRadius: 8,
          fontFamily: FONT_MONO,
          fontSize: 11.5,
          lineHeight: 1.6,
          color: "#E5E5E2",
          overflow: "auto",
          maxHeight: 220,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {codeText}
      </pre>

      {/* Try it out */}
      <button
        onClick={onTry}
        disabled={tryStatus === "loading"}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "10px 14px",
          background: "linear-gradient(135deg, #EA580C, #C2410C)",
          border: "none",
          borderRadius: 8,
          color: "#FFF",
          fontSize: 13,
          fontWeight: 600,
          cursor: tryStatus === "loading" ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "inherit",
          opacity: tryStatus === "loading" ? 0.7 : 1,
        }}
      >
        {tryStatus === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} />}
        {tryStatus === "loading" ? "Running..." : "Try it out"}
      </button>

      {/* Response */}
      <div style={{ marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#8A8A8A",
            }}
          >
            Response
          </div>
          {tryResponse ? (
            <span
              style={{
                padding: "2px 7px",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: FONT_MONO,
                background:
                  tryResponse.status >= 200 && tryResponse.status < 300
                    ? "rgba(34, 197, 94, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                color: tryResponse.status >= 200 && tryResponse.status < 300 ? "#22C55E" : "#EF4444",
                borderRadius: 4,
              }}
            >
              {tryResponse.status || "ERR"}
            </span>
          ) : (
            sample && (
              <span
                style={{
                  padding: "2px 7px",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: FONT_MONO,
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#22C55E",
                  borderRadius: 4,
                }}
              >
                {sample.status}
              </span>
            )
          )}
        </div>
        <pre
          style={{
            margin: 0,
            padding: 14,
            background: "#050505",
            border: "1px solid #1A1A1A",
            borderRadius: 8,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: "#E5E5E2",
            overflow: "auto",
            maxHeight: 320,
          }}
        >
          {tryResponse ? tryResponse.body : sample ? pretty(sample.example) : "// run the request to see the response"}
        </pre>
      </div>
    </div>
  );
}
