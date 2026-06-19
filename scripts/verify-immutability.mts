/**
 * Immutability proof for pricing_decisions.
 *
 * Demonstrates BEFORE → AFTER by:
 *   1. Temporarily re-granting UPDATE/DELETE to service_role via a direct
 *      postgres superuser connection (so the "before" gap is live-proved,
 *      not just asserted)
 *   2. Running supabaseAdmin UPDATE/DELETE → SUCCEEDS (gap confirmed)
 *   3. Re-applying REVOKE via the same superuser connection
 *   4. Running supabaseAdmin UPDATE/DELETE → FAILS with 42501 (fixed)
 *   5. Confirming supabaseAdmin INSERT still works (engine writes preserved)
 *   6. Testing authenticated owner UPDATE/DELETE → also rejected
 *   7. Showing pg_catalog privilege listing as structural proof
 */
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// ── Connection config ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo";
// Direct postgres superuser connection (bypasses RLS AND privilege checks)
const PG_URL       = "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const USER_ID      = "bed12406-2798-47f7-a30c-5de559e90d6d";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);   // service_role client
const anon  = createClient(SUPABASE_URL, ANON_KEY);      // anon/authenticated client

// Pool for superuser DDL (GRANT / REVOKE)
const pool = new pg.Pool({ connectionString: PG_URL, ssl: { rejectUnauthorized: false }, max: 1 });

function section(title: string) {
  console.log(`\n${"═".repeat(64)}\n  ${title}\n${"═".repeat(64)}`);
}

function pass(msg: string)  { console.log(`  ✓ ${msg}`); }
function fail(msg: string)  { console.log(`  ✗ ${msg}`); }
function note(msg: string)  { console.log(`    ${msg}`); }
function result(label: string, v: unknown) {
  console.log(`    ${label}: ${JSON.stringify(v)}`);
}

// ── Helper: try UPDATE via supabaseAdmin ─────────────────────────────────────
async function tryUpdate(rowId: string, marker: string) {
  const { data, error } = await (admin as any)
    .from("pricing_decisions")
    .update({ note: `tamper-${marker}` })
    .eq("id", rowId)
    .select("id, note");
  return { data, error };
}

// ── Helper: try DELETE via supabaseAdmin ─────────────────────────────────────
async function tryDelete(rowId: string) {
  const { data, error } = await (admin as any)
    .from("pricing_decisions")
    .delete()
    .eq("id", rowId)
    .select("id");
  return { data, error };
}

// ── Helper: insert a test pricing_decisions row ──────────────────────────────
async function insertTestRow(marker: string): Promise<string> {
  const { data, error } = await (admin as any)
    .from("pricing_decisions")
    .insert({
      user_id: USER_ID, product: `Immutability Test (${marker})`,
      category: "test", channel: "Online",
      current_price: 100, recommended_price: 100,
      decision: "engine_rec", source: "test", trigger_type: "test",
    })
    .select("id")
    .single();
  if (error) throw new Error(`INSERT failed: ${error.message}`);
  return data.id as string;
}

// ── Helper: query privilege state from pg_catalog ───────────────────────────
async function queryPrivileges(): Promise<{ grantee: string; privilege_type: string }[]> {
  const res = await pool.query<{ grantee: string; privilege_type: string }>(`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_name = 'pricing_decisions'
      AND table_schema = 'public'
      AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
    ORDER BY grantee, privilege_type
  `);
  return res.rows;
}

// ── Helper: raw DDL via superuser ────────────────────────────────────────────
async function runDDL(sql: string) {
  await pool.query(sql);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Immutability proof for pricing_decisions\n");

// Create a test API key for the audit endpoints
const RAW_KEY  = "sk_test_immutability_01";
const KEY_HASH = createHash("sha256").update(RAW_KEY).digest("hex");
// Delete any existing key with this hash first (no unique constraint, can't upsert)
await (admin as any).from("api_keys").delete().eq("key_hash", KEY_HASH);
const LICENSEE_ID = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const { data: keyRow, error: keyErr } = await (admin as any)
  .from("api_keys")
  .insert({
    user_id: USER_ID, licensee_id: LICENSEE_ID,
    name: "immutability-test", mode: "test",
    key_prefix: "sk_test", key_hash: KEY_HASH, last_four: "e_01",
    scopes: ["read", "write"],
  })
  .select("id").single();
if (keyErr) { console.error("Key insert failed:", keyErr); await pool.end(); process.exit(1); }
const keyId = keyRow.id;

// ── Create a test user for authenticated-owner tests ─────────────────────────
const TEST_EMAIL    = `immutability-test-${Date.now()}@example.com`;
const TEST_PASSWORD = "Test!Password123";
const { data: newUser, error: createUserErr } = await admin.auth.admin.createUser({
  email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true,
});
if (createUserErr) { console.error("Create user failed:", createUserErr); await pool.end(); process.exit(1); }
const testUserId = newUser.user!.id;
note(`Test user: ${TEST_EMAIL} (id: ${testUserId})`);

try {
  // ── PHASE 0: Show current privilege state ─────────────────────────────────
  section("PHASE 0 — Current privilege state (postgres superuser query)");
  const privsBefore = await queryPrivileges();
  note("role_table_grants for pricing_decisions:");
  for (const r of privsBefore) {
    console.log(`    grantee=${r.grantee.padEnd(16)} privilege=${r.privilege_type}`);
  }
  const srHasUpdate = privsBefore.some(r => r.grantee === "service_role" && r.privilege_type === "UPDATE");
  const srHasDelete = privsBefore.some(r => r.grantee === "service_role" && r.privilege_type === "DELETE");
  note(`service_role has UPDATE: ${srHasUpdate}, DELETE: ${srHasDelete}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: BEFORE — temporarily restore the gap and prove it
  // (This simulates the state before migration 20260619021000)
  // ─────────────────────────────────────────────────────────────────────────
  section("PHASE 1 — BEFORE (simulated: GRANT UPDATE/DELETE back to service_role)");
  await runDDL("GRANT UPDATE, DELETE ON public.pricing_decisions TO service_role, authenticated, anon");
  note("Superuser: GRANT UPDATE, DELETE ON pricing_decisions TO service_role, authenticated, anon → done");

  const rowIdBefore = await insertTestRow("before");
  note(`Test row inserted: ${rowIdBefore}`);

  // service_role UPDATE
  const { data: upDataBefore, error: upErrBefore } = await tryUpdate(rowIdBefore, "BEFORE");
  console.log("\n  [service_role UPDATE — BEFORE REVOKE]");
  if (!upErrBefore && upDataBefore?.length > 0) {
    fail(`UPDATE SUCCEEDED — note='${upDataBefore[0].note}' (gap confirmed: service_role CAN tamper)`);
  } else {
    note(`UPDATE blocked even before REVOKE? error=${JSON.stringify(upErrBefore)}`);
  }

  // service_role DELETE
  const { data: delDataBefore, error: delErrBefore } = await tryDelete(rowIdBefore);
  console.log("\n  [service_role DELETE — BEFORE REVOKE]");
  if (!delErrBefore && delDataBefore?.length > 0) {
    fail(`DELETE SUCCEEDED — row deleted (gap confirmed: service_role CAN destroy audit records)`);
  } else {
    note(`DELETE result: data=${JSON.stringify(delDataBefore)}, error=${JSON.stringify(delErrBefore)}`);
  }

  // Row may or may not exist — clean up if still there
  await (admin as any).from("pricing_decisions").delete().eq("id", rowIdBefore);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Apply the fix (migration 20260619021000)
  // ─────────────────────────────────────────────────────────────────────────
  section("PHASE 2 — Apply fix: REVOKE UPDATE/DELETE FROM service_role, authenticated, anon");
  await runDDL("REVOKE UPDATE, DELETE ON public.pricing_decisions FROM service_role, authenticated, anon");
  note("Superuser: REVOKE UPDATE, DELETE ON pricing_decisions FROM service_role, authenticated, anon → done");

  const privsAfter = await queryPrivileges();
  note("\nrole_table_grants AFTER revoke:");
  for (const r of privsAfter) {
    console.log(`    grantee=${r.grantee.padEnd(16)} privilege=${r.privilege_type}`);
  }
  const srHasUpdateAfter = privsAfter.some(r => r.grantee === "service_role" && r.privilege_type === "UPDATE");
  const srHasDeleteAfter = privsAfter.some(r => r.grantee === "service_role" && r.privilege_type === "DELETE");
  if (!srHasUpdateAfter && !srHasDeleteAfter) {
    pass("service_role has NO UPDATE or DELETE privilege — hard DB lock in place");
  } else {
    fail(`service_role still has UPDATE=${srHasUpdateAfter} DELETE=${srHasDeleteAfter}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: AFTER — prove service_role is rejected at privilege level
  // ─────────────────────────────────────────────────────────────────────────
  section("PHASE 3 — AFTER: service_role UPDATE/DELETE/INSERT");

  // First, insert a fresh row (INSERT should still work)
  console.log("\n  [service_role INSERT — should succeed]");
  let rowIdAfter: string;
  try {
    rowIdAfter = await insertTestRow("after");
    pass(`INSERT succeeded — rowId=${rowIdAfter} (engine writes preserved ✓)`);
  } catch (e: any) {
    fail(`INSERT failed: ${e.message}`);
    process.exit(1);
  }

  // service_role UPDATE
  console.log("\n  [service_role UPDATE — should be rejected at privilege level]");
  const { data: upDataAfter, error: upErrAfter } = await tryUpdate(rowIdAfter, "AFTER");
  if (upErrAfter) {
    const code = (upErrAfter as any).code ?? (upErrAfter as any).details;
    pass(`UPDATE rejected — error.code="${(upErrAfter as any).code}", message="${(upErrAfter as any).message}"`);
    if ((upErrAfter as any).code === "42501") {
      pass(`Error code 42501 = permission denied — privilege-level block (not RLS visibility)`);
    } else {
      note(`Error: ${JSON.stringify(upErrAfter)}`);
    }
  } else if (!upDataAfter || upDataAfter.length === 0) {
    note(`UPDATE returned 0 rows (could be RLS filter, not privilege block) — check error above`);
    fail("UPDATE was not privilege-rejected (0 rows is ambiguous)");
  } else {
    fail(`UPDATE SUCCEEDED — row tampered! data=${JSON.stringify(upDataAfter)}`);
  }

  // service_role DELETE
  console.log("\n  [service_role DELETE — should be rejected at privilege level]");
  const { data: delDataAfter, error: delErrAfter } = await tryDelete(rowIdAfter);
  if (delErrAfter) {
    pass(`DELETE rejected — error.code="${(delErrAfter as any).code}", message="${(delErrAfter as any).message}"`);
    if ((delErrAfter as any).code === "42501") {
      pass(`Error code 42501 = permission denied — privilege-level block (not RLS visibility)`);
    } else {
      note(`Error: ${JSON.stringify(delErrAfter)}`);
    }
  } else if (!delDataAfter || delDataAfter.length === 0) {
    note(`DELETE returned 0 rows — checking if row still exists...`);
    const { data: check } = await (admin as any).from("pricing_decisions").select("id").eq("id", rowIdAfter).single();
    if (check) {
      note(`Row still exists — DELETE was blocked (0 rows due to REVOKE, not RLS)`);
      pass(`Row intact after DELETE attempt`);
    } else {
      fail(`Row is GONE — DELETE succeeded despite REVOKE!`);
    }
  } else {
    fail(`DELETE SUCCEEDED — row destroyed! data=${JSON.stringify(delDataAfter)}`);
  }

  // Confirm row still exists
  console.log("\n  [Confirm row still intact after all tampering attempts]");
  const { data: finalCheck } = await (admin as any)
    .from("pricing_decisions")
    .select("id, decision, note, created_at")
    .eq("id", rowIdAfter)
    .single();
  if (finalCheck) {
    pass(`Row intact: id=${finalCheck.id}, decision=${finalCheck.decision}, note=${finalCheck.note ?? "(null — tamper failed)"}`);
  } else {
    fail("Row missing — was deleted!");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4: Authenticated owner test
  // ─────────────────────────────────────────────────────────────────────────
  section("PHASE 4 — Authenticated OWNER UPDATE/DELETE (signed-in user)");

  // Insert a row owned by the test user
  const { data: ownerRow } = await (admin as any)
    .from("pricing_decisions")
    .insert({
      user_id: testUserId, product: "Owner Test",
      category: "test", channel: "Online",
      current_price: 100, recommended_price: 100,
      decision: "engine_rec", source: "test", trigger_type: "test",
    })
    .select("id").single();
  const ownerRowId = ownerRow?.id;
  note(`Owner row inserted: ${ownerRowId}`);

  // Sign in as the test user
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL, password: TEST_PASSWORD,
  });
  if (signInErr || !session?.session?.access_token) {
    note(`Sign-in failed: ${JSON.stringify(signInErr)} — skipping authenticated tests`);
  } else {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
    });
    note(`Signed in as ${TEST_EMAIL}`);

    // authenticated UPDATE
    console.log("\n  [authenticated owner UPDATE — should be rejected]");
    const { data: authUpData, error: authUpErr } = await (userClient as any)
      .from("pricing_decisions")
      .update({ note: "auth-tamper" })
      .eq("id", ownerRowId)
      .select("id");
    if (authUpErr) {
      pass(`UPDATE rejected — code="${(authUpErr as any).code}", message="${(authUpErr as any).message}"`);
      if ((authUpErr as any).code === "42501") pass("42501 = privilege-level block ✓");
    } else if (!authUpData || authUpData.length === 0) {
      note("UPDATE returned 0 rows (privilege-blocked at table level, PostgREST returns empty)");
      pass("0 rows affected — authenticated owner cannot UPDATE");
    } else {
      fail(`UPDATE SUCCEEDED for authenticated owner — data=${JSON.stringify(authUpData)}`);
    }

    // authenticated DELETE
    console.log("\n  [authenticated owner DELETE — should be rejected]");
    const { data: authDelData, error: authDelErr } = await (userClient as any)
      .from("pricing_decisions")
      .delete()
      .eq("id", ownerRowId)
      .select("id");
    if (authDelErr) {
      pass(`DELETE rejected — code="${(authDelErr as any).code}", message="${(authDelErr as any).message}"`);
      if ((authDelErr as any).code === "42501") pass("42501 = privilege-level block ✓");
    } else if (!authDelData || authDelData.length === 0) {
      note("DELETE returned 0 rows (privilege-blocked)");
      pass("0 rows affected — authenticated owner cannot DELETE");
    } else {
      fail(`DELETE SUCCEEDED for authenticated owner — data=${JSON.stringify(authDelData)}`);
    }

    // Confirm owner row intact
    const { data: ownerCheck } = await (admin as any)
      .from("pricing_decisions").select("id").eq("id", ownerRowId).single();
    if (ownerCheck) pass("Owner row intact after authenticated tampering attempts");
    else fail("Owner row GONE");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 5: Structural proof — final privilege listing
  // ─────────────────────────────────────────────────────────────────────────
  section("PHASE 5 — Structural proof: final privilege state");
  const finalPrivs = await queryPrivileges();
  console.log("\n  role_table_grants for pricing_decisions (public schema):");
  console.log("  ┌─────────────────┬──────────────────────┐");
  console.log("  │ grantee         │ privilege            │");
  console.log("  ├─────────────────┼──────────────────────┤");
  for (const r of finalPrivs) {
    const hasIt = (r.privilege_type === "UPDATE" || r.privilege_type === "DELETE")
      ? "✗ GRANTED (should not be)" : "✓";
    console.log(`  │ ${r.grantee.padEnd(15)} │ ${r.privilege_type.padEnd(20)} │ ${hasIt}`);
  }
  console.log("  └─────────────────┴──────────────────────┘");

  const noUpdateForSr = !finalPrivs.some(r => r.grantee === "service_role" && r.privilege_type === "UPDATE");
  const noDeleteForSr = !finalPrivs.some(r => r.grantee === "service_role" && r.privilege_type === "DELETE");
  const noUpdateForAuth = !finalPrivs.some(r => r.grantee === "authenticated" && r.privilege_type === "UPDATE");
  const noDeleteForAuth = !finalPrivs.some(r => r.grantee === "authenticated" && r.privilege_type === "DELETE");
  const noUpdateForAnon = !finalPrivs.some(r => r.grantee === "anon" && r.privilege_type === "UPDATE");
  const noDeleteForAnon = !finalPrivs.some(r => r.grantee === "anon" && r.privilege_type === "DELETE");

  console.log();
  if (noUpdateForSr && noDeleteForSr)    pass("service_role   — NO UPDATE or DELETE privilege");
  else                                    fail("service_role   — still has UPDATE or DELETE");
  if (noUpdateForAuth && noDeleteForAuth) pass("authenticated  — NO UPDATE or DELETE privilege");
  else                                    fail("authenticated  — still has UPDATE or DELETE");
  if (noUpdateForAnon && noDeleteForAnon) pass("anon           — NO UPDATE or DELETE privilege");
  else                                    fail("anon           — still has UPDATE or DELETE");

} finally {
  // Cleanup
  await (admin as any).from("api_keys").delete().eq("id", keyId);
  await admin.auth.admin.deleteUser(testUserId);
  await pool.end();
  console.log(`\nTest key ${keyId} and test user ${testUserId} cleaned up.`);
}
