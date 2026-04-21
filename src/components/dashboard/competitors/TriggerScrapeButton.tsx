// Admin-only "Trigger scrape" button rendered next to each product row in the
// Competitors price table. Prompts for a URL (remembered in localStorage per
// product so admins don't have to re-enter), calls the scrapeCompetitorUrl
// server function, then invalidates the live-scrapes query so LIVE badges
// refresh in place.
//
// Visibility is gated by useIsAdmin — non-admins never see this button.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scrapeCompetitorUrl } from "@/server/scrape-competitor.functions";
import { toast } from "sonner";

type Props = {
  product: string;
  competitor?: string;
};

const URL_STORAGE_PREFIX = "scrape-url:";

function getRememberedUrl(product: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(URL_STORAGE_PREFIX + product.toLowerCase().trim()) ?? "";
}

function rememberUrl(product: string, url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(URL_STORAGE_PREFIX + product.toLowerCase().trim(), url);
}

export function TriggerScrapeButton({ product, competitor }: Props) {
  const queryClient = useQueryClient();
  const [hover, setHover] = useState(false);

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await scrapeCompetitorUrl({
        data: { url, product, competitor },
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success(`Scraped "${product}"`);
      queryClient.invalidateQueries({ queryKey: ["live-scrapes"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      toast.error(msg);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const remembered = getRememberedUrl(product);
    const url = window.prompt(`URL to scrape for "${product}"`, remembered);
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    rememberUrl(product, url);
    mutation.mutate(url);
  };

  const loading = mutation.isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
      title="Admin: trigger live scrape for this product"
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid #E5E2DB",
        backgroundColor: loading ? "#F5F4F1" : hover ? "#F5F4F1" : "#FFFFFF",
        color: "#1A1A18",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.02em",
        cursor: loading ? "wait" : "pointer",
        textTransform: "uppercase",
        transition: "background-color 0.15s",
      }}
    >
      {loading ? "Scraping…" : "Trigger scrape"}
    </button>
  );
}
