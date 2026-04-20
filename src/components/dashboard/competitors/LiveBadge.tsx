// Small "Live" pill rendered next to a product row in the Competitors price
// table when we have a recent successful Firecrawl scrape for that product.
// Falls back to a muted "Mock" pill so customers always see provenance.

type Props = { live?: boolean; scrapedAt?: string | null };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function LiveBadge({ live, scrapedAt }: Props) {
  if (live) {
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
  return (
    <span
      title="No live scrape yet — showing seed data"
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
