import pg from "pg";
import { readFileSync } from "fs";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL = requireDatabaseUrl();

const sql = readFileSync(
  new URL("../supabase/migrations/20260625010000_restore_market_seed_in_handle_new_user.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying 20260625010000_restore_market_seed_in_handle_new_user.sql …");
  await client.query(sql);
  console.log("✓  Migration applied");

  // Verify market data was seeded
  const { rows } = await client.query(`
    SELECT COUNT(*) AS total_market_metric_rows,
           COUNT(DISTINCT user_id) AS users_with_market_data
    FROM public.market_metrics;
  `);
  console.log("\nmarket_metrics after backfill:");
  console.log(`  rows: ${rows[0].total_market_metric_rows}`);
  console.log(`  users with data: ${rows[0].users_with_market_data}`);

  const { rows: competitorRows } = await client.query(`
    SELECT COUNT(DISTINCT user_id) AS users_with_competitor_data
    FROM public.competitor_metrics;
  `);
  console.log(`  users with competitor_metrics: ${competitorRows[0].users_with_competitor_data}`);
} finally {
  await client.end();
}
