// ============================================================================
// Flash Sale Orchestration — API 09
//
// Endpoints (scope-enforced):
//   POST   /v1/flash/events               flash:write — create scheduled sale
//   GET    /v1/flash/events               flash:read  — list events
//   GET    /v1/flash/events/:id           flash:read  — get one event + SKUs
//   POST   /v1/flash/events/:id/cancel    flash:write — cancel
//   GET    /v1/flash/events/:id/report    flash:read  — post-event report
//
// Orchestration (called by hooks):
//   processFlashStart()  — activate events whose start_at <= now
//   processFlashEnd()    — complete/restore events whose end_at <= now
//
// Floor: reuses computeFloor() from dynprice-handlers (exact same formula as
// API 07). Any SKU whose flash_price < floor is rejected 422.
// Conflict: 409 if any scheduled/active event on the same account overlaps
// both the time window AND at least one SKU.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeFloor } from "@/server/dynprice-handlers";
import type { V1Context, V1Result } from "@/server/v1-handlers";

// ─── Scope helpers ─────────────────────────────────────────────────────────

function canWrite(ctx: V1Context): boolean {
  return ctx.scopes.some((s) => s === "flash:write" || s === "write" || s === "admin");
}
function canRead(ctx: V1Context): boolean {
  return ctx.scopes.some((s) =>
    s === "flash:read" || s === "flash:write" || s === "read" || s === "write" || s === "admin",
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

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
    return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Discount computation ──────────────────────────────────────────────────

type DiscountConfig = { type: "pct" | "fixed"; value: number };

function computeFlashPrice(listPrice: number, cfg: DiscountConfig): number {
  if (cfg.type === "pct") return r2(listPrice * (1 - cfg.value / 100));
  return r2(listPrice - cfg.value);
}

function validateDiscountConfig(raw: unknown): DiscountConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.type !== "pct" && o.type !== "fixed") return null;
  if (typeof o.value !== "number" || o.value <= 0) return null;
  if (o.type === "pct" && o.value >= 100) return null;
  return { type: o.type, value: o.value };
}

// ─── Resolve product UUID + list price from SKU ────────────────────────────

async function resolveProduct(accountId: string, sku: string) {
  const { data } = await supabaseAdmin
    .from("catalog_products")
    .select("id, name")
    .eq("account_id", accountId)
    .eq("sku", sku)
    .maybeSingle();
  return data ?? null;
}

async function resolveListPrice(productId: string, channel: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("catalog_prices")
    .select("list_price")
    .eq("product_id", productId)
    .ilike("channel", channel)
    .maybeSingle();
  return data ? Number(data.list_price) : null;
}

// ─── POST /v1/flash/events ─────────────────────────────────────────────────

export async function handleCreateFlashEvent(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "flash:write scope required.", 403);

  const body = await readJson(req);
  if (!body) return err("validation_failed", "Request body must be a valid JSON object.", 422);

  const { name, skus, discount_config, channel_scope, start_at, end_at, inventory_reserve, auto_restore, note } = body;

  if (typeof name !== "string" || !name.trim())
    return err("validation_failed", "`name` is required.", 422);
  if (!Array.isArray(skus) || skus.length === 0 || skus.some((s) => typeof s !== "string"))
    return err("validation_failed", "`skus` must be a non-empty array of strings.", 422);

  const cfg = validateDiscountConfig(discount_config);
  if (!cfg)
    return err("validation_failed", "`discount_config` must be { type: 'pct'|'fixed', value: number > 0 }.", 422);

  const channel = typeof channel_scope === "string" ? channel_scope : "Online";

  if (typeof start_at !== "string" || typeof end_at !== "string")
    return err("validation_failed", "`start_at` and `end_at` are required ISO timestamps.", 422);

  const startTs = new Date(start_at);
  const endTs   = new Date(end_at);
  if (isNaN(startTs.getTime()) || isNaN(endTs.getTime()))
    return err("validation_failed", "`start_at` and `end_at` must be valid ISO timestamps.", 422);
  if (endTs <= startTs)
    return err("validation_failed", "`end_at` must be after `start_at`.", 422);

  const deduped: string[] = [...new Set(skus as string[])];

  // ── Conflict detection ────────────────────────────────────────────────────
  // Reject if any scheduled/active event overlaps the time window AND shares >= 1 SKU.
  const { data: conflicts } = await supabaseAdmin
    .from("flash_events")
    .select("id, name, skus, start_at, end_at, status")
    .eq("account_id", ctx.accountId)
    .in("status", ["scheduled", "active"])
    .lt("start_at", end_at)
    .gt("end_at", start_at);

  if (conflicts && conflicts.length > 0) {
    const overlapping = conflicts.filter((c) =>
      (c.skus as string[]).some((s) => deduped.includes(s)),
    );
    if (overlapping.length > 0) {
      return err(
        "conflict",
        `Event conflicts with ${overlapping.length} existing event(s) on overlapping SKUs.`,
        409,
        {
          conflicts: overlapping.map((c) => ({
            event_id: c.id,
            name: c.name,
            status: c.status,
            start_at: c.start_at,
            end_at: c.end_at,
            conflicting_skus: (c.skus as string[]).filter((s) => deduped.includes(s)),
          })),
        },
      );
    }
  }

  // ── Per-SKU floor validation ──────────────────────────────────────────────
  type SkuDetail = {
    sku: string;
    product_id: string;
    list_price: number;
    flash_price: number;
    floor_price: number | null;
  };
  const skuDetails: SkuDetail[] = [];
  const floorBreaches: Array<{ sku: string; flash_price: number; floor_price: number }> = [];
  const unknownSkus: string[] = [];

  for (const sku of deduped) {
    const product = await resolveProduct(ctx.accountId, sku);
    if (!product) { unknownSkus.push(sku); continue; }

    const listPrice = await resolveListPrice(product.id, channel);
    if (listPrice === null) { unknownSkus.push(sku); continue; }

    const flashPrice = computeFlashPrice(listPrice, cfg);
    // minViablePrice expects a fraction (0.10 = 10%), so divide by 100
    const floorPrice = await computeFloor(ctx.accountId, product.id, channel, 0.10);

    skuDetails.push({ sku, product_id: product.id, list_price: listPrice, flash_price: flashPrice, floor_price: floorPrice });

    if (floorPrice !== null && flashPrice < floorPrice) {
      floorBreaches.push({ sku, flash_price: flashPrice, floor_price: floorPrice });
    }
  }

  if (unknownSkus.length > 0) {
    return err(
      "unknown_skus",
      `Could not resolve list price for SKU(s): ${unknownSkus.join(", ")}. Ensure catalog_products + catalog_prices exist for this account.`,
      422,
      { unknown_skus: unknownSkus },
    );
  }
  if (floorBreaches.length > 0) {
    return err(
      "below_floor",
      `Flash price is below margin floor for ${floorBreaches.length} SKU(s). Reduce the discount or adjust margin floor.`,
      422,
      { floor_breaches: floorBreaches },
    );
  }

  // ── Create event ──────────────────────────────────────────────────────────
  const { data: event, error: evErr } = await supabaseAdmin
    .from("flash_events")
    .insert({
      account_id:         ctx.accountId,
      licensee_id:        ctx.licenseeId,
      created_by_user_id: ctx.userId,
      name:               name.trim(),
      skus:               deduped,
      discount_config:    cfg,
      channel_scope:      channel,
      start_at:           startTs.toISOString(),
      end_at:             endTs.toISOString(),
      status:             "scheduled",
      inventory_reserve:  typeof inventory_reserve === "number" ? inventory_reserve : null,
      auto_restore:       auto_restore === false ? false : true,
      note:               typeof note === "string" ? note : null,
    })
    .select("*")
    .single();

  if (evErr || !event) {
    console.error("[flash] insert event error:", evErr);
    return err("internal_error", "Failed to create flash event.", 500);
  }

  // ── Create per-SKU rows ───────────────────────────────────────────────────
  await supabaseAdmin.from("flash_event_skus").insert(
    skuDetails.map((d) => ({
      flash_event_id:      event.id,
      sku:                 d.sku,
      product_id:          d.product_id,
      original_price:      d.list_price,
      flash_price:         d.flash_price,
      floor_price:         d.floor_price,
      channel:             channel,
      channel_push_status: "pending",
    })),
  );

  return ok(
    {
      event_id:  event.id,
      status:    "scheduled",
      sku_count: deduped.length,
      skus:      skuDetails.map((d) => ({
        sku: d.sku,
        list_price:  d.list_price,
        flash_price: d.flash_price,
        floor_price: d.floor_price,
        safe:        d.floor_price === null || d.flash_price >= d.floor_price,
      })),
    },
    201,
  );
}

// ─── GET /v1/flash/events ──────────────────────────────────────────────────

export async function handleListFlashEvents(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "flash:read scope required.", 403);

  const url    = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  let query = supabaseAdmin
    .from("flash_events")
    .select(
      "id, name, skus, discount_config, channel_scope, start_at, end_at, status, inventory_reserve, auto_restore, created_at",
      { count: "exact" },
    )
    .eq("account_id", ctx.accountId)
    .order("start_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return err("internal_error", "Failed to list flash events.", 500);

  return ok({ events: data ?? [], total: count ?? 0, limit, offset });
}

// ─── GET /v1/flash/events/:id ──────────────────────────────────────────────

export async function handleGetFlashEvent(req: Request, ctx: V1Context, id: string): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "flash:read scope required.", 403);

  const { data: event, error } = await supabaseAdmin
    .from("flash_events")
    .select("*")
    .eq("id", id)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (error) return err("internal_error", "Failed to fetch flash event.", 500);
  if (!event) return err("not_found", `Flash event ${id} not found.`, 404);

  const { data: skus } = await supabaseAdmin
    .from("flash_event_skus")
    .select("sku, product_id, original_price, flash_price, floor_price, channel, channel_push_status, units_sold")
    .eq("flash_event_id", id);

  return ok({ ...event, sku_details: skus ?? [] });
}

// ─── POST /v1/flash/events/:id/cancel ─────────────────────────────────────

export async function handleCancelFlashEvent(req: Request, ctx: V1Context, id: string): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "flash:write scope required.", 403);

  const { data: event, error } = await supabaseAdmin
    .from("flash_events")
    .select("id, status, auto_restore")
    .eq("id", id)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (error) return err("internal_error", "Failed to fetch flash event.", 500);
  if (!event) return err("not_found", `Flash event ${id} not found.`, 404);
  if (!["scheduled", "active"].includes(event.status))
    return err("invalid_state", `Cannot cancel a ${event.status} event.`, 409);

  if (event.status === "active" && event.auto_restore) {
    await restorePrices(id, ctx.userId, "flash_cancel");
  }

  await supabaseAdmin
    .from("flash_events")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  return ok({ event_id: id, status: "cancelled" });
}

// ─── GET /v1/flash/events/:id/report ──────────────────────────────────────

export async function handleFlashEventReport(req: Request, ctx: V1Context, id: string): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "flash:read scope required.", 403);

  const { data: event, error } = await supabaseAdmin
    .from("flash_events")
    .select("id, name, discount_config, channel_scope, start_at, end_at, status, inventory_reserve, auto_restore")
    .eq("id", id)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (error) return err("internal_error", "Failed to fetch flash event.", 500);
  if (!event) return err("not_found", `Flash event ${id} not found.`, 404);

  const { data: skus } = await supabaseAdmin
    .from("flash_event_skus")
    .select("sku, original_price, flash_price, floor_price, channel_push_status, units_sold")
    .eq("flash_event_id", id);

  const skuList    = skus ?? [];
  const applied    = skuList.filter((s) => s.channel_push_status === "applied");
  const totalDisc  = applied.reduce((sum, s) => sum + (Number(s.original_price) - Number(s.flash_price)), 0);
  const unitsSold  = skuList.reduce((sum, s) => sum + (s.units_sold ?? 0), 0);

  return ok({
    event: {
      id:              event.id,
      name:            event.name,
      status:          event.status,
      channel_scope:   event.channel_scope,
      start_at:        event.start_at,
      end_at:          event.end_at,
      discount_config: event.discount_config,
    },
    summary: {
      sku_count:                    skuList.length,
      applied_count:                applied.length,
      total_discount_per_unit_qar:  r2(totalDisc),
      units_sold_stub:              unitsSold,
      estimated_revenue_uplift:     null, // placeholder — needs elasticity data
    },
    skus: skuList,
  });
}

// ─── Internal: apply flash prices ─────────────────────────────────────────

async function applyFlashPrices(eventId: string, userId: string): Promise<void> {
  const { data: skus } = await supabaseAdmin
    .from("flash_event_skus")
    .select("id, sku, product_id, original_price, flash_price, channel")
    .eq("flash_event_id", eventId);

  if (!skus || skus.length === 0) return;

  for (const s of skus) {
    if (!s.product_id) continue;

    const { error: priceErr } = await supabaseAdmin
      .from("catalog_prices")
      .update({ sale_price: s.flash_price })
      .eq("product_id", s.product_id)
      .ilike("channel", s.channel);

    const pushStatus = priceErr ? "failed" : "applied";
    if (priceErr) console.error(`[flash] price update failed for sku ${s.sku}:`, priceErr);

    await supabaseAdmin
      .from("flash_event_skus")
      .update({ channel_push_status: pushStatus })
      .eq("id", s.id);

    if (!priceErr) {
      await (supabaseAdmin.from("pricing_decisions") as any).insert({
        user_id:           userId,
        product:           s.sku,
        category:          "",
        channel:           s.channel,
        current_price:     Number(s.original_price),
        recommended_price: Number(s.flash_price),
        recommendation_id: null,
        decision:          "applied",
        source:            "flash_sale",
        trigger_type:      "flash_start",
        inputs_snapshot:   { flash_event_id: eventId, sku: s.sku },
        alternatives:      [],
        cost_snapshot:     {},
      });
    }
  }
  // External multi-channel push is flagged pending — depends on API 02 (Sync).
}

// ─── Internal: restore prices ──────────────────────────────────────────────

async function restorePrices(eventId: string, userId: string, trigger: "flash_end" | "flash_cancel"): Promise<void> {
  const { data: skus } = await supabaseAdmin
    .from("flash_event_skus")
    .select("id, sku, product_id, original_price, channel")
    .eq("flash_event_id", eventId);

  if (!skus || skus.length === 0) return;

  for (const s of skus) {
    if (!s.product_id) continue;

    // Restore: set sale_price = null so catalog reverts to list_price
    await supabaseAdmin
      .from("catalog_prices")
      .update({ sale_price: null })
      .eq("product_id", s.product_id)
      .ilike("channel", s.channel);

    await (supabaseAdmin.from("pricing_decisions") as any).insert({
      user_id:           userId,
      product:           s.sku,
      category:          null,
      channel:           s.channel,
      current_price:     Number(s.original_price),
      recommended_price: Number(s.original_price),
      recommendation_id: null,
      decision:          "applied",
      source:            trigger === "flash_cancel" ? "flash_cancel" : "flash_restore",
      trigger_type:      trigger,
      inputs_snapshot:   { flash_event_id: eventId, sku: s.sku },
      alternatives:      [],
      cost_snapshot:     {},
    });
  }
}

// ─── Orchestration: processFlashStart ─────────────────────────────────────

export async function processFlashStart(): Promise<{ activated: number; errors: number }> {
  const now = new Date().toISOString();

  const { data: events } = await supabaseAdmin
    .from("flash_events")
    .select("id, created_by_user_id")
    .eq("status", "scheduled")
    .lte("start_at", now);

  if (!events || events.length === 0) return { activated: 0, errors: 0 };

  let activated = 0;
  let errors    = 0;

  for (const e of events) {
    try {
      const { error: updErr } = await supabaseAdmin
        .from("flash_events")
        .update({ status: "active", updated_at: now })
        .eq("id", e.id)
        .eq("status", "scheduled"); // optimistic guard against double-fire

      if (updErr) { errors++; continue; }

      await applyFlashPrices(e.id, e.created_by_user_id);
      activated++;
    } catch (ex) {
      console.error(`[flash] processFlashStart failed for event ${e.id}:`, ex);
      errors++;
    }
  }

  return { activated, errors };
}

// ─── Orchestration: processFlashEnd ───────────────────────────────────────

export async function processFlashEnd(): Promise<{ completed: number; errors: number }> {
  const now = new Date().toISOString();

  const { data: events } = await supabaseAdmin
    .from("flash_events")
    .select("id, auto_restore, created_by_user_id")
    .eq("status", "active")
    .lte("end_at", now);

  if (!events || events.length === 0) return { completed: 0, errors: 0 };

  let completed = 0;
  let errors    = 0;

  for (const e of events) {
    try {
      const { error: updErr } = await supabaseAdmin
        .from("flash_events")
        .update({ status: "completed", updated_at: now })
        .eq("id", e.id)
        .eq("status", "active"); // optimistic guard

      if (updErr) { errors++; continue; }

      if (e.auto_restore) {
        await restorePrices(e.id, e.created_by_user_id, "flash_end");
      }
      completed++;
    } catch (ex) {
      console.error(`[flash] processFlashEnd failed for event ${e.id}:`, ex);
      errors++;
    }
  }

  return { completed, errors };
}
