// ============================================================================
// Tenant Pricing API (API 14)
//
// Governance model:
//   licensee = mall operator (umbrella)
//   accounts_v2 = tenant sub-accounts
//
// Scope enforcement:
//   tenant:admin | admin  → create rules, create events, view all tenant status
//   tenant:write | write  → submit price updates for own account, read rules
//   tenant:read  | read   → read rules and violations for own account
//
// A tenant key with [tenant:write] CANNOT create governance rules — that
// requires [tenant:admin] which only the licensee owner holds.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "./v1-handlers";

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}
async function readJson(req: Request): Promise<{ json: Record<string, unknown> | null }> {
  const raw = await req.text();
  if (!raw) return { json: {} };
  try {
    const p = JSON.parse(raw);
    if (typeof p !== "object" || p === null || Array.isArray(p)) return { json: null };
    return { json: p as Record<string, unknown> };
  } catch { return { json: null }; }
}

// ---------------------------------------------------------------------------
// Scope helpers
// ---------------------------------------------------------------------------

function isOperator(ctx: V1Context): boolean {
  return ctx.scopes.includes("tenant:admin") || ctx.scopes.includes("admin");
}

function canReadTenant(ctx: V1Context): boolean {
  return ctx.scopes.includes("tenant:read") || ctx.scopes.includes("read")
    || ctx.scopes.includes("tenant:write") || ctx.scopes.includes("write")
    || isOperator(ctx);
}

function canWriteTenant(ctx: V1Context): boolean {
  return ctx.scopes.includes("tenant:write") || ctx.scopes.includes("write") || isOperator(ctx);
}

// ---------------------------------------------------------------------------
// Governance engine
// ---------------------------------------------------------------------------

type GovernanceRule = {
  id: string;
  rule_type: string;
  name: string;
  category: string | null;
  threshold_pct: number | null;
  floor_price: number | null;
  anchor_account_id: string | null;
  enabled: boolean;
};

type ActiveEvent = {
  id: string;
  name: string;
  event_type: string;
  category_scope: string[] | null;
  price_cap_pct: number | null;
  starts_at: string;
  ends_at: string;
  opt_out_allowed: boolean;
};

type GovernanceViolation = {
  rule_id: string | null;
  event_id: string | null;
  violation_type: "anchor_protection" | "category_floor" | "event_requirement";
  allowed_min_price: number | null;
  allowed_max_price: number | null;
  anchor_price: number | null;
};

async function runGovernanceCheck(
  licenseeId: string,
  accountId: string,
  productId: string,
  sku: string,
  category: string | null,
  channel: string,
  proposedPrice: number,
): Promise<{ passed: boolean; violation?: GovernanceViolation }> {
  const cat = category ?? "";

  // Load all enabled governance rules for this licensee
  const { data: rulesRaw } = await (supabaseAdmin as any)
    .from("mall_governance_rules")
    .select("id, rule_type, name, category, threshold_pct, floor_price, anchor_account_id, enabled")
    .eq("licensee_id", licenseeId)
    .eq("enabled", true);

  const rules: GovernanceRule[] = rulesRaw ?? [];

  for (const rule of rules) {
    // Does this rule apply to the product's category?
    const ruleApplies = rule.category === null || rule.category === "" || rule.category === cat;
    if (!ruleApplies) continue;

    if (rule.rule_type === "anchor_protection") {
      if (!rule.anchor_account_id || rule.threshold_pct === null) continue;

      // Find the anchor tenant's product_id by SKU
      const { data: anchorProduct } = await (supabaseAdmin as any)
        .from("catalog_products")
        .select("id")
        .eq("account_id", rule.anchor_account_id)
        .eq("sku", sku)
        .maybeSingle();

      if (!anchorProduct) continue; // anchor doesn't carry this SKU — rule not applicable

      // Get anchor's current price on the same channel
      const { data: anchorPriceRow } = await (supabaseAdmin as any)
        .from("catalog_prices")
        .select("list_price, sale_price")
        .eq("product_id", anchorProduct.id)
        .ilike("channel", channel)
        .maybeSingle();

      if (!anchorPriceRow) continue; // anchor has no price yet — skip

      const anchorPrice = Number(anchorPriceRow.sale_price ?? anchorPriceRow.list_price);
      const allowedMin = +(anchorPrice * (1 - Number(rule.threshold_pct))).toFixed(2);

      if (proposedPrice < allowedMin) {
        return {
          passed: false,
          violation: {
            rule_id: rule.id,
            event_id: null,
            violation_type: "anchor_protection",
            allowed_min_price: allowedMin,
            allowed_max_price: null,
            anchor_price: anchorPrice,
          },
        };
      }
    }

    if (rule.rule_type === "category_floor") {
      if (rule.floor_price === null) continue;
      const floor = Number(rule.floor_price);
      if (proposedPrice < floor) {
        return {
          passed: false,
          violation: {
            rule_id: rule.id,
            event_id: null,
            violation_type: "category_floor",
            allowed_min_price: floor,
            allowed_max_price: null,
            anchor_price: null,
          },
        };
      }
    }
  }

  // Check active mall events that apply to this tenant's account
  const now = new Date().toISOString();
  const { data: eventsRaw } = await (supabaseAdmin as any)
    .from("mall_events")
    .select("id, name, event_type, category_scope, price_cap_pct, starts_at, ends_at, opt_out_allowed")
    .eq("licensee_id", licenseeId)
    .lte("starts_at", now)
    .gte("ends_at", now);

  const events: ActiveEvent[] = eventsRaw ?? [];

  for (const event of events) {
    // Does event apply to this category?
    const eventApplies =
      event.category_scope === null ||
      event.category_scope.length === 0 ||
      event.category_scope.includes(cat);
    if (!eventApplies) continue;

    // If opt-out is allowed, check whether this tenant has opted out
    if (event.opt_out_allowed) {
      const { data: optOut } = await (supabaseAdmin as any)
        .from("mall_event_opt_outs")
        .select("id")
        .eq("event_id", event.id)
        .eq("account_id", accountId)
        .maybeSingle();
      if (optOut) continue; // tenant opted out — event doesn't apply
    }

    // Check price cap: proposed must be <= current catalog price × price_cap_pct
    if (event.price_cap_pct !== null) {
      const { data: currentPriceRow } = await (supabaseAdmin as any)
        .from("catalog_prices")
        .select("list_price, sale_price")
        .eq("product_id", productId)
        .ilike("channel", channel)
        .maybeSingle();

      if (currentPriceRow) {
        const currentPrice = Number(currentPriceRow.sale_price ?? currentPriceRow.list_price);
        const allowedMax = +(currentPrice * Number(event.price_cap_pct)).toFixed(2);
        if (proposedPrice > allowedMax) {
          return {
            passed: false,
            violation: {
              rule_id: null,
              event_id: event.id,
              violation_type: "event_requirement",
              allowed_min_price: null,
              allowed_max_price: allowedMax,
              anchor_price: null,
            },
          };
        }
      }
    }
  }

  return { passed: true };
}

// After anchor price changes, re-evaluate all other tenants in the same licensee.
// Flags (inserts violation records) for tenants whose current prices now violate
// anchor protection — without touching their prices.
async function reEvaluateAnchorDependents(
  licenseeId: string,
  anchorAccountId: string,
  sku: string,
  channel: string,
  newAnchorPrice: number,
): Promise<number> {
  const { data: rules } = await (supabaseAdmin as any)
    .from("mall_governance_rules")
    .select("id, rule_type, threshold_pct, category")
    .eq("licensee_id", licenseeId)
    .eq("rule_type", "anchor_protection")
    .eq("anchor_account_id", anchorAccountId)
    .eq("enabled", true);

  if (!rules || rules.length === 0) return 0;

  // All tenant accounts in this licensee except the anchor itself
  const { data: otherAccounts } = await (supabaseAdmin as any)
    .from("accounts_v2")
    .select("id")
    .eq("licensee_id", licenseeId)
    .neq("id", anchorAccountId);

  let flagged = 0;
  for (const rule of rules) {
    const allowedMin = +(newAnchorPrice * (1 - Number(rule.threshold_pct))).toFixed(2);
    for (const acct of (otherAccounts ?? [])) {
      // Find this tenant's product by SKU
      const { data: tenantProduct } = await (supabaseAdmin as any)
        .from("catalog_products")
        .select("id, category")
        .eq("account_id", acct.id)
        .eq("sku", sku)
        .maybeSingle();
      if (!tenantProduct) continue;

      // Check rule category applies
      const applies = rule.category === null || rule.category === "" || rule.category === tenantProduct.category;
      if (!applies) continue;

      const { data: priceRow } = await (supabaseAdmin as any)
        .from("catalog_prices")
        .select("list_price, sale_price")
        .eq("product_id", tenantProduct.id)
        .ilike("channel", channel)
        .maybeSingle();
      if (!priceRow) continue;

      const tenantCurrentPrice = Number(priceRow.sale_price ?? priceRow.list_price);
      if (tenantCurrentPrice < allowedMin) {
        await (supabaseAdmin as any)
          .from("mall_governance_violations")
          .insert({
            licensee_id: licenseeId,
            account_id: acct.id,
            rule_id: rule.id,
            event_id: null,
            product_id: tenantProduct.id,
            sku,
            category: tenantProduct.category,
            channel,
            proposed_price: tenantCurrentPrice,
            violation_type: "anchor_protection",
            allowed_min_price: allowedMin,
            allowed_max_price: null,
            anchor_price: newAnchorPrice,
            is_proactive: true,
          });
        flagged++;
      }
    }
  }
  return flagged;
}

// ============================================================================
// POST /v1/tenant/rules — operator creates a governance rule
// ============================================================================
export async function handleCreateRule(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!isOperator(ctx)) {
    return err(
      "forbidden",
      "Creating governance rules requires the `tenant:admin` scope. Tenant keys are read-only for governance rules.",
      403,
    );
  }

  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const rule_type = typeof json.rule_type === "string" ? json.rule_type : "";
  if (!["anchor_protection", "category_floor", "event_requirement"].includes(rule_type)) {
    return err("validation_failed", "`rule_type` must be one of: anchor_protection, category_floor, event_requirement.", 422);
  }

  const name = typeof json.name === "string" ? json.name.trim() : "";
  if (!name) return err("validation_failed", "`name` is required.", 422);

  if (rule_type === "anchor_protection") {
    if (typeof json.threshold_pct !== "number" || json.threshold_pct < 0 || json.threshold_pct > 1) {
      return err("validation_failed", "`threshold_pct` is required for anchor_protection and must be between 0 and 1.", 422);
    }
    if (typeof json.anchor_account_id !== "string") {
      return err("validation_failed", "`anchor_account_id` is required for anchor_protection.", 422);
    }
    // Verify anchor account is in this licensee
    const { data: anchorAcct } = await (supabaseAdmin as any)
      .from("accounts_v2")
      .select("id, name")
      .eq("id", json.anchor_account_id)
      .eq("licensee_id", ctx.licenseeId)
      .maybeSingle();
    if (!anchorAcct) {
      return err("validation_failed", "`anchor_account_id` does not belong to your licensee.", 422);
    }
  }

  if (rule_type === "category_floor") {
    if (typeof json.floor_price !== "number" || json.floor_price < 0) {
      return err("validation_failed", "`floor_price` is required for category_floor and must be >= 0.", 422);
    }
  }

  const payload: Record<string, unknown> = {
    licensee_id: ctx.licenseeId,
    rule_type,
    name,
    category: typeof json.category === "string" ? json.category.trim() || null : null,
    threshold_pct: rule_type === "anchor_protection" ? json.threshold_pct : null,
    floor_price: rule_type === "category_floor" ? json.floor_price : null,
    anchor_account_id: rule_type === "anchor_protection" ? json.anchor_account_id : null,
    enabled: json.enabled !== false,
    notes: typeof json.notes === "string" ? json.notes : null,
  };

  const { data: row, error } = await (supabaseAdmin as any)
    .from("mall_governance_rules")
    .insert(payload)
    .select("id, rule_type, name, category, threshold_pct, floor_price, anchor_account_id, enabled, notes, created_at")
    .single();

  if (error) return err("internal_error", error.message, 500);

  return ok({
    id: row.id,
    rule_type: row.rule_type,
    name: row.name,
    category: row.category,
    threshold_pct: row.threshold_pct !== null ? Number(row.threshold_pct) : null,
    floor_price: row.floor_price !== null ? Number(row.floor_price) : null,
    anchor_account_id: row.anchor_account_id,
    enabled: row.enabled,
    notes: row.notes,
    created_at: row.created_at,
  }, 201);
}

// ============================================================================
// GET /v1/tenant/rules — list governance rules for this licensee
// ============================================================================
export async function handleListRulesTenant(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canReadTenant(ctx)) {
    return err("forbidden", "This API key lacks `tenant:read` scope.", 403);
  }

  const url = new URL(request.url);
  const rule_type = url.searchParams.get("rule_type") ?? null;
  const category  = url.searchParams.get("category") ?? null;
  const enabled   = url.searchParams.get("enabled");

  let q = (supabaseAdmin as any)
    .from("mall_governance_rules")
    .select("id, rule_type, name, category, threshold_pct, floor_price, anchor_account_id, enabled, notes, created_at, updated_at")
    .eq("licensee_id", ctx.licenseeId)
    .order("created_at");

  if (rule_type) q = q.eq("rule_type", rule_type);
  if (category)  q = q.eq("category", category);
  if (enabled === "true")  q = q.eq("enabled", true);
  if (enabled === "false") q = q.eq("enabled", false);

  const { data, error } = await q;
  if (error) return err("internal_error", error.message, 500);

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    rule_type: r.rule_type,
    name: r.name,
    category: r.category,
    threshold_pct: r.threshold_pct !== null ? Number(r.threshold_pct) : null,
    floor_price: r.floor_price !== null ? Number(r.floor_price) : null,
    anchor_account_id: r.anchor_account_id,
    enabled: r.enabled,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return ok({ data: rows, total: rows.length });
}

// ============================================================================
// POST /v1/tenant/prices — tenant submits a price update (governance enforced)
// ============================================================================
export async function handleTenantPrice(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWriteTenant(ctx)) {
    return err("forbidden", "This API key lacks `tenant:write` scope.", 403);
  }

  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const sku = typeof json.sku === "string" ? json.sku.trim() : "";
  if (!sku) return err("validation_failed", "`sku` is required.", 422);

  const price = typeof json.price === "number" ? json.price : null;
  if (price === null || !Number.isFinite(price) || price < 0) {
    return err("validation_failed", "`price` must be a non-negative number.", 422);
  }

  const channel = typeof json.channel === "string" ? json.channel.trim() : "Online";

  // Resolve product — must belong to THIS tenant's account
  const { data: product, error: pErr } = await (supabaseAdmin as any)
    .from("catalog_products")
    .select("id, name, category, sku")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  if (pErr) return err("internal_error", pErr.message, 500);
  if (!product) {
    return err("not_found", `Product "${sku}" not found in your account catalog. Sync it first via POST /v1/sync.`, 404);
  }

  // Run governance engine
  const check = await runGovernanceCheck(
    ctx.licenseeId,
    ctx.accountId,
    product.id,
    sku,
    product.category ?? null,
    channel,
    price,
  );

  if (!check.passed && check.violation) {
    const v = check.violation;

    // Log the violation (non-fatal — don't let logging failure hide the 422)
    await (supabaseAdmin as any)
      .from("mall_governance_violations")
      .insert({
        licensee_id: ctx.licenseeId,
        account_id: ctx.accountId,
        rule_id: v.rule_id,
        event_id: v.event_id,
        product_id: product.id,
        sku,
        category: product.category,
        channel,
        proposed_price: price,
        violation_type: v.violation_type,
        allowed_min_price: v.allowed_min_price,
        allowed_max_price: v.allowed_max_price,
        anchor_price: v.anchor_price,
        is_proactive: false,
      })
      .then(() => {});

    const detail: Record<string, unknown> = {
      violation_type: v.violation_type,
      rule_id: v.rule_id,
      event_id: v.event_id,
      proposed_price: price,
    };
    if (v.allowed_min_price !== null) detail.allowed_min_price = v.allowed_min_price;
    if (v.allowed_max_price !== null) detail.allowed_max_price = v.allowed_max_price;
    if (v.anchor_price !== null) detail.anchor_price = v.anchor_price;

    return err(
      "governance_violation",
      v.violation_type === "anchor_protection"
        ? `Price QAR ${price} violates anchor protection: minimum allowed is QAR ${v.allowed_min_price} (anchor QAR ${v.anchor_price} × ${(1 - (v.allowed_min_price! / v.anchor_price!)).toFixed(0) === "0" ? "" : "−"}${Math.round((1 - v.allowed_min_price! / v.anchor_price!) * 100)}% threshold).`
        : v.violation_type === "category_floor"
        ? `Price QAR ${price} violates the category floor of QAR ${v.allowed_min_price} for ${product.category ?? "this category"}.`
        : `Price QAR ${price} exceeds the active event cap of QAR ${v.allowed_max_price}.`,
      422,
      detail,
    );
  }

  // Governance passed — upsert the catalog price
  const { data: existingPrice } = await (supabaseAdmin as any)
    .from("catalog_prices")
    .select("id")
    .eq("product_id", product.id)
    .ilike("channel", channel)
    .maybeSingle();

  if (existingPrice) {
    await (supabaseAdmin as any)
      .from("catalog_prices")
      .update({
        list_price: price,
        sale_price: null,
        effective_at: new Date().toISOString(),
      })
      .eq("id", existingPrice.id);
  } else {
    await (supabaseAdmin as any)
      .from("catalog_prices")
      .insert({
        account_id: ctx.accountId,
        licensee_id: ctx.licenseeId,
        product_id: product.id,
        channel,
        list_price: price,
        sale_price: null,
        currency: "QAR",
      });
  }

  // Anchor monitoring: if this account is the anchor for any rule, re-evaluate dependents
  const { data: anchorRules } = await (supabaseAdmin as any)
    .from("mall_governance_rules")
    .select("id")
    .eq("licensee_id", ctx.licenseeId)
    .eq("rule_type", "anchor_protection")
    .eq("anchor_account_id", ctx.accountId)
    .eq("enabled", true);

  let dependentsReEvaluated = 0;
  if (anchorRules && anchorRules.length > 0) {
    dependentsReEvaluated = await reEvaluateAnchorDependents(
      ctx.licenseeId,
      ctx.accountId,
      sku,
      channel,
      price,
    );
  }

  return ok({
    sku,
    product_id: product.id,
    channel,
    price,
    status: "accepted",
    governance: "passed",
    ...(dependentsReEvaluated > 0
      ? { anchor_monitoring: { dependents_re_evaluated: dependentsReEvaluated, message: "Some dependent tenants may now be out of compliance. See GET /v1/tenant/violations." } }
      : {}),
  });
}

// ============================================================================
// POST /v1/tenant/events — operator pushes a mall-wide event
// ============================================================================
export async function handleCreateEvent(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!isOperator(ctx)) {
    return err(
      "forbidden",
      "Creating mall events requires the `tenant:admin` scope.",
      403,
    );
  }

  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a valid JSON object.", 422);

  const name = typeof json.name === "string" ? json.name.trim() : "";
  if (!name) return err("validation_failed", "`name` is required.", 422);

  const event_type = typeof json.event_type === "string" ? json.event_type : "";
  if (!["promotion", "sale", "clearance", "holiday", "other"].includes(event_type)) {
    return err("validation_failed", "`event_type` must be one of: promotion, sale, clearance, holiday, other.", 422);
  }

  const starts_at = typeof json.starts_at === "string" ? json.starts_at : "";
  const ends_at   = typeof json.ends_at   === "string" ? json.ends_at   : "";
  if (!starts_at) return err("validation_failed", "`starts_at` is required (ISO date string).", 422);
  if (!ends_at)   return err("validation_failed", "`ends_at` is required (ISO date string).", 422);
  if (new Date(ends_at) <= new Date(starts_at)) {
    return err("validation_failed", "`ends_at` must be after `starts_at`.", 422);
  }

  const category_scope: string[] | null = Array.isArray(json.category_scope)
    ? (json.category_scope as unknown[]).filter((x) => typeof x === "string") as string[]
    : null;

  const price_cap_pct =
    typeof json.price_cap_pct === "number" && json.price_cap_pct > 0 && json.price_cap_pct <= 1
      ? json.price_cap_pct
      : null;

  const payload = {
    licensee_id: ctx.licenseeId,
    name,
    event_type,
    category_scope: category_scope && category_scope.length > 0 ? category_scope : null,
    price_cap_pct,
    starts_at,
    ends_at,
    opt_out_allowed: json.opt_out_allowed === true,
    created_by_account_id: ctx.accountId,
  };

  const { data: row, error } = await (supabaseAdmin as any)
    .from("mall_events")
    .insert(payload)
    .select("id, name, event_type, category_scope, price_cap_pct, starts_at, ends_at, opt_out_allowed, created_at")
    .single();

  if (error) return err("internal_error", error.message, 500);

  return ok({
    id: row.id,
    name: row.name,
    event_type: row.event_type,
    category_scope: row.category_scope,
    price_cap_pct: row.price_cap_pct !== null ? Number(row.price_cap_pct) : null,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    opt_out_allowed: row.opt_out_allowed,
    created_at: row.created_at,
  }, 201);
}

// ============================================================================
// GET /v1/tenant/violations — list governance violations
// Operators see all. Tenants see only their own account.
// Query params: account_id (operator only), violation_type, sku, from, to, limit, offset
// ============================================================================
export async function handleListViolations(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!canReadTenant(ctx)) {
    return err("forbidden", "This API key lacks `tenant:read` scope.", 403);
  }

  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get("limit")  ?? "50", 10), 500);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0",  10), 0);
  const filterAccountId = url.searchParams.get("account_id") ?? null;
  const violationType   = url.searchParams.get("violation_type") ?? null;
  const sku             = url.searchParams.get("sku") ?? null;
  const from            = url.searchParams.get("from") ?? null;
  const to              = url.searchParams.get("to")   ?? null;
  const proactive       = url.searchParams.get("proactive") ?? null;

  // Tenants can only see their own violations; operators can filter by account
  const accountFilter = isOperator(ctx)
    ? (filterAccountId ?? null)
    : ctx.accountId;

  let q = (supabaseAdmin as any)
    .from("mall_governance_violations")
    .select(
      "id, account_id, rule_id, event_id, product_id, sku, category, channel, " +
      "proposed_price, violation_type, allowed_min_price, allowed_max_price, " +
      "anchor_price, is_proactive, created_at",
      { count: "exact" },
    )
    .eq("licensee_id", ctx.licenseeId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (accountFilter) q = q.eq("account_id", accountFilter);
  if (violationType) q = q.eq("violation_type", violationType);
  if (sku)           q = q.eq("sku", sku);
  if (from)          q = q.gte("created_at", from);
  if (to)            q = q.lte("created_at", to);
  if (proactive === "true")  q = q.eq("is_proactive", true);
  if (proactive === "false") q = q.eq("is_proactive", false);

  const { data, error, count } = await q;
  if (error) return err("internal_error", error.message, 500);

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    account_id: r.account_id,
    rule_id: r.rule_id,
    event_id: r.event_id,
    product_id: r.product_id,
    sku: r.sku,
    category: r.category,
    channel: r.channel,
    proposed_price: Number(r.proposed_price),
    violation_type: r.violation_type,
    allowed_min_price: r.allowed_min_price !== null ? Number(r.allowed_min_price) : null,
    allowed_max_price: r.allowed_max_price !== null ? Number(r.allowed_max_price) : null,
    anchor_price: r.anchor_price !== null ? Number(r.anchor_price) : null,
    is_proactive: r.is_proactive,
    created_at: r.created_at,
  }));

  return ok({ data: rows, total: count ?? 0, limit, offset });
}

// ============================================================================
// GET /v1/tenant/status/:tenant_id — compliance snapshot for one tenant
// Operator only.
// ============================================================================
export async function handleTenantStatus(
  request: Request,
  ctx: V1Context,
  tenantId: string,
): Promise<V1Result> {
  if (!isOperator(ctx)) {
    return err("forbidden", "GET /v1/tenant/status requires the `tenant:admin` scope.", 403);
  }

  // Verify tenant account belongs to this licensee
  const { data: tenant, error: tErr } = await (supabaseAdmin as any)
    .from("accounts_v2")
    .select("id, name, slug, currency")
    .eq("id", tenantId)
    .eq("licensee_id", ctx.licenseeId)
    .maybeSingle();

  if (tErr) return err("internal_error", tErr.message, 500);
  if (!tenant) return err("not_found", `Tenant account "${tenantId}" not found in your licensee.`, 404);

  // Recent violations (last 30 days)
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: violations, count: violationCount } = await (supabaseAdmin as any)
    .from("mall_governance_violations")
    .select("id, sku, violation_type, proposed_price, allowed_min_price, allowed_max_price, anchor_price, is_proactive, created_at", { count: "exact" })
    .eq("licensee_id", ctx.licenseeId)
    .eq("account_id", tenantId)
    .gte("created_at", since30d)
    .order("created_at", { ascending: false })
    .limit(10);

  // Current prices
  const { data: prices } = await (supabaseAdmin as any)
    .from("catalog_prices")
    .select("id, channel, list_price, sale_price, currency, effective_at, catalog_products(sku, name, category)")
    .eq("account_id", tenantId)
    .order("effective_at", { ascending: false })
    .limit(20);

  // Active events affecting this licensee
  const now = new Date().toISOString();
  const { data: activeEvents } = await (supabaseAdmin as any)
    .from("mall_events")
    .select("id, name, event_type, category_scope, price_cap_pct, starts_at, ends_at, opt_out_allowed")
    .eq("licensee_id", ctx.licenseeId)
    .lte("starts_at", now)
    .gte("ends_at", now);

  // Which active events has this tenant opted out of?
  const eventIds = (activeEvents ?? []).map((e: any) => e.id);
  const optedOutIds = new Set<string>();
  if (eventIds.length > 0) {
    const { data: optOuts } = await (supabaseAdmin as any)
      .from("mall_event_opt_outs")
      .select("event_id")
      .eq("account_id", tenantId)
      .in("event_id", eventIds);
    for (const o of (optOuts ?? [])) optedOutIds.add(o.event_id);
  }

  const recentViolations = (violations ?? []).map((v: any) => ({
    id: v.id,
    sku: v.sku,
    violation_type: v.violation_type,
    proposed_price: Number(v.proposed_price),
    allowed_min_price: v.allowed_min_price !== null ? Number(v.allowed_min_price) : null,
    allowed_max_price: v.allowed_max_price !== null ? Number(v.allowed_max_price) : null,
    anchor_price: v.anchor_price !== null ? Number(v.anchor_price) : null,
    is_proactive: v.is_proactive,
    created_at: v.created_at,
  }));

  return ok({
    tenant_id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    currency: tenant.currency,
    compliance: {
      violations_last_30d: violationCount ?? 0,
      status: (violationCount ?? 0) === 0 ? "compliant" : "violations_present",
    },
    recent_violations: recentViolations,
    current_prices: (prices ?? []).map((p: any) => ({
      channel: p.channel,
      sku: (p.catalog_products as any)?.sku ?? null,
      name: (p.catalog_products as any)?.name ?? null,
      category: (p.catalog_products as any)?.category ?? null,
      price: Number(p.sale_price ?? p.list_price),
      currency: p.currency,
      effective_at: p.effective_at,
    })),
    active_events: (activeEvents ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      event_type: e.event_type,
      category_scope: e.category_scope,
      price_cap_pct: e.price_cap_pct !== null ? Number(e.price_cap_pct) : null,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      opt_out_allowed: e.opt_out_allowed,
      tenant_opted_out: optedOutIds.has(e.id),
    })),
  });
}
