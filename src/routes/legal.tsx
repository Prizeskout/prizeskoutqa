import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero, MarketingBody, MarketingProse } from "@/components/marketing/MarketingPage";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Privacy Policy & Terms | PrizeSkout" },
      { name: "description", content: "Privacy Policy and Terms of Service governing your use of PrizeSkout pricing infrastructure middleware. Operated under QFC No. 04412." },
      { property: "og:title", content: "Privacy Policy & Terms | PrizeSkout" },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <MarketingShell>
      <MarketingHero eyebrow="LEGAL" title="Privacy Policy & Terms" />
      <MarketingBody>
        <MarketingProse>

          {/* ── PRIVACY POLICY ─────────────────────────────────────────── */}
          <p className="ps-meta">Last updated: June 30th 2026. Version 1.0.</p>

          <p>
            This policy explains what data PrizeSkout collects, how we use it, and the choices
            you have. We aim to be specific and avoid legalese where possible.
          </p>

          <h2>1. Who we are</h2>
          <p>
            PrizeSkout is a commerce intelligence platform operated from Doha, Qatar under
            QFC No. 04412. When this policy says "we", "us", or "our", it means PrizeSkout.
            When it says "you" or "your", it means the person or business using our service.
          </p>

          <h2>2. What we collect</h2>
          <h3>Store connection data</h3>
          <p>
            When you connect your store we receive OAuth tokens, store identifiers, and
            the scopes you authorise. We do not collect personal login credentials.
          </p>
          <h3>Product and pricing data</h3>
          <p>
            To run the platform we process the catalog, pricing, inventory, and sales data
            transmitted by your connected platforms (Salla, Zid, Foodics) and delivery
            aggregators (Talabat, Jahez, Snoonu, Deliveroo).
          </p>
          <h3>Usage data</h3>
          <p>
            We collect basic usage telemetry — pages viewed, features used, errors
            encountered — to improve the product. This data is aggregated and never tied
            back to a competitor or a customer of yours.
          </p>

          <h2>3. How we use your data</h2>
          <ul>
            <li>To provide the service you connected your store for.</li>
            <li>To send important account and integration notifications.</li>
            <li>To compute anonymized benchmarks across the network.</li>
            <li>To investigate abuse, fraud, and security incidents.</li>
            <li>To comply with legal obligations under QFC, KSA PDPL, and UAE law.</li>
          </ul>

          <h2>4. What we never do</h2>
          <p>
            <strong>We never sell your data.</strong> We never share your internal sales,
            margins, or inventory with other clients. We never give competitors visibility
            into your numbers. Benchmarks are computed only from anonymized, aggregated inputs.
          </p>

          <h2>5. How we protect your data</h2>
          <p>
            Data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access is
            restricted to staff who need it to operate the service. We log access and review
            audit trails regularly. All vendors with access to client data are reviewed and
            bound by contract. Data is stored within GCC-region infrastructure.
          </p>

          <h2>6. Your choices</h2>
          <ul>
            <li>You can request a copy of your data at any time.</li>
            <li>You can disconnect your store, which removes your tokens immediately.</li>
            <li>You can request full data deletion, completed within 30 days.</li>
          </ul>

          <h2>7. Contact</h2>
          <p>
            Questions about this policy? Email <strong>legal@prizeskout.qa</strong> and
            we will respond within one business day.
          </p>

          <hr />

          {/* ── TERMS OF SERVICE ───────────────────────────────────────── */}
          <h2 style={{ marginTop: 48 }}>PrizeSkout LLC — Terms of Service</h2>

          <p className="ps-meta">
            Operated by <strong>PrizeSkout</strong> (QFC No. 04412). Effective Date: June 22nd 2026. Last Updated: June 30th 2026. Version 1.0.
          </p>

          <p>
            These Terms of Service (the "Terms") constitute a binding agreement between PrizeSkout and any
            merchant, business, or authorized user (the "Merchant" or "you") that accesses or uses the PrizeSkout
            pricing infrastructure middleware (the "Service"). By installing the Service through the Salla App Store,
            the Zid App Market, the Foodics Marketplace, or by otherwise activating any PrizeSkout integration,
            you agree to be bound by these Terms. If you do not agree, you must not access or use the Service.
          </p>

          <h2>1.0  Description of Service &amp; Integration Scope</h2>
          <p>
            1.1  PrizeSkout is real-time pricing infrastructure middleware. It operates as background middleware
            that processes active inbound API calls from connected commerce platforms (Salla, Zid, Foodics) and
            active outbound API calls to connected delivery aggregators (Talabat, Jahez, Snoonu, Deliveroo) in
            order to deliver pricing intelligence, channel-margin analysis, and, where enabled, automated price
            adjustment.
          </p>
          <p>
            1.2  The Service is a connective and analytical layer. PrizeSkout does not operate the Merchant's
            storefront, does not act as a payment processor, does not take title to goods, and does not control the
            systems, availability or commercial terms of any third-party platform or aggregator.
          </p>
          <p>
            1.3  The Merchant is responsible for maintaining its own valid accounts, subscriptions and integration
            permissions with each connected platform and aggregator, and for ensuring that its use of the Service
            complies with the terms of those third-party platforms.
          </p>

          <h2>2.0  Third-Party API Dependency &amp; System Liability</h2>
          <p>
            2.1  The Service is inherently dependent on third-party systems outside PrizeSkout's ownership or
            control. PrizeSkout does not warrant the availability, accuracy, latency, or continuity of any inbound
            platform or outbound aggregator, nor the stability of their application programming interfaces.
          </p>
          <p>
            <strong>2.2  Exclusion of Liability for Downstream Failures.</strong> To the maximum extent permitted by applicable
            law, PrizeSkout shall not be liable for any transactional losses, margin leakage, lost profits, mispricing,
            or catalog synchronization failures arising from or relating to: (a) changes, deprecations, or breaking
            modifications to any third-party API; (b) service degradation, outage, throttling, or downtime of any
            aggregator (Talabat, Jahez, Snoonu, Deliveroo, etc.); (c) downtime, latency, or data errors originating
            from Salla, Zid, Foodics or any inbound platform; (d) revocation, expiry, or rate-limiting of API
            credentials by a third party; or (e) any act, omission, or commercial decision of a third-party platform,
            aggregator, or payment provider.
          </p>
          <p>
            2.3  No Guarantee of Margin Outcome. The Service provides analytical outputs and, where enabled,
            automated adjustments based on data available at the time of processing. PrizeSkout does not
            guarantee any particular margin, revenue, ranking, or commercial result, and the Merchant retains full
            responsibility for its pricing strategy and commercial outcomes.
          </p>
          <p>
            2.4  Limitation of Liability. To the maximum extent permitted by law, PrizeSkout's aggregate liability
            arising out of or relating to the Service shall not exceed the total fees paid by the Merchant to
            PrizeSkout in the twelve (12) months preceding the event giving rise to the claim. PrizeSkout shall
            not be liable for indirect, incidental, special, consequential or punitive damages. Nothing in these
            Terms excludes liability that cannot lawfully be excluded.
          </p>
          <p>
            2.5  Service Availability. The Service is provided on an "as available" basis. PrizeSkout may suspend
            the Service for maintenance, security, or to comply with law, and will use reasonable efforts to
            minimize disruption.
          </p>

          <h2>3.0  Automated Execution Consent</h2>
          <p>
            3.1  By activating the "Active Margin Defense (Defend Loop)" toggle within the PrizeSkout dashboard,
            the Merchant grants PrizeSkout explicit, informed, and revocable authorization to execute automated
            price modifications on the Merchant's connected storefronts and channels, in accordance with the
            parameters configured by the Merchant.
          </p>
          <p>
            3.2  Merchant Acknowledgement. The Merchant acknowledges and agrees that: (a) once the Defend
            Loop is enabled, the Service may write price changes to connected platforms automatically and
            without per-transaction confirmation; (b) the Merchant is solely responsible for the rules, floors,
            ceilings, and parameters it configures; (c) automated changes occur in real time based on then-available
            data; and (d) the Merchant is responsible for ensuring that automated pricing complies with
            applicable consumer-protection, competition, and platform-specific pricing rules in Qatar, KSA and the
            UAE.
          </p>
          <p>
            3.3  Revocation. The Merchant may disable the Defend Loop at any time through the dashboard.
            Disabling the toggle ceases prospective automated execution but does not reverse price changes
            already written to connected platforms; reversal of prior changes is the Merchant's responsibility.
          </p>
          <p>
            3.4  Safeguards. PrizeSkout will apply the configured guardrails (such as minimum-price floors) where
            set by the Merchant; however, PrizeSkout is not liable for outcomes resulting from parameters chosen
            by the Merchant, nor for changes propagated by downstream platforms outside PrizeSkout's control.
          </p>

          <h2>4.0  Acceptable Use &amp; Reverse Engineering</h2>
          <p>
            4.1  The Merchant shall use the Service only for its lawful internal business purposes and in
            compliance with all applicable laws and third-party platform terms.
          </p>
          <p>4.2  Prohibited Conduct. The Merchant shall not, and shall not permit any third party to:</p>
          <ul>
            <li>reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code, architecture, or operation of PrizeSkout's serverless event-loop engine or any component of the Service;</li>
            <li>run scrapers, crawlers, bots, or automated extraction scripts against PrizeSkout's pricing telemetry clusters, APIs, or infrastructure;</li>
            <li>circumvent, disable, or interfere with any security, rate-limiting, or access-control mechanism of the Service;</li>
            <li>resell, sublicense, or provide the Service to third parties except as expressly permitted in writing;</li>
            <li>use the Service to infringe intellectual property, violate competition law, or facilitate unlawful price coordination; or</li>
            <li>introduce malicious code or attempt to gain unauthorized access to PrizeSkout systems or other tenants' data in the multi-tenant environment.</li>
          </ul>
          <p>
            4.3  Intellectual Property. As between the parties, PrizeSkout retains all right, title and interest in and
            to the Service, its software, models, and telemetry infrastructure. No rights are granted except the
            limited, non-exclusive, non-transferable right to use the Service during the subscription term. The
            Merchant retains ownership of its own catalog, pricing, and transaction data.
          </p>
          <p>
            4.4  Suspension. PrizeSkout may suspend or terminate access for a material breach of this Section,
            for security reasons, or where required to protect the integrity of the multi-tenant platform.
          </p>

          <h2>5.0  Governing Law &amp; Dispute Resolution</h2>
          <p>
            5.1  Governing Law. These Terms shall be governed by and construed in accordance with the laws
            applicable in the Qatar Financial Centre (QFC), without regard to conflict-of-laws principles. For
            Merchants domiciled in KSA, the parties may elect the laws of the Kingdom of Saudi Arabia to govern
            that Merchant's subscription, as specified in the applicable order form.
          </p>
          <p>
            5.2  Jurisdiction &amp; Dispute Resolution. The parties shall first attempt to resolve any dispute amicably
            through good-faith negotiation. Failing resolution within thirty (30) days, the dispute shall be referred
            to and finally resolved by arbitration in accordance with the QICCA / DIAC / SCCA arbitration rules
            then in force, before the default forum of the Courts of the Qatar Financial Centre in Doha; provided
            that, for KSA-domiciled Merchants, the parties may instead designate arbitration seated in Riyadh
            under the rules of the Saudi Center for Commercial Arbitration (SCCA), or the competent judicial
            authorities of Riyadh. The seat, language (English/Arabic), and number of arbitrators shall be as
            specified in the order form.
          </p>
          <p>
            5.3  Interim Relief. Notwithstanding the above, either party may seek urgent injunctive or interim relief
            from a court of competent jurisdiction to protect its confidential information or intellectual property.
          </p>
          <p>
            5.4  Severability &amp; Entire Agreement. If any provision of these Terms is held unenforceable, the
            remaining provisions remain in full force. These Terms, together with the Privacy &amp; Data Protection
            Policy and any applicable order form, constitute the entire agreement between the parties regarding
            the Service and supersede prior understandings.
          </p>
          <p>
            5.5  Amendments. PrizeSkout may update these Terms to reflect changes in law or the Service.
            Material changes will be notified through the dashboard or by email, and continued use of the
            Service after the effective date of such changes constitutes acceptance.
          </p>

          <h2>6.0  Contact</h2>
          <p>
            6.1  Notices and questions regarding these Terms may be directed to: <strong>legal@prizeskout.qa</strong>,
            PrizeSkout, Office No. 4, situated at Floor 9-902, QFC Tower 1, West Bay, Doha, State of Qatar.
          </p>

        </MarketingProse>
      </MarketingBody>
    </MarketingShell>
  );
}
