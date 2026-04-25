// Shared Firecrawl scrape + persist logic. Used by both the manual
// `scrapeCompetitorUrl` server function (per-user, RLS client) and the
// `/hooks/scrape-all` cron route (admin client, iterates every saved URL).
//
// Retries: each scrape attempts the Firecrawl call up to MAX_ATTEMPTS times
// (initial + retries) with exponential backoff. Only the final outcome is
// written to competitor_scrapes - intermediate failures are logged but not
// persisted, so the UI doesn't flap between error/success rows.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "./notifications";

const PriceSchema = {
  type: "object",
  properties: {
    price: { type: "number", description: "Numeric product price, no currency symbol" },
    currency: { type: "string", description: "ISO currency code or symbol shown on the page" },
  },
  required: ["price"],
} as const;

const MAX_ATTEMPTS = 3; // 1 initial + 2 retries
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

export type ScrapeOutcome =
  | { ok: true; url: string; price: number | null; currency: string | null }
  | { ok: false; url: string; error: string };

type AttemptSuccess = {
  ok: true;
  price: number;
  currency: string | null;
  markdown: string | null;
  metadata: Record<string, unknown>;
};

type AttemptFailure = {
  ok: false;
  error: string;
  // Whether retrying is likely to help. 4xx (except 408/429) is permanent.
  retryable: boolean;
  // Optional partial payload to persist if this is the final attempt.
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
            prompt: "Extract the product price and currency from this page.",
          },
        ],
        onlyMainContent: true,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return { ok: false, error: message, retryable: true };
  }

  if (!fcRes.ok) {
    const text = await fcRes.text().catch(() => "");
    console.error("Firecrawl HTTP error", fcRes.status, text);
    // 5xx, 408, 429 are worth retrying. Other 4xx (auth, bad URL) are not.
    const retryable = fcRes.status >= 500 || fcRes.status === 408 || fcRes.status === 429;
    return {
      ok: false,
      error: `Firecrawl ${fcRes.status}: ${text.slice(0, 500)}`,
      retryable,
    };
  }

  let payload: FirecrawlScrapeResponse;
  try {
    payload = (await fcRes.json()) as FirecrawlScrapeResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON from Firecrawl";
    return { ok: false, error: message, retryable: true };
  }

  const markdown = payload.data?.markdown ?? null;
  const extracted = payload.data?.json ?? {};
  const metadata = payload.data?.metadata ?? {};
  const rawPrice = typeof extracted.price === "number" ? extracted.price : null;
  const currency = extracted.currency ?? null;

  // Guard: Firecrawl sometimes returns price=0 when it can't actually find a
  // product price on the page (e.g. category/listing pages instead of a PDP).
  // Treat that as a failed extraction. Retrying usually doesn't help here
  // because the page itself doesn't expose a price - mark as non-retryable.
  if (rawPrice === null || rawPrice <= 0) {
    const reason =
      rawPrice === null
        ? "Firecrawl did not return a numeric price"
        : "Firecrawl returned price=0 (likely not a product detail page)";
    return {
      ok: false,
      error: reason,
      retryable: false,
      partial: { markdown, metadata, currency },
    };
  }

  return { ok: true, price: rawPrice, currency, markdown, metadata };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function runScrape(
  supabase: SupabaseClient,
  job: ScrapeJob,
): Promise<ScrapeOutcome> {
  const apiKey = process.env.FIRECRAWL_API_KEY_1;
  if (!apiKey) {
    return { ok: false, url: job.url, error: "FIRECRAWL_API_KEY_1 is not configured" };
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
        console.error("Failed to persist scrape", error);
        return { ok: false, url: job.url, error: "Failed to save scrape result" };
      }

      if (attempt > 1) {
        console.log(`scrape succeeded for ${job.url} on attempt ${attempt}/${MAX_ATTEMPTS}`);
      }
      return { ok: true, url: job.url, price: result.price, currency: result.currency };
    }

    lastFailure = result;
    console.warn(
      `scrape attempt ${attempt}/${MAX_ATTEMPTS} failed for ${job.url}: ${result.error} (retryable=${result.retryable})`,
    );

    // Stop early if the failure isn't worth retrying, or we're out of attempts.
    if (!result.retryable || attempt === MAX_ATTEMPTS) break;

    // Exponential backoff: 1.5s, 3s, ...
    await sleep(RETRY_BASE_MS * attempt);
  }

  const failure = lastFailure ?? {
    ok: false as const,
    error: "Unknown scrape failure",
    retryable: false,
  };

  await (supabase.from("competitor_scrapes") as any).insert({
    user_id: job.userId,
    url: job.url,
    competitor: job.competitor ?? null,
    product: job.product ?? null,
    price: null,
    currency: failure.partial?.currency ?? null,
    markdown: failure.partial?.markdown ?? null,
    metadata: failure.partial?.metadata ?? {},
    status: "error",
    error: `${failure.error} (after ${MAX_ATTEMPTS} attempts)`,
  });

  void createNotification({
    userId: job.userId,
    category: "scrape_failure",
    severity: "warning",
    title: `Competitor scrape failed`,
    body: `${job.competitor ?? "Competitor"} — ${job.product ?? job.url}: ${failure.error}`,
    linkTo: "/dashboard/competitors",
    dedupeKey: `scrape:${job.url}`,
    metadata: { url: job.url, competitor: job.competitor, product: job.product },
  });

  return { ok: false, url: job.url, error: failure.error };
}
