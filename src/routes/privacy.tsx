import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero, MarketingBody, MarketingProse } from "@/components/marketing/MarketingPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy | PrizeSkout" },
      {
        name: "description",
        content:
          "How PrizeSkout collects, uses, and protects your data. Client data is walled off and never shared with competitors.",
      },
      { property: "og:title", content: "Privacy policy | PrizeSkout" },
      {
        property: "og:description",
        content: "Read how PrizeSkout handles your data, what we collect, and how we keep it safe.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingShell>
      <MarketingHero eyebrow="LEGAL" title="Privacy policy" />
      <MarketingBody>
        <MarketingProse>
          <p className="ps-meta">Last updated: April 1, 2026</p>

          <p>
            This policy explains what data PrizeSkout collects, how we use it, and the choices
            you have. We aim to be specific and avoid legalese where possible.
          </p>

          <h2>1. Who we are</h2>
          <p>
            PrizeSkout is a commerce intelligence platform operated from Doha, Qatar. When this
            policy says &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;, it means PrizeSkout.
            When it says &quot;you&quot; or &quot;your&quot;, it means the person or business
            using our service.
          </p>

          <h2>2. What we collect</h2>
          <h3>Account information</h3>
          <p>
            When you sign up we collect your name, work email, company name, and the password
            you choose. If you upgrade to a paid plan we also process billing details through
            our payment processor.
          </p>
          <h3>Product data</h3>
          <p>
            To run the platform we process the catalog, pricing, inventory, and sales data you
            choose to share with PrizeSkout, plus competitor data we collect on your behalf.
          </p>
          <h3>Usage data</h3>
          <p>
            We collect basic usage telemetry, pages viewed, features used, errors encountered -
            to improve the product. This data is aggregated and never tied back to a competitor
            or a customer of yours.
          </p>

          <h2>3. How we use your data</h2>
          <ul>
            <li>To provide the service you signed up for.</li>
            <li>To send important account and billing notifications.</li>
            <li>To compute anonymized benchmarks across the network.</li>
            <li>To investigate abuse, fraud, and security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>

          <h2>4. What we never do</h2>
          <p>
            <strong>We never sell your data.</strong> We never share your internal sales,
            margins, or inventory with other clients. We never give competitors visibility into
            your numbers. Benchmarks are computed only from anonymized, aggregated inputs.
          </p>

          <h2>5. How we protect your data</h2>
          <p>
            Data is encrypted in transit and at rest. Access is restricted to staff who need it
            to operate the service. We log access and review audit trails regularly. Vendors
            with access to client data are reviewed and bound by contract.
          </p>

          <h2>6. Your choices</h2>
          <ul>
            <li>You can request a copy of your data at any time.</li>
            <li>You can delete your account, which removes your data within 30 days.</li>
            <li>You can opt out of marketing emails from any email we send.</li>
          </ul>

          <h2>7. Contact</h2>
          <p>
            Questions about this policy? Email <strong>privacy@prizeskout.com</strong> and we
            will get back to you within one business day.
          </p>
        </MarketingProse>
      </MarketingBody>
    </MarketingShell>
  );
}
