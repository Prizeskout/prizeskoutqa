import pg from "pg";
import { readFileSync } from "fs";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL = requireDatabaseUrl();

const sql = readFileSync(
  new URL("../supabase/migrations/20260622000000_billing_plans.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260622000000_billing_plans.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  // Verify licensees.plan column
  const { rows: cols } = await client.query(`
    SELECT column_name, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensees'
      AND column_name IN ('plan', 'is_platform')
    ORDER BY column_name;
  `);
  console.log("\nlicensees columns added:");
  for (const c of cols) {
    console.log(`  ${c.column_name}: default=${c.column_default}, nullable=${c.is_nullable}`);
  }

  // Verify find_account_for_api_key signature
  const { rows: fnRows } = await client.query(`
    SELECT pg_get_function_result(oid) AS return_type
    FROM pg_proc
    WHERE proname = 'find_account_for_api_key'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  `);
  console.log("\nfind_account_for_api_key return type:", fnRows[0]?.return_type);

  // Show plan distribution
  const { rows: planRows } = await client.query(`
    SELECT plan, COUNT(*) AS licensee_count
    FROM public.licensees
    GROUP BY plan
    ORDER BY plan;
  `);
  console.log("\nPlan distribution:");
  for (const r of planRows) {
    console.log(`  ${r.plan}: ${r.licensee_count} licensees`);
  }

} finally {
  await client.end();
}
