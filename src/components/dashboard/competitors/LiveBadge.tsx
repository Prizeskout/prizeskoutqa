// Small "Live" pill rendered next to a product row in the Competitors price
// table when we have a recent successful Firecrawl scrape for that product.
//
// LIVE is only shown when:
//   - the caller passes live=true (a successful scrape exists for this row)
//   - AND scrapedAt is within the last 24 hours
//
// If the most recent successful scrape is older than 24h we render a "STALE"
// pill instead, so the UI doesn't claim freshness it doesn't have.
// If there has never been a successful scrape, we fall back to "MOCK".

type Props = { live?: boolean; scrapedAt?: string | null };

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function isFresh(scrapedAt?: string | null): boolean {
  if (!scrapedAt) return false;
  const ts = new Date(scrapedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= FRESH_WINDOW_MS;
}

export function LiveBadge({ live, scrapedAt }: Props) {
  const fresh = isFresh(scrapedAt);

  if (live && fresh) {
    return (
      <span
        title={scrapedAt ? `Scraped ${timeAgo(scrapedAt)}` : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 7px",
          borderRadius: 10,
          backgroundColor: "rgba(34, 197, 94, 0.12)",
          color: "#16A34A",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: "#22C55E",
            display: "inline-block",
          }}
        />
        LIVE
      </span>
    );
  }

  // We have a prior scrape but it's older than 24h - flag it as stale rather
  // than pretending it's still live or hiding the provenance entirely.
  if (live && scrapedAt && !fresh) {
    return (
      <span
        title={`Last scraped ${timeAgo(scrapedAt)} - older than 24h`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 7px",
          borderRadius: 10,
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          color: "#B45309",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: "#F59E0B",
            display: "inline-block",
          }}
        />
        STALE
      </span>
    );
  }

  return (
    <span
      title="No live scrape yet, showing seed data"
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 10,
        backgroundColor: "rgba(154, 154, 154, 0.12)",
        color: "#6B6B6B",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      MOCK
    </span>
  );
}
