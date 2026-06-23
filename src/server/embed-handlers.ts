// ============================================================================
// White-Label Embed API (API 13)
//
// Endpoints (API-key auth, scope-enforced):
//   GET  /v1/embed/config    embed:read  — read licensee branding
//   POST /v1/embed/config    embed:write — create/update licensee branding
//   POST /v1/embed/token     embed:write — issue 1-hour HS256 embed JWT
//   GET  /v1/embed/scopes    embed:read  — list available widget scopes
//
// Public (embed JWT auth only):
//   GET /embed/widget?token=... — render branded HTML widget
//
// JWT: HS256, signed with the licensee's per-row signing_key_hex.
// Claims: { iss, sub (merchant_id), account_id, licensee_id, scopes, exp, iat, jti }
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { V1Context, V1Result } from "@/server/v1-handlers";

// ─── Scope guards ─────────────────────────────────────────────────────────────

function canRead(ctx: V1Context): boolean {
  return ctx.scopes.some((s) =>
    s === "embed:read" || s === "embed:write" || s === "read" || s === "write" || s === "admin",
  );
}
function canWrite(ctx: V1Context): boolean {
  return ctx.scopes.some((s) => s === "embed:write" || s === "write" || s === "admin");
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}
async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return typeof p === "object" && p !== null && !Array.isArray(p)
      ? (p as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// ─── Widget scopes ────────────────────────────────────────────────────────────

const EMBED_SCOPES = [
  {
    scope: "pricing_widget",
    description: "Recommended price card with margin floor and competitor benchmark",
  },
  {
    scope: "roi_summary",
    description: "Estimated revenue uplift if recommended price is adopted",
  },
  {
    scope: "competitor_chart",
    description: "Bar chart comparing retailer prices across Amazon, Carrefour, Lulu, Noon, Talabat",
  },
  {
    scope: "action_items",
    description: "Prioritised list of pricing actions (raise / lower / hold) with Arabic support",
  },
] as const;

type EmbedScope = (typeof EMBED_SCOPES)[number]["scope"];

const VALID_EMBED_SCOPES = new Set<string>(EMBED_SCOPES.map((s) => s.scope));

// ─── JWT utilities ────────────────────────────────────────────────────────────

function b64uEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function signEmbedJWT(
  claims: Record<string, unknown>,
  keyHex: string,
): string {
  const header = b64uEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64uEncode(JSON.stringify(claims));
  const unsigned = `${header}.${payload}`;
  const sig = createHmac("sha256", Buffer.from(keyHex, "hex"))
    .update(unsigned)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${unsigned}.${sig}`;
}

export function verifyEmbedJWT(
  token: string,
  keyHex: string,
): { valid: true; claims: Record<string, unknown> } | { valid: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, error: "malformed_token" };
  const [header, payload, sig] = parts;
  const unsigned = `${header}.${payload}`;

  const expected = createHmac("sha256", Buffer.from(keyHex, "hex"))
    .update(unsigned)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Constant-time comparison to prevent timing attacks.
  const eBuf = Buffer.from(expected, "ascii");
  const sBuf = Buffer.from(sig, "ascii");
  if (eBuf.length !== sBuf.length || !timingSafeEqual(eBuf, sBuf)) {
    return { valid: false, error: "invalid_signature" };
  }

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
  } catch {
    return { valid: false, error: "malformed_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) {
    return { valid: false, error: "token_expired" };
  }
  return { valid: true, claims };
}

// Decode claims without verifying signature — used to extract licensee_id
// before we know which key to verify with.
export function decodeEmbedJWTClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
  } catch {
    return null;
  }
}

// ─── Config handlers ──────────────────────────────────────────────────────────

export async function handleGetEmbedConfig(
  _req: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires embed:read scope.", 403);

  const { data, error } = await supabaseAdmin
    .from("embed_configs")
    .select("id, brand_name, primary_color, logo_url, powered_by_visible, created_at, updated_at")
    .eq("licensee_id", ctx.licenseeId)
    .maybeSingle();

  if (error) return err("internal_error", error.message, 500);
  if (!data) {
    return err(
      "not_found",
      "No embed config found for this license. POST /v1/embed/config to create one.",
      404,
    );
  }
  return ok({ config: data });
}

export async function handleSetEmbedConfig(
  req: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "Requires embed:write scope.", 403);

  const body = await readJson(req);
  if (!body) return err("validation_failed", "Request body must be a valid JSON object.", 422);

  const { brand_name, primary_color, logo_url, powered_by_visible } = body as Record<string, unknown>;

  if (typeof brand_name !== "string" || !brand_name.trim()) {
    return err("validation_failed", "`brand_name` is required (non-empty string).", 422, {
      fields: [{ name: "brand_name", error: "required" }],
    });
  }
  if (primary_color !== undefined && typeof primary_color !== "string") {
    return err("validation_failed", "`primary_color` must be a CSS color string (e.g. #FF6600).", 422);
  }
  if (logo_url !== undefined && logo_url !== null && typeof logo_url !== "string") {
    return err("validation_failed", "`logo_url` must be a string URL or null.", 422);
  }
  if (powered_by_visible !== undefined && typeof powered_by_visible !== "boolean") {
    return err("validation_failed", "`powered_by_visible` must be a boolean.", 422);
  }

  // Check for existing config to decide create vs update.
  const { data: existing } = await supabaseAdmin
    .from("embed_configs")
    .select("id, signing_key_hex")
    .eq("licensee_id", ctx.licenseeId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const update: Record<string, unknown> = { updated_at: now };
    update.brand_name = brand_name.trim();
    if (primary_color !== undefined) update.primary_color = primary_color;
    if (logo_url !== undefined) update.logo_url = logo_url;
    if (powered_by_visible !== undefined) update.powered_by_visible = powered_by_visible;

    // update is built dynamically; cast suppresses excess-property check
    const { error } = await (supabaseAdmin.from("embed_configs") as any)
      .update(update)
      .eq("id", existing.id);
    if (error) return err("internal_error", error.message, 500);
  } else {
    const newKey = randomBytes(32).toString("hex");
    const insert: Record<string, unknown> = {
      licensee_id: ctx.licenseeId,
      account_id: ctx.accountId,
      brand_name: brand_name.trim(),
      signing_key_hex: newKey,
      created_at: now,
      updated_at: now,
    };
    if (primary_color !== undefined) insert.primary_color = primary_color;
    if (logo_url !== undefined) insert.logo_url = logo_url;
    if (powered_by_visible !== undefined) insert.powered_by_visible = powered_by_visible;

    const { error } = await (supabaseAdmin.from("embed_configs") as any).insert(insert);
    if (error) return err("internal_error", error.message, 500);
  }

  const { data: saved } = await supabaseAdmin
    .from("embed_configs")
    .select("id, brand_name, primary_color, logo_url, powered_by_visible, created_at, updated_at")
    .eq("licensee_id", ctx.licenseeId)
    .maybeSingle();

  return ok({ config: saved }, existing ? 200 : 201);
}

// ─── Token issuance ───────────────────────────────────────────────────────────

export async function handleIssueEmbedToken(
  req: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "Requires embed:write scope.", 403);

  const body = await readJson(req);
  if (!body) return err("validation_failed", "Request body must be a valid JSON object.", 422);

  const { merchant_id, scopes } = body as Record<string, unknown>;

  if (typeof merchant_id !== "string" || !merchant_id.trim()) {
    return err("validation_failed", "`merchant_id` is required (account UUID).", 422, {
      fields: [{ name: "merchant_id", error: "required" }],
    });
  }
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return err("validation_failed", "`scopes` must be a non-empty array of embed scope strings.", 422, {
      fields: [{ name: "scopes", error: "required" }],
    });
  }
  const invalidScopes = (scopes as unknown[]).filter(
    (s) => typeof s !== "string" || !VALID_EMBED_SCOPES.has(s),
  );
  if (invalidScopes.length > 0) {
    return err(
      "validation_failed",
      `Invalid scopes: ${invalidScopes.join(", ")}. Valid values: ${[...VALID_EMBED_SCOPES].join(", ")}.`,
      422,
      { fields: [{ name: "scopes", error: "invalid" }] },
    );
  }

  // Validate merchant exists under this licensee.
  const { data: merchant, error: mErr } = await supabaseAdmin
    .from("accounts_v2")
    .select("id, name")
    .eq("id", merchant_id.trim())
    .eq("licensee_id", ctx.licenseeId)
    .maybeSingle();

  if (mErr) return err("internal_error", mErr.message, 500);
  if (!merchant) {
    return err(
      "merchant_not_found",
      "`merchant_id` is not a valid account under this license.",
      422,
      { fields: [{ name: "merchant_id", error: "invalid" }] },
    );
  }

  // Load embed config (contains signing key).
  const { data: cfg, error: cfgErr } = await supabaseAdmin
    .from("embed_configs")
    .select("signing_key_hex, brand_name, primary_color, logo_url, powered_by_visible")
    .eq("licensee_id", ctx.licenseeId)
    .maybeSingle();

  if (cfgErr) return err("internal_error", cfgErr.message, 500);
  if (!cfg) {
    return err(
      "embed_config_required",
      "No embed config found for this license. POST /v1/embed/config to set branding before issuing tokens.",
      422,
    );
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour
  const jti = randomBytes(12).toString("hex");

  const claims = {
    iss: "embed-v1",
    sub: merchant_id.trim(),
    account_id: merchant_id.trim(),
    licensee_id: ctx.licenseeId,
    scopes: scopes as string[],
    exp,
    iat,
    jti,
  };

  const token = signEmbedJWT(claims, cfg.signing_key_hex);

  const origin = process.env.WORKER_ORIGIN ?? "https://prizeskoutqa.prizeskoutqatar.workers.dev";
  const embedUrl = `${origin}/embed/widget?token=${token}`;

  return ok({
    embed_token: token,
    embed_url: embedUrl,
    expires_at: new Date(exp * 1000).toISOString(),
    token_type: "HS256",
    decoded_claims: {
      iss: claims.iss,
      sub: claims.sub,
      licensee_id: claims.licensee_id,
      scopes: claims.scopes,
      exp: claims.exp,
      iat: claims.iat,
      jti: claims.jti,
    },
    branding: {
      brand_name: cfg.brand_name,
      primary_color: cfg.primary_color,
      logo_url: cfg.logo_url,
      powered_by_visible: cfg.powered_by_visible,
    },
  });
}

// ─── Scopes list ──────────────────────────────────────────────────────────────

export async function handleListEmbedScopes(
  _req: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires embed:read scope.", 403);
  return ok({ scopes: EMBED_SCOPES });
}

// ─── Widget data helpers (used by the widget renderer) ────────────────────────

type CompetitorRow = {
  product: string;
  amazon?: { price?: number } | null;
  carrefour?: { price?: number } | null;
  lulu?: { price?: number } | null;
  noon?: { price?: number } | null;
  talabat?: { price?: number } | null;
  updated_at?: string;
};

export type WidgetData = {
  merchant_name: string | null;
  recommendation: {
    output_price: number;
    reason: string;
    channel: string;
    input_competitor_min: number | null;
    input_margin_floor: number | null;
    created_at: string;
  } | null;
  competitors: { name: string; price: number }[];
  competitor_min: number | null;
  price_gap: number | null;
  action_key: string;
};

const RETAILERS = ["amazon", "carrefour", "lulu", "noon", "talabat"] as const;

export async function fetchWidgetData(merchantId: string): Promise<WidgetData> {
  // Resolve user_id for this account (competitor_prices is keyed by user_id).
  const { data: acct } = await supabaseAdmin
    .from("accounts_v2")
    .select("user_id, name")
    .eq("id", merchantId)
    .maybeSingle();

  const merchantName = (acct as { name?: string } | null)?.name ?? null;

  // Latest dynprice recommendation.
  const { data: rec } = await supabaseAdmin
    .from("dynprice_decisions")
    .select(
      "output_price, reason, channel, input_competitor_min, input_margin_floor, created_at",
    )
    .eq("account_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Competitor prices (most recent row for this user's catalog).
  let competitors: { name: string; price: number }[] = [];
  let competitorMin: number | null = null;

  if (acct) {
    const { data: compRow } = await supabaseAdmin
      .from("competitor_prices")
      .select("product, amazon, carrefour, lulu, noon, talabat, updated_at")
      .eq("user_id", (acct as { user_id: string }).user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (compRow) {
      const row = compRow as CompetitorRow;
      for (const r of RETAILERS) {
        const v = row[r];
        if (v && typeof v.price === "number") {
          competitors.push({ name: r, price: v.price });
        }
      }
      if (competitors.length > 0) {
        competitorMin = Math.min(...competitors.map((c) => c.price));
      }
    }
  }

  // Derive action key.
  let actionKey = "hold_competitive";
  if (rec) {
    const floor = (rec as { input_margin_floor?: number | null }).input_margin_floor ?? null;
    const compMin =
      (rec as { input_competitor_min?: number | null }).input_competitor_min ?? competitorMin;
    const price = (rec as { output_price: number }).output_price;
    if (floor !== null && price <= floor + 0.01) {
      actionKey = "raise_above_floor";
    } else if (compMin !== null && price < compMin - 0.5) {
      actionKey = "lower_to_match";
    }
  } else if (!rec && competitors.length === 0) {
    actionKey = "no_data";
  }

  const priceGap =
    rec && competitorMin !== null
      ? Math.round((competitorMin - (rec as { output_price: number }).output_price) * 100) / 100
      : null;

  return {
    merchant_name: merchantName,
    recommendation: rec
      ? {
          output_price: (rec as { output_price: number }).output_price,
          reason: (rec as { reason: string }).reason,
          channel: (rec as { channel: string }).channel,
          input_competitor_min:
            (rec as { input_competitor_min?: number | null }).input_competitor_min ?? null,
          input_margin_floor:
            (rec as { input_margin_floor?: number | null }).input_margin_floor ?? null,
          created_at: (rec as { created_at: string }).created_at,
        }
      : null,
    competitors,
    competitor_min: competitorMin,
    price_gap: priceGap,
    action_key: actionKey,
  };
}

// ─── Widget HTML renderer ─────────────────────────────────────────────────────

type EmbedConfig = {
  brand_name: string;
  primary_color: string;
  logo_url: string | null;
  powered_by_visible: boolean;
};

export function renderWidget(
  data: WidgetData,
  cfg: EmbedConfig,
  grantedScopes: string[],
): string {
  const sc = new Set(grantedScopes);
  const hasPricing = sc.has("pricing_widget");
  const hasRoi = sc.has("roi_summary");
  const hasChart = sc.has("competitor_chart");
  const hasActions = sc.has("action_items");

  const color = cfg.primary_color || "#0066CC";
  const brand = cfg.brand_name || "Price Intelligence";

  // Arabic static strings — reuse existing MSA business phrases.
  const AR: Record<string, string> = {
    title: "تحليل الأسعار",
    recommended: "السعر الموصى به",
    currency: "ريال",
    competitors: "أسعار المنافسين",
    gap: "الفجوة التنافسية",
    gap_ahead: "أفضل من المنافسين بـ",
    gap_behind: "أعلى من أدنى سعر بـ",
    action: "الإجراء المقترح",
    roi_title: "أثر الإيرادات المتوقع",
    roi_desc: "التحول إلى السعر الموصى به",
    noRec: "لا توجد بيانات توصية متاحة",
    noComp: "لا توجد بيانات منافسين متاحة",
    noData: "لا توجد بيانات متاحة بعد",
    lastUpdated: "آخر تحديث",
    poweredBy: "مدعوم بواسطة",
    amazon: "أمازون",
    carrefour: "كارفور",
    lulu: "لولو",
    noon: "نون",
    talabat: "طلبات",
    // Action phrases from AR_TEMPLATE:
    raise_above_floor: `ارفع السعر فوق الحد الأدنى للهامش`,
    lower_to_match: `خفّض السعر لمجاراة أدنى سعر للمنافسين`,
    hold_competitive: `حافظ على السعر — الهامش والمركز التنافسي مقبولان`,
    no_data: `بيانات غير كافية لإصدار توصية`,
  };

  const actionEN: Record<string, string> = {
    raise_above_floor: "Raise price above margin floor",
    lower_to_match: "Lower price to match cheapest competitor",
    hold_competitive: "Hold price — margin and competitive position acceptable",
    no_data: "Insufficient data for a recommendation",
  };

  const rec = data.recommendation;
  const competitorLabelEN: Record<string, string> = {
    amazon: "Amazon",
    carrefour: "Carrefour",
    lulu: "Lulu",
    noon: "Noon",
    talabat: "Talabat",
  };

  // Competitor bars for the chart scope
  const maxCompPrice =
    data.competitors.length > 0
      ? Math.max(...data.competitors.map((c) => c.price), rec?.output_price ?? 0)
      : 0;

  function pct(v: number): string {
    return maxCompPrice > 0 ? `${Math.round((v / maxCompPrice) * 100)}%` : "0%";
  }

  const competitorBars = data.competitors
    .map(
      (c) => `
      <div class="bar-row">
        <span class="bar-label en">${competitorLabelEN[c.name] ?? c.name}</span>
        <span class="bar-label ar">${AR[c.name] ?? c.name}</span>
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${pct(c.price)};background:#e5e7eb"></div>
          <span class="bar-val">${c.price.toFixed(2)}</span>
        </div>
      </div>`,
    )
    .join("");

  const recBar = rec
    ? `
      <div class="bar-row rec-bar">
        <span class="bar-label en" style="color:${color};font-weight:700">✓ Recommended</span>
        <span class="bar-label ar" style="color:${color};font-weight:700">✓ السعر الموصى به</span>
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${pct(rec.output_price)};background:${color}33"></div>
          <span class="bar-val" style="color:${color};font-weight:700">${rec.output_price.toFixed(2)}</span>
        </div>
      </div>`
    : "";

  const logoHtml = cfg.logo_url
    ? `<img src="${cfg.logo_url}" alt="${brand} logo" class="logo" />`
    : `<div class="logo-placeholder" style="background:${color}">${brand.charAt(0).toUpperCase()}</div>`;

  const poweredByHtml = cfg.powered_by_visible
    ? `<div class="footer">
        <span class="en">Powered by <strong>${brand}</strong></span>
        <span class="ar">مدعوم بواسطة <strong>${brand}</strong></span>
      </div>`
    : "";

  // Gap display
  const gapHtml =
    rec && data.price_gap !== null
      ? `<div class="gap-chip ${data.price_gap >= 0 ? "gap-ahead" : "gap-behind"}">
          <span class="en">${data.price_gap >= 0 ? `▲ ${data.price_gap.toFixed(2)} QAR ahead of cheapest competitor` : `▼ ${Math.abs(data.price_gap).toFixed(2)} QAR above cheapest competitor`}</span>
          <span class="ar">${data.price_gap >= 0 ? `${AR.gap_ahead} ${data.price_gap.toFixed(2)} ريال` : `${AR.gap_behind} ${Math.abs(data.price_gap).toFixed(2)} ريال`}</span>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${brand} — Price Intelligence</title>
<style>
  :root { --brand: ${color}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 13px; background: #f9fafb; color: #111827;
    padding: 12px; min-width: 280px;
  }
  body.rtl { direction: rtl; text-align: right; }
  .card { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; padding: 14px; margin-bottom: 10px; }
  .header { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 2px solid var(--brand); margin-bottom: 12px; }
  .logo { height: 30px; border-radius: 4px; }
  .logo-placeholder { width: 30px; height: 30px; border-radius: 6px; color: #fff; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .brand-name { font-size: 15px; font-weight: 700; color: var(--brand); }
  .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 8px; }
  .price-big { font-size: 28px; font-weight: 800; color: var(--brand); line-height: 1; }
  .price-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .price-reason { font-size: 11px; color: #374151; margin-top: 8px; line-height: 1.4; }
  .gap-chip { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 8px; }
  .gap-ahead { background: #dcfce7; color: #15803d; }
  .gap-behind { background: #fef3c7; color: #92400e; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .bar-label { font-size: 11px; width: 68px; flex-shrink: 0; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-wrap { flex: 1; position: relative; height: 18px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width .3s; }
  .bar-val { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #374151; }
  body.rtl .bar-val { right: auto; left: 6px; }
  .action-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px; border-radius: 7px; }
  .action-item.raise { background: #fef3c7; }
  .action-item.lower { background: #dbeafe; }
  .action-item.hold  { background: #dcfce7; }
  .action-item.nodata { background: #f3f4f6; }
  .action-icon { font-size: 15px; line-height: 1.4; flex-shrink: 0; }
  .action-text { font-size: 12px; color: #1f2937; line-height: 1.45; }
  .roi-stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
  .roi-stat:last-child { border-bottom: none; }
  .roi-key { font-size: 11px; color: #6b7280; }
  .roi-val { font-size: 12px; font-weight: 600; color: #111827; }
  .lang-toggle { position: fixed; top: 10px; right: 10px; display: flex; gap: 4px; }
  body.rtl .lang-toggle { right: auto; left: 10px; }
  .lang-btn { padding: 3px 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 11px; cursor: pointer; background: #fff; }
  .lang-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }
  /* Language visibility */
  body:not(.rtl) .ar { display: none; }
  body.rtl .en { display: none; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; padding-top: 8px; }
  .no-data { color: #9ca3af; font-size: 12px; padding: 12px 0; }
</style>
</head>
<body>
<div class="lang-toggle">
  <button class="lang-btn active" onclick="setLang('en')">EN</button>
  <button class="lang-btn" onclick="setLang('ar')">عر</button>
</div>

<div class="card">
  <div class="header">
    ${logoHtml}
    <div>
      <div class="brand-name">${brand}</div>
      <div class="price-label en">Price Intelligence</div>
      <div class="price-label ar">${AR.title}</div>
    </div>
  </div>

  ${hasPricing ? `
  <div class="section-title en">Recommended Price</div>
  <div class="section-title ar">${AR.recommended}</div>
  ${rec ? `
  <div class="price-big">${rec.output_price.toFixed(2)} <span class="en" style="font-size:14px;font-weight:500;color:#6b7280">QAR</span><span class="ar" style="font-size:14px;font-weight:500;color:#6b7280">${AR.currency}</span></div>
  <div class="price-label en">${rec.channel} channel · Updated ${new Date(rec.created_at).toLocaleDateString("en-GB")}</div>
  <div class="price-label ar">${AR.lastUpdated}: ${new Date(rec.created_at).toLocaleDateString("ar-QA")}</div>
  <div class="price-reason en">${rec.reason}</div>
  ${gapHtml}
  ` : `<div class="no-data en">No recommendation data available yet.</div><div class="no-data ar">${AR.noRec}</div>`}
  ` : ""}
</div>

${hasChart && (data.competitors.length > 0 || rec) ? `
<div class="card">
  <div class="section-title en">Competitor Prices (QAR)</div>
  <div class="section-title ar">${AR.competitors}</div>
  ${competitorBars}
  ${recBar}
</div>` : ""}

${hasActions ? `
<div class="card">
  <div class="section-title en">Action Items</div>
  <div class="section-title ar">${AR.action}</div>
  <div class="action-item ${data.action_key === "raise_above_floor" ? "raise" : data.action_key === "lower_to_match" ? "lower" : data.action_key === "no_data" ? "nodata" : "hold"}">
    <span class="action-icon">${data.action_key === "raise_above_floor" ? "⚠️" : data.action_key === "lower_to_match" ? "📉" : data.action_key === "no_data" ? "📊" : "✅"}</span>
    <div>
      <div class="action-text en">${actionEN[data.action_key] ?? actionEN.hold_competitive}</div>
      <div class="action-text ar">${AR[data.action_key] ?? AR.hold_competitive}</div>
    </div>
  </div>
</div>` : ""}

${hasRoi && rec ? `
<div class="card">
  <div class="section-title en">Revenue Impact</div>
  <div class="section-title ar">${AR.roi_title}</div>
  <div class="roi-stat">
    <span class="roi-key en">Recommended price</span>
    <span class="roi-key ar">${AR.recommended}</span>
    <span class="roi-val">${rec.output_price.toFixed(2)} QAR</span>
  </div>
  ${data.competitor_min !== null ? `
  <div class="roi-stat">
    <span class="roi-key en">Cheapest competitor</span>
    <span class="roi-key ar">أدنى سعر منافس</span>
    <span class="roi-val">${data.competitor_min.toFixed(2)} QAR</span>
  </div>` : ""}
  ${rec.input_margin_floor !== null ? `
  <div class="roi-stat">
    <span class="roi-key en">Margin floor</span>
    <span class="roi-key ar">الحد الأدنى للهامش</span>
    <span class="roi-val">${rec.input_margin_floor.toFixed(2)} QAR</span>
  </div>` : ""}
</div>` : ""}

${poweredByHtml}

<script>
function setLang(l) {
  document.body.classList.toggle('rtl', l === 'ar');
  document.body.setAttribute('lang', l === 'ar' ? 'ar' : 'en');
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.trim() === (l === 'ar' ? 'عر' : 'EN'));
  });
}
</script>
</body>
</html>`;
}
