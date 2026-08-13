/**
 * Immutability proof for map_violations.
 *
 * 1. Lists every privilege held by service_role / authenticated / anon on map_violations.
 *    Expected: INSERT, SELECT, REFERENCES only — no UPDATE, DELETE, TRUNCATE.
 *
 * 2. SET ROLE service_role; then attempts UPDATE, DELETE, TRUNCATE in separate
 *    transactions. Each must raise error code 42501 (insufficient_privilege).
 *
 * Uses the pooler connection (same creds as apply-map-migration.mts).
 */

import pg from "pg";
import { requireDatabaseUrl } from "./lib/require-database-url";
const { Client } = pg;

const PG_URL =
  requireDatabaseUrl();

function mkClient() {
  return new Client({ connectionString: PG_URL });
}

async function withClient<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = mkClient();
  await c.connect();
  try { return await fn(c); }
  finally { await c.end(); }
}

// ── 1. Privilege list ──────────────────────────────────────────────────────────
console.log("\n══ map_violations privilege list (service_role / authenticated / anon) ══\n");

const privs = await withClient(async c => {
  const { rows } = await c.query<{ grantee: string; privilege_type: string }>(`
    SELECT grantee, privilege_type
    FROM   information_schema.role_table_grants
    WHERE  table_schema = 'public'
      AND  table_name   = 'map_violations'
      AND  grantee IN ('service_role','authenticated','anon')
    ORDER  BY grantee, privilege_type;
  `);
  return rows;
});

const BAD = new Set(["UPDATE","DELETE","TRUNCATE"]);
for (const p of privs) {
  const tag = BAD.has(p.privilege_type) ? "  ← BAD (should not exist)" : "";
  console.log(`  ${p.grantee}: ${p.privilege_type}${tag}`);
}

const hasBad = privs.some(p => BAD.has(p.privilege_type));
if (!hasBad) {
  console.log("\n  ✓ No UPDATE / DELETE / TRUNCATE privileges — privilege list is clean.");
} else {
  console.log("\n  ✗ WARNING: destructive privileges found — lock_immutable_table may not have run.");
}

// ── 2. Operational proof: attempt each disallowed DML as service_role ──────────
console.log("\n══ Attempting disallowed DML as service_role (each must return 42501) ══\n");

type Attempt = { label: string; sql: string };
const attempts: Attempt[] = [
  {
    label: "UPDATE map_violations SET sku = sku WHERE 1=0",
    sql:   "UPDATE public.map_violations SET sku = sku WHERE 1 = 0;",
  },
  {
    label: "DELETE FROM map_violations WHERE 1=0",
    sql:   "DELETE FROM public.map_violations WHERE 1 = 0;",
  },
  {
    label: "TRUNCATE map_violations",
    sql:   "TRUNCATE public.map_violations;",
  },
];

let allRejected = true;

for (const { label, sql } of attempts) {
  const result = await withClient(async c => {
    // Switch to service_role for the permission check
    await c.query("SET ROLE service_role;");
    try {
      await c.query(sql);
      return { rejected: false, code: null as string | null, msg: "succeeded (no error)" };
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "???";
      const msg  = (e as { message?: string }).message ?? String(e);
      return { rejected: code === "42501", code, msg };
    }
  });

  const icon  = result.rejected ? "✓" : "✗";
  const label2 = result.rejected
    ? `42501 insufficient_privilege`
    : `${result.code} — ${result.msg.slice(0, 120)}`;
  console.log(`  ${icon}  ${label}`);
  console.log(`     → ${label2}\n`);
  if (!result.rejected) allRejected = false;
}

if (allRejected) {
  console.log("  ✓ All three DML operations rejected with 42501 — map_violations is genuinely immutable.\n");
} else {
  console.log("  ✗ One or more operations were NOT rejected — immutability is not enforced.\n");
}

process.exit(allRejected && !hasBad ? 0 : 1);
