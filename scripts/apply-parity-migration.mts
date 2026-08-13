import pg from "pg";
import { readFileSync } from "fs";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL = requireDatabaseUrl();

const sql = readFileSync(
  new URL("../supabase/migrations/20260620010000_cross_border_parity.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260620010000_cross_border_parity.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('gcc_country_configs','parity_rules','parity_violations','fx_rates_cache')
    ORDER BY tablename;
  `);
  console.log("Tables created:", tables.map((r: any) => r.tablename));

  const { rows: countries } = await client.query(`
    SELECT country_code, country_name, currency_code,
           vat_pct, default_import_duty_pct, logistics_cost_qar
    FROM public.gcc_country_configs
    ORDER BY country_code;
  `);
  console.log("\nSeeded GCC country configs:");
  for (const c of countries) {
    console.log(
      `  ${c.country_code}  ${c.currency_code}  VAT=${(Number(c.vat_pct) * 100).toFixed(0)}%` +
      `  duty=${(Number(c.default_import_duty_pct) * 100).toFixed(0)}%` +
      `  logistics_qar=${c.logistics_cost_qar}  (${c.country_name})`,
    );
  }

} finally {
  await client.end();
}
