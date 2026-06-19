// Pricing engine: turns live competitor scrape data into pricing
// recommendations.
//
// Inputs (per user):
//   - competitor_product_urls   — canonical product list with competitor + URL
//   - competitor_scrapes        — scrape history; uses latest success per URL
//   - catalog_prices            — merchant's own prices (fallback self-price)
//   - roi_model_categories      — elasticity, AOV, daily orders, margin
//   - pricing_rules             — structured JSON rules (see pricing-rules.ts)
//
// Output:
//   - pricing_recommendations rows with source='computed'
//   - source='seed' rows are wiped once at least one computed row is written
//
// Self-price resolution order (per product):
//   1. competitor_product_urls row where competitor='self' → latest scrape
//   2. catalog_prices for the user's default account (joined via product name)
//   3. Skip with logged reason if neither source is available
//
// This module does NOT import auth — callers control scope via the client
// (admin client for cron, RLS client for user-triggered paths).

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createNotification } from "./notifications";
import {
  evaluateRules,
  parseRuleRow,
  type RuleContext,
  type RuleEffect,
  type StructuredRule,
} from "./pricing-rules";
import { landedCost as computeLandedCost, type ChannelCosts } from "./margin";

const SELF_COMPETITOR_LABEL = "self";
const FRESH_WINDOW_DAYS = 14;
const MIN_GAP_PCT = 0.02;
const MIN_COMPETITORS_FOR_REC = 1;

type ScrapeRow = {
  url: string;
  product: string | null;
  competitor: string | null;
  price: number | null;
  scraped_at: string;
};

type UrlRow = {
  product: string;
  competitor: string;
  category: string | null;
  url: string;
};

type RoiCategoryRow = {
  category: string;
  elasticity: number;
  baseline_daily_orders: number;
  avg_order_value: number;
  base_margin: number;
};

type RuleRow = {
  id: string;
  rule_text: string;
  rule_type: string | null;
  params: unknown;
  enabled: boolean;
  position: number;
};

export type ComputedRecommendation = {
  user_id: string;
  product: string;
  category: string;
  channel: "Online" | "In-Store";
  current_price: number;
  recommended_price: number;
  reason: string;
  unit_impact: string;
  margin_impact: string;
  net_monthly: string;
  confidence: number;
  position: number;
  source: "computed";
};

export type ProductDiagnostic = {
  product: string;
  selfPriceSource: "self_url_scrape" | "catalog_prices" | null;
  selfPrice: number | null;
  competitorMin: number | null;
  competitorPricesByName: Record<string, number>;
  rawRecommendation: number | null;
  ruleEffects: RuleEffect[];
  finalRecommendation: number | null;
  skipped: boolean;
  skipReason: string | null;
};

export type EngineResult = {
  userId: string;
  written: number;
  skipped: number;
  reasons: string[];
  diagnostics: ProductDiagnostic[];
  seedsWiped: number;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function formatPrice(n: number): number {
  if (n >= 100) return Math.round(n);
  return Math.round(n * 100) / 100;
}

function formatNetMonthly(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}QAR ${(abs / 1000).toFixed(1)}K`;
  return `${sign}QAR ${Math.round(abs)}`;
}

function pickRoi(
  categories: RoiCategoryRow[],
  productCategory: string | null,
): RoiCategoryRow {
  if (productCategory) {
    const exact = categories.find(
      (c) => c.category.toLowerCase() === productCategory.toLowerCase(),
    );
    if (exact) return exact;
  }
  return (
    categories.find((c) => c.category.toLowerCase() === "electronics") ?? {
      category: "Default",
      elasticity: 1.5,
      baseline_daily_orders: 200,
      avg_order_value: 300,
      base_margin: 0.2,
    }
  );
}

function computeConfidence(
  competitorCount: number,
  freshestDaysAgo: number,
  gapPct: number,
): number {
  const sourceScore = Math.min(competitorCount, 4) * 10;
  const recencyScore = freshestDaysAgo <= 1 ? 15 : freshestDaysAgo <= 7 ? 8 : 0;
  const gapScore = Math.min(Math.max(gapPct, 0), 0.1) * 150;
  const raw = 30 + sourceScore + recencyScore + gapScore;
  return Math.max(50, Math.min(95, Math.round(raw)));
}

type ComputeInput = {
  userId: string;
  urls: UrlRow[];
  scrapes: ScrapeRow[];
  roiCategories: RoiCategoryRow[];
  rules: StructuredRule[];
  /** product_name.toLowerCase() → merchant self-price (catalog_prices fallback) */
  catalogPrices: Map<string, number>;
  /** product_name.toLowerCase() → unit_cost (for nominal_floor_qar rules) */
  unitCostByProduct: Map<string, number>;
  /** product_name.toLowerCase() → landed cost (unit_cost + freight + duty) */
  landedCostByProduct: Map<string, number>;
  /** channel name (lowercase) → channel selling cost structure */
  channelCostByChannel: Map<string, ChannelCosts>;
};

/**
 * Core compute step — pure function over pre-fetched rows. Exported for tests.
 */
export function computeRecommendations(input: ComputeInput): {
  recs: ComputedRecommendation[];
  reasons: string[];
  diagnostics: ProductDiagnostic[];
} {
  const { userId, urls, scrapes, roiCategories, rules, catalogPrices, unitCostByProduct, landedCostByProduct, channelCostByChannel } = input;
  const reasons: string[] = [];
  const diagnostics: ProductDiagnostic[] = [];

  // Latest successful scrape per URL (most recent first in query, so first seen wins).
  const latestByUrl = new Map<string, ScrapeRow>();
  for (const s of scrapes) {
    if (s.price === null || s.price <= 0) continue;
    if (daysAgo(s.scraped_at) > FRESH_WINDOW_DAYS) continue;
    if (!latestByUrl.has(s.url)) latestByUrl.set(s.url, s);
  }

  // Group URLs by product.
  const urlsByProduct = new Map<string, UrlRow[]>();
  for (const u of urls) {
    const list = urlsByProduct.get(u.product) ?? [];
    list.push(u);
    urlsByProduct.set(u.product, list);
  }

  const recs: ComputedRecommendation[] = [];
  let position = 0;

  for (const [product, productUrls] of urlsByProduct) {
    const diag: ProductDiagnostic = {
      product,
      selfPriceSource: null,
      selfPrice: null,
      competitorMin: null,
      competitorPricesByName: {},
      rawRecommendation: null,
      ruleEffects: [],
      finalRecommendation: null,
      skipped: false,
      skipReason: null,
    };

    // ── Self-price resolution ────────────────────────────────────────────────
    // Order: (a) competitor='self' scrape → (b) catalog_prices fallback
    let currentPrice: number | null = null;

    const selfUrl = productUrls.find(
      (u) => u.competitor.toLowerCase() === SELF_COMPETITOR_LABEL,
    );
    if (selfUrl) {
      const selfScrape = latestByUrl.get(selfUrl.url);
      if (selfScrape && selfScrape.price !== null) {
        currentPrice = selfScrape.price;
        diag.selfPriceSource = "self_url_scrape";
      }
    }

    if (currentPrice === null) {
      const catalogPrice = catalogPrices.get(product.toLowerCase());
      if (catalogPrice !== undefined) {
        currentPrice = catalogPrice;
        diag.selfPriceSource = "catalog_prices";
      }
    }

    if (currentPrice === null) {
      const msg = selfUrl
        ? `${product}: self URL configured but no fresh scrape and no catalog_prices entry — skipped`
        : `${product}: no competitor='self' URL and no catalog_prices entry — skipped`;
      reasons.push(msg);
      diag.skipped = true;
      diag.skipReason = msg;
      diagnostics.push(diag);
      continue;
    }
    diag.selfPrice = currentPrice;

    // ── Competitor prices ────────────────────────────────────────────────────
    const competitorScrapes: {
      competitor: string;
      price: number;
      scraped_at: string;
    }[] = [];
    for (const u of productUrls) {
      if (u.competitor.toLowerCase() === SELF_COMPETITOR_LABEL) continue;
      const s = latestByUrl.get(u.url);
      if (!s || s.price === null) continue;
      competitorScrapes.push({
        competitor: u.competitor,
        price: s.price,
        scraped_at: s.scraped_at,
      });
    }

    if (competitorScrapes.length < MIN_COMPETITORS_FOR_REC) {
      const msg = `${product}: no fresh competitor scrapes — skipped`;
      reasons.push(msg);
      diag.skipped = true;
      diag.skipReason = msg;
      diagnostics.push(diag);
      continue;
    }

    const competitorPriceValues = competitorScrapes.map((c) => c.price);
    const medianCompetitor = median(competitorPriceValues);
    const minCompetitor = Math.min(...competitorPriceValues);
    const gapPct = (currentPrice - medianCompetitor) / currentPrice;

    diag.competitorMin = minCompetitor;
    for (const cs of competitorScrapes) {
      diag.competitorPricesByName[cs.competitor] = cs.price;
    }

    if (gapPct < MIN_GAP_PCT) {
      const msg = `${product}: already at or below median (gap ${(gapPct * 100).toFixed(1)}%) — no rec`;
      reasons.push(msg);
      diag.skipped = true;
      diag.skipReason = msg;
      diagnostics.push(diag);
      continue;
    }

    // ── Initial candidate ────────────────────────────────────────────────────
    const category = selfUrl?.category ?? "";
    const roi = pickRoi(roiCategories, category || null);
    let recommendedPrice = formatPrice(medianCompetitor);
    diag.rawRecommendation = recommendedPrice;

    // ── Rule evaluation (shared evaluator) ──────────────────────────────────
    const competitorPricesMap = new Map<string, number>();
    for (const cs of competitorScrapes) {
      competitorPricesMap.set(cs.competitor.toLowerCase(), cs.price);
    }
    const unitCost = unitCostByProduct.get(product.toLowerCase()) ?? null;
    const landedCost = landedCostByProduct.get(product.toLowerCase()) ?? null;
    const channelCosts = channelCostByChannel.get("online") ?? null;

    const ctx: RuleContext = {
      currentPrice,
      competitorMin: minCompetitor,
      competitorPrices: competitorPricesMap,
      unitCost,
      landedCost,
      channelCosts,
      category,
    };

    const { finalPrice, effects } = evaluateRules(recommendedPrice, ctx, rules);
    recommendedPrice = formatPrice(finalPrice);
    diag.ruleEffects = effects;

    const clampedByRule = effects.some((e) => e.clamped);
    if (clampedByRule) {
      const clampedEffects = effects.filter((e) => e.clamped);
      reasons.push(
        `${product}: price adjusted by rule(s): ${clampedEffects.map((e) => e.ruleText).join("; ")}`,
      );
    }

    // ── ROI projection ───────────────────────────────────────────────────────
    const priceDeltaPct = (recommendedPrice - currentPrice) / currentPrice;
    const unitDeltaPct = -roi.elasticity * priceDeltaPct;
    const newUnits = roi.baseline_daily_orders * (1 + unitDeltaPct);
    const oldRevenue = roi.baseline_daily_orders * currentPrice;
    const newRevenue = newUnits * recommendedPrice;
    const oldMargin = oldRevenue * roi.base_margin;
    const newMargin = newRevenue * roi.base_margin;
    const netMonthly = (newMargin - oldMargin) * 30;

    const freshest = Math.min(...competitorScrapes.map((c) => daysAgo(c.scraped_at)));
    const confidence = computeConfidence(
      competitorScrapes.length,
      freshest,
      Math.abs(gapPct),
    );

    const competitorList = competitorScrapes
      .map((c) => c.competitor)
      .slice(0, 3)
      .join(", ");

    const selfSourceNote =
      diag.selfPriceSource === "catalog_prices"
        ? " (self-price from catalog_prices)"
        : "";

    const reason =
      `${competitorScrapes.length} competitor${competitorScrapes.length === 1 ? "" : "s"} ` +
      `(${competitorList}) median QAR ${medianCompetitor.toFixed(2)}, ` +
      `lowest QAR ${minCompetitor.toFixed(2)}. ` +
      `You're ${(gapPct * 100).toFixed(1)}% above median${selfSourceNote}. ` +
      `Matching the median should lift units ~${(unitDeltaPct * 100).toFixed(1)}% based on category elasticity.`;

    diag.finalRecommendation = recommendedPrice;
    diagnostics.push(diag);

    recs.push({
      user_id: userId,
      product,
      category: category || roi.category,
      channel: "Online",
      current_price: currentPrice,
      recommended_price: recommendedPrice,
      reason,
      unit_impact:
        unitDeltaPct >= 0
          ? `+${(unitDeltaPct * 100).toFixed(0)}%`
          : `${(unitDeltaPct * 100).toFixed(0)}%`,
      margin_impact: `${priceDeltaPct >= 0 ? "+" : ""}${(priceDeltaPct * 100).toFixed(1)}% price`,
      net_monthly: formatNetMonthly(netMonthly),
      confidence,
      position: position++,
      source: "computed",
    });
  }

  return { recs, reasons, diagnostics };
}

/**
 * Run the engine for a single user. Reads from Supabase via the supplied
 * client. Writes computed recs and wipes seed rows on first successful write.
 */
export async function runPricingEngineForUser(
  supabase: SupabaseClient,
  userId: string,
  triggerType: string = "cron",
): Promise<EngineResult> {
  // 1. Resolve the user's default account for catalog_prices lookup.
  const { data: accountRows } = await (supabase as any).rpc(
    "current_account_for_user",
    { _user_id: userId },
  );
  const accountId: string | null = (accountRows as any)?.[0]?.account_id ?? null;

  // 2. Load all inputs in parallel.
  const [urlsRes, scrapesRes, roiRes, rulesRes] = await Promise.all([
    (supabase.from("competitor_product_urls") as any)
      .select("product, competitor, category, url")
      .eq("user_id", userId),
    (supabase.from("competitor_scrapes") as any)
      .select("url, product, competitor, price, scraped_at")
      .eq("user_id", userId)
      .eq("status", "success")
      .order("scraped_at", { ascending: false })
      .limit(2000),
    (supabase.from("roi_model_categories") as any)
      .select("category, elasticity, baseline_daily_orders, avg_order_value, base_margin")
      .eq("user_id", userId),
    (supabase.from("pricing_rules") as any)
      .select("id, rule_text, rule_type, params, enabled, position")
      .eq("user_id", userId)
      .eq("enabled", true)
      .order("position"),
  ]);

  if (urlsRes.error) throw urlsRes.error;
  if (scrapesRes.error) throw scrapesRes.error;
  if (roiRes.error) throw roiRes.error;
  if (rulesRes.error) throw rulesRes.error;

  // 3. Fetch catalog_prices for self-price fallback (scoped to account).
  const catalogPrices = new Map<string, number>();
  if (accountId) {
    const { data: catalogRows } = await (supabase as any)
      .from("catalog_prices")
      .select("list_price, sale_price, catalog_products(name)")
      .eq("account_id", accountId);

    for (const row of (catalogRows ?? []) as any[]) {
      const name: string | undefined = row.catalog_products?.name;
      if (!name) continue;
      const price = Number(row.sale_price ?? row.list_price);
      if (price > 0) catalogPrices.set(name.toLowerCase(), price);
    }
  }

  // 4. Fetch unit costs + landed costs.
  const unitCostByProduct = new Map<string, number>();
  const landedCostByProduct = new Map<string, number>();
  if (accountId) {
    const { data: marginRows } = await (supabase as any)
      .from("margin_inputs")
      .select("unit_cost, freight, duty_pct, catalog_products(name)")
      .eq("account_id", accountId);
    for (const row of (marginRows ?? []) as any[]) {
      const name: string | undefined = row.catalog_products?.name;
      if (!name) continue;
      const uc = Number(row.unit_cost);
      const fr = Number(row.freight ?? 0);
      const dp = Number(row.duty_pct ?? 0);
      if (uc > 0) {
        unitCostByProduct.set(name.toLowerCase(), uc);
        landedCostByProduct.set(name.toLowerCase(), computeLandedCost({ unit_cost: uc, freight: fr, duty_pct: dp }));
      }
    }
  }

  // 5. Fetch channel cost structures.
  const channelCostByChannel = new Map<string, ChannelCosts>();
  if (accountId) {
    const { data: chanRows } = await (supabase as any)
      .from("channel_cost_structures")
      .select("channel, commission_pct, delivery_cost, payment_pct, returns_provision")
      .eq("account_id", accountId);
    for (const row of (chanRows ?? []) as any[]) {
      channelCostByChannel.set(row.channel.toLowerCase(), {
        commission_pct: Number(row.commission_pct),
        delivery_cost: Number(row.delivery_cost),
        payment_pct: Number(row.payment_pct),
        returns_provision: Number(row.returns_provision),
      });
    }
  }

  const urls = (urlsRes.data ?? []) as UrlRow[];
  const scrapes = (scrapesRes.data ?? []) as ScrapeRow[];
  const roiCategories = (roiRes.data ?? []) as RoiCategoryRow[];
  const rules = ((rulesRes.data ?? []) as RuleRow[]).map(parseRuleRow);

  const { recs, reasons, diagnostics } = computeRecommendations({
    userId,
    urls,
    scrapes,
    roiCategories,
    rules,
    catalogPrices,
    unitCostByProduct,
    landedCostByProduct,
    channelCostByChannel,
  });

  let written = 0;
  let seedsWiped = 0;

  if (recs.length > 0) {
    const { error: upsertErr } = await (supabase.from("pricing_recommendations") as any)
      .upsert(recs, { onConflict: "user_id,product,channel,source" });

    if (upsertErr) {
      console.error("pricing-engine upsert failed", upsertErr);
      throw upsertErr;
    }
    written = recs.length;

    const { error: delErr, count } = await (supabase
      .from("pricing_recommendations") as any)
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("source", "seed");
    if (delErr) {
      console.error("pricing-engine seed wipe failed", delErr);
    } else {
      seedsWiped = count ?? 0;
    }

    // Write immutable audit records to pricing_decisions for every recommendation.
    const diagByProduct = new Map<string, ProductDiagnostic>();
    for (const d of diagnostics) diagByProduct.set(d.product.toLowerCase(), d);

    const auditRows = recs.map((rec) => {
      const diag = diagByProduct.get(rec.product.toLowerCase());
      const clampedEffects = (diag?.ruleEffects ?? []).filter((e) => e.clamped);
      const firstClamped = clampedEffects[0] ?? null;

      const competitorPrices = diag?.competitorPricesByName ?? {};
      const rawMedian = diag?.rawRecommendation ?? null;

      const alternatives: { label: string; price: number; description: string }[] = [];
      if (rawMedian != null) {
        const n = Object.keys(competitorPrices).length;
        const compList = Object.entries(competitorPrices)
          .map(([k, v]) => `${k} QAR ${v}`)
          .join(", ");
        alternatives.push({
          label: "competitor_median",
          price: rawMedian,
          description: `Median of ${n} competitor price${n === 1 ? "" : "s"}: ${compList}`,
        });
      }
      for (const effect of diag?.ruleEffects ?? []) {
        if (effect.clamped) {
          alternatives.push({
            label: effect.ruleType,
            price: effect.priceOut,
            description: effect.reason,
          });
        }
      }

      const pk = rec.product.toLowerCase();
      const costSnap: Record<string, unknown> = {};
      const uc = unitCostByProduct.get(pk);
      const lc = landedCostByProduct.get(pk);
      const ch = channelCostByChannel.get("online");
      if (uc != null) costSnap.unit_cost = uc;
      if (lc != null) costSnap.landed_cost = lc;
      if (ch) {
        costSnap.channel = "Online";
        costSnap.commission_pct = ch.commission_pct;
        costSnap.delivery_cost = ch.delivery_cost;
        costSnap.payment_pct = ch.payment_pct;
        costSnap.returns_provision = ch.returns_provision;
      }

      return {
        user_id: rec.user_id,
        recommendation_id: null,
        product: rec.product,
        category: rec.category,
        channel: rec.channel,
        current_price: rec.current_price,
        recommended_price: rec.recommended_price,
        expected_net_monthly: rec.net_monthly,
        decision: "engine_rec" as const,
        source: "pricing_engine",
        trigger_type: triggerType,
        inputs_snapshot: {
          self_price: diag?.selfPrice ?? null,
          self_price_source: diag?.selfPriceSource ?? null,
          competitor_prices: competitorPrices,
          median_competitor: rawMedian,
          min_competitor: diag?.competitorMin ?? null,
          gap_pct:
            diag?.selfPrice && rawMedian
              ? +((diag.selfPrice - rawMedian) / diag.selfPrice).toFixed(4)
              : null,
        },
        alternatives,
        rule_fired: firstClamped?.ruleType ?? null,
        rule_reason: firstClamped?.reason ?? null,
        cost_snapshot: costSnap,
      };
    });

    const { error: auditErr } = await (supabaseAdmin as any)
      .from("pricing_decisions")
      .insert(auditRows);
    if (auditErr) {
      // Non-fatal: audit failure must not block the engine
      console.error("pricing-engine audit write failed:", auditErr.message);
    }
  }

  if (written > 0) {
    void createNotification({
      userId,
      category: "pricing",
      severity: "info",
      title: `${written} new pricing recommendation${written === 1 ? "" : "s"}`,
      body: `Refreshed from latest competitor scrapes. Review and approve.`,
      linkTo: "/dashboard/pricing",
      dedupeKey: `pricing:${new Date().toISOString().slice(0, 10)}`,
      dedupeWindowMinutes: 360,
      metadata: { written, seedsWiped },
    });
  }

  return {
    userId,
    written,
    skipped: reasons.length,
    reasons,
    diagnostics,
    seedsWiped,
  };
}
