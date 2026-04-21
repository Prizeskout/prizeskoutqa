// Shared Firecrawl scrape + persist logic. Used by both the manual
// `scrapeCompetitorUrl` server function (per-user, RLS client) and the
// `/hooks/scrape-all` cron route (admin client, iterates every saved URL).

import type { SupabaseClient } from "@supabase/supabase-js";

const PriceSchema = {
  type: "object",
  properties: {
    price: { type: "number", description: "Numeric product price, no currency symbol" },
    currency: { type: "string", description: "ISO currency code or symbol shown on the page" },
  },
  required: ["price"],
} as const;

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

export async function runScrape(
  supabase: SupabaseClient,
  job: ScrapeJob,
): Promise<ScrapeOutcome> {
  const apiKey = process.env.FIRECRAWL_API_KEY_1;
  if (!apiKey) {
    return { ok: false, url: job.url, error: "FIRECRAWL_API_KEY_1 is not configured" };
  }

  try {
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: job.url,
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

    if (!fcRes.ok) {
      const text = await fcRes.text();
      console.error("Firecrawl HTTP error", fcRes.status, text);
      await (supabase.from("competitor_scrapes") as any).insert({
        user_id: job.userId,
        url: job.url,
        competitor: job.competitor ?? null,
        product: job.product ?? null,
        status: "error",
        error: `Firecrawl ${fcRes.status}: ${text.slice(0, 500)}`,
      });
      return { ok: false, url: job.url, error: `Firecrawl returned ${fcRes.status}` };
    }

    const payload = (await fcRes.json()) as FirecrawlScrapeResponse;
    const markdown = payload.data?.markdown ?? null;
    const extracted = payload.data?.json ?? {};
    const metadata = payload.data?.metadata ?? {};
    const price = typeof extracted.price === "number" ? extracted.price : null;
    const currency = extracted.currency ?? null;

    const { error } = await (supabase.from("competitor_scrapes") as any).insert({
      user_id: job.userId,
      url: job.url,
      competitor: job.competitor ?? null,
      product: job.product ?? null,
      price,
      currency,
      markdown,
      metadata,
      status: "success",
    });

    if (error) {
      console.error("Failed to persist scrape", error);
      return { ok: false, url: job.url, error: "Failed to save scrape result" };
    }

    return { ok: true, url: job.url, price, currency };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scrape error";
    console.error("Scrape handler threw", message);
    await (supabase.from("competitor_scrapes") as any).insert({
      user_id: job.userId,
      url: job.url,
      competitor: job.competitor ?? null,
      product: job.product ?? null,
      status: "error",
      error: message,
    });
    return { ok: false, url: job.url, error: message };
  }
}
