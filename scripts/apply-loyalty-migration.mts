import pg from "pg";
import { readFileSync } from "fs";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL = requireDatabaseUrl();

const sql = readFileSync(
  new URL("../supabase/migrations/20260619070000_loyalty_segment_pricing.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260619070000_loyalty_segment_pricing.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('loyalty_segments','loyalty_ab_assignments','loyalty_outcomes')
    ORDER BY tablename;
  `);
  console.log("Tables created:", tables.map((r: any) => r.tablename));

  const { rows: cols } = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('loyalty_segments','loyalty_ab_assignments','loyalty_outcomes')
    ORDER BY table_name, ordinal_position;
  `);
  console.log("\nColumns:");
  for (const c of cols) {
    console.log(`  ${c.table_name}.${c.column_name} (${c.data_type})`);
  }

} finally {
  await client.end();
}
