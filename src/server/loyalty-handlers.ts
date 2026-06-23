// ============================================================================
// Loyalty & Segment Pricing handlers — /v1/loyalty/*  (API 11)
//
// Endpoints:
//   POST /v1/loyalty/segments   — create segment
//   GET  /v1/loyalty/segments   — list segments
//   POST /v1/loyalty/price      — resolve segment price (floor-safe)
//   POST /v1/loyalty/outcome    — record A/B purchase outcome
//
// Pricing rules:
//   pct_discount     → segment_price = base_price × (1 – rule_value)
//   fixed_price      → segment_price = rule_value (absolute QAR)
//   points_multiplier→ segment_price = base_price; points = floor(price × rule_value)
//
// Floor protection:
//   Reuses computeFloor() from dynprice-handlers.ts (exact API 07 formula).
//   If segment_price < floor → clamp to floor, log to dynprice_floor_overrides.
//
// GCC loyalty programs (Shukran / Nojoom / Tawasol): STUBBED.
//   Requires partner OAuth2/REST credentials — see note on each stub.
//
// A/B testing:
//   control   → return base_price
//   treatment → return segment_price (discounted)
//   Assignment is STICKY per (account_id, customer_id, sku, channel).
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { r2 } from "./margin";
import { computeFloor } from "./dynprice-handlers";
import type { V1Context, V1Result } from "./v1-handlers";

// ─── Scope helpers ────────────────────────────────────────────────────────────

function canLoyaltyWrite(ctx: V1Context): boolean {
  return ctx.scopes.includes("loyalty:write") || ctx.scopes.includes("write") || ctx.scopes.includes("admin");
}
function canLoyaltyRead(ctx: V1Context): boolean {
  return ctx.scopes.includes("loyalty:read") || canLoyaltyWrite(ctx);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  } catch { return null; }
}

// ─── GCC Program stub metadata ─────────────────────────────────────────────

const GCC_PROGRAM_STUBS: Record<string, { name: string; operator: string; integration: string; note: string }> = {
  shukran: {
    name:        "Shukran",
    operator:    "Majid Al Futtaim (UAE/KSA/QA)",
    integration: "OAuth2 partner API",
    note:        "Shukran partner credentials required. Contact Majid Al Futtaim partner team for OAuth2 client_id/client_secret.",
  },
  nojoom: {
    name:        "Nojoom (Ooredoo Qatar)",
    operator:    "Ooredoo Qatar (QA)",
    integration: "REST API partner integration",
    note:        "Nojoom partner credentials required. Contact Ooredoo Qatar partner team for API access.",
  },
  tawasol: {
    name:        "Tawasol",
    operator:    "Qatar loyalty network (QA)",
    integration: "REST API partner integration",
    note:        "Tawasol partner credentials required. Contact Qatar Ministry of Commerce.",
  },
};

// ─── Price-label builder ──────────────────────────────────────────────────────

function priceLabel(
  displayLabel: string,
  price: number,
  clamped: boolean,
  ruleType: string,
): string {
  const fmt = new Intl.NumberFormat("en-QA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
  if (clamped)           return `Floor Clamped: QAR ${fmt}`;
  if (ruleType === "points_multiplier") return `${displayLabel} Price: QAR ${fmt} (bonus points)`;
  return `${displayLabel} Price: QAR ${fmt}`;
}

// ============================================================================
// POST /v1/loyalty/segments
// Create a loyalty segment for the account.
// Scope: loyalty:write (or write / admin)
// ============================================================================

export async function handleCreateSegment(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canLoyaltyWrite(ctx)) return err("forbidden", "scope loyalty:write required", 403);

  const body = await readJson(request);
  if (!body) return err("invalid_request", "request body must be a JSON object", 400);

  const name              = (body.name              as string | undefined)?.trim();
  const display_label     = (body.display_label     as string | undefined)?.trim();
  const pricing_rule_type = (body.pricing_rule_type as string | undefined)?.trim();
  const rule_value_raw    = body.rule_value;
  const gcc_program       = (body.gcc_program       as string | undefined)?.trim() || null;
  const valid_from        = (body.valid_from        as string | undefined) || null;
  const valid_to          = (body.valid_to          as string | undefined) || null;
  const enabled           = body.enabled !== false; // default true

  if (!name)              return err("invalid_request", "name is required",               400);
  if (!display_label)     return err("invalid_request", "display_label is required",      400);
  if (!pricing_rule_type) return err("invalid_request", "pricing_rule_type is required",  400);

  const validRuleTypes = ["pct_discount", "fixed_price", "points_multiplier"];
  if (!validRuleTypes.includes(pricing_rule_type))
    return err("invalid_request", `pricing_rule_type must be one of: ${validRuleTypes.join(", ")}`, 400);

  const rule_value = typeof rule_value_raw === "number" ? rule_value_raw : parseFloat(String(rule_value_raw));
  if (!isFinite(rule_value) || rule_value <= 0)
    return err("invalid_request", "rule_value must be a positive number", 400);

  if (pricing_rule_type === "pct_discount" && rule_value >= 1)
    return err("invalid_request", "pct_discount rule_value must be < 1 (e.g. 0.08 for 8% off)", 400);

  const validPrograms = ["shukran", "nojoom", "tawasol"];
  if (gcc_program && !validPrograms.includes(gcc_program))
    return err("invalid_request", `gcc_program must be one of: ${validPrograms.join(", ")}`, 400);

  const { data: seg, error: segErr } = await supabaseAdmin
    .from("loyalty_segments")
    .insert({
      account_id:        ctx.accountId,
      licensee_id:       ctx.licenseeId,
      name,
      display_label,
      pricing_rule_type,
      rule_value,
      gcc_program,
      valid_from,
      valid_to,
      enabled,
    })
    .select()
    .single();

  if (segErr) {
    if (segErr.code === "23505") return err("conflict", `segment '${name}' already exists for this account`, 409);
    return err("internal_error", segErr.message, 500);
  }

  return ok(seg, 201);
}

// ============================================================================
// GET /v1/loyalty/segments
// List segments for the account.
// Query: ?enabled=true|false (default: all), ?limit=50
// Scope: loyalty:read
// ============================================================================

export async function handleListSegments(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canLoyaltyRead(ctx)) return err("forbidden", "scope loyalty:read required", 403);

  const url     = new URL(request.url);
  const enabled = url.searchParams.get("enabled");
  const limit   = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);

  let q = supabaseAdmin
    .from("loyalty_segments")
    .select("id, name, display_label, pricing_rule_type, rule_value, gcc_program, valid_from, valid_to, enabled, created_at")
    .eq("account_id", ctx.accountId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (enabled === "true")  q = q.eq("enabled", true);
  if (enabled === "false") q = q.eq("enabled", false);

  const { data, error } = await q;
  if (error) return err("internal_error", error.message, 500);

  return ok({ data: data ?? [] });
}

// ============================================================================
// POST /v1/loyalty/price
// Resolve a loyalty segment discount against base_price.
// Body: {
//   sku, segment_name, base_price?, channel?, customer_id?, ab_test?,
//   min_margin_pct?
// }
// Scope: loyalty:read
// ============================================================================

export async function handleLoyaltyPrice(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canLoyaltyRead(ctx)) return err("forbidden", "scope loyalty:read required", 403);

  const body = await readJson(request);
  if (!body) return err("invalid_request", "request body must be a JSON object", 400);

  const sku          = (body.sku          as string | undefined)?.trim();
  const segmentName  = (body.segment_name as string | undefined)?.trim();
  const channel      = ((body.channel     as string | undefined)?.trim()) || "Online";
  const customerId   = (body.customer_id  as string | undefined)?.trim() || null;
  const abTest       = Boolean(body.ab_test);

  if (!sku)         return err("invalid_request", "sku is required",          400);
  if (!segmentName) return err("invalid_request", "segment_name is required", 400);

  // ── Resolve segment ───────────────────────────────────────────────────────

  const { data: seg, error: segErr } = await supabaseAdmin
    .from("loyalty_segments")
    .select("id, name, display_label, pricing_rule_type, rule_value, gcc_program, valid_from, valid_to, enabled")
    .eq("account_id", ctx.accountId)
    .eq("name", segmentName)
    .maybeSingle();

  if (segErr)   return err("internal_error", segErr.message, 500);
  if (!seg)     return err("not_found", `segment '${segmentName}' not found`, 404);
  if (!seg.enabled) return err("not_found", `segment '${segmentName}' is disabled`, 404);

  const now = Date.now();
  if (seg.valid_from && new Date(seg.valid_from as string).getTime() > now)
    return err("segment_inactive", `segment '${segmentName}' is not yet active`, 400);
  if (seg.valid_to && new Date(seg.valid_to as string).getTime() < now)
    return err("segment_expired", `segment '${segmentName}' has expired`, 400);

  // ── Resolve base_price ────────────────────────────────────────────────────

  let basePrice: number;
  if (typeof body.base_price === "number" && body.base_price > 0) {
    basePrice = body.base_price as number;
  } else {
    const { data: cfg } = await supabaseAdmin
      .from("dynprice_configs")
      .select("base_price")
      .eq("account_id", ctx.accountId)
      .eq("sku", sku)
      .ilike("channel", channel)
      .maybeSingle();
    if (!cfg) return err("invalid_request", "base_price required (not in request and no dynprice_config found)", 400);
    basePrice = Number(cfg.base_price);
  }

  // ── Resolve min_margin_pct ─────────────────────────────────────────────────

  let minMarginPct: number;
  if (typeof body.min_margin_pct === "number") {
    minMarginPct = body.min_margin_pct as number;
  } else {
    const { data: cfg } = await supabaseAdmin
      .from("dynprice_configs")
      .select("min_margin_pct")
      .eq("account_id", ctx.accountId)
      .eq("sku", sku)
      .ilike("channel", channel)
      .maybeSingle();
    minMarginPct = cfg ? Number(cfg.min_margin_pct) : 0;
  }

  // ── Resolve catalog product UUID (needed for computeFloor) ─────────────────
  // margin_inputs.product_id is a UUID ref to catalog_products.id (not sku text).

  const { data: catalogProduct } = await supabaseAdmin
    .from("catalog_products")
    .select("id")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  // ── Compute segment_price ─────────────────────────────────────────────────

  const ruleType  = seg.pricing_rule_type as string;
  const ruleValue = Number(seg.rule_value);
  let rawSegmentPrice: number;

  if (ruleType === "pct_discount") {
    rawSegmentPrice = r2(basePrice * (1 - ruleValue));
  } else if (ruleType === "fixed_price") {
    rawSegmentPrice = r2(ruleValue);
  } else {
    // points_multiplier — no price change
    rawSegmentPrice = basePrice;
  }

  // ── Floor protection (exact API 07 formula) ───────────────────────────────
  // computeFloor expects catalog_products.id (UUID), not sku text.

  const floorPrice = catalogProduct
    ? await computeFloor(ctx.accountId, catalogProduct.id, channel, minMarginPct)
    : null;
  let segmentPrice = rawSegmentPrice;
  let floorClamped = false;
  let clampNote: string | null = null;

  if (floorPrice !== null && segmentPrice < floorPrice) {
    segmentPrice = floorPrice;
    floorClamped = true;
    clampNote    = `proposed ${rawSegmentPrice} < floor ${floorPrice}`;

    await supabaseAdmin.from("dynprice_floor_overrides").insert({
      account_id:     ctx.accountId,
      licensee_id:    ctx.licenseeId,
      sku,
      channel,
      rule_id:        null,
      rule_name:      `loyalty:${segmentName}`,
      min_margin_pct: minMarginPct,
      proposed_price: rawSegmentPrice,
      floor_price:    floorPrice,
      final_price:    segmentPrice,
    });
  }

  // ── Discount pct (for display) ────────────────────────────────────────────

  const discountPct = ruleType === "points_multiplier"
    ? 0
    : r2((basePrice - segmentPrice) / basePrice);

  // ── Loyalty points earned ─────────────────────────────────────────────────

  const loyaltyPointsEarned = ruleType === "points_multiplier"
    ? Math.floor(segmentPrice * ruleValue)
    : Math.floor(segmentPrice);

  // ── A/B assignment ────────────────────────────────────────────────────────

  let abResult: { assignment_id: string; variant: "control" | "treatment" } | null = null;
  let finalPrice = segmentPrice;

  if (abTest && customerId) {
    const { data: existing } = await supabaseAdmin
      .from("loyalty_ab_assignments")
      .select("id, variant")
      .eq("account_id", ctx.accountId)
      .eq("customer_id", customerId)
      .eq("sku", sku)
      .eq("channel", channel)
      .maybeSingle();

    if (existing) {
      abResult = { assignment_id: existing.id as string, variant: existing.variant as "control" | "treatment" };
    } else {
      const variant: "control" | "treatment" = Math.random() < 0.5 ? "control" : "treatment";
      const { data: newAssign, error: assignErr } = await supabaseAdmin
        .from("loyalty_ab_assignments")
        .insert({
          account_id:  ctx.accountId,
          customer_id: customerId,
          sku,
          channel,
          segment_id:  seg.id,
          variant,
        })
        .select("id, variant")
        .single();

      if (!assignErr && newAssign) {
        abResult = { assignment_id: newAssign.id as string, variant: newAssign.variant as "control" | "treatment" };
      }
    }

    if (abResult?.variant === "control") {
      finalPrice = basePrice;
    }
  }

  // ── GCC program stub ──────────────────────────────────────────────────────

  const gccProgramStub = seg.gcc_program
    ? { program: seg.gcc_program, ...GCC_PROGRAM_STUBS[seg.gcc_program as string], status: "stub" as const }
    : undefined;

  // ── Audit to pricing_decisions (API 04) ───────────────────────────────────

  await (supabaseAdmin.from("pricing_decisions") as any).insert({
    user_id:           ctx.userId,
    product:           sku,
    category:          null,
    channel,
    current_price:     basePrice,
    recommended_price: finalPrice,
    decision:          "loyalty_rec",
    source:            "loyalty_engine_v1",
    trigger_type:      ruleType,
    rule_fired:        segmentName,
    rule_reason:       floorClamped
      ? `loyalty:${ruleType}:${segmentName} — floor clamp applied (${clampNote})`
      : `loyalty:${ruleType}:${segmentName}`,
    inputs_snapshot:   {
      sku, channel, segment_name: segmentName, rule_type: ruleType,
      rule_value: ruleValue, base_price: basePrice,
      min_margin_pct: minMarginPct, floor_price: floorPrice,
      floor_clamped: floorClamped,
      ab_variant: abResult?.variant ?? null,
    },
    alternatives:      [],
    cost_snapshot:     { floor_price: floorPrice, min_margin_pct: minMarginPct },
    note:              `loyalty_engine_v1 | sku:${sku} | seg:${segmentName} | final:${finalPrice}`,
  });

  // ── Response ──────────────────────────────────────────────────────────────

  const resp: Record<string, unknown> = {
    sku,
    channel,
    currency:             "QAR",
    segment:              segmentName,
    segment_id:           seg.id,
    base_price:           basePrice,
    segment_price:        finalPrice,
    discount_pct:         abResult?.variant === "control" ? 0 : discountPct,
    price_label:          abResult?.variant === "control"
      ? `Base Price: QAR ${basePrice.toFixed(2)}`
      : priceLabel(seg.display_label as string, finalPrice, floorClamped, ruleType),
    loyalty_points_earned: abResult?.variant === "control" ? Math.floor(basePrice) : loyaltyPointsEarned,
    floor:                floorPrice,
    floor_clamped:        floorClamped,
    audited:              true,
  };

  if (gccProgramStub) resp.gcc_program_stub = gccProgramStub;
  if (abResult)       resp.ab = abResult;

  return ok(resp);
}

// ============================================================================
// POST /v1/loyalty/outcome
// Record a purchase outcome for A/B conversion analysis.
// Body: { assignment_id?, customer_id, sku, channel?, variant, purchased, price_paid? }
// Scope: loyalty:write
// ============================================================================

export async function handleLoyaltyOutcome(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!canLoyaltyWrite(ctx)) return err("forbidden", "scope loyalty:write required", 403);

  const body = await readJson(request);
  if (!body) return err("invalid_request", "request body must be a JSON object", 400);

  const assignment_id = (body.assignment_id as string | undefined) || null;
  const customer_id   = (body.customer_id   as string | undefined)?.trim();
  const sku           = (body.sku           as string | undefined)?.trim();
  const channel       = ((body.channel      as string | undefined)?.trim()) || "Online";
  const variant       = (body.variant       as string | undefined)?.trim();
  const purchased     = Boolean(body.purchased);
  const price_paid    = typeof body.price_paid === "number" ? body.price_paid : null;

  if (!customer_id) return err("invalid_request", "customer_id is required", 400);
  if (!sku)         return err("invalid_request", "sku is required",         400);
  if (!variant)     return err("invalid_request", "variant is required",     400);
  if (variant !== "control" && variant !== "treatment")
    return err("invalid_request", "variant must be 'control' or 'treatment'", 400);

  // Resolve segment_id from assignment if given
  let segment_id: string | null = null;
  if (assignment_id) {
    const { data: assign } = await supabaseAdmin
      .from("loyalty_ab_assignments")
      .select("segment_id")
      .eq("id", assignment_id)
      .eq("account_id", ctx.accountId)
      .maybeSingle();
    segment_id = assign?.segment_id ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from("loyalty_outcomes")
    .insert({
      account_id:    ctx.accountId,
      assignment_id,
      customer_id,
      sku,
      channel,
      variant,
      segment_id,
      purchased,
      price_paid,
    })
    .select("id, created_at")
    .single();

  if (error) return err("internal_error", error.message, 500);

  return ok({
    recorded:      true,
    id:            data.id,
    created_at:    data.created_at,
    conversion_analysis: "pending — accumulate outcomes before running analysis",
  }, 201);
}
