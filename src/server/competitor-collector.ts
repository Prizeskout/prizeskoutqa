/**
 * Provider-neutral boundary for Competitor Radar collection.
 *
 * Firecrawl is the first adapter, not part of the domain model. A direct HTTP,
 * Playwright, marketplace API, or site-specific adapter can implement the same
 * contract without changing scheduling, persistence, or pricing decisions.
 */
export type Availability = "in_stock" | "out_of_stock" | "unknown";

export type CompetitorObservation = {
  price: number;
  currency: string | null;
  originalPrice: number | null;
  availability: Availability;
  productTitle: string | null;
  sku: string | null;
  gtin: string | null;
  seller: string | null;
  markdown: string | null;
  metadata: Record<string, unknown>;
  evidence: Record<string, unknown>;
};

export type CollectionFailure = {
  ok: false;
  error: string;
  retryable: boolean;
  category: "null_price" | "failed";
  partial?: Partial<CompetitorObservation>;
};

export type CollectionResult =
  | ({ ok: true } & CompetitorObservation)
  | CollectionFailure;

export interface CompetitorCollector {
  readonly name: string;
  collect(url: string): Promise<CollectionResult>;
}

