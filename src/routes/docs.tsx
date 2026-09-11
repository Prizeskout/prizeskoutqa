import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Copy, Menu, Search, X } from "lucide-react";
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
      { title: "API Documentation | PrizeSkout" },
      {
        name: "description",
        content:
          "Technical documentation for integrating POS, ERP, aggregator and merchant systems with PrizeSkout.",
      },
    ],
  }),
  component: DocsPage,
});

const firstOrder = `curl -X POST "${API_BASE_URL}/v1/commerce/order-batches" \\
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

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`wordmark ${light ? "light" : ""}`}>
      <b>Prize</b>
      <b>skout</b>
    </span>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-head">
      <div className="site-shell site-nav">
        <a href="/" aria-label="PrizeSkout home">
          <Wordmark />
        </a>
        <nav className="site-navlinks">
          <a href="/#platform">Platform</a>
          <a href="/#intelligence">Intelligence</a>
          <a href="/#api">API</a>
          <a href="/#solutions">Solutions</a>
          <a href="/#audit">Profit Audit</a>
        </nav>
        <div className="site-actions">
          <span>QA</span>
          <span>EN</span>
          <a href="/auth">Sign in</a>
          <a className="site-cta" href="/#audit">
            Book a Profit Audit
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav">
          <a href="/#platform">Platform</a>
          <a href="/#intelligence">Intelligence</a>
          <a href="/#api">API</a>
          <a href="/#solutions">Solutions</a>
          <a href="/#audit">Profit Audit</a>
        </nav>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-top">
        <div>
          <a href="/">
            <Wordmark light />
          </a>
          <p>Profit Intelligence Infrastructure for Digital Commerce.</p>
        </div>
        <div className="footer-links">
          <div>
            <strong>Platform</strong>
            <a href="/#intelligence">True Profit</a>
            <a href="/#intelligence">Settlement Intelligence</a>
            <Link to="/docs">API Documentation</Link>
          </div>
          <div>
            <strong>Solutions</strong>
            <a href="/#solutions">Restaurant Groups</a>
            <a href="/#solutions">Cloud Kitchens</a>
            <a href="/#solutions">Commerce Merchants</a>
          </div>
        </div>
      </div>
      <div className="site-shell footer-bottom">
        <span>© 2026 PrizeSkout · Doha, Qatar</span>
        <span>Merchant controlled · API first</span>
      </div>
    </footer>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Code({ value }: { value: string }) {
  return (
    <div className="code">
      <CopyButton value={value} />
      <pre>
        <code>{value}</code>
      </pre>
    </div>
  );
}
function Method({ value }: { value: EndpointSpec["method"] }) {
  return <span className={`method ${value.toLowerCase()}`}>{value}</span>;
}

function Fields({ title, fields }: { title: string; fields?: FieldSpec[] }) {
  if (!fields?.length) return null;
  return (
    <section className="fields">
      <h3>{title}</h3>
      {fields.map((field) => (
        <div className="field" key={field.name}>
          <div>
            <code>{field.name}</code>
            {field.required && <small>required</small>}
          </div>
          <code>{field.type}</code>
          <p>{field.description}</p>
        </div>
      ))}
    </section>
  );
}

function BusinessGuide() {
  return (
    <article className="article guide">
      <div className="crumb">Documentation / Business guide</div>
      <p className="eyebrow">Start here</p>
      <h1>Connect your business to PrizeSkout</h1>
      <p className="lede">
        PrizeSkout brings sales, fees, costs and payouts together so your team can see what each
        order earned and whether you received the right amount.
      </p>
      <div
        className="evidence-ledger"
        aria-label="How PrizeSkout turns business records into verified profit"
      >
        <div className="ledger-source">
          <span>01</span>
          <b>Sales</b>
          <small>POS and ERP</small>
        </div>
        <div className="ledger-source">
          <span>02</span>
          <b>Orders</b>
          <small>Delivery platforms</small>
        </div>
        <div className="ledger-source">
          <span>03</span>
          <b>Payouts</b>
          <small>Statements and receipts</small>
        </div>
        <div className="ledger-result">
          <span>Verified result</span>
          <b>One economic truth</b>
          <small>Profit, payout gaps and actions</small>
        </div>
      </div>
      <aside className="plain-note">
        <b>You keep the systems you already use.</b>
        <p>
          PrizeSkout works alongside your POS, accounting system and delivery platforms. It does not
          replace them or change how your staff take orders.
        </p>
      </aside>

      <h2 id="business-result">What you get</h2>
      <div className="outcomes">
        <div>
          <b>True profit</b>
          <p>See revenue, discounts, fees and product costs in one result.</p>
        </div>
        <div>
          <b>Payout checks</b>
          <p>Compare what a platform promised with what it actually paid.</p>
        </div>
        <div>
          <b>Problems to review</b>
          <p>Find missing orders, unusual fees and records that need attention.</p>
        </div>
      </div>

      <h2 id="business-path">Which description fits you?</h2>
      <p>
        Choose the closest option. These connection methods are independent and can be used
        together.
      </p>
      <div className="paths">
        <section>
          <span>Restaurant or merchant</span>
          <h3>Connect the tools you use</h3>
          <p>You approve access to supported delivery, POS or accounting systems.</p>
          <ol>
            <li>Tell us which systems and branches you use.</li>
            <li>Approve each available connection.</li>
            <li>Confirm that branches and products match.</li>
            <li>Review the first profit and payout results.</li>
          </ol>
        </section>
        <section>
          <span>Business with its own technology</span>
          <h3>Send business records to PrizeSkout</h3>
          <p>Your technical team securely sends orders, product costs or settlement records.</p>
          <ol>
            <li>Request test access.</li>
            <li>Send a small set of sample records.</li>
            <li>Confirm totals and branch names with us.</li>
            <li>Move to the live connection after approval.</li>
          </ol>
        </section>
        <section>
          <span>POS, ERP or delivery platform</span>
          <h3>Connect merchants at scale</h3>
          <p>You send records for merchants that have agreed to use PrizeSkout.</p>
          <ol>
            <li>Agree on merchant consent and data access.</li>
            <li>Create a secure partner connection.</li>
            <li>Link each merchant and branch correctly.</li>
            <li>Test, reconcile and launch in stages.</li>
          </ol>
        </section>
      </div>

      <h2 id="business-data">What information is shared?</h2>
      <div className="simple-table">
        <div>
          <b>Orders</b>
          <span>What was sold, discounted, cancelled or refunded.</span>
        </div>
        <div>
          <b>Product costs</b>
          <span>What the sold items cost the merchant.</span>
        </div>
        <div>
          <b>Platform statements</b>
          <span>Commissions, fees, adjustments and expected payout.</span>
        </div>
        <div>
          <b>Payout confirmation</b>
          <span>The amount and reference needed to confirm receipt.</span>
        </div>
      </div>
      <aside className="note">
        <b>We do not need access to private online banking.</b>
        <p>
          Never share bank usernames, passwords, card information or unrelated customer and employee
          records. A payout amount, date and reference is enough to confirm receipt.
        </p>
      </aside>

      <h2 id="business-launch">What happens before launch?</h2>
      <ol className="numbered-flow">
        <li>
          <b>Agree the scope</b>
          <span>Confirm the merchant, branches, systems and records involved.</span>
        </li>
        <li>
          <b>Connect safely</b>
          <span>Use test access or a limited pilot before live records are enabled.</span>
        </li>
        <li>
          <b>Check the numbers</b>
          <span>Compare PrizeSkout totals with the source systems.</span>
        </li>
        <li>
          <b>Approve production</b>
          <span>Both teams agree that ownership, support and monitoring are ready.</span>
        </li>
      </ol>
      <div className="next-step">
        <div>
          <b>Are you arranging the connection?</b>
          <p>Tell us your systems, number of branches and preferred launch date.</p>
        </div>
        <a href="/#audit">Talk to PrizeSkout</a>
      </div>
    </article>
  );
}

function ImplementationGuide() {
  return (
    <article className="article guide">
      <div className="crumb">Documentation / Implementation guide</div>
      <h1>Integrate with PrizeSkout</h1>
      <p className="lede">
        PrizeSkout receives commerce evidence from systems that already run a merchant's business.
        You do not need to replace a POS, ERP or delivery platform.
      </p>
      <div className="base">
        <b>Base URL</b>
        <code>{API_BASE_URL}</code>
      </div>
      <h2 id="models">Choose a connection model</h2>
      <p>
        The right model depends on who controls the data. The models are independent, so a
        restaurant can push POS orders while separately authorizing an aggregator connection.
      </p>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Use it when</th>
            <th>Starting point</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Your system calls PrizeSkout</td>
            <td>Your team controls a POS, ERP, warehouse or integration service.</td>
            <td>
              <code>POST /v1/commerce/order-batches</code>
            </td>
          </tr>
          <tr>
            <td>PrizeSkout connects to a source</td>
            <td>The merchant can authorize a supported provider connection.</td>
            <td>
              <code>POST /v1/connectors</code>
            </td>
          </tr>
          <tr>
            <td>A platform connects merchants</td>
            <td>A POS vendor or delivery platform sends records for merchants that opted in.</td>
            <td>Partner onboarding, then commerce batches</td>
          </tr>
        </tbody>
      </table>
      <h2 id="auth">Authentication</h2>
      <p>
        Send the API key as a Bearer token. Keep keys on a server. Never place them in URLs, browser
        bundles or logs.
      </p>
      <Code value="Authorization: Bearer sk_test_YOUR_KEY" />
      <h2 id="order">Send the first order</h2>
      <p>
        Begin with one completed order. Keep the batch and external event identifiers unchanged when
        retrying the same delivery.
      </p>
      <Code value={firstOrder} />
      <h2 id="identity">Map identities</h2>
      <p>
        Branch, brand, revenue-centre and SKU identifiers must resolve to the merchant's approved
        PrizeSkout workspace. Unknown identities remain in review instead of being guessed.
      </p>
      <h2 id="evidence">Add financial evidence</h2>
      <ol>
        <li>Orders establish what was sold or refunded.</li>
        <li>Product costs support contribution by SKU and branch.</li>
        <li>Settlements establish what a platform says it paid.</li>
        <li>Approved contract terms establish what should have been paid.</li>
        <li>Receipt confirmations establish whether the payout arrived.</li>
      </ol>
      <aside className="note">
        <b>Private banking access is not required.</b>
        <p>
          Do not send bank usernames, passwords, card data, customer profiles or unrelated employee
          information.
        </p>
      </aside>
      <h2 id="production">Production checklist</h2>
      <ul className="checks">
        {[
          "Merchant, legal entity and branches confirmed",
          "Least-privilege scopes approved",
          "Test and live credentials separated",
          "Source totals reconciled for the test period",
          "Retry and duplicate behaviour verified",
          "Unmapped identities routed to review",
          "Operational contacts agreed",
          "Revocation and retention behaviour agreed",
        ].map((item) => (
          <li key={item}>
            <Check size={15} />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function EndpointView({ group, endpoint }: { group: GroupSpec; endpoint: EndpointSpec }) {
  const request = `curl -X ${endpoint.method} "${API_BASE_URL}${endpoint.path}" \\
  -H "Authorization: Bearer sk_test_YOUR_KEY"${
    endpoint.body?.length
      ? ` \\
  -H "Content-Type: application/json"`
      : ""
  }`;
  return (
    <article className="article endpoint">
      <div className="crumb">API reference / {group.name}</div>
      <h1>{endpoint.title}</h1>
      <div className="path">
        <Method value={endpoint.method} />
        <code>{endpoint.path}</code>
      </div>
      <p className="lede">{endpoint.summary}</p>
      {endpoint.description && <p>{endpoint.description}</p>}
      <div className="scopes">
        <b>Required scope</b>
        {endpoint.scopes.map((scope) => (
          <code key={scope}>{scope}</code>
        ))}
      </div>
      <Fields title="Path parameters" fields={endpoint.pathParams} />
      <Fields title="Query parameters" fields={endpoint.queryParams} />
      <Fields title="Request body" fields={endpoint.body} />
      <h3>Request</h3>
      <Code value={request} />
      <h3>Response</h3>
      <Code value={JSON.stringify(endpoint.responses[0]?.example, null, 2)} />
      {!!endpoint.notes?.length && (
        <aside className="note">
          <b>Notes</b>
          {endpoint.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </aside>
      )}
      {!!endpoint.errors?.length && (
        <section className="errors">
          <h3>Errors</h3>
          {endpoint.errors.map((error) => (
            <div key={`${error.status}-${error.code}`}>
              <b>{error.status}</b>
              <code>{error.code}</code>
              <span>{error.description}</span>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

function DocsPage() {
  const [mode, setMode] = useState<"business" | "implementation" | "reference">("business");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState({
    group: API_GROUPS[0],
    endpoint: API_GROUPS[0].endpoints[0],
  });
  const groups = useMemo(
    () =>
      API_GROUPS.map((group) => ({
        ...group,
        endpoints: group.endpoints.filter(
          (endpoint) =>
            !query.trim() ||
            `${group.name} ${endpoint.title} ${endpoint.path}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        ),
      })).filter((group) => group.endpoints.length),
    [query],
  );
  return (
    <div className="docs">
      <style>{`
    :root{--navy:#07172f;--orange:#f47320;--line:#e5e8ed;--muted:#596575}.site-shell{width:min(1160px,calc(100% - 40px));margin:auto}.site-head{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(18px)}.site-nav{height:74px;display:flex;align-items:center;justify-content:space-between;gap:24px}.site-head a,.site-footer a{text-decoration:none}.wordmark{font-size:24px;letter-spacing:-.045em}.wordmark b:first-child{color:#172033}.wordmark b:last-child{color:var(--orange)}.wordmark.light b:first-child{color:#fff}.site-navlinks{display:flex;gap:28px}.site-navlinks a,.site-actions>a{font-size:13px;font-weight:600;color:#344054}.site-actions{display:flex;align-items:center;gap:8px}.site-actions>span{border:1px solid var(--line);border-radius:8px;padding:9px;font-size:10px;font-weight:700;color:#475467}.site-actions .site-cta{background:var(--navy);color:#fff;padding:11px 14px;border-radius:7px;font-size:11px}.site-actions button{display:none;width:42px;height:42px;border:1px solid var(--line);border-radius:7px;background:#fff}.mobile-nav{display:none}.docs-head{border-bottom:1px solid var(--line);background:#fff}.docs-head>div{height:62px;display:flex;align-items:center;justify-content:space-between}.docs-name{font-size:15px;font-weight:700}.tabs{height:100%;display:flex}.tabs button{border:0;border-bottom:2px solid transparent;background:#fff;padding:0 18px;font:600 12px inherit;color:#687384;cursor:pointer}.tabs button.active{color:#152033;border-color:var(--orange)}.layout{display:grid;grid-template-columns:270px minmax(0,760px) 180px;max-width:1240px;margin:auto;min-height:100vh}.sidebar{border-right:1px solid var(--line);padding:26px 18px;height:calc(100vh - 136px);position:sticky;top:136px;overflow:auto}.search{position:relative;margin-bottom:22px}.search svg{position:absolute;left:10px;top:11px;color:#98a2b3}.search input{width:100%;height:38px;border:1px solid var(--line);border-radius:6px;padding:0 10px 0 32px;font:12px inherit}.sidegroup{margin:20px 0}.sidegroup>strong{display:block;margin:0 8px 7px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#667085}.sidelink{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;border-radius:5px;padding:7px 8px;text-align:left;font:12px inherit;color:#596273;cursor:pointer}.sidelink:hover,.sidelink.active{background:#f1f3f5;color:#101828}.method{min-width:43px;display:inline-flex;justify-content:center;padding:3px 4px;border-radius:3px;font:700 9px ui-monospace,monospace}.method.get{background:#e3f6eb;color:#08783b}.method.post{background:#e7efff;color:#215ec6}.method.patch{background:#fff1d8;color:#8c5d00}.method.delete{background:#fee8e7;color:#aa2e29}.main{padding:54px 56px 100px}.crumb{color:#7a8491;font-size:11px;margin-bottom:18px}.article h1{font-size:38px;letter-spacing:-.035em;line-height:1.12;margin:0 0 18px}.article .lede{font-size:17px;line-height:1.7;color:#46505d}.article p,.article li{font-size:14px;line-height:1.72;color:#4c5664}.article h2{font-size:24px;letter-spacing:-.02em;margin:48px 0 12px}.article h3{font-size:15px;margin:30px 0 10px}.base{display:flex;gap:18px;border-block:1px solid var(--line);padding:15px 0;margin:28px 0;font-size:12px}.article code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.article table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}.article th,.article td{text-align:left;vertical-align:top;border-bottom:1px solid var(--line);padding:13px 12px}.article th{background:#f7f8f9;color:#596273}.code{position:relative;background:#0b1320;color:#dbe6f3;border-radius:7px;overflow:auto;margin:15px 0 28px}.code pre{margin:0;padding:45px 18px 18px;min-width:620px;font:12px/1.65 ui-monospace,monospace}.copy{position:absolute;right:9px;top:9px;display:flex;gap:6px;align-items:center;border:1px solid #344154;background:#182335;color:#cbd5e1;border-radius:5px;padding:6px 8px;font-size:10px}.note{border-left:3px solid var(--orange);background:#fff8f2;padding:16px 18px;margin:28px 0}.note p{margin:7px 0 0}.checks{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;list-style:none;padding:0}.checks li{display:flex;gap:8px}.checks svg{color:#118443;flex:none;margin-top:4px}.toc{padding:54px 18px;position:sticky;top:136px;height:max-content}.toc strong{font-size:10px;text-transform:uppercase;letter-spacing:.09em}.toc a{display:block;padding:6px 0;color:#6a7481;text-decoration:none;font-size:11px}.path{display:flex;align-items:center;gap:9px;margin:13px 0 25px}.path>code,.scopes code{background:#f4f5f6;border:1px solid var(--line);padding:6px 8px;border-radius:5px;font-size:12px}.scopes{display:flex;align-items:center;gap:8px;font-size:11px;margin:25px 0}.fields{margin:32px 0}.field{display:grid;grid-template-columns:150px 105px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--line);font-size:12px}.field>div{display:flex;gap:6px}.field small{color:#b5481e;font-size:8px;text-transform:uppercase}.field p{margin:0;font-size:12px}.errors>div{display:grid;grid-template-columns:48px 140px 1fr;gap:10px;padding:10px 0;border-top:1px solid var(--line);font-size:11px}.errors span{color:#65707d}.mobile-docnav{display:none}.site-footer{background:var(--navy);color:#fff;padding:56px 0 30px}.footer-top{display:grid;grid-template-columns:1fr 1.4fr;gap:80px;padding-bottom:50px}.site-footer p{color:#8fa0bd;font-size:12px;line-height:1.6;margin-top:18px}.footer-links{display:grid;grid-template-columns:1fr 1fr;gap:40px}.footer-links div{display:grid;align-content:start;gap:11px}.footer-links strong{font-size:11px}.footer-links a{color:#98a8c1;font-size:11px}.footer-bottom{display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.09);padding-top:22px;color:#8191aa;font-size:10px}
    .eyebrow{margin:0 0 10px!important;color:#b84d13!important;font-size:11px!important;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.plain-note{border:1px solid #dbe6ee;background:#f7fafc;padding:18px 20px;margin:28px 0}.plain-note p{margin:5px 0 0}.outcomes{display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid var(--line);margin-top:20px}.outcomes>div{padding:20px 18px}.outcomes>div+div{border-left:1px solid var(--line)}.outcomes p{font-size:12px;margin:7px 0 0}.paths{display:grid;gap:14px;margin:22px 0}.paths section{border:1px solid var(--line);padding:22px}.paths section>span{font-size:10px;color:#a94412;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.paths h3{font-size:18px;margin:8px 0}.paths p{margin:0 0 10px}.paths ol{margin:0;padding-left:20px}.paths li{padding:2px 0}.simple-table{border-top:1px solid var(--line);margin-top:20px}.simple-table>div{display:grid;grid-template-columns:155px 1fr;gap:18px;padding:15px 0;border-bottom:1px solid var(--line)}.simple-table span{color:#4c5664;font-size:14px}.numbered-flow{list-style:none;counter-reset:flow;padding:0}.numbered-flow li{counter-increment:flow;display:grid;grid-template-columns:38px 150px 1fr;gap:12px;align-items:start;padding:14px 0;border-bottom:1px solid var(--line)}.numbered-flow li:before{content:counter(flow);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--navy);color:#fff;font-size:12px}.numbered-flow span{color:#4c5664}.next-step{display:flex;justify-content:space-between;align-items:center;gap:24px;background:var(--navy);color:#fff;padding:24px;margin-top:44px}.next-step p{color:#b7c3d5;margin:5px 0 0}.next-step a{display:grid;place-items:center;min-height:44px;padding:0 16px;border-radius:5px;background:var(--orange);color:#fff;text-decoration:none;font-size:12px;font-weight:700;white-space:nowrap}
    @media(max-width:980px){.site-navlinks,.site-actions>span,.site-actions>a{display:none}.site-actions button{display:grid;place-items:center}.mobile-nav{display:grid;padding:12px 20px 20px;border-top:1px solid var(--line)}.mobile-nav a{padding:10px 0;color:#344054;text-decoration:none;font-size:13px}.layout{grid-template-columns:240px 1fr}.toc{display:none}.main{padding:44px 34px}}
    /* PrizeSkout evidence manual */
    .docs{--ledger-ink:#091a31;--ledger-paper:#fbfaf7;--ledger-warm:#f4f0e8;--ledger-rule:rgba(9,26,49,.11);--ledger-copy:#3f4b59;--ledger-muted:#6e7885;--ledger-accent:#ed6b24;background:var(--ledger-paper);color:var(--ledger-ink);font-family:"NLP Inter Display",Inter,ui-sans-serif,system-ui,sans-serif}.site-head,.docs-head{background:rgba(251,250,247,.94);border-color:var(--ledger-rule)}.site-head{box-shadow:0 1px 0 rgba(9,26,49,.025)}.docs-head>div{height:68px}.docs-name{font-size:12px;letter-spacing:.08em;text-transform:uppercase}.tabs{gap:4px}.tabs button{position:relative;border:0;padding-inline:17px;color:var(--ledger-muted);font-size:12px}.tabs button:after{content:"";position:absolute;inset-inline:17px;bottom:13px;height:2px;background:var(--ledger-accent);transform:scaleX(0);transform-origin:left;transition:transform 160ms ease}.tabs button.active{border:0;color:var(--ledger-ink)}.tabs button.active:after{transform:scaleX(1)}.layout{grid-template-columns:252px minmax(0,800px) 176px;background:var(--ledger-paper)}.sidebar{border-color:var(--ledger-rule);padding-top:38px}.search input{height:44px;background:#f1eee8;border:0;border-radius:3px;color:var(--ledger-ink)}.search input:focus-visible,.tabs button:focus-visible,.sidelink:focus-visible,.copy:focus-visible,.next-step a:focus-visible{outline:2px solid var(--ledger-accent);outline-offset:2px}.sidegroup{margin-block:26px}.sidegroup>strong{color:#7c766d;font-size:9px}.sidelink{min-height:36px;border-radius:3px;color:#65707d;transition:background 140ms ease,color 140ms ease}.sidelink:hover{background:#f0ece5}.sidelink.active{background:var(--ledger-ink);color:#fff}.sidelink.active .method{box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}.main{padding:68px 64px 112px}.article{max-width:720px}.crumb{font:500 10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.025em;color:#8b847a}.eyebrow{color:var(--ledger-accent)!important;font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace!important}.article h1{max-width:660px;font-family:Chillax,ui-sans-serif,sans-serif;font-size:clamp(42px,4vw,58px);font-weight:600;line-height:1.02;letter-spacing:-.045em}.article .lede{max-width:630px;font-size:18px;line-height:1.62;color:var(--ledger-copy)}.article h2{font-family:Chillax,ui-sans-serif,sans-serif;font-size:27px;font-weight:600;letter-spacing:-.035em;margin-top:64px}.article h3{font-family:Chillax,ui-sans-serif,sans-serif}.article p,.article li{font-size:15px;line-height:1.7;color:var(--ledger-copy)}.evidence-ledger{position:relative;display:grid;grid-template-columns:repeat(3,1fr) 1.42fr;margin:44px 0 38px;background:var(--ledger-ink);color:#fff;box-shadow:0 1px 2px rgba(9,26,49,.08),0 10px 30px rgba(9,26,49,.09)}.evidence-ledger:after{content:"";position:absolute;left:10%;right:25%;top:34px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.16),var(--ledger-accent))}.ledger-source,.ledger-result{position:relative;z-index:1;display:flex;min-height:150px;flex-direction:column;justify-content:flex-end;padding:20px}.ledger-source+ .ledger-source{border-left:1px solid rgba(255,255,255,.09)}.ledger-source span{display:grid;width:22px;height:22px;place-items:center;margin-bottom:auto;border:1px solid rgba(255,255,255,.32);border-radius:50%;background:var(--ledger-ink);font:600 8px ui-monospace,monospace}.ledger-source b,.ledger-result b{font-family:Chillax,sans-serif;font-size:15px;font-weight:600}.ledger-source small,.ledger-result small{margin-top:5px;color:#aeb9c9;font-size:10px}.ledger-result{background:var(--ledger-accent);color:#fff}.ledger-result span{margin-bottom:auto;font:700 9px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.ledger-result small{color:#fff1e8}.plain-note{display:grid;grid-template-columns:200px 1fr;gap:28px;border:0;border-block:1px solid var(--ledger-rule);background:transparent;padding:23px 0}.plain-note b{font-family:Chillax,sans-serif;font-size:16px}.plain-note p{margin:0}.outcomes{border-color:var(--ledger-rule)}.outcomes>div{padding:24px 22px 26px}.outcomes>div+div{border-color:var(--ledger-rule)}.outcomes b{font-family:Chillax,sans-serif;font-size:16px}.outcomes p{font-size:13px}.paths{gap:0;border-top:1px solid var(--ledger-rule)}.paths section{display:grid;grid-template-columns:180px 1fr;border:0;border-bottom:1px solid var(--ledger-rule);padding:28px 0}.paths section>span{grid-row:1/4;color:#a3481a;font:700 9px/1.5 ui-monospace,monospace}.paths h3,.paths p,.paths ol{grid-column:2}.paths h3{margin-top:0;font-size:21px}.paths ol{columns:2;column-gap:24px}.simple-table>div{padding-block:18px}.simple-table b{font:600 13px ui-monospace,monospace}.note{border:0;border-inline-start:2px solid var(--ledger-accent);background:var(--ledger-warm);padding:22px 24px}.numbered-flow li{grid-template-columns:44px 170px 1fr;padding-block:18px}.numbered-flow li:before{border-radius:2px;background:var(--ledger-ink);font:700 10px ui-monospace,monospace}.next-step{position:relative;overflow:hidden;padding:30px 32px;background:var(--ledger-ink);box-shadow:0 10px 30px rgba(9,26,49,.12)}.next-step:before{content:"";position:absolute;width:140px;height:140px;right:120px;border:1px solid rgba(255,255,255,.1);border-radius:50%}.next-step>*{position:relative;z-index:1}.next-step a{border-radius:3px;background:var(--ledger-accent);min-height:46px;padding-inline:20px}.toc{padding-top:68px}.toc strong{font:700 9px ui-monospace,monospace}.toc a{padding-block:8px;color:#777f89}.base,.article th,.article td,.field,.errors>div{border-color:var(--ledger-rule)}.code{border-radius:3px;box-shadow:0 8px 24px rgba(9,26,49,.1)}.method{border-radius:2px}.site-footer{margin-top:0}
    @media(max-width:980px){.main{padding-inline:40px}.evidence-ledger{grid-template-columns:repeat(3,1fr)}.ledger-result{grid-column:1/-1;min-height:110px}.paths section{grid-template-columns:150px 1fr}}
    @media(max-width:700px){.site-shell{width:calc(100% - 32px)}.site-nav{height:64px}.docs-head>div{display:block;padding-top:14px}.docs-name{font-size:11px}.tabs{height:52px;overflow-x:auto}.tabs button{padding-inline:12px;white-space:nowrap}.layout{display:block}.sidebar{display:none;position:static;height:auto;border:0;border-bottom:1px solid var(--ledger-rule)}.sidebar.open{display:block}.main{padding:34px 18px 76px}.mobile-docnav{display:flex;align-items:center;gap:8px;min-height:44px;margin-bottom:28px;border:1px solid var(--ledger-rule);background:var(--ledger-paper);border-radius:3px;padding:8px 12px;color:var(--ledger-ink)}.article h1{font-size:38px}.article .lede{font-size:16px}.evidence-ledger{grid-template-columns:1fr}.evidence-ledger:after{display:none}.ledger-source,.ledger-result{grid-column:auto;min-height:104px}.ledger-source+.ledger-source{border-left:0;border-top:1px solid rgba(255,255,255,.09)}.ledger-source span{margin-bottom:17px}.plain-note,.paths section{grid-template-columns:1fr}.paths section>span,.paths h3,.paths p,.paths ol{grid-column:1}.paths section>span{grid-row:auto;margin-bottom:8px}.paths ol{columns:1}.outcomes{grid-template-columns:1fr}.outcomes>div+div{border-left:0;border-top:1px solid var(--ledger-rule)}.simple-table>div,.numbered-flow li{grid-template-columns:1fr}.numbered-flow li:before{margin-bottom:3px}.next-step{align-items:flex-start;flex-direction:column}.checks{grid-template-columns:1fr}.field{grid-template-columns:1fr}.errors>div{grid-template-columns:42px 1fr}.errors span{grid-column:2}.footer-top{grid-template-columns:1fr;gap:35px}.footer-links{grid-template-columns:1fr 1fr}.footer-bottom{flex-direction:column;gap:8px}.article table{display:block;overflow-x:auto}}
  `}</style>
      <SiteHeader />
      <div className="docs-head">
        <div className="site-shell">
          <div className="docs-name">PrizeSkout documentation</div>
          <div className="tabs">
            <button
              className={mode === "business" ? "active" : ""}
              onClick={() => setMode("business")}
            >
              Business guide
            </button>
            <button
              className={mode === "implementation" ? "active" : ""}
              onClick={() => setMode("implementation")}
            >
              Implementation
            </button>
            <button
              className={mode === "reference" ? "active" : ""}
              onClick={() => setMode("reference")}
            >
              API Reference
            </button>
          </div>
        </div>
      </div>
      <div className="layout">
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <div className="search">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documentation"
              aria-label="Search documentation"
            />
          </div>
          <div className="sidegroup">
            <strong>Start</strong>
            <button
              className={`sidelink ${mode === "business" ? "active" : ""}`}
              onClick={() => {
                setMode("business");
                setMenu(false);
              }}
            >
              Business guide
            </button>
            <button
              className={`sidelink ${mode === "implementation" ? "active" : ""}`}
              onClick={() => {
                setMode("implementation");
                setMenu(false);
              }}
            >
              Implementation guide
            </button>
          </div>
          {groups.map((group) => (
            <div className="sidegroup" key={group.slug}>
              <strong>{group.name}</strong>
              {group.endpoints.map((endpoint) => (
                <button
                  className={`sidelink ${mode === "reference" && selected.group.slug === group.slug && selected.endpoint.slug === endpoint.slug ? "active" : ""}`}
                  onClick={() => {
                    setSelected({ group, endpoint });
                    setMode("reference");
                    setMenu(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  key={`${group.slug}-${endpoint.slug}`}
                >
                  <Method value={endpoint.method} />
                  {endpoint.title}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <main className="main">
          <button className="mobile-docnav" onClick={() => setMenu((value) => !value)}>
            {menu ? <X size={15} /> : <Menu size={15} />} Browse documentation
          </button>
          {mode === "business" ? (
            <BusinessGuide />
          ) : mode === "implementation" ? (
            <ImplementationGuide />
          ) : (
            <EndpointView group={selected.group} endpoint={selected.endpoint} />
          )}
        </main>
        <aside className="toc">
          {mode === "business" && (
            <>
              <strong>On this page</strong>
              <a href="#business-result">What you get</a>
              <a href="#business-path">Choose your path</a>
              <a href="#business-data">Information shared</a>
              <a href="#business-launch">Before launch</a>
            </>
          )}
          {mode === "implementation" && (
            <>
              <strong>On this page</strong>
              <a href="#models">Connection models</a>
              <a href="#auth">Authentication</a>
              <a href="#order">First order</a>
              <a href="#identity">Identity mapping</a>
              <a href="#evidence">Financial evidence</a>
              <a href="#production">Production checklist</a>
            </>
          )}
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
