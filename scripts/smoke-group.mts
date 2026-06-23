/**
 * HTTP smoke test for Group Buying Engine (API 12 — /v1/group/*)
 *
 * Test sequence:
 *  1. POST /v1/group/campaigns   — create campaign (3→QAR1100, 10→QAR1000), expiry 1h
 *  2. GET  /v1/group/campaigns/:id — live status (0 buyers, no tier, invite link + QR)
 *  3. POST /v1/group/join ×3     — 3 buyers join → tier 0 unlocks (tier_unlocked event)
 *  4. GET  /v1/group/campaigns/:id — live status (3 buyers, tier 0, price=1100)
 *  5. GET  /v1/group/campaigns/:id/buyers — list 3 buyer rows
 *  6. POST /v1/group/campaigns   — below-floor tier (900 QAR) → 422 tier_below_floor
 *  7. POST /v1/group/campaigns/:id/close — manual close (tier met → completed)
 *  8. POST /v1/group/join        — join closed campaign → 409
 *  9. POST /v1/group/campaigns   — wrong-scope key → 403
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE     = "https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public";
const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const SKU      = "SONY-WH1000XM5";
const CHANNEL  = "Online";
// floor at 10% margin = QAR 923.30
const FLOOR    = 923.30;

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

let keyId: string | null = null;
let badKeyId: string | null = null;
let campaignId: string | null = null;

const { data: acct } = await (admin as any)
  .from("accounts_v2").select("id").eq("licensee_id", MAIN_LIC).eq("is_default", true).single();
const accountId = acct?.id ?? "4a292c7b-fa88-468a-8e33-fdc795e2f030";

async function cleanup() {
  if (campaignId) {
    await (admin as any).from("group_buyers").delete().eq("campaign_id", campaignId);
    await (admin as any).from("group_campaigns").delete().eq("id", campaignId);
  }
  // Clean up any stale smoke test campaigns
  await (admin as any).from("group_campaigns").delete()
    .eq("account_id", accountId).eq("sku", SKU);
  if (keyId)    await (admin as any).from("api_keys").delete().eq("id", keyId);
  if (badKeyId) await (admin as any).from("api_keys").delete().eq("id", badKeyId);
}

await cleanup();

// Create test key (group:read + group:write + write for floor access)
const raw = randKey();
const { data: k } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-group",
  key_prefix: raw.slice(0, 12), key_hash: hashKey(raw), last_four: raw.slice(-4),
  mode: "test", scopes: ["read","write","group:read","group:write"],
}).select("id").single();
keyId = k?.id;
const KEY = raw;

// Create wrong-scope key (no group:* and no write)
const badRaw = randKey();
const { data: bk } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-group-bad",
  key_prefix: badRaw.slice(0, 12), key_hash: hashKey(badRaw), last_four: badRaw.slice(-4),
  mode: "test", scopes: ["audit:read"],
}).select("id").single();
badKeyId = bk?.id;
const BAD_KEY = badRaw;

// ─── HTTP helper ─────────────────────────────────────────────────────────────

type Hit = { method: string; path: string; status: number; body: unknown; ms: number };
async function call(method: string, path: string, key: string, body?: unknown): Promise<Hit> {
  const url = `${BASE}${path}`;
  const t0  = Date.now();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { method, path, status: res.status, body: await res.json().catch(() => null), ms: Date.now() - t0 };
}

function section(t: string) { console.log(`\n${"═".repeat(72)}\n  ${t}\n${"═".repeat(72)}`); }
function render(label: string, hit: Hit, expectStatus: number) {
  const ok   = hit.status === expectStatus;
  const flag = ok ? "" : ` ← UNEXPECTED (expected ${expectStatus})`;
  console.log(`\n  ${ok ? "✓" : "✗"} ${label}`);
  console.log(`    ${hit.method} ${hit.path}  →  HTTP ${hit.status}${flag}  (${hit.ms} ms)`);
  // Omit QR data URL from output (it's a long base64 blob)
  const body = JSON.parse(JSON.stringify(hit.body ?? {}));
  if (body?.invite?.qr_data_url) body.invite.qr_data_url = `<SVG data URL, ${Math.round((body.invite.qr_data_url as string).length / 1024)} KB>`;
  console.log("   ", JSON.stringify(body, null, 2).split("\n").slice(0, 50).join("\n    "));
  return ok;
}

const expiry1h = new Date(Date.now() + 3600 * 1000).toISOString();
let passed = 0, failed = 0;

try {
  // ── TEST 1: Create campaign ────────────────────────────────────────────────
  section("TEST 1 — POST /v1/group/campaigns  (tiers: 3→1100, 10→1000)");
  const r1 = await call("POST", "/v1/group/campaigns", KEY, {
    sku:            SKU,
    channel:        CHANNEL,
    base_price:     1299,
    min_margin_pct: 0.10,
    expiry_at:      expiry1h,
    tiers: [
      { min_buyers: 3,  price: 1100 },
      { min_buyers: 10, price: 1000 },
    ],
  });
  const ok1 = render("Create campaign (valid tiers, above floor)", r1, 201);
  campaignId = (r1.body as any)?.id;
  const hasInvite  = !!(r1.body as any)?.invite?.wa_link;
  const hasQr      = !!(r1.body as any)?.invite?.qr_data_url;
  const floorField = (r1.body as any)?.floor_price;
  if (ok1 && hasInvite && hasQr) {
    console.log(`    → campaign_id: ${campaignId}`);
    console.log(`    → floor_price: ${floorField}  ✓`);
    console.log(`    → invite.wa_link: ${((r1.body as any)?.invite?.wa_link as string)?.slice(0, 80)}...`);
    console.log(`    → invite.qr_data_url: present ✓`);
    passed++;
  } else {
    console.log(`    → missing invite or wrong status (wa_link=${hasInvite}, qr=${hasQr}) ✗`);
    failed++;
  }

  // ── TEST 2: Get campaign (live count = 0) ──────────────────────────────────
  section("TEST 2 — GET /v1/group/campaigns/:id  (0 buyers, no tier unlocked)");
  const r2 = await call("GET", `/v1/group/campaigns/${campaignId}`, KEY);
  const ok2base = render("Get campaign (live status)", r2, 200);
  const b2 = r2.body as any;
  const ok2 = ok2base && b2?.current_buyers === 0 && b2?.current_tier_idx === -1 && b2?.current_price === 1299;
  if (ok2) {
    console.log(`    → current_buyers=0 ✓  tier_idx=-1 ✓  current_price=${b2.current_price} ✓`);
    console.log(`    → next_tier: min_buyers=${b2.next_tier?.min_buyers} price=${b2.next_tier?.price} ✓`);
    passed++;
  } else {
    console.log(`    → buyers=${b2?.current_buyers} tier=${b2?.current_tier_idx} price=${b2?.current_price} ✗`);
    failed++;
  }

  // ── TEST 3: Join 3 buyers → tier 0 unlocks ────────────────────────────────
  section("TEST 3 — POST /v1/group/join ×3  (tier 0 unlocks at buyer #3)");
  let tierUnlocked = false;
  let tierUnlockData: any = null;
  for (let i = 1; i <= 3; i++) {
    const rj = await call("POST", "/v1/group/join", KEY, {
      campaign_id: campaignId,
      buyer_id:    `buyer_smoke_${i}`,
      buyer_name:  `Test Buyer ${i}`,
      phone:       `+97455500${i.toString().padStart(3, "0")}`,
    });
    const bj = rj.body as any;
    console.log(`\n  Join #${i}:  HTTP ${rj.status}  buyers=${bj?.current_buyers}  tier=${bj?.current_tier_idx}  price=${bj?.current_price}  tier_unlocked=${JSON.stringify(bj?.tier_unlocked)}`);
    if (i === 3 && bj?.tier_unlocked) {
      tierUnlocked = true;
      tierUnlockData = bj?.tier_unlocked;
      console.log(`    → tier_unlocked: tier_idx=${tierUnlockData.tier_idx}  min_buyers=${tierUnlockData.min_buyers}  price=${tierUnlockData.price} ✓`);
      console.log(`    → webhook_emitted: ${bj?.webhook_event ?? bj?.webhook_emitted} ✓`);
    }
  }
  if (tierUnlocked && tierUnlockData?.price === 1100 && tierUnlockData?.min_buyers === 3) {
    console.log(`\n  ✓ Tier unlock verified: 3 buyers → QAR 1100`);
    passed++;
  } else {
    console.log(`\n  ✗ Expected tier unlock at 3 buyers → QAR 1100, got: ${JSON.stringify(tierUnlockData)}`);
    failed++;
  }

  // ── TEST 4: Get campaign (live count = 3, tier 0) ─────────────────────────
  section("TEST 4 — GET /v1/group/campaigns/:id  (3 buyers, tier 0, price=1100)");
  const r4 = await call("GET", `/v1/group/campaigns/${campaignId}`, KEY);
  const ok4base = render("Get campaign after 3 joins", r4, 200);
  const b4 = r4.body as any;
  const ok4 = ok4base && b4?.current_buyers === 3 && b4?.current_tier_idx === 0 && b4?.current_price === 1100;
  if (ok4) {
    console.log(`    → current_buyers=3 ✓  tier_idx=0 ✓  current_price=1100 ✓`);
    console.log(`    → next_tier: min_buyers=${b4.next_tier?.min_buyers}  buyers_needed=${b4.next_tier?.buyers_needed} ✓`);
    passed++;
  } else {
    console.log(`    → buyers=${b4?.current_buyers} tier=${b4?.current_tier_idx} price=${b4?.current_price} ✗`);
    failed++;
  }

  // ── TEST 5: List buyers ────────────────────────────────────────────────────
  section("TEST 5 — GET /v1/group/campaigns/:id/buyers  (list 3 buyers)");
  const r5 = await call("GET", `/v1/group/campaigns/${campaignId}/buyers`, KEY);
  const ok5base = render("List buyers", r5, 200);
  const buyerCount = (r5.body as any)?.data?.length ?? 0;
  const ok5 = ok5base && buyerCount === 3;
  if (ok5) {
    console.log(`    → ${buyerCount} buyers returned ✓`);
    for (const b of (r5.body as any)?.data ?? []) {
      console.log(`      buyer_id=${b.buyer_id}  status=${b.status}  joined_at=${b.joined_at}`);
    }
    passed++;
  } else {
    console.log(`    → expected 3 buyers, got ${buyerCount} ✗`);
    failed++;
  }

  // ── TEST 6: Below-floor tier → 422 ────────────────────────────────────────
  section("TEST 6 — POST /v1/group/campaigns  (tier at QAR 900 < floor 923.30 → 422)");
  const r6 = await call("POST", "/v1/group/campaigns", KEY, {
    sku:            SKU,
    channel:        CHANNEL,
    base_price:     1299,
    min_margin_pct: 0.10,
    expiry_at:      expiry1h,
    tiers: [
      { min_buyers: 5,  price: 1100 },
      { min_buyers: 20, price: 900 },   // 900 < 923.30 → should be rejected
    ],
  });
  const ok6base = render("Below-floor tier → 422", r6, 422);
  const b6 = r6.body as any;
  const ok6 = ok6base && b6?.error?.code === "tier_below_floor";
  if (ok6) {
    console.log(`    → code: "${b6.error.code}" ✓`);
    console.log(`    → floor_price: ${b6.error.floor_price}  failed_tiers: ${JSON.stringify(b6.error.failed_tiers)}`);
    passed++;
  } else {
    console.log(`    → expected tier_below_floor 422, got: HTTP ${r6.status}  body: ${JSON.stringify(b6)} ✗`);
    failed++;
  }

  // ── TEST 7: Manual close (tier met → completed) ────────────────────────────
  section("TEST 7 — POST /v1/group/campaigns/:id/close  (tier met → completed + payment_trigger)");
  const r7 = await call("POST", `/v1/group/campaigns/${campaignId}/close`, KEY);
  const ok7base = render("Manual close → completed", r7, 200);
  const b7 = r7.body as any;
  const ok7 = ok7base && b7?.status === "completed" && b7?.locked_price === 1100 && b7?.webhook_emitted === "group.payment_trigger";
  if (ok7) {
    console.log(`    → status=completed ✓  locked_price=${b7.locked_price} ✓`);
    console.log(`    → webhook_emitted=${b7.webhook_emitted} ✓`);
    console.log(`    → note: "${b7.note}"`);
    passed++;
  } else {
    console.log(`    → status=${b7?.status} locked=${b7?.locked_price} webhook=${b7?.webhook_emitted} ✗`);
    failed++;
  }

  // ── TEST 8: Join closed campaign → 409 ────────────────────────────────────
  section("TEST 8 — POST /v1/group/join  (campaign completed → 409)");
  const r8 = await call("POST", "/v1/group/join", KEY, {
    campaign_id: campaignId,
    buyer_id:    "late_buyer_001",
  });
  const ok8 = render("Join closed campaign → 409", r8, 409);
  if (ok8) passed++; else failed++;

  // ── TEST 9: Wrong scope → 403 ─────────────────────────────────────────────
  section("TEST 9 — POST /v1/group/campaigns  (wrong-scope key → 403)");
  const r9 = await call("POST", "/v1/group/campaigns", BAD_KEY, {
    sku: SKU, base_price: 1299, expiry_at: expiry1h,
    tiers: [{ min_buyers: 3, price: 1100 }],
  });
  const ok9base = render("Wrong-scope key → 403", r9, 403);
  const ok9 = ok9base && (r9.body as any)?.error?.code === "forbidden";
  if (ok9) {
    console.log(`    → code: "${(r9.body as any)?.error?.code}" ✓`);
    passed++;
  } else {
    console.log(`    → expected 403 forbidden, got: ${JSON.stringify(r9.body)} ✗`);
    failed++;
  }

} catch (e) {
  console.error("\nFATAL:", e);
  failed++;
} finally {
  await cleanup();
}

console.log(`\n${"═".repeat(72)}`);
console.log(`  RESULTS: ${passed} passed  ${failed} failed  (${passed + failed} total)`);
console.log(`${"═".repeat(72)}\n`);

if (failed > 0) process.exit(1);
