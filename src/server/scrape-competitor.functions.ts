// Server function: scrape a single competitor product URL with Firecrawl
// (markdown + structured price extraction) and persist the result so the UI
// can render a Live data badge keyed off the latest scrape per URL.
//
// IMPORTANT: We call the Firecrawl REST API directly with `fetch` instead of
// using the `@mendable/firecrawl-js` SDK. The SDK depends on `axios`, which
// uses Node's `http` internals and is not compatible with the Cloudflare
// Worker SSR runtime — it causes the server function to 500 before reaching
// our handler. `fetch` is Worker-native.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const InputSchema = z.object({
  url: z.string().url().max(2048),
  competitor: z.string().min(1).max(120).optional(),
  product: z.string().min(1).max(240).optional(),
});

const PriceSchema = {
  type: 'object',
  properties: {
    price: { type: 'number', description: 'Numeric product price, no currency symbol' },
    currency: { type: 'string', description: 'ISO currency code or symbol shown on the page' },
  },
  required: ['price'],
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

export const scrapeCompetitorUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY_1;
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY_1 missing in env');
      return { ok: false as const, error: 'FIRECRAWL_API_KEY_1 is not configured' };
    }

    const { supabase, userId } = context;

    try {
      const fcRes = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: data.url,
          formats: [
            'markdown',
            {
              type: 'json',
              schema: PriceSchema,
              prompt: 'Extract the product price and currency from this page.',
            },
          ],
          onlyMainContent: true,
        }),
      });

      if (!fcRes.ok) {
        const text = await fcRes.text();
        console.error('Firecrawl HTTP error', fcRes.status, text);
        await (supabase.from('competitor_scrapes') as any).insert({
          user_id: userId,
          url: data.url,
          competitor: data.competitor ?? null,
          product: data.product ?? null,
          status: 'error',
          error: `Firecrawl ${fcRes.status}: ${text.slice(0, 500)}`,
        });
        return { ok: false as const, error: `Firecrawl returned ${fcRes.status}` };
      }

      const payload = (await fcRes.json()) as FirecrawlScrapeResponse;
      const markdown = payload.data?.markdown ?? null;
      const extracted = payload.data?.json ?? {};
      const metadata = payload.data?.metadata ?? {};

      const { data: row, error } = await (supabase.from('competitor_scrapes') as any)
        .insert({
          user_id: userId,
          url: data.url,
          competitor: data.competitor ?? null,
          product: data.product ?? null,
          price: typeof extracted.price === 'number' ? extracted.price : null,
          currency: extracted.currency ?? null,
          markdown,
          metadata,
          status: 'success',
        })
        .select('id, url, price, currency, scraped_at')
        .single();

      if (error) {
        console.error('Failed to persist scrape', error);
        return { ok: false as const, error: 'Failed to save scrape result' };
      }

      return { ok: true as const, scrape: row };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown scrape error';
      console.error('Scrape handler threw', message);

      await (supabase.from('competitor_scrapes') as any).insert({
        user_id: userId,
        url: data.url,
        competitor: data.competitor ?? null,
        product: data.product ?? null,
        status: 'error',
        error: message,
      });

      return { ok: false as const, error: message };
    }
  });

// Returns the latest scrape per URL for the current user. Used by the
// Competitors page to decide which rows show a "Live" pill and to compute
// the page-level "Live data: N products" header pill.
export const listLatestScrapes = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await (supabase.from('competitor_scrapes') as any)
      .select('id, url, competitor, product, price, currency, status, scraped_at')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('scraped_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Failed to load scrapes', error);
      return { scrapes: [], error: error.message };
    }

    type Row = { id: string; url: string; competitor: string | null; product: string | null; price: number | null; currency: string | null; status: string; scraped_at: string };
    const rows: Row[] = (data ?? []) as Row[];
    const latest = new Map<string, Row>();
    for (const row of rows) {
      if (!latest.has(row.url)) latest.set(row.url, row);
    }
    return { scrapes: Array.from(latest.values()), error: null };
  });
