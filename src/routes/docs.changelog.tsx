// Changelog rendered inside the docs shell so the sub-nav stays in place.
// The standalone /changelog route now redirects here.

import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog | PrizeSkout" },
      {
        name: "description",
        content:
          "New features, improvements, and fixes shipped in PrizeSkout. Updated regularly as we release.",
      },
      { property: "og:title", content: "Changelog | PrizeSkout" },
      {
        property: "og:description",
        content: "Track every release of PrizeSkout, new features, improvements, and fixes.",
      },
    ],
  }),
  component: ChangelogPage,
});

type Tag = "New" | "Improved" | "Fixed";

const TAG_STYLES: Record<Tag, { bg: string; border: string; color: string }> = {
  New: { bg: "rgba(234, 88, 12, 0.1)", border: "rgba(234, 88, 12, 0.3)", color: "#EA580C" },
  Improved: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)", color: "#2563EB" },
  Fixed: { bg: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.3)", color: "#16A34A" },
};

const RELEASES: {
  version: string;
  date: string;
  highlights: { tag: Tag; title: string; body: string }[];
}[] = [
  {
    version: "v1.6",
    date: "June 24, 2026",
    highlights: [
      {
        tag: "New",
        title: "Settings fully wired — live data across all tabs",
        body: "Account, Integrations, Team, Locations, and Competitors tabs now read and write to the database in real time. Changes persist across sessions immediately.",
      },
      {
        tag: "New",
        title: "Edit modals for webhooks, competitors, team roles, and locations",
        body: "Every pencil icon in Settings now opens a full edit modal. Update webhook URLs and event subscriptions, manage competitor product URLs per-competitor, change team member roles, and edit location details — all without leaving the dashboard.",
      },
      {
        tag: "New",
        title: "Team invites by email",
        body: "Invite colleagues by email address directly from Settings → Team. Invited members receive Owner, Admin, Developer, or Viewer access. Role changes take effect immediately.",
      },
      {
        tag: "Improved",
        title: "Dashboard reliability — error boundaries per tab",
        body: "A failure in one dashboard tab no longer crashes the entire dashboard. Each tab is independently isolated so the rest of your workspace stays usable.",
      },
      {
        tag: "Fixed",
        title: "Sidebar scroll on smaller screens",
        body: "The sidebar navigation was cut off below the Field Intelligence section on displays shorter than 900px. All sections are now reachable by scrolling.",
      },
    ],
  },
  {
    version: "v1.5",
    date: "June 10, 2026",
    highlights: [
      {
        tag: "New",
        title: "Structured pricing rules engine",
        body: "Pricing rules are now structured types — margin_floor_pct, nominal_floor_qar, moci_ceiling, competitor_ceiling_pct, max_discount_pct, price_rounding — with non-overridable floor and ceiling enforcement. No competitive ceiling can push a price below your margin floor.",
      },
      {
        tag: "New",
        title: "Per-rule effect diagnostics",
        body: "Every pricing recommendation now includes a rule_effects array showing exactly which rules fired, which passed, and which were overridden. If a rule was skipped due to missing COGS data, the reason says so explicitly.",
      },
      {
        tag: "New",
        title: "Trilingual interface — English, Arabic, French",
        body: "The dashboard and landing page are now fully translated into Arabic (with RTL layout) and French, in addition to English. Language auto-detects from browser settings and can be changed from the top bar.",
      },
      {
        tag: "New",
        title: "Billing plans page",
        body: "A clear plan comparison page is now live at Dashboard → Plans, showing Starter, Growth, and Enterprise tiers with Qatar-local pricing in QAR.",
      },
      {
        tag: "Improved",
        title: "Competitor URL cache with deduplication",
        body: "When multiple users track the same competitor URL, scrapes are now shared from a central cache rather than running once per user. This reduces Firecrawl API usage and speeds up fresh-data availability.",
      },
    ],
  },
  {
    version: "v1.4",
    date: "April 18, 2026",
    highlights: [
      {
        tag: "New",
        title: "Branded PDF reports",
        body: "Export pricing, field intel, and competitor reports with your logo and accent color from Settings → Branding.",
      },
      {
        tag: "Improved",
        title: "AI pricing recommendations",
        body: "Recommendations now factor in promotion calendars and weekly seasonality, improving accuracy on fast-moving categories.",
      },
      {
        tag: "Fixed",
        title: "Field intel form on mobile",
        body: "Resolved a hydration warning on the observation submit form for Safari and in-app browsers.",
      },
    ],
  },
  {
    version: "v1.3",
    date: "March 26, 2026",
    highlights: [
      {
        tag: "New",
        title: "Promotion ROI simulator",
        body: "Model the expected uplift, cannibalization, and net margin of a campaign before you launch it.",
      },
      {
        tag: "New",
        title: "Cross-border radar",
        body: "Spot products that competitors are sourcing from outside Qatar at materially different prices.",
      },
      {
        tag: "Improved",
        title: "Faster competitor scrapes",
        body: "Average refresh latency for online competitor catalogs dropped from 6h to under 90 minutes.",
      },
    ],
  },
  {
    version: "v1.2",
    date: "March 5, 2026",
    highlights: [
      {
        tag: "New",
        title: "Field intelligence module",
        body: "Capture in-store competitor prices through a simple submission form for your store teams.",
      },
      {
        tag: "Improved",
        title: "Network value benchmarks",
        body: "Benchmarks now refresh weekly and include median, P25, and P75 by category and channel.",
      },
    ],
  },
  {
    version: "v1.1",
    date: "February 12, 2026",
    highlights: [
      {
        tag: "New",
        title: "Channel filter across the dashboard",
        body: "Switch between Online, In-store, and All Channels at the top bar, every page filters together.",
      },
      {
        tag: "Fixed",
        title: "CSV import for SKU mapping",
        body: "UTF-8 BOM headers are now handled correctly during catalog imports.",
      },
    ],
  },
  {
    version: "v1.0",
    date: "January 22, 2026",
    highlights: [
      {
        tag: "New",
        title: "PrizeSkout is live in Qatar",
        body: "Full launch covering Snoonu, Talabat, Carrefour Qatar, Lulu Hypermarket, Amazon.ae, and Noon.",
      },
    ],
  },
];

function ChangelogPage() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <section
        style={{
          background: "#FAFAFA",
          minHeight: "calc(100vh - 64px)",
          padding: "56px 24px 96px",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A18",
              marginBottom: 12,
            }}
          >
            Changelog
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "#5A5A58",
              lineHeight: 1.65,
              marginBottom: 40,
              maxWidth: 640,
            }}
          >
            Every release we ship, in plain language. New features, improvements, and the bugs we
            squashed.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {RELEASES.map((release) => (
              <article
                key={release.version}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E8E5",
                  borderRadius: 10,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 18,
                  }}
                >
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A18", margin: 0 }}>
                    {release.version}
                  </h2>
                  <span style={{ fontSize: 13, color: "#6B6B6B" }}>{release.date}</span>
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {release.highlights.map((h, i) => {
                    const t = TAG_STYLES[h.tag];
                    return (
                      <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: t.color,
                            background: t.bg,
                            border: `1px solid ${t.border}`,
                            padding: "3px 8px",
                            borderRadius: 4,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            flexShrink: 0,
                            minWidth: 64,
                            textAlign: "center",
                            marginTop: 2,
                          }}
                        >
                          {h.tag}
                        </span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>
                            {h.title}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: "#6B6B6B",
                              lineHeight: 1.6,
                              marginTop: 4,
                            }}
                          >
                            {h.body}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
