import pg from "pg";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { requireDatabaseUrl } from "./lib/require-database-url";

const { Client } = pg;
const PG_URL =
  requireDatabaseUrl();

const sql = readFileSync(
  new URL(
    "../supabase/migrations/20260622010000_product_cap_trigger.sql",
    import.meta.url,
  ),
  "utf-8",
);

const client = new Client({ connectionString: PG_URL });
await client.connect();

try {
  // ── 1. Apply migration ───────────────────────────────────────────────────
  console.log("Applying migration 20260622010000_product_cap_trigger.sql …");
  await client.query(sql);
  console.log("✓  Migration applied\n");

  // ── 2. Verify trigger exists ─────────────────────────────────────────────
  const { rows: trig } = await client.query(`
    SELECT trigger_name, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'catalog_products'
      AND trigger_name = 'enforce_product_plan_cap';
  `);
  if (trig.length === 0) throw new Error("Trigger not found after migration!");
  console.log("Trigger registered:");
  console.log(`  ${trig[0].action_timing} ${trig[0].event_manipulation} → enforce_product_plan_cap\n`);

  // ── 3. Seed a starter licensee + account at exactly the cap (50 rows) ───
  console.log("Seeding a starter licensee at the 50-product cap …");

  const licenseeId = randomUUID();
  const accountId  = randomUUID();
  const userId     = randomUUID();

  await client.query(`
    INSERT INTO public.licensees (id, slug, name, plan)
    VALUES ($1, 'cap-test-licensee', 'Cap Test Licensee', 'starter');
  `, [licenseeId]);

  await client.query(`
    INSERT INTO public.accounts_v2 (id, licensee_id, slug, name, is_default)
    VALUES ($1, $2, 'cap-test-account', 'Cap Test Account', true);
  `, [accountId, licenseeId]);

  // Bulk-insert exactly 50 products (the starter limit).
  const insertVals = Array.from({ length: 50 }, (_, i) => {
    const id  = randomUUID();
    const sku = `CAP-SKU-${String(i + 1).padStart(3, "0")}`;
    return `('${id}', '${accountId}', '${licenseeId}', '${sku}', 'Cap Test Product ${i + 1}')`;
  }).join(",\n    ");

  await client.query(`
    INSERT INTO public.catalog_products (id, account_id, licensee_id, sku, name)
    VALUES
    ${insertVals};
  `);

  const { rows: cnt } = await client.query(
    `SELECT COUNT(*) AS n FROM public.catalog_products WHERE account_id = $1;`,
    [accountId],
  );
  console.log(`✓  Seeded ${cnt[0].n} products (at cap)\n`);

  // ── 4. Attempt the 51st insert — trigger MUST reject it ─────────────────
  console.log("Attempting 51st INSERT as service_role (trigger should reject) …");
  try {
    await client.query(`
      INSERT INTO public.catalog_products (id, account_id, licensee_id, sku, name)
      VALUES ($1, $2, $3, 'CAP-SKU-051', 'Should Be Blocked');
    `, [randomUUID(), accountId, licenseeId]);

    // If we reach here the trigger did NOT fire — that's a failure.
    console.error("✗  INSERT succeeded — trigger DID NOT fire. Cap is not enforced at DB level!");
    process.exit(1);

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("✓  INSERT correctly rejected by DB trigger:\n");
    console.log("  ", msg, "\n");

    if (!msg.includes("plan_product_cap_exceeded")) {
      console.error("✗  Unexpected error (not the cap trigger):", msg);
      process.exit(1);
    }
  }

  console.log("All checks passed — DB-level cap is enforced.\n");

} finally {
  // ── Cleanup ─────────────────────────────────────────────────────────────
  // Best-effort; ignore errors so we always disconnect.
  try {
    await client.query(`
      DELETE FROM public.catalog_products WHERE account_id = $1;
      DELETE FROM public.accounts_v2    WHERE id = $2;
      DELETE FROM public.licensees      WHERE id = $3;
    `, [accountId, accountId, licenseeId]);
    console.log("Cleanup done.");
  } catch (_) { /* ignore */ }

  await client.end();
}
