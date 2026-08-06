// Server function: scrape a single competitor product URL with Firecrawl
// (markdown + structured price extraction) and persist the result so the UI
// can render a Live data badge keyed off the latest scrape per URL.
//
// Shared scrape/persist logic lives in `./scrape-runner` so the cron hook
// (`/hooks/scrape-all`) can reuse it without duplicating Firecrawl glue.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { runScrape } from './scrape-runner';

const InputSchema = z.object({
  url: z.string().url().max(2048),
  competitor: z.string().min(1).max(120).optional(),
  product: z.string().min(1).max(240).optional(),
  channel: z.string().min(1).max(80).default('online'),
  matchConfidence: z.number().min(0).max(1).optional(),
});

export const scrapeCompetitorUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const result = await runScrape(supabase, {
      userId,
      url: data.url,
      product: data.product,
      competitor: data.competitor,
      channel: data.channel,
      matchConfidence: data.matchConfidence,
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return {
      ok: true as const,
      scrape: { url: result.url, price: result.price, currency: result.currency },
    };
  });

// Returns the latest scrape per URL for the current user. Used by the
// Competitors page to decide which rows show a "Live" pill and to compute
// the page-level "Live data: N products" header pill.
export const listLatestScrapes = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await (supabase.from('competitor_scrapes') as any)
      .select('id, url, competitor, product, channel, price, currency, availability, evidence, status, scraped_at')
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
