/**
 * Billing plan verification:
 *   1. Seed one licensee per plan (starter / standard / enterprise)
 *   2. Create one API key per plan with appropriate scopes
 *   3. Verify: each account's plan + allowed scopes
 *   4. Verify: Starter key denied enterprise scope → 403
 *   5. Verify: Starter product-cap hit → 402 naming the limit
 *   6. Verify: Starter dynprice = advisory, Standard = automated
 *   7. Verify: merchant-facing response confirmed unbranded
 *   8. Confirm per-call packs gone (no usage_events enforcement)
 */

import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

const WORKER   = "https://prizeskoutqa.prizeskoutqatar.workers.dev";
const SUPA_URL = "https://itfhekcvmcbntjndvhzg.supabase.co";
const SVC      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_UID = "bed12406-2798-47f7-a30c-5de559e90d6d";

const admin = createClient(SUPA_URL, SVC);

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
function section(t: string) {
  console.log(`\n${"═".repeat(72)}\n  ${t}\n${"═".repeat(72)}`);
}
function pass(msg: string) { console.log(`  ✓ ${msg}`); }
function fail(msg: string) { console.log(`  ✗ ${msg}`); }
function info(msg: string) { console.log(`    ${msg}`); }

const cleanup: Array<() => Promise<void>> = [];

async function makeKey(licenseeId: string, scopes: string[]): Promise<string> {
  const raw = "sk_test_" + randomBytes(16).toString("hex");
  const { data, error } = await (admin as any)
    .from("api_keys")
    .insert({
      user_id:    BASE_UID,
      licensee_id: licenseeId,
      name:       `verify-billing-${scopes.join("+")}`,
      key_prefix: raw.slice(0, 12),
      key_hash:   hashKey(raw),
      last_four:  raw.slice(-4),
      mode:       "test",
      scopes,
    })
    .select("id")
    .single();
  if (error) throw new Error(`key insert: ${error.message}`);
  const keyId = data.id;
  cleanup.push(async () => { await (admin as any).from("api_keys").delete().eq("id", keyId); });
  return raw;
}

async function makeLicensee(slug: string, plan: string): Promise<string> {
  const { data, error } = await (admin as any)
    .from("licensees")
    .upsert({ slug, name: `BillingTest-${plan}`, status: "active", plan, contact_email: `${slug}@test.local` }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`licensee upsert: ${error.message}`);
  const licId = data.id;

  // Ensure an account_v2 row exists for this licensee.
  const { data: existingAcct } = await (admin as any)
    .from("accounts_v2")
    .select("id")
    .eq("licensee_id", licId)
    .maybeSingle();

  if (!existingAcct) {
    const { error: aErr } = await (admin as any)
      .from("accounts_v2")
      .insert({ licensee_id: licId, slug: `${slug}-main`, name: `${plan} account`, region: "QA", currency: "USD", is_default: true });
    if (aErr) throw new Error(`account insert: ${aErr.message}`);
  }

  cleanup.push(async () => {
    await (admin as any).from("api_keys").delete().eq("licensee_id", licId);
    await (admin as any).from("accounts_v2").delete().eq("licensee_id", licId);
    await (admin as any).from("licensees").delete().eq("id", licId);
  });
  return licId;
}

async function api(
  key: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
) {
  const res = await fetch(`${WORKER}/api/public${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json as Record<string, unknown>, headers: res.headers };
}

try {
  // ── STEP 1: Seed licensees ──────────────────────────────────────────────────
  section("STEP 1 — Seed one licensee per plan");

  const starterLicId   = await makeLicensee("billing-verify-starter",    "starter");
  const standardLicId  = await makeLicensee("billing-verify-standard",   "standard");
  const enterpriseLicId = await makeLicensee("billing-verify-enterprise", "enterprise");

  pass(`Starter licensee:    ${starterLicId}`);
  pass(`Standard licensee:   ${standardLicId}`);
  pass(`Enterprise licensee: ${enterpriseLicId}`);

  // ── STEP 2: Create API keys ──────────────────────────────────────────────────
  section("STEP 2 — Create API keys with plan-appropriate scopes");

  const starterKey    = await makeKey(starterLicId,   ["read", "write"]);
  const standardKey   = await makeKey(standardLicId,  ["read", "write", "audit:read"]);
  const enterpriseKey = await makeKey(enterpriseLicId, ["read", "write", "admin", "audit:read", "embed:read", "embed:write"]);
  // A "bad" starter key that claims enterprise scopes — should be rejected
  const badStarterKey = await makeKey(starterLicId,   ["read", "write", "embed:write"]);

  pass("All keys created");

  // ── STEP 3: Verify plan + allowed scopes via DB ─────────────────────────────
  section("STEP 3 — Verify DB plan assignment");

  for (const [label, licId, expectedPlan] of [
    ["Starter",    starterLicId,    "starter"],
    ["Standard",   standardLicId,   "standard"],
    ["Enterprise", enterpriseLicId, "enterprise"],
  ] as const) {
    const { data: lic } = await (admin as any).from("licensees").select("plan, is_platform").eq("id", licId).single();
    if (lic?.plan === expectedPlan) {
      pass(`${label}: plan=${lic.plan}, is_platform=${lic.is_platform}`);
    } else {
      fail(`${label}: expected plan=${expectedPlan}, got ${lic?.plan}`);
    }
  }

  // ── STEP 4: Starter key with enterprise scope → 403 ─────────────────────────
  section("STEP 4 — Starter key with embed:write scope → 403 scope_denied");

  const r4 = await api(badStarterKey, "GET", "/v1/pricing/recommendations");
  if (r4.status === 403 && (r4.body?.error as any)?.code === "scope_denied") {
    const denied = (r4.body?.error as any)?.denied_scopes as string[];
    pass(`403 scope_denied, denied_scopes: ${denied?.join(", ")}`);
    info(`upgrade_to: ${(r4.body?.error as any)?.upgrade_to ?? "(not set)"}`);
  } else {
    fail(`Expected 403 scope_denied, got ${r4.status}: ${JSON.stringify(r4.body)}`);
  }

  // ── STEP 5: Starter product-cap enforcement → 402 ────────────────────────────
  section("STEP 5 — Starter product-cap hit → 402 plan_limit_exceeded");

  // Get the starter account_id
  const { data: acctRows } = await (admin as any).rpc("find_account_for_api_key", {
    _api_key_id: (await (admin as any).from("api_keys").select("id").eq("key_prefix", starterKey.slice(0, 12)).single()).data?.id
  });
  const starterAccountId = acctRows?.[0]?.account_id;

  // Seed 50 products to fill the cap
  if (starterAccountId) {
    const batch50 = Array.from({ length: 50 }, (_, i) => ({
      sku: `CAP-TEST-${i + 1}`,
      name: `Cap Test Product ${i + 1}`,
    }));
    await (admin as any).from("catalog_products").upsert(
      batch50.map((p) => ({
        account_id: starterAccountId,
        licensee_id: starterLicId,
        sku: p.sku,
        name: p.name,
      })),
      { onConflict: "account_id,sku" },
    );
    cleanup.push(async () => {
      await (admin as any).from("catalog_products").delete().eq("account_id", starterAccountId).like("sku", "CAP-TEST-%");
    });
    pass(`Seeded 50 products to fill starter cap`);
  }

  const idemKey5 = `verify-cap-${Date.now()}`;
  const r5 = await api(starterKey, "POST", "/v1/sync", {
    products: [{ sku: "CAP-OVERFLOW-1", name: "Overflow Product" }],
  }, { "Idempotency-Key": idemKey5 });

  if (r5.status === 402 && (r5.body?.error as any)?.code === "plan_limit_exceeded") {
    const e = r5.body?.error as any;
    pass(`402 plan_limit_exceeded: ${e.message?.slice(0, 80)}`);
    info(`limit_name=${e.limit_name}, plan_limit=${e.plan_limit}, upgrade_to=${e.upgrade_to}`);
  } else {
    fail(`Expected 402 plan_limit_exceeded, got ${r5.status}: ${JSON.stringify(r5.body).slice(0, 200)}`);
  }

  // ── STEP 6: Starter dynprice = advisory, Standard = automated ───────────────
  section("STEP 6 — Advisory (Starter) vs Automated (Standard) mode on POST /v1/dynprice");

  // Seed a product for each account to test with
  const starterKeyId = (await (admin as any).from("api_keys").select("id").eq("key_prefix", starterKey.slice(0, 12)).single()).data?.id;
  const standardAcctRows = await (admin as any).rpc("find_account_for_api_key", { _api_key_id:
    (await (admin as any).from("api_keys").select("id").eq("key_prefix", standardKey.slice(0, 12)).single()).data?.id
  });
  const standardAccountId = standardAcctRows?.data?.[0]?.account_id;

  // Upsert a product + margin inputs in each account so dynprice has signals
  async function seedDynpriceProd(accountId: string, licId: string) {
    const { data: prod } = await (admin as any)
      .from("catalog_products")
      .upsert([{ account_id: accountId, licensee_id: licId, sku: "DYNTEST-1", name: "Dynprice Test Product" }], { onConflict: "account_id,sku" })
      .select("id")
      .single();
    if (prod?.id) {
      await (admin as any).from("margin_inputs").upsert(
        [{ product_id: prod.id, account_id: accountId, licensee_id: licId, unit_cost: 80, freight: 5, duty_pct: 0.05, fees_pct: 0.03 }],
        { onConflict: "product_id" },
      );
      cleanup.push(async () => {
        await (admin as any).from("margin_inputs").delete().eq("product_id", prod.id);
        await (admin as any).from("catalog_products").delete().eq("account_id", accountId).eq("sku", "DYNTEST-1");
      });
    }
  }

  if (standardAccountId) await seedDynpriceProd(standardAccountId, standardLicId);
  if (starterAccountId) await seedDynpriceProd(starterAccountId, starterLicId);

  const r6a = await api(starterKey, "POST", "/v1/dynprice", { sku: "DYNTEST-1", channel: "online" });
  // Response is { sku, mode, applied, note, ... } — not wrapped in data
  const r6aMode = (r6a.body as any)?.mode;
  if (r6a.status === 200 && r6aMode === "advisory") {
    pass(`Starter dynprice: mode=advisory, applied=${(r6a.body as any)?.applied}`);
    info(`note: ${(r6a.body as any)?.note?.slice(0, 80)}`);
  } else if (r6a.status === 402) {
    info(`Starter dynprice returned 402 (plan gate active for this route)`);
  } else {
    fail(`Starter dynprice: expected mode=advisory, got ${r6a.status} mode=${r6aMode}: ${JSON.stringify(r6a.body).slice(0, 200)}`);
  }

  const r6b = await api(standardKey, "POST", "/v1/dynprice", { sku: "DYNTEST-1", channel: "online" });
  const r6bMode = (r6b.body as any)?.mode;
  if (r6b.status === 200 && r6bMode === "automated") {
    pass(`Standard dynprice: mode=automated, applied=${(r6b.body as any)?.applied}`);
  } else {
    fail(`Standard dynprice: expected mode=automated, got ${r6b.status} mode=${r6bMode}: ${JSON.stringify(r6b.body).slice(0, 200)}`);
  }

  // ── STEP 7: Merchant-facing response — no PrizeSkout brand ──────────────────
  section("STEP 7 — Merchant-facing response confirmed unbranded");

  const r7 = await api(standardKey, "GET", "/v1/pricing/recommendations");
  const bodyStr = JSON.stringify(r7.body);
  const headerMap: Record<string, string> = {};
  r7.headers.forEach((v: string, k: string) => { headerMap[k] = v; });

  const brandLeaks: string[] = [];
  if (bodyStr.toLowerCase().includes("prizeskout")) brandLeaks.push(`body contains 'prizeskout'`);
  for (const [hdr] of Object.entries(headerMap)) {
    if (hdr.toLowerCase().includes("prizeskout")) brandLeaks.push(`header '${hdr}' contains 'prizeskout'`);
  }

  if (brandLeaks.length === 0) {
    pass("No 'prizeskout' branding in response body or headers");
    info(`Response headers: ${Object.keys(headerMap).join(", ")}`);
  } else {
    brandLeaks.forEach((l) => fail(`Brand leak: ${l}`));
  }

  // Check group payment note is also unbranded (check the route produces generic text)
  const r7b = await api(standardKey, "POST", "/v1/group/campaigns", {
    sku: "DYNTEST-1",
    title: "Test Group",
    tiers: [{ buyer_count: 2, price: 10 }],
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  const groupBody = JSON.stringify(r7b.body);
  if (!groupBody.toLowerCase().includes("prizeskout")) {
    pass("Group campaign response unbranded");
  } else {
    fail(`Group campaign response leaks 'prizeskout': ${groupBody.slice(0, 200)}`);
  }

  // ── STEP 8: Per-call packs gone ─────────────────────────────────────────────
  section("STEP 8 — Per-call rate-limit packs confirmed removed");

  // Make 5 rapid calls — should never 429 from per-call enforcement
  const callResults: number[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await api(standardKey, "GET", "/v1/pricing/recommendations");
    callResults.push(r.status);
  }
  const anyRateLimited = callResults.some((s) => s === 429);
  if (!anyRateLimited) {
    pass(`5 rapid calls — no 429 rate limiting (statuses: ${callResults.join(", ")})`);
  } else {
    fail(`Got 429 rate limiting — per-call packs still enforced? Statuses: ${callResults.join(", ")}`);
  }

  // Also verify standard plan can reach dynprice/config (standard feature)
  const r8 = await api(standardKey, "GET", "/v1/dynprice/events");
  if (r8.status !== 402) {
    pass(`Standard plan can access /v1/dynprice/events (status ${r8.status})`);
  } else {
    fail(`Standard plan blocked from dynprice/events: ${JSON.stringify(r8.body).slice(0, 100)}`);
  }

  // Verify starter is blocked from standard route
  const r8b = await api(starterKey, "GET", "/v1/dynprice/events");
  if (r8b.status === 402 && (r8b.body?.error as any)?.code === "plan_upgrade_required") {
    pass(`Starter blocked from /v1/dynprice/events (standard only) → 402`);
    info(`required_plan: ${(r8b.body?.error as any)?.required_plan}`);
  } else {
    fail(`Starter should get 402 for dynprice/events, got ${r8b.status}`);
  }

  // Verify starter is blocked from enterprise route
  const r8c = await api(starterKey, "GET", "/v1/embed/config");
  if (r8c.status === 402 && (r8c.body?.error as any)?.code === "plan_upgrade_required") {
    pass(`Starter blocked from /v1/embed/config (enterprise only) → 402`);
  } else if (r8c.status === 403 && (r8c.body?.error as any)?.code === "scope_denied") {
    pass(`Starter blocked from /v1/embed/config → 403 scope_denied (key lacks embed:read)`);
  } else {
    fail(`Starter should get 402/403 for embed/config, got ${r8c.status}`);
  }

  console.log("\n  ✓ All billing verification checks complete.\n");

} catch (e) {
  fail(`Unexpected error: ${(e as Error).message}`);
  console.error(e);
} finally {
  for (const fn of cleanup.reverse()) {
    try { await fn(); } catch { /* ignore cleanup errors */ }
  }
  console.log("  Cleanup complete.\n");
}
