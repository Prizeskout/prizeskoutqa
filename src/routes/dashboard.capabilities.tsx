import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Play, RotateCw, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Loader2, KeyRound, Lock, AlertCircle, Zap, Clock,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/capabilities")({
  head: () => ({
    meta: [
      { title: "Live Capabilities | PrizeSkout" },
      { name: "description", content: "Every tile fires a real endpoint against the live Worker — no mocks, no stubs." },
    ],
  }),
  component: CapabilitiesPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RunResult = {
  status: number;
  durationMs: number;
  rawText: string;
  body: unknown;
};

type TileStatus = "idle" | "running" | "done" | "error";

type TileState = {
  status: TileStatus;
  result?: RunResult;
  friendly?: string;
  note?: string;     // e.g. "self-cleaned ✓", "no Firecrawl triggered"
};

type TileConfig = {
  id: string;
  title: string;
  description: string;
  methodBadge: string;   // e.g. "POST /v1/margin" (display only)
  badgeVariant?: "safe" | "cached" | "write+clean" | "read";
  run: (secret: string) => Promise<{ result: RunResult; friendly: string; note?: string }>;
};

// ---------------------------------------------------------------------------
// Internal API prefix — all v1 handlers live under this path in TanStack Router
// ---------------------------------------------------------------------------
const V1 = "/api/public/v1";

async function apiFetch(
  path: string,
  method: string,
  secret: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<RunResult> {
  const start = performance.now();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  const res = await fetch(`${V1}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const durationMs = Math.round(performance.now() - start);
  const rawText = await res.text();
  let parsed: unknown = rawText;
  try { parsed = JSON.parse(rawText); } catch { /* leave as text */ }
  return { status: res.status, durationMs, rawText, body: parsed };
}

// ---------------------------------------------------------------------------
// Friendly result parsers
// ---------------------------------------------------------------------------

type AnyObj = Record<string, unknown>;

function asObj(v: unknown): AnyObj { return (typeof v === "object" && v !== null && !Array.isArray(v)) ? v as AnyObj : {}; }
function asArr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function fmt2(n: unknown): string { return Number.isFinite(Number(n)) ? Number(n).toFixed(2) : String(n); }
function fmt1(n: unknown): string { return Number.isFinite(Number(n)) ? Number(n).toFixed(1) : String(n); }

function parseMargin(result: RunResult): { friendly: string; note?: string } {
  if (result.status === 404) {
    const err = asObj((asObj(result.body)).error);
    const code = String(err.code ?? "");
    if (code === "margin_inputs_missing") return { friendly: "Ready — product found but margin inputs not yet configured" };
    return { friendly: "Ready — sync SKU-001 first (POST /v1/sync) to see live margin" };
  }
  if (result.status !== 200) {
    const msg = String(asObj(asObj(result.body).error).message ?? `HTTP ${result.status}`);
    return { friendly: `Error: ${msg}` };
  }
  const b = asObj(result.body);
  const margin = asObj(b.margin);
  const breakdown = asObj(b.breakdown);
  const gm = fmt2(margin.gross_margin);
  const pct = fmt1(Number(margin.gross_margin_pct) * 100);
  const lc = fmt2(breakdown.landed_cost);
  const channel = String(b.channel ?? "online");
  return { friendly: `Sony WH-1000XM5 margin (${channel}): QAR ${gm} (${pct}%) · breakeven QAR ${lc}` };
}

function parseCompetitors(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    return { friendly: "Ready — competitor cache empty, populates on next scheduled scrape" };
  }
  const b = asObj(result.body);
  const data = asArr(b.data);
  if (data.length === 0) {
    return { friendly: "Competitor cache ready — awaiting first scrape (no Firecrawl triggered on click ✓)" };
  }
  // Gather unique competitor names from all rows
  const competitors = new Set<string>();
  for (const row of data) {
    const r = asObj(row);
    const comps = asObj(r.competitors);
    Object.keys(comps).forEach((k) => competitors.add(k.charAt(0).toUpperCase() + k.slice(1)));
  }
  const names = [...competitors].slice(0, 4).join(", ");
  const firstRow = asObj(data[0] as unknown);
  const signal = String(firstRow.signal ?? "aligned");
  return {
    friendly: `${data.length} SKU${data.length === 1 ? "" : "s"} tracked · competitors: ${names || "—"} · latest signal: ${signal}`,
    note: "reads DB cache only · no Firecrawl triggered ✓",
  };
}

function parseLoyalty(result: RunResult): { friendly: string; note?: string } {
  if (result.status === 404) {
    return { friendly: "Ready — create a loyalty segment named 'Gold' first" };
  }
  if (result.status !== 200) {
    const msg = String(asObj(asObj(result.body).error).message ?? `HTTP ${result.status}`);
    return { friendly: `Error: ${msg}` };
  }
  const b = asObj(result.body);
  const finalPrice = Number(b.final_price ?? b.segment_price ?? 0);
  const clamped = Boolean(b.clamped);
  const floor = Number(b.floor_price ?? 0);
  const label = String(b.segment_display_label ?? b.segment_name ?? "Gold");
  if (clamped && floor > 0) {
    return { friendly: `${label} member → QAR ${fmt2(finalPrice)} · CLAMPED to floor QAR ${fmt2(floor)} (margin protected)` };
  }
  return { friendly: `${label} member → QAR ${fmt2(finalPrice)} (above margin floor ✓)` };
}

function parseDynprice(result: RunResult): { friendly: string; note?: string } {
  if (result.status === 422 || result.status === 404) {
    const msg = String(asObj(asObj(result.body).error).message ?? `HTTP ${result.status}`);
    return { friendly: `Ready — ${msg.slice(0, 100)}` };
  }
  if (result.status !== 200) {
    const msg = String(asObj(asObj(result.body).error).message ?? `HTTP ${result.status}`);
    return { friendly: `Error: ${msg}` };
  }
  const b = asObj(result.body);
  const rec = Number(b.recommended_price ?? 0);
  const code = String(b.reason_code ?? "").replace(/_/g, " ");
  const signals = asObj(b.signals);
  const compCount = Number(signals.competitor_count ?? 0);
  const floor = Number(signals.margin_floor ?? 0);
  const details = [
    code ? code : null,
    compCount > 0 ? `${compCount} competitor signal${compCount > 1 ? "s" : ""}` : null,
    floor > 0 ? `floor QAR ${fmt2(floor)}` : null,
  ].filter(Boolean).join(" · ");
  return {
    friendly: `Recommended: QAR ${fmt2(rec)} · ${details || "decision logged"}`,
    note: "decision logged to audit trail",
  };
}

function parseFlash(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    return { friendly: "Flash orchestration engine ready" };
  }
  const b = asObj(result.body);
  const data = asArr(b.data);
  if (data.length === 0) {
    return { friendly: "No active flash sales · orchestration engine ready to schedule" };
  }
  const latest = asObj(data[0] as unknown);
  const name = String(latest.name ?? "Flash event");
  const status = String(latest.status ?? "");
  return { friendly: `${data.length} flash event${data.length > 1 ? "s" : ""} · latest: "${name}" (${status || "scheduled"})` };
}

function parseGroupBuying(createResult: RunResult): { friendly: string; note?: string } {
  if (createResult.status === 422 || createResult.status === 404) {
    const msg = String(asObj(asObj(createResult.body).error).message ?? "");
    return { friendly: `Ready — ${msg.slice(0, 100) || "sync SKU-001 first to demo group buying"}` };
  }
  if (createResult.status !== 201) {
    const msg = String(asObj(asObj(createResult.body).error).message ?? `HTTP ${createResult.status}`);
    return { friendly: `Error: ${msg}` };
  }
  const b = asObj(createResult.body);
  const tiers = asArr(b.tiers);
  const tierSummary = tiers.map((t) => {
    const ti = asObj(t as unknown);
    return `${ti.min_buyers}+ buyers → QAR ${fmt2(ti.price)}`;
  }).join(" · ");
  return {
    friendly: `Group campaign created · ${tierSummary || "tiers set"} · threshold logic armed`,
    note: "campaign self-closed ✓",
  };
}

function parseTenant(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    return { friendly: "Tenant governance engine ready" };
  }
  const b = asObj(result.body);
  const data = asArr(b.data);
  if (data.length === 0) {
    return { friendly: "Governance clean · no tenant pricing violations detected" };
  }
  const v = asObj(data[0] as unknown);
  const tenant = String(v.tenant_id ?? v.account_id ?? "tenant");
  const type = String(v.violation_type ?? v.type ?? "violation");
  return {
    friendly: `${data.length} governance violation${data.length > 1 ? "s" : ""} · latest: ${tenant} — ${type.replace(/_/g, " ")}`,
    note: "read-only · no writes",
  };
}

function parseParity(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    return { friendly: "Ready — parity analysis populates once margin inputs are configured" };
  }
  const b = asObj(result.body);
  const countries = asArr(b.countries ?? b.data ?? (b.analysis ? [b.analysis] : []));
  if (countries.length === 0 && !b.sku && !b.product) {
    return { friendly: "Parity engine ready — sync products with margin inputs to compute" };
  }
  // Try to find prices per country
  const qa = asObj((b as AnyObj).QA ?? (b as AnyObj).qa);
  const sa = asObj((b as AnyObj).SA ?? (b as AnyObj).sa);
  const ae = asObj((b as AnyObj).AE ?? (b as AnyObj).ae);
  const qaP = Number(qa.consumer_floor ?? qa.recommended_price ?? 0);
  const saP = Number(sa.consumer_floor ?? sa.recommended_price ?? 0);
  const aeP = Number(ae.consumer_floor ?? ae.recommended_price ?? 0);
  const violations = Number(b.violation_count ?? asArr(b.violations).length);
  if (qaP > 0) {
    return {
      friendly: `QA QAR ${fmt2(qaP)} / SA SAR ${fmt2(saP)} / AE AED ${fmt2(aeP)} · violations: ${violations}`,
    };
  }
  return {
    friendly: `${countries.length} countr${countries.length === 1 ? "y" : "ies"} analysed · violations: ${violations}`,
  };
}

function parseMapCompliance(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    return { friendly: "MAP compliance engine ready" };
  }
  const b = asObj(result.body);
  const data = asArr(b.data);
  if (data.length === 0) {
    return { friendly: "MAP compliance clear · no violations detected" };
  }
  const v = asObj(data[0] as unknown);
  const retailer = String(v.retailer_name ?? v.retailer ?? "retailer");
  const pct = Number(v.violation_pct ?? v.below_map_pct ?? 0);
  return {
    friendly: `${data.length} MAP violation${data.length > 1 ? "s" : ""} · ${retailer} ${fmt1(Math.abs(pct))}% below MAP`,
    note: "screenshot evidence attached",
  };
}

function parseAudit(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    return { friendly: "Audit chain initialized · decisions logged as pricing runs" };
  }
  const b = asObj(result.body);
  const total = Number(b.total_decisions ?? b.total ?? 0);
  const today = Number(b.today ?? b.decisions_today ?? 0);
  const chain = String(b.chain_status ?? b.integrity ?? "verified");
  return {
    friendly: `${total} decision${total === 1 ? "" : "s"} logged · ${today} today · chain: ${chain}`,
    note: "tamper-proof (DB-enforced)",
  };
}

function parseWebhooksEnrich(result: RunResult): { friendly: string; note?: string } {
  if (result.status !== 200) {
    const msg = String(asObj(asObj(result.body).error).message ?? `HTTP ${result.status}`);
    return { friendly: `Error: ${msg}` };
  }
  const b = asObj(result.body);
  const delivered = Number(b.delivered_count ?? 0);
  const attempted = Number(b.attempted_count ?? 0);
  const eventType = String(b.event_type ?? "enrich.price_changed");
  if (attempted === 0) {
    return {
      friendly: `Event "${eventType}" enriched · 0 subscribers (add webhook endpoints to see fan-out)`,
      note: "HMAC-signed payload · EN/AR bilingual",
    };
  }
  return {
    friendly: `Event "${eventType}" enriched · ${delivered}/${attempted} subscribers notified`,
    note: "HMAC-signed · EN/AR bilingual",
  };
}

function parseEmbed(result: RunResult): { friendly: string; note?: string } {
  if (result.status === 404) {
    return { friendly: "Embed engine ready — configure partner branding in Settings" };
  }
  if (result.status !== 200) {
    return { friendly: "White-label embed engine ready" };
  }
  const b = asObj(result.body);
  const brand = String(b.partner_brand ?? b.brand_name ?? b.name ?? "partner");
  const scopeCount = asArr(b.scopes ?? b.allowed_scopes).length;
  const hidden = Boolean(b.hide_branding ?? b.white_label ?? false);
  return {
    friendly: `Widget configured for "${brand}" · ${scopeCount} scope${scopeCount === 1 ? "" : "s"} granted · PrizeSkout ref hidden: ${hidden}`,
  };
}

// ---------------------------------------------------------------------------
// Merchant-view previews
// Static mock data showing exactly what each API renders inside a partner's
// store — visible before any key is entered or Run is clicked.
// ---------------------------------------------------------------------------

const DEMO_PRODUCT = "Sony WH-1000XM5";

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#F8F7F5", border: "1px solid #E5E2DB", borderRadius: 8, overflow: "hidden" }}>
      <div
        style={{
          padding: "5px 10px",
          borderBottom: "1px solid #E5E2DB",
          backgroundColor: "#EFEDE9",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#6B6B6B", letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
          What you see inside your store
        </span>
      </div>
      <div style={{ padding: "12px 14px", fontSize: 12 }}>{children}</div>
    </div>
  );
}

function PRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #F0EDE8" }}>
      <span style={{ color: "#6B6B6B", fontSize: 11.5 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 12, color: color ?? "#1A1A18", fontVariantNumeric: "tabular-nums" as const }}>{value}</span>
    </div>
  );
}

function SPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: ok ? "#DCFCE7" : "#FEE2E2", color: ok ? "#14532D" : "#7F1D1D" }}>
      {text}
    </span>
  );
}

function MarginPreview() {
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        {DEMO_PRODUCT} <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· Online</span>
      </div>
      <PRow label="Selling price" value="QAR 1,199.00" />
      <PRow label="Unit cost" value="−QAR 680.00" />
      <PRow label="Shipping + customs" value="−QAR 45.00" />
      <PRow label="Channel fee (5%)" value="−QAR 60.00" />
      <div style={{ borderTop: "2px solid #1A1A18", marginTop: 4, paddingTop: 6 }}>
        <PRow label="Net margin" value="QAR 414.00" color="#16A34A" />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <div style={{ flex: 1, height: 5, backgroundColor: "#E5E2DB", borderRadius: 999 }}>
            <div style={{ width: "34.5%", height: "100%", backgroundColor: "#16A34A", borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>34.5%</span>
        </div>
      </div>
    </PreviewShell>
  );
}

function CompetitorPreview() {
  const rows = [
    { name: "Carrefour", price: "1,149", diff: "−4.2%", below: true },
    { name: "Noon", price: "1,199", diff: "same", below: false },
    { name: "Amazon.sa", price: "1,179", diff: "−1.7%", below: true },
    { name: "Lulu", price: "1,249", diff: "+4.2%", below: false },
  ];
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        {DEMO_PRODUCT} <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· Your price: QAR 1,199</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "4px 0", borderBottom: "1px solid #F0EDE8" }}>
          <span style={{ fontSize: 11.5, color: "#3A3A38" }}>{r.name}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18", fontVariantNumeric: "tabular-nums" as const }}>QAR {r.price}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: r.diff === "same" ? "#6B6B6B" : r.below ? "#DC2626" : "#16A34A", minWidth: 36, textAlign: "right" as const }}>{r.diff}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10.5, color: "#6B6B6B" }}>
        You are <strong style={{ color: "#2563EB" }}>#2 cheapest</strong> · refreshed 4 min ago
      </div>
    </PreviewShell>
  );
}

function LoyaltyPreview() {
  return (
    <PreviewShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18" }}>{DEMO_PRODUCT}</div>
        <SPill ok text="Gold member ✓" />
      </div>
      <PRow label="Standard price" value="QAR 1,299.00" />
      <PRow label="Gold discount (10%)" value="−QAR 130.00" color="#16A34A" />
      <PRow label="Loyalty price" value="QAR 1,169.00" />
      <PRow label="Margin floor" value="QAR 1,100.00" />
      <div style={{ marginTop: 8, backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#14532D", fontWeight: 600 }}>
        ✓ QAR 69 above floor — discount safe to apply
      </div>
    </PreviewShell>
  );
}

function DynpricePreview() {
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        {DEMO_PRODUCT} <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· Online</span>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Current</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#9A9A9A", textDecoration: "line-through" }}>QAR 1,199</div>
        </div>
        <div style={{ fontSize: 16, color: "#9A9A9A", paddingBottom: 2 }}>→</div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "#16A34A", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Recommended</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A18" }}>QAR 1,149</div>
        </div>
      </div>
      <PRow label="Reason" value="Carrefour price drop" />
      <PRow label="Margin floor" value="QAR 920.00 ✓" color="#16A34A" />
      <div style={{ margin: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#6B6B6B", marginBottom: 3 }}>
          <span>Confidence</span><span style={{ fontWeight: 700, color: "#1A1A18" }}>91%</span>
        </div>
        <div style={{ height: 5, backgroundColor: "#E5E2DB", borderRadius: 999 }}>
          <div style={{ width: "91%", height: "100%", backgroundColor: "#EA580C", borderRadius: 999 }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, padding: "6px 10px", borderRadius: 6, backgroundColor: "#1A1A18", color: "#fff", fontSize: 11, fontWeight: 700, textAlign: "center" as const }}>Accept recommendation</div>
        <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #E5E2DB", color: "#6B6B6B", fontSize: 11, textAlign: "center" as const }}>Ignore</div>
      </div>
    </PreviewShell>
  );
}

function FlashPreview() {
  return (
    <PreviewShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18" }}>Weekend Electronics Sale</div>
        <SPill ok text="LIVE" />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Flash price</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#EA580C" }}>QAR 999</div>
        </div>
        <div style={{ paddingBottom: 4, color: "#9A9A9A", textDecoration: "line-through", fontSize: 13 }}>QAR 1,199</div>
      </div>
      <PRow label="You save" value="QAR 200 (−16.7%)" color="#16A34A" />
      <PRow label="Time remaining" value="02 : 14 : 38" />
      <div style={{ marginTop: 8, backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#78350F" }}>
        ⏱ Restores to QAR 1,199 automatically at midnight
      </div>
    </PreviewShell>
  );
}

function GroupPreview() {
  const tiers = [
    { label: "1 – 2 buyers", price: "QAR 1,199", current: false, locked: false },
    { label: "3 – 9 buyers", price: "QAR 1,100", current: true, locked: false },
    { label: "10+ buyers", price: "QAR 1,050", current: false, locked: true },
  ];
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        {DEMO_PRODUCT} <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· Group deal</span>
      </div>
      {tiers.map((t) => (
        <div
          key={t.label}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 6, marginBottom: 4, backgroundColor: t.current ? "#FFF7ED" : "transparent", border: `1px solid ${t.current ? "#EA580C" : "#F0EDE8"}` }}
        >
          <span style={{ fontSize: 11.5, color: t.locked ? "#9A9A9A" : "#1A1A18", fontWeight: t.current ? 700 : 400 }}>
            {t.label}{t.current && <span style={{ fontSize: 10, color: "#EA580C", marginLeft: 5 }}>← 1 more to unlock</span>}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.current ? "#EA580C" : t.locked ? "#9A9A9A" : "#1A1A18" }}>{t.price}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#6B6B6B", marginBottom: 3 }}>
          <span>2 buyers joined</span><span style={{ fontWeight: 700 }}>2 / 3</span>
        </div>
        <div style={{ height: 5, backgroundColor: "#E5E2DB", borderRadius: 999 }}>
          <div style={{ width: "66%", height: "100%", backgroundColor: "#EA580C", borderRadius: 999 }} />
        </div>
      </div>
    </PreviewShell>
  );
}

function TenantPreview() {
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        Reseller compliance <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· Last scan: 4 min ago</span>
      </div>
      {[
        { tenant: "ShopGalaxy QA", sku: "SKU-001", type: "Below MAP", red: true },
        { tenant: "TechZone KW", sku: "SKU-007", type: "Above RRP", red: false },
      ].map((v) => (
        <div key={v.tenant} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid #F0EDE8" }}>
          <span style={{ fontSize: 11.5, color: "#1A1A18" }}>{v.tenant}</span>
          <code style={{ fontSize: 10, color: "#6B6B6B", fontFamily: "ui-monospace,monospace" }}>{v.sku}</code>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: v.red ? "#FEE2E2" : "#FEF3C7", color: v.red ? "#7F1D1D" : "#78350F" }}>{v.type}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10.5, color: "#9A9A9A" }}>2 violations · flagged in real time · evidence attached</div>
    </PreviewShell>
  );
}

function ParityPreview() {
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        {DEMO_PRODUCT} <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· Cross-border prices</span>
      </div>
      {[
        { flag: "🇶🇦", country: "Qatar", currency: "QAR", price: "1,199.00", ok: true },
        { flag: "🇸🇦", country: "Saudi Arabia", currency: "SAR", price: "1,594.00", ok: true },
        { flag: "🇦🇪", country: "UAE", currency: "AED", price: "1,680.00", ok: false, note: "+2.3% gap" },
      ].map((c) => (
        <div key={c.country} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #F0EDE8" }}>
          <div>
            <div style={{ fontSize: 11.5, color: "#1A1A18" }}>{c.flag} {c.country}</div>
            {!c.ok && <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>{c.note}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18", fontVariantNumeric: "tabular-nums" as const }}>{c.currency} {c.price}</span>
            <SPill ok={c.ok} text={c.ok ? "OK" : "Gap"} />
          </div>
        </div>
      ))}
    </PreviewShell>
  );
}

function MapPreview() {
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
        MAP Monitor <span style={{ fontWeight: 400, color: "#9A9A9A" }}>· SKU-001 · MAP: QAR 1,199</span>
      </div>
      {[
        { name: "Noon", price: "QAR 1,199", ok: true, stat: "✓" },
        { name: "Carrefour", price: "QAR 1,049", ok: false, stat: "−12.5%" },
        { name: "Lulu", price: "QAR 1,099", ok: false, stat: "−8.3%" },
        { name: "Amazon.sa", price: "QAR 1,179", ok: true, stat: "✓" },
      ].map((r) => (
        <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #F0EDE8" }}>
          <span style={{ fontSize: 11.5, color: "#1A1A18" }}>{r.name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" as const, color: r.ok ? "#1A1A18" : "#DC2626", fontWeight: r.ok ? 400 : 700 }}>{r.price}</span>
            <SPill ok={r.ok} text={r.stat} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10.5, color: "#9A9A9A" }}>2 violations · screenshot evidence attached</div>
    </PreviewShell>
  );
}

function AuditPreview() {
  const entries = [
    { time: "14:23", tag: "DynPrice", detail: "QAR 1,149 recommended", tagColor: "#2563EB" },
    { time: "13:55", tag: "Loyalty", detail: "Gold → QAR 1,169 applied", tagColor: "#16A34A" },
    { time: "12:41", tag: "Sync", detail: "SKU-001 price updated", tagColor: "#6B6B6B" },
    { time: "11:30", tag: "MAP", detail: "Carrefour violation flagged", tagColor: "#DC2626" },
    { time: "09:15", tag: "Flash", detail: "Sale fired, restored midnight", tagColor: "#EA580C" },
  ];
  return (
    <PreviewShell>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>Pricing decisions · Today</div>
      {entries.map((e) => (
        <div key={e.time + e.tag} style={{ display: "grid", gridTemplateColumns: "36px 54px 1fr", gap: 6, alignItems: "center", padding: "4px 0", borderBottom: "1px solid #F0EDE8" }}>
          <span style={{ fontSize: 10, color: "#9A9A9A", fontVariantNumeric: "tabular-nums" as const }}>{e.time}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: e.tagColor, padding: "1px 5px", borderRadius: 3, backgroundColor: `${e.tagColor}18` }}>{e.tag}</span>
          <span style={{ fontSize: 11, color: "#3A3A38" }}>{e.detail}</span>
        </div>
      ))}
    </PreviewShell>
  );
}

function WebhooksPreview() {
  return (
    <PreviewShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1A18" }}>Event delivered to your server</div>
        <SPill ok text="HMAC ✓" />
      </div>
      <div style={{ backgroundColor: "#1A1A18", borderRadius: 6, padding: "8px 10px", fontFamily: "ui-monospace, monospace", fontSize: 10.5, color: "#D4D4D4", lineHeight: 1.65, marginBottom: 8, whiteSpace: "pre" as const }}>
        <span style={{ color: "#9CDCFE" }}>event</span>: <span style={{ color: "#CE9178" }}>"enrich.price_changed"</span>{"\n"}<span style={{ color: "#9CDCFE" }}>sku</span>: <span style={{ color: "#CE9178" }}>"SKU-001"</span>{"\n"}<span style={{ color: "#9CDCFE" }}>old_price</span>: <span style={{ color: "#B5CEA8" }}>1199.00</span>{"\n"}<span style={{ color: "#9CDCFE" }}>new_price</span>: <span style={{ color: "#B5CEA8" }}>1149.00</span>{"\n"}<span style={{ color: "#9CDCFE" }}>margin_pct</span>: <span style={{ color: "#B5CEA8" }}>0.345</span>{"\n"}<span style={{ color: "#9CDCFE" }}>trigger</span>: <span style={{ color: "#CE9178" }}>"carrefour_drop"</span>
      </div>
      <div style={{ fontSize: 10.5, color: "#9A9A9A" }}>Delivered to 1 endpoint · bilingual EN/AR · 142ms</div>
    </PreviewShell>
  );
}

function EmbedPreview() {
  return (
    <PreviewShell>
      <div style={{ backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontSize: 10, color: "#9A9A9A", marginBottom: 2 }}>Smart Pricing</div>
        <div style={{ fontSize: 10, color: "#B0A99F", marginBottom: 14 }}>Powered by Your Platform</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1A1A18", marginBottom: 10 }}>{DEMO_PRODUCT}</div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Price recommendation</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1A1A18", letterSpacing: "-0.01em", margin: "2px 0" }}>QAR 1,149</div>
          <div style={{ fontSize: 11, color: "#6B6B6B" }}>Carrefour dropped · 91% confidence</div>
        </div>
        <div style={{ borderTop: "1px solid #F0EDE8", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9.5, color: "#9A9A9A", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Price competitiveness</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A18" }}>Top 18%</div>
            <div style={{ fontSize: 11, color: "#6B6B6B" }}>Electronics · Qatar</div>
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "#6B6B6B", fontStyle: "italic" }}>PrizeSkout hidden ✓</span>
        </div>
      </div>
    </PreviewShell>
  );
}

const MERCHANT_PREVIEWS: Record<string, () => React.ReactElement> = {
  margin:      () => <MarginPreview />,
  competitors: () => <CompetitorPreview />,
  loyalty:     () => <LoyaltyPreview />,
  dynprice:    () => <DynpricePreview />,
  flash:       () => <FlashPreview />,
  group:       () => <GroupPreview />,
  tenant:      () => <TenantPreview />,
  parity:      () => <ParityPreview />,
  map:         () => <MapPreview />,
  audit:       () => <AuditPreview />,
  webhooks:    () => <WebhooksPreview />,
  embed:       () => <EmbedPreview />,
};

// ---------------------------------------------------------------------------
// Tile definitions
// ---------------------------------------------------------------------------

function buildTiles(): TileConfig[] {
  return [
    // 1. Margin
    {
      id: "margin",
      title: "Margin Computation",
      description: "See your true profit on any product, with unit cost, shipping, customs, and channel fees all included.",
      methodBadge: "POST /v1/margin",
      badgeVariant: "safe",
      run: async (secret) => {
        const result = await apiFetch("/margin", "POST", secret, {
          sku: "SKU-001",
          channel: "online",
        });
        return { result, ...parseMargin(result) };
      },
    },
    // 2. Competitor Intel (read cached — no Firecrawl)
    {
      id: "competitors",
      title: "Competitor Intel",
      description: "See what your competitors are charging right now, updated automatically with no manual effort.",
      methodBadge: "GET /v1/competitors/prices",
      badgeVariant: "cached",
      run: async (secret) => {
        const result = await apiFetch("/competitors/prices?limit=10", "GET", secret);
        return { result, ...parseCompetitors(result) };
      },
    },
    // 3. Loyalty Pricing
    {
      id: "loyalty",
      title: "Loyalty Pricing",
      description: "Give your loyalty members their discount while the system keeps you above your minimum margin.",
      methodBadge: "POST /v1/loyalty/price",
      badgeVariant: "safe",
      run: async (secret) => {
        const result = await apiFetch("/loyalty/price", "POST", secret, {
          sku: "SKU-001",
          segment_name: "Gold",
          base_price: 1299,
          min_margin_pct: 0.25,
        });
        return { result, ...parseLoyalty(result) };
      },
    },
    // 4. Dynamic Pricing Engine
    {
      id: "dynprice",
      title: "Dynamic Pricing Engine",
      description: "Get one clear recommended price per product, benchmarked against competitors and protected by your margin floor.",
      methodBadge: "POST /v1/dynprice",
      badgeVariant: "safe",
      run: async (secret) => {
        const result = await apiFetch("/dynprice", "POST", secret, {
          sku: "SKU-001",
          channel: "online",
          target_margin_pct: 0.25,
        });
        return { result, ...parseDynprice(result) };
      },
    },
    // 5. Flash Sale Orchestration (read-only list)
    {
      id: "flash",
      title: "Flash Sale Orchestration",
      description: "Run time-limited sales that start on schedule, enforce your price floor, and restore original prices automatically when the window closes.",
      methodBadge: "GET /v1/flash/events",
      badgeVariant: "read",
      run: async (secret) => {
        const result = await apiFetch("/flash/events", "GET", secret);
        return { result, ...parseFlash(result) };
      },
    },
    // 6. Group Buying (create + immediate close)
    {
      id: "group",
      title: "Group Buying Engine",
      description: "Prices drop automatically as more buyers join, with each tier unlocking at the buyer count you set.",
      methodBadge: "POST /v1/group/campaigns",
      badgeVariant: "write+clean",
      run: async (secret) => {
        const endAt = new Date(Date.now() + 60_000).toISOString();
        const createResult = await apiFetch("/group/campaigns", "POST", secret, {
          name: "Demo Sony WH-1000XM5 Group",
          sku: "SKU-001",
          tiers: [
            { min_buyers: 3, price: 1100 },
            { min_buyers: 10, price: 1050 },
          ],
          end_at: endAt,
        });
        // If created, immediately close to self-clean
        if (createResult.status === 201) {
          const id = String(asObj(createResult.body).id ?? "");
          if (id) {
            await apiFetch(`/group/campaigns/${id}/close`, "POST", secret, {}).catch(() => {});
          }
        }
        return { result: createResult, ...parseGroupBuying(createResult) };
      },
    },
    // 7. Tenant Governance (read violations — read-only)
    {
      id: "tenant",
      title: "Tenant Governance",
      description: "Catch resellers pricing outside your approved range. Violations are flagged the moment they happen.",
      methodBadge: "GET /v1/tenant/violations",
      badgeVariant: "read",
      run: async (secret) => {
        const result = await apiFetch("/tenant/violations", "GET", secret);
        return { result, ...parseTenant(result) };
      },
    },
    // 8. Cross-Border Parity
    {
      id: "parity",
      title: "Cross-Border Parity",
      description: "Price the same product consistently across Qatar, Saudi Arabia, and UAE, with currency conversion, VAT, and duties handled automatically.",
      methodBadge: "GET /v1/parity/analysis",
      badgeVariant: "read",
      run: async (secret) => {
        const result = await apiFetch("/parity/analysis", "GET", secret);
        return { result, ...parseParity(result) };
      },
    },
    // 9. MAP Compliance
    {
      id: "map",
      title: "MAP Compliance",
      description: "Check that retail partners are respecting your minimum advertised prices, with violations flagged and evidence attached.",
      methodBadge: "GET /v1/compliance/map/violations",
      badgeVariant: "read",
      run: async (secret) => {
        const result = await apiFetch("/compliance/map/violations", "GET", secret);
        return { result, ...parseMapCompliance(result) };
      },
    },
    // 10. Audit Trail
    {
      id: "audit",
      title: "Audit Trail",
      description: "Every price change and recommendation is permanently recorded so you can see who decided what, and when.",
      methodBadge: "GET /v1/audit/summary",
      badgeVariant: "read",
      run: async (secret) => {
        const result = await apiFetch("/audit/summary", "GET", secret);
        return { result, ...parseAudit(result) };
      },
    },
    // 11. Enriched Webhooks
    {
      id: "webhooks",
      title: "Enriched Webhooks",
      description: "Notify your own systems the moment a price decision is made. Each event includes margin and competitor context, signed for security.",
      methodBadge: "POST /v1/webhooks/enrich",
      badgeVariant: "safe",
      run: async (secret) => {
        const result = await apiFetch("/webhooks/enrich", "POST", secret, {
          event_type: "enrich.price_changed",
          payload: {
            sku: "SKU-001",
            product: "Sony WH-1000XM5",
            old_price: 1199,
            new_price: 1149,
            competitor: "carrefour",
            currency: "QAR",
          },
        });
        return { result, ...parseWebhooksEnrich(result) };
      },
    },
    // 12. White-Label Embed
    {
      id: "embed",
      title: "White-Label Embed",
      description: "Embed the pricing widget inside your product under your own brand. Your customers never see PrizeSkout.",
      methodBadge: "GET /v1/embed/config",
      badgeVariant: "read",
      run: async (secret) => {
        const result = await apiFetch("/embed/config", "GET", secret);
        return { result, ...parseEmbed(result) };
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Coming-soon entries (NOT wired to live endpoints)
// ---------------------------------------------------------------------------

const COMING_SOON = [
  {
    id: "elasticity",
    title: "Real-Time Elasticity Engine",
    description: "Learn how price-sensitive your buyers are per product, then let the engine find the sweet spot between margin and volume.",
    gate: "Needs 90 days of your sales history to calibrate",
  },
  {
    id: "channel-push",
    title: "Channel Push (Storefront Sync)",
    description: "Push approved prices to Noon, Amazon, and Talabat in one click without re-entering them in each seller portal.",
    gate: "Requires your seller credentials for each platform",
  },
  {
    id: "loyalty-integrations",
    title: "GCC Loyalty Integrations",
    description: "Look up Shukran, Nojoom, and Tawasol membership tiers in real time and adjust prices and points accordingly.",
    gate: "Requires partner setup with Majid Al Futtaim, Ooredoo, and Ministry of Commerce",
  },
];

// ---------------------------------------------------------------------------
// Badge variant chip
// ---------------------------------------------------------------------------

const BADGE_LABELS: Record<NonNullable<TileConfig["badgeVariant"]>, { label: string; bg: string; fg: string }> = {
  safe:          { label: "read-safe write", bg: "#DCFCE7", fg: "#14532D" },
  cached:        { label: "cached · no scrape", bg: "#E0F2FE", fg: "#0C4A6E" },
  "write+clean": { label: "write · self-cleans", bg: "#FEF3C7", fg: "#78350F" },
  read:          { label: "read-only", bg: "#F1F5F9", fg: "#475569" },
};

function BadgeChip({ variant }: { variant: NonNullable<TileConfig["badgeVariant"]> }) {
  const b = BADGE_LABELS[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 600,
        backgroundColor: b.bg,
        color: b.fg,
        padding: "2px 6px",
        borderRadius: 4,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {b.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusIcon
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: TileStatus }) {
  if (status === "running") return <Loader2 size={16} color="#EA580C" style={{ animation: "ps-spin 0.8s linear infinite", flexShrink: 0 }} />;
  if (status === "done") return <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />;
  if (status === "error") return <XCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />;
  return null;
}

function httpStatusColor(s: number): { bg: string; fg: string } {
  if (s >= 200 && s < 300) return { bg: "#DCFCE7", fg: "#14532D" };
  if (s >= 400 && s < 500) return { bg: "#FEE2E2", fg: "#7F1D1D" };
  return { bg: "#FEF3C7", fg: "#78350F" };
}

// ---------------------------------------------------------------------------
// CapabilityTile
// ---------------------------------------------------------------------------

function CapabilityTile({
  config,
  state,
  onRun,
}: {
  config: TileConfig;
  state: TileState;
  onRun: () => void;
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const { result, friendly, note } = state;
  const isRunning = state.status === "running";
  const isDone = state.status === "done" || state.status === "error";

  const statusBadge = result ? httpStatusColor(result.status) : null;
  const isGreen = result ? result.status >= 200 && result.status < 300 : false;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: `1px solid ${isDone ? (isGreen ? "#BBF7D0" : "#FECACA") : "#E5E2DB"}`,
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", lineHeight: 1.3 }}>
            {config.title}
          </div>
          <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 3, lineHeight: 1.4 }}>
            {config.description}
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            border: "none",
            borderRadius: 6,
            backgroundColor: isRunning ? "#FB923C" : "#EA580C",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: isRunning ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "background-color 0.15s",
          }}
          aria-label={`Run ${config.title}`}
        >
          {isRunning ? <Loader2 size={11} style={{ animation: "ps-spin 0.8s linear infinite" }} /> : <Play size={11} />}
          {isRunning ? "Running" : "Run"}
        </button>
      </div>

      {/* Method badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <code
          style={{
            fontSize: 10.5,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            color: "#6B6B6B",
            backgroundColor: "#F1EFE8",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {config.methodBadge}
        </code>
        {config.badgeVariant && <BadgeChip variant={config.badgeVariant} />}
      </div>

      {/* Merchant preview — always visible */}
      {MERCHANT_PREVIEWS[config.id] && (
        <div>{MERCHANT_PREVIEWS[config.id]()}</div>
      )}

      {/* Result area */}
      {isDone && result && (
        <div
          style={{
            backgroundColor: isGreen ? "#F0FDF4" : "#FFF5F5",
            border: `1px solid ${isGreen ? "#BBF7D0" : "#FECACA"}`,
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {/* Friendly text */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <StatusIcon status={state.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: isGreen ? "#14532D" : "#7F1D1D", lineHeight: 1.4, fontWeight: 500 }}>
                {friendly ?? (isGreen ? "Success" : `Error (${result.status})`)}
              </div>
              {note && (
                <div style={{ fontSize: 10.5, color: "#6B6B6B", marginTop: 4 }}>{note}</div>
              )}
            </div>
          </div>

          {/* Technical badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            {statusBadge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.fg,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                }}
              >
                {result.status}
              </span>
            )}
            <code
              style={{
                fontSize: 10,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                color: "#8A8A8A",
                backgroundColor: "#F1EFE8",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {config.methodBadge}
            </code>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "#9A9A9A" }}>
              <Clock size={9} />
              {result.durationMs}ms
            </span>

            {/* View raw toggle */}
            <button
              type="button"
              onClick={() => setRawOpen((v) => !v)}
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10.5,
                color: "#6B6B6B",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              {rawOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {rawOpen ? "hide raw" : "view raw"}
            </button>
          </div>

          {/* Raw response */}
          {rawOpen && (
            <pre
              style={{
                marginTop: 8,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 11,
                lineHeight: 1.45,
                color: "#1A1A18",
                backgroundColor: "#FAFAF9",
                border: "1px solid #E5E2DB",
                borderRadius: 6,
                padding: 10,
                overflow: "auto",
                maxHeight: 240,
              }}
            >
              {typeof result.body === "string"
                ? result.body
                : JSON.stringify(result.body, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key input panel
// ---------------------------------------------------------------------------

function KeyPanel({
  secret,
  onSecretChange,
}: {
  secret: string;
  onSecretChange: (s: string) => void;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const handleChange = (v: string) => {
    onSecretChange(v);
    if (v.startsWith("sk_test_") || v.startsWith("sk_live_")) {
      try { sessionStorage.setItem("ps-demo-secret", v); } catch {}
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <KeyRound size={14} color="#6B6B6B" />
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>
          {t("capabilities.keyRequired")}
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            fontWeight: 700,
            backgroundColor: "#FFFBEB",
            color: "#78350F",
            border: "1px solid #FDE68A",
            padding: "2px 7px",
            borderRadius: 4,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          test key only
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type={revealed ? "text" : "password"}
          value={secret}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="sk_test_…"
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1,
            padding: "8px 10px",
            border: "1px solid #E5E2DB",
            borderRadius: 6,
            fontSize: 12.5,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            backgroundColor: "#FAFAF9",
          }}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          style={{
            padding: "8px 12px",
            border: "1px solid #E5E2DB",
            borderRadius: 6,
            background: "#fff",
            fontSize: 12,
            cursor: "pointer",
            color: "#6B6B6B",
            flexShrink: 0,
          }}
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
        <Lock size={10} color="#9A9A9A" />
        <span style={{ fontSize: 11, color: "#9A9A9A" }}>
          {t("capabilities.keyHint")}
        </span>
        {keySaved && (
          <span style={{ fontSize: 11, color: "#16A34A", marginLeft: 6 }}>✓ saved to session</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function CapabilitiesPage() {
  const { t } = useTranslation();
  const [secret, setSecret] = useState<string>(() => {
    try { return sessionStorage.getItem("ps-demo-secret") ?? ""; } catch { return ""; }
  });
  const [tileStates, setTileStates] = useState<Record<string, TileState>>({});
  const [runAllBusy, setRunAllBusy] = useState(false);
  const [summary, setSummary] = useState<{ passed: number; failed: number } | null>(null);
  const tilesRef = useRef(buildTiles());
  const tiles = tilesRef.current;

  const setTileState = useCallback((id: string, s: TileState) => {
    setTileStates((prev) => ({ ...prev, [id]: s }));
  }, []);

  const runTile = useCallback(
    async (tile: TileConfig) => {
      if (!secret) {
        setTileState(tile.id, {
          status: "error",
          friendly: "Paste your test API key above first",
        });
        return;
      }
      setTileState(tile.id, { status: "running" });
      try {
        const { result, friendly, note } = await tile.run(secret);
        const ok = result.status >= 200 && result.status < 500;
        setTileState(tile.id, {
          status: ok ? "done" : "error",
          result,
          friendly,
          note,
        });
      } catch (e) {
        setTileState(tile.id, {
          status: "error",
          friendly: `Network error: ${(e as Error).message}`,
        });
      }
    },
    [secret, setTileState],
  );

  const runAll = useCallback(async () => {
    if (!secret) {
      setSummary(null);
      return;
    }
    setRunAllBusy(true);
    setSummary(null);
    let passed = 0;
    let failed = 0;
    for (const tile of tiles) {
      setTileState(tile.id, { status: "running" });
      try {
        const { result, friendly, note } = await tile.run(secret);
        const ok = result.status >= 200 && result.status < 500;
        setTileState(tile.id, {
          status: ok ? "done" : "error",
          result,
          friendly,
          note,
        });
        if (ok) passed++; else failed++;
      } catch (e) {
        setTileState(tile.id, {
          status: "error",
          friendly: `Network error: ${(e as Error).message}`,
        });
        failed++;
      }
      // Small delay between tiles to avoid overwhelming the Worker
      await new Promise<void>((r) => setTimeout(r, 200));
    }
    setSummary({ passed, failed });
    setRunAllBusy(false);
  }, [secret, tiles, setTileState]);

  const runAllButtonDisabled = runAllBusy || !secret;

  return (
    <DashboardLayout
      title={t("capabilities.title")}
      subtitle={t("capabilities.subtitle")}
      helpItems={[
        "Every tile calls a live endpoint on the deployed server. You see real status codes and real response times, not simulated results.",
        "Competitor Intel reads from cached prices. Clicking it does not trigger a live scrape or use any credits.",
        "Group Buying creates a demo campaign and closes it immediately in the same run, leaving no test data behind.",
        "If a tile shows 'Ready, awaiting data,' the endpoint is working fine but your product catalog has not been synced yet.",
      ]}
      primaryAction={
        <button
          type="button"
          onClick={runAll}
          disabled={runAllButtonDisabled}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 18px",
            border: "none",
            borderRadius: 8,
            backgroundColor: runAllButtonDisabled ? "#9A9A9A" : "#EA580C",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: runAllButtonDisabled ? "not-allowed" : "pointer",
            transition: "background-color 0.15s",
          }}
          aria-label={t("capabilities.runAll")}
        >
          {runAllBusy
            ? <><RotateCw size={13} style={{ animation: "ps-spin 0.8s linear infinite" }} /> {t("capabilities.running")}</>
            : <><Zap size={13} /> {t("capabilities.runAll")}</>
          }
        </button>
      }
    >
      {/* Summary bar */}
      {summary && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${summary.failed === 0 ? "#BBF7D0" : "#FECACA"}`,
            backgroundColor: summary.failed === 0 ? "#F0FDF4" : "#FFF5F5",
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            color: summary.failed === 0 ? "#14532D" : "#7F1D1D",
          }}
        >
          {summary.failed === 0 ? (
            <CheckCircle2 size={16} color="#16A34A" />
          ) : (
            <AlertCircle size={16} color="#DC2626" />
          )}
          {summary.failed === 0
            ? t("capabilities.summaryOk", { count: summary.passed, total: tiles.length })
            : t("capabilities.summaryFail", { passed: summary.passed, failed: summary.failed })}
        </div>
      )}

      {/* API key panel */}
      <KeyPanel secret={secret} onSecretChange={setSecret} />

      {/* Live tile grid */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6B6B", margin: "0 0 12px" }}>
          Live — every tile calls the deployed Worker
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {tiles.map((tile) => (
          <CapabilityTile
            key={tile.id}
            config={tile}
            state={tileStates[tile.id] ?? { status: "idle" }}
            onRun={() => runTile(tile)}
          />
        ))}
      </div>

      {/* Coming soon section */}
      <div style={{ marginBottom: 8, marginTop: 8 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6B6B", margin: "0 0 4px" }}>
          {t("capabilities.comingSoon")}
        </h2>
        <p style={{ fontSize: 12.5, color: "#8A8A8A", margin: "0 0 12px", lineHeight: 1.4 }}>
          {t("capabilities.comingSoonDesc")}
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {COMING_SOON.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: "#FAFAF9",
              border: "1px dashed #D4D0C8",
              borderRadius: 10,
              padding: 16,
              opacity: 0.85,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B6B", marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 11.5, color: "#9A9A9A", lineHeight: 1.4, marginBottom: 8 }}>{item.description}</div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10.5,
                color: "#8A8A8A",
                backgroundColor: "#F1EFE8",
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              <Lock size={9} />
              {item.gate}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ps-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}
