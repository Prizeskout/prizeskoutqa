/**
 * Apply embed_api migration (API 13 — White-Label Embed).
 * Creates embed_configs table.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";

const DB_URL =
  "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const sql = readFileSync(
  resolve("supabase/migrations/20260621010000_embed_api.sql"),
  "utf8",
);

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("✓ embed_configs table created (or already exists)");

  const { rows } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='embed_configs' ORDER BY ordinal_position",
  );
  console.log("  columns:", rows.map((r: { column_name: string }) => r.column_name).join(", "));
} finally {
  await client.end();
}
