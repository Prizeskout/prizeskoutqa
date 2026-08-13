import pg from "pg";
import { readFileSync } from "fs";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL = requireDatabaseUrl();

const sql = readFileSync(
  new URL("../supabase/migrations/20260727080000_payout_audit_full_fidelity.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260727080000_payout_audit_full_fidelity.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ps_payout_audits'
    ORDER BY ordinal_position;
  `);
  console.log("\nps_payout_audits columns:");
  for (const c of cols) {
    console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`);
  }

  await client.query(`NOTIFY pgrst, 'reload schema';`);
  console.log("\n✓  PostgREST schema cache reload notified");
} finally {
  await client.end();
}
