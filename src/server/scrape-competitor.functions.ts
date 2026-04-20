// Server function: scrape a single competitor product URL with Firecrawl
// (markdown + structured price extraction) and persist the result so the UI
// can render a Live data badge keyed off the latest scrape per URL.
//
// Auth: requireSupabaseAuth gives us an RLS-scoped supabase client + userId.
// Secret: FIRECRAWL_API_KEY_1 (the Qatar key) — never exposed to the client.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import Firecrawl from '@mendable/firecrawl-js';
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

type ScrapeJson = { price?: number; currency?: string };

export const scrapeCompetitorUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY_1;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY_1 is not configured');
    }

    const { supabase, userId } = context;
    const firecrawl = new Firecrawl({ apiKey });

    try {
      const result = await firecrawl.scrape(data.url, {
        formats: [
          'markdown',
          { type: 'json', schema: PriceSchema, prompt: 'Extract the product price and currency from this page.' },
        ],
        onlyMainContent: true,
      });

      // SDK v2 returns fields on the result object; fall back to .data shape just in case.
      const r = result as unknown as {
        markdown?: string;
        json?: ScrapeJson;
        metadata?: Record<string, unknown>;
        data?: { markdown?: string; json?: ScrapeJson; metadata?: Record<string, unknown> };
      };
      const markdown = r.markdown ?? r.data?.markdown ?? null;
      const extracted = r.json ?? r.data?.json ?? {};
      const metadata = r.metadata ?? r.data?.metadata ?? {};

      const { data: row, error } = await supabase
        .from('competitor_scrapes')
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
      console.error('Firecrawl scrape failed', message);

      await supabase.from('competitor_scrapes').insert({
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

    const { data, error } = await supabase
      .from('competitor_scrapes')
      .select('id, url, competitor, product, price, currency, status, scraped_at')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('scraped_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Failed to load scrapes', error);
      return { scrapes: [], error: error.message };
    }

    // Dedupe to latest per URL.
    const latest = new Map<string, (typeof data)[number]>();
    for (const row of data ?? []) {
      if (!latest.has(row.url)) latest.set(row.url, row);
    }
    return { scrapes: Array.from(latest.values()), error: null };
  });
