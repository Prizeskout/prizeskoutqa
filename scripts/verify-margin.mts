import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKER = process.env.VERIFY_MARGIN_WORKER_URL ?? "https://prizeskout.qa";
const USER_ID = process.env.VERIFY_MARGIN_USER_ID ?? "bed12406-2798-47f7-a30c-5de559e90d6d";
const LICENSEE_ID = process.env.VERIFY_MARGIN_LICENSEE_ID ?? "1a1d0a17-366b-4242-b504-ae78ee68b32c";

assert.ok(SUPABASE_URL, "SUPABASE_URL is required.");
assert.ok(SERVICE_KEY, "SUPABASE_SERVICE_ROLE_KEY is required.");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const RAW_KEY = "sk_test_verify_margin_01";
const KEY_HASH = createHash("sha256").update(RAW_KEY).digest("hex");

type ApiCall = {
  status: number;
  mode: string | null;
  body: Record<string, unknown>;
};

async function call(method: string, path: string, body?: unknown): Promise<ApiCall> {
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${RAW_KEY}`, "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const response = await fetch(`${WORKER}/api/public/v1${path}`, opts);
  const responseBody = await response.json().catch(() => null);
  assert.ok(
    responseBody && typeof responseBody === "object" && !Array.isArray(responseBody),
    `${method} ${path} returned a non-JSON-object response (${response.status}).`,
  );
  const bodyObject = responseBody as Record<string, unknown>;
  assert.ok(
    response.ok,
    `${method} ${path} returned unexpected HTTP ${response.status}: ${JSON.stringify(bodyObject)}`,
  );
  return { status: response.status, mode: response.headers.get("x-api-mode"), body: bodyObject };
}

function section(title: string) {
  console.log(`\n${"-".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("-".repeat(60));
}

console.log("Verify-Margin test starting...\n");
console.log(`SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`WORKER: ${WORKER}`);

// Create an isolated test-mode key. Sandbox calls return documented synthetic
// responses and cannot invoke live margin handlers or mutate merchant data.
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

if (keyErr) {
  console.error("Key insert failed:", keyErr);
  process.exit(1);
}
const keyId = keyRow.id;
console.log(`Test key created (id: ${keyId})`);

try {
  // api-spec.ts publishes only POST /v1/margin. Legacy /v1/margin/*
  // handlers are not part of the public gateway contract and are intentionally
  // excluded from this verifier.
  section("POST /v1/margin (published sandbox contract)");
  const marginResponse = await call("POST", "/margin", {
    sku: "SKU-001",
    list_price: 1199,
    channel: "online",
  });
  assert.equal(marginResponse.status, 200);
  assert.equal(marginResponse.mode, "test");
  assert.deepEqual(marginResponse.body._sandbox, {
    synthetic: true,
    no_production_effect: true,
  });
  assert.equal(marginResponse.body.sku, "SKU-001");
  assert.ok(
    marginResponse.body.margin && typeof marginResponse.body.margin === "object",
    "POST /v1/margin response omitted the documented margin object.",
  );
  console.log(JSON.stringify(marginResponse.body, null, 2));

  section("ENGINE RUN - margin floor diagnostic");
  const { runPricingEngineForUser } = await import("../src/server/pricing-engine.ts");
  const engineResult = await runPricingEngineForUser(supabase, USER_ID);
  const dysonDiagnostic = engineResult.diagnostics.find((diagnostic) => diagnostic.product.includes("Dyson"));
  if (dysonDiagnostic) {
    console.log("Product:", dysonDiagnostic.product);
    console.log("selfPrice:", dysonDiagnostic.selfPrice);
    console.log("competitorMin:", dysonDiagnostic.competitorMin);
    console.log("finalRecommendation:", dysonDiagnostic.finalRecommendation);
    const floorEffect = dysonDiagnostic.ruleEffects.find((effect) => effect.ruleType === "nominal_floor_qar");
    if (floorEffect) console.log("nominal_floor_qar effect:", JSON.stringify(floorEffect, null, 2));
  } else {
    console.log("Dyson diagnostic not found. Engine skipped reasons:", engineResult.reasons);
  }

  console.log("\nMargin public-contract verification passed.");
} finally {
  const { error: cleanupError } = await supabase.from("api_keys").delete().eq("id", keyId);
  assert.ifError(cleanupError);
  console.log(`Test key ${keyId} deleted.`);
}
