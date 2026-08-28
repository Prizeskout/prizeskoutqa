import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Menu, X } from "lucide-react";
import logo from "@/assets/logo-light.svg";
import qstpLogo from "@/assets/qstp-logo-colored.png";
import onboardingDesktop from "@/assets/landing/merchant-onboarding.png";
import defendLoopDesktop from "@/assets/landing/defend-loop.png";
import evidenceHistoryDesktop from "@/assets/landing/evidence-history.png";
import storeManagerDesktop from "@/assets/landing/ai-store-manager.png";
import "./NewLandingPage.css";

const QFC_LOGO = "/qfc-logo.svg";

const channels = [
  { name: "Deliveroo", logo: "/channel-logos/deliveroo.png" },
  { name: "Careem", logo: "/channel-logos/careem.png" },
  { name: "Mrsool", logo: "/channel-logos/mrsool.png" },
  { name: "Zid", logo: "/channel-logos/zid.png" },
  { name: "Salla", logo: "/channel-logos/salla.png" },
  { name: "Foodics", logo: "/channel-logos/foodics.png" },
  { name: "Talabat", logo: "/channel-logos/talabat.png" },
  { name: "Snoonu", logo: "/channel-logos/snoonu.png" },
  { name: "Jahez", logo: "/channel-logos/jahez.svg" },
  { name: "Rafeeq", logo: "/channel-logos/rafeeq.png" },
  { name: "Keeta", logo: "/channel-logos/keeta.svg" },
  { name: "HungerStation", logo: "/channel-logos/hungerstation.png" },
] as const;

const workflows = [
  {
    label: "01 · AI Store Manager",
    title: "Merchant-controlled operations",
    image: storeManagerDesktop,
    alt: "Current PrizeSkout AI Store Manager workspace",
    link: true,
  },
  {
    label: "02 · Defend Loop",
    title: "Merchant-controlled margin policy",
    image: defendLoopDesktop,
    alt: "Current PrizeSkout Defend Loop workspace",
    link: false,
  },
  {
    label: "03 · Evidence & History",
    title: "Permanent evidence record",
    image: evidenceHistoryDesktop,
    alt: "Current PrizeSkout Evidence and History workspace",
    link: true,
  },
] as const;

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
  const pageRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPageReady(true));
    const root = pageRef.current;
    if (!root) return () => window.cancelAnimationFrame(frame);

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }),
      { rootMargin: "0px 0px -10%", threshold: 0.12 },
    );
    root
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((element) => observer.observe(element));

    let scrollFrame = 0;
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        setNavScrolled(window.scrollY > 24);
        scrollFrame = 0;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(scrollFrame);
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const go = (id: string) => {
    scrollToSection(id);
    setMenuOpen(false);
  };

  return (
    <main ref={pageRef} className={`nlp ${pageReady ? "is-ready" : ""}`} id="top">
      <a className="nlp-skip" href="#main-content">
        Skip to main content
      </a>

      <header className={`nlp-nav-shell ${navScrolled ? "is-scrolled" : ""}`}>
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
              <i /> Deep-tech commerce infrastructure
            </span>
            <h1 id="nlp-hero-title">
              Know what every order <em>should earn.</em>
            </h1>
            <p>
              PrizeSkout compares orders, fees, agreements and payouts to find margin leaks,
              explain the cause, and prepare the evidence to recover what you are owed.
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
                See how it works <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className="nlp-hero-system"
            aria-label="How PrizeSkout protects the margin on every order"
          >
            <p className="nlp-visually-hidden">
              PrizeSkout brings together commerce data, reconstructs what each order should earn,
              finds missing margin, lets the merchant decide what happens next, and keeps the proof.
            </p>
            <div className="nlp-system-track" aria-hidden="true">
              <article className="nlp-system-card nlp-system-input">
                <span>Your commerce data</span>
                <strong>See the whole order</strong>
                <small>Orders, fees and payouts together</small>
              </article>

              <article className="nlp-system-card nlp-system-twin">
                <span>What should have happened</span>
                <strong>Know what you should earn</strong>
                <small>Every cost rebuilt order by order</small>
              </article>

              <article className="nlp-system-card nlp-system-policy">
                <span>What actually happened</span>
                <strong>Catch what is missing</strong>
                <small>Fees, discounts and payout gaps explained</small>
              </article>

              <article className="nlp-system-card nlp-system-action">
                <span>You stay in control</span>
                <strong>Choose what happens next</strong>
                <small>Review first. Approve every action.</small>
              </article>

              <article className="nlp-system-card nlp-system-evidence">
                <span>Nothing gets lost</span>
                <strong>Keep the proof</strong>
                <small>A clear record for every decision</small>
              </article>
            </div>
            <div className="nlp-system-caption" aria-hidden="true">
              <span>See the full picture</span>
              <i />
              <span>Find the difference</span>
              <i />
              <span>Decide with proof</span>
            </div>
          </div>

          <div className="nlp-source-line" id="integrations">
            <p className="nlp-source-heading">
              Connect your stack. Bring your POS and marketplace data together.
            </p>
            <div className="nlp-source-brands" aria-label="Supported commerce platforms">
              {[channels.slice(0, 6), channels.slice(6)].map((row, rowIndex) => (
                <ul className="nlp-source-row" key={rowIndex}>
                  {row.map((channel, channelIndex) => (
                    <li
                      key={channel.name}
                      style={{ "--channel-index": rowIndex * 6 + channelIndex } as React.CSSProperties}
                    >
                      <img src={channel.logo} alt="" />
                      <span>{channel.name}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        <aside className="nlp-credentials" aria-label="PrizeSkout credentials" data-reveal>
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

          <figure className="nlp-product-window nlp-product-window-featured" data-reveal>
            <figcaption>
              <span>Current product · Evidence &amp; History</span>
              <b>Permanent evidence record</b>
            </figcaption>
            <img
              src={evidenceHistoryDesktop}
              alt="Current PrizeSkout Evidence and History workspace"
              loading="lazy"
            />
          </figure>
        </section>

        <section className="nlp-section nlp-defend" aria-labelledby="defend-loop-title">
          <SectionHeading
            number="02"
            eyebrow="The Defend Loop"
            id="defend-loop-title"
            title="A decision completes in seconds."
            text="PrizeSkout detects risk, predicts the result, checks your rules, requests approval, and records proof."
          />

          <ol className="nlp-defend-flow" aria-label="Defend Loop decision sequence" data-reveal>
            {[
              "Detects risk",
              "Predicts the result",
              "Checks your rules",
              "Requests approval",
              "Records proof",
            ].map((step, index) => (
              <li key={step} style={{ "--flow-index": index } as React.CSSProperties}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{step}</b>
              </li>
            ))}
          </ol>

          <figure
            className="nlp-product-window nlp-product-window-featured nlp-defend-window"
            data-reveal
          >
            <figcaption>
              <span>Current product · Defend Loop</span>
              <b>Margin Policy Engine</b>
            </figcaption>
            <img
              src={defendLoopDesktop}
              alt="Current PrizeSkout Defend Loop and Margin Policy Engine workspace"
              loading="lazy"
            />
          </figure>
        </section>

        <section className="nlp-section nlp-product" id="product" aria-labelledby="product-title">
          <SectionHeading
            number="03"
            eyebrow="The product"
            id="product-title"
            title="Use PrizeSkout before you book a demo."
            text="Choose a workflow and watch the same experience that merchants use inside the dashboard."
          />

          <div
            className="nlp-workflow-tabs"
            role="tablist"
            aria-label="Product workflows"
            data-reveal
          >
            {workflows.map((workflow, index) => (
              <button
                key={workflow.label}
                id={`workflow-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={activeWorkflow === index}
                aria-controls={`workflow-panel-${index}`}
                tabIndex={activeWorkflow === index ? 0 : -1}
                onClick={() => setActiveWorkflow(index)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  const direction = event.key === "ArrowRight" ? 1 : -1;
                  const next = (activeWorkflow + direction + workflows.length) % workflows.length;
                  setActiveWorkflow(next);
                  document.getElementById(`workflow-tab-${next}`)?.focus();
                }}
              >
                <span>{workflow.label}</span>
                <b>{workflow.title}</b>
              </button>
            ))}
          </div>

          <div className="nlp-product-gallery" data-reveal>
            <figure
              id="workflow-panel-0"
              role="tabpanel"
              aria-labelledby="workflow-tab-0"
              hidden={activeWorkflow !== 0}
              className="nlp-product-window nlp-gallery-primary"
            >
              <figcaption>
                <span>01 · AI Store Manager</span>
                <b>Merchant-controlled operations</b>
                <a href="/access">
                  Open dashboard <ArrowRight aria-hidden="true" />
                </a>
              </figcaption>
              <img
                src={storeManagerDesktop}
                alt="Current PrizeSkout AI Store Manager workspace"
                loading="lazy"
              />
            </figure>

            <figure
              id="workflow-panel-1"
              role="tabpanel"
              aria-labelledby="workflow-tab-1"
              hidden={activeWorkflow !== 1}
              className="nlp-product-window nlp-gallery-primary"
            >
              <figcaption>
                <span>02 · Defend Loop</span>
                <b>Merchant-controlled margin policy</b>
              </figcaption>
              <img
                src={defendLoopDesktop}
                alt="Current PrizeSkout Defend Loop workspace"
                loading="lazy"
              />
            </figure>

            <figure
              id="workflow-panel-2"
              role="tabpanel"
              aria-labelledby="workflow-tab-2"
              hidden={activeWorkflow !== 2}
              className="nlp-product-window nlp-gallery-primary"
            >
              <figcaption>
                <span>03 · Evidence &amp; History</span>
                <b>Permanent evidence record</b>
                <a href="/access">
                  Open dashboard <ArrowRight aria-hidden="true" />
                </a>
              </figcaption>
              <img
                src={evidenceHistoryDesktop}
                alt="Current PrizeSkout Evidence and History workspace"
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

          <div className="nlp-onboarding-layout" data-reveal>
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

          <div className="nlp-plan-grid" data-reveal>
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
    <header className="nlp-section-heading" data-reveal>
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
