// Webhooks guide. Stripe-style HMAC verification, replay protection, retries.
// Linked from the guides hub and from Dashboard → Webhooks.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Webhook, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/guides/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks | PrizeSkout API" },
      {
        name: "description",
        content:
          "Subscribe to PrizeSkout events, verify HMAC-SHA256 signatures, handle replay protection and retries. Node, Python, and curl examples.",
      },
      { property: "og:title", content: "Webhooks | PrizeSkout API" },
      {
        property: "og:description",
        content:
          "Verify PrizeSkout webhook signatures and handle retries safely. Node, Python, and curl examples.",
      },
    ],
  }),
  component: WebhooksGuide,
});

const FONT_MONO =
  "ui-monospace, 'SFMono-Regular', Menlo, Monaco, monospace";

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <div style={{ position: "relative", marginBottom: 20 }}>
      {lang && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 12,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7A7A78",
          }}
        >
          {lang}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          background: "#0A0A0A",
          color: "#E5E5E2",
          fontFamily: FONT_MONO,
          fontSize: 12.5,
          lineHeight: 1.65,
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2
      id={id}
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#1A1A18",
        letterSpacing: "-0.01em",
        marginTop: 44,
        marginBottom: 14,
        scrollMarginTop: 80,
      }}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", marginTop: 24, marginBottom: 10 }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.7, color: "#3A3A38", marginBottom: 16 }}>{children}</p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: FONT_MONO,
        background: "#F4F4F2",
        padding: "1px 5px",
        borderRadius: 3,
        fontSize: "0.92em",
      }}
    >
      {children}
    </code>
  );
}

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: "info" | "warning" | "success";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const colors =
    tone === "warning"
      ? { bg: "rgba(234, 179, 8, 0.06)", border: "rgba(234, 179, 8, 0.25)", fg: "#854D0E" }
      : tone === "success"
        ? { bg: "rgba(34, 197, 94, 0.05)", border: "rgba(34, 197, 94, 0.22)", fg: "#166534" }
        : { bg: "rgba(59, 130, 246, 0.05)", border: "rgba(59, 130, 246, 0.18)", fg: "#1E3A8A" };
  return (
    <div
      style={{
        padding: "14px 16px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: colors.fg }}>
        {icon}
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3A3A38" }}>{children}</div>
    </div>
  );
}

const HEADERS: { h: string; v: React.ReactNode }[] = [
  {
    h: "X-Webhook-Signature",
    v: (
      <>
        Comma-separated values: <Code>t=&lt;unix_ts&gt;,v1=&lt;hex&gt;,sha256=&lt;hex&gt;</Code>.{" "}
        <Code>v1</Code> is the current scheme — HMAC-SHA-256 of{" "}
        <Code>{"{timestamp}.{raw_body}"}</Code>. <Code>sha256</Code> is a legacy body-only HMAC kept for
        backward compatibility.
      </>
    ),
  },
  {
    h: "X-Webhook-Timestamp",
    v: (
      <>
        Unix epoch seconds when the signature was generated. Compare against your server clock to reject
        replays. Same value as the <Code>t=</Code> field inside the signature header.
      </>
    ),
  },
  {
    h: "X-Webhook-Event",
    v: (
      <>
        Event type, e.g. <Code>competitor.price_changed</Code>,{" "}
        <Code>pricing.recommendation_created</Code>,{" "}
        <Code>field_intel.observation_submitted</Code>.
      </>
    ),
  },
  {
    h: "X-Webhook-Delivery-Id",
    v: (
      <>
        Unique ID for this event. Retries reuse the same ID — store it and dedupe to make your handler
        idempotent.
      </>
    ),
  },
  {
    h: "X-Webhook-Delivery-Attempt",
    v: (
      <>
        <Code>1</Code> for the first delivery, <Code>2+</Code> for retries (exponential backoff up to
        the endpoint's <Code>max_attempts</Code>).
      </>
    ),
  },
];

const NODE_EXAMPLE = `import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300; // reject anything older than 5 minutes
const SECRET = process.env.PRIZESKOUT_WEBHOOK_SECRET!;

export async function handleWebhook(req: Request): Promise<Response> {
  const sigHeader = req.headers.get("X-Webhook-Signature");
  const rawBody = await req.text(); // MUST read before JSON.parse

  if (!sigHeader) {
    return new Response("missing signature", { status: 400 });
  }

  // Parse "t=<ts>,v1=<hex>,sha256=<hex>"
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) {
    return new Response("malformed signature", { status: 400 });
  }

  // 1. Replay protection
  const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(skew) || skew > TOLERANCE_SECONDS) {
    return new Response("timestamp outside tolerance", { status: 400 });
  }

  // 2. Constant-time signature check
  const expected = createHmac("sha256", SECRET)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");
  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("invalid signature", { status: 401 });
  }

  // 3. Idempotency — dedupe by delivery id
  const deliveryId = req.headers.get("X-Webhook-Delivery-Id");
  if (deliveryId && (await alreadyProcessed(deliveryId))) {
    return new Response("ok", { status: 200 }); // 2xx so we don't retry
  }

  const event = JSON.parse(rawBody);
  await processEvent(event);
  if (deliveryId) await markProcessed(deliveryId);
  return new Response("ok", { status: 200 });
}`;

const PYTHON_EXAMPLE = `import hmac, hashlib, os, time
from flask import Flask, request, abort

TOLERANCE_SECONDS = 300
SECRET = os.environ["PRIZESKOUT_WEBHOOK_SECRET"].encode()

app = Flask(__name__)

@app.post("/webhooks/prizeskout")
def webhook():
    sig_header = request.headers.get("X-Webhook-Signature", "")
    raw_body = request.get_data()  # bytes, BEFORE any JSON parsing

    parts = dict(p.split("=", 1) for p in sig_header.split(",") if "=" in p)
    timestamp = parts.get("t")
    v1 = parts.get("v1")
    if not timestamp or not v1:
        abort(400, "malformed signature")

    # 1. Replay protection
    if abs(time.time() - int(timestamp)) > TOLERANCE_SECONDS:
        abort(400, "timestamp outside tolerance")

    # 2. Constant-time signature check
    signed_payload = f"{timestamp}.".encode() + raw_body
    expected = hmac.new(SECRET, signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(v1, expected):
        abort(401, "invalid signature")

    # 3. Idempotency
    delivery_id = request.headers.get("X-Webhook-Delivery-Id")
    if delivery_id and already_processed(delivery_id):
        return "ok", 200

    event = request.get_json()
    process_event(event)
    if delivery_id:
        mark_processed(delivery_id)
    return "ok", 200`;

const CURL_EXAMPLE = `# Inspect what PrizeSkout sent (useful when debugging from the deliveries log)
# Replace SECRET and the saved request body / headers with values from a real delivery.

TIMESTAMP="1714060800"
RAW_BODY='{"id":"evt_01HX...","type":"competitor.price_changed","data":{}}'
SECRET="whsec_abcdef..."

# Recompute the v1 signature locally and compare against X-Webhook-Signature.
EXPECTED=$(printf '%s.%s' "$TIMESTAMP" "$RAW_BODY" \\
  | openssl dgst -sha256 -hmac "$SECRET" -hex \\
  | awk '{print $2}')

echo "Expected v1=$EXPECTED"`;

function WebhooksGuide() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <section style={{ background: "#FAFAFA", minHeight: "calc(100vh - 64px)", padding: "40px 24px 96px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link
            to="/docs/guides"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "#5A5A58",
              textDecoration: "none",
              marginBottom: 18,
            }}
          >
            <ArrowLeft size={13} /> All guides
          </Link>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A18",
              marginBottom: 12,
            }}
          >
            Webhooks
          </h1>
          <p style={{ fontSize: 16, color: "#5A5A58", lineHeight: 1.65, marginBottom: 32 }}>
            PrizeSkout pushes events to your endpoint as soon as they happen — competitor price
            changes, new pricing recommendations, field observations, and more. Every delivery is
            HMAC-signed so you can trust the payload, and every failure is automatically retried with
            exponential backoff.
          </p>

          <H2 id="overview">How it works</H2>
          <P>
            Create one or more endpoints in <strong>Dashboard → Webhooks</strong>, pick which event
            types you want to receive, and PrizeSkout will <Code>POST</Code> a JSON event to each
            matching endpoint. Each event has a stable <Code>id</Code>, a <Code>type</Code>, and a
            <Code>data</Code> object whose shape is documented per event type in the API reference.
          </P>
          <Callout
            tone="info"
            icon={<Webhook size={14} />}
            title="Signing secrets are shown once"
          >
            When you create or rotate a webhook endpoint, the signing secret (
            <Code>whsec_…</Code>) is displayed exactly once in a copy-once dialog. Store it in your
            secret manager immediately — PrizeSkout only keeps the last four characters for the UI.
          </Callout>

          <H2 id="headers">Request headers we send</H2>
          <P>Every webhook delivery includes these headers:</P>
          <div
            style={{
              border: "1px solid #E8E8E5",
              borderRadius: 8,
              overflow: "hidden",
              background: "#FFF",
              marginBottom: 20,
            }}
          >
            {HEADERS.map((row, i) => (
              <div
                key={row.h}
                style={{
                  display: "grid",
                  gridTemplateColumns: "230px 1fr",
                  padding: "10px 14px",
                  borderBottom: i === HEADERS.length - 1 ? "none" : "1px solid #F0F0EE",
                  fontSize: 13,
                  alignItems: "start",
                }}
              >
                <code
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: "#1A1A18",
                    fontWeight: 600,
                    wordBreak: "break-all",
                  }}
                >
                  {row.h}
                </code>
                <span style={{ color: "#3A3A38", lineHeight: 1.55 }}>{row.v}</span>
              </div>
            ))}
          </div>

          <H2 id="verify">Verifying the signature</H2>
          <P>Three checks, in this order. Skip any one and your endpoint is exploitable.</P>
          <ol
            style={{
              paddingLeft: 22,
              marginBottom: 16,
              fontSize: 14.5,
              color: "#3A3A38",
              lineHeight: 1.75,
            }}
          >
            <li style={{ marginBottom: 6 }}>
              <strong>Read the raw body</strong> as a string before parsing JSON. Re-serialising parsed
              JSON changes byte order and whitespace, which breaks the signature.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Check the timestamp.</strong> Reject if{" "}
              <Code>|now − t| &gt; 300 seconds</Code>. This is the replay-protection window — without
              it, an attacker who captures a valid request can resend it forever.
            </li>
            <li>
              <strong>Compute</strong> <Code>HMAC_SHA256(secret, "{`{t}.{raw_body}`}")</Code> and
              compare to the <Code>v1</Code> field using a <strong>constant-time</strong> comparison
              (<Code>crypto.timingSafeEqual</Code>, <Code>hmac.compare_digest</Code>). Never use{" "}
              <Code>===</Code> — it leaks information via timing side-channels.
            </li>
          </ol>

          <H3>Node.js / TypeScript</H3>
          <CodeBlock lang="ts">{NODE_EXAMPLE}</CodeBlock>

          <H3>Python (Flask)</H3>
          <CodeBlock lang="py">{PYTHON_EXAMPLE}</CodeBlock>

          <H3>curl / openssl (debugging only)</H3>
          <P>
            Use this to recompute the expected signature locally when investigating a failed delivery
            — paste the <Code>X-Webhook-Timestamp</Code>, raw body, and your signing secret:
          </P>
          <CodeBlock lang="bash">{CURL_EXAMPLE}</CodeBlock>

          <H2 id="idempotency">Idempotency &amp; retries</H2>
          <P>
            PrizeSkout retries any delivery that does not return a <Code>2xx</Code> within 10 seconds.
            Retries use exponential backoff up to the endpoint's <Code>max_attempts</Code> setting.
            Because retries are possible, your handler <strong>must be idempotent</strong>:
          </P>
          <ul
            style={{
              paddingLeft: 22,
              marginBottom: 20,
              fontSize: 14.5,
              color: "#3A3A38",
              lineHeight: 1.7,
            }}
          >
            <li style={{ marginBottom: 6 }}>
              Dedupe on <Code>X-Webhook-Delivery-Id</Code> — it is identical across retries of the
              same event.
            </li>
            <li style={{ marginBottom: 6 }}>
              Store processed IDs in a table or short-TTL cache (24 hours is plenty). Return{" "}
              <Code>200</Code> on a duplicate so we stop retrying.
            </li>
            <li>
              Treat each event type as a state-transition signal, not a command. Re-applying the same{" "}
              <Code>competitor.price_changed</Code> event should leave your data in the same state.
            </li>
          </ul>
          <Callout
            tone="success"
            icon={<ShieldCheck size={14} />}
            title="Best practice"
          >
            Acknowledge the webhook (return <Code>200</Code>) <em>before</em> doing slow work. Push the
            event onto a queue inside your handler and process it asynchronously. This keeps you under
            the 10-second timeout and avoids unnecessary retries.
          </Callout>

          <H2 id="rotation">Rotating the signing secret</H2>
          <P>
            Rotate any time the secret may have been exposed (committed to a repo, leaked in logs,
            shared in a screen recording). In <strong>Dashboard → Webhooks</strong>, click the rotate
            icon on the endpoint — a new <Code>whsec_…</Code> is generated and shown once. The old
            secret stops working immediately, so deploy the new one to your server first.
          </P>
          <Callout
            tone="warning"
            icon={<AlertTriangle size={14} />}
            title="No grace period on rotation"
          >
            Unlike API keys, webhook secrets do not have an overlap window. The moment you rotate, any
            in-flight delivery still using the old secret will fail signature verification on your
            side. Plan rotations during a low-traffic window.
          </Callout>

          <H2 id="testing">Testing locally</H2>
          <P>
            Use a tunnel like <Code>ngrok</Code>, <Code>cloudflared tunnel</Code>, or your platform's
            preview URL to expose your local server to PrizeSkout. Point a webhook endpoint at the
            tunnel URL, then trigger a test delivery from{" "}
            <strong>Dashboard → Webhooks → Send test event</strong>. The deliveries log shows the
            request, response status, and the exact body we sent — useful for diffing against what
            your verifier received.
          </P>

          <H3>Debugging endpoint: recompute a signature on demand</H3>
          <P>
            When a verifier rejects a delivery, the fastest way to find the cause is to ask our
            server to recompute the same signature for you. <Code>POST</Code> the secret, the
            timestamp from <Code>X-Webhook-Timestamp</Code>, and the exact raw body — we return
            what we would have signed and (optionally) compare against what you received.
          </P>
          <CodeBlock lang="bash">{`curl -X POST https://api.prizeskout.qa/api/public/v1/webhooks/test-signature \\
  -H "Content-Type: application/json" \\
  -d '{
    "secret": "whsec_abcdef...",
    "timestamp": "1714060800",
    "rawBody": "{\\"id\\":\\"evt_01HX...\\",\\"type\\":\\"competitor.price_changed\\",\\"data\\":{}}",
    "receivedSignature": "t=1714060800,v1=...,sha256=..."
  }'`}</CodeBlock>
          <P>
            The response includes the expected <Code>v1</Code>, the full{" "}
            <Code>X-Webhook-Signature</Code> header we would have sent, a replay-window check
            against the current server time, and — if you provided{" "}
            <Code>receivedSignature</Code> — a constant-time comparison plus diagnostic notes
            explaining the most likely cause of any mismatch. Nothing from the request is logged or
            stored.
          </P>

          <div
            style={{
              marginTop: 48,
              padding: 20,
              background: "#FFF",
              border: "1px solid #E8E8E5",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18", marginBottom: 4 }}>
                Next: rotate &amp; manage keys
              </div>
              <div style={{ fontSize: 13, color: "#5A5A58" }}>
                See the authentication guide for API key scopes and rotation.
              </div>
            </div>
            <Link
              to="/docs/guides/authentication"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#1A1A18",
                color: "#FFF",
                fontSize: 13,
                fontWeight: 600,
                padding: "9px 14px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              <RefreshCw size={13} /> Authentication
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
