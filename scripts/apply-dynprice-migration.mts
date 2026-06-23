import pg from "pg";
import { readFileSync } from "fs";

const { Client } = pg;
const PG_URL = "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const sql = readFileSync(
  new URL("../supabase/migrations/20260619050000_dynamic_pricing_engine.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260619050000_dynamic_pricing_engine.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  // Verify tables exist
  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('gcc_event_calendar','dynprice_configs','dynprice_rules','dynprice_floor_overrides')
    ORDER BY tablename;
  `);
  console.log("Tables created:", tables.map((r: any) => r.tablename));

  // Verify seeded events
  const { rows: events } = await client.query(`
    SELECT event_type, name, year, starts_at::date AS starts, ends_at::date AS ends, is_approximate
    FROM public.gcc_event_calendar
    ORDER BY starts_at;
  `);
  console.log("\nSeeded GCC events:");
  for (const e of events) {
    console.log(`  ${e.is_approximate ? "~" : " "} ${e.name.padEnd(30)} ${e.starts} → ${e.ends}`);
  }

  // Verify immutability of dynprice_floor_overrides
  const { rows: privs } = await client.query(`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'dynprice_floor_overrides'
      AND grantee IN ('service_role','authenticated','anon')
    ORDER BY grantee, privilege_type;
  `);
  const forbidden = privs.filter((p: any) => ["UPDATE","DELETE","TRUNCATE","TRIGGER"].includes(p.privilege_type));
  console.log("\ndynprice_floor_overrides privileges — forbidden remaining:", forbidden.length === 0 ? "NONE ✓" : JSON.stringify(forbidden));

} finally {
  await client.end();
}
