import pg from "pg";
import { readFileSync } from "fs";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL = requireDatabaseUrl();

const sql = readFileSync(
  new URL("../supabase/migrations/20260620020000_map_compliance_api.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260620020000_map_compliance_api.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('map_agreements','map_violations')
    ORDER BY tablename;
  `);
  console.log("Tables created:", tables.map((r: any) => r.tablename));

  // Verify immutability: confirm UPDATE/DELETE are revoked on map_violations
  const { rows: privs } = await client.query(`
    SELECT privilege_type, grantee
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'map_violations'
      AND grantee IN ('service_role','authenticated','anon')
    ORDER BY grantee, privilege_type;
  `);
  console.log("\nmap_violations grants (UPDATE/DELETE should NOT appear):");
  const allowed = privs.filter((p: any) => p.privilege_type !== "TRIGGER");
  for (const p of allowed) {
    const warn = ["UPDATE","DELETE","TRUNCATE"].includes(p.privilege_type) ? " ← BAD" : "";
    console.log(`  ${p.grantee}: ${p.privilege_type}${warn}`);
  }

} finally {
  await client.end();
}
