import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  connectionString:
    requireDatabaseUrl(),
});

await client.connect();

const sql = readFileSync(
  join(__dir, "../supabase/migrations/20260623010000_url_cache_cadence_hook.sql"),
  "utf8",
);
await client.query(sql);
console.log("✓ Migration applied");

// Verify
const { rows: cols } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'competitor_url_cache' AND column_name = 'required_freshness_sec'
`);
console.log("✓ required_freshness_sec column:", cols[0] ?? "MISSING");

const { rows: sample } = await client.query(`
  SELECT normalized_url, watcher_count, required_freshness_sec
  FROM competitor_url_cache
  ORDER BY watcher_count DESC, required_freshness_sec ASC
  LIMIT 5
`);
console.log("Sample cache rows after back-fill:");
for (const r of sample) {
  console.log(
    `  ${r.normalized_url.slice(0, 60).padEnd(60)}  watchers=${r.watcher_count}  freshness=${r.required_freshness_sec}s`,
  );
}

await client.end();
