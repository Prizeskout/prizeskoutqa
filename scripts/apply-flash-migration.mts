import pg from "pg";
import { readFileSync } from "fs";

const { Client } = pg;
const PG_URL = "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const sql = readFileSync(
  new URL("../supabase/migrations/20260621000000_flash_sale_orchestration.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260621000000_flash_sale_orchestration.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('flash_events','flash_event_skus')
    ORDER BY tablename;
  `);
  console.log("Tables created:", tables.map((r: any) => r.tablename));

  const { rows: cols } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flash_events'
    ORDER BY ordinal_position;
  `);
  console.log("\nflash_events columns:");
  for (const c of cols) console.log(`  ${c.column_name}: ${c.data_type}`);

} finally {
  await client.end();
}
