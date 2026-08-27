import { useState } from "react";
import { ArrowRight, Check, CircleCheck, Menu, ShieldCheck, X } from "lucide-react";
import logo from "@/assets/logo-light.svg";
import qstpLogo from "@/assets/qstp-logo-colored.png";
import dashboardDesktop from "@/assets/landing/dashboard-overview.png";
import dashboardMobile from "@/assets/landing/dashboard-mobile.png";
import onboardingDesktop from "@/assets/landing/merchant-onboarding.png";
import "./NewLandingPage.css";

const QFC_LOGO = "/qfc-logo.svg";

const channels = ["Zid", "Salla", "Foodics", "Talabat", "Snoonu", "Jahez"];

const plans = [
  {
    name: "Core",
    best: "One store ready to run and protect profit",
    monthly: "QAR 349",
    annual: "QAR 279",
    popular: false,
    features: [
      "Understand true profit and payout health",
      "Set margin policies and approve protected actions",
      "Use CFO Copilot and AI Store Manager",
    ],
    href: "/onboarding",
    action: "Get started",
  },
  {
    name: "Growth",
    best: "A growing team ready for more leverage",
    monthly: "QAR 1,099",
    annual: "QAR 879",
    popular: true,
    features: [
      "Everything in Core",
      "Automate protected workflows",
      "Audit discrepancies and prepare recovery evidence",
    ],
    href: "/onboarding",
    action: "Choose Growth",
  },
  {
    name: "Enterprise",
    best: "Groups that need scale and governance",
    monthly: "Custom",
    annual: "Custom",
    popular: false,
    features: [
      "Everything in Growth",
      "Coordinate stores, teams and entities",
      "Apply group controls, APIs and service levels",
    ],
    href: "/contact",
    action: "Talk to sales",
  },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView();
}

export function NewLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);

  const go = (id: string) => {
    scrollToSection(id);
    setMenuOpen(false);
  };

  return (
    <main className="nlp" id="top">
      <a className="nlp-skip" href="#main-content">
        Skip to main content
      </a>

      <header className="nlp-nav-shell">
        <nav className="nlp-nav" aria-label="Main navigation">
          <button className="nlp-logo" type="button" onClick={() => go("top")}>
            <img src={logo} alt="PrizeSkout" />
          </button>

          <div className={`nlp-nav-links ${menuOpen ? "is-open" : ""}`}>
            <button type="button" onClick={() => go("product")}>
              Product
            </button>
            <button type="button" onClick={() => go("platform")}>
              Platform
            </button>
            <button type="button" onClick={() => go("pricing")}>
              Pricing
            </button>
            <button type="button" onClick={() => go("integrations")}>
              Integrations
            </button>
            <a
              className="nlp-nav-mobile-action"
              href="mailto:hello@prizeskout.com?subject=Book a demo"
            >
              Book a demo <ArrowRight aria-hidden="true" />
            </a>
            <a className="nlp-nav-mobile-login" href="/access">
              Login
            </a>
          </div>

          <div className="nlp-nav-actions">
            <span>Qatar · QAR</span>
            <a
              className="nlp-button nlp-button-primary nlp-button-small"
              href="mailto:hello@prizeskout.com?subject=Book a demo"
            >
              Book a demo <ArrowRight aria-hidden="true" />
            </a>
            <a className="nlp-login" href="/access">
              Login
            </a>
          </div>

          <button
            className="nlp-menu-button"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </nav>
      </header>

      <div id="main-content">
        <section className="nlp-hero" aria-labelledby="nlp-hero-title">
          <div className="nlp-hero-copy">
            <span className="nlp-eyebrow">
              <i /> Economic Twin is live
            </span>
            <h1 id="nlp-hero-title">
              Reported profit is a story.
              <br />
              <em>True profit</em> is a system.
            </h1>
            <p>
              PrizeSkout reconstructs the real unit economics of every order across every channel.
              It predicts the profit impact of every commercial action and protects your margin
              while you sleep.
            </p>
            <div className="nlp-hero-actions">
              <a
                className="nlp-button nlp-button-primary"
                href="mailto:hello@prizeskout.com?subject=Book a demo"
              >
                Book a demo <ArrowRight aria-hidden="true" />
              </a>
              <button
                className="nlp-button nlp-button-quiet"
                type="button"
                onClick={() => go("platform")}
              >
                Watch your order reconcile <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="nlp-hero-media"
            aria-label="PrizeSkout dashboard shown on desktop and mobile"
          >
            <div className="nlp-hero-card nlp-hero-card-back" aria-hidden="true">
              <span>True Margin Intelligence</span>
              <b>18.7%</b>
              <small>True margin</small>
            </div>
            <figure className="nlp-screen nlp-screen-desktop">
              <figcaption>
                <span>
                  <i /> Live product
                </span>
                <b>Merchant dashboard · Overview</b>
              </figcaption>
              <div className="nlp-screen-image">
                <img
                  src={dashboardDesktop}
                  alt="The current PrizeSkout merchant dashboard overview"
                />
              </div>
            </figure>
            <figure className="nlp-screen nlp-screen-mobile">
              <figcaption>
                <span>Mobile</span>
              </figcaption>
              <img
                src={dashboardMobile}
                alt="The current PrizeSkout merchant dashboard on mobile"
              />
            </figure>
          </div>

          <div className="nlp-source-line" id="integrations">
            <span>Live sources</span>
            <div>
              {channels.map((channel) => (
                <b key={channel}>{channel}</b>
              ))}
            </div>
          </div>
        </section>

        <aside className="nlp-credentials" aria-label="PrizeSkout credentials">
          <div>
            <span>Backed by</span>
            <img src={qstpLogo} alt="Qatar Science and Technology Park" />
          </div>
          <i aria-hidden="true" />
          <div>
            <span>Licensed by</span>
            <img src={QFC_LOGO} alt="Qatar Financial Centre" />
            <b>04412</b>
          </div>
        </aside>

        <section
          className="nlp-section nlp-platform"
          id="platform"
          aria-labelledby="economic-twin-title"
        >
          <SectionHeading
            number="01"
            eyebrow="The Economic Twin"
            id="economic-twin-title"
            title="Every number arrives with its evidence."
            text="Watch PrizeSkout build one trusted order from six live sources."
          />

          <div className="nlp-proof-grid">
            <article className="nlp-proof-copy">
              <span>Order 8745123 · Talabat</span>
              <div className="nlp-proof-value">
                <small>True profit per order</small>
                <b>QAR 4.18</b>
              </div>
              <ul>
                {[
                  "Commission agreement §4.2",
                  "Payment settlement",
                  "Delivery invoice",
                  "Campaign PROMO-218",
                  "Payout statement #815",
                  "Catalog cost record",
                ].map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
              <p>
                <ShieldCheck aria-hidden="true" /> Six source records retain their original
                evidence.
              </p>
            </article>

            <figure className="nlp-product-window nlp-product-window-wide">
              <figcaption>
                <span>PrizeSkout dashboard</span>
                <b>Merchant overview</b>
              </figcaption>
              <img
                src={dashboardDesktop}
                alt="PrizeSkout merchant overview with pricing, market, and channel navigation"
                loading="lazy"
              />
            </figure>
          </div>
        </section>

        <section className="nlp-section nlp-defend" aria-labelledby="defend-loop-title">
          <SectionHeading
            number="02"
            eyebrow="The Defend Loop"
            id="defend-loop-title"
            title="A decision completes in seconds."
            text="PrizeSkout detects risk, predicts the result, checks your rules, requests approval, and records proof."
          />

          <div className="nlp-decision-layout">
            <div className="nlp-decision-track" aria-label="Defend Loop decision path">
              {[
                ["14:32:08", "Risk detected", "Talabat promotion signal"],
                ["14:32:08", "Impact calculated", "Projected margin 12.6%"],
                ["14:32:09", "Rule matched", "PS-MARGIN-018"],
                ["14:32:11", "Approval received", "Fahad · 15% cap"],
                ["14:32:12", "Proof recorded", "Decision D-8745123"],
              ].map(([time, title, detail], index) => (
                <article key={title}>
                  <time>{time}</time>
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <div>
                    <b>{title}</b>
                    <span>{detail}</span>
                  </div>
                </article>
              ))}
            </div>
            <article className="nlp-decision-output">
              <span>Active decision · Talabat</span>
              <h3>Weekend promotion exceeds the 18% margin floor.</h3>
              <p>QAR 21,900 in margin protection was recorded.</p>
              <dl>
                <div>
                  <dt>Approved cap</dt>
                  <dd>15%</dd>
                </div>
                <div>
                  <dt>Evidence record</dt>
                  <dd>D-8745123</dd>
                </div>
              </dl>
              <footer>
                <CircleCheck aria-hidden="true" /> Outcome recorded
              </footer>
            </article>
          </div>
        </section>

        <section className="nlp-section nlp-product" id="product" aria-labelledby="product-title">
          <SectionHeading
            number="03"
            eyebrow="The product"
            id="product-title"
            title="Use PrizeSkout before you book a demo."
            text="Choose a workflow and watch the same experience that merchants use inside the dashboard."
          />

          <div className="nlp-product-gallery">
            <figure className="nlp-product-window nlp-gallery-primary">
              <figcaption>
                <span>01 · Desktop</span>
                <b>PrizeSkout merchant dashboard</b>
                <a href="/access">
                  Open dashboard <ArrowRight aria-hidden="true" />
                </a>
              </figcaption>
              <img
                src={dashboardDesktop}
                alt="Actual PrizeSkout desktop dashboard overview"
                loading="lazy"
              />
            </figure>

            <figure className="nlp-product-window nlp-gallery-mobile">
              <figcaption>
                <span>02 · Mobile</span>
                <b>The same operator view on mobile</b>
              </figcaption>
              <div>
                <img
                  src={dashboardMobile}
                  alt="Actual PrizeSkout mobile dashboard overview"
                  loading="lazy"
                />
              </div>
            </figure>

            <figure className="nlp-product-window nlp-gallery-onboarding">
              <figcaption>
                <span>03 · Merchant setup</span>
                <b>Connect the business and channels</b>
                <a href="/onboarding">
                  Start setup <ArrowRight aria-hidden="true" />
                </a>
              </figcaption>
              <img
                src={onboardingDesktop}
                alt="Actual PrizeSkout merchant account setup page"
                loading="lazy"
              />
            </figure>
          </div>
        </section>

        <section className="nlp-section nlp-first-hours" aria-labelledby="first-hours-title">
          <SectionHeading
            number="04"
            eyebrow="Your first 48 hours"
            id="first-hours-title"
            title="Connect the stack. See the truth. Choose what happens next."
            text="The product stays in view while your own catalog, orders, agreements, and payouts replace the demonstration data."
          />

          <div className="nlp-onboarding-layout">
            <figure className="nlp-product-window">
              <figcaption>
                <span>Actual product page</span>
                <b>Merchant setup</b>
              </figcaption>
              <img
                src={onboardingDesktop}
                alt="PrizeSkout merchant onboarding account details page"
                loading="lazy"
              />
            </figure>
            <div className="nlp-onboarding-steps">
              {[
                ["01", "Connect catalog", "Zid and Salla use their existing workflows."],
                ["02", "Add evidence", "Upload agreements, statements, and receipts."],
                ["03", "Approve protection", "You control every protected action."],
              ].map(([number, title, detail]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div>
                    <b>{title}</b>
                    <p>{detail}</p>
                  </div>
                </article>
              ))}
              <a className="nlp-button nlp-button-primary" href="/onboarding">
                Start with your store <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="nlp-pricing" id="pricing" aria-labelledby="pricing-title">
          <div className="nlp-pricing-heading">
            <span>Simple pricing</span>
            <h2 id="pricing-title">Start with visibility. Scale into protection.</h2>
            <p>
              Clear limits, real capabilities and no hidden package assumptions. Choose the
              operating level that fits your business today.
            </p>
          </div>
          <p className="nlp-pricing-principle">
            Core delivers the complete PrizeSkout value loop. Growth adds automation and capacity.
            Enterprise adds scale and governance.
          </p>

          <div className="nlp-billing" role="group" aria-label="Billing frequency">
            <button
              type="button"
              aria-pressed={!annualBilling}
              className={!annualBilling ? "is-active" : ""}
              onClick={() => setAnnualBilling(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={annualBilling}
              className={annualBilling ? "is-active" : ""}
              onClick={() => setAnnualBilling(true)}
            >
              Annual <span>Save 20%</span>
            </button>
          </div>

          <div className="nlp-plan-grid">
            {plans.map((plan) => (
              <article className={plan.popular ? "is-popular" : ""} key={plan.name}>
                {plan.popular ? <em>Most popular</em> : null}
                <div className="nlp-plan-best">
                  <b>Best for</b>
                  <span>{plan.best}</span>
                </div>
                <h3>{plan.name}</h3>
                <strong>{annualBilling ? plan.annual : plan.monthly}</strong>
                {plan.name !== "Enterprise" ? <span>/ month</span> : null}
                {annualBilling && plan.name !== "Enterprise" ? (
                  <small>Billed annually</small>
                ) : null}
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check aria-hidden="true" /> {feature}
                    </li>
                  ))}
                </ul>
                <a href={plan.href}>
                  {plan.action} <ArrowRight aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="nlp-final-cta" aria-labelledby="final-cta-title">
          <span>Put the system to work</span>
          <h2 id="final-cta-title">Your margins should not depend on someone else’s dashboard.</h2>
          <p>Connect your commerce stack and put every order under active revenue protection.</p>
          <div>
            <a className="nlp-button nlp-button-primary" href="/onboarding">
              Connect your store <ArrowRight aria-hidden="true" />
            </a>
            <a className="nlp-button nlp-button-quiet" href="/contact">
              Book a demo
            </a>
          </div>
        </section>
      </div>

      <footer className="nlp-footer">
        <div className="nlp-footer-brand">
          <img src={logo} alt="PrizeSkout" />
          <p>The Economic Twin for commerce. Built in Qatar to protect margin across the Gulf.</p>
          <span>
            <i /> All systems operational
          </span>
        </div>
        {[
          ["Platform", "Economic Twin", "Margin Intelligence", "Payout Recovery", "Defend Loop"],
          ["Solutions", "Marketplaces", "Restaurant groups", "Retail and grocery", "Enterprise"],
          ["Company", "About", "Careers", "Security", "Press"],
          ["Resources", "Docs", "API reference", "Margin playbook", "Status"],
        ].map((column) => (
          <div className="nlp-footer-column" key={column[0]}>
            <b>{column[0]}</b>
            {column.slice(1).map((item) => (
              <a href="#top" key={item}>
                {item}
              </a>
            ))}
          </div>
        ))}
        <div className="nlp-footer-bottom">
          <span>© 2026 PrizeSkout. All rights reserved.</span>
          <span>
            <a href="/legal">Privacy</a>
            <a href="/legal">Terms</a>
          </span>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  number,
  eyebrow,
  id,
  title,
  text,
}: {
  number: string;
  eyebrow: string;
  id: string;
  title: string;
  text: string;
}) {
  return (
    <header className="nlp-section-heading">
      <div className="nlp-section-index">
        <span>{number}</span>
        <i />
      </div>
      <span className="nlp-eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
      <p>{text}</p>
    </header>
  );
}
