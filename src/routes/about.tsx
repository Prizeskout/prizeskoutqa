import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero, MarketingBody, MarketingProse } from "@/components/marketing/MarketingPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About PrizeSkout — Pricing intelligence built for the Middle East" },
      {
        name: "description",
        content:
          "PrizeSkout helps commerce brands across Qatar and the Middle East monitor competitors and optimize prices online and in stores.",
      },
      {
        property: "og:title",
        content: "About PrizeSkout — Pricing intelligence built for the Middle East",
      },
      {
        property: "og:description",
        content:
          "Why we built PrizeSkout, who we serve, and how we approach pricing intelligence in the GCC.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="ABOUT"
        title="Pricing intelligence built for the Middle East"
        subtitle="We help commerce brands across the GCC see, decide, and act on every price that matters — online and in-store."
      />
      <MarketingBody>
        <MarketingProse>
          <h2>Who we are</h2>
          <p>
            PrizeSkout is a commerce intelligence platform built in Qatar for retailers,
            e-commerce platforms, hypermarkets, and omnichannel brands across the Middle East.
            We combine competitor monitoring, AI pricing recommendations, promotion analytics,
            and field intelligence into one workspace.
          </p>
          <p>
            Most pricing tools were designed for European and US markets. They miss the local
            platforms, payment habits, store formats, and language realities of the GCC.
            PrizeSkout was built from the ground up to cover the channels and competitors that
            actually matter here — from Snoonu and Talabat to Carrefour, Lulu, and the malls.
          </p>

          <h2>What we believe</h2>
          <p>
            <strong>Pricing should be a strategic muscle, not a spreadsheet.</strong> Brands
            that price well do not just react to competitors — they understand their market,
            protect their margins, and make pricing decisions confidently every week.
          </p>
          <p>
            <strong>Online and in-store are one market.</strong> A customer who walks past
            your store also opens your app. Pricing intelligence that ignores either channel
            is incomplete intelligence.
          </p>
          <p>
            <strong>Your data is your data.</strong> Internal sales, margins, and inventory
            stay walled off. Benchmarks are aggregated and anonymized. We never resell client
            data and we never let competitors see yours.
          </p>

          <h2>Where we are going</h2>
          <p>
            We are launching across Qatar in 2026, with the UAE and Saudi Arabia following.
            Our roadmap focuses on deeper field intelligence, automated repricing rules tied
            to store-level inventory, and category benchmarks that get more accurate as the
            network grows.
          </p>

          <hr />
          <p>
            Want to see what PrizeSkout can do for your brand?{" "}
            <Link to="/signup">Start a free trial</Link> or{" "}
            <Link to="/contact">talk to our team</Link>.
          </p>
        </MarketingProse>
      </MarketingBody>
    </MarketingShell>
  );
}
