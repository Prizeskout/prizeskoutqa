import pg from "pg";
import { readFileSync } from "fs";

const { Client } = pg;
const PG_URL = "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const sql = readFileSync(
  new URL("../supabase/migrations/20260623000000_competitor_url_cache.sql", import.meta.url),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  console.log("Applying migration 20260623000000_competitor_url_cache.sql …");
  await client.query(sql);
  console.log("✓  Migration applied\n");

  // Verify tables
  const { rows: tables } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('competitor_url_cache','scrape_cost_log')
    ORDER BY tablename;
  `);
  console.log("Tables:", tables.map((r: any) => r.tablename));

  // Verify functions
  const { rows: fns } = await client.query(`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND proname IN (
        'normalize_competitor_url','required_freshness_seconds',
        'max_freshness_seconds','get_url_watchers','maintain_url_cache'
      )
    ORDER BY proname;
  `);
  console.log("Functions:", fns.map((r: any) => r.proname));

  // Verify view
  const { rows: views } = await client.query(`
    SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname='v_url_due_status';
  `);
  console.log("Views:", views.map((r: any) => r.viewname));

  // Show normalization demo
  const { rows: demo } = await client.query(`
    SELECT
      normalize_competitor_url('https://www.talabat.com/qatar/product/001?utm_source=google&product_id=tv42')
        AS norm_a,
      normalize_competitor_url('HTTPS://WWW.TALABAT.COM/QATAR/PRODUCT/001/?fbclid=abc123&product_id=tv42')
        AS norm_b,
      normalize_competitor_url('https://www.talabat.com/qatar/product/001?product_id=tv42')
        AS norm_c;
  `);
  console.log("\nNormalization demo:");
  console.log("  A (utm_source):", demo[0].norm_a);
  console.log("  B (fbclid+cap):", demo[0].norm_b);
  console.log("  C (canonical): ", demo[0].norm_c);
  console.log("  A == B?", demo[0].norm_a === demo[0].norm_b ? "✓ YES" : "✗ NO");
  console.log("  B == C?", demo[0].norm_b === demo[0].norm_c ? "✓ YES" : "✗ NO");

  // Seed count
  const { rows: seed } = await client.query(`
    SELECT COUNT(*) AS cache_rows, SUM(watcher_count) AS total_watchers
    FROM public.competitor_url_cache;
  `);
  console.log(`\nCache seeded from existing competitor_product_urls:`);
  console.log(`  ${seed[0].cache_rows} unique URLs, ${seed[0].total_watchers} total watcher slots`);

} finally {
  await client.end();
}
