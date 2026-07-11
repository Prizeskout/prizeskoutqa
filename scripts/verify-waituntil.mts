/**
 * Verify waitUntil latency pass:
 *   1. Create temp test key
 *   2. Hit loyalty + pricing endpoints — record response times
 *   3. Wait 3s for background writes to complete
 *   4. Confirm api_request_logs rows landed
 *   5. Confirm api_keys.last_used_at was updated
 *   6. Cleanup temp key
 */

import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

const WORKER   = "https://prizeskout.qa";
const SUPA_URL = "https://itfhekcvmcbntjndvhzg.supabase.co";
const SVC      = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const LIC_ID   = "1a1d0a17-366b-4242-b504-ae78ee68b32c";

const admin = createClient(SUPA_URL, SVC);

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
function section(t: string) {
  console.log(`\n${"-".repeat(64)}\n  ${t}\n${"-".repeat(64)}`);
}
function pass(msg: string) { console.log(`  ? ${msg}`); }
function fail(msg: string) { console.log(`  ? ${msg}`); }
function info(msg: string) { console.log(`    ${msg}`); }

let testKeyId = "";
let rawKey = "";

async function cleanup() {
  if (testKeyId) {
    await (admin as any).from("api_keys").delete().eq("id", testKeyId);
  }
}

try {
  // -- 1. Create temp key -------------------------------------------------------
  section("STEP 1 — Create temp test key");

  rawKey = "sk_test_" + randomBytes(16).toString("hex");
  const { data: keyRow, error: kErr } = await (admin as any)
    .from("api_keys")
    .insert({
      user_id:    UID,
      licensee_id: LIC_ID,
      name:       "verify-waituntil",
      key_prefix: rawKey.slice(0, 12),
      key_hash:   hashKey(rawKey),
      last_four:  rawKey.slice(-4),
      mode:       "test",
      scopes:     ["read", "write", "loyalty:read", "loyalty:write"],
    })
    .select("id, last_used_at")
    .single();

  if (kErr) throw new Error(`key insert: ${kErr.message}`);
  testKeyId = keyRow.id;
  const initialLastUsed = keyRow.last_used_at;
  pass(`Key created: ${testKeyId}`);
  info(`initial last_used_at: ${initialLastUsed ?? "null"}`);

  // -- 2. Hit endpoints and measure latency ------------------------------------
  section("STEP 2 — Hit endpoints (response time now excludes telemetry writes)");

  const TESTS = [
    { method: "GET",  path: "/api/public/v1/loyalty/segments" },
    { method: "GET",  path: "/api/public/v1/pricing/recommendations" },
  ];

  const t0Global = Date.now();
  const requestedAt = new Date().toISOString();

  for (const { method, path } of TESTS) {
    const t0 = Date.now();
    const res = await fetch(`${WORKER}${path}`, {
      method,
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    const ms = Date.now() - t0;
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const mark = res.status < 500 ? "?" : "?";
    console.log(`  ${mark} ${method.padEnd(6)} ${path.padEnd(38)}  HTTP ${res.status}  ${ms}ms`);
    if (res.status === 200 && typeof body === "object" && "data" in body) {
      const rows = (body.data as unknown[])?.length ?? 0;
      info(`${rows} row(s) returned`);
    }
  }

  // -- 3. Wait for background writes to settle ----------------------------------
  section("STEP 3 — Wait 3s for background telemetry writes to complete");
  info("Sleeping 3000ms …");
  await new Promise(r => setTimeout(r, 3000));
  pass("Done waiting");

  // -- 4. Confirm api_request_logs rows landed ----------------------------------
  section("STEP 4 — Confirm api_request_logs rows landed");

  const { data: logRows, error: logErr } = await (admin as any)
    .from("api_request_logs")
    .select("id, method, path, status_code, duration_ms, request_id, created_at")
    .eq("api_key_id", testKeyId)
    .gte("created_at", requestedAt)
    .order("created_at", { ascending: true });

  if (logErr) {
    fail(`Query failed: ${logErr.message}`);
  } else if (!logRows || logRows.length === 0) {
    fail("No api_request_logs rows found — backgroundTask writes may not be landing!");
  } else {
    pass(`${logRows.length} api_request_logs row(s) found`);
    for (const r of logRows as Array<Record<string, unknown>>) {
      info(`  ${r.method} ${r.path}  HTTP ${r.status_code}  ${r.duration_ms}ms  id=${r.request_id}`);
    }
  }

  // -- 5. Confirm last_used_at was updated -------------------------------------
  section("STEP 5 — Confirm api_keys.last_used_at updated");

  const { data: keyAfter } = await (admin as any)
    .from("api_keys")
    .select("last_used_at")
    .eq("id", testKeyId)
    .single();

  const newLastUsed = (keyAfter as { last_used_at: string | null })?.last_used_at;
  if (newLastUsed && newLastUsed !== initialLastUsed) {
    pass(`last_used_at updated: ${newLastUsed}`);
  } else if (newLastUsed === initialLastUsed) {
    fail("last_used_at unchanged — backgroundTask write may not have landed");
  } else {
    fail(`last_used_at not found: ${JSON.stringify(keyAfter)}`);
  }

} catch (e) {
  fail(`Unexpected error: ${(e as Error).message}`);
} finally {
  await cleanup();
  console.log("\n  Temp key cleaned up.\n");
}
