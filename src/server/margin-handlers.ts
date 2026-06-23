import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "./v1-handlers";
import {
  computeMargin, breakevenPrice, minViablePrice, landedCost as computeLandedCost,
  r2, r4, type ChannelCosts,
} from "./margin";

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}
async function readJson(req: Request) {
  const raw = await req.text();
  if (!raw) return { json: {} as Record<string, unknown>, raw };
  try {
    const p = JSON.parse(raw);
    if (typeof p !== "object" || p === null || Array.isArray(p)) return { json: null, raw };
    return { json: p as Record<string, unknown>, raw };
  } catch { return { json: null, raw }; }
}

// Scope enforcement: "margin:write" is granted by either "margin:write" or "write" scope.
// "margin:read" is granted by "margin:read", "read", or any write scope.
export function hasScope(ctx: V1Context, required: string): boolean {
  const s = ctx.scopes;
  if (required === "margin:write") return s.includes("margin:write") || s.includes("write");
  if (required === "margin:read")  return s.includes("margin:read") || s.includes("read") || s.includes("margin:write") || s.includes("write");
  return s.includes(required);
}

// Resolve product by SKU, scoped to account.
async function resolveProduct(accountId: string, sku: string) {
  return supabaseAdmin
    .from("catalog_products")
    .select("id, name, category, sku")
    .eq("account_id", accountId)
    .eq("sku", sku)
    .maybeSingle();
}

// Load margin_inputs for a product.
async function loadMarginInputs(productId: string) {
  return supabaseAdmin
    .from("margin_inputs")
    .select("unit_cost, freight, duty_pct, fees_pct, currency, supplier, effective_at")
    .eq("product_id", productId)
    .maybeSingle();
}

// Load channel cost structure (exact channel name match, case-insensitive).
async function loadChannelCosts(accountId: string, channel: string): Promise<ChannelCosts | null> {
  const { data } = await supabaseAdmin
    .from("channel_cost_structures")
    .select("commission_pct, delivery_cost, payment_pct, returns_provision")
    .eq("account_id", accountId)
    .ilike("channel", channel)
    .maybeSingle();
  if (!data) return null;
  return {
    commission_pct: Number(data.commission_pct),
    delivery_cost: Number(data.delivery_cost),
    payment_pct: Number(data.payment_pct),
    returns_provision: Number(data.returns_provision),
  };
}

// Resolve catalog price for a product+channel.
async function resolvePrice(productId: string, channel: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("catalog_prices")
    .select("list_price, sale_price")
    .eq("product_id", productId)
    .ilike("channel", channel)
    .maybeSingle();
  if (!data) return null;
  return Number(data.sale_price ?? data.list_price);
}

// ============================================================================
// POST /v1/margin/costs — upsert SKU cost data
// ============================================================================
export async function handleMarginCosts(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!hasScope(ctx, "margin:write")) {
    return err("forbidden", "This API key lacks the `margin:write` scope.", 403);
  }
  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const sku = typeof json.sku === "string" ? json.sku.trim() : "";
  if (!sku) return err("validation_failed", "`sku` is required.", 422, { fields: [{ name: "sku", error: "required" }] });

  const unit_cost = typeof json.unit_cost === "number" ? json.unit_cost : null;
  if (unit_cost === null || unit_cost < 0)
    return err("validation_failed", "`unit_cost` must be a non-negative number.", 422, { fields: [{ name: "unit_cost", error: "required" }] });

  const { data: product, error: pErr } = await resolveProduct(ctx.accountId, sku);
  if (pErr) return err("internal_error", pErr.message, 500);
  if (!product) return err("not_found", `SKU "${sku}" not found. Sync it first via POST /v1/sync.`, 404);

  const payload: Record<string, unknown> = {
    account_id: ctx.accountId,
    licensee_id: ctx.licenseeId,
    product_id: product.id,
    unit_cost,
    freight: typeof json.freight === "number" ? json.freight : 0,
    duty_pct: typeof json.duty_pct === "number" ? json.duty_pct : 0,
    fees_pct: typeof json.fees_pct === "number" ? json.fees_pct : 0,
    currency: typeof json.currency === "string" ? json.currency : "QAR",
    supplier: typeof json.supplier === "string" ? json.supplier : null,
    effective_at: typeof json.effective_at === "string" ? json.effective_at : new Date().toISOString(),
  };

  const { data: row, error: upsErr } = await (supabaseAdmin.from("margin_inputs") as any)
    .upsert(payload, { onConflict: "product_id" })
    .select("id, unit_cost, freight, duty_pct, fees_pct, currency, supplier, effective_at")
    .single();

  if (upsErr) return err("internal_error", upsErr.message, 500);

  const landed = computeLandedCost({ unit_cost: Number(row.unit_cost), freight: Number(row.freight), duty_pct: Number(row.duty_pct) });

  return ok({
    sku,
    product_id: product.id,
    unit_cost: Number(row.unit_cost),
    freight: Number(row.freight),
    duty_pct: Number(row.duty_pct),
    fees_pct: Number(row.fees_pct),
    landed_cost: r2(landed),
    currency: row.currency,
    supplier: row.supplier,
    effective_at: row.effective_at,
  }, 200);
}

// ============================================================================
// POST /v1/margin/channels — upsert per-channel cost structure
// ============================================================================
export async function handleMarginChannels(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!hasScope(ctx, "margin:write")) {
    return err("forbidden", "This API key lacks the `margin:write` scope.", 403);
  }
  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const channel = typeof json.channel === "string" ? json.channel.trim() : "";
  if (!channel) return err("validation_failed", "`channel` is required.", 422, { fields: [{ name: "channel", error: "required" }] });

  const commission_pct = typeof json.commission_pct === "number" ? json.commission_pct : 0;
  if (commission_pct < 0 || commission_pct >= 1)
    return err("validation_failed", "`commission_pct` must be between 0 and 1 (e.g. 0.18 for 18%).", 422);

  const payload = {
    account_id: ctx.accountId,
    licensee_id: ctx.licenseeId,
    channel,
    commission_pct,
    delivery_cost: typeof json.delivery_cost === "number" ? json.delivery_cost : 0,
    payment_pct: typeof json.payment_pct === "number" ? json.payment_pct : 0,
    returns_provision: typeof json.returns_provision === "number" ? json.returns_provision : 0,
    currency: typeof json.currency === "string" ? json.currency : "QAR",
    notes: typeof json.notes === "string" ? json.notes : null,
  };

  const { data: row, error: upsErr } = await supabaseAdmin
    .from("channel_cost_structures")
    .upsert(payload, { onConflict: "account_id,channel" })
    .select("id, channel, commission_pct, delivery_cost, payment_pct, returns_provision, currency, notes")
    .single();

  if (upsErr) return err("internal_error", upsErr.message, 500);

  return ok({
    id: row.id,
    channel: row.channel,
    commission_pct: Number(row.commission_pct),
    delivery_cost: Number(row.delivery_cost),
    payment_pct: Number(row.payment_pct),
    returns_provision: Number(row.returns_provision),
    currency: row.currency,
    notes: row.notes,
  });
}

// ============================================================================
// GET /v1/margin/sku?sku=...&channel=...
// ============================================================================
export async function handleMarginSku(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!hasScope(ctx, "margin:read")) {
    return err("forbidden", "This API key lacks the `margin:read` scope.", 403);
  }
  const url = new URL(request.url);
  const sku = url.searchParams.get("sku") ?? "";
  const channel = url.searchParams.get("channel") ?? "Online";
  if (!sku) return err("validation_failed", "`sku` query param is required.", 422);

  const { data: product, error: pErr } = await resolveProduct(ctx.accountId, sku);
  if (pErr) return err("internal_error", pErr.message, 500);
  if (!product) return err("not_found", `SKU "${sku}" not found.`, 404);

  const { data: inputs, error: iErr } = await loadMarginInputs(product.id);
  if (iErr) return err("internal_error", iErr.message, 500);
  if (!inputs) return err("not_found", `No cost data for "${sku}". POST /v1/margin/costs first.`, 404);

  const channelCosts = await loadChannelCosts(ctx.accountId, channel);
  const price = await resolvePrice(product.id, channel);
  const landed = computeLandedCost({ unit_cost: Number(inputs.unit_cost), freight: Number(inputs.freight), duty_pct: Number(inputs.duty_pct) });

  const zero: ChannelCosts = { commission_pct: 0, delivery_cost: 0, payment_pct: 0, returns_provision: 0 };
  const ch = channelCosts ?? zero;

  const marginAtCurrentPrice = price != null ? computeMargin(price, landed, ch) : null;

  return ok({
    sku,
    product_id: product.id,
    channel,
    currency: inputs.currency ?? "QAR",
    cost_inputs: {
      unit_cost: Number(inputs.unit_cost),
      freight: Number(inputs.freight),
      duty_pct: Number(inputs.duty_pct),
      supplier: inputs.supplier,
      effective_at: inputs.effective_at,
      landed_cost: r2(landed),
    },
    channel_structure: channelCosts
      ? { commission_pct: ch.commission_pct, delivery_cost: ch.delivery_cost, payment_pct: ch.payment_pct, returns_provision: ch.returns_provision }
      : null,
    current_price: price,
    margin_at_current_price: marginAtCurrentPrice
      ? {
          margin: r2(marginAtCurrentPrice.margin),
          margin_pct: r4(marginAtCurrentPrice.margin_pct),
          channel_cost: r2(marginAtCurrentPrice.channel_cost),
          total_cost: r2(marginAtCurrentPrice.total_cost),
          breakdown: {
            commission: r2(marginAtCurrentPrice.breakdown.commission),
            delivery: r2(marginAtCurrentPrice.breakdown.delivery),
            payment: r2(marginAtCurrentPrice.breakdown.payment),
            returns_provision: r2(marginAtCurrentPrice.breakdown.returns_provision),
          },
        }
      : null,
  });
}

// ============================================================================
// GET /v1/margin/breakeven?sku=...&channel=...
// ============================================================================
export async function handleMarginBreakeven(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!hasScope(ctx, "margin:read")) {
    return err("forbidden", "This API key lacks the `margin:read` scope.", 403);
  }
  const url = new URL(request.url);
  const sku = url.searchParams.get("sku") ?? "";
  const channel = url.searchParams.get("channel") ?? "Online";
  if (!sku) return err("validation_failed", "`sku` query param is required.", 422);

  const { data: product, error: pErr } = await resolveProduct(ctx.accountId, sku);
  if (pErr) return err("internal_error", pErr.message, 500);
  if (!product) return err("not_found", `SKU "${sku}" not found.`, 404);

  const { data: inputs, error: iErr } = await loadMarginInputs(product.id);
  if (iErr) return err("internal_error", iErr.message, 500);
  if (!inputs) return err("not_found", `No cost data for "${sku}". POST /v1/margin/costs first.`, 404);

  const channelCosts = await loadChannelCosts(ctx.accountId, channel);
  const zero: ChannelCosts = { commission_pct: 0, delivery_cost: 0, payment_pct: 0, returns_provision: 0 };
  const ch = channelCosts ?? zero;

  const landed = computeLandedCost({ unit_cost: Number(inputs.unit_cost), freight: Number(inputs.freight), duty_pct: Number(inputs.duty_pct) });
  const be = breakevenPrice(landed, ch);
  const mv5 = minViablePrice(landed, ch, 0.05);

  return ok({
    sku,
    product_id: product.id,
    channel,
    landed_cost: r2(landed),
    channel_structure: channelCosts ? { ...ch } : null,
    breakeven_price: r2(be),
    min_viable_price_5pct: r2(mv5),
    note: channelCosts
      ? `Channel "${channel}" costs applied (comm ${(ch.commission_pct * 100).toFixed(1)}%, pay ${(ch.payment_pct * 100).toFixed(1)}%, delivery QAR ${ch.delivery_cost}, returns QAR ${ch.returns_provision}).`
      : `No channel_cost_structures found for "${channel}" — showing landed-cost-only breakeven.`,
  });
}

// ============================================================================
// GET /v1/margin/impact?sku=...&channel=...&price=...
// ============================================================================
export async function handleMarginImpact(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!hasScope(ctx, "margin:read")) {
    return err("forbidden", "This API key lacks the `margin:read` scope.", 403);
  }
  const url = new URL(request.url);
  const sku     = url.searchParams.get("sku") ?? "";
  const channel = url.searchParams.get("channel") ?? "Online";
  const priceStr = url.searchParams.get("price") ?? "";
  if (!sku) return err("validation_failed", "`sku` query param is required.", 422);
  const price = parseFloat(priceStr);
  if (!priceStr || !Number.isFinite(price) || price < 0)
    return err("validation_failed", "`price` must be a non-negative number.", 422);

  const { data: product, error: pErr } = await resolveProduct(ctx.accountId, sku);
  if (pErr) return err("internal_error", pErr.message, 500);
  if (!product) return err("not_found", `SKU "${sku}" not found.`, 404);

  const { data: inputs, error: iErr } = await loadMarginInputs(product.id);
  if (iErr) return err("internal_error", iErr.message, 500);
  if (!inputs) return err("not_found", `No cost data for "${sku}". POST /v1/margin/costs first.`, 404);

  const channelCosts = await loadChannelCosts(ctx.accountId, channel);
  const zero: ChannelCosts = { commission_pct: 0, delivery_cost: 0, payment_pct: 0, returns_provision: 0 };
  const ch = channelCosts ?? zero;

  const landed = computeLandedCost({ unit_cost: Number(inputs.unit_cost), freight: Number(inputs.freight), duty_pct: Number(inputs.duty_pct) });
  const result = computeMargin(price, landed, ch);
  const be = breakevenPrice(landed, ch);
  const mv5 = minViablePrice(landed, ch, 0.05);

  return ok({
    sku,
    product_id: product.id,
    channel,
    price,
    landed_cost: r2(landed),
    margin: r2(result.margin),
    margin_pct: r4(result.margin_pct),
    channel_cost: r2(result.channel_cost),
    total_cost: r2(result.total_cost),
    breakdown: {
      commission: r2(result.breakdown.commission),
      delivery: r2(result.breakdown.delivery),
      payment: r2(result.breakdown.payment),
      returns_provision: r2(result.breakdown.returns_provision),
    },
    breakeven_price: r2(be),
    min_viable_price_5pct: r2(mv5),
    above_breakeven: price >= be,
    above_min_viable: price >= mv5,
  });
}
