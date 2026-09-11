import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  LockKeyhole,
  Menu,
  Search,
  ShieldCheck,
  Waypoints,
  X,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import {
  API_BASE_URL,
  API_GROUPS,
  type EndpointSpec,
  type FieldSpec,
  type GroupSpec,
} from "@/lib/api-spec";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "PrizeSkout API documentation" },
      {
        name: "description",
        content:
          "Integrate a POS, ERP, delivery platform or commerce stack with PrizeSkout. Authentication, data contracts, operating guidance and API reference.",
      },
    ],
  }),
  component: DeveloperDocs,
});

type Journey = "send" | "connect" | "partner";

const JOURNEYS: Record<Journey, { label: string; title: string; copy: string; steps: string[] }> = {
  send: {
    label: "Send data",
    title: "Your system calls PrizeSkout",
    copy: "Use this when your team controls a POS, ERP, warehouse or integration service and can send normalized commerce records.",
    steps: [
      "Create a test API key with write access.",
      "Send one final order and verify the accepted totals.",
      "Map source branch IDs and SKUs to the merchant workspace.",
      "Add costs and settlements, then validate the Economic Twin.",
      "Pass the production checklist before changing to a live key.",
    ],
  },
  connect: {
    label: "Authorize a connector",
    title: "PrizeSkout reads from your system",
    copy: "Use this when the merchant wants PrizeSkout to operate a provider-specific connection with the smallest required permissions.",
    steps: [
      "Check the connector definition and readiness status.",
      "Create a sandbox connection with non-secret configuration.",
      "Store a dedicated provider credential in the encrypted vault.",
      "Approve branch and product identity mappings.",
      "Run a bounded sync and compare it with source totals.",
    ],
  },
  partner: {
    label: "Platform partner",
    title: "Your platform connects merchants",
    copy: "Use this when a POS vendor, delivery platform or enterprise integrator sends data for merchants that have explicitly opted in.",
    steps: [
      "Record merchant consent and granted data scopes.",
      "Provision a tenant-scoped merchant identity.",
      "Backfill an agreed period with stable record IDs.",
      "Deliver ongoing batches or signed events.",
      "Stop new collection immediately when access is revoked.",
    ],
  },
};

const ORDER_SAMPLE = `curl -X POST "${API_BASE_URL}/v1/commerce/order-batches" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "batch_id": "pos:2026-09-11:001",
    "source_provider": "your-pos",
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
      "branch_external_id": "branch_west_bay",
      "gross_amount": 105,
      "discount_amount": 10,
      "tax_amount": 0,
      "service_charge_amount": 0,
      "delivery_charge_amount": 0,
      "refund_amount": 0,
      "cancellation_amount": 0,
      "net_amount": 95,
      "lines": []
    }]
  }'`;

function Method({ value }: { value: EndpointSpec["method"] }) {
  return <span className={`pd-method pd-${value.toLowerCase()}`}>{value}</span>;
}

function CopyCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="pd-copy"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function FieldList({ title, fields }: { title: string; fields?: FieldSpec[] }) {
  if (!fields?.length) return null;
  return (
    <section className="pd-fields">
      <h4>{title}</h4>
      {fields.map((field) => (
        <div className="pd-field" key={field.name}>
          <div>
            <code>{field.name}</code>
            {field.required && <span>required</span>}
          </div>
          <code>{field.type}</code>
          <p>{field.description}</p>
        </div>
      ))}
    </section>
  );
}

function EndpointPanel({ group, endpoint }: { group: GroupSpec; endpoint: EndpointSpec }) {
  const request = `curl -X ${endpoint.method} "${API_BASE_URL}${endpoint.path}" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"${
    endpoint.body?.length
      ? ` \\
  -H "Content-Type: application/json"`
      : ""
  }`;
  return (
    <article className="pd-endpoint-detail">
      <div className="pd-overline">{group.name}</div>
      <div className="pd-title-line">
        <Method value={endpoint.method} />
        <h2>{endpoint.title}</h2>
      </div>
      <code className="pd-path">{endpoint.path}</code>
      <p className="pd-lead">{endpoint.summary}</p>
      {endpoint.description && <p>{endpoint.description}</p>}
      <div className="pd-scopes">
        <strong>Scopes</strong>
        {endpoint.scopes.map((scope) => (
          <code key={scope}>{scope}</code>
        ))}
      </div>
      <FieldList title="Path parameters" fields={endpoint.pathParams} />
      <FieldList title="Query parameters" fields={endpoint.queryParams} />
      <FieldList title="Request body" fields={endpoint.body} />
      <section className="pd-example">
        <div className="pd-example-head">
          <span>Request</span>
          <CopyCode value={request} />
        </div>
        <pre>
          <code>{request}</code>
        </pre>
      </section>
      <section className="pd-example">
        <div className="pd-example-head">
          <span>Example response · {endpoint.responses[0]?.status}</span>
          <CopyCode value={JSON.stringify(endpoint.responses[0]?.example, null, 2)} />
        </div>
        <pre>
          <code>{JSON.stringify(endpoint.responses[0]?.example, null, 2)}</code>
        </pre>
      </section>
      {!!endpoint.notes?.length && (
        <section className="pd-notes">
          <h4>Operating notes</h4>
          {endpoint.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </section>
      )}
      {!!endpoint.errors?.length && (
        <section className="pd-errors">
          <h4>Possible errors</h4>
          {endpoint.errors.map((error) => (
            <div key={`${error.status}-${error.code}`}>
              <strong>{error.status}</strong>
              <code>{error.code}</code>
              <span>{error.description}</span>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

function DeveloperDocs() {
  const [journey, setJourney] = useState<Journey>("send");
  const [query, setQuery] = useState("");
  const [mobileReference, setMobileReference] = useState(false);
  const [selected, setSelected] = useState(() => ({
    group: API_GROUPS[0],
    endpoint: API_GROUPS[0].endpoints[0],
  }));
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return API_GROUPS.map((group) => ({
      ...group,
      endpoints: group.endpoints.filter(
        (endpoint) =>
          !needle ||
          `${group.name} ${endpoint.title} ${endpoint.path}`.toLowerCase().includes(needle),
      ),
    })).filter((group) => group.endpoints.length);
  }, [query]);
  const activeJourney = JOURNEYS[journey];

  return (
    <MarketingShell>
      <div className="pd-page">
        <style>{`
          .pd-page{--navy:#111923;--orange:#f05a24;--cream:#f4f1ea;--ink:#17191b;--muted:#62666a;--line:#dcdedb;background:#fff;color:var(--ink);font-family:inherit}.pd-shell{max-width:1440px;margin:auto;padding:0 28px}.pd-top{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.94);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}.pd-topin{height:58px;display:flex;align-items:center;justify-content:space-between}.pd-docmark{display:flex;align-items:center;gap:10px;font-weight:700}.pd-docmark span{font:600 10px ui-monospace,monospace;color:var(--orange);border:1px solid #f0c3b1;border-radius:4px;padding:3px 5px}.pd-top nav{display:flex;gap:24px}.pd-top a{font-size:13px;color:#4c5054;text-decoration:none}.pd-hero{background:var(--navy);color:white;padding:86px 0 78px;overflow:hidden;position:relative}.pd-hero:after{content:"";position:absolute;width:540px;height:540px;border:1px solid rgba(255,255,255,.08);border-radius:50%;right:-120px;top:-250px;box-shadow:0 0 0 90px rgba(255,255,255,.025),0 0 0 180px rgba(255,255,255,.018)}.pd-hero-content{position:relative;z-index:1;max-width:830px}.pd-kicker,.pd-overline{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:750;color:var(--orange)}.pd-hero h1{font-size:clamp(42px,6vw,76px);line-height:.98;letter-spacing:-.055em;margin:18px 0 23px;max-width:760px}.pd-hero p{max-width:700px;color:#bdc6cf;font-size:18px;line-height:1.65}.pd-hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.pd-button{min-height:45px;padding:0 17px;display:inline-flex;align-items:center;gap:8px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700}.pd-button.light{background:white;color:var(--navy)}.pd-button.ghost{border:1px solid #41505f;color:white}.pd-section{padding:76px 0;border-bottom:1px solid var(--line)}.pd-heading{display:grid;grid-template-columns:220px 1fr;gap:40px;margin-bottom:34px}.pd-heading h2{font-size:clamp(30px,4vw,48px);line-height:1.08;letter-spacing:-.04em;margin:0}.pd-heading p{color:var(--muted);font-size:16px;line-height:1.7;max-width:650px;margin:0}.pd-journey-tabs{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:10px 10px 0 0;overflow:hidden}.pd-journey-tabs button{min-height:58px;background:#fafafa;border:0;border-right:1px solid var(--line);cursor:pointer;font:650 13px inherit;color:#686b6e}.pd-journey-tabs button:last-child{border-right:0}.pd-journey-tabs button.active{background:var(--orange);color:white}.pd-journey-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.75fr);gap:50px;background:var(--cream);border:1px solid var(--line);border-top:0;padding:42px;border-radius:0 0 10px 10px}.pd-journey-body h3{font-size:28px;letter-spacing:-.03em;margin:0 0 12px}.pd-journey-body p{color:var(--muted);line-height:1.65}.pd-steps{counter-reset:steps;display:grid;gap:0}.pd-steps div{counter-increment:steps;display:grid;grid-template-columns:32px 1fr;gap:12px;padding:13px 0;border-bottom:1px solid #d8d4ca;font-size:13px;line-height:1.5}.pd-steps div:before{content:counter(steps);width:24px;height:24px;border-radius:50%;background:var(--navy);color:white;display:grid;place-items:center;font:600 10px ui-monospace,monospace}.pd-code{background:#090d11;color:#dce4ea;border-radius:10px;position:relative;overflow:auto}.pd-code pre{margin:0;padding:54px 20px 22px;min-width:680px;font:12px/1.7 ui-monospace,monospace}.pd-copy{display:flex;align-items:center;gap:6px;min-height:32px;padding:0 9px;border:1px solid #35404a;background:#151c23;color:#c8d0d7;border-radius:5px;cursor:pointer}.pd-code>.pd-copy{position:absolute;right:10px;top:10px}.pd-principles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.pd-principle{border:1px solid var(--line);border-radius:9px;padding:22px}.pd-principle svg{color:var(--orange)}.pd-principle h3{font-size:15px;margin:17px 0 8px}.pd-principle p{color:var(--muted);font-size:13px;line-height:1.6;margin:0}.pd-reference{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:900px;border:1px solid var(--line);border-radius:10px;overflow:hidden}.pd-refnav{background:#f6f6f3;border-right:1px solid var(--line);padding:18px;height:900px;overflow:auto}.pd-search{position:relative;margin-bottom:20px}.pd-search svg{position:absolute;left:11px;top:12px;color:#85898c}.pd-search input{width:100%;height:40px;border:1px solid var(--line);background:white;border-radius:6px;padding:0 10px 0 34px;font:13px inherit}.pd-group{margin:18px 0}.pd-group>strong{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;margin:0 7px 8px}.pd-refitem{width:100%;display:flex;align-items:center;gap:8px;padding:8px 7px;border:0;border-radius:5px;background:transparent;cursor:pointer;text-align:left;font:12px inherit;color:#52565a}.pd-refitem.active{background:white;color:#111;font-weight:650;box-shadow:0 1px 3px #0000000d}.pd-method{display:inline-flex;justify-content:center;min-width:47px;padding:3px 5px;border-radius:4px;font:700 9px ui-monospace,monospace;letter-spacing:.04em}.pd-get{background:#dcf5e6;color:#13743a}.pd-post{background:#e4edff;color:#245cc7}.pd-patch{background:#fff0cf;color:#8a5c00}.pd-delete{background:#ffe2e1;color:#a52e29}.pd-endpoint-detail{padding:44px 48px;max-width:900px}.pd-title-line{display:flex;align-items:center;gap:12px;margin:10px 0}.pd-title-line h2{font-size:32px;letter-spacing:-.035em;margin:0}.pd-path{display:inline-block;background:#f1f2ef;border:1px solid var(--line);border-radius:5px;padding:7px 9px;font-size:12px}.pd-lead{font-size:16px!important;color:#3e4245!important;margin-top:24px!important}.pd-endpoint-detail>p{font-size:14px;line-height:1.7;color:var(--muted)}.pd-scopes{display:flex;align-items:center;gap:8px;margin:22px 0 34px;font-size:12px}.pd-scopes code{border:1px solid var(--line);border-radius:4px;padding:3px 6px}.pd-fields{margin:30px 0}.pd-fields h4,.pd-notes h4,.pd-errors h4{font-size:14px;margin-bottom:11px}.pd-field{display:grid;grid-template-columns:170px 110px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--line);font-size:12px}.pd-field>div{display:flex;align-items:start;gap:7px}.pd-field span{color:#b13b17;font-size:9px;text-transform:uppercase}.pd-field p{margin:0;color:var(--muted);line-height:1.55}.pd-example{margin:24px 0;background:#0c1116;color:#dbe4eb;border-radius:8px;overflow:hidden}.pd-example-head{height:44px;padding:0 10px 0 16px;border-bottom:1px solid #26313a;display:flex;align-items:center;justify-content:space-between;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#8595a1}.pd-example pre{margin:0;padding:18px;overflow:auto;font:12px/1.65 ui-monospace,monospace}.pd-notes{padding:18px;background:#fff7ef;border:1px solid #f4d5bd;border-radius:8px}.pd-notes p{font-size:13px;line-height:1.6}.pd-errors{margin-top:28px}.pd-errors>div{display:grid;grid-template-columns:48px 150px 1fr;gap:12px;border-top:1px solid var(--line);padding:11px 0;font-size:12px}.pd-errors span{color:var(--muted)}.pd-mobile-toggle{display:none}.pd-security{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pd-security article{padding:22px;border:1px solid var(--line);border-radius:9px}.pd-security h3{font-size:15px}.pd-security p,.pd-security li{font-size:13px;line-height:1.65;color:var(--muted)}
          @media(max-width:800px){.pd-shell{padding:0 16px}.pd-top nav{display:none}.pd-hero{padding:58px 0}.pd-heading{grid-template-columns:1fr;gap:12px}.pd-section{padding:54px 0}.pd-journey-tabs{grid-template-columns:1fr}.pd-journey-tabs button{border-right:0;border-bottom:1px solid var(--line)}.pd-journey-body{grid-template-columns:1fr;padding:24px}.pd-principles,.pd-security{grid-template-columns:1fr}.pd-mobile-toggle{display:flex;align-items:center;gap:8px;margin-bottom:12px;min-height:44px;border:1px solid var(--line);background:white;border-radius:6px;padding:0 12px}.pd-reference{grid-template-columns:1fr}.pd-refnav{display:none;height:auto;border-right:0;border-bottom:1px solid var(--line)}.pd-refnav.open{display:block}.pd-endpoint-detail{padding:28px 18px}.pd-title-line h2{font-size:25px}.pd-field{grid-template-columns:1fr}.pd-errors>div{grid-template-columns:45px 1fr}.pd-errors span{grid-column:2}.pd-topin{height:52px}}
          @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
        `}</style>

        <div className="pd-top">
          <div className="pd-shell pd-topin">
            <div className="pd-docmark">
              PrizeSkout <span>DOCS</span>
            </div>
            <nav>
              <a href="#start">Start</a>
              <a href="#integration">Integration paths</a>
              <a href="#reference">API reference</a>
              <a href="#security">Security</a>
            </nav>
            <Link
              to="/contact"
              className="pd-button ghost"
              style={{ color: "#17191b", borderColor: "#dcdedb" }}
            >
              Contact engineering <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <header className="pd-hero" id="start">
          <div className="pd-shell">
            <div className="pd-hero-content">
              <div className="pd-kicker">PrizeSkout developer platform</div>
              <h1>Connect commerce data to decisions.</h1>
              <p>
                Use the PrizeSkout API to deliver orders, product costs and settlements, operate
                authorized connectors, and retrieve the economic record behind every decision.
              </p>
              <div className="pd-hero-actions">
                <a className="pd-button light" href="#integration">
                  Choose an integration path <ArrowUpRight size={15} />
                </a>
                <a className="pd-button ghost" href="#reference">
                  Browse endpoints
                </a>
              </div>
            </div>
          </div>
        </header>

        <section className="pd-section" id="integration">
          <div className="pd-shell">
            <div className="pd-heading">
              <div className="pd-kicker">Integration paths</div>
              <div>
                <h2>Start with who controls the data.</h2>
                <p>
                  The three paths are independent. A merchant can use different paths for POS
                  orders, aggregator settlements and ERP costs.
                </p>
              </div>
            </div>
            <div className="pd-journey-tabs" role="tablist" aria-label="Integration paths">
              {(Object.keys(JOURNEYS) as Journey[]).map((key) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={journey === key}
                  className={journey === key ? "active" : ""}
                  onClick={() => setJourney(key)}
                  key={key}
                >
                  {JOURNEYS[key].label}
                </button>
              ))}
            </div>
            <div className="pd-journey-body">
              <div>
                <h3>{activeJourney.title}</h3>
                <p>{activeJourney.copy}</p>
                <div className="pd-steps">
                  {activeJourney.steps.map((step) => (
                    <div key={step}>{step}</div>
                  ))}
                </div>
              </div>
              <div className="pd-code">
                <CopyCode value={ORDER_SAMPLE} />
                <pre>
                  <code>{ORDER_SAMPLE}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="pd-section">
          <div className="pd-shell">
            <div className="pd-heading">
              <div className="pd-kicker">Contract principles</div>
              <div>
                <h2>Financial evidence must remain explainable.</h2>
                <p>
                  PrizeSkout accepts economic records, preserves source identity and withholds
                  conclusions when required evidence is incomplete.
                </p>
              </div>
            </div>
            <div className="pd-principles">
              <article className="pd-principle">
                <Waypoints size={21} />
                <h3>Stable identity</h3>
                <p>
                  Keep merchant, branch, order and SKU identifiers stable across every delivery and
                  retry.
                </p>
              </article>
              <article className="pd-principle">
                <ShieldCheck size={21} />
                <h3>Declared completeness</h3>
                <p>
                  Tell PrizeSkout whether a batch is complete. Partial evidence stays visibly
                  partial.
                </p>
              </article>
              <article className="pd-principle">
                <KeyRound size={21} />
                <h3>Least privilege</h3>
                <p>
                  Use a dedicated credential with only the scopes needed for the approved data
                  streams.
                </p>
              </article>
              <article className="pd-principle">
                <LockKeyhole size={21} />
                <h3>Data minimization</h3>
                <p>
                  Do not send card data, bank credentials, customer profiles or ordinary employee
                  passwords.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="pd-section" id="reference">
          <div className="pd-shell">
            <div className="pd-heading">
              <div className="pd-kicker">API reference</div>
              <div>
                <h2>Requests, responses and operating behavior.</h2>
                <p>
                  Every endpoint below uses the deployed PrizeSkout base URL and the current
                  application contract.
                </p>
              </div>
            </div>
            <button
              className="pd-mobile-toggle"
              type="button"
              onClick={() => setMobileReference((value) => !value)}
            >
              {mobileReference ? <X size={16} /> : <Menu size={16} />}{" "}
              {mobileReference ? "Close endpoints" : "Browse endpoints"} <ChevronDown size={14} />
            </button>
            <div className="pd-reference">
              <aside className={`pd-refnav ${mobileReference ? "open" : ""}`}>
                <div className="pd-search">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search endpoint or path"
                    aria-label="Search endpoints"
                  />
                </div>
                {matches.map((group) => (
                  <div className="pd-group" key={group.slug}>
                    <strong>{group.name}</strong>
                    {group.endpoints.map((endpoint) => (
                      <button
                        type="button"
                        className={`pd-refitem ${selected.endpoint.slug === endpoint.slug && selected.group.slug === group.slug ? "active" : ""}`}
                        onClick={() => {
                          setSelected({ group, endpoint });
                          setMobileReference(false);
                        }}
                        key={`${group.slug}-${endpoint.slug}`}
                      >
                        <Method value={endpoint.method} />
                        <span>{endpoint.title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </aside>
              <EndpointPanel group={selected.group} endpoint={selected.endpoint} />
            </div>
          </div>
        </section>

        <section className="pd-section" id="security">
          <div className="pd-shell">
            <div className="pd-heading">
              <div className="pd-kicker">Security and launch</div>
              <div>
                <h2>A production connection needs more than a successful request.</h2>
                <p>
                  Before live access, both teams confirm ownership, scopes, mappings, totals, retry
                  behavior and revocation.
                </p>
              </div>
            </div>
            <div className="pd-security">
              <article>
                <h3>Authentication</h3>
                <p>
                  Send the key in the Authorization header as a Bearer token. Test keys begin with{" "}
                  <code>sk_test_</code>. Live keys begin with <code>sk_live_</code>. The
                  documentation never stores a pasted key in browser storage.
                </p>
                <ul>
                  <li>Keep keys in a server-side secret manager.</li>
                  <li>Never place keys in URLs, client bundles or logs.</li>
                  <li>Rotate a key by creating its replacement before revoking the old key.</li>
                </ul>
              </article>
              <article>
                <h3>Production gate</h3>
                <ul>
                  <li>Merchant, legal entity and branches confirmed.</li>
                  <li>Source totals reconcile for the agreed test period.</li>
                  <li>Unmapped identities enter review.</li>
                  <li>Duplicate and retry tests pass.</li>
                  <li>Operational contacts and retention terms are agreed.</li>
                  <li>Revocation stops new collection.</li>
                </ul>
              </article>
            </div>
            <div className="pd-hero-actions">
              <Link
                className="pd-button light"
                style={{ background: "#111923", color: "white" }}
                to="/contact"
              >
                Request production access <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
