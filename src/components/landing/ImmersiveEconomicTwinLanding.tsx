import { useEffect, useMemo, useState } from "react";
import qstpLogo from "@/assets/qstp-logo-colored.png";
import { ArrowRight, Check, Menu, Search, Send, ShieldCheck, X } from "lucide-react";
import logo from "@/assets/logo-light.svg";
import "./ImmersiveEconomicTwinLanding.css";

const channels = ["Zid", "Salla", "Foodics", "Talabat", "Snoonu", "Jahez"];
const QFC_LOGO = "https://www.qfc.qa/media/h3gnto1u/qfc-logo-20.svg";
const costs = [
  ["Channel commission", "QAR 4.02", 54],
  ["Payment fees", "QAR 0.61", 12],
  ["Delivery share", "QAR 2.44", 34],
  ["Promotion dilution", "QAR 2.90", 40],
  ["Payout shortfall", "QAR 0.72", 14],
  ["Landed product cost", "QAR 7.48", 100],
] as const;
const reconcileOrders = [
  { channel: "Talabat", id: "8745123", city: "Riyadh", time: "14:32", revenue: 22.35, reported: 31.4, deductions: [4.02, 0.61, 2.44, 2.9, 0.72, 7.48] },
  { channel: "Jahez", id: "8745189", city: "Jeddah", time: "14:34", revenue: 31.8, reported: 38.1, deductions: [5.72, 0.83, 3.15, 2.1, 0.46, 8.24] },
  { channel: "Snoonu", id: "8745261", city: "Doha", time: "14:36", revenue: 27.4, reported: 34.6, deductions: [4.66, 0.74, 2.82, 1.35, 0.58, 7.86] },
] as const;
const productFlows = [
  {
    name: "True Margin Intelligence",
    prompt: "Show my true profit for Talabat orders today.",
    result:
      "True margin is 18.7%. Delivery share and promotion dilution removed QAR 5.34 per order.",
    metric: "18.7%",
    action: "Open 238 orders at risk",
  },
  {
    name: "Payout Recovery",
    prompt: "Check this Talabat settlement against my agreement.",
    result:
      "A QAR 96,000 commission difference was found. The approved agreement and 328 orders are attached.",
    metric: "QAR 96K",
    action: "Review recovery evidence",
  },
  {
    name: "Promotion Simulator",
    prompt: "Test a 20% weekend offer without crossing my margin floor.",
    result:
      "Promo A keeps a 21.3% margin and adds QAR 74,000 in net profit. Promo B crosses your floor.",
    metric: "QAR 74K",
    action: "Compare both scenarios",
  },
  {
    name: "Defend Loop",
    prompt: "Protect every product at an 18% contribution margin.",
    result:
      "Forty two Talabat products were protected. Eight risky changes are waiting for your approval.",
    metric: "42 SKUs",
    action: "Review protected actions",
  },
  {
    name: "AI Store Manager",
    prompt: "Prepare missing images and descriptions for my catalog.",
    result: "Twenty seven updates are ready. Nothing will be published until you approve it.",
    metric: "27 ready",
    action: "Open approval queue",
  },
  {
    name: "CFO Copilot",
    prompt: "Why did margin fall last week?",
    result:
      "A payout difference was the largest driver. It reduced true profit by QAR 134,000. I prepared the investigation.",
    metric: "QAR 134K",
    action: "Open the action plan",
  },
] as const;

export function ImmersiveEconomicTwinLanding() {
  const [menu, setMenu] = useState(false);
  const [reconcileStep, setReconcileStep] = useState(2);
  const [reconcileOrder, setReconcileOrder] = useState(0);
  const [loopStep, setLoopStep] = useState(0);
  const [flow, setFlow] = useState(0);
  const [copilotStep, setCopilotStep] = useState(0);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [pricingAnnual, setPricingAnnual] = useState(false);
  const [visibleScene, setVisibleScene] = useState({ hero: true, loop: false, product: false, case: false });
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useEffect(() => {
    if (reduced) return;
    document.querySelector(".et")?.classList.add("motion-ready");
    if (!visibleScene.hero) return;
    const delay = reconcileStep >= 6 ? 1900 : [180, 250, 150, 270][reconcileStep - 2];
    const timer = window.setTimeout(() => {
      if (reconcileStep >= 6) {
        setReconcileOrder((value) => (value + 1) % reconcileOrders.length);
        setReconcileStep(2);
      } else setReconcileStep((value) => value + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [reconcileOrder, reconcileStep, reduced, visibleScene.hero]);
  useEffect(() => {
    if (reduced || !visibleScene.loop) return;
    const timer = window.setTimeout(
      () => setLoopStep((value) => value >= 4 ? 0 : value + 1),
      loopStep >= 4 ? 2400 : 620,
    );
    return () => clearTimeout(timer);
  }, [loopStep, reduced, visibleScene.loop]);
  useEffect(() => {
    if (reduced || !visibleScene.case) return;
    const timer = window.setTimeout(
      () => setOnboardingStep((value) => value >= 2 ? 0 : value + 1),
      onboardingStep >= 2 ? 2200 : 620,
    );
    return () => clearTimeout(timer);
  }, [onboardingStep, reduced, visibleScene.case]);
  useEffect(() => {
    if (reduced || !visibleScene.product || copilotStep >= 5) return;
    const timer = window.setTimeout(() => setCopilotStep((value) => value + 1), 140);
    return () => clearTimeout(timer);
  }, [copilotStep, flow, reduced, visibleScene.product]);
  useEffect(() => {
    if (reduced || !visibleScene.product) return;
    const timer = window.setInterval(() => {
      setFlow((value) => (value + 1) % productFlows.length);
      setCopilotStep(0);
    }, 3200);
    return () => clearInterval(timer);
  }, [reduced, visibleScene.product]);
  useEffect(() => {
    if (reduced) return;
    const targets = document.querySelectorAll(".et-head, .et-section > .et-dashboard-window, .et-product-experience, .et-footer > div");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("motion-in"); observer.unobserve(entry.target); }
    }), { threshold: 0.14, rootMargin: "0px 0px -8%" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [reduced]);
  useEffect(() => {
    if (reduced) return;
    const ids = ["top", "loop", "product", "case"] as const;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const key = entry.target.id === "top" ? "hero" : entry.target.id as "loop" | "product" | "case";
      setVisibleScene((current) => ({ ...current, [key]: entry.isIntersecting }));
    }), { threshold: 0.28 });
    ids.forEach((id) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [reduced]);
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenu(false);
  };
  const found = Math.min(reconcileStep, 6);
  const activeOrder = reconcileOrders[reconcileOrder];
  const contribution = activeOrder.revenue - activeOrder.deductions.slice(0, found).reduce((sum, value) => sum + value, 0);
  const trueMargin = (contribution / activeOrder.revenue) * 100;
  const activeFlow = productFlows[flow];
  const loopEvents = [
    ["14:32:08", "Risk detected", "Talabat promotion signal"],
    ["14:32:08", "Impact calculated", "Projected margin 12.6%"],
    ["14:32:09", "Rule matched", "PS-MARGIN-018"],
    ["14:32:11", "Approval received", "Fahad · 15% cap"],
    ["14:32:12", "Proof recorded", "Decision D-8745123"],
  ] as const;
  const loopOutputs = [
    ["Risk intercepted", "Promotion detected", "Requested discount", "20%"],
    ["Margin at risk", "Projected margin", "12.6%", "−5.4 pts"],
    ["Blocked automatically", "Margin floor", "18%", "Rule PS-MARGIN-018"],
    ["Safer offer approved", "Approved cap", "15%", "Approved by Fahad"],
    ["QAR 21.9K protected", "Evidence record", "D-8745123", "Immutable proof saved"],
  ] as const;
  return (
    <main className="et et-live-product">
      <nav className="et-nav">
        <button onClick={() => go("top")} className="et-logo">
          <img src={logo} alt="PrizeSkout" />
        </button>
        <div className={`et-links ${menu ? "open" : ""}`}>
          <button onClick={() => go("product")}>Product</button>
          <button onClick={() => go("loop")}>Platform</button>
          <a href="#pricing">Pricing</a>
          <button onClick={() => go("integrations")}>Integrations</button>
          <a className="et-mobile-nav-action et-mobile-demo" href="mailto:hello@prizeskout.com?subject=Book a demo">Book a demo</a>
          <a className="et-mobile-nav-action" href="/access">Merchant login</a>
        </div>
        <div className="et-actions">
          <button className="et-nav-utility" type="button">Qatar · QAR</button>
          <button className="et-nav-utility" type="button">English</button>
          <a className="et-btn hot" href="mailto:hello@prizeskout.com?subject=Book a demo">
            Book a demo
          </a>
          <a className="et-merchant-login" href="/access">Merchant login</a>
        </div>
        <button className="et-menu" onClick={() => setMenu(!menu)}>
          {menu ? <X /> : <Menu />}
        </button>
      </nav>
      <section className="et-hero" id="top">
        <div className="et-copy">
          <span className="et-kicker">ECONOMIC TWIN IS LIVE</span>
          <h1>
            Reported profit is a story.
            <br />
            <em>True profit</em> is a system.
          </h1>
          <p>
            PrizeSkout reconstructs the real unit economics of every order across every channel. It
            predicts the profit impact of every commercial action and protects your margin while you
            sleep.
          </p>
          <div className="et-ctas">
            <a className="et-btn hot" href="mailto:hello@prizeskout.com?subject=Book a demo">
              Book a demo
            </a>
            <button className="et-btn ghost" onClick={() => go("twin")}>
              Watch your order reconcile <ArrowRight />
            </button>
          </div>
        </div>
        <div className="et-dashboard-window et-reconcile-window">
          <DashboardChrome
            title="True Margin Intelligence"
            status={found < 6 ? "Reconciling order" : "Verified"}
          />
          <div className="et-dashboard-content" key={activeOrder.id}>
            <div className="et-order-line">
              <span><i>{activeOrder.channel}</i> Order {activeOrder.id} · {activeOrder.city} · {activeOrder.time}</span>
              <strong>
                {found < 6 ? `${found} records verified · ${6 - found} checking` : "Verified from 6 source records"}
              </strong>
            </div>
            <div className="et-ledger-summary">
              <div><small>Order revenue</small><b>QAR {activeOrder.revenue.toFixed(2)}</b></div>
              <div><small>Reported margin</small><b>{activeOrder.reported.toFixed(1)}%</b></div>
              <div className="actual"><small>True margin</small><b>{trueMargin.toFixed(1)}%</b></div>
            </div>
            <div className="et-ledger-head"><span>Evidence</span><span>Source record</span><span>Deduction</span></div>
            <div className="et-cost-stream">
              {costs.map((cost, index) => (
                <div className={index < found ? `found ${index === found - 1 ? "latest" : ""}` : "waiting"} key={cost[0]}>
                  <span><Check />{cost[0]}</span>
                  <small>{["Commission agreement §4.2", "Payment settlement", "Delivery invoice", "Campaign PROMO-218", "Payout statement #815", "Catalog cost record"][index]}</small>
                  <strong>{index < found ? `− QAR ${activeOrder.deductions[index].toFixed(2)}` : ["Reading agreement", "Linking settlement", "Linking invoice", "Checking campaign", "Checking payout", "Reading catalog"][index]}</strong>
                </div>
              ))}
            </div>
            <div className="et-live-result">
              <span><small>True contribution</small>
                {found < 6 ? "True contribution updates as evidence arrives" : "True contribution verified"}
              </span>
              <div><b>QAR {contribution.toFixed(2)}</b><strong>{trueMargin.toFixed(1)}% margin</strong></div>
            </div>
          </div>
        </div>
        <div className="et-channels" id="integrations">
          <small>LIVE SOURCES</small>
          <div className="et-channel-track">
            {[...channels, ...channels].map((channel, index) => <span aria-hidden={index >= channels.length} key={`${channel}-${index}`}><i>{channel[0]}</i>{channel}</span>)}
          </div>
        </div>
      </section>
      <aside className="et-credentials" aria-label="PrizeSkout credentials">
        <div><span>Backed by</span><img className="et-qstp-credential" src={qstpLogo} alt="Qatar Science and Technology Park" /></div>
        <i aria-hidden="true" />
        <div><span>Licensed by</span><img className="et-qfc-credential" src={QFC_LOGO} alt="Qatar Financial Centre" /><b>04412</b></div>
      </aside>
      <section className="et-section et-dark" id="twin">
        <Head
          eyebrow="THE ECONOMIC TWIN"
          title="Every number arrives with its evidence."
          text="Watch PrizeSkout build one trusted order from six live sources."
        />
        <div className="et-dashboard-window et-ledger-experience">
          <DashboardChrome title="Economic Twin" status="Sources connected" />
          <div className="et-source-rail">
            {channels.map((channel, index) => (
              <div className={index <= found ? "active" : ""} key={channel}>
                <span>{channel[0]}</span>
                <b>{channel}</b>
                <small>{index <= found ? "Synced" : "Waiting"}</small>
              </div>
            ))}
          </div>
          <div className="et-ledger-workspace">
            <div className="et-order-table">
              <header>
                <span>Source record</span>
                <span>Evidence</span>
                <span>Confidence</span>
              </header>
              {costs.slice(0, 5).map((row, index) => (
                <div className={index < found ? "arrived" : ""} key={row[0]}>
                  <span>{row[0]}</span>
                  <span>{index < found ? "Matched to order 8745123" : "Reading source"}</span>
                  <strong>{index < found ? `${99 - index * 2}%` : ""}</strong>
                </div>
              ))}
            </div>
            <div className="et-twin-side">
              <small>LIVE ECONOMIC TWIN</small>
              <b>QAR 4.18</b>
              <span>True profit per order</span>
              <div>
                <ShieldCheck /> Six source records retain their original evidence.
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="et-section et-dark et-loop" id="loop">
        <Head
          eyebrow="THE DEFEND LOOP"
          title="A decision completes in seconds."
          text="PrizeSkout detects risk, predicts the result, checks your rules, requests approval, and records proof."
        />
        <div className="et-dashboard-window et-loop-experience">
          <DashboardChrome
            title="Defend Loop"
            status={loopStep === 4 ? "Outcome recorded" : "Decision running"}
          />
          <div className={`et-decision-workspace stage-${loopStep}`}>
            <div className="et-event-trail">
              <header><span>TIME</span><span>DECISION EVENT</span></header>
              {loopEvents.map((event, index) => (
                <div className={index === loopStep ? "active" : index < loopStep ? "done" : "pending"} key={event[1]}>
                  <time>{event[0]}</time><span><b>{event[1]}</b><small>{event[2]}</small></span>
                </div>
              ))}
            </div>
            <div className="et-decision-detail">
              <small>ACTIVE DECISION · TALABAT</small>
              <h3>Weekend promotion exceeds the 18% margin floor.</h3>
              <p>
                {
                  [
                    "Talabat promotion signal received.",
                    "Expected margin falls to 12.6%.",
                    "Your 18% floor blocks automatic execution.",
                    "Fahad approved a 15% discount cap.",
                    "QAR 21,900 in margin protection was recorded.",
                  ][loopStep]
                }
              </p>
            </div>
            <div className={`et-decision-output state-${loopStep}`}>
              <small>SYSTEM OUTPUT</small>
              <b>{loopOutputs[loopStep][0]}</b>
              <dl><dt>{loopOutputs[loopStep][1]}</dt><dd>{loopOutputs[loopStep][2]}</dd></dl>
              <span>{loopOutputs[loopStep][3]}</span>
            </div>
          </div>
        </div>
      </section>
      <section className="et-section et-surface" id="product">
        <Head
          eyebrow="THE PRODUCT"
          title="Use PrizeSkout before you book a demo."
          text="Choose a workflow and watch the same experience that merchants use inside the dashboard."
        />
        <div className="et-product-experience">
          <div className="et-app-nav">
            {productFlows.map((item, index) => (
              <button
                className={flow === index ? "active" : ""}
                onClick={() => {
                  setFlow(index);
                  setCopilotStep(0);
                }}
                key={item.name}
              >
                <span>{index + 1}</span>
                {item.name}
              </button>
            ))}
          </div>
          <div className={`et-product-stage flow-${flow} stage-${copilotStep}`}>
            <ProductFlowDemo flow={flow} step={copilotStep} item={activeFlow} />
          </div>
        </div>
      </section>
      <section className="et-section et-case" id="case">
        <Head
          eyebrow="YOUR FIRST 48 HOURS"
          title="Connect the stack. See the truth. Choose what happens next."
          text="The product stays in view while your own catalog, orders, agreements, and payouts replace the demonstration data."
        />
        <div className="et-dashboard-window et-onboarding-experience">
          <DashboardChrome title="Workspace import" status="Replacing demonstration data" />
          <div className={`et-import-workspace stage-${onboardingStep}`}>
            <nav className="et-import-timeline">
              {[["Connect catalog", "Zid and Salla use their existing workflows."], ["Add evidence", "Upload agreements, statements, and receipts."], ["Approve protection", "You control every protected action."]].map((item, index) => <div className={index === onboardingStep ? "active" : index < onboardingStep ? "done" : "pending"} key={item[0]}><i>{index < onboardingStep ? "✓" : index + 1}</i><span><b>{item[0]}</b><small>{item[1]}</small></span></div>)}
            </nav>
            <div className="et-import-record" key={onboardingStep}>
              <small>{["CATALOG SOURCE", "EVIDENCE COVERAGE", "PROTECTION POLICY"][onboardingStep]}</small>
              <h3>{["Replacing demo catalog with Zid", "Matching commercial evidence", "Preparing your margin floor"][onboardingStep]}</h3>
              <div className="et-import-rows">
                {([[["Products", "1,248 records"], ["Price lists", "6 connected"], ["Categories", "84 mapped"]], [["Talabat agreement", "Matched"], ["August statement", "Matched"], ["Order receipts", "328 linked"]], [["Margin floor", "18%"], ["Approval owner", "Fahad"], ["Automatic actions", "Blocked"]]] as const)[onboardingStep].map((row, index) => <div style={{ animationDelay: `${index * 90}ms` }} key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}
              </div>
            </div>
            <aside className="et-readiness">
              <small>WORKSPACE READINESS</small><b>{["42%", "76%", "Ready"][onboardingStep]}</b>
              <dl><dt>Catalog</dt><dd>{onboardingStep > 0 ? "Connected" : "Importing"}</dd><dt>Evidence</dt><dd>{onboardingStep > 1 ? "Covered" : onboardingStep ? "Matching" : "Waiting"}</dd><dt>Protection</dt><dd>{onboardingStep === 2 ? "Ready" : "Pending"}</dd></dl>
              <a className="et-btn hot" href="mailto:hello@prizeskout.com?subject=Book a demo">Start with your store <ArrowRight /></a>
            </aside>
          </div>
        </div>
      </section>
      <section className="et-pricing" id="pricing">
        <div className="et-pricing-head">
          <span>Simple pricing</span>
          <h2>Start with visibility. Scale into protection.</h2>
          <p>Clear limits, real capabilities and no hidden package assumptions. Choose the operating level that fits your business today.</p>
        </div>
        <p className="et-pricing-principle">Core delivers the complete PrizeSkout value loop. Growth adds automation and capacity. Enterprise adds scale and governance.</p>
        <div className="et-billing-toggle" role="group" aria-label="Billing frequency">
          <button type="button" aria-pressed={!pricingAnnual} className={!pricingAnnual ? "active" : ""} onClick={() => setPricingAnnual(false)}>Monthly</button>
          <button type="button" aria-pressed={pricingAnnual} className={pricingAnnual ? "active" : ""} onClick={() => setPricingAnnual(true)}>Annual <span>Save 20%</span></button>
        </div>
        <div className="et-price-grid">
          {[
            { name: "Core", best: "One store ready to run and protect profit", price: pricingAnnual ? "QAR 279" : "QAR 349", features: ["Understand true profit and payout health", "Set margin policies and approve protected actions", "Use CFO Copilot and AI Store Manager"], href: "/onboarding" },
            { name: "Growth", best: "A growing team ready for more leverage", price: pricingAnnual ? "QAR 879" : "QAR 1,099", popular: true, features: ["Everything in Core", "Automate protected workflows", "Audit discrepancies and prepare recovery evidence"], href: "/onboarding" },
            { name: "Enterprise", best: "Groups that need scale and governance", price: "Custom", features: ["Everything in Growth", "Coordinate stores, teams and entities", "Apply group controls, APIs and service levels"], href: "/contact" },
          ].map(plan => <article className={plan.popular ? "popular" : ""} key={plan.name}>
            {plan.popular && <em>Most popular</em>}
            <div className="et-best-for"><b>Best for</b><span>{plan.best}</span></div>
            <h3>{plan.name}</h3><strong>{plan.price}</strong>{plan.name !== "Enterprise" && <span>/ month</span>}
            {pricingAnnual && plan.name !== "Enterprise" && <small>Billed annually</small>}
            <ul>{plan.features.map(feature => <li key={feature}>✓ {feature}</li>)}</ul>
            <a href={plan.href}>{plan.name === "Enterprise" ? "Talk to sales" : plan.name === "Growth" ? "Choose Growth" : "Get started"}</a>
          </article>)}
        </div>
      </section>
      <section className="et-final-cta">
        <h2>Your margins should not depend on someone else’s dashboard.</h2>
        <p>Connect your commerce stack and put every order under active revenue protection.</p>
        <div className="et-final-actions"><a href="/onboarding">Connect your store</a><a href="/contact">Book a demo</a></div>
      </section>
      <footer className="et-footer">
        <div>
          <img src={logo} alt="PrizeSkout" />
          <p>The Economic Twin for commerce. Built in Qatar to protect margin across the Gulf.</p>
          <small>ALL SYSTEMS OPERATIONAL</small>
        </div>
        {[
          ["PLATFORM", "Economic Twin", "Margin Intelligence", "Payout Recovery", "Defend Loop"],
          ["SOLUTIONS", "Marketplaces", "Restaurant groups", "Retail and grocery", "Enterprise"],
          ["COMPANY", "About", "Careers", "Security", "Press"],
          ["RESOURCES", "Docs", "API reference", "Margin playbook", "Status"],
        ].map((column) => (
          <div key={column[0]}>
            <b>{column[0]}</b>
            {column.slice(1).map((item) => (
              <a href="#top" key={item}>
                {item}
              </a>
            ))}
          </div>
        ))}
        <section>
          <span>© 2026 PRIZESKOUT. ALL RIGHTS RESERVED.</span>
          <span>Privacy&nbsp;&nbsp; Terms</span>
        </section>
      </footer>
    </main>
  );
}

function DashboardChrome({ title, status }: { title: string; status: string }) {
  return (
    <header className="et-dashboard-chrome">
      <div>
        <i />
        <i />
        <i />
      </div>
      <b>PrizeSkout</b>
      <span>{title}</span>
      <em>
        <i />
        {status}
      </em>
    </header>
  );
}
function Head({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="et-head">
      <div>
        <span className="et-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function ProductFlowDemo({
  flow,
  step,
  item,
}: {
  flow: number;
  step: number;
  item: (typeof productFlows)[number];
}) {
  const visible = (at: number) => (step >= at ? "show" : "");
  if (flow === 0)
    return (
      <div className="et-dashboard-window et-copilot-window et-native-demo" key={flow}>
        <DashboardChrome title={item.name} status="Reconstructing orders" />
        <DemoToolbar tabs={["Order economics", "Margin bridge", "Cost evidence"]} actions={["Talabat ▾", "Last 7 days ▾"]} />
        <div className="et-native-body">
          <div className="et-native-kpis">
            <div>
              <small>REPORTED MARGIN</small>
              <b>31.4%</b>
            </div>
            <ArrowRight />
            <div className="accent">
              <small>TRUE MARGIN</small>
              <b className={visible(2)}>18.7%</b>
            </div>
          </div>
          <div className="et-native-list">
            {[
              "Channel commission",
              "Payment fees",
              "Delivery share",
              "Promotion dilution",
              "Landed cost",
            ].map((label, index) => (
              <div className={visible(index + 1)} key={label}>
                <Check />
                <span>{label}</span>
                <i>
                  <b style={{ width: `${88 - index * 11}%` }} />
                </i>
                <strong>
                  {["QAR 4.02", "QAR 0.61", "QAR 2.44", "QAR 2.90", "QAR 7.48"][index]}
                </strong>
              </div>
            ))}
          </div>
          <div className={`et-native-outcome ${visible(5)}`}>
            <span>True contribution verified across 238 orders</span>
            <b>
              Open orders at risk <ArrowRight />
            </b>
          </div>
        </div>
      </div>
    );
  if (flow === 1)
    return (
      <div className="et-dashboard-window et-copilot-window et-native-demo" key={flow}>
        <DashboardChrome title={item.name} status="Matching settlement" />
        <DemoToolbar tabs={["Commission audit", "Statements", "Recovery cases"]} actions={["Upload statement", "01–15 Aug ▾"]} />
        <div className="et-native-body">
          <div className="et-match-head">
            <span>Talabat settlement · 01–15 Aug</span>
            <b>328 orders matched</b>
          </div>
          <div className="et-settlement-grid">
            <div>
              <small>EXPECTED PAYOUT</small>
              <b>QAR 842,610</b>
            </div>
            <div>
              <small>RECEIVED</small>
              <b>QAR 746,610</b>
            </div>
            <div className={`danger ${visible(2)}`}>
              <small>DIFFERENCE FOUND</small>
              <b>− QAR 96,000</b>
            </div>
          </div>
          <div className="et-evidence-stack">
            {["Signed commission agreement", "Settlement statement", "328 order records"].map(
              (label, index) => (
                <div className={visible(index + 2)} key={label}>
                  <Check />
                  <span>{label}</span>
                  <strong>Attached</strong>
                </div>
              ),
            )}
          </div>
          <button className={`et-native-action ${visible(5)}`}>
            Prepare recovery case <ArrowRight />
          </button>
        </div>
      </div>
    );
  if (flow === 2)
    return (
      <div className="et-dashboard-window et-copilot-window et-native-demo" key={flow}>
        <DashboardChrome title={item.name} status="Running scenarios" />
        <DemoToolbar tabs={["Scenario builder", "Saved simulations"]} actions={["Talabat", "Save scenario"]} />
        <div className="et-native-body">
          <div className="et-simulator-form">
            <label>Campaign type<select defaultValue="discount"><option value="discount">Percentage discount</option></select></label>
            <label>Discount<input value="20%" readOnly /></label>
            <label>Duration<input value="14 days" readOnly /></label>
            <label>Protected margin floor<input value="18%" readOnly /></label>
          </div>
          <div className="et-scenario-controls">
            <span>
              Discount <b>20%</b>
            </span>
            <i>
              <b style={{ width: `${Math.min(100, 30 + step * 12)}%` }} />
            </i>
            <span>
              Duration <b>14 days</b>
            </span>
          </div>
          <div className="et-scenario-grid">
            <div className={visible(2)}>
              <small>BASELINE</small>
              <b>18.7%</b>
              <span>Current margin</span>
            </div>
            <div className={`winner ${visible(3)}`}>
              <small>SAFE PLAN · 15%</small>
              <b>21.3%</b>
              <span>+ QAR 74K net profit</span>
            </div>
            <div className={`danger ${visible(4)}`}>
              <small>REQUESTED · 20%</small>
              <b>12.6%</b>
              <span>Below 18% floor</span>
            </div>
          </div>
          <div className={`et-native-outcome ${visible(5)}`}>
            <span>Safer promotion prepared</span>
            <b>
              Compare scenarios <ArrowRight />
            </b>
          </div>
        </div>
      </div>
    );
  if (flow === 3)
    return (
      <div className="et-dashboard-window et-copilot-window et-native-demo" key={flow}>
        <DashboardChrome title={item.name} status="Protection active" />
        <DemoToolbar tabs={["Decision inbox", "Policies", "Evidence log"]} actions={["All channels ▾", "Pending approval (8)"]} />
        <div className="et-native-body">
          <div className="et-decision-queue">
            <button className="active"><b>Weekend promotion</b><span>Margin floor breached</span></button>
            <button><b>Price update · 12 SKUs</b><span>Awaiting rule check</span></button>
            <button><b>Catalog publish</b><span>Ready for approval</span></button>
          </div>
          <div className="et-defend-track">
            {["Detect", "Predict", "Check rules", "Request approval", "Record proof"].map(
              (label, index) => (
                <div className={step >= index ? "show" : ""} key={label}>
                  <i>{step > index ? <Check /> : index + 1}</i>
                  <span>{label}</span>
                </div>
              ),
            )}
          </div>
          <div className="et-defend-event">
            <small>WEEKEND PROMOTION</small>
            <h3>18% margin floor protects 42 products</h3>
            <p>
              {
                [
                  "Risk signal received",
                  "Impact model running",
                  "Unsafe discount blocked",
                  "Safer 15% cap awaiting approval",
                  "Decision recorded with evidence",
                  "Protection remains active",
                  "Monitoring next change",
                ][step]
              }
            </p>
            <strong>{step >= 4 ? "QAR 21.9K protected" : `${Math.min(step + 1, 5)} of 5`}</strong>
          </div>
        </div>
      </div>
    );
  return (
    <div className="et-dashboard-window et-copilot-window" key={flow}>
      <DashboardChrome title={item.name} status={flow === 4 ? "Work prepared" : "Live dashboard"} />
      <div className="et-copilot-body">
        <div className="et-prompt-box">
          <Search />
          <span className={step === 0 ? "typing" : ""}>
            {item.prompt.slice(0, step === 0 ? 16 : undefined)}
          </span>
          <button>
            <Send />
          </button>
        </div>
        <div className={`et-thinking ${step > 0 && step < (flow === 4 ? 2 : 3) ? "show" : ""}`}>
          <i />
          <i />
          <i />
          <span>{flow === 4 ? "Checking catalog requirements" : "Reading connected records"}</span>
        </div>
        <div className={`et-answer-card ${visible(flow === 4 ? 2 : 3)}`}>
          <div>
            <small>{flow === 4 ? "PREPARED STORE WORK" : "PRIZESKOUT ANSWER"}</small>
            <p>{item.result}</p>
          </div>
          <strong>{item.metric}</strong>
        </div>
        <div className={`et-result-drivers ${visible(flow === 4 ? 3 : 4)}`}>
          <div>
            <span>{flow === 4 ? "Images" : "Orders"}</span>
            <b style={{ width: "91%" }} />
          </div>
          <div>
            <span>{flow === 4 ? "Descriptions" : "Agreement"}</span>
            <b style={{ width: "76%" }} />
          </div>
          <div>
            <span>{flow === 4 ? "Approvals" : "Payout evidence"}</span>
            <b style={{ width: "84%" }} />
          </div>
        </div>
        <button className={`et-next-action ${visible(flow === 4 ? 4 : 5)}`}>
          {item.action}
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

function DemoToolbar({ tabs, actions }: { tabs: string[]; actions: string[] }) {
  return <div className="et-demo-toolbar"><div className="et-demo-tabs">{tabs.map((tab, index) => <span className={index === 0 ? "active" : ""} key={tab}>{tab}</span>)}</div><div>{actions.map(action => <button key={action}>{action}</button>)}</div></div>;
}
