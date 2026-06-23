// Shared Firecrawl scrape + persist logic. Used by both the manual
// `scrapeCompetitorUrl` server function (per-user, RLS client) and the
// `/hooks/scrape-all` cron route (admin client, iterates every saved URL).
//
// Retry policy (per URL):
//   Network errors / 5xx / 429 / 408   → retry up to MAX_ATTEMPTS, exponential backoff
//   No extractable price (OOS / non-PDP) → status="null_price", NOT retried, NOT written to competitor_prices
//   Permanent 4xx (bad URL, auth)        → status="failed",     NOT retried
//
// Persisted status values:
//   "success"    — price extracted, bridge trigger writes to competitor_prices
//   "null_price" — page live but price absent (OOS / listing page / parse miss)
//                  NEVER writes a null/zero price to competitor_prices
//   "failed"     — network error, anti-bot block, API error, or unknown
//                  after all retry attempts
//
// The bridge trigger `trg_sync_scrape_to_competitor_prices` fires only on
// status="success" rows, so null_price and failed rows are safely ignored.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "./notifications";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeUrl } from "./url-normalize";

const PriceSchema = {
  type: "object",
  properties: {
    price: { type: "number", description: "Numeric product price, no currency symbol" },
    currency: { type: "string", description: "ISO currency code or symbol shown on the page" },
  },
  required: ["price"],
} as const;

// 1 initial attempt + 2 retries = 3 total.
// Retry only for transient errors; null_price / permanent 4xx abort after attempt 1.
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1500;

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    json?: { price?: number; currency?: string };
    metadata?: Record<string, unknown>;
  };
  error?: string;
};

export type ScrapeJob = {
  userId: string;
  url: string;
  product?: string | null;
  competitor?: string | null;
};

// Callers receive a typed outcome to power per-job coverage reporting.
export type ScrapeOutcome =
  | { ok: true;  url: string; price: number;      currency: string | null; status: "success" }
  | { ok: false; url: string; error: string;       status: "null_price" | "failed" };

export type AttemptSuccess = {
  ok: true;
  price: number;
  currency: string | null;
  markdown: string | null;
  metadata: Record<string, unknown>;
};

export type FailureCategory = "null_price" | "failed";

export type AttemptFailure = {
  ok: false;
  error: string;
  retryable: boolean;
  category: FailureCategory;
  partial?: {
    markdown: string | null;
    metadata: Record<string, unknown>;
    currency: string | null;
  };
};

async function attemptScrape(apiKey: string, url: string): Promise<AttemptSuccess | AttemptFailure> {
  let fcRes: Response;
  try {
    fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: [
          "markdown",
          {
            type: "json",
            schema: PriceSchema,
            prompt: "Extract the current sale/buy price and currency from this product detail page. Return null if no price is visible.",
          },
        ],
        onlyMainContent: true,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return { ok: false, error: message, retryable: true, category: "failed" };
  }

  if (!fcRes.ok) {
    const text = await fcRes.text().catch(() => "");
    console.error(`[scrape] Firecrawl HTTP ${fcRes.status} for ${url}`);
    const retryable = fcRes.status >= 500 || fcRes.status === 408 || fcRes.status === 429;
    return {
      ok: false,
      error: `Firecrawl HTTP ${fcRes.status}: ${text.slice(0, 300)}`,
      retryable,
      category: "failed",
    };
  }

  let payload: FirecrawlScrapeResponse;
  try {
    payload = (await fcRes.json()) as FirecrawlScrapeResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON from Firecrawl";
    return { ok: false, error: message, retryable: true, category: "failed" };
  }

  const markdown = payload.data?.markdown ?? null;
  const extracted = payload.data?.json ?? {};
  const metadata = payload.data?.metadata ?? {};
  const rawPrice = typeof extracted.price === "number" ? extracted.price : null;
  const currency = extracted.currency ?? null;

  // null / zero price = page is live but no price is extractable.
  // Reasons: OOS product, category listing page, bot-detection soft-block,
  // or Firecrawl's LLM couldn't locate a price number on the page.
  // Do NOT retry — the page itself doesn't have a usable price right now.
  // Persisted as status="null_price" so coverage reports can distinguish
  // this from a network/API failure.
  if (rawPrice === null || rawPrice <= 0) {
    const reason =
      rawPrice === null
        ? "No numeric price found on page (OOS, non-PDP, or bot-blocked)"
        : "Price extracted as 0 — likely a category/listing page, not a product detail page";
    return {
      ok: false,
      error: reason,
      retryable: false,
      category: "null_price",
      partial: { markdown, metadata, currency },
    };
  }

  return { ok: true, price: rawPrice, currency, markdown, metadata };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Firecrawl fetch with full retry logic — no DB writes.
// Used by the URL-centric scrape-all hook to decouple fetching from persistence.
export async function fetchCompetitorPrice(url: string): Promise<AttemptSuccess | AttemptFailure> {
  const apiKey = process.env.FIRECRAWL_API_KEY_1;
  if (!apiKey) {
    return { ok: false, error: "FIRECRAWL_API_KEY_1 not configured", retryable: false, category: "failed" };
  }
  let lastFailure: AttemptFailure | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await attemptScrape(apiKey, url);
    if (result.ok) return result;
    lastFailure = result;
    if (!result.retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(RETRY_BASE_MS * attempt);
  }
  return lastFailure ?? { ok: false, error: "Unknown scrape failure", retryable: false, category: "failed" };
}

export async function runScrape(
  supabase: SupabaseClient,
  job: ScrapeJob,
): Promise<ScrapeOutcome> {
  const apiKey = process.env.FIRECRAWL_API_KEY_1;
  if (!apiKey) {
    return { ok: false, url: job.url, error: "FIRECRAWL_API_KEY_1 is not configured", status: "failed" };
  }

  let lastFailure: AttemptFailure | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await attemptScrape(apiKey, job.url);

    if (result.ok) {
      const { error } = await (supabase.from("competitor_scrapes") as any).insert({
        user_id: job.userId,
        url: job.url,
        competitor: job.competitor ?? null,
        product: job.product ?? null,
        price: result.price,
        currency: result.currency,
        markdown: result.markdown,
        metadata: result.metadata,
        status: "success",
      });
      if (error) {
        console.error("[scrape] Failed to persist success row", error);
        return { ok: false, url: job.url, error: "Failed to save scrape result", status: "failed" };
      }
      if (attempt > 1) {
        console.log(`[scrape] Succeeded for ${job.competitor}/${job.product} on attempt ${attempt}`);
      }
      // Cache-miss path: keep the shared URL cache fresh even on manual scrapes.
      void (async () => {
        try {
          const normUrl = normalizeUrl(job.url);
          const { data: existing } = await (supabaseAdmin.from("competitor_url_cache") as any)
            .select("last_price, consecutive_unchanged")
            .eq("normalized_url", normUrl)
            .maybeSingle();
          const priceChanged = !existing || existing.last_price !== result.price;
          await (supabaseAdmin.from("competitor_url_cache") as any).upsert({
            normalized_url:        normUrl,
            raw_url_sample:        job.url,
            last_price:            result.price,
            currency:              result.currency,
            last_scraped_at:       new Date().toISOString(),
            last_status:           "ok",
            consecutive_unchanged: priceChanged ? 0 : (existing?.consecutive_unchanged ?? 0) + 1,
            updated_at:            new Date().toISOString(),
          }, { onConflict: "normalized_url" });
        } catch (cacheErr) {
          console.warn("[scrape] Cache update failed (non-fatal):", cacheErr);
        }
      })();
      return { ok: true, url: job.url, price: result.price, currency: result.currency, status: "success" };
    }

    lastFailure = result;
    console.warn(
      `[scrape] Attempt ${attempt}/${MAX_ATTEMPTS} for ${job.competitor}/${job.product}: ${result.error} (retryable=${result.retryable}, category=${result.category})`,
    );

    if (!result.retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(RETRY_BASE_MS * attempt);
  }

  const failure = lastFailure ?? { ok: false as const, error: "Unknown scrape failure", retryable: false, category: "failed" as FailureCategory };
  const persistStatus = failure.category; // "null_price" or "failed"

  const { error: insertErr } = await (supabase.from("competitor_scrapes") as any).insert({
    user_id: job.userId,
    url: job.url,
    competitor: job.competitor ?? null,
    product: job.product ?? null,
    price: null,                          // NEVER write null/zero price
    currency: failure.partial?.currency ?? null,
    markdown: failure.partial?.markdown ?? null,
    metadata: failure.partial?.metadata ?? {},
    status: persistStatus,
    error: failure.error,
  });
  if (insertErr) {
    console.error(`[scrape] Failed to persist ${persistStatus} row for ${job.url}:`, insertErr.message);
  }

  if (failure.category === "failed") {
    void createNotification({
      userId: job.userId,
      category: "scrape_failure",
      severity: "warning",
      title: "Competitor scrape failed",
      body: `${job.competitor ?? "Competitor"} — ${job.product ?? job.url}: ${failure.error}`,
      linkTo: "/dashboard/competitors",
      dedupeKey: `scrape:${job.url}`,
      metadata: { url: job.url, competitor: job.competitor, product: job.product },
    });
  } else {
    // null_price is informational — don't spam notifications for OOS items
    console.info(
      `[scrape] null_price for ${job.competitor}/${job.product}: ${failure.error}`,
    );
  }

  return { ok: false, url: job.url, error: failure.error, status: persistStatus };
}
