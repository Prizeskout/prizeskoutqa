import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKER = "https://prizeskout.qa";
const USER_ID = "bed12406-2798-47f7-a30c-5de559e90d6d";
const LICENSEE_ID = "1a1d0a17-366b-4242-b504-ae78ee68b32c";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const RAW_KEY = "sk_test_verify_margin_01";
const KEY_HASH = createHash("sha256").update(RAW_KEY).digest("hex");

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const opts: RequestInit = {
    method,
    headers: { "Authorization": `Bearer ${RAW_KEY}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${WORKER}/api/public/v1${path}`, opts);
  return res.json();
}

function section(title: string) {
  console.log(`\n${"-".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("-".repeat(60));
}

// Main
console.log("Verify-Margin test starting...\n");
console.log(`SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`WORKER: ${WORKER}`);

// 1. Create test API key — delete any existing with same hash first
await supabase.from("api_keys").delete().eq("key_hash", KEY_HASH);

const { data: keyRow, error: keyErr } = await supabase
  .from("api_keys")
  .insert({
    user_id: USER_ID,
    licensee_id: LICENSEE_ID,
    name: "verify-margin-test",
    mode: "test",
    key_prefix: "sk_test",
    key_hash: KEY_HASH,
    last_four: RAW_KEY.slice(-4),
    scopes: ["read", "write"],
  })
  .select("id")
  .single();

if (keyErr) { console.error("Key insert failed:", keyErr); process.exit(1); }
const keyId = keyRow.id;
console.log(`Test key created: ${RAW_KEY} (id: ${keyId})`);

try {
  // 2. POST /v1/margin/costs — set realistic landed cost for Sony
  section("POST /v1/margin/costs (Sony — freight + duty to make landed ? unit_cost)");
  const costsRes = await call("POST", "/margin/costs", {
    sku: "SONY-WH1000XM5",
    unit_cost: 750,
    freight: 15,
    duty_pct: 0.05,  // 5% import duty on electronics
    supplier: "Sony Gulf FZE",
    currency: "QAR",
  });
  console.log(JSON.stringify(costsRes, null, 2));
  // landed_cost should be 750 + 15 + 750*0.05 = 802.50

  // 3. POST /v1/margin/channels — Talabat (marketplace, high commission)
  section("POST /v1/margin/channels (Talabat — 18% commission)");
  const talabatChan = await call("POST", "/margin/channels", {
    channel: "Talabat",
    commission_pct: 0.18,
    delivery_cost: 0,
    payment_pct: 0.015,
    returns_provision: 2,
    notes: "Talabat marketplace: 18% commission covers their delivery; +1.5% payment processing",
  });
  console.log(JSON.stringify(talabatChan, null, 2));

  // 4. POST /v1/margin/channels — Online (own website, low fees)
  section("POST /v1/margin/channels (Online — own website ~2% payment)");
  const onlineChan = await call("POST", "/margin/channels", {
    channel: "Online",
    commission_pct: 0,
    delivery_cost: 8,
    payment_pct: 0.02,
    returns_provision: 2,
    notes: "Own website: 2% card processing + QAR 8 delivery + QAR 2 returns provision",
  });
  console.log(JSON.stringify(onlineChan, null, 2));

  // 5-6. GET /v1/margin/sku — both channels
  section("GET /v1/margin/sku — Sony on Talabat");
  const skuTalabat = await call("GET", "/margin/sku?sku=SONY-WH1000XM5&channel=Talabat");
  console.log(JSON.stringify(skuTalabat, null, 2));

  section("GET /v1/margin/sku — Sony on Online");
  const skuOnline = await call("GET", "/margin/sku?sku=SONY-WH1000XM5&channel=Online");
  console.log(JSON.stringify(skuOnline, null, 2));

  // 7. GET /v1/margin/breakeven — both channels
  section("GET /v1/margin/breakeven — Talabat vs Online");
  const beTalabat = await call("GET", "/margin/breakeven?sku=SONY-WH1000XM5&channel=Talabat");
  const beOnline  = await call("GET", "/margin/breakeven?sku=SONY-WH1000XM5&channel=Online");
  console.log("Talabat:", JSON.stringify(beTalabat, null, 2));
  console.log("Online: ", JSON.stringify(beOnline, null, 2));

  // 8. GET /v1/margin/impact at price=1299
  section("GET /v1/margin/impact at QAR 1299 — Talabat vs Online");
  const impTalabat = await call("GET", "/margin/impact?sku=SONY-WH1000XM5&channel=Talabat&price=1299");
  const impOnline  = await call("GET", "/margin/impact?sku=SONY-WH1000XM5&channel=Online&price=1299");
  console.log("Talabat:", JSON.stringify(impTalabat, null, 2));
  console.log("Online: ", JSON.stringify(impOnline, null, 2));

  // 9. Engine run — show Dyson floor uses full-cost formula
  section("ENGINE RUN — Dyson V15 nominal_floor_qar now uses full-cost formula");
  const { runPricingEngineForUser } = await import("../src/server/pricing-engine.ts");
  const engineResult = await runPricingEngineForUser(supabase, USER_ID);
  const dysonDiag = engineResult.diagnostics.find(d => d.product.includes("Dyson"));
  if (dysonDiag) {
    console.log("Product:", dysonDiag.product);
    console.log("selfPrice:", dysonDiag.selfPrice);
    console.log("competitorMin:", dysonDiag.competitorMin);
    console.log("finalRecommendation:", dysonDiag.finalRecommendation);
    const floorEffect = dysonDiag.ruleEffects.find(e => e.ruleType === "nominal_floor_qar");
    if (floorEffect) {
      console.log("\nnominal_floor_qar effect:");
      console.log("  applicable:", floorEffect.applicable);
      console.log("  clamped:   ", floorEffect.clamped);
      console.log("  reason:    ", floorEffect.reason);
      console.log("  priceIn:   ", floorEffect.priceIn);
      console.log("  priceOut:  ", floorEffect.priceOut);
    }
  } else {
    console.log("Dyson diagnostic not found. Engine skipped reasons:", engineResult.reasons);
    console.log("All diagnostics:", JSON.stringify(engineResult.diagnostics.map(d => ({ product: d.product, skipped: d.skipped, skipReason: d.skipReason })), null, 2));
  }

} finally {
  // Cleanup
  await supabase.from("api_keys").delete().eq("id", keyId);
  console.log(`\nTest key ${keyId} deleted.`);
}
