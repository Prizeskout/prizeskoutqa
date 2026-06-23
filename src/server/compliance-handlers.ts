// ============================================================================
// MAP Compliance handlers — /v1/compliance/map/*  (API 16)
//
// Endpoints:
//   POST /v1/compliance/map/agreements  — create MAP agreement
//   GET  /v1/compliance/map/violations  — list violations (immutable log)
//   GET  /v1/compliance/map/retailers   — compliance rate per retailer
//   GET  /v1/compliance/map/report      — CSV compliance report
//
// Violation detection (also exported for the /hooks/map-monitor cron):
//   processMapMonitoring(accountId?)
//   For each active agreement, for each retailer:
//     1. Try Firecrawl scrape (with screenshot) if retailer.url is provided
//     2. Fallback: competitor_prices column lookup (noon|carrefour|lulu|amazon|talabat)
//     3. If price found AND price < map_price → INSERT violation, emit webhook
//     4. Dedup: skip if violation already created in last 24h for same (sku, retailer)
//
// Screenshots (Firecrawl only):
//   Firecrawl returns data.screenshot URL → fetch bytes → upload to
//   Supabase Storage 'map-evidence' bucket → store evidence_path in violation.
//   GET violations re-signs evidence_path on each request (1h signed URL).
//   Signed URL at detection time stored in evidence_url (may expire).
//
// Scopes: compliance:read | read | admin (GETs)
//         compliance:write | write | admin (POST)
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueWebhookEvent } from "@/server/webhook-delivery";
import type { V1Context, V1Result } from "./v1-handlers";

// ─── Scope helpers ────────────────────────────────────────────────────────────

function canWrite(ctx: V1Context): boolean {
  return ctx.scopes.includes("compliance:write") || ctx.scopes.includes("write") || ctx.scopes.includes("admin");
}
function canRead(ctx: V1Context): boolean {
  return ctx.scopes.includes("compliance:read") || canWrite(ctx);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200, headers?: Record<string, string>): V1Result {
  return { status, body, headers };
}
async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return typeof p === "object" && p !== null && !Array.isArray(p)
      ? (p as Record<string, unknown>)
      : null;
  } catch { return null; }
}

// ─── Firecrawl MAP scrape (with screenshot) ───────────────────────────────────

const MAP_PRICE_SCHEMA = {
  type: "object",
  properties: {
    price:    { type: "number", description: "Numeric product price, no currency symbol" },
    currency: { type: "string", description: "ISO currency code or symbol" },
  },
  required: ["price"],
} as const;

type MapScrapeResult =
  | { ok: true;  price: number; currency: string | null; screenshotFcUrl: string | null; markdown: string | null }
  | { ok: false; reason: string };

async function scrapeForMap(url: string): Promise<MapScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY_1;
  if (!apiKey) return { ok: false, reason: "FIRECRAWL_API_KEY_1 not configured" };

  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        url,
        formats: [
          "markdown",
          "screenshot",
          { type: "json", schema: MAP_PRICE_SCHEMA, prompt: "Extract the product price and currency from this page." },
        ],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: `Firecrawl HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      data?: { markdown?: string; screenshot?: string; json?: { price?: number; currency?: string } };
    };

    const price = typeof data.data?.json?.price === "number" && data.data.json.price > 0
      ? data.data.json.price : null;

    if (price === null) return { ok: false, reason: "No price extracted from page" };

    return {
      ok: true,
      price,
      currency: data.data?.json?.currency ?? null,
      screenshotFcUrl: data.data?.screenshot ?? null,
      markdown: data.data?.markdown ?? null,
    };
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

// ─── Supabase Storage: upload screenshot ─────────────────────────────────────

async function ensureMapEvidenceBucket(): Promise<void> {
  await supabaseAdmin.storage.createBucket("map-evidence", { public: false }).catch(() => {});
}

async function uploadScreenshot(
  storagePath: string,
  screenshotFcUrl: string,
): Promise<{ path: string; signedUrl: string | null }> {
  await ensureMapEvidenceBucket();
  try {
    const imgRes = await fetch(screenshotFcUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return { path: storagePath, signedUrl: null };
    const bytes = await imgRes.arrayBuffer();
    const { error } = await supabaseAdmin.storage
      .from("map-evidence")
      .upload(storagePath, bytes, { contentType: "image/png", upsert: true });
    if (error) return { path: storagePath, signedUrl: null };
    const { data: signed } = await supabaseAdmin.storage
      .from("map-evidence")
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60); // 1-year signed URL at detection time
    return { path: storagePath, signedUrl: signed?.signedUrl ?? null };
  } catch {
    return { path: storagePath, signedUrl: null };
  }
}

// ─── Re-sign evidence on read ─────────────────────────────────────────────────

async function refreshSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from("map-evidence")
    .createSignedUrl(path, 3600); // 1h for API reads
  return data?.signedUrl ?? null;
}

// ─── Known competitor_prices columns ─────────────────────────────────────────

const KNOWN_COMP_COLS = new Set(["talabat", "carrefour", "lulu", "amazon", "noon"]);

// ─── Retailer type ────────────────────────────────────────────────────────────

type Retailer = { name: string; url: string | null };

// ============================================================================
// Core monitoring logic — called by hook and exportable for testing
// ============================================================================

export type MonitorResult = {
  agreements_checked: number;
  retailers_checked: number;
  violations_created: number;
  violations_skipped_dedup: number;
  scrape_results: Array<{
    agreement_id: string;
    sku: string;
    retailer: string;
    source: string;
    price: number | null;
    map_price: number;
    violated: boolean;
    deduped: boolean;
    reason?: string;
  }>;
};

export async function processMapMonitoring(filterAccountId?: string): Promise<MonitorResult> {
  const result: MonitorResult = {
    agreements_checked: 0,
    retailers_checked: 0,
    violations_created: 0,
    violations_skipped_dedup: 0,
    scrape_results: [],
  };

  // Load active agreements (today falls within effective window)
  let q = supabaseAdmin
    .from("map_agreements")
    .select("id, account_id, created_by_user_id, sku, map_price, currency, retailer_list")
    .lte("effective_from", new Date().toISOString().slice(0, 10));

  if (filterAccountId) q = q.eq("account_id", filterAccountId);

  const { data: agreements } = await q;
  if (!agreements?.length) return result;

  // 24h dedup: fetch recent violations to avoid spam
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentViols } = await supabaseAdmin
    .from("map_violations")
    .select("account_id, sku, retailer")
    .gte("first_detected_at", cutoff24h);

  const dedupSet = new Set(
    (recentViols ?? []).map((v) => `${v.account_id}:${v.sku}:${v.retailer}`),
  );

  for (const agreement of agreements) {
    result.agreements_checked++;
    const retailers: Retailer[] = Array.isArray(agreement.retailer_list)
      ? (agreement.retailer_list as Retailer[])
      : [];

    // Load competitor_prices once per agreement (fallback path)
    const { data: compPrices } = await supabaseAdmin
      .from("competitor_prices")
      .select("noon, carrefour, lulu, amazon, talabat")
      .eq("user_id", agreement.created_by_user_id)
      .ilike("product", `%${agreement.sku}%`)
      .limit(1)
      .maybeSingle();

    for (const retailer of retailers) {
      result.retailers_checked++;
      const key = `${agreement.account_id}:${agreement.sku}:${retailer.name}`;
      const mapPrice = Number(agreement.map_price);

      // ── Price detection ─────────────────────────────────────────────────
      let detectedPrice: number | null = null;
      let scrapeSource = "competitor_prices";
      let screenshotFcUrl: string | null = null;
      let markdown: string | null = null;
      let failReason: string | undefined;

      // 1. Try Firecrawl if URL provided
      if (retailer.url) {
        const scrapeResult = await scrapeForMap(retailer.url);
        if (scrapeResult.ok) {
          detectedPrice = scrapeResult.price;
          scrapeSource  = "firecrawl";
          screenshotFcUrl = scrapeResult.screenshotFcUrl;
          markdown = scrapeResult.markdown;
        } else {
          failReason = `Firecrawl: ${scrapeResult.reason}`;
        }
      }

      // 2. Fallback to competitor_prices column
      if (detectedPrice === null && compPrices) {
        const colName = retailer.name.toLowerCase();
        if (KNOWN_COMP_COLS.has(colName)) {
          const raw = (compPrices as Record<string, unknown>)[colName];
          if (raw != null) {
            const parsed = typeof raw === "object" && raw !== null && "price" in raw
              ? Number((raw as { price: unknown }).price)
              : Number(raw);
            if (isFinite(parsed) && parsed > 0) {
              detectedPrice = parsed;
              scrapeSource  = "competitor_prices";
            }
          }
        }
      }

      if (detectedPrice === null) {
        result.scrape_results.push({
          agreement_id: agreement.id,
          sku:          agreement.sku,
          retailer:     retailer.name,
          source:       scrapeSource,
          price:        null,
          map_price:    mapPrice,
          violated:     false,
          deduped:      false,
          reason:       failReason ?? "No price data available",
        });
        continue;
      }

      const violated = detectedPrice < mapPrice;

      if (!violated) {
        result.scrape_results.push({
          agreement_id: agreement.id,
          sku:          agreement.sku,
          retailer:     retailer.name,
          source:       scrapeSource,
          price:        detectedPrice,
          map_price:    mapPrice,
          violated:     false,
          deduped:      false,
        });
        continue;
      }

      // ── Violation detected ───────────────────────────────────────────────
      if (dedupSet.has(key)) {
        result.violations_skipped_dedup++;
        result.scrape_results.push({
          agreement_id: agreement.id,
          sku:          agreement.sku,
          retailer:     retailer.name,
          source:       scrapeSource,
          price:        detectedPrice,
          map_price:    mapPrice,
          violated:     true,
          deduped:      true,
          reason:       "Violation already logged within 24h",
        });
        continue;
      }

      const violationPct = Number(
        (((mapPrice - detectedPrice) / mapPrice) * 100).toFixed(4),
      );

      // Upload screenshot if from Firecrawl
      let evidencePath: string | null = null;
      let evidenceUrl: string | null = null;
      if (screenshotFcUrl) {
        const ts = Date.now();
        const storagePath = `${agreement.account_id}/${agreement.id}/${retailer.name}_${ts}.png`;
        const uploaded = await uploadScreenshot(storagePath, screenshotFcUrl);
        evidencePath = uploaded.path;
        evidenceUrl  = uploaded.signedUrl;
      }

      // INSERT violation (immutable table — service_role can INSERT)
      await supabaseAdmin.from("map_violations").insert({
        account_id:      agreement.account_id,
        agreement_id:    agreement.id,
        sku:             agreement.sku,
        retailer:        retailer.name,
        retailer_url:    retailer.url ?? null,
        map_price:       mapPrice,
        detected_price:  detectedPrice,
        currency:        agreement.currency,
        violation_pct:   violationPct,
        evidence_path:   evidencePath,
        evidence_url:    evidenceUrl,
        scrape_source:   scrapeSource,
        scrape_markdown: markdown,
      });

      dedupSet.add(key);
      result.violations_created++;

      // Emit webhook
      try {
        await enqueueWebhookEvent({
          userId: agreement.created_by_user_id,
          eventType: "compliance.violation_detected",
          payload: {
            sku:            agreement.sku,
            retailer:       retailer.name,
            retailer_url:   retailer.url ?? null,
            map_price:      mapPrice,
            detected_price: detectedPrice,
            currency:       agreement.currency,
            violation_pct:  violationPct,
            evidence_url:   evidenceUrl,
            agreement_id:   agreement.id,
          },
        });
      } catch { /* non-fatal */ }

      result.scrape_results.push({
        agreement_id: agreement.id,
        sku:          agreement.sku,
        retailer:     retailer.name,
        source:       scrapeSource,
        price:        detectedPrice,
        map_price:    mapPrice,
        violated:     true,
        deduped:      false,
      });
    }
  }

  return result;
}

// ============================================================================
// POST /v1/compliance/map/agreements
// ============================================================================
//
// Body:
//   sku            required text
//   map_price      required numeric (QAR)
//   currency       optional (default "QAR")
//   effective_from optional ISO date (default today)
//   effective_to   optional ISO date (null = indefinite)
//   retailer_list  required [{name, url}] — at least 1
//   notes          optional text
// ============================================================================

export async function handleCreateAgreement(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "Requires compliance:write scope.", 403);

  const body = await readJson(req);
  if (!body) return err("invalid_json", "Request body must be a JSON object.", 400);

  const sku            = (body.sku as string | undefined)?.trim();
  const mapPriceRaw    = body.map_price;
  const currency       = (body.currency as string | undefined)?.trim() ?? "QAR";
  const effectiveFrom  = (body.effective_from as string | undefined)?.trim() ?? new Date().toISOString().slice(0, 10);
  const effectiveTo    = (body.effective_to as string | undefined)?.trim() ?? null;
  const retailerList   = body.retailer_list;
  const notes          = (body.notes as string | undefined)?.trim() ?? null;

  if (!sku)           return err("missing_sku", "'sku' is required.", 400);
  const mapPrice = Number(mapPriceRaw);
  if (!mapPriceRaw || isNaN(mapPrice) || mapPrice <= 0)
    return err("invalid_map_price", "'map_price' must be a positive number.", 400);
  if (!Array.isArray(retailerList) || retailerList.length === 0)
    return err("missing_retailer_list", "'retailer_list' must be a non-empty array of {name, url} objects.", 400);
  for (const r of retailerList) {
    if (!r || typeof r !== "object" || typeof r.name !== "string" || !r.name.trim())
      return err("invalid_retailer", "Each retailer must be an object with at least {name: string}.", 400);
  }

  const { data: agreement, error } = await supabaseAdmin
    .from("map_agreements")
    .insert({
      account_id:         ctx.accountId,
      licensee_id:        ctx.licenseeId,
      created_by_user_id: ctx.userId,
      sku,
      map_price:    mapPrice,
      currency,
      effective_from: effectiveFrom,
      effective_to:   effectiveTo,
      retailer_list:  retailerList,
      notes,
    })
    .select()
    .single();

  if (error) return err("db_error", error.message, 500);

  return ok(agreement, 201);
}

// ============================================================================
// GET /v1/compliance/map/violations
// ============================================================================
//
// Query params:
//   sku       optional filter
//   retailer  optional filter
//   limit     int (default 50, max 200)
//   after     ISO datetime for pagination
//   re_sign   "true" (default) — generate fresh signed URLs from evidence_path
// ============================================================================

export async function handleListViolations(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires compliance:read scope.", 403);

  const url     = new URL(req.url);
  const sku     = url.searchParams.get("sku")?.trim();
  const retailer = url.searchParams.get("retailer")?.trim();
  const after   = url.searchParams.get("after")?.trim();
  const reSign  = url.searchParams.get("re_sign") !== "false";
  const limit   = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  let q = supabaseAdmin
    .from("map_violations")
    .select("id, sku, retailer, retailer_url, map_price, detected_price, currency, violation_pct, evidence_path, evidence_url, scrape_source, first_detected_at, agreement_id")
    .eq("account_id", ctx.accountId)
    .order("first_detected_at", { ascending: false })
    .limit(limit);

  if (sku)      q = q.eq("sku", sku);
  if (retailer) q = q.eq("retailer", retailer);
  if (after)    q = q.lt("first_detected_at", after);

  const { data, error } = await q;
  if (error) return err("db_error", error.message, 500);

  const rows = await Promise.all(
    (data ?? []).map(async (v) => {
      let freshUrl = v.evidence_url as string | null;
      if (reSign && v.evidence_path) {
        freshUrl = await refreshSignedUrl(v.evidence_path as string) ?? freshUrl;
      }
      return {
        id:              v.id,
        sku:             v.sku,
        retailer:        v.retailer,
        retailer_url:    v.retailer_url,
        map_price:       Number(v.map_price),
        detected_price:  Number(v.detected_price),
        currency:        v.currency,
        violation_pct:   Number(v.violation_pct),
        evidence_url:    freshUrl,
        scrape_source:   v.scrape_source,
        first_detected_at: v.first_detected_at,
        agreement_id:    v.agreement_id,
      };
    }),
  );

  return ok({ data: rows, count: rows.length });
}

// ============================================================================
// GET /v1/compliance/map/retailers
// ============================================================================
//
// Per-retailer compliance rate computed from active agreements + violations.
//
// compliance_rate = compliant_skus / total_monitored_skus × 100
// A (sku, retailer) pair is "compliant" if NO violation exists in the last 24h.
// ============================================================================

export async function handleRetailerCompliance(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires compliance:read scope.", 403);

  // Active agreements — expand retailer_list to get all monitored (sku, retailer) pairs
  const { data: agreements } = await supabaseAdmin
    .from("map_agreements")
    .select("sku, retailer_list")
    .eq("account_id", ctx.accountId)
    .lte("effective_from", new Date().toISOString().slice(0, 10));

  if (!agreements?.length) {
    return ok({ data: [], note: "No active MAP agreements. POST /v1/compliance/map/agreements first." });
  }

  // Build set of (sku, retailer) pairs being monitored
  const monitored = new Map<string, Set<string>>(); // retailer → Set<sku>
  for (const ag of agreements) {
    for (const r of (ag.retailer_list as Retailer[])) {
      if (!monitored.has(r.name)) monitored.set(r.name, new Set());
      monitored.get(r.name)!.add(ag.sku);
    }
  }

  // Violations in last 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentViols } = await supabaseAdmin
    .from("map_violations")
    .select("sku, retailer, violation_pct, first_detected_at")
    .eq("account_id", ctx.accountId)
    .gte("first_detected_at", cutoff);

  // Per-retailer violation set
  const violatingPairs = new Map<string, Array<{ sku: string; violation_pct: number; first_detected_at: string }>>();
  for (const v of recentViols ?? []) {
    if (!violatingPairs.has(v.retailer)) violatingPairs.set(v.retailer, []);
    violatingPairs.get(v.retailer)!.push({
      sku:              v.sku,
      violation_pct:    Number(v.violation_pct),
      first_detected_at: v.first_detected_at,
    });
  }

  const rows = Array.from(monitored.entries()).map(([retailer, skus]) => {
    const violations = violatingPairs.get(retailer) ?? [];
    const violatingSkus = new Set(violations.map((v) => v.sku));
    const totalMonitored = skus.size;
    const compliantSkus  = totalMonitored - [...skus].filter((s) => violatingSkus.has(s)).length;
    const complianceRate = totalMonitored > 0
      ? Number(((compliantSkus / totalMonitored) * 100).toFixed(2)) : 100;

    return {
      retailer,
      total_monitored_skus: totalMonitored,
      compliant_skus:       compliantSkus,
      violating_skus:       totalMonitored - compliantSkus,
      compliance_rate_pct:  complianceRate,
      violations_24h:       violations,
    };
  });

  // Sort by compliance rate ascending (worst offenders first)
  rows.sort((a, b) => a.compliance_rate_pct - b.compliance_rate_pct);

  return ok({
    data: rows,
    window: "24h",
    generated_at: new Date().toISOString(),
  });
}

// ============================================================================
// GET /v1/compliance/map/report
// ============================================================================
//
// Returns a CSV compliance report.
// Content-Type: text/csv; charset=utf-8
// Headers: retailer, sku, status, map_price, detected_price, violation_pct,
//          currency, scrape_source, first_detected_at, evidence_url
//
// Query params:
//   sku        optional filter
//   retailer   optional filter
//   format     "csv" (default) — future: "json"
//   since      ISO datetime (default: last 7 days)
// ============================================================================

export async function handleComplianceReport(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires compliance:read scope.", 403);

  const url      = new URL(req.url);
  const sku      = url.searchParams.get("sku")?.trim();
  const retailer = url.searchParams.get("retailer")?.trim();
  const since    = url.searchParams.get("since")?.trim()
    ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Violations
  let vq = supabaseAdmin
    .from("map_violations")
    .select("sku, retailer, map_price, detected_price, currency, violation_pct, scrape_source, first_detected_at, evidence_url")
    .eq("account_id", ctx.accountId)
    .gte("first_detected_at", since)
    .order("first_detected_at", { ascending: false })
    .limit(1000);

  if (sku)      vq = vq.eq("sku", sku);
  if (retailer) vq = vq.eq("retailer", retailer);

  const { data: viols } = await vq;

  // Active agreements (for compliant rows)
  let aq = supabaseAdmin
    .from("map_agreements")
    .select("sku, map_price, currency, retailer_list")
    .eq("account_id", ctx.accountId)
    .lte("effective_from", new Date().toISOString().slice(0, 10));

  if (sku) aq = aq.eq("sku", sku);
  const { data: agmts } = await aq;

  // Build the set of violating pairs for status determination
  const violSet = new Set((viols ?? []).map((v) => `${v.sku}:${v.retailer}`));

  const csvLines: string[] = [
    "retailer,sku,status,map_price,detected_price,violation_pct,currency,scrape_source,first_detected_at,evidence_url",
  ];

  // Violation rows
  for (const v of viols ?? []) {
    csvLines.push([
      q(v.retailer),
      q(v.sku),
      "violating",
      v.map_price,
      v.detected_price,
      Number(v.violation_pct).toFixed(4),
      q(v.currency),
      q(v.scrape_source),
      q(v.first_detected_at),
      q(v.evidence_url ?? ""),
    ].join(","));
  }

  // Compliant rows (monitored but not violated in the period)
  for (const ag of agmts ?? []) {
    for (const r of (ag.retailer_list as Retailer[])) {
      const pair = `${ag.sku}:${r.name}`;
      if (!violSet.has(pair)) {
        csvLines.push([
          q(r.name),
          q(ag.sku),
          "compliant",
          ag.map_price,
          "",
          "",
          q(ag.currency),
          "",
          "",
          "",
        ].join(","));
      }
    }
  }

  const csv = csvLines.join("\r\n");
  return ok(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="map-compliance-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
}

// CSV-safe field quoting
function q(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
