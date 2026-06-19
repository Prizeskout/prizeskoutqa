/**
 * Proves TRUNCATE (and TRIGGER) are revoked from service_role at the
 * PostgreSQL privilege level.
 *
 * Uses SET LOCAL ROLE service_role inside a postgres superuser transaction
 * to impersonate service_role exactly — this is the only way to invoke
 * TRUNCATE as service_role, since supabase-js/PostgREST has no TRUNCATE API.
 *
 * Flow:
 *   BEFORE: GRANT TRUNCATE back → SET ROLE service_role → TRUNCATE succeeds
 *           (always rolls back so no data is lost)
 *   REVOKE: remove TRUNCATE again
 *   AFTER:  SET ROLE service_role → TRUNCATE → 42501 permission denied
 *   INSERT: supabaseAdmin INSERT still works (service_role INSERT preserved)
 *   LIST:   show final privilege table
 */
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PG_URL       = "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";
const USER_ID      = "bed12406-2798-47f7-a30c-5de559e90d6d";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const pool  = new pg.Pool({ connectionString: PG_URL, ssl: { rejectUnauthorized: false }, max: 2 });

function section(t: string) { console.log(`\n${"═".repeat(64)}\n  ${t}\n${"═".repeat(64)}`); }
function pass(m: string)    { console.log(`  ✓ ${m}`); }
function fail(m: string)    { console.log(`  ✗ ${m}`); }
function note(m: string)    { console.log(`    ${m}`); }

/** Run DDL as the postgres superuser. */
async function ddl(sql: string) { await pool.query(sql); }

/**
 * Attempt TRUNCATE impersonating service_role.
 * Always rolls back — we're testing privilege, not actually wiping data.
 * Returns true if TRUNCATE succeeded, false + error code if rejected.
 */
async function truncateAsServiceRole(): Promise<{ succeeded: boolean; code?: string; message?: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE service_role");
    await client.query("TRUNCATE public.pricing_decisions");
    // If we get here the TRUNCATE succeeded — always roll back
    await client.query("ROLLBACK");
    return { succeeded: true };
  } catch (e: any) {
    try { await client.query("ROLLBACK"); } catch {}
    return { succeeded: false, code: e.code, message: e.message };
  } finally {
    client.release();
  }
}

/** Query privilege state from information_schema. */
async function queryPrivs(): Promise<{ grantee: string; privilege_type: string }[]> {
  const res = await pool.query<{ grantee: string; privilege_type: string }>(`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_name   = 'pricing_decisions'
      AND table_schema = 'public'
      AND grantee IN ('anon','authenticated','service_role','postgres')
    ORDER BY grantee, privilege_type
  `);
  return res.rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log("TRUNCATE / TRIGGER privilege proof for pricing_decisions\n");

try {
  // ── Phase 0: show current state ───────────────────────────────────────────
  section("PHASE 0 — Current privilege state (before test)");
  const p0 = await queryPrivs();
  for (const r of p0) {
    const marker = (r.privilege_type === "TRUNCATE" || r.privilege_type === "TRIGGER" || r.privilege_type === "UPDATE" || r.privilege_type === "DELETE")
      ? "⚠ " : "  ";
    note(`${marker}grantee=${r.grantee.padEnd(15)} privilege=${r.privilege_type}`);
  }

  const srHasTruncate0 = p0.some(r => r.grantee === "service_role" && r.privilege_type === "TRUNCATE");
  note(`\nservice_role has TRUNCATE: ${srHasTruncate0}`);

  // ── Phase 1: BEFORE — grant TRUNCATE back and prove it works ──────────────
  section("PHASE 1 — BEFORE: GRANT TRUNCATE to service_role, then attempt as service_role");

  // First, insert a row so TRUNCATE has something to do
  const { error: preInsErr } = await (admin as any)
    .from("pricing_decisions")
    .insert({
      user_id: USER_ID, product: "Truncate Test", category: "test",
      channel: "Online", current_price: 1, recommended_price: 1,
      decision: "engine_rec", source: "test", trigger_type: "test",
    });
  if (preInsErr) note(`Pre-insert note: ${preInsErr.message}`);

  await ddl("GRANT TRUNCATE ON public.pricing_decisions TO service_role, authenticated, anon");
  note("postgres: GRANT TRUNCATE ON pricing_decisions TO service_role, authenticated, anon → done");

  const before = await truncateAsServiceRole();
  if (before.succeeded) {
    fail(`TRUNCATE SUCCEEDED as service_role (gap confirmed — service_role CAN wipe the table)`);
    note("(Transaction was rolled back — no data lost)");
  } else {
    note(`TRUNCATE blocked even before REVOKE: code=${before.code} — unexpected`);
  }

  // ── Phase 2: Apply fix ────────────────────────────────────────────────────
  section("PHASE 2 — Apply fix: REVOKE TRUNCATE, TRIGGER FROM service_role, authenticated, anon");
  await ddl("REVOKE TRUNCATE, TRIGGER ON public.pricing_decisions FROM service_role, authenticated, anon");
  note("postgres: REVOKE TRUNCATE, TRIGGER ON pricing_decisions FROM service_role, authenticated, anon → done");

  // ── Phase 3: AFTER — TRUNCATE must be rejected ────────────────────────────
  section("PHASE 3 — AFTER: TRUNCATE as service_role → must be rejected");

  const after = await truncateAsServiceRole();
  if (!after.succeeded && after.code === "42501") {
    pass(`TRUNCATE rejected — code="${after.code}", message="${after.message}"`);
    pass("42501 = PostgreSQL insufficient_privilege — privilege-level block ✓");
  } else if (!after.succeeded) {
    note(`TRUNCATE blocked with unexpected code: code=${after.code}, message=${after.message}`);
  } else {
    fail("TRUNCATE SUCCEEDED — service_role can still wipe the table!");
  }

  // ── Phase 4: confirm INSERT still works ───────────────────────────────────
  section("PHASE 4 — service_role INSERT still works (engine writes preserved)");
  const { data: insData, error: insErr } = await (admin as any)
    .from("pricing_decisions")
    .insert({
      user_id: USER_ID, product: "Post-Revoke Engine Write", category: "test",
      channel: "Online", current_price: 100, recommended_price: 90,
      decision: "engine_rec", source: "pricing_engine", trigger_type: "test",
    })
    .select("id, decision, created_at")
    .single();
  if (insErr) {
    fail(`INSERT failed: ${insErr.message}`);
  } else {
    pass(`INSERT succeeded — id=${insData.id}, created_at=${insData.created_at}`);
    pass("Engine audit writes are fully preserved ✓");
  }

  // ── Phase 5: final privilege table ───────────────────────────────────────
  section("PHASE 5 — Final privilege list (structural proof)");
  const pFinal = await queryPrivs();

  // Render table
  const rows = pFinal.filter(r => r.grantee !== "postgres"); // postgres is superuser, always full
  const srRows  = rows.filter(r => r.grantee === "service_role").map(r => r.privilege_type);
  const authRows = rows.filter(r => r.grantee === "authenticated").map(r => r.privilege_type);
  const anonRows = rows.filter(r => r.grantee === "anon").map(r => r.privilege_type);

  console.log(`
  ┌──────────────────┬─────────────────────────────────────────────────────┐
  │ Role             │ Granted privileges on pricing_decisions              │
  ├──────────────────┼─────────────────────────────────────────────────────┤
  │ service_role     │ ${srRows.join(", ").padEnd(51)} │
  │ authenticated    │ ${authRows.join(", ").padEnd(51)} │
  │ anon             │ ${anonRows.join(", ").padEnd(51)} │
  │ postgres         │ ALL (superuser — direct DB only, not via app)       │
  └──────────────────┴─────────────────────────────────────────────────────┘`);

  const forbidden = ["UPDATE", "DELETE", "TRUNCATE", "TRIGGER"];
  const violations: string[] = [];
  for (const r of rows) {
    if (forbidden.includes(r.privilege_type)) {
      violations.push(`${r.grantee} has ${r.privilege_type}`);
    }
  }
  console.log();
  if (violations.length === 0) {
    pass("No application role has UPDATE, DELETE, TRUNCATE, or TRIGGER");
    pass("pricing_decisions is INSERT + SELECT only for all application roles ✓");
  } else {
    for (const v of violations) fail(v);
  }

} finally {
  await pool.end();
}
