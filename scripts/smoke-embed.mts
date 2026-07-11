/**
 * HTTP smoke test — White-Label Embed API (API 13)
 *
 * Tests:
 *  1.  GET  /v1/embed/config           — 404 (not configured yet)
 *  2.  GET  /v1/embed/scopes           — 200  lists all 4 scopes
 *  3.  POST /v1/embed/config           — 201  create with custom branding
 *  4.  GET  /v1/embed/config           — 200  verify saved config
 *  5.  POST /v1/embed/config           — 200  update primary_color
 *  6.  POST /v1/embed/token            — 200  issue token, all 4 scopes
 *  7.  GET  /embed/widget?token=...    — 200  renders branded HTML, check for brand name
 *  8.  GET  /embed/widget              — verify NO "Prizeskout" string in body
 *  9.  GET  /embed/widget?token=...    — expired token ? 401
 * 10.  GET  /embed/widget?token=...    — wrong-scope token ? 401
 * 11.  GET  /embed/widget?token=...    — tampered signature ? 401
 * 12.  POST /v1/embed/token            — 403 wrong scope
 * 13.  POST /v1/embed/config           — 422 missing brand_name
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes } from "crypto";
import { writeFileSync } from "fs";

const BASE      = "https://prizeskout.qa";
const API_BASE  = `${BASE}/api/public`;
const MAIN_LIC  = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const UID       = "bed12406-2798-47f7-a30c-5de559e90d6d";
const ACCOUNT   = "4a292c7b-fa88-468a-8e33-fdc795e2f030";
const BRAND     = "GulfStyle Commerce";
const COLOR     = "#E8420A";

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
function randKey() {
  return "sk_test_" + randomBytes(16).toString("hex");
}

// --- Test infra ---------------------------------------------------------------

let passed = 0;
let failed = 0;
const live: Record<string, unknown> = {};

function assert(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ? ${label}`);
    passed++;
  } else {
    console.error(`  ? ${label}`, detail ?? "");
    failed++;
  }
}

async function req(
  method: string,
  path: string,
  opts: { body?: unknown; key?: string; base?: string } = {},
): Promise<{ status: number; body: unknown; text: string }> {
  const url = (opts.base ?? API_BASE) + path;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.key ? { Authorization: `Bearer ${opts.key}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, text };
}

// --- Setup: create write-scoped and read-only API keys -----------------------

async function insertKey(name: string, raw: string, scopes: string[]): Promise<string> {
  const { data, error } = await (admin as any).from("api_keys").insert({
    user_id: UID,
    licensee_id: MAIN_LIC,
    name,
    key_prefix: raw.slice(0, 12),
    key_hash: hashKey(raw),
    last_four: raw.slice(-4),
    mode: "test",
    scopes,
  }).select("id").single();
  if (error) throw new Error(`api_keys insert (${name}): ${error.message}`);
  return data.id;
}

// Clean up any pre-existing embed_configs for this licensee so tests are idempotent.
await (admin as any).from("embed_configs").delete().eq("licensee_id", MAIN_LIC);

const writeKey = randKey();
const readKey  = randKey();
const badKey   = randKey();
const wkId  = await insertKey("embed-write-test",  writeKey, ["embed:write", "embed:read"]);
const rkId  = await insertKey("embed-read-test",   readKey,  ["embed:read"]);
const bkId  = await insertKey("embed-no-scope",    badKey,   ["read"]);

console.log("\n=== API 13 — White-Label Embed ===\n");

// --- 1. GET /v1/embed/config — not configured yet ----------------------------

console.log("1. GET /v1/embed/config (not configured ? 404)");
{
  const r = await req("GET", "/v1/embed/config", { key: writeKey });
  live["01_get_config_404"] = r.body;
  assert("status 404", r.status === 404, r.status);
  assert("error code not_found", (r.body as any)?.error?.code === "not_found");
}

// --- 2. GET /v1/embed/scopes -------------------------------------------------

console.log("\n2. GET /v1/embed/scopes");
{
  const r = await req("GET", "/v1/embed/scopes", { key: readKey });
  live["02_scopes"] = r.body;
  assert("status 200", r.status === 200, r.status);
  const scopes = (r.body as any)?.scopes;
  assert("returns 4 scopes", Array.isArray(scopes) && scopes.length === 4, scopes?.length);
  assert("contains pricing_widget", scopes?.some((s: any) => s.scope === "pricing_widget"));
  assert("contains action_items",   scopes?.some((s: any) => s.scope === "action_items"));
}

// --- 3. POST /v1/embed/config — create ---------------------------------------

console.log("\n3. POST /v1/embed/config (create)");
{
  const r = await req("POST", "/v1/embed/config", {
    key: writeKey,
    body: {
      brand_name: BRAND,
      primary_color: COLOR,
      powered_by_visible: false,
    },
  });
  live["03_set_config_201"] = r.body;
  assert("status 201", r.status === 201, r.status);
  assert("brand_name saved", (r.body as any)?.config?.brand_name === BRAND);
  assert("primary_color saved", (r.body as any)?.config?.primary_color === COLOR);
  assert("powered_by_visible false", (r.body as any)?.config?.powered_by_visible === false);
}

// --- 4. GET /v1/embed/config — verify ----------------------------------------

console.log("\n4. GET /v1/embed/config (verify saved)");
{
  const r = await req("GET", "/v1/embed/config", { key: readKey });
  live["04_get_config_200"] = r.body;
  assert("status 200", r.status === 200, r.status);
  assert("brand_name", (r.body as any)?.config?.brand_name === BRAND);
  assert("no signing_key_hex exposed", !(r.body as any)?.config?.signing_key_hex);
}

// --- 5. POST /v1/embed/config — update color ---------------------------------

console.log("\n5. POST /v1/embed/config (update ? 200)");
{
  const r = await req("POST", "/v1/embed/config", {
    key: writeKey,
    body: { brand_name: BRAND, primary_color: "#FF6600" },
  });
  live["05_update_config_200"] = r.body;
  assert("status 200", r.status === 200, r.status);
  assert("color updated", (r.body as any)?.config?.primary_color === "#FF6600");
}

// Reset color for widget test
await req("POST", "/v1/embed/config", {
  key: writeKey,
  body: { brand_name: BRAND, primary_color: COLOR, powered_by_visible: false },
});

// --- 6. POST /v1/embed/token — issue token ------------------------------------

console.log("\n6. POST /v1/embed/token (all 4 scopes)");
let embedToken = "";
let embedUrl = "";
{
  const r = await req("POST", "/v1/embed/token", {
    key: writeKey,
    body: {
      merchant_id: ACCOUNT,
      scopes: ["pricing_widget", "roi_summary", "competitor_chart", "action_items"],
    },
  });
  live["06_issue_token"] = r.body;
  assert("status 200", r.status === 200, r.status);
  embedToken = (r.body as any)?.embed_token ?? "";
  embedUrl   = (r.body as any)?.embed_url ?? "";
  assert("embed_token present", embedToken.length > 10);
  assert("embed_url present", embedUrl.includes("/embed/widget?token="));
  assert("expires_at present", !!(r.body as any)?.expires_at);
  assert("branding in response", (r.body as any)?.branding?.brand_name === BRAND);
  assert("powered_by_visible false", (r.body as any)?.branding?.powered_by_visible === false);

  const claims = (r.body as any)?.decoded_claims;
  assert("decoded iss = prizeskout-embed", claims?.iss === "prizeskout-embed");
  assert("decoded sub = ACCOUNT", claims?.sub === ACCOUNT);
  assert("decoded scopes array length 4", claims?.scopes?.length === 4);

  console.log("\n  Decoded token claims:");
  console.log("  " + JSON.stringify(claims, null, 2).replace(/\n/g, "\n  "));
}

// --- 7. GET /embed/widget — renders branded HTML ------------------------------

console.log("\n7. GET /embed/widget?token=... (renders branded HTML)");
{
  const r = await fetch(`${BASE}/embed/widget?token=${embedToken}`);
  const html = await r.text();
  live["07_widget_html"] = { status: r.status, length: html.length, snippet: html.slice(0, 600) };
  assert("status 200", r.status === 200, r.status);
  assert("content-type text/html", r.headers.get("content-type")?.includes("text/html") ?? false);
  assert(`brand name "${BRAND}" in HTML`, html.includes(BRAND));
  assert(`brand color ${COLOR} in HTML`, html.includes(COLOR));
  assert("Arabic content present (????)", html.includes("????"));
  console.log("\n  Widget HTML snippet (first 600 chars):");
  console.log("  " + html.slice(0, 600).replace(/\n/g, "\n  "));
}

// --- 8. Verify NO "Prizeskout" reference -------------------------------------

console.log("\n8. GET /embed/widget — no Prizeskout reference (powered_by_visible=false)");
{
  const r = await fetch(`${BASE}/embed/widget?token=${embedToken}`);
  const html = await r.text();
  live["08_no_prizeskout"] = { prizeskout_count: (html.match(/Prizeskout/gi) ?? []).length };
  const count = (html.match(/Prizeskout/gi) ?? []).length;
  assert("zero Prizeskout references", count === 0, `found ${count}`);
}

// --- 9. Expired token ? 401 --------------------------------------------------

console.log("\n9. GET /embed/widget with expired token ? 401");
{
  // Build a token with exp in the past using the licensee's actual signing key.
  const { data: cfg } = await (admin as any)
    .from("embed_configs")
    .select("signing_key_hex")
    .eq("licensee_id", MAIN_LIC)
    .single();

  const keyHex = cfg?.signing_key_hex as string;
  const now = Math.floor(Date.now() / 1000);
  const expiredClaims = {
    iss: "prizeskout-embed",
    sub: ACCOUNT,
    account_id: ACCOUNT,
    licensee_id: MAIN_LIC,
    scopes: ["pricing_widget"],
    iat: now - 7200,
    exp: now - 3600,
    jti: "expired_test",
  };
  function b64u(s: string) { return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); }
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64u(JSON.stringify(expiredClaims));
  const unsigned = `${header}.${payload}`;
  const sig = createHmac("sha256", Buffer.from(keyHex, "hex"))
    .update(unsigned).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const expiredToken = `${unsigned}.${sig}`;

  const r = await fetch(`${BASE}/embed/widget?token=${expiredToken}`);
  const body = await r.json();
  live["09_expired_token"] = { status: r.status, body };
  assert("status 401", r.status === 401, r.status);
  assert("error code token_expired", (body as any)?.error?.code === "token_expired");
}

// --- 10. Wrong-scope token ? 401 ---------------------------------------------

console.log("\n10. POST /v1/embed/token (no-embed-scope key) ? 403 then test wrong token scope");
{
  // Wrong-scope API key (no embed:write)
  const r = await req("POST", "/v1/embed/token", {
    key: badKey,
    body: { merchant_id: ACCOUNT, scopes: ["pricing_widget"] },
  });
  live["10_wrong_api_scope_403"] = r.body;
  assert("status 403 for key without embed:write", r.status === 403, r.status);

  // Issue a token with no embed scopes (inject directly to test widget auth)
  const { data: cfg } = await (admin as any)
    .from("embed_configs")
    .select("signing_key_hex")
    .eq("licensee_id", MAIN_LIC)
    .single();
  const keyHex = cfg?.signing_key_hex as string;
  const now = Math.floor(Date.now() / 1000);
  const nsScopeClaims = {
    iss: "prizeskout-embed",
    sub: ACCOUNT,
    account_id: ACCOUNT,
    licensee_id: MAIN_LIC,
    scopes: ["read", "admin"], // non-embed scopes
    iat: now,
    exp: now + 3600,
    jti: "no_embed_scope_test",
  };
  function b64u(s: string) { return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); }
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(nsScopeClaims));
  const unsigned = `${h}.${p}`;
  const sig = createHmac("sha256", Buffer.from(keyHex, "hex"))
    .update(unsigned).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const noScopeToken = `${unsigned}.${sig}`;

  const wr = await fetch(`${BASE}/embed/widget?token=${noScopeToken}`);
  const wb = await wr.json();
  live["10_wrong_scope_widget_401"] = { status: wr.status, body: wb };
  assert("status 401 for wrong-scope token", wr.status === 401, wr.status);
  assert("error code insufficient_scope", (wb as any)?.error?.code === "insufficient_scope");
}

// --- 11. Tampered signature ? 401 --------------------------------------------

console.log("\n11. GET /embed/widget with tampered signature ? 401");
{
  const parts = embedToken.split(".");
  const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignatureXYZ`;
  const r = await fetch(`${BASE}/embed/widget?token=${tamperedToken}`);
  const body = await r.json();
  live["11_tampered_sig"] = { status: r.status, body };
  assert("status 401", r.status === 401, r.status);
  assert("error code invalid_token", (body as any)?.error?.code === "invalid_token");
}

// --- 12. POST /v1/embed/token — wrong scope key -------------------------------

console.log("\n12. POST /v1/embed/token — read-only key ? 403");
{
  const r = await req("POST", "/v1/embed/token", {
    key: readKey,
    body: { merchant_id: ACCOUNT, scopes: ["pricing_widget"] },
  });
  live["12_token_read_key_403"] = r.body;
  assert("status 403 (embed:read key cannot issue tokens)", r.status === 403, r.status);
}

// --- 13. POST /v1/embed/config — missing brand_name ? 422 -------------------

console.log("\n13. POST /v1/embed/config — missing brand_name ? 422");
{
  const r = await req("POST", "/v1/embed/config", {
    key: writeKey,
    body: { primary_color: "#FF0000" },
  });
  live["13_missing_brand_name"] = r.body;
  assert("status 422", r.status === 422, r.status);
  assert("error code validation_failed", (r.body as any)?.error?.code === "validation_failed");
}

// --- Cleanup ------------------------------------------------------------------

await (admin as any).from("api_keys").delete().in("id", [wkId, rkId, bkId]);

// --- Summary ------------------------------------------------------------------

writeFileSync("scripts/embed-smoke-responses.json", JSON.stringify(live, null, 2));

console.log(`\n${"-".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED");
}
