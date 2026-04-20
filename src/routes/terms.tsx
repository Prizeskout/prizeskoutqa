import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero, MarketingBody, MarketingProse } from "@/components/marketing/MarketingPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service | PrizeSkout" },
      {
        name: "description",
        content:
          "The terms that govern your use of PrizeSkout, accounts, billing, acceptable use, and the limits of our service.",
      },
      { property: "og:title", content: "Terms of service | PrizeSkout" },
      {
        property: "og:description",
        content: "Read the agreement between PrizeSkout and the businesses that use our platform.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingShell>
      <MarketingHero eyebrow="LEGAL" title="Terms of service" />
      <MarketingBody>
        <MarketingProse>
          <p className="ps-meta">Last updated: April 1, 2026</p>

          <p>
            These terms govern your use of PrizeSkout. By creating an account or using the
            service, you agree to them. If you are signing up on behalf of a company, you
            confirm you have authority to do so.
          </p>

          <h2>1. The service</h2>
          <p>
            PrizeSkout is a software-as-a-service platform that helps commerce brands monitor
            competitors, optimize pricing, manage promotions, and gather field intelligence.
            We may update the service from time to time to add or improve features.
          </p>

          <h2>2. Your account</h2>
          <p>
            You are responsible for keeping your login credentials safe and for all activity
            that happens under your account. Notify us promptly if you suspect unauthorized
            access.
          </p>

          <h2>3. Subscriptions and billing</h2>
          <ul>
            <li>Paid plans are billed monthly or annually in advance.</li>
            <li>You can cancel at any time. Your plan remains active until the end of the current billing period.</li>
            <li>We do not offer refunds for partial months, but we will not bill you for a renewal period after cancellation.</li>
            <li>Prices may change with at least 30 days notice before your next renewal.</li>
          </ul>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service to break the law or infringe on the rights of others.</li>
            <li>Attempt to access another customer&apos;s data.</li>
            <li>Reverse engineer the service or our underlying models.</li>
            <li>Resell or sublicense PrizeSkout without a written agreement.</li>
            <li>Submit content that is defamatory, obscene, or otherwise harmful.</li>
          </ul>

          <h2>5. Your data</h2>
          <p>
            You own your data. You grant us a limited license to process it solely to provide
            the service. We treat client data as confidential and we never share your numbers
            with competitors. See our Privacy policy for details.
          </p>

          <h2>6. Service availability</h2>
          <p>
            We aim for high availability but we do not guarantee that the service will be
            uninterrupted or error-free. Enterprise plans include an SLA, see your contract
            for details.
          </p>

          <h2>7. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, PrizeSkout is not liable for indirect,
            incidental, or consequential damages, or for lost profits or revenue, even if we
            have been advised of the possibility. Our total liability for any claim is limited
            to the fees you paid in the 12 months before the event giving rise to the claim.
          </p>

          <h2>8. Termination</h2>
          <p>
            You can cancel any time from your account settings. We may suspend or terminate
            your account if you violate these terms or if continued use creates legal or
            security risk.
          </p>

          <h2>9. Governing law</h2>
          <p>These terms are governed by the laws of Qatar.</p>

          <h2>10. Contact</h2>
          <p>
            Questions about these terms? Email <strong>legal@prizeskout.com</strong>.
          </p>
        </MarketingProse>
      </MarketingBody>
    </MarketingShell>
  );
}
