// ============================================================================
// Week 2 vertical-slice handlers for the public /v1 API.
//
// Each handler runs against REAL Postgres tables scoped to the calling key's
// account. They are invoked by the dispatcher in
// src/routes/api/public/v1/$.ts when the path matches one of the registered
// new endpoints.
//
// Tenancy: per-account (accounts_v2). The dispatcher resolves the account
// from the API key's licensee_id via find_account_for_api_key().
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueWebhookEvent } from "@/server/webhook-delivery";
import { evaluateRules, parseRuleRow, type RuleContext } from "@/server/pricing-rules";
import {
  handleListPrices,
  handleGetPrice,
  handlePriceHistory,
  handleTriggerScrape,
  handleListPatterns,
  handleScrapeCoverage,
} from "@/server/competitors-handlers";
import {
  handleListRecommendations,
  handleGetRecommendation,
  handleListRules,
} from "@/server/pricing-handlers";
import {
  handleListCalendar,
  handleListCampaigns,
} from "@/server/promotions-handlers";
import {
  handleListObservations,
  handleListPriceGaps,
} from "@/server/field-intel-handlers";
import {
  handleListEndpoints,
  handleListDeliveries,
} from "@/server/webhooks-handlers";
import { handleListBenchmarks } from "@/server/network-handlers";
import {
  handleCreateDecision,
  handleSimulatePromotion,
  handleSubmitObservation,
  handleCreateEndpoint,
  handleRetryDelivery,
} from "@/server/v1-writes-handlers";
import {
  handleMarginCosts, handleMarginChannels, handleMarginSku,
  handleMarginBreakeven, handleMarginImpact,
} from "@/server/margin-handlers";
import {
  handleListDecisions, handleGetDecision,
  handleAuditSummary, handleAuditReport,
} from "@/server/audit-handlers";
import {
  handleCreateRule, handleListRulesTenant,
  handleTenantPrice, handleCreateEvent,
  handleListViolations, handleTenantStatus,
} from "@/server/tenant-handlers";
import {
  handleDynpriceConfig,
  handleDynpriceCurrent,
  handleDynpriceEvents,
  handleDynpriceCustomEvent,
  handleDynpriceAudit,
} from "@/server/dynprice-handlers";
import {
  handleCreateSegment,
  handleListSegments,
  handleLoyaltyPrice,
  handleLoyaltyOutcome,
} from "@/server/loyalty-handlers";
import {
  handleCreateCampaign,
  handleJoinCampaign,
  handleGetCampaign,
  handleListBuyers,
  handleCloseCampaign,
} from "@/server/group-handlers";
import {
  handleParityAnalysis,
  handleCreateParityRule,
  handleListParityViolations,
  handleParityReport,
} from "@/server/parity-handlers";
import {
  handleCreateAgreement,
  handleListViolations as handleMapViolations,
  handleRetailerCompliance,
  handleComplianceReport,
} from "@/server/compliance-handlers";
import {
  handleWiSubscribe,
  handleListWiSubscriptions,
  handleWiTest,
  handleWiDeliveries,
  handleDeleteWiSubscription,
} from "@/server/webhook-intelligence-handlers";
import {
  handleCreateFlashEvent,
  handleListFlashEvents,
  handleGetFlashEvent,
  handleCancelFlashEvent,
  handleFlashEventReport,
} from "@/server/flash-handlers";
import {
  handleGetEmbedConfig,
  handleSetEmbedConfig,
  handleIssueEmbedToken,
  handleListEmbedScopes,
} from "@/server/embed-handlers";

export type V1Context = {
  apiKeyId: string;
  userId: string;
  accountId: string;
  licenseeId: string;
  scopes: string[];
  plan: import("./plans").Plan;
  isPlatform: boolean;
  planMode: import("./plans").PlanMode;
};

export type V1Result = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

function ok(body: unknown, status = 200, headers?: Record<string, string>): V1Result {
  return { status, body, headers };
}

async function readJson(request: Request): Promise<{ json: Record<string, unknown> | null; raw: string }> {
  const raw = await request.text();
  if (!raw) return { json: {}, raw };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { json: null, raw };
    }
    return { json: parsed as Record<string, unknown>, raw };
  } catch {
    return { json: null, raw };
  }
}

// ============================================================================
// POST /v1/sync — Catalog ingestion with idempotency
// ============================================================================
//
// Body: { products: Array<{ sku, name, brand?, category?, attributes?,
//                            price?: { list, sale?, channel, currency? } }> }
// Header: Idempotency-Key: <client-generated unique key>
//
// Per-item upsert. Returns per-row results so the client knows which SKUs
// failed without re-sending the whole batch. Same idempotency key returns
// the cached response.
// ============================================================================

type SyncProduct = {
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  attributes?: Record<string, unknown>;
  price?: {
    list: number;
    sale?: number;
    channel?: string;
    currency?: string;
  };
};

type SyncItemResult = {
  sku: string;
  status: "created" | "updated" | "error";
  product_id?: string;
  error?: string;
};

export async function handleSync(request: Request, ctx: V1Context): Promise<V1Result> {
  const idemKey = request.headers.get("idempotency-key")?.trim();
  if (!idemKey) {
    return err(
      "missing_idempotency_key",
      "All POST /v1/sync calls must include an Idempotency-Key header. Generate a unique value per logical batch (e.g. a UUID).",
      400,
    );
  }
  if (idemKey.length > 200) {
    return err("invalid_idempotency_key", "Idempotency-Key must be 200 characters or fewer.", 400);
  }

  // Replay: same key returns the original cached response.
  const { data: cached } = await supabaseAdmin
    .from("ingestion_batches")
    .select("response_body, response_status")
    .eq("account_id", ctx.accountId)
    .eq("endpoint", "/v1/sync")
    .eq("idempotency_key", idemKey)
    .maybeSingle();

  if (cached) {
    return ok(cached.response_body, cached.response_status, {
      "Idempotency-Replay": "true",
    });
  }

  const { json } = await readJson(request);
  if (!json) {
    return err("validation_failed", "Request body must be a valid JSON object.", 422);
  }

  const products = json.products;
  if (!Array.isArray(products) || products.length === 0) {
    return err("validation_failed", "`products` must be a non-empty array.", 422, {
      fields: [{ name: "products", error: "required" }],
    });
  }
  if (products.length > 1000) {
    return err("validation_failed", "Maximum 1000 products per /v1/sync call.", 422);
  }

  // Plan product-cap enforcement (skip for enterprise — unlimited)
  const { PLAN_LIMITS } = await import("./plans");
  const planLimit = PLAN_LIMITS[ctx.plan].maxProducts;
  if (planLimit !== -1) {
    const { count: currentCount } = await supabaseAdmin
      .from("catalog_products")
      .select("id", { count: "exact", head: true })
      .eq("account_id", ctx.accountId);

    const submittedSkus = (products as SyncProduct[]).map((p) => p.sku).filter(Boolean);
    const { data: existingRows } = await supabaseAdmin
      .from("catalog_products")
      .select("sku")
      .eq("account_id", ctx.accountId)
      .in("sku", submittedSkus);
    const existingSkus = new Set((existingRows ?? []).map((r: { sku: string }) => r.sku));
    const newCount = submittedSkus.filter((s) => !existingSkus.has(s)).length;

    if ((currentCount ?? 0) + newCount > planLimit) {
      const upgradePlan = ctx.plan === "starter" ? "standard" : "enterprise";
      return err(
        "plan_limit_exceeded",
        `Your ${ctx.plan} plan allows up to ${planLimit} products. You have ${currentCount ?? 0} and this batch would add ${newCount} new product(s). Upgrade to ${upgradePlan} to increase your product limit.`,
        402,
        {
          limit_name: "products",
          plan_limit: planLimit,
          current: currentCount ?? 0,
          would_add: newCount,
          upgrade_to: upgradePlan,
        },
      );
    }
  }

  const results: SyncItemResult[] = [];
  let okCount = 0;
  let errCount = 0;

  for (const raw of products) {
    if (typeof raw !== "object" || raw === null) {
      results.push({ sku: "(unknown)", status: "error", error: "item must be an object" });
      errCount++;
      continue;
    }
    const p = raw as SyncProduct;
    if (typeof p.sku !== "string" || p.sku.length === 0 || typeof p.name !== "string" || p.name.length === 0) {
      results.push({ sku: typeof p.sku === "string" ? p.sku : "(unknown)", status: "error", error: "sku and name are required" });
      errCount++;
      continue;
    }

    // Upsert product on (account_id, sku).
    const { data: existing } = await supabaseAdmin
      .from("catalog_products")
      .select("id")
      .eq("account_id", ctx.accountId)
      .eq("sku", p.sku)
      .maybeSingle();

    let productId: string;
    let didCreate = false;
    if (existing) {
      productId = existing.id;
      const { error: upErr } = await supabaseAdmin
        .from("catalog_products")
        .update({
          name: p.name,
          brand: p.brand ?? null,
          category: p.category ?? null,
          attributes: (p.attributes ?? {}) as never,
        })
        .eq("id", productId);
      if (upErr) {
        results.push({ sku: p.sku, status: "error", error: upErr.message });
        errCount++;
        continue;
      }
    } else {
      const { data: created, error: insErr } = await supabaseAdmin
        .from("catalog_products")
        .insert({
          account_id: ctx.accountId,
          licensee_id: ctx.licenseeId,
          sku: p.sku,
          name: p.name,
          brand: p.brand ?? null,
          category: p.category ?? null,
          attributes: (p.attributes ?? {}) as never,
        })
        .select("id")
        .single();
      if (insErr || !created) {
        results.push({ sku: p.sku, status: "error", error: insErr?.message ?? "insert failed" });
        errCount++;
        continue;
      }
      productId = created.id;
      didCreate = true;
    }

    // Optional price upsert on (product_id, channel).
    if (p.price && typeof p.price.list === "number") {
      const channel = p.price.channel ?? "online";
      const currency = p.price.currency ?? "QAR";
      const { data: existingPrice } = await supabaseAdmin
        .from("catalog_prices")
        .select("id")
        .eq("product_id", productId)
        .eq("channel", channel)
        .maybeSingle();

      if (existingPrice) {
        await supabaseAdmin
          .from("catalog_prices")
          .update({
            list_price: p.price.list,
            sale_price: p.price.sale ?? null,
            currency,
            effective_at: new Date().toISOString(),
          })
          .eq("id", existingPrice.id);
      } else {
        await supabaseAdmin.from("catalog_prices").insert({
          account_id: ctx.accountId,
          licensee_id: ctx.licenseeId,
          product_id: productId,
          channel,
          list_price: p.price.list,
          sale_price: p.price.sale ?? null,
          currency,
        });
      }
    }

    results.push({
      sku: p.sku,
      status: didCreate ? "created" : "updated",
      product_id: productId,
    });
    okCount++;
  }

  const responseBody = {
    batch_id: `bch_${Math.random().toString(36).slice(2, 12)}`,
    item_count: products.length,
    ok_count: okCount,
    error_count: errCount,
    results,
  };
  const responseStatus = errCount === 0 ? 200 : 207; // 207 Multi-Status when partial

  // Persist for replay.
  await supabaseAdmin.from("ingestion_batches").insert({
    account_id: ctx.accountId,
    licensee_id: ctx.licenseeId,
    api_key_id: ctx.apiKeyId,
    idempotency_key: idemKey,
    endpoint: "/v1/sync",
    request_body: { product_count: products.length },
    response_body: responseBody,
    response_status: responseStatus,
    item_count: products.length,
    ok_count: okCount,
    error_count: errCount,
  });

  // Notify subscribers that a catalog batch was ingested.
  // Awaited: CF Workers kill void promises after the response is sent.
  // enqueueWebhookEvent short-circuits in ~20ms when no endpoints are registered.
  await enqueueWebhookEvent({
    userId: ctx.userId,
    eventType: "catalog.synced",
    payload: {
      batch_id: responseBody.batch_id,
      account_id: ctx.accountId,
      item_count: responseBody.item_count,
      ok_count: okCount,
      error_count: errCount,
    },
  });

  return ok(responseBody, responseStatus);
}

// ============================================================================
// POST /v1/margin — Compute landed cost + margin from inputs
// ============================================================================
//
// Body: { sku: string, list_price?: number, channel?: string }
//
// Reads margin_inputs for the SKU and computes:
//   landed_cost = unit_cost + freight + (unit_cost * duty_pct) + (list_price * fees_pct)
//   gross_margin = list_price - landed_cost
//   gross_margin_pct = gross_margin / list_price
// ============================================================================

export async function handleMargin(request: Request, ctx: V1Context): Promise<V1Result> {
  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Request body must be a valid JSON object.", 422);

  const sku = typeof json.sku === "string" ? json.sku : "";
  if (!sku) {
    return err("validation_failed", "`sku` is required.", 422, {
      fields: [{ name: "sku", error: "required" }],
    });
  }

  const channel = typeof json.channel === "string" ? json.channel : "online";

  // Resolve product.
  const { data: product, error: prodErr } = await supabaseAdmin
    .from("catalog_products")
    .select("id, sku, name")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  if (prodErr) return err("internal_error", prodErr.message, 500);
  if (!product) return err("not_found", `Product "${sku}" not found in your catalog. Sync it first via POST /v1/sync.`, 404);

  // Load margin inputs.
  const { data: inputs } = await supabaseAdmin
    .from("margin_inputs")
    .select("unit_cost, freight, duty_pct, fees_pct, currency")
    .eq("product_id", product.id)
    .maybeSingle();

  if (!inputs) {
    return err(
      "margin_inputs_missing",
      `No margin inputs configured for "${sku}". Provide unit_cost, freight, duty_pct, and fees_pct via your dashboard or a future POST /v1/margin/inputs endpoint.`,
      404,
    );
  }

  // Resolve list price (body override > catalog).
  let listPrice = typeof json.list_price === "number" ? json.list_price : null;
  if (listPrice === null) {
    const { data: priceRow } = await supabaseAdmin
      .from("catalog_prices")
      .select("list_price, sale_price")
      .eq("product_id", product.id)
      .eq("channel", channel)
      .maybeSingle();
    if (priceRow) {
      listPrice = Number(priceRow.sale_price ?? priceRow.list_price);
    }
  }

  if (listPrice === null || !Number.isFinite(listPrice)) {
    return err(
      "validation_failed",
      `Could not resolve a list_price for "${sku}" on channel "${channel}". Pass list_price in the body or sync a price first.`,
      422,
    );
  }

  const unitCost = Number(inputs.unit_cost);
  const freight = Number(inputs.freight);
  const dutyPct = Number(inputs.duty_pct);
  const feesPct = Number(inputs.fees_pct);

  const dutyAmt = unitCost * dutyPct;
  const feesAmt = listPrice * feesPct;
  const landedCost = unitCost + freight + dutyAmt + feesAmt;
  const grossMargin = listPrice - landedCost;
  const grossMarginPct = listPrice > 0 ? grossMargin / listPrice : 0;

  return ok({
    sku,
    product_id: product.id,
    channel,
    currency: inputs.currency,
    inputs: {
      unit_cost: unitCost,
      freight,
      duty_pct: dutyPct,
      fees_pct: feesPct,
      list_price: listPrice,
    },
    breakdown: {
      duty_amount: round2(dutyAmt),
      fees_amount: round2(feesAmt),
      landed_cost: round2(landedCost),
    },
    margin: {
      gross_margin: round2(grossMargin),
      gross_margin_pct: round4(grossMarginPct),
    },
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

// ============================================================================
// POST /v1/dynprice — Deterministic price recommendation
// ============================================================================
//
// Body: { sku, channel?, target_margin_pct? }
//
// Algorithm (v1, deterministic):
//   1. Load margin_inputs and catalog_prices for the SKU.
//   2. margin_floor = landed_cost / (1 - target_margin_pct)
//      (default target = 0.20 if not provided)
//   3. competitor_min = MIN(price across competitor_prices for this product name)
//   4. candidate = max(margin_floor, competitor_min - 1)
//   5. Apply pricing_rules text (informational only — surfaced in `signals.rules`)
//
// Result is appended to dynprice_decisions.
// ============================================================================

export async function handleDynprice(request: Request, ctx: V1Context): Promise<V1Result> {
  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Request body must be a valid JSON object.", 422);

  const sku = typeof json.sku === "string" ? json.sku : "";
  if (!sku) {
    return err("validation_failed", "`sku` is required.", 422, {
      fields: [{ name: "sku", error: "required" }],
    });
  }

  const channel = typeof json.channel === "string" ? json.channel : "online";
  const targetMarginPct = typeof json.target_margin_pct === "number" ? Math.max(0, Math.min(0.95, json.target_margin_pct)) : 0.2;

  const { data: product } = await supabaseAdmin
    .from("catalog_products")
    .select("id, name, category")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  if (!product) {
    return err("not_found", `Product "${sku}" not found in your catalog.`, 404);
  }

  // Current price.
  const { data: currentPriceRow } = await supabaseAdmin
    .from("catalog_prices")
    .select("list_price, sale_price")
    .eq("product_id", product.id)
    .eq("channel", channel)
    .maybeSingle();
  const currentPrice = currentPriceRow ? Number(currentPriceRow.sale_price ?? currentPriceRow.list_price) : null;

  // Margin floor from landed cost.
  const { data: inputs } = await supabaseAdmin
    .from("margin_inputs")
    .select("unit_cost, freight, duty_pct, fees_pct")
    .eq("product_id", product.id)
    .maybeSingle();

  let marginFloor: number | null = null;
  if (inputs) {
    const unitCost = Number(inputs.unit_cost);
    const freight = Number(inputs.freight);
    const dutyAmt = unitCost * Number(inputs.duty_pct);
    // Approximate fees on a price-of-1 — we'll iterate once with currentPrice.
    const ref = currentPrice ?? unitCost * 2;
    const feesAmt = ref * Number(inputs.fees_pct);
    const landedCost = unitCost + freight + dutyAmt + feesAmt;
    marginFloor = landedCost / (1 - targetMarginPct);
  }

  // Competitor minimum for this product name.
  const { data: compRows } = await supabaseAdmin
    .from("competitor_prices")
    .select("amazon, carrefour, lulu, noon, talabat")
    .eq("user_id", ctx.userId)
    .eq("product", product.name)
    .limit(1);

  const competitorPrices: number[] = [];
  if (compRows && compRows[0]) {
    const row = compRows[0];
    for (const key of ["amazon", "carrefour", "lulu", "noon", "talabat"] as const) {
      const v = row[key] as { price?: number } | null | undefined;
      if (v && typeof v.price === "number") competitorPrices.push(v.price);
    }
  }
  const competitorMin = competitorPrices.length > 0 ? Math.min(...competitorPrices) : null;

  // Load structured rules and build competitor price map for evaluator.
  const { data: ruleRows } = await supabaseAdmin
    .from("pricing_rules")
    .select("id, rule_text, rule_type, params, enabled, position")
    .eq("user_id", ctx.userId)
    .eq("enabled", true)
    .order("position");
  const activeRules = (ruleRows ?? []).map((r: any) => r.rule_text as string);
  const structuredRules = (ruleRows ?? []).map((r: any) => parseRuleRow(r));

  // Combine: undercut competitor by 1 unit if it respects floor; else hold floor.
  let recommended: number;
  let reason: string;
  const undercutBy = 1;

  if (marginFloor !== null && competitorMin !== null) {
    const undercut = competitorMin - undercutBy;
    if (undercut >= marginFloor) {
      recommended = undercut;
      reason = `Undercut cheapest competitor (${round2(competitorMin)}) by ${undercutBy} unit${undercutBy === 1 ? "" : "s"} while respecting the ${Math.round(targetMarginPct * 100)}% margin floor.`;
    } else {
      recommended = marginFloor;
      reason = `Held the ${Math.round(targetMarginPct * 100)}% margin floor (${round2(marginFloor)}); undercutting the cheapest competitor (${round2(competitorMin)}) would push margin below target.`;
    }
  } else if (marginFloor !== null) {
    recommended = marginFloor;
    reason = `No competitor price available — used margin floor (${round2(marginFloor)}) at ${Math.round(targetMarginPct * 100)}% target.`;
  } else if (competitorMin !== null) {
    recommended = competitorMin - undercutBy;
    reason = `No margin inputs configured — undercut cheapest competitor (${round2(competitorMin)}) by ${undercutBy} unit${undercutBy === 1 ? "" : "s"}. Add margin_inputs for safer recommendations.`;
  } else {
    return err(
      "insufficient_signals",
      `Cannot recommend a price for "${sku}": no margin inputs and no competitor data available.`,
      422,
    );
  }

  // Apply structured rules via shared evaluator.
  const ruleCtx: RuleContext = {
    currentPrice: currentPrice ?? 0,
    competitorMin,
    competitorPrices: (() => {
      const m = new Map<string, number>();
      if (compRows && compRows[0]) {
        const row = compRows[0] as Record<string, { price?: number } | null>;
        for (const key of ["amazon", "carrefour", "lulu", "noon", "talabat"] as const) {
          const v = row[key];
          if (v && typeof v.price === "number") m.set(key, v.price);
        }
      }
      return m;
    })(),
    unitCost: inputs ? Number(inputs.unit_cost) : null,
    category: (product as any).category ?? "",
  };
  const { finalPrice: ruleAdjusted, effects } = evaluateRules(recommended, ruleCtx, structuredRules);
  const clampedRules = effects.filter((e) => e.clamped);
  if (clampedRules.length > 0) {
    reason += ` Rules applied: ${clampedRules.map((e) => e.reason).join("; ")}`;
  }

  const finalPrice = round2(Math.max(0.01, ruleAdjusted));
  const decisionId = `dec_${Math.random().toString(36).slice(2, 14)}`;

  // Persist decision for audit.
  await supabaseAdmin.from("dynprice_decisions").insert({
    account_id: ctx.accountId,
    licensee_id: ctx.licenseeId,
    product_id: product.id,
    api_key_id: ctx.apiKeyId,
    channel,
    input_current_price: currentPrice,
    input_competitor_min: competitorMin,
    input_margin_floor: marginFloor !== null ? round2(marginFloor) : null,
    output_price: finalPrice,
    reason,
    signals: {
      target_margin_pct: targetMarginPct,
      competitor_count: competitorPrices.length,
      active_rules: activeRules,
      rule_effects: effects,
      decision_id: decisionId,
    },
  });

  // Notify subscribers. Two semantic events: always "recommendation.ready",
  // plus "price.changed" when the recommendation differs from current price.
  const eventPayload = {
    decision_id: decisionId,
    sku,
    product_id: product.id,
    account_id: ctx.accountId,
    channel,
    current_price: currentPrice,
    recommended_price: finalPrice,
    reason,
    signals: {
      margin_floor: marginFloor !== null ? round2(marginFloor) : null,
      competitor_min: competitorMin,
      target_margin_pct: targetMarginPct,
    },
  };
  await enqueueWebhookEvent({
    userId: ctx.userId,
    eventType: "recommendation.ready",
    payload: eventPayload,
  });
  if (currentPrice !== null && Math.abs(finalPrice - currentPrice) > 0.005) {
    await enqueueWebhookEvent({
      userId: ctx.userId,
      eventType: "price.changed",
      payload: {
        ...eventPayload,
        delta: round2(finalPrice - currentPrice),
        delta_pct: currentPrice > 0 ? round4((finalPrice - currentPrice) / currentPrice) : null,
      },
    });
  }

  // Automated plans (standard, enterprise) auto-apply the recommendation.
  if (ctx.planMode === "automated") {
    await supabaseAdmin.from("catalog_prices").upsert(
      {
        product_id: product.id,
        account_id: ctx.accountId,
        licensee_id: ctx.licenseeId,
        channel,
        list_price: finalPrice,
        currency: "USD",
      },
      { onConflict: "product_id,channel" },
    );
  }

  return ok({
    sku,
    product_id: product.id,
    channel,
    current_price: currentPrice,
    recommended_price: finalPrice,
    mode: ctx.planMode,
    applied: ctx.planMode === "automated",
    ...(ctx.planMode === "advisory"
      ? { note: "Advisory mode: price recommendation returned but not applied. Upgrade to Standard to enable automated price application." }
      : {}),
    reason,
    signals: {
      margin_floor: marginFloor !== null ? round2(marginFloor) : null,
      competitor_min: competitorMin,
      competitor_count: competitorPrices.length,
      target_margin_pct: targetMarginPct,
      active_rules: activeRules,
      rule_effects: effects,
    },
  });
}

// ============================================================================
// POST /v1/webhooks/enrich — Emit an enrichment event to subscribers
// ============================================================================
//
// Body: { event_type: "enrich.price_changed" | "enrich.promo_detected" |
//                     "enrich.new_competitor", payload: object }
//
// Looks up subscribed webhook_endpoints for the calling user, signs the
// payload with each endpoint's signing_secret, fires the request, and
// records the result in webhook_deliveries.
// ============================================================================

const ENRICH_EVENTS = ["enrich.price_changed", "enrich.promo_detected", "enrich.new_competitor"] as const;
type EnrichEvent = (typeof ENRICH_EVENTS)[number];

function isEnrichEvent(s: unknown): s is EnrichEvent {
  return typeof s === "string" && (ENRICH_EVENTS as readonly string[]).includes(s);
}

export async function handleWebhooksEnrich(request: Request, ctx: V1Context): Promise<V1Result> {
  const { json } = await readJson(request);
  if (!json) return err("validation_failed", "Request body must be a valid JSON object.", 422);

  if (!isEnrichEvent(json.event_type)) {
    return err(
      "validation_failed",
      `\`event_type\` must be one of: ${ENRICH_EVENTS.join(", ")}.`,
      422,
      { fields: [{ name: "event_type", error: "invalid" }] },
    );
  }
  const eventType: EnrichEvent = json.event_type;
  const payload = (typeof json.payload === "object" && json.payload !== null)
    ? (json.payload as Record<string, unknown>)
    : {};

  const result = await enqueueWebhookEvent({
    userId: ctx.userId,
    eventType,
    payload,
  });

  if (result.attempted === 0) {
    return ok({
      event_id: result.eventId,
      event_type: eventType,
      delivered_count: 0,
      attempted_count: 0,
      message: "No active subscribers for this event. Configure webhook endpoints in your dashboard.",
    });
  }

  const allOk = result.results.every((r) => r.success);
  return ok(
    {
      event_id: result.eventId,
      event_type: eventType,
      delivered_count: result.delivered,
      attempted_count: result.attempted,
      deliveries: result.results.map((r) => ({
        endpoint_id: r.endpointId,
        success: r.success,
        status_code: r.status,
        error: r.error,
        will_retry: r.willRetry,
      })),
    },
    allOk ? 200 : 207,
  );
}

// ============================================================================
// Path matcher — supports both literal paths ("POST /v1/sync") and dynamic
// segments via {param} placeholders ("GET /v1/competitors/prices/{id}").
//
// IMPORTANT: order matters. More specific (literal) paths must come before
// the {id}-style patterns that would otherwise swallow them — e.g.
// "/v1/competitors/prices/history" must match before "/v1/competitors/prices/{id}".
// ============================================================================

type V1Route = {
  key: string; // "METHOD /v1/path-template"
  pattern: RegExp;
  handler: (request: Request, ctx: V1Context, params: Record<string, string>) => Promise<V1Result>;
};

function compileRoute(
  key: string,
  handler: (request: Request, ctx: V1Context, params: Record<string, string>) => Promise<V1Result>,
): V1Route {
  const [, template] = key.split(" ");
  const paramNames: string[] = [];
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{([^}]+)\\\}/g, (_m, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  const pattern = new RegExp(`^${escaped}$`);
  return {
    key,
    pattern,
    handler: async (request, ctx) => {
      const url = new URL(request.url);
      const fullPath = url.pathname.replace(/^\/api\/public/, "");
      const m = pattern.exec(fullPath);
      const params: Record<string, string> = {};
      if (m) paramNames.forEach((n, i) => (params[n] = m[i + 1]));
      return handler(request, ctx, params);
    },
  };
}

const V1_ROUTES: V1Route[] = [
  // Existing real handlers
  compileRoute("POST /v1/sync", (req, ctx) => handleSync(req, ctx)),
  compileRoute("POST /v1/margin/costs", (req, ctx) => handleMarginCosts(req, ctx)),
  compileRoute("POST /v1/margin/channels", (req, ctx) => handleMarginChannels(req, ctx)),
  compileRoute("GET /v1/margin/sku", (req, ctx) => handleMarginSku(req, ctx)),
  compileRoute("GET /v1/margin/breakeven", (req, ctx) => handleMarginBreakeven(req, ctx)),
  compileRoute("GET /v1/margin/impact", (req, ctx) => handleMarginImpact(req, ctx)),
  compileRoute("POST /v1/margin", (req, ctx) => handleMargin(req, ctx)),
  compileRoute("POST /v1/dynprice", (req, ctx) => handleDynprice(req, ctx)),
  compileRoute("POST /v1/webhooks/enrich", (req, ctx) => handleWebhooksEnrich(req, ctx)),
  // Competitors (Week 10 — pillar 1)
  compileRoute("GET /v1/competitors/prices", (req, ctx) => handleListPrices(req, ctx)),
  compileRoute("GET /v1/competitors/prices/history", (req, ctx) => handlePriceHistory(req, ctx)),
  compileRoute("GET /v1/competitors/prices/{id}", (req, ctx, p) => handleGetPrice(req, ctx, p.id)),
  compileRoute("POST /v1/competitors/scrape", (req, ctx) => handleTriggerScrape(req, ctx)),
  compileRoute("GET /v1/competitors/coverage", (req, ctx) => handleScrapeCoverage(req, ctx)),
  compileRoute("GET /v1/competitors/patterns", (req, ctx) => handleListPatterns(req, ctx)),
  // Pricing reads (Week 10 — pillar 2)
  compileRoute("GET /v1/pricing/recommendations", (req, ctx) => handleListRecommendations(req, ctx)),
  compileRoute("GET /v1/pricing/recommendations/{id}", (req, ctx, p) => handleGetRecommendation(req, ctx, p.id)),
  compileRoute("GET /v1/pricing/rules", (req, ctx) => handleListRules(req, ctx)),
  // Promotions reads (Week 10 — pillar 3)
  compileRoute("GET /v1/promotions/calendar", (req, ctx) => handleListCalendar(req, ctx)),
  compileRoute("GET /v1/promotions/campaigns", (req, ctx) => handleListCampaigns(req, ctx)),
  // Field Intel reads (Week 10 — pillar 4)
  compileRoute("GET /v1/field-intel/observations", (req, ctx) => handleListObservations(req, ctx)),
  compileRoute("GET /v1/field-intel/price-gaps", (req, ctx) => handleListPriceGaps(req, ctx)),
  // Webhooks reads (Week 10 — pillar 5)
  // Enriched Webhook Intelligence API (API 17)
  compileRoute("POST /v1/webhooks/subscribe",              (req, ctx)    => handleWiSubscribe(req, ctx)),
  compileRoute("GET /v1/webhooks/subscriptions",           (req, ctx)    => handleListWiSubscriptions(req, ctx)),
  compileRoute("POST /v1/webhooks/test",                   (req, ctx)    => handleWiTest(req, ctx)),
  compileRoute("DELETE /v1/webhooks/subscriptions/{id}",   (req, ctx, p) => handleDeleteWiSubscription(req, ctx, p.id)),
  compileRoute("GET /v1/webhooks/deliveries",              (req, ctx)    => handleWiDeliveries(req, ctx)),
  // Legacy webhook endpoints (pre-API-17)
  compileRoute("GET /v1/webhooks/endpoints", (req, ctx) => handleListEndpoints(req, ctx)),
  // Network reads (Week 10 — pillar 6)
  compileRoute("GET /v1/network/benchmarks", (req, ctx) => handleListBenchmarks(req, ctx)),
  // /v1/network/patterns is an alias of /v1/competitors/patterns
  compileRoute("GET /v1/network/patterns", (req, ctx) => handleListPatterns(req, ctx)),
  // Writes (Week 10 — final batch)
  compileRoute("POST /v1/pricing/decisions", (req, ctx) => handleCreateDecision(req, ctx)),
  compileRoute("POST /v1/promotions/simulate", (req, ctx) => handleSimulatePromotion(req, ctx)),
  compileRoute("POST /v1/field-intel/observations", (req, ctx) => handleSubmitObservation(req, ctx)),
  compileRoute("POST /v1/webhooks/endpoints", (req, ctx) => handleCreateEndpoint(req, ctx)),
  compileRoute("POST /v1/webhooks/deliveries/{id}/retry", (req, ctx, p) => handleRetryDelivery(req, ctx, p.id)),
  // Audit / governance (API 04)
  compileRoute("GET /v1/audit/decisions", (req, ctx) => handleListDecisions(req, ctx)),
  compileRoute("GET /v1/audit/decisions/{id}", (req, ctx, p) => handleGetDecision(req, ctx, p.id)),
  compileRoute("GET /v1/audit/summary", (req, ctx) => handleAuditSummary(req, ctx)),
  compileRoute("GET /v1/audit/report", (req, ctx) => handleAuditReport(req, ctx)),
  // Dynamic Pricing Engine (API 03 — /v1/dynprice/*)
  // Literals before dynamics; POST /v1/dynprice (old handler) remains untouched.
  compileRoute("POST /v1/dynprice/config",                 (req, ctx)       => handleDynpriceConfig(req, ctx)),
  compileRoute("GET /v1/dynprice/events",                  (req, ctx)       => handleDynpriceEvents(req, ctx)),
  compileRoute("POST /v1/dynprice/events/custom",          (req, ctx)       => handleDynpriceCustomEvent(req, ctx)),
  compileRoute("GET /v1/dynprice/current/{sku}",           (req, ctx, p)    => handleDynpriceCurrent(req, ctx, p.sku)),
  compileRoute("GET /v1/dynprice/audit/{sku}",             (req, ctx, p)    => handleDynpriceAudit(req, ctx, p.sku)),
  // Group Buying Engine (API 12)
  compileRoute("POST /v1/group/campaigns",              (req, ctx)    => handleCreateCampaign(req, ctx)),
  compileRoute("POST /v1/group/join",                   (req, ctx)    => handleJoinCampaign(req, ctx)),
  compileRoute("GET /v1/group/campaigns/{id}",          (req, ctx, p) => handleGetCampaign(req, ctx, p.id)),
  compileRoute("GET /v1/group/campaigns/{id}/buyers",   (req, ctx, p) => handleListBuyers(req, ctx, p.id)),
  compileRoute("POST /v1/group/campaigns/{id}/close",   (req, ctx, p) => handleCloseCampaign(req, ctx, p.id)),
  // Loyalty & Segment Pricing (API 11)
  compileRoute("POST /v1/loyalty/segments", (req, ctx) => handleCreateSegment(req, ctx)),
  compileRoute("GET /v1/loyalty/segments",  (req, ctx) => handleListSegments(req, ctx)),
  compileRoute("POST /v1/loyalty/price",    (req, ctx) => handleLoyaltyPrice(req, ctx)),
  compileRoute("POST /v1/loyalty/outcome",  (req, ctx) => handleLoyaltyOutcome(req, ctx)),
  // Cross-Border Price Parity API (API 15)
  compileRoute("GET /v1/parity/analysis",   (req, ctx) => handleParityAnalysis(req, ctx)),
  compileRoute("POST /v1/parity/rules",     (req, ctx) => handleCreateParityRule(req, ctx)),
  compileRoute("GET /v1/parity/violations", (req, ctx) => handleListParityViolations(req, ctx)),
  compileRoute("GET /v1/parity/report",     (req, ctx) => handleParityReport(req, ctx)),
  // MAP Compliance API (API 16)
  compileRoute("POST /v1/compliance/map/agreements", (req, ctx) => handleCreateAgreement(req, ctx)),
  compileRoute("GET /v1/compliance/map/violations",  (req, ctx) => handleMapViolations(req, ctx)),
  compileRoute("GET /v1/compliance/map/retailers",   (req, ctx) => handleRetailerCompliance(req, ctx)),
  compileRoute("GET /v1/compliance/map/report",      (req, ctx) => handleComplianceReport(req, ctx)),
  // Flash Sale Orchestration (API 09)
  compileRoute("POST /v1/flash/events",                      (req, ctx)    => handleCreateFlashEvent(req, ctx)),
  compileRoute("GET /v1/flash/events",                       (req, ctx)    => handleListFlashEvents(req, ctx)),
  compileRoute("GET /v1/flash/events/{id}/report",           (req, ctx, p) => handleFlashEventReport(req, ctx, p.id)),
  compileRoute("POST /v1/flash/events/{id}/cancel",          (req, ctx, p) => handleCancelFlashEvent(req, ctx, p.id)),
  compileRoute("GET /v1/flash/events/{id}",                  (req, ctx, p) => handleGetFlashEvent(req, ctx, p.id)),
  // White-Label Embed API (API 13)
  compileRoute("GET /v1/embed/config",   (req, ctx) => handleGetEmbedConfig(req, ctx)),
  compileRoute("POST /v1/embed/config",  (req, ctx) => handleSetEmbedConfig(req, ctx)),
  compileRoute("POST /v1/embed/token",   (req, ctx) => handleIssueEmbedToken(req, ctx)),
  compileRoute("GET /v1/embed/scopes",   (req, ctx) => handleListEmbedScopes(req, ctx)),
  // Tenant Pricing API (API 14)
  compileRoute("POST /v1/tenant/rules",            (req, ctx)    => handleCreateRule(req, ctx)),
  compileRoute("GET /v1/tenant/rules",             (req, ctx)    => handleListRulesTenant(req, ctx)),
  compileRoute("POST /v1/tenant/prices",           (req, ctx)    => handleTenantPrice(req, ctx)),
  compileRoute("POST /v1/tenant/events",           (req, ctx)    => handleCreateEvent(req, ctx)),
  compileRoute("GET /v1/tenant/violations",        (req, ctx)    => handleListViolations(req, ctx)),
  compileRoute("GET /v1/tenant/status/{tenant_id}", (req, ctx, p) => handleTenantStatus(req, ctx, p.tenant_id)),
];

// Returns true if a real (non-mock) handler exists for the given method+path.
// Replaces the previous Set-based lookup so dynamic routes (with {id}) work.
export const V1_HANDLER_KEYS = {
  has(key: string): boolean {
    const [method, path] = key.split(" ");
    return V1_ROUTES.some((r) => r.key.startsWith(`${method} `) && r.pattern.test(path));
  },
};

export async function dispatchV1Handler(
  method: string,
  path: string,
  request: Request,
  ctx: V1Context,
): Promise<V1Result | null> {
  for (const route of V1_ROUTES) {
    if (!route.key.startsWith(`${method} `)) continue;
    if (!route.pattern.test(path)) continue;
    return route.handler(request, ctx, {});
  }
  return null;
}
