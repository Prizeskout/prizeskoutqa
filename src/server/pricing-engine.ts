// Pricing engine: turns live competitor scrape data into pricing
// recommendations.
//
// Inputs (per user):
//   - competitor_product_urls   - the canonical product list, with competitor + URL
//   - competitor_scrapes        - all scrape attempts; we use the latest success per URL
//   - roi_model_categories      - elasticity, AOV, daily orders, margin per category
//   - pricing_rules             - free-text rules (best-effort filtering)
//
// Output:
//   - pricing_recommendations rows with source='computed'
//   - any source='seed' rows are wiped for that user once we write at least one computed row
//
// Design notes:
//   - The user's own price is provided via a `competitor_product_urls` row where
//     `competitor='self'`. We scrape it on the same cron and treat that scrape
//     as YOUR price for that product.
//   - Confidence reflects evidence quality: # distinct competitors with fresh
//     prices, recency of those scrapes, and how big the gap is (bigger gap +
//     more sources = higher confidence). Capped 50-95.
//   - We only generate a recommendation if the median competitor price is
//     meaningfully BELOW your current price (>=2% gap). Matching/beating
//     median means no action needed.
//   - This module takes a SupabaseClient so callers control auth (admin
//     client for cron, RLS client for the user-triggered server function).
//
// IMPORTANT: This module does NOT import auth - it's a pure compute layer.
// Callers must pass a client already scoped to the right user_id either via
// RLS (per-user) or via explicit .eq('user_id', uid) filters (admin path).

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "./notifications";

const SELF_COMPETITOR_LABEL = "self";
const FRESH_WINDOW_DAYS = 14;
const MIN_GAP_PCT = 0.02; // 2% - smaller gaps aren't worth flagging
const MIN_COMPETITORS_FOR_REC = 1; // need at least 1 fresh competitor scrape

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

type RuleRow = { rule_text: string; enabled: boolean };

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

export type EngineResult = {
  userId: string;
  written: number;
  skipped: number;
  reasons: string[]; // per-product diagnostic notes (debug aid)
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
  // Round to nearest 1 unit if >=100, else 2 decimals.
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
  // Sensible defaults if no category match - use Electronics-ish numbers.
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

/**
 * Hard rule filter. We only enforce a margin floor: never recommend a price
 * below (current_price * (1 - base_margin)). Free-text rules are not parsed -
 * the floor is the only programmatic guardrail. Future: structured rules.
 */
function passesRules(
  recommendedPrice: number,
  currentPrice: number,
  baseMargin: number,
  rules: RuleRow[],
): { ok: boolean; reason?: string } {
  const floor = currentPrice * (1 - baseMargin);
  if (recommendedPrice < floor) {
    return {
      ok: false,
      reason: `Recommended price ${recommendedPrice.toFixed(2)} below margin floor ${floor.toFixed(2)}`,
    };
  }

  // Best-effort: if any enabled rule contains "never below cost" / "floor",
  // we already enforce that above. Other rules pass through unchecked.
  void rules;
  return { ok: true };
}

/**
 * Compute confidence (50-95) from evidence quality.
 *   - +10 per distinct competitor up to 4 (so 4 competitors = +40)
 *   - +0 if scrapes are >7d old, +15 if all <=24h
 *   - +0..15 based on gap size (capped at 10% gap = +15)
 */
function computeConfidence(
  competitorCount: number,
  freshestDaysAgo: number,
  gapPct: number,
): number {
  const sourceScore = Math.min(competitorCount, 4) * 10;
  const recencyScore = freshestDaysAgo <= 1 ? 15 : freshestDaysAgo <= 7 ? 8 : 0;
  const gapScore = Math.min(Math.max(gapPct, 0), 0.1) * 150; // 0.1 -> 15
  const raw = 30 + sourceScore + recencyScore + gapScore;
  return Math.max(50, Math.min(95, Math.round(raw)));
}

/**
 * Core compute step - pure function over fetched rows. Exported for tests.
 */
export function computeRecommendations(
  userId: string,
  urls: UrlRow[],
  scrapes: ScrapeRow[],
  roiCategories: RoiCategoryRow[],
  rules: RuleRow[],
): { recs: ComputedRecommendation[]; reasons: string[] } {
  const reasons: string[] = [];

  // Index latest successful scrape per URL.
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
    // Find YOUR price (competitor='self').
    const selfUrl = productUrls.find(
      (u) => u.competitor.toLowerCase() === SELF_COMPETITOR_LABEL,
    );
    if (!selfUrl) {
      reasons.push(`${product}: no 'self' URL configured - skipped`);
      continue;
    }
    const selfScrape = latestByUrl.get(selfUrl.url);
    if (!selfScrape || selfScrape.price === null) {
      reasons.push(`${product}: no fresh self scrape - skipped`);
      continue;
    }
    const currentPrice = selfScrape.price;

    // Competitor prices.
    const competitorScrapes: { competitor: string; price: number; scraped_at: string }[] = [];
    for (const u of productUrls) {
      if (u.competitor.toLowerCase() === SELF_COMPETITOR_LABEL) continue;
      const s = latestByUrl.get(u.url);
      if (!s || s.price === null) continue;
      competitorScrapes.push({ competitor: u.competitor, price: s.price, scraped_at: s.scraped_at });
    }

    if (competitorScrapes.length < MIN_COMPETITORS_FOR_REC) {
      reasons.push(`${product}: no fresh competitor scrapes - skipped`);
      continue;
    }

    const competitorPrices = competitorScrapes.map((c) => c.price);
    const medianCompetitor = median(competitorPrices);
    const minCompetitor = Math.min(...competitorPrices);
    const gapPct = (currentPrice - medianCompetitor) / currentPrice;

    if (gapPct < MIN_GAP_PCT) {
      reasons.push(
        `${product}: already at or below median (gap ${(gapPct * 100).toFixed(1)}%) - no rec`,
      );
      continue;
    }

    // Recommended = match median (a defensible, conservative move).
    let recommendedPrice = formatPrice(medianCompetitor);
    const category = selfUrl.category ?? competitorScrapes[0] ? selfUrl.category ?? "" : "";
    const roi = pickRoi(roiCategories, category || null);

    const ruleCheck = passesRules(recommendedPrice, currentPrice, roi.base_margin, rules);
    if (!ruleCheck.ok) {
      // Clamp to the floor instead of skipping outright.
      const floor = currentPrice * (1 - roi.base_margin);
      recommendedPrice = formatPrice(floor);
      reasons.push(`${product}: clamped to margin floor (${ruleCheck.reason})`);
    }

    // Project impact using elasticity.
    const priceDeltaPct = (recommendedPrice - currentPrice) / currentPrice; // negative = price drop
    const unitDeltaPct = -roi.elasticity * priceDeltaPct; // price down -> units up
    const newUnits = roi.baseline_daily_orders * (1 + unitDeltaPct);
    const oldRevenue = roi.baseline_daily_orders * currentPrice;
    const newRevenue = newUnits * recommendedPrice;
    const oldMargin = oldRevenue * roi.base_margin;
    const newMargin = newRevenue * roi.base_margin;
    const netMonthly = (newMargin - oldMargin) * 30;

    const freshest = Math.min(...competitorScrapes.map((c) => daysAgo(c.scraped_at)));
    const confidence = computeConfidence(competitorScrapes.length, freshest, Math.abs(gapPct));

    const competitorList = competitorScrapes
      .map((c) => c.competitor)
      .slice(0, 3)
      .join(", ");
    const reason =
      `${competitorScrapes.length} competitor${competitorScrapes.length === 1 ? "" : "s"} ` +
      `(${competitorList}) median QAR ${medianCompetitor.toFixed(2)}, ` +
      `lowest QAR ${minCompetitor.toFixed(2)}. ` +
      `You're ${(gapPct * 100).toFixed(1)}% above median. ` +
      `Matching the median should lift units ~${(unitDeltaPct * 100).toFixed(1)}% based on category elasticity.`;

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

  return { recs, reasons };
}

/**
 * Run the engine for a single user. Reads from Supabase via the supplied
 * client (admin or per-user). Writes computed recs and wipes seed rows on
 * first successful computed write.
 */
export async function runPricingEngineForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<EngineResult> {
  // 1. Load inputs in parallel.
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
      .select("rule_text, enabled")
      .eq("user_id", userId)
      .eq("enabled", true),
  ]);

  if (urlsRes.error) throw urlsRes.error;
  if (scrapesRes.error) throw scrapesRes.error;
  if (roiRes.error) throw roiRes.error;
  if (rulesRes.error) throw rulesRes.error;

  const urls = (urlsRes.data ?? []) as UrlRow[];
  const scrapes = (scrapesRes.data ?? []) as ScrapeRow[];
  const roiCategories = (roiRes.data ?? []) as RoiCategoryRow[];
  const rules = (rulesRes.data ?? []) as RuleRow[];

  const { recs, reasons } = computeRecommendations(userId, urls, scrapes, roiCategories, rules);

  let written = 0;
  let seedsWiped = 0;

  if (recs.length > 0) {
    // Upsert each computed rec on (user_id, product, channel, source) so
    // re-running the engine refreshes prices in place rather than duplicating.
    const { error: upsertErr } = await (supabase.from("pricing_recommendations") as any)
      .upsert(recs, { onConflict: "user_id,product,channel,source" });

    if (upsertErr) {
      console.error("pricing-engine upsert failed", upsertErr);
      throw upsertErr;
    }
    written = recs.length;

    // First-real-rec policy: once we have computed rows, wipe seed rows for
    // this user so the UI never mixes demo + real data.
    const { error: delErr, count } = await (supabase.from("pricing_recommendations") as any)
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("source", "seed");
    if (delErr) {
      console.error("pricing-engine seed wipe failed", delErr);
    } else {
      seedsWiped = count ?? 0;
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
    seedsWiped,
  };
}
