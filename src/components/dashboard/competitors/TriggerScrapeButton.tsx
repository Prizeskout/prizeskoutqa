// Admin-only "Trigger scrape" button rendered next to each product row in the
// Competitors price table. Opens a shadcn Dialog with the saved URL pre-filled
// (persisted server-side in `competitor_product_urls` per user + product +
// competitor), calls the scrapeCompetitorUrl server function, then invalidates
// the live-scrapes query so LIVE badges refresh in place.
//
// Visibility is gated by useIsAdmin - non-admins never see this button.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scrapeCompetitorUrl } from "@/server/scrape-competitor.functions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  product: string;
  competitor?: string;
};

function urlKey(product: string, competitor?: string) {
  return ["competitor-product-url", product.toLowerCase().trim(), (competitor ?? "").toLowerCase().trim()] as const;
}

export function TriggerScrapeButton({ product, competitor }: Props) {
  const queryClient = useQueryClient();
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const competitorKey = competitor ?? "";

  // Load the saved URL for this (product, competitor) once the dialog opens.
  const savedUrlQuery = useQuery({
    queryKey: urlKey(product, competitor),
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_product_urls")
        .select("url")
        .eq("product", product)
        .eq("competitor", competitorKey)
        .eq("channel", "online")
        .maybeSingle();
      if (error) throw error;
      return data?.url ?? "";
    },
  });

  useEffect(() => {
    if (open) {
      setUrlError(null);
      setServerError(null);
    }
  }, [open]);

  // Sync fetched URL into the input whenever it lands.
  useEffect(() => {
    if (open && savedUrlQuery.data !== undefined) {
      setUrl(savedUrlQuery.data);
    }
  }, [open, savedUrlQuery.data]);

  const mutation = useMutation({
    mutationFn: async (submittedUrl: string) => {
      // Persist the URL first so future opens are one-click.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (userId) {
        const { error: upsertError } = await supabase
          .from("competitor_product_urls")
          .upsert(
            {
              user_id: userId,
              product,
              competitor: competitorKey,
              channel: "online",
              url: submittedUrl,
            },
            { onConflict: "user_id,product,channel,competitor" },
          );
        if (upsertError) throw new Error(`Failed to save URL: ${upsertError.message}`);
      }

      const res = await scrapeCompetitorUrl({
        data: { url: submittedUrl, product, competitor, channel: "online", matchConfidence: 1 },
      });
      if (!res.ok) throw new Error(res.error || "Scrape failed");
      return res;
    },
    onSuccess: () => {
      toast.success(`Scraped "${product}"`);
      queryClient.invalidateQueries({ queryKey: ["live-scrapes"] });
      queryClient.invalidateQueries({ queryKey: urlKey(product, competitor) });
      setServerError(null);
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      setServerError(msg);
      toast.error(msg);
    },
  });

  const loading = mutation.isPending;
  const loadingSavedUrl = open && savedUrlQuery.isLoading;
  const hasSavedUrl = (savedUrlQuery.data ?? "").trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("Enter a URL");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setUrlError("Enter a valid URL (including https://)");
      return;
    }
    setUrlError(null);
    mutation.mutate(trimmed);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
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

      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Trigger live scrape</DialogTitle>
            <DialogDescription>
              {hasSavedUrl
                ? <>Saved URL for <span className="font-medium text-foreground">{product}</span>{competitor ? ` on ${competitor}` : ""}. Click Scrape now to confirm, or edit the URL first.</>
                : <>Paste the competitor product URL for <span className="font-medium text-foreground">{product}</span>{competitor ? ` on ${competitor}` : ""}. We'll save it so next time it's a one-click confirm.</>}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scrape-url">Product URL</Label>
              <Input
                id="scrape-url"
                type="url"
                inputMode="url"
                placeholder={loadingSavedUrl ? "Loading saved URL…" : "https://www.carrefourqa.com/..."}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                autoFocus
                disabled={loading || loadingSavedUrl}
              />
              {urlError ? (
                <p className="text-xs text-destructive">{urlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {hasSavedUrl
                    ? "Saved server-side. Edits will overwrite the saved URL."
                    : "We'll save this URL server-side for next time."}
                </p>
              )}
            </div>

            {serverError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  Server error
                </p>
                <pre className="whitespace-pre-wrap break-words text-xs text-destructive font-mono leading-relaxed max-h-40 overflow-auto">
                  {serverError}
                </pre>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || loadingSavedUrl}>
                {loading ? "Scraping…" : "Scrape now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
