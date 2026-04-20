// Pulls the latest successful scrape per URL for the current user and exposes
// a Map keyed by lowercased product name so the Competitors page can render
// "Live" pills on rows backed by real scraped data.

import { useQuery } from "@tanstack/react-query";
import { listLatestScrapes } from "@/server/scrape-competitor.functions";

export type LiveScrape = {
  id: string;
  url: string;
  competitor: string | null;
  product: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  scraped_at: string;
};

export function useLiveScrapes() {
  return useQuery({
    queryKey: ["live-scrapes"],
    queryFn: async () => {
      const res = await listLatestScrapes();
      return (res.scrapes ?? []) as LiveScrape[];
    },
    staleTime: 60_000,
  });
}

export function indexScrapesByProduct(scrapes: LiveScrape[]): Map<string, LiveScrape> {
  const map = new Map<string, LiveScrape>();
  for (const s of scrapes) {
    if (s.product) map.set(s.product.toLowerCase().trim(), s);
  }
  return map;
}
