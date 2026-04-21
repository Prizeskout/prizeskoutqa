// Admin-only "Trigger scrape" button rendered next to each product row in the
// Competitors price table. Opens a shadcn Dialog form to enter the URL
// (remembered in localStorage per product so admins don't have to re-enter),
// calls the scrapeCompetitorUrl server function, then invalidates the
// live-scrapes query so LIVE badges refresh in place.
//
// Visibility is gated by useIsAdmin — non-admins never see this button.

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(getRememberedUrl(product));
      setUrlError(null);
      setServerError(null);
    }
  }, [open, product]);

  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await scrapeCompetitorUrl({
        data: { url, product, competitor },
      });
      if (!res.ok) throw new Error(res.error || "Scrape failed");
      return res;
    },
    onSuccess: () => {
      toast.success(`Scraped "${product}"`);
      queryClient.invalidateQueries({ queryKey: ["live-scrapes"] });
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
    rememberUrl(product, trimmed);
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
              Paste the competitor product URL for{" "}
              <span className="font-medium text-foreground">{product}</span>
              {competitor ? ` on ${competitor}` : ""}. We'll fetch the latest
              price and flip this row to LIVE.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scrape-url">Product URL</Label>
              <Input
                id="scrape-url"
                type="url"
                inputMode="url"
                placeholder="https://www.carrefourqa.com/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                autoFocus
                disabled={loading}
              />
              {urlError ? (
                <p className="text-xs text-destructive">{urlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We'll remember this URL for next time.
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
              <Button type="submit" disabled={loading}>
                {loading ? "Scraping…" : "Scrape now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
