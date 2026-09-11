import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Database,
  KeyRound,
  Network,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Store,
  Webhook,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/guides/integration-paths")({
  head: () => ({
    meta: [
      { title: "Integration paths | PrizeSkout Docs" },
      {
        name: "description",
        content:
          "Choose how your business sends commerce data to PrizeSkout. Covers direct API delivery, managed POS and ERP connectors, delivery platform integrations, identity mapping, testing and production launch.",
      },
    ],
  }),
  component: IntegrationPathsPage,
});

const ORDER_EXAMPLE = `curl -X POST "https://prizeskout.qa/api/public/v1/commerce/order-batches" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "batch_id": "acme-pos:2026-09-11:001",
    "source_provider": "acme-pos",
    "schema_version": "2026-09-05",
    "delivery_complete": true,
    "declared_record_count": 1,
    "orders": [{
      "external_event_id": "evt_100045",
      "external_order_id": "ord_100045",
      "occurred_at": "2026-09-11T18:42:10Z",
      "business_date": "2026-09-11",
      "currency": "QAR",
      "channel": "direct",
      "status": "completed",
      "final": true,
      "legal_entity_external_id": "entity_qa",
      "brand_external_id": "brand_01",
      "branch_external_id": "branch_west_bay",
      "revenue_center_external_id": "dine_in",
      "settlement_reference": null,
      "gross_amount": 105,
      "discount_amount": 10,
      "tax_amount": 0,
      "service_charge_amount": 0,
      "delivery_charge_amount": 0,
      "refund_amount": 0,
      "cancellation_amount": 0,
      "net_amount": 95,
      "lines": [{
        "external_line_id": "line_1",
        "sku": "BURGER-01",
        "name": "Classic burger",
        "quantity": 1,
        "gross_amount": 105,
        "discount_amount": 10,
        "tax_amount": 0,
        "modifiers": []
      }]
    }]
  }'`;

const CONNECTION_EXAMPLE = `curl -X POST "https://prizeskout.qa/api/public/v1/connectors" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "merchant_doha_01",
    "provider": "odoo",
    "environment": "sandbox",
    "auth_method": "api_key",
    "requested_capabilities": ["branches.read", "orders.read"],
    "configuration": {
      "base_url": "https://example.odoo.com",
      "database": "example-production",
      "currency": "QAR"
    }
  }'`;

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ip-code">
      <button
        type="button"
        className="ip-copy"
        aria-label="Copy code example"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ip-section">
      <div className="ip-eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const STEPS = [
  [
    "1",
    "Identify the account",
    "Agree the merchant, legal entity, brands and branches that the integration represents.",
  ],
  [
    "2",
    "Choose a delivery path",
    "Push records to PrizeSkout, authorize a managed connector, or use a partner integration.",
  ],
  [
    "3",
    "Map identities",
    "Link source branch IDs and SKUs to the merchant's approved PrizeSkout identities.",
  ],
  [
    "4",
    "Send evidence",
    "Start with orders, then add product costs, settlements and payout confirmations.",
  ],
  [
    "5",
    "Verify the twin",
    "Compare source totals, unmatched records and calculated economics before approving production.",
  ],
] as const;

function IntegrationPathsPage() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <div className="ip-page">
        <style>{`
          .ip-page { --ink:#171715; --muted:#686862; --line:#e6e5df; --paper:#fbfbf8; --orange:#e95414; background:var(--paper); color:var(--ink); min-height:100vh; }
          .ip-wrap { max-width:1240px; margin:0 auto; padding:0 24px; }
          .ip-hero { border-bottom:1px solid var(--line); padding:72px 0 56px; background:radial-gradient(circle at 84% 18%, rgba(233,84,20,.09), transparent 27%), #fff; }
          .ip-kicker,.ip-eyebrow { color:var(--orange); font-size:11px; font-weight:750; letter-spacing:.12em; text-transform:uppercase; }
          .ip-hero h1 { max-width:820px; font-size:clamp(38px,6vw,68px); line-height:1.02; letter-spacing:-.045em; margin:16px 0 20px; }
          .ip-hero p { max-width:700px; color:#51514c; font-size:18px; line-height:1.65; margin:0; }
          .ip-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:30px; }
          .ip-primary,.ip-secondary { min-height:44px; display:inline-flex; align-items:center; gap:8px; padding:0 17px; border-radius:8px; font-size:14px; font-weight:650; text-decoration:none; transition:transform .18s ease, background .18s ease; }
          .ip-primary { background:var(--ink); color:#fff; } .ip-secondary { color:var(--ink); background:#fff; border:1px solid var(--line); }
          .ip-primary:hover,.ip-secondary:hover { transform:translateY(-1px); }
          .ip-layout { display:grid; grid-template-columns:220px minmax(0,1fr); gap:72px; align-items:start; }
          .ip-nav { position:sticky; top:70px; padding:42px 0; }
          .ip-nav strong { display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; margin-bottom:12px; }
          .ip-nav a { display:block; color:#686862; text-decoration:none; font-size:13px; padding:7px 0; } .ip-nav a:hover { color:var(--orange); }
          .ip-main { max-width:860px; padding-bottom:100px; }
          .ip-section { padding:64px 0 8px; scroll-margin-top:96px; }
          .ip-section h2 { font-size:clamp(28px,4vw,40px); letter-spacing:-.03em; line-height:1.12; margin:10px 0 16px; }
          .ip-section>p { color:var(--muted); line-height:1.75; font-size:16px; max-width:760px; }
          .ip-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:28px; }
          .ip-card { background:#fff; border:1px solid var(--line); border-radius:12px; padding:22px; }
          .ip-card svg { color:var(--orange); } .ip-card h3 { font-size:16px; margin:16px 0 8px; } .ip-card p { color:var(--muted); font-size:13.5px; line-height:1.65; margin:0; }
          .ip-badge { display:inline-flex; border:1px solid var(--line); border-radius:99px; padding:4px 8px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; margin-top:14px; }
          .ip-flow { margin-top:26px; border-top:1px solid var(--line); }
          .ip-step { display:grid; grid-template-columns:42px 190px 1fr; gap:12px; padding:18px 0; border-bottom:1px solid var(--line); align-items:start; }
          .ip-step span { width:28px; height:28px; display:grid; place-items:center; border-radius:50%; background:var(--ink); color:#fff; font:600 12px ui-monospace,monospace; }
          .ip-step strong { font-size:14px; } .ip-step p { color:var(--muted); font-size:13.5px; line-height:1.55; margin:0; }
          .ip-code { position:relative; background:#0b0d0f; border:1px solid #25282d; border-radius:12px; margin-top:24px; overflow:auto; }
          .ip-code pre { margin:0; padding:50px 20px 22px; min-width:680px; color:#e8e8e3; font:12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace; }
          .ip-copy { position:absolute; right:10px; top:10px; min-height:32px; display:flex; align-items:center; gap:6px; border:1px solid #34383e; border-radius:6px; padding:0 9px; background:#171a1e; color:#ccc; cursor:pointer; }
          .ip-table { border:1px solid var(--line); border-radius:12px; overflow:hidden; margin-top:24px; background:#fff; }
          .ip-row { display:grid; grid-template-columns:170px 1fr 1fr; border-bottom:1px solid var(--line); } .ip-row:last-child { border-bottom:0; }
          .ip-row>* { padding:14px 16px; font-size:13px; line-height:1.55; } .ip-row strong { color:var(--ink); } .ip-row span { color:var(--muted); }
          .ip-row.ip-head { background:#f4f4ef; } .ip-row.ip-head>* { font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:750; color:#666; }
          .ip-callout { margin-top:24px; display:flex; gap:13px; padding:18px; border:1px solid rgba(233,84,20,.24); background:rgba(233,84,20,.055); border-radius:10px; color:#5f351f; font-size:14px; line-height:1.65; }
          .ip-checks { display:grid; grid-template-columns:1fr 1fr; gap:10px 26px; padding:0; margin:24px 0; list-style:none; }
          .ip-checks li { display:flex; gap:9px; color:#454540; font-size:14px; line-height:1.55; } .ip-checks svg { color:#16803a; flex:none; margin-top:3px; }
          @media(max-width:900px){ .ip-layout{grid-template-columns:1fr}.ip-nav{display:none}.ip-grid{grid-template-columns:1fr}.ip-main{max-width:none}.ip-hero{padding:52px 0 42px}.ip-row{grid-template-columns:1fr}.ip-row>*{padding:10px 14px}.ip-row>*+*{padding-top:0}.ip-row.ip-head{display:none}.ip-step{grid-template-columns:38px 1fr}.ip-step p{grid-column:2}.ip-checks{grid-template-columns:1fr} }
          @media(prefers-reduced-motion:reduce){ .ip-primary,.ip-secondary{transition:none} }
        `}</style>

        <header className="ip-hero">
          <div className="ip-wrap">
            <div className="ip-kicker">Integration guide</div>
            <h1>Bring your commerce stack into one economic record.</h1>
            <p>
              This guide explains how restaurants, retail groups, POS vendors, ERP teams and
              delivery platforms connect to PrizeSkout. Choose the path that matches who controls
              the data. The paths are independent and can be introduced in stages.
            </p>
            <div className="ip-actions">
              <a className="ip-primary" href="#choose-a-path">
                Choose your path <ArrowRight size={15} />
              </a>
              <Link className="ip-secondary" to="/docs">
                Open API reference <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </header>

        <div className="ip-wrap ip-layout">
          <nav className="ip-nav" aria-label="On this page">
            <strong>On this page</strong>
            <a href="#choose-a-path">Choose a path</a>
            <a href="#who-does-what">Who does what</a>
            <a href="#direct-api">Direct API delivery</a>
            <a href="#managed-connectors">Managed connectors</a>
            <a href="#partner-platforms">Platform partners</a>
            <a href="#data-model">Data and identity</a>
            <a href="#operations">Production operation</a>
            <a href="#go-live">Go-live checklist</a>
          </nav>

          <main className="ip-main">
            <Section id="choose-a-path" eyebrow="Start here" title="Three valid ways to connect">
              <p>
                Use one path or combine them by source. A merchant can push POS orders directly
                while authorizing PrizeSkout to pull settlement data from an aggregator.
              </p>
              <div className="ip-grid">
                <article className="ip-card">
                  <Webhook size={21} />
                  <h3>Your system calls PrizeSkout</h3>
                  <p>
                    Your POS, ERP, data warehouse or integration service sends normalized batches to
                    our HTTPS endpoints.
                  </p>
                  <span className="ip-badge">Available now</span>
                </article>
                <article className="ip-card">
                  <PlugZap size={21} />
                  <h3>PrizeSkout calls your system</h3>
                  <p>
                    The merchant authorizes a connector. PrizeSkout reads only the approved data
                    streams and keeps a sync checkpoint.
                  </p>
                  <span className="ip-badge">Provider specific</span>
                </article>
                <article className="ip-card">
                  <Network size={21} />
                  <h3>A platform integrates once</h3>
                  <p>
                    A delivery platform or POS vendor provisions merchant identities and sends data
                    for merchants that have approved access.
                  </p>
                  <span className="ip-badge">Partner agreement</span>
                </article>
              </div>
              <div className="ip-callout">
                <ShieldCheck size={20} />
                <div>
                  <strong>Consent follows the merchant.</strong> A technical integration does not
                  grant access by itself. Every production data flow must be tied to an approved
                  merchant and limited to the scopes needed for that flow.
                </div>
              </div>
            </Section>

            <Section id="who-does-what" eyebrow="Responsibilities" title="What each team owns">
              <div className="ip-table">
                <div className="ip-row ip-head">
                  <div>Team</div>
                  <div>Provides</div>
                  <div>Receives</div>
                </div>
                <div className="ip-row">
                  <strong>Merchant or restaurant group</strong>
                  <span>
                    Consent, branch list, SKU ownership, commercial terms and approval of mappings.
                  </span>
                  <span>
                    Matched orders, true contribution, payout variance, alerts and reports.
                  </span>
                </div>
                <div className="ip-row">
                  <strong>POS or ERP team</strong>
                  <span>
                    Stable order IDs, branch IDs, SKU IDs, final status, timestamps, amounts and
                    effective-dated costs.
                  </span>
                  <span>Acceptance receipts, validation errors and reconciliation status.</span>
                </div>
                <div className="ip-row">
                  <strong>Delivery platform</strong>
                  <span>
                    Merchant and branch identity, orders, discounts, commissions, fees, refunds and
                    settlements.
                  </span>
                  <span>Only actions or results the merchant has explicitly approved.</span>
                </div>
                <div className="ip-row">
                  <strong>PrizeSkout</strong>
                  <span>
                    Secure intake, identity mapping, normalization, matching, evidence lineage and
                    economic calculations.
                  </span>
                  <span>
                    Minimum required commerce data. Customer profiles and payment credentials are
                    not required.
                  </span>
                </div>
              </div>
            </Section>

            <Section id="direct-api" eyebrow="Path 1" title="Your stack sends data to PrizeSkout">
              <p>
                This is the best path when your business already has an integration service,
                warehouse or engineering team. Start in test mode. Send one complete order, verify
                it, then move to bounded batches of up to 1,000 orders.
              </p>
              <div className="ip-flow">
                {STEPS.map(([n, title, body]) => (
                  <div className="ip-step" key={n}>
                    <span>{n}</span>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
              <CodeBlock code={ORDER_EXAMPLE} />
              <div className="ip-callout">
                <RefreshCw size={20} />
                <div>
                  <strong>Retries are safe when identifiers are stable.</strong> Reuse the same{" "}
                  <code>batch_id</code> with identical normalized content. If the identifier is
                  reused with different content, PrizeSkout returns an idempotency conflict instead
                  of silently replacing evidence.
                </div>
              </div>
            </Section>

            <Section
              id="managed-connectors"
              eyebrow="Path 2"
              title="PrizeSkout reads from an authorized source"
            >
              <p>
                Create the connection with non-secret settings, then store the dedicated provider
                credential through the credentials endpoint. Credentials are encrypted and cannot be
                read back through the public API.
              </p>
              <CodeBlock code={CONNECTION_EXAMPLE} />
              <div className="ip-table">
                <div className="ip-row ip-head">
                  <div>Provider</div>
                  <div>Current status</div>
                  <div>What is needed</div>
                </div>
                <div className="ip-row">
                  <strong>Odoo 19</strong>
                  <span>Sandbox adapter for POS orders.</span>
                  <span>
                    Custom plan, HTTPS base URL, database name, currency and a dedicated API key.
                  </span>
                </div>
                <div className="ip-row">
                  <strong>SAP</strong>
                  <span>Control plane ready. Pull adapter requires customer configuration.</span>
                  <span>
                    Communication arrangement, technical user and the enabled service metadata.
                  </span>
                </div>
                <div className="ip-row">
                  <strong>Oracle MICROS</strong>
                  <span>Control plane ready. STS Gen2 is not used for analytics extraction.</span>
                  <span>The merchant's approved reporting or transaction export interface.</span>
                </div>
                <div className="ip-row">
                  <strong>File delivery</strong>
                  <span>Available through merchant evidence intake.</span>
                  <span>
                    Stable templates, declared completeness and an agreed delivery schedule.
                  </span>
                </div>
              </div>
            </Section>

            <Section
              id="partner-platforms"
              eyebrow="Path 3"
              title="A POS or delivery platform integrates for its merchants"
            >
              <p>
                The partner keeps its existing merchant relationship. When a merchant enables
                PrizeSkout, the partner creates or references that merchant's connection and sends
                the approved records using a tenant-scoped credential. Data from one merchant must
                never be combined with another merchant's batch.
              </p>
              <div className="ip-flow">
                <div className="ip-step">
                  <span>1</span>
                  <strong>Merchant opts in</strong>
                  <p>The partner records consent and the exact data scopes approved.</p>
                </div>
                <div className="ip-step">
                  <span>2</span>
                  <strong>Identity is provisioned</strong>
                  <p>Partner merchant and branch IDs are mapped to PrizeSkout identities.</p>
                </div>
                <div className="ip-step">
                  <span>3</span>
                  <strong>Historical backfill</strong>
                  <p>A bounded period is sent once, using stable batch and event IDs.</p>
                </div>
                <div className="ip-step">
                  <span>4</span>
                  <strong>Ongoing delivery</strong>
                  <p>Incremental batches or signed webhooks keep the Economic Twin current.</p>
                </div>
                <div className="ip-step">
                  <span>5</span>
                  <strong>Revocation</strong>
                  <p>
                    New collection stops when the merchant disconnects. Retention then follows the
                    commercial agreement and applicable law.
                  </p>
                </div>
              </div>
            </Section>

            <Section id="data-model" eyebrow="Economic Twin" title="Identity first, then economics">
              <p>
                Correct totals are not enough. Every record needs stable source identity so
                PrizeSkout can distinguish brands, branches, revenue centers, orders and products.
                Source IDs are retained for traceability and mapped to canonical merchant-approved
                IDs.
              </p>
              <div className="ip-grid">
                <article className="ip-card">
                  <Store size={21} />
                  <h3>Orders</h3>
                  <p>
                    Gross sales, discounts, taxes, charges, refunds, cancellations, status, channel
                    and item lines.
                  </p>
                </article>
                <article className="ip-card">
                  <Database size={21} />
                  <h3>Costs</h3>
                  <p>
                    SKU, unit cost, currency, effective dates and optional brand or branch scope.
                  </p>
                </article>
                <article className="ip-card">
                  <Building2 size={21} />
                  <h3>Settlements</h3>
                  <p>
                    Expected and actual payout components, order allocations, settlement references
                    and receipt confirmation.
                  </p>
                </article>
              </div>
              <div className="ip-callout">
                <ShieldCheck size={20} />
                <div>
                  <strong>Data minimization is part of the contract.</strong> Do not send card
                  details, bank login credentials, customer profiles or unrelated employee data.
                  PrizeSkout needs economic evidence, not private account access.
                </div>
              </div>
            </Section>

            <Section
              id="operations"
              eyebrow="Production"
              title="Design for failure without losing evidence"
            >
              <div className="ip-table">
                <div className="ip-row ip-head">
                  <div>Concern</div>
                  <div>Required behavior</div>
                  <div>Why it matters</div>
                </div>
                <div className="ip-row">
                  <strong>Idempotency</strong>
                  <span>Stable batch IDs and external event IDs across retries.</span>
                  <span>Prevents duplicate economic events.</span>
                </div>
                <div className="ip-row">
                  <strong>Ordering</strong>
                  <span>
                    Send final state with the source timestamp. Do not assume network arrival order.
                  </span>
                  <span>Late updates remain explainable.</span>
                </div>
                <div className="ip-row">
                  <strong>Completeness</strong>
                  <span>
                    Set <code>delivery_complete</code> honestly and provide a declared count.
                  </span>
                  <span>Partial data is not presented as final profit.</span>
                </div>
                <div className="ip-row">
                  <strong>Retries</strong>
                  <span>
                    Retry 429 and 5xx responses with backoff. Do not retry validation errors
                    unchanged.
                  </span>
                  <span>Recovers safely without request storms.</span>
                </div>
                <div className="ip-row">
                  <strong>Monitoring</strong>
                  <span>Record request IDs, response status, batch ID and safe error details.</span>
                  <span>Both teams can trace the same delivery.</span>
                </div>
              </div>
            </Section>

            <Section id="go-live" eyebrow="Release gate" title="Production approval checklist">
              <ul className="ip-checks">
                {[
                  "Merchant and branches are confirmed",
                  "Least-privilege scopes are approved",
                  "Test and live credentials are separated",
                  "No ordinary usernames or passwords are stored",
                  "Backfill period and timezone are agreed",
                  "Order totals reconcile to source totals",
                  "Duplicate and retry tests pass",
                  "Partial batches remain visibly partial",
                  "Unmapped branches and SKUs enter review",
                  "Settlement rules use approved contract terms",
                  "Operational owners and escalation contacts are named",
                  "Revocation and retention behavior is agreed",
                ].map((item) => (
                  <li key={item}>
                    <Check size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="ip-actions">
                <Link className="ip-primary" to="/docs/guides/quickstart">
                  Continue to quickstart <ArrowRight size={15} />
                </Link>
                <Link className="ip-secondary" to="/contact">
                  <KeyRound size={15} /> Request production access
                </Link>
              </div>
            </Section>
          </main>
        </div>
      </div>
    </MarketingShell>
  );
}
