// ============================================================================
// Cross-Border Price Parity handlers — /v1/parity/*  (API 15)
//
// Endpoints:
//   GET  /v1/parity/analysis   — per-country floors + recommended prices + rule checks
//   POST /v1/parity/rules      — create a parity rule (source ↔ target country band)
//   GET  /v1/parity/violations — list detected violations (append-only audit)
//   GET  /v1/parity/report     — summary: rules + violation counts + grey market signals
//
// Floor formula (per country, reuses API 07 margin.ts formulas):
//   landed_qar     = unit_cost + freight + unit_cost × country.default_import_duty_pct
//                    + country.logistics_cost_qar
//   landed_local   = landed_qar × fx_rate_qar_to_local
//   ch_local       = { same commission/payment %, delivery/returns converted by fx_rate }
//   pre_vat_floor  = minViablePrice(landed_local, ch_local, min_margin_pct)
//   consumer_floor = round2(pre_vat_floor × (1 + vat_pct))
//
// FX:
//   Live from Frankfurter (ECB data, base=USD, cached 4h in fx_rates_cache).
//   Fallback USD pegs used if Frankfurter unreachable.
//   QAR_to_X = usd_to_X / usd_to_QAR
//
// Grey market detection:
//   Compares competitor_prices platform prices (in QAR) against the QA recommended
//   price. If any platform < recommended_qa × (1 − threshold) → grey_market violation.
//
// Scopes: parity:read | read | admin (for GET); parity:write | write | admin (for POST)
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  landedCost as computeLandedCost,
  minViablePrice,
  r2,
  type ChannelCosts,
} from "./margin";
import { enqueueWebhookEvent } from "@/server/webhook-delivery";
import type { V1Context, V1Result } from "./v1-handlers";

// ─── Scope helpers ────────────────────────────────────────────────────────────

function canParityWrite(ctx: V1Context): boolean {
  return ctx.scopes.includes("parity:write") || ctx.scopes.includes("write") || ctx.scopes.includes("admin");
}
function canParityRead(ctx: V1Context): boolean {
  return ctx.scopes.includes("parity:read") || canParityWrite(ctx);
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

// ─── FX: fallback USD pegs (GCC fixed / managed pegs as of 2026) ─────────────

const FALLBACK_USD_PEGS: Record<string, number> = {
  QAR: 3.6400,   // Qatar Riyal — pegged to USD since 1980
  AED: 3.6725,   // UAE Dirham — pegged since 1997
  SAR: 3.7500,   // Saudi Riyal — pegged since 1986
  KWD: 0.3075,   // Kuwaiti Dinar — pegged to currency basket (approx)
  BHD: 0.3760,   // Bahraini Dinar — pegged since 1980
  OMR: 0.3845,   // Omani Rial — pegged since 1986
};

type FxSnapshot = {
  rates_qar_base: Record<string, number>;  // QAR → each currency
  fetched_at: string;
  source: "live" | "cache" | "fallback";
  source_url?: string;
  fallback_reason?: string;  // set when source=fallback; exposes the fetch error
};

async function fetchFxRates(): Promise<FxSnapshot> {
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - FOUR_HOURS_MS).toISOString();

  // 1. Check cache
  const { data: cached } = await supabaseAdmin
    .from("fx_rates_cache")
    .select("rates, fetched_at, source_url")
    .gte("fetched_at", cutoff)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return {
      rates_qar_base: cached.rates as Record<string, number>,
      fetched_at: cached.fetched_at,
      source: "cache",
    };
  }

  // 2. Live fetch from Frankfurter
  const symbols = ["AED", "SAR", "KWD", "BHD", "OMR", "QAR"].join(",");
  const sourceUrl = `https://api.frankfurter.app/latest?from=USD&symbols=${symbols}`;

  let fallbackReason: string | undefined;
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const usdRates = data.rates ?? {};

      // Need QAR as the base: QAR_to_X = usdRates[X] / usdRates['QAR']
      const usdQar = usdRates["QAR"] ?? FALLBACK_USD_PEGS["QAR"];
      const rates: Record<string, number> = {};
      for (const [cc, usdRate] of Object.entries(usdRates)) {
        rates[cc] = r2(usdRate / usdQar * 10000) / 10000;  // 6 sig figs
      }
      // QAR → QAR is always 1
      rates["QAR"] = 1.0;

      const fetched_at = new Date().toISOString();
      await supabaseAdmin
        .from("fx_rates_cache")
        .insert({ base: "QAR", rates, source_url: sourceUrl, fetched_at });

      return { rates_qar_base: rates, fetched_at, source: "live", source_url: sourceUrl };
    } else {
      fallbackReason = `HTTP ${res.status} ${res.statusText} from ${sourceUrl}`;
    }
  } catch (e: unknown) {
    fallbackReason = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // 3. Fallback to pegs
  const qar = FALLBACK_USD_PEGS["QAR"];
  const rates: Record<string, number> = {};
  for (const [cc, usdRate] of Object.entries(FALLBACK_USD_PEGS)) {
    rates[cc] = cc === "QAR" ? 1.0 : r2(usdRate / qar * 10000) / 10000;
  }
  return {
    rates_qar_base: rates,
    fetched_at: new Date().toISOString(),
    source: "fallback",
    fallback_reason: fallbackReason,
  };
}

// ─── Country config type ──────────────────────────────────────────────────────

type CountryConfig = {
  country_code: string;
  country_name: string;
  currency_code: string;
  vat_pct: number;
  default_import_duty_pct: number;
  logistics_cost_qar: number;
};

// ─── Per-country floor computation ───────────────────────────────────────────

function computeCountryFloor(
  unitCost: number,
  freight: number,
  channel: ChannelCosts,
  country: CountryConfig,
  fxRate: number,         // QAR → country currency
  minMarginPct: number,
): {
  landed_qar: number;
  landed_local: number;
  pre_vat_floor_local: number;
  consumer_floor_local: number;
  consumer_floor_qar: number;
} {
  // Destination-country landed cost in QAR
  const landed_qar = r2(
    unitCost + freight + unitCost * country.default_import_duty_pct + country.logistics_cost_qar,
  );

  // Convert to local currency
  const landed_local = r2(landed_qar * fxRate);

  // Scale fixed channel costs by FX; keep % costs as-is
  const ch_local: ChannelCosts = {
    commission_pct:    channel.commission_pct,
    delivery_cost:     r2(channel.delivery_cost * fxRate),
    payment_pct:       channel.payment_pct,
    returns_provision: r2(channel.returns_provision * fxRate),
  };

  const pre_vat_floor_local  = r2(minViablePrice(landed_local, ch_local, minMarginPct));
  const consumer_floor_local = r2(pre_vat_floor_local * (1 + country.vat_pct));
  const consumer_floor_qar   = fxRate > 0 ? r2(consumer_floor_local / fxRate) : consumer_floor_local;

  return { landed_qar, landed_local, pre_vat_floor_local, consumer_floor_local, consumer_floor_qar };
}

// ============================================================================
// GET /v1/parity/analysis
// ============================================================================
//
// Query params:
//   sku             required
//   channel         optional (default: "Online")
//   min_margin_pct  optional float (default: 0.05)
//   countries       optional comma-separated ISO codes (default: all GCC)
//   persist_violations  optional "true" (default: "true")
//
// Returns:
//   sku, channel, fx_snapshot, countries[{...floor, recommended, violations}],
//   active_parity_rules[{...}], grey_market_signals[{...}]
// ============================================================================

export async function handleParityAnalysis(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canParityRead(ctx)) return err("forbidden", "Requires parity:read scope.", 403);

  const url = new URL(req.url);
  const sku           = url.searchParams.get("sku")?.trim();
  const channel       = url.searchParams.get("channel")?.trim() ?? "Online";
  const minMarginPct  = parseFloat(url.searchParams.get("min_margin_pct") ?? "0.05");
  const countriesParam = url.searchParams.get("countries");
  const persistViol   = url.searchParams.get("persist_violations") !== "false";

  if (!sku) return err("missing_sku", "Query param 'sku' is required.", 400);
  if (isNaN(minMarginPct) || minMarginPct < 0 || minMarginPct >= 1)
    return err("invalid_min_margin_pct", "min_margin_pct must be a number in [0, 1).", 400);

  // ── Resolve catalog product ───────────────────────────────────────────────
  const { data: catalogProduct } = await supabaseAdmin
    .from("catalog_products")
    .select("id, name")
    .eq("account_id", ctx.accountId)
    .eq("sku", sku)
    .maybeSingle();

  if (!catalogProduct)
    return err("product_not_found", `SKU '${sku}' not found. POST /v1/sync first.`, 404);

  // ── Margin inputs ─────────────────────────────────────────────────────────
  const { data: inputs } = await supabaseAdmin
    .from("margin_inputs")
    .select("unit_cost, freight, duty_pct")
    .eq("product_id", catalogProduct.id)
    .maybeSingle();

  if (!inputs)
    return err(
      "no_margin_inputs",
      "No margin inputs found for this SKU. POST /v1/margin/costs first.",
      422,
    );

  const unitCost = Number(inputs.unit_cost);
  const freight  = Number(inputs.freight);

  // ── Channel cost structure ────────────────────────────────────────────────
  const { data: chData } = await supabaseAdmin
    .from("channel_cost_structures")
    .select("commission_pct, delivery_cost, payment_pct, returns_provision")
    .eq("account_id", ctx.accountId)
    .ilike("channel", channel)
    .maybeSingle();

  const zeroChannel: ChannelCosts = { commission_pct: 0, delivery_cost: 0, payment_pct: 0, returns_provision: 0 };
  const channelCosts: ChannelCosts = chData
    ? {
        commission_pct:    Number(chData.commission_pct),
        delivery_cost:     Number(chData.delivery_cost),
        payment_pct:       Number(chData.payment_pct),
        returns_provision: Number(chData.returns_provision),
      }
    : zeroChannel;

  // ── Qatar catalog price (QAR, excl. VAT) ─────────────────────────────────
  const { data: catPrice } = await supabaseAdmin
    .from("catalog_prices")
    .select("list_price, sale_price")
    .eq("product_id", catalogProduct.id)
    .eq("channel", channel)
    .maybeSingle();

  const catalogPriceQar: number | null = catPrice
    ? Number(catPrice.sale_price ?? catPrice.list_price)
    : null;

  // ── GCC country configs ───────────────────────────────────────────────────
  const requestedCountries = countriesParam
    ? countriesParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
    : ["QA", "AE", "SA", "KW", "BH", "OM"];

  const { data: countryRows } = await supabaseAdmin
    .from("gcc_country_configs")
    .select("country_code, country_name, currency_code, vat_pct, default_import_duty_pct, logistics_cost_qar")
    .in("country_code", requestedCountries);

  if (!countryRows?.length)
    return err("no_country_configs", "No GCC country configs found. Run the parity migration.", 503);

  const countryMap = new Map<string, CountryConfig>(
    countryRows.map((r) => [
      r.country_code,
      {
        country_code:           r.country_code,
        country_name:           r.country_name,
        currency_code:          r.currency_code,
        vat_pct:                Number(r.vat_pct),
        default_import_duty_pct: Number(r.default_import_duty_pct),
        logistics_cost_qar:     Number(r.logistics_cost_qar),
      },
    ]),
  );

  // ── FX rates ──────────────────────────────────────────────────────────────
  const fx = await fetchFxRates();

  // ── Parity rules for this account ────────────────────────────────────────
  const { data: ruleRows } = await supabaseAdmin
    .from("parity_rules")
    .select("id, name, source_country, target_country, sku, min_ratio, max_ratio, grey_market_threshold_pct, enabled")
    .eq("account_id", ctx.accountId)
    .eq("enabled", true);

  const applicableRules = (ruleRows ?? []).filter(
    (r) => !r.sku || r.sku === sku,
  );

  // ── Grey market data from competitor_prices ───────────────────────────────
  const { data: compPrices } = await supabaseAdmin
    .from("competitor_prices")
    .select("product, your_price, talabat, carrefour, lulu, amazon, noon, signal, position")
    .eq("user_id", ctx.userId)
    .ilike("product", `%${sku}%`)
    .limit(5);

  const compRow = compPrices?.[0] ?? null;

  // ── Per-country computation ───────────────────────────────────────────────
  type CountryResult = {
    country_code: string;
    country_name: string;
    currency_code: string;
    vat_pct: number;
    fx_rate_qar_to_local: number;
    landed_cost_qar: number;
    landed_cost_local: number;
    consumer_floor_local: number;
    consumer_floor_qar: number;
    recommended_local: number;         // consumer-facing incl. VAT
    recommended_qar: number;           // VAT-inclusive converted back to QAR (display only)
    parity_qar: number;                // ex-VAT QAR equivalent — used for all ratio/grey-market maths
    catalog_price_local: number | null;
    floor_clamped: boolean;
    parity_rule_violations: Array<{
      rule_id: string;
      rule_name: string;
      violation_type: string;
      actual_ratio: number;
      min_ratio: number;
      max_ratio: number;
    }>;
  };

  const countryResults: CountryResult[] = [];

  for (const cc of requestedCountries) {
    const country = countryMap.get(cc);
    if (!country) continue;

    const fxRate = fx.rates_qar_base[cc] ?? fx.rates_qar_base[country.currency_code] ?? 1.0;

    const { landed_qar, landed_local, pre_vat_floor_local, consumer_floor_local, consumer_floor_qar } =
      computeCountryFloor(unitCost, freight, channelCosts, country, fxRate, minMarginPct);

    // Catalog price in local currency (incl. VAT)
    const catalog_price_local: number | null = catalogPriceQar != null
      ? r2(catalogPriceQar * fxRate * (1 + country.vat_pct))
      : null;

    // Recommended price: catalog (incl. VAT) or floor, whichever is higher
    let recommended_local = catalog_price_local != null
      ? Math.max(consumer_floor_local, catalog_price_local)
      : consumer_floor_local;
    recommended_local = r2(recommended_local);

    const floor_clamped = catalog_price_local != null && catalog_price_local < consumer_floor_local;
    // VAT-inclusive back-conversion (display only)
    const recommended_qar = fxRate > 0 ? r2(recommended_local / fxRate) : recommended_local;
    // Ex-VAT QAR equivalent: strip VAT then convert — used for all parity / grey-market maths
    const parity_qar = fxRate > 0
      ? r2(recommended_local / (1 + country.vat_pct) / fxRate)
      : r2(recommended_local / (1 + country.vat_pct));

    countryResults.push({
      country_code: cc,
      country_name: country.country_name,
      currency_code: country.currency_code,
      vat_pct: country.vat_pct,
      fx_rate_qar_to_local: fxRate,
      landed_cost_qar: landed_qar,
      landed_cost_local: landed_local,
      consumer_floor_local,
      consumer_floor_qar,
      recommended_local,
      recommended_qar,
      parity_qar,
      catalog_price_local,
      floor_clamped,
      parity_rule_violations: [],
    });
  }

  // ── Parity rule violation check ───────────────────────────────────────────
  const violationsToInsert: Array<Record<string, unknown>> = [];

  for (const rule of applicableRules) {
    const sourceResult = countryResults.find((c) => c.country_code === rule.source_country);
    const targetResult = countryResults.find((c) => c.country_code === rule.target_country);
    if (!sourceResult || !targetResult) continue;

    // Use ex-VAT QAR equivalents so VAT differences never drive a false violation
    const sourceParityQar = sourceResult.parity_qar;
    const targetParityQar = targetResult.parity_qar;

    if (sourceParityQar <= 0) continue;

    const actual_ratio = r2(targetParityQar / sourceParityQar * 10000) / 10000;
    const min_ratio = Number(rule.min_ratio);
    const max_ratio = Number(rule.max_ratio);

    const violationType: "below_min" | "above_max" | null =
      actual_ratio < min_ratio ? "below_min"
      : actual_ratio > max_ratio ? "above_max"
      : null;

    if (violationType) {
      const violation = {
        rule_id: rule.id,
        rule_name: rule.name,
        violation_type: violationType,
        actual_ratio,
        min_ratio,
        max_ratio,
      };
      targetResult.parity_rule_violations.push(violation);

      if (persistViol) {
        violationsToInsert.push({
          account_id: ctx.accountId,
          sku,
          rule_id: rule.id,
          rule_name: rule.name,
          source_country: rule.source_country,
          target_country: rule.target_country,
          source_price_qar: sourceParityQar,
          target_price_qar: targetParityQar,
          actual_ratio,
          min_ratio,
          max_ratio,
          violation_type: violationType,
          evidence: { channel, min_margin_pct: minMarginPct, fx_source: fx.source, basis: "ex_vat" },
        });
      }
    }
  }

  // ── Grey market signals ───────────────────────────────────────────────────
  type GreyMarketSignal = {
    platform: string;
    platform_price_qar: number;
    recommended_qa_qar: number;
    pct_below: number;
    threshold_pct: number;
    flagged: boolean;
  };

  const greyMarketSignals: GreyMarketSignal[] = [];
  const qaResult = countryResults.find((c) => c.country_code === "QA");
  const recommendedQaQar = qaResult?.recommended_qar ?? catalogPriceQar;

  if (compRow && recommendedQaQar) {
    const PLATFORMS: [string, keyof typeof compRow][] = [
      ["Talabat", "talabat"],
      ["Carrefour", "carrefour"],
      ["Lulu", "lulu"],
      ["Amazon", "amazon"],
      ["Noon", "noon"],
    ];

    // Use the grey_market_threshold from the first applicable rule, or 12% default
    const defaultThreshold = 0.12;
    const greyThreshold = applicableRules.length > 0
      ? Number(applicableRules[0].grey_market_threshold_pct)
      : defaultThreshold;

    for (const [platformName, key] of PLATFORMS) {
      const rawPrice = (compRow as Record<string, unknown>)[key];
      if (rawPrice == null) continue;
      const platformPriceQar = Number(rawPrice);
      if (!isFinite(platformPriceQar) || platformPriceQar <= 0) continue;

      const pctBelow = r2((recommendedQaQar - platformPriceQar) / recommendedQaQar);
      const flagged = pctBelow >= greyThreshold;
      greyMarketSignals.push({
        platform:            platformName,
        platform_price_qar:  platformPriceQar,
        recommended_qa_qar:  recommendedQaQar,
        pct_below:           pctBelow,
        threshold_pct:       greyThreshold,
        flagged,
      });

      if (flagged && persistViol) {
        violationsToInsert.push({
          account_id: ctx.accountId,
          sku,
          rule_id: null,
          rule_name: `grey_market:${platformName.toLowerCase()}`,
          source_country: "QA",
          target_country: "QA",
          source_price_qar: recommendedQaQar,
          target_price_qar: platformPriceQar,
          actual_ratio: r2(platformPriceQar / recommendedQaQar * 10000) / 10000,
          min_ratio: 1 - greyThreshold,
          max_ratio: 1.0,
          violation_type: "grey_market",
          evidence: { platform: platformName, channel, fx_source: fx.source },
        });
      }
    }
  }

  // ── Persist violations ────────────────────────────────────────────────────
  if (persistViol && violationsToInsert.length > 0) {
    await (supabaseAdmin.from("parity_violations") as any).insert(violationsToInsert);

    // Emit one webhook if any violations found
    try {
      await enqueueWebhookEvent({
        userId: ctx.userId,
        eventType: "parity.violations_detected",
        payload: { sku, channel, violation_count: violationsToInsert.length },
      });
    } catch { /* non-fatal */ }
  }

  return ok({
    sku,
    channel,
    min_margin_pct: minMarginPct,
    fx_snapshot: {
      base: "QAR",
      rates: fx.rates_qar_base,
      fetched_at: fx.fetched_at,
      source: fx.source,
      ...(fx.fallback_reason ? { fallback_reason: fx.fallback_reason } : {}),
    },
    countries: countryResults,
    active_parity_rules: applicableRules.map((r) => ({
      id: r.id,
      name: r.name,
      source_country: r.source_country,
      target_country: r.target_country,
      sku: r.sku,
      min_ratio: Number(r.min_ratio),
      max_ratio: Number(r.max_ratio),
    })),
    grey_market_signals: greyMarketSignals,
    violations_persisted: persistViol ? violationsToInsert.length : 0,
  });
}

// ============================================================================
// POST /v1/parity/rules
// ============================================================================
//
// Body:
//   name                     required text
//   source_country           required ISO code (e.g. "QA")
//   target_country           required ISO code (e.g. "AE")
//   sku                      optional — omit to apply to all SKUs
//   min_ratio                optional float (default 0.90)
//   max_ratio                optional float (default 1.15)
//   grey_market_threshold_pct optional float (default 0.12)
// ============================================================================

export async function handleCreateParityRule(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canParityWrite(ctx)) return err("forbidden", "Requires parity:write scope.", 403);

  const body = await readJson(req);
  if (!body) return err("invalid_json", "Request body must be a JSON object.", 400);

  const name            = (body.name as string | undefined)?.trim();
  const source_country  = (body.source_country as string | undefined)?.trim().toUpperCase();
  const target_country  = (body.target_country as string | undefined)?.trim().toUpperCase();
  const sku             = (body.sku as string | undefined)?.trim() || null;
  const min_ratio       = body.min_ratio != null ? Number(body.min_ratio) : 0.90;
  const max_ratio       = body.max_ratio != null ? Number(body.max_ratio) : 1.15;
  const grey_threshold  = body.grey_market_threshold_pct != null
    ? Number(body.grey_market_threshold_pct) : 0.12;

  if (!name)           return err("missing_name", "'name' is required.", 400);
  if (!source_country) return err("missing_source_country", "'source_country' is required.", 400);
  if (!target_country) return err("missing_target_country", "'target_country' is required.", 400);
  if (source_country === target_country)
    return err("same_country", "source_country and target_country must differ.", 400);
  if (isNaN(min_ratio) || min_ratio <= 0)
    return err("invalid_min_ratio", "min_ratio must be > 0.", 400);
  if (isNaN(max_ratio) || max_ratio <= min_ratio)
    return err("invalid_max_ratio", "max_ratio must be > min_ratio.", 400);
  if (isNaN(grey_threshold) || grey_threshold < 0 || grey_threshold >= 1)
    return err("invalid_grey_market_threshold_pct", "grey_market_threshold_pct must be in [0, 1).", 400);

  // Validate country codes
  const { data: validCountries } = await supabaseAdmin
    .from("gcc_country_configs")
    .select("country_code")
    .in("country_code", [source_country, target_country]);

  const validCodes = new Set((validCountries ?? []).map((r) => r.country_code));
  if (!validCodes.has(source_country))
    return err("invalid_source_country", `'${source_country}' is not a supported GCC country code.`, 400);
  if (!validCodes.has(target_country))
    return err("invalid_target_country", `'${target_country}' is not a supported GCC country code.`, 400);

  const { data: rule, error } = await supabaseAdmin
    .from("parity_rules")
    .insert({
      account_id: ctx.accountId,
      licensee_id: ctx.licenseeId,
      name,
      source_country,
      target_country,
      sku,
      min_ratio,
      max_ratio,
      grey_market_threshold_pct: grey_threshold,
      enabled: true,
    })
    .select()
    .single();

  if (error) return err("db_error", error.message, 500);

  return ok(rule, 201);
}

// ============================================================================
// GET /v1/parity/violations
// ============================================================================
//
// Query params:
//   sku     optional filter
//   country optional filter on source_country or target_country
//   type    optional: below_min | above_max | grey_market
//   limit   int (default 50, max 200)
//   after   ISO datetime for pagination
// ============================================================================

export async function handleListParityViolations(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canParityRead(ctx)) return err("forbidden", "Requires parity:read scope.", 403);

  const url    = new URL(req.url);
  const sku    = url.searchParams.get("sku")?.trim();
  const type   = url.searchParams.get("type")?.trim();
  const after  = url.searchParams.get("after")?.trim();
  const limit  = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  let q = supabaseAdmin
    .from("parity_violations")
    .select("id, sku, rule_name, source_country, target_country, actual_ratio, min_ratio, max_ratio, violation_type, evidence, created_at")
    .eq("account_id", ctx.accountId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sku)   q = q.eq("sku", sku);
  if (type)  q = q.eq("violation_type", type);
  if (after) q = q.lt("created_at", after);

  const { data, error } = await q;
  if (error) return err("db_error", error.message, 500);

  return ok({ data: data ?? [], count: (data ?? []).length });
}

// ============================================================================
// GET /v1/parity/report
// ============================================================================
//
// Returns a summary view combining:
//   - All active parity rules
//   - Recent violation counts per rule (last 24h / 7d)
//   - Grey market signals from competitor_prices
//   - Supported country list with currency + VAT
//
// Query params: sku (optional filter)
// ============================================================================

export async function handleParityReport(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canParityRead(ctx)) return err("forbidden", "Requires parity:read scope.", 403);

  const url = new URL(req.url);
  const sku = url.searchParams.get("sku")?.trim();

  const [countriesResult, rulesResult, recentViols, oldViols] = await Promise.all([
    supabaseAdmin
      .from("gcc_country_configs")
      .select("country_code, country_name, currency_code, vat_pct, default_import_duty_pct, logistics_cost_qar")
      .order("country_code"),

    supabaseAdmin
      .from("parity_rules")
      .select("id, name, source_country, target_country, sku, min_ratio, max_ratio, grey_market_threshold_pct, enabled")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: false }),

    // Violations in last 24h
    supabaseAdmin
      .from("parity_violations")
      .select("rule_name, violation_type")
      .eq("account_id", ctx.accountId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

    // Violations in last 7d
    supabaseAdmin
      .from("parity_violations")
      .select("rule_name, violation_type")
      .eq("account_id", ctx.accountId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Violation counts per rule
  const count24h = new Map<string, number>();
  for (const v of recentViols.data ?? []) {
    const key = v.rule_name ?? "";
    count24h.set(key, (count24h.get(key) ?? 0) + 1);
  }
  const count7d = new Map<string, number>();
  for (const v of oldViols.data ?? []) {
    const key = v.rule_name ?? "";
    count7d.set(key, (count7d.get(key) ?? 0) + 1);
  }

  const rules = (rulesResult.data ?? [])
    .filter((r) => !sku || !r.sku || r.sku === sku)
    .map((r) => ({
      ...r,
      min_ratio: Number(r.min_ratio),
      max_ratio: Number(r.max_ratio),
      grey_market_threshold_pct: Number(r.grey_market_threshold_pct),
      violations_24h: count24h.get(r.name) ?? 0,
      violations_7d:  count7d.get(r.name) ?? 0,
    }));

  // Grey market from competitor_prices (aggregate signal counts)
  let compQuery = supabaseAdmin
    .from("competitor_prices")
    .select("product, your_price, talabat, carrefour, lulu, amazon, noon")
    .eq("user_id", ctx.userId);
  if (sku) compQuery = compQuery.ilike("product", `%${sku}%`);
  const { data: compRows } = await compQuery.limit(20);

  const greyViol24h = (recentViols.data ?? []).filter((v) => v.violation_type === "grey_market").length;

  return ok({
    generated_at: new Date().toISOString(),
    sku_filter: sku ?? null,
    supported_countries: (countriesResult.data ?? []).map((c) => ({
      country_code:           c.country_code,
      country_name:           c.country_name,
      currency_code:          c.currency_code,
      vat_pct:                Number(c.vat_pct),
      default_import_duty_pct: Number(c.default_import_duty_pct),
      logistics_cost_qar:     Number(c.logistics_cost_qar),
    })),
    active_rules_count: rules.filter((r) => r.enabled).length,
    rules,
    total_violations_24h: (recentViols.data ?? []).length,
    grey_market_violations_24h: greyViol24h,
    competitor_products_monitored: (compRows ?? []).length,
    note: "Run GET /v1/parity/analysis?sku=<sku> to compute live per-country floors and check rules.",
  });
}
