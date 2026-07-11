import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE     = "https://prizeskout.qa/api/public";
const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const SKU      = "SONY-WH1000XM5";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

let keyId: string | null = null;
let badKeyId: string | null = null;

const { data: acct } = await (admin as any)
  .from("accounts_v2").select("id").eq("licensee_id", MAIN_LIC).eq("is_default", true).single();
const accountId = acct?.id ?? "4a292c7b-fa88-468a-8e33-fdc795e2f030";

async function cleanup() {
  await (admin as any).from("loyalty_segments").delete().eq("account_id", accountId)
    .in("name", ["gold_member_live_check", "clamp_live_check"]);
  if (keyId)    await (admin as any).from("api_keys").delete().eq("id", keyId);
  if (badKeyId) await (admin as any).from("api_keys").delete().eq("id", badKeyId);
}

await cleanup();

const raw = randKey();
const { data: k } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "live-check",
  key_prefix: raw.slice(0, 12), key_hash: hashKey(raw), last_four: raw.slice(-4),
  mode: "test", scopes: ["read","write","loyalty:read","loyalty:write"],
}).select("id").single();
keyId = k?.id;

const badRaw = randKey();
const { data: bk } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "live-check-bad",
  key_prefix: badRaw.slice(0, 12), key_hash: hashKey(badRaw), last_four: badRaw.slice(-4),
  mode: "test", scopes: ["margin:read"],
}).select("id").single();
badKeyId = bk?.id;

async function hit(method: string, path: string, key: string, body?: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const sep = "-".repeat(68);

// -- CHECK 1: gold_member ? 200 with segment_price 1195.08 --------------------
console.log(`\n${sep}\nCHECK 1 — gold_member 8% off ? 200\n${sep}`);
const s1 = await hit("POST", "/v1/loyalty/segments", raw, {
  name: "gold_member_live_check", display_label: "Gold Member",
  pricing_rule_type: "pct_discount", rule_value: 0.08,
});
console.log(`POST /v1/loyalty/segments  ?  HTTP ${s1.status}  (segment id: ${s1.body?.id})`);

const p1 = await hit("POST", "/v1/loyalty/price", raw, {
  sku: SKU, segment_name: "gold_member_live_check",
  base_price: 1299, channel: "Online", min_margin_pct: 0.10,
});
console.log(`POST /v1/loyalty/price     ?  HTTP ${p1.status}`);
console.log(JSON.stringify(p1.body, null, 2));

// -- CHECK 2: floor clamp (40% off ? QAR 923.30) -------------------------------
console.log(`\n${sep}\nCHECK 2 — clearance_extreme 40% off ? floor clamp ? 200\n${sep}`);
const s2 = await hit("POST", "/v1/loyalty/segments", raw, {
  name: "clamp_live_check", display_label: "Extreme Clearance",
  pricing_rule_type: "pct_discount", rule_value: 0.40,
});
console.log(`POST /v1/loyalty/segments  ?  HTTP ${s2.status}  (segment id: ${s2.body?.id})`);

const p2 = await hit("POST", "/v1/loyalty/price", raw, {
  sku: SKU, segment_name: "clamp_live_check",
  base_price: 1299, channel: "Online", min_margin_pct: 0.10,
});
console.log(`POST /v1/loyalty/price     ?  HTTP ${p2.status}`);
console.log(JSON.stringify(p2.body, null, 2));

// -- CHECK 3: duplicate segment name ? 409 -------------------------------------
console.log(`\n${sep}\nCHECK 3 — duplicate segment name ? 409\n${sep}`);
const p3 = await hit("POST", "/v1/loyalty/segments", raw, {
  name: "gold_member_live_check", display_label: "Dupe",
  pricing_rule_type: "pct_discount", rule_value: 0.05,
});
console.log(`POST /v1/loyalty/segments (dupe)  ?  HTTP ${p3.status}`);
console.log(JSON.stringify(p3.body, null, 2));

// -- CHECK 4: wrong-scope key ? 403 -------------------------------------------
console.log(`\n${sep}\nCHECK 4 — wrong-scope key ? 403\n${sep}`);
const p4 = await hit("POST", "/v1/loyalty/price", badRaw, {
  sku: SKU, segment_name: "gold_member_live_check", base_price: 1299,
});
console.log(`POST /v1/loyalty/price (bad scope)  ?  HTTP ${p4.status}`);
console.log(JSON.stringify(p4.body, null, 2));

await cleanup();
console.log(`\n${sep}\nAll done. Keys and segments cleaned up.\n${sep}`);
