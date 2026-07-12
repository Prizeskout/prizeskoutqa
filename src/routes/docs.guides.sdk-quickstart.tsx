// SDK Quickstart guide. Walks a new licensee through:
//   1. Mint a test key.
//   2. Drop in a tiny TypeScript SDK snippet.
//   3. Make their first signed request.
//   4. Subscribe to a webhook.
// All examples are copy-pasteable. The TS snippet uses fetch so it runs in
// any modern Node / Worker / browser environment without dependencies.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Terminal, KeyRound, Webhook, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/guides/sdk-quickstart")({
  head: () => ({
    meta: [
      { title: "SDK Quickstart | PrizeSkout" },
      {
        name: "description",
        content:
          "Mint a test API key, install the lightweight TypeScript client, and make your first signed request to the PrizeSkout API in under 5 minutes.",
      },
      { property: "og:title", content: "SDK Quickstart | PrizeSkout" },
      {
        property: "og:description",
        content: "Get from zero to your first API call in five minutes.",
      },
    ],
  }),
  component: SdkQuickstartPage,
});

const NODE_SNIPPET = `// prizeskout-client.ts — drop-in fetch wrapper, zero dependencies.
const BASE = "https://prizeskout.qa";

export function createClient(apiKey: string) {
  async function request<T>(method: string, path: string, body?: unknown, idemKey?: string): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    };
    if (idemKey) headers["Idempotency-Key"] = idemKey;

    const res = await fetch(\`\${BASE}\${path}\`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    if (!res.ok) {
      throw new Error(\`PrizeSkout \${res.status}: \${text}\`);
    }
    return data;
  }

  return {
    syncCatalog: (items: unknown[], idemKey: string) =>
      request("POST", "/v1/sync", { items }, idemKey),
    getRecommendation: (productId: string) =>
      request("GET", \`/v1/dynprice?product_id=\${productId}\`),
    listCompetitorPrices: () =>
      request("GET", "/v1/competitors/prices"),
  };
}`;

const USAGE_SNIPPET = `import { createClient } from "./prizeskout-client";

const client = createClient(process.env.PRIZESKOUT_API_KEY!);

// 1. Sync your catalog (idempotent — safe to retry).
await client.syncCatalog(
  [{ sku: "SKU-001", name: "Widget", list_price: 49.99 }],
  crypto.randomUUID(),
);

// 2. Ask the engine for a recommended price.
const rec = await client.getRecommendation("SKU-001");
console.log(rec); // { recommended_price, reason, signals, ... }`;

const CURL_SNIPPET = `curl -X POST 'https://prizeskout.qa/v1/sync' \\
  -H 'Authorization: Bearer sk_test_YOUR_KEY' \\
  -H 'Content-Type: application/json' \\
  -H 'Idempotency-Key: '$(uuidgen)'' \\
  -d '{"items": [{"sku":"SKU-001","name":"Widget","list_price":49.99}]}'`;

const WEBHOOK_SNIPPET = `import crypto from "crypto";
import express from "express";

const app = express();
app.use(express.raw({ type: "application/json" }));

app.post("/webhooks/prizeskout", (req, res) => {
  const signature = req.header("X-Webhook-Signature")!;
  const expected = crypto
    .createHmac("sha256", process.env.PRIZESKOUT_WEBHOOK_SECRET!)
    .update(req.body)
    .digest("hex");

  if (signature !== expected) return res.status(401).end();

  const event = JSON.parse(req.body.toString("utf8"));
  // event.type: "price.changed" | "recommendation.ready" | ...
  console.log("Got event:", event.type, event.data);
  res.status(200).end();
});`;

function SdkQuickstartPage() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <section
        style={{ background: "#FAFAFA", minHeight: "calc(100vh - 64px)", padding: "56px 24px 96px" }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#EA580C", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Guide · 5 min
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A18",
              marginBottom: 12,
            }}
          >
            SDK Quickstart
          </h1>
          <p style={{ fontSize: 16, color: "#5A5A58", lineHeight: 1.65, marginBottom: 32, maxWidth: 640 }}>
            Get from zero to your first signed PrizeSkout API call in five minutes. No SDK install
            required — the snippet below uses native <code>fetch</code> and runs in Node 18+, the
            browser, Cloudflare Workers, or Deno.
          </p>

          <Step
            n={1}
            icon={KeyRound}
            title="Mint a test key"
            body={
              <>
                Head to{" "}
                <Link to="/dashboard/api-keys" style={{ color: "#EA580C", fontWeight: 600 }}>
                  API Keys
                </Link>{" "}
                in the dashboard and click <strong>Create test key</strong>. Test-mode keys never
                touch live data and are perfect for local development. Copy the secret somewhere
                safe — Lovable Cloud only stores a one-way hash and can't show it again.
              </>
            }
          />

          <Step
            n={2}
            icon={Terminal}
            title="Drop in the client"
            body={
              <>
                Save this as <code>prizeskout-client.ts</code> next to your app code. Zero
                dependencies, fully typed, swappable for a richer SDK later if you outgrow it.
              </>
            }
          >
            <CodeBlock language="typescript" code={NODE_SNIPPET} />
          </Step>

          <Step
            n={3}
            icon={Terminal}
            title="Make your first request"
            body="Sync your catalog, then ask the pricing engine for a recommendation."
          >
            <CodeBlock language="typescript" code={USAGE_SNIPPET} />
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#5A5A58",
                lineHeight: 1.55,
              }}
            >
              Prefer cURL? Same call from the command line:
            </div>
            <div style={{ marginTop: 8 }}>
              <CodeBlock language="bash" code={CURL_SNIPPET} />
            </div>
          </Step>

          <Step
            n={4}
            icon={Webhook}
            title="Subscribe to events"
            body={
              <>
                Register a webhook from{" "}
                <Link to="/dashboard/webhooks" style={{ color: "#EA580C", fontWeight: 600 }}>
                  Webhooks
                </Link>
                , subscribe to <code>price.changed</code> and{" "}
                <code>recommendation.ready</code>, then verify each delivery with HMAC-SHA256
                before processing.
              </>
            }
          >
            <CodeBlock language="typescript" code={WEBHOOK_SNIPPET} />
          </Step>

          <div
            style={{
              marginTop: 40,
              padding: 24,
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
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginBottom: 4 }}>
                Want to try requests live?
              </div>
              <div style={{ fontSize: 13, color: "#5A5A58" }}>
                Use the API Explorer to fire signed test-mode calls without leaving the dashboard.
              </div>
            </div>
            <Link
              to="/dashboard/api-explorer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                color: "#FFF",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Open API Explorer <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
  children,
}: {
  n: number;
  icon: typeof KeyRound;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFF",
        border: "1px solid #E8E8E5",
        borderRadius: 10,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: "#EA580C",
            color: "#FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {n}
        </div>
        <Icon size={16} color="#EA580C" />
        <div style={{ fontSize: 17, fontWeight: 600, color: "#1A1A18" }}>{title}</div>
      </div>
      <div style={{ fontSize: 14, color: "#5A5A58", lineHeight: 1.65, marginBottom: children ? 14 : 0 }}>
        {body}
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        position: "relative",
        background: "#0F1419",
        borderRadius: 8,
        padding: 16,
        overflow: "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#9A9A9A",
            fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {language}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "1px solid #2A2A2A",
            color: "#9A9A9A",
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "#E5E2DB",
          fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    </div>
  );
}
