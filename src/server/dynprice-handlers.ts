// ============================================================================
// Dynamic Pricing Engine handlers — /v1/dynprice/*
//
// Endpoints:
//   POST /v1/dynprice/config          — configure base_price + trigger rules
//   GET  /v1/dynprice/current/{sku}   — evaluate & return current dynamic price
//   GET  /v1/dynprice/events          — list GCC event calendar
//   POST /v1/dynprice/events/custom   — add custom event window
//   GET  /v1/dynprice/audit/{sku}     — pricing decision history for a SKU
//
// Priority rule:
//   Among all ENABLED rules that FIRE, the one with the LOWEST priority number
//   wins. Only one rule's adjustment is applied per evaluation.
//
// Adjustment formula (always off base_price, never current price):
//   proposed = base_price × (1 + adjustment_pct)   (adj_pct < 0 = discount)
//
// Floor:
//   floor = minViablePrice(landedCost, channelCosts, min_margin_pct)
//   This is the EXACT same formula as GET /v1/margin/sku (margin.ts).
//   If proposed < floor → price clamped to floor, override logged.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  landedCost as computeLandedCost,
  minViablePrice,
  type ChannelCosts,
  r2,
} from "./margin";
import type { V1Context, V1Result } from "./v1-handlers";

// ─── Scope helpers ────────────────────────────────────────────────────────────

function canWrite(ctx: V1Context): boolean {
  return ctx.scopes.includes("write") || ctx.scopes.includes("admin");
}
function canRead(ctx: V1Context): boolean {
  return ctx.scopes.includes("read") || canWrite(ctx);
}
function canReadAudit(ctx: V1Context): boolean {
  return ctx.scopes.includes("audit:read") || canRead(ctx);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

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

// ─── Qatar time (UTC+3, no DST) ──────────────────────────────────────────────

function qatarNow() {
  const utc = new Date();
  const qat = new Date(utc.getTime() + 3 * 60 * 60 * 1000);
  return {
    date:      qat,
    hour:      qat.getUTCHours(),        // 0-23 in Qatar time
    dayOfWeek: qat.getUTCDay(),          // 0=Sun … 6=Sat
    iso:       qat.toISOString().replace("Z", "+03:00"),
  };
}

// ─── Trigger evaluators ───────────────────────────────────────────────────────

interface TimeWindowCfg  { hour_start: number; hour_end: number; days_of_week?: number[]; }
interface NamedEventCfg  { event_type: string; lookahead_days?: number; }

type GccEvent = { event_type: string; starts_at: string; ends_at: string; };

function fireTimeWindow(cfg: TimeWindowCfg, hour: number, dow: number): boolean {
  if (cfg.days_of_week && cfg.days_of_week.length > 0 && !cfg.days_of_week.includes(dow)) return false;
  return hour >= cfg.hour_start && hour < cfg.hour_end;
}

function fireNamedEvent(cfg: NamedEventCfg, events: GccEvent[], nowMs: number): boolean {
  const lookaheadMs = (cfg.lookahead_days ?? 0) * 86400000;
  return events.some((e) => {
    if (e.event_type !== cfg.event_type) return false;
    const start = new Date(e.starts_at).getTime();
    const end   = new Date(e.ends_at).getTime();
    return start <= nowMs + lookaheadMs && end > nowMs;
  });
}

// ─── Margin floor (exact API 07 formula) ─────────────────────────────────────

export async function computeFloor(
  accountId: string,
  productId: string,
  channel: string,
  minMarginPct: number,
): Promise<number | null> {
  const { data: inputs } = await supabaseAdmin
    .from("margin_inputs")
    .select("unit_cost, freight, duty_pct")
    .eq("product_id", productId)
    .maybeSingle();
  if (!inputs) return null;

  const landed = computeLandedCost({
    unit_cost: Number(inputs.unit_cost),
    freight:   Number(inputs.freight),
    duty_pct:  Number(inputs.duty_pct),
  });

  const { data: chData } = await supabaseAdmin
    .from("channel_cost_structures")
    .select("commission_pct, delivery_cost, payment_pct, returns_provision")
    .eq("account_id", accountId)
    .ilike("channel", channel)
    .maybeSingle();

  const zero: ChannelCosts = { commission_pct: 0, delivery_cost: 0, payment_pct: 0, returns_provision: 0 };
  const ch: ChannelCosts = chData
    ? {
        commission_pct:   Number(chData.commission_pct),
        delivery_cost:    Number(chData.delivery_cost),
        payment_pct:      Number(chData.payment_pct),
        returns_provision: Number(chData.returns_provision),
      }
    : zero;

  return r2(minViablePrice(landed, ch, minMarginPct));
}

// ─── Core engine ─────────────────────────────────────────────────────────────

type RuleRow = {
  id: string; rule_type: string; name: string; priority: number;
  adjustment_pct: number; config: Record<string, unknown>;
};

type EvalResult = {
  winner: RuleRow | null;
  winnerReason: string;
  skipped: Array<{ rule_name: string; rule_type: string; reason: string }>;
  inventoryStub: boolean;
};

function evaluateRules(rules: RuleRow[], events: GccEvent[]): EvalResult {
  const { hour, dayOfWeek, date } = qatarNow();
  const nowMs = date.getTime();
  const skipped: EvalResult["skipped"] = [];
  let inventoryStub = false;
  const firing: RuleRow[] = [];

  for (const rule of rules) {
    const cfg = rule.config ?? {};

    if (rule.rule_type === "time_window") {
      const c = cfg as unknown as TimeWindowCfg;
      if (fireTimeWindow(c, hour, dayOfWeek)) {
        firing.push(rule);
      } else {
        skipped.push({
          rule_name: rule.name,
          rule_type: "time_window",
          reason: `Hour ${hour} (Qatar) not in [${c.hour_start},${c.hour_end})` +
            (c.days_of_week ? ` or day ${dayOfWeek} not in [${c.days_of_week.join(",")}]` : ""),
        });
      }
    } else if (rule.rule_type === "named_event") {
      const c = cfg as unknown as NamedEventCfg;
      if (fireNamedEvent(c, events, nowMs)) {
        firing.push(rule);
      } else {
        const lookahead = c.lookahead_days ?? 0;
        skipped.push({
          rule_name: rule.name,
          rule_type: "named_event",
          reason: `No active '${c.event_type}' event` +
            (lookahead > 0 ? ` within ${lookahead} day${lookahead !== 1 ? "s" : ""}` : ""),
        });
      }
    } else if (rule.rule_type === "inventory") {
      inventoryStub = true;
      skipped.push({
        rule_name: rule.name,
        rule_type: "inventory",
        reason: "STUB — inventory trigger requires a live merchant feed (not yet integrated). Rule skipped.",
      });
    }
  }

  if (firing.length === 0) {
    return { winner: null, winnerReason: "No rules fired", skipped, inventoryStub };
  }

  // Highest priority = lowest priority number
  firing.sort((a, b) => a.priority - b.priority);
  const winner = firing[0];
  const winnerReason =
    `Rule "${winner.name}" (priority ${winner.priority}, type ${winner.rule_type}) won among ${firing.length} firing rule(s).`;

  // Other firing rules become skipped (lower priority)
  for (let i = 1; i < firing.length; i++) {
    skipped.push({
      rule_name: firing[i].name,
      rule_type: firing[i].rule_type,
      reason: `Outranked by "${winner.name}" (priority ${winner.priority} < ${firing[i].priority})`,
    });
  }

  return { winner, winnerReason, skipped, inventoryStub };
}

// ─── handlers ────────────────────────────────────────────────────────────────

const VALID_RULE_TYPES = ["time_window", "named_event", "inventory"] as const;
const VALID_EVENT_TYPES = ["ramadan","eid_al_fitr","eid_al_adha","national_day","white_friday","custom"] as const;

function validateRuleConfig(ruleType: string, config: Record<string, unknown>): string | null {
  if (ruleType === "time_window") {
    const s = config.hour_start, e = config.hour_end;
    if (typeof s !== "number" || s < 0 || s > 23) return "`config.hour_start` must be 0–23.";
    if (typeof e !== "number" || e < 1 || e > 24) return "`config.hour_end` must be 1–24.";
    if (s >= e) return "`config.hour_start` must be less than `config.hour_end`.";
    const dow = config.days_of_week;
    if (dow !== undefined) {
      if (!Array.isArray(dow) || dow.some((d) => typeof d !== "number" || d < 0 || d > 6))
        return "`config.days_of_week` must be an array of integers 0–6 (0=Sun).";
    }
  } else if (ruleType === "named_event") {
    if (!VALID_EVENT_TYPES.includes(config.event_type as any))
      return `\`config.event_type\` must be one of: ${VALID_EVENT_TYPES.join(", ")}.`;
    const lk = config.lookahead_days;
    if (lk !== undefined && (typeof lk !== "number" || lk < 0 || lk > 30))
      return "`config.lookahead_days` must be 0–30.";
  } else if (ruleType === "inventory") {
    const lt = config.low_stock_threshold;
    if (lt !== undefined && (typeof lt !== "number" || lt < 1))
      return "`config.low_stock_threshold` must be a positive integer.";
  }
  return null;
}

// ============================================================================
// POST /v1/dynprice/config
// Body: { sku, channel?, base_price, min_margin_pct?, enabled?, rules?: [...] }
// rules[]: { rule_type, name, priority?, adjustment_pct, config, enabled?, notes? }
// Scope: write or admin
// ============================================================================
export async function handleDynpriceConfig(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "This API key lacks the `write` scope.", 403);

  const json = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const sku = typeof json.sku === "string" ? json.sku.trim() : "";
  if (!sku) return err("validation_failed", "`sku` is required.", 422, { fields: [{ name: "sku", error: "required" }] });

  const channel     = typeof json.channel === "string" ? json.channel.trim() : "Online";
  const basePrice   = typeof json.base_price === "number" ? json.base_price : null;
  if (basePrice === null || basePrice <= 0)
    return err("validation_failed", "`base_price` must be a positive number.", 422, { fields: [{ name: "base_price", error: "required" }] });

  const minMarginPct = typeof json.min_margin_pct === "number"
    ? Math.max(0, Math.min(0.99, json.min_margin_pct))
    : 0;
  const enabled = json.enabled !== false;

  // Resolve product (for floor preview — ok if missing, config still saved)
  const { data: product } = await supabaseAdmin
    .from("catalog_products")
    .select("id, name, category")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  // Validate rules array
  const rawRules = Array.isArray(json.rules) ? json.rules : [];
  if (rawRules.length > 50)
    return err("validation_failed", "Maximum 50 rules per config.", 422);

  type RuleIn = { rule_type: string; name: string; priority?: number; adjustment_pct: number; config: Record<string, unknown>; enabled?: boolean; notes?: string; };
  const parsedRules: RuleIn[] = [];

  for (let i = 0; i < rawRules.length; i++) {
    const r = rawRules[i] as Record<string, unknown>;
    if (!VALID_RULE_TYPES.includes(r.rule_type as any))
      return err("validation_failed", `rules[${i}].rule_type must be one of: ${VALID_RULE_TYPES.join(", ")}.`, 422);
    if (typeof r.name !== "string" || !r.name.trim())
      return err("validation_failed", `rules[${i}].name is required.`, 422);
    if (typeof r.adjustment_pct !== "number" || r.adjustment_pct <= -1 || r.adjustment_pct > 1)
      return err("validation_failed", `rules[${i}].adjustment_pct must be in (-1, 1].`, 422);
    const cfg = (typeof r.config === "object" && r.config !== null && !Array.isArray(r.config))
      ? r.config as Record<string, unknown>
      : {};
    const cfgErr = validateRuleConfig(r.rule_type as string, cfg);
    if (cfgErr) return err("validation_failed", `rules[${i}]: ${cfgErr}`, 422);

    parsedRules.push({
      rule_type:      r.rule_type as string,
      name:           (r.name as string).trim(),
      priority:       typeof r.priority === "number" ? Math.max(1, Math.round(r.priority)) : 100,
      adjustment_pct: r.adjustment_pct as number,
      config:         cfg,
      enabled:        r.enabled !== false,
      notes:          typeof r.notes === "string" ? r.notes : undefined,
    });
  }

  // Upsert config
  const { data: cfg, error: cfgErr } = await supabaseAdmin
    .from("dynprice_configs")
    .upsert({
      account_id:    ctx.accountId,
      licensee_id:   ctx.licenseeId,
      sku,
      channel,
      base_price:    basePrice,
      min_margin_pct: minMarginPct,
      enabled,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "account_id,sku,channel" })
    .select("id")
    .single();
  if (cfgErr || !cfg) return err("internal_error", cfgErr?.message ?? "config upsert failed", 500);

  // Replace rules: delete old, insert new
  if (rawRules.length > 0) {
    await supabaseAdmin
      .from("dynprice_rules")
      .delete()
      .eq("account_id", ctx.accountId)
      .eq("sku", sku)
      .eq("channel", channel);

    const ruleRows = parsedRules.map((r) => ({
      account_id:    ctx.accountId,
      licensee_id:   ctx.licenseeId,
      sku,
      channel,
      rule_type:     r.rule_type,
      name:          r.name,
      priority:      r.priority,
      adjustment_pct: r.adjustment_pct,
      config:        r.config,
      enabled:       r.enabled,
      notes:         r.notes,
    }));
    const { error: rErr } = await (supabaseAdmin.from("dynprice_rules") as any).insert(ruleRows);
    if (rErr) return err("internal_error", rErr.message, 500);
  }

  // Preview: compute floor if product has margin_inputs
  let floorPreview: number | null = null;
  if (product) {
    floorPreview = await computeFloor(ctx.accountId, product.id, channel, minMarginPct);
  }

  return ok({
    sku,
    channel,
    base_price:    basePrice,
    min_margin_pct: minMarginPct,
    enabled,
    floor_preview:  floorPreview,
    floor_note:     floorPreview !== null
      ? `At min_margin_pct=${(minMarginPct * 100).toFixed(1)}%, floor = QAR ${floorPreview}. Adjustments below this will be clamped.`
      : product
        ? "No margin_inputs found for this SKU — POST /v1/margin/costs first to enable floor enforcement."
        : "Product not synced yet — POST /v1/sync first. Floor will be computed once margin_inputs exist.",
    rules_saved:   parsedRules.length,
    rules:         parsedRules.map((r) => ({
      rule_type:     r.rule_type,
      name:          r.name,
      priority:      r.priority,
      adjustment_pct: r.adjustment_pct,
      config:        r.config,
      enabled:       r.enabled,
      inventory_stub: r.rule_type === "inventory" ? true : undefined,
    })),
  });
}

// ============================================================================
// GET /v1/dynprice/current/{sku}?channel=Online
// Evaluates all rules, picks winner, clamps to floor, audits to pricing_decisions.
// Scope: read
// ============================================================================
export async function handleDynpriceCurrent(
  request: Request,
  ctx: V1Context,
  sku: string,
): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "This API key lacks the `read` scope.", 403);
  if (!sku) return err("validation_failed", "`sku` path param is required.", 422);

  const url     = new URL(request.url);
  const channel = url.searchParams.get("channel") ?? "Online";

  // Load config
  const { data: config, error: cfgErr } = await supabaseAdmin
    .from("dynprice_configs")
    .select("id, base_price, min_margin_pct, enabled")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .ilike("channel", channel)
    .maybeSingle();
  if (cfgErr) return err("internal_error", cfgErr.message, 500);
  if (!config) return err("not_found", `No dynprice config for SKU "${sku}" channel "${channel}". POST /v1/dynprice/config first.`, 404);
  if (!config.enabled) return err("not_found", `Dynamic pricing is disabled for "${sku}".`, 404);

  const basePrice    = Number(config.base_price);
  const minMarginPct = Number(config.min_margin_pct);

  // Resolve product
  const { data: product } = await supabaseAdmin
    .from("catalog_products")
    .select("id, name, category")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  // Load enabled rules (priority ASC)
  const { data: ruleRows, error: rErr } = await supabaseAdmin
    .from("dynprice_rules")
    .select("id, rule_type, name, priority, adjustment_pct, config")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .ilike("channel", channel)
    .eq("enabled", true)
    .order("priority", { ascending: true });
  if (rErr) return err("internal_error", rErr.message, 500);

  const rules = (ruleRows ?? []) as RuleRow[];

  // Load active + upcoming GCC events for named_event triggers
  const nowIso = new Date().toISOString();
  const { data: events } = await supabaseAdmin
    .from("gcc_event_calendar")
    .select("event_type, starts_at, ends_at")
    .or(`created_by_licensee_id.is.null,created_by_licensee_id.eq.${ctx.licenseeId}`)
    .gte("ends_at", nowIso)
    .lte("starts_at", new Date(Date.now() + 30 * 86400000).toISOString());

  const gccEvents = (events ?? []) as GccEvent[];

  // Evaluate triggers
  const { winner, winnerReason, skipped, inventoryStub } = evaluateRules(rules, gccEvents);

  // Compute proposed price
  let proposedPrice = basePrice;
  let adjustmentPct = 0;
  if (winner) {
    adjustmentPct = Number(winner.adjustment_pct);
    proposedPrice = r2(basePrice * (1 + adjustmentPct));
  }

  // Floor protection
  const floorPrice = product
    ? await computeFloor(ctx.accountId, product.id, channel, minMarginPct)
    : null;

  let finalPrice = proposedPrice;
  let floorClamped = false;
  let clampReason: string | undefined;

  if (floorPrice !== null && proposedPrice < floorPrice) {
    floorClamped = true;
    finalPrice   = floorPrice;
    clampReason  = `Proposed QAR ${proposedPrice} is below margin floor QAR ${floorPrice} (min_margin_pct: ${(minMarginPct * 100).toFixed(1)}%). Clamped to floor.`;

    // Log override (immutable)
    await supabaseAdmin.from("dynprice_floor_overrides").insert({
      account_id:    ctx.accountId,
      licensee_id:   ctx.licenseeId,
      sku,
      channel,
      rule_id:       winner?.id ?? null,
      rule_name:     winner?.name ?? null,
      min_margin_pct: minMarginPct,
      proposed_price: proposedPrice,
      floor_price:    floorPrice,
      final_price:    finalPrice,
    });
  }

  // Audit via API 04 (pricing_decisions)
  const auditInputs = {
    sku,
    base_price:      basePrice,
    adjustment_pct:  adjustmentPct,
    proposed_price:  proposedPrice,
    floor_price:     floorPrice,
    floor_clamped:   floorClamped,
    min_margin_pct:  minMarginPct,
    winner_rule:     winner ? { id: winner.id, name: winner.name, type: winner.rule_type, priority: winner.priority } : null,
  };

  await (supabaseAdmin.from("pricing_decisions") as any).insert({
    user_id:            ctx.userId,
    product:            product?.name ?? sku,
    category:           product?.category ?? null,
    channel,
    current_price:      basePrice,
    recommended_price:  finalPrice,
    decision:           "engine_rec",
    source:             "dynprice_engine_v1",
    trigger_type:       winner?.rule_type ?? "no_rule",
    rule_fired:         winner?.name ?? null,
    rule_reason:        floorClamped
      ? `${winnerReason} Floor clamp applied: ${clampReason}`
      : winnerReason,
    inputs_snapshot:    auditInputs,
    alternatives:       skipped.map((s) => ({ name: s.rule_name, type: s.rule_type, skip_reason: s.reason })),
    cost_snapshot:      { floor_price: floorPrice, min_margin_pct: minMarginPct },
    note:               `dynprice_engine_v1 | sku:${sku} | ${winner?.name ?? "no rule"} | final:${finalPrice}`,
  });

  const q = qatarNow();

  return ok({
    sku,
    product_id:   product?.id ?? null,
    channel,
    currency:     "QAR",
    base_price:   basePrice,
    adjustment:   winner
      ? {
          rule_id:        winner.id,
          rule_name:      winner.name,
          rule_type:      winner.rule_type,
          priority:       winner.priority,
          adjustment_pct: adjustmentPct,
          off_base_price: r2(basePrice * adjustmentPct),
          proposed_price: proposedPrice,
        }
      : null,
    floor: {
      min_margin_pct: minMarginPct,
      floor_price:    floorPrice,
      clamped:        floorClamped,
      clamp_reason:   clampReason ?? null,
      no_margin_data: floorPrice === null,
    },
    final_price:       finalPrice,
    skipped_rules:     skipped,
    inventory_stub:    inventoryStub || undefined,
    evaluated_at_qatar: q.iso,
    qatar_hour:        q.hour,
    audited:           true,
  });
}

// ============================================================================
// GET /v1/dynprice/events
// Query: ?active=true, ?upcoming_days=30, ?event_type=white_friday, ?limit=100
// Scope: read
// ============================================================================
export async function handleDynpriceEvents(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "This API key lacks the `read` scope.", 403);

  const url          = new URL(request.url);
  const activeOnly   = url.searchParams.get("active") === "true";
  const upcomingDays = parseInt(url.searchParams.get("upcoming_days") ?? "365", 10);
  const eventType    = url.searchParams.get("event_type") ?? null;
  const limit        = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 200);

  const nowIso    = new Date().toISOString();
  const cutoffIso = new Date(Date.now() + Math.max(0, upcomingDays) * 86400000).toISOString();

  let q = supabaseAdmin
    .from("gcc_event_calendar")
    .select("id, event_type, name, region, starts_at, ends_at, year, is_approximate, notes, created_by_licensee_id")
    .or(`created_by_licensee_id.is.null,created_by_licensee_id.eq.${ctx.licenseeId}`)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (activeOnly) {
    q = q.lte("starts_at", nowIso).gte("ends_at", nowIso);
  } else {
    q = q.gte("ends_at", nowIso).lte("starts_at", cutoffIso);
  }
  if (eventType) q = q.eq("event_type", eventType);

  const { data, error, count } = await q;
  if (error) return err("internal_error", error.message, 500);

  const rows = (data ?? []).map((e: any) => ({
    id:           e.id,
    event_type:   e.event_type,
    name:         e.name,
    region:       e.region,
    starts_at:    e.starts_at,
    ends_at:      e.ends_at,
    year:         e.year,
    is_approximate: e.is_approximate,
    is_active:    new Date(e.starts_at) <= new Date(nowIso) && new Date(e.ends_at) > new Date(nowIso),
    is_custom:    e.created_by_licensee_id !== null,
    notes:        e.notes,
  }));

  return ok({ data: rows, total: rows.length });
}

// ============================================================================
// POST /v1/dynprice/events/custom
// Body: { name, event_type, starts_at, ends_at, notes? }
// Scope: write or admin
// ============================================================================
export async function handleDynpriceCustomEvent(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "This API key lacks the `write` scope.", 403);

  const json = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const name      = typeof json.name === "string" ? json.name.trim() : "";
  const eventType = typeof json.event_type === "string" ? json.event_type : "";
  const startsAt  = typeof json.starts_at === "string" ? json.starts_at : "";
  const endsAt    = typeof json.ends_at === "string" ? json.ends_at : "";

  if (!name)      return err("validation_failed", "`name` is required.", 422, { fields: [{ name: "name", error: "required" }] });
  if (!VALID_EVENT_TYPES.includes(eventType as any))
    return err("validation_failed", `\`event_type\` must be one of: ${VALID_EVENT_TYPES.join(", ")}.`, 422);

  const startMs = Date.parse(startsAt);
  const endMs   = Date.parse(endsAt);
  if (!startsAt || isNaN(startMs)) return err("validation_failed", "`starts_at` must be a valid ISO date string.", 422);
  if (!endsAt   || isNaN(endMs))   return err("validation_failed", "`ends_at` must be a valid ISO date string.", 422);
  if (endMs <= startMs)            return err("validation_failed", "`ends_at` must be after `starts_at`.", 422);

  const year = new Date(startMs).getUTCFullYear();

  const { data: row, error } = await supabaseAdmin
    .from("gcc_event_calendar")
    .insert({
      event_type:             eventType,
      name,
      region:                 "QA",
      starts_at:              new Date(startMs).toISOString(),
      ends_at:                new Date(endMs).toISOString(),
      year,
      is_approximate:         false,
      created_by_licensee_id: ctx.licenseeId,
      notes:                  typeof json.notes === "string" ? json.notes : null,
    })
    .select()
    .single();

  if (error) return err("internal_error", error.message, 500);

  const nowMs    = Date.now();
  const isActive = startMs <= nowMs && endMs > nowMs;

  return ok({
    id:         row.id,
    event_type: row.event_type,
    name:       row.name,
    starts_at:  row.starts_at,
    ends_at:    row.ends_at,
    year:       row.year,
    is_active:  isActive,
    is_custom:  true,
    note:       isActive
      ? "Event is ACTIVE now — named_event rules matching this type will fire immediately."
      : "Event is scheduled — named_event rules will fire when it begins.",
  }, 201);
}

// ============================================================================
// GET /v1/dynprice/audit/{sku}
// Returns pricing_decisions written by dynprice_engine_v1 for this SKU.
// Query: ?channel=Online, ?limit=50, ?offset=0
// Scope: audit:read or read
// ============================================================================
export async function handleDynpriceAudit(
  request: Request,
  ctx: V1Context,
  sku: string,
): Promise<V1Result> {
  if (!canReadAudit(ctx)) return err("forbidden", "This API key lacks the `audit:read` scope.", 403);
  if (!sku) return err("validation_failed", "`sku` path param is required.", 422);

  const url     = new URL(request.url);
  const channel = url.searchParams.get("channel") ?? null;
  const limit   = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);
  const offset  = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);

  // pricing_decisions stores product by name; filter via inputs_snapshot->>'sku'
  let q = (supabaseAdmin as any)
    .from("pricing_decisions")
    .select(
      "id, product, category, channel, current_price, recommended_price, " +
      "trigger_type, rule_fired, rule_reason, inputs_snapshot, cost_snapshot, " +
      "note, created_at",
      { count: "exact" }
    )
    .eq("user_id", ctx.userId)
    .eq("source", "dynprice_engine_v1")
    .filter("inputs_snapshot->>sku", "eq", sku)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (channel) q = q.eq("channel", channel);

  const { data, error, count } = await q;
  if (error) return err("internal_error", error.message, 500);

  return ok({
    sku,
    data:   data ?? [],
    total:  count ?? 0,
    limit,
    offset,
  });
}
