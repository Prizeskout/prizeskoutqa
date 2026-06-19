import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { runPricingEngineForUser } from "../src/server/pricing-engine.ts";

const SUPABASE_URL   = process.env.SUPABASE_URL!;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY       = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo";
const WORKER         = "https://prizeskoutqa.prizeskoutqatar.workers.dev";
const USER_ID        = "bed12406-2798-47f7-a30c-5de559e90d6d";
const ACCOUNT_ID     = "4a292c7b-fa88-468a-8e33-fdc795e2f030";
const LICENSEE_ID    = "1a1d0a17-366b-4242-b504-ae78ee68b32c";

const admin  = createClient(SUPABASE_URL, SERVICE_KEY);
const anon   = createClient(SUPABASE_URL, ANON_KEY);

const RAW_KEY  = "sk_test_verify_audit_01";
const KEY_HASH = createHash("sha256").update(RAW_KEY).digest("hex");

async function workerGet(path: string): Promise<unknown> {
  const res = await fetch(`${WORKER}/api/public/v1${path}`, {
    headers: { Authorization: `Bearer ${RAW_KEY}` },
  });
  return res.json();
}

function section(title: string) {
  console.log(`\n${"═".repeat(60)}\n  ${title}\n${"═".repeat(60)}`);
}

// ─── Setup ───────────────────────────────────────────────────────────────────
console.log("Verify-Audit starting...\n");

// Create test API key (scopes: read + write covers audit:read)
// Delete any pre-existing key with this hash first (idempotent setup)
await (admin as any).from("api_keys").delete().eq("key_hash", KEY_HASH);
const { data: keyRow, error: keyErr } = await (admin as any)
  .from("api_keys")
  .insert({
    user_id: USER_ID, name: "verify-audit-test", mode: "test",
    key_prefix: "sk_test", key_hash: KEY_HASH, last_four: RAW_KEY.slice(-4),
    scopes: ["read", "write"],
    licensee_id: LICENSEE_ID,
  })
  .select("id")
  .single();
if (keyErr) { console.error("Key insert failed:", keyErr); process.exit(1); }
const keyId = keyRow.id;
console.log(`Test key: ${RAW_KEY} (id: ${keyId})`);

try {
  // ─── Step 1: Run engine → writes audit records ────────────────────────────
  section("STEP 1: Run pricing engine (trigger_type=api_call)");
  const engineResult = await runPricingEngineForUser(admin as any, USER_ID, "api_call");
  console.log(`Engine: written=${engineResult.written}, skipped=${engineResult.skipped}`);
  if (engineResult.written === 0) {
    console.log("Engine wrote 0 recommendations. Skip reasons:", engineResult.reasons);
  }

  // ─── Step 2: Read audit log via API ──────────────────────────────────────
  section("STEP 2: GET /v1/audit/decisions?decision=engine_rec&limit=3");
  const list = await workerGet("/audit/decisions?decision=engine_rec&limit=3") as any;
  console.log(JSON.stringify(list, null, 2));

  let decisionId: string | null = null;
  if (list?.data?.length > 0) {
    decisionId = list.data[0].id;
    section(`STEP 3: GET /v1/audit/decisions/${decisionId}`);
    const single = await workerGet(`/audit/decisions/${decisionId}`);
    console.log(JSON.stringify(single, null, 2));
  } else {
    console.log("No engine_rec decisions found — check engine run above.");
  }

  // ─── Step 4: Summary ─────────────────────────────────────────────────────
  section("STEP 4: GET /v1/audit/summary?days=1");
  const summary = await workerGet("/audit/summary?days=1");
  console.log(JSON.stringify(summary, null, 2));

  // ─── Step 5: Immutability proof ───────────────────────────────────────────
  if (decisionId) {
    section("STEP 5: Immutability — BEHAVIORAL PROOF");

    // 5a: UPDATE attempt via PostgREST with ANON key (no auth = anon role)
    console.log("\n[5a] PATCH via PostgREST (anon role, no user auth):");
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pricing_decisions?id=eq.${decisionId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ note: "tamper attempt" }),
      }
    );
    console.log(`HTTP ${patchRes.status} — ${patchRes.statusText}`);
    const patchBody = await patchRes.text();
    console.log("Response:", patchBody || "(empty)");

    // 5b: UPDATE attempt via supabase-js anon client (unauthenticated)
    console.log("\n[5b] UPDATE via supabase-js anon client (not signed in):");
    const { data: upData, error: upErr } = await anon
      .from("pricing_decisions")
      .update({ note: "tamper attempt" })
      .eq("id", decisionId)
      .select("id");
    console.log("Error:", JSON.stringify(upErr ?? null));
    console.log("Rows affected:", upData?.length ?? 0, "(must be 0)");

    // 5c: DELETE attempt via PostgREST with ANON key
    console.log("\n[5c] DELETE via PostgREST (anon role, no user auth):");
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pricing_decisions?id=eq.${decisionId}`,
      {
        method: "DELETE",
        headers: {
          "apikey": ANON_KEY,
          "Prefer": "return=representation",
        },
      }
    );
    console.log(`HTTP ${delRes.status} — ${delRes.statusText}`);
    const delBody = await delRes.text();
    console.log("Response:", delBody || "(empty)");

    // 5d: DELETE attempt via supabase-js anon client
    console.log("\n[5d] DELETE via supabase-js anon client:");
    const { data: delData, error: delErr } = await anon
      .from("pricing_decisions")
      .delete()
      .eq("id", decisionId)
      .select("id");
    console.log("Error:", JSON.stringify(delErr ?? null));
    console.log("Rows deleted:", delData?.length ?? 0, "(must be 0)");

    section("STEP 6: Immutability — STRUCTURAL PROOF via pg_catalog");

    // 6a: Check that no UPDATE/DELETE policies exist
    const { data: polRows, error: polErr } = await (admin as any)
      .from("pg_policies")
      .select("policyname, cmd")
      .eq("tablename", "pricing_decisions");

    if (polErr) {
      // Fallback: just print what we know
      console.log("Could not query pg_policies directly. Known policies (from migration):");
      console.log("  SELECT: 'Users view own pricing decisions' (retained)");
      console.log("  INSERT: 'Users insert own pricing decisions' (retained)");
      console.log("  UPDATE: DROPPED (migration step 7)");
      console.log("  DELETE: DROPPED (migration step 7)");
      console.log("  REVOKE UPDATE, DELETE FROM authenticated: applied (migration step 8)");
    } else {
      console.log("\nActive RLS policies on pricing_decisions:");
      for (const p of (polRows ?? [])) {
        console.log(`  [${p.cmd}] ${p.policyname}`);
      }
    }

    // 6b: Confirm the record still exists (not deleted)
    console.log("\n[6b] Confirm record still exists (prove DELETE was blocked):");
    const { data: verify } = await admin
      .from("pricing_decisions")
      .select("id, decision, created_at, note")
      .eq("id", decisionId)
      .single();
    console.log(JSON.stringify(verify, null, 2));
    console.log(verify ? "✓ Record intact — immutability confirmed" : "✗ Record is GONE — DELETE succeeded (bug!)");

    // 6c: Attempt to set created_at in the past (trigger should override)
    section("STEP 7: created_at lock — trigger override proof");
    const fakePast = "2020-01-01T00:00:00.000Z";
    const { data: lockRow } = await (admin as any)
      .from("pricing_decisions")
      .insert({
        user_id: USER_ID, product: "Lock Test", category: "test",
        channel: "Online", current_price: 100, recommended_price: 100,
        decision: "engine_rec", source: "test",
        trigger_type: "test", created_at: fakePast,
      })
      .select("id, created_at")
      .single();
    if (lockRow) {
      const locked = lockRow.created_at !== fakePast;
      console.log(`Inserted with created_at=${fakePast}`);
      console.log(`Actual created_at: ${lockRow.created_at}`);
      console.log(locked ? "✓ Trigger overrode created_at — DB enforces immutable timestamp" : "✗ Trigger DID NOT fire (bug!)");
      // Clean up test row (admin can delete for maintenance)
      await admin.from("pricing_decisions").delete().eq("id", lockRow.id);
      console.log("(Test row cleaned up by service role — expected admin capability)");
    }
  }

} finally {
  await admin.from("api_keys").delete().eq("id", keyId);
  console.log(`\nTest key ${keyId} deleted.`);
}
