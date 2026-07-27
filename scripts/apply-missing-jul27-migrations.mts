// Applies the 8 migrations from 2026-07-27 that were committed to git this
// session but never actually run against the live database (discovered
// while prepping a demo account — Contract Vault, Recovery Cases, Promotion
// Profitability, Channel Price Architecture, Group Controls, and Month-End
// Close all reference tables that didn't exist yet). All 8 are additive
// (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) — zero risk to
// existing data, applied in dependency order (the two ALTERs must follow
// the CREATE they extend).
import pg from "pg";
import { readFileSync } from "fs";

const { Client } = pg;
const PG_URL = "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const MIGRATIONS = [
  "20260727000000_marketplace_contract_terms.sql",
  "20260727010000_contract_extraction_provenance.sql",
  "20260727020000_expand_contract_obligations.sql",
  "20260727030000_recovery_cases.sql",
  "20260727040000_promotion_profitability.sql",
  "20260727050000_channel_price_plans.sql",
  "20260727060000_group_controls.sql",
  "20260727070000_month_end_close.sql",
];

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf-8");
    console.log(`Applying ${file} ...`);
    await client.query(sql);
    console.log(`  ✓ applied`);
  }

  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1) ORDER BY tablename
  `, [[
    "ps_marketplace_contract_terms", "ps_recovery_cases", "ps_promotion_scenarios",
    "ps_channel_price_plans", "ps_group_controls", "ps_month_end_closes",
  ]]);
  console.log("\nTables now present:", rows.map(r => r.tablename));

  await client.query(`NOTIFY pgrst, 'reload schema';`);
  console.log("✓ PostgREST schema cache reload notified");
} finally {
  await client.end();
}
