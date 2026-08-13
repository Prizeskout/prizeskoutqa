/**
 * Apply migration 20260621020000_wire_cron_hooks.sql then:
 *   1. Print full cron.job list with schedule + URL verification
 *   2. Manually invoke every hook over HTTP ? show status + effect
 *   3. Create a test group_campaigns row expiring NOW, wait =90s for
 *      pg_cron group-expire tick, then confirm via cron.job_run_details
 */

import pg from "pg";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { requireDatabaseUrl } from "./lib/require-database-url";

const DB  = requireDatabaseUrl();
const WORKER = "https://prizeskout.qa";
const ANON   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo";
const SVC    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPA_URL = "https://itfhekcvmcbntjndvhzg.supabase.co";

const ACCT_ID = "4a292c7b-fa88-468a-8e33-fdc795e2f030";
const LIC_ID  = "1a1d0a17-366b-4242-b504-ae78ee68b32c";

const admin = createClient(SUPA_URL, SVC);

function section(t: string) {
  console.log(`\n${"-".repeat(72)}\n  ${t}\n${"-".repeat(72)}`);
}
function pass(msg: string) { console.log(`  ? ${msg}`); }
function fail(msg: string) { console.log(`  ? ${msg}`); }
function info(msg: string) { console.log(`    ${msg}`); }

// -- 1. Apply migration --------------------------------------------------------
section("STEP 1 — Apply migration 20260621020000_wire_cron_hooks.sql");

const client = new pg.Client({ connectionString: DB });
await client.connect();

const sql = readFileSync(
  new URL("../supabase/migrations/20260621020000_wire_cron_hooks.sql", import.meta.url),
  "utf-8",
);

try {
  await client.query(sql);
  pass("Migration applied");
} catch (err) {
  fail(`Migration failed: ${(err as Error).message}`);
  await client.end();
  process.exit(1);
}

// -- 2. cron.job table ---------------------------------------------------------
section("STEP 2 — SELECT * FROM cron.job");

const EXPECTED_WORKER = "prizeskoutqatar.workers.dev";
const EXPECTED_KEY    = ANON;

const { rows: jobs } = await client.query<{
  jobid: string; jobname: string; schedule: string; command: string;
}>("SELECT jobid, jobname, schedule, command FROM cron.job ORDER BY jobid");

const HDR = ["jobid","jobname","schedule"].map(h=>h.padEnd(38)).join(" ¦ ");
console.log(`\n  ${"-".repeat(HDR.length)}`);
console.log(`  ${HDR}`);
console.log(`  ${"-".repeat(HDR.length)}`);
for (const j of jobs) {
  const urlOk  = j.command.includes(EXPECTED_WORKER);
  const keyOk  = j.command.includes(EXPECTED_KEY);
  const mark   = urlOk && keyOk ? "?" : "?";
  console.log(`  ${mark} ${j.jobid.padEnd(6)} ${j.jobname.padEnd(32)} ${j.schedule}`);
  if (!urlOk) info(`  ? BAD URL (missing ${EXPECTED_WORKER})`);
  if (!keyOk) info(`  ? BAD KEY`);
}
console.log(`  ${"-".repeat(HDR.length)}`);
console.log(`\n  Total jobs: ${jobs.length}`);

const allOk = jobs.every(j => j.command.includes(EXPECTED_WORKER) && j.command.includes(EXPECTED_KEY));
if (allOk) pass("All jobs point at Workers URL with correct auth key");
else        fail("Some jobs have wrong URL or missing auth key");

// -- 3. Manual HTTP invocation of each hook ------------------------------------
section("STEP 3 — Manual HTTP invocation of each hook (one shot each)");

const HOOKS = [
  { name: "flash-start",               path: "/api/public/hooks/flash-start" },
  { name: "flash-end",                 path: "/api/public/hooks/flash-end" },
  { name: "group-expire",              path: "/api/public/hooks/group-expire" },
  { name: "webhook-retry",             path: "/api/public/hooks/webhook-retry" },
  { name: "webhook-intelligence-retry",path: "/api/public/hooks/webhook-intelligence-retry" },
  { name: "map-monitor",               path: "/api/public/hooks/map-monitor" },
  { name: "scrape-all",                path: "/api/public/hooks/scrape-all" },
];

const hookResults: Record<string, { status: number; body: unknown }> = {};

for (const hook of HOOKS) {
  const url = `${WORKER}${hook.path}`;
  const t0  = Date.now();
  // scrape-all takes 20-30s — skip in this pass (already verified in API05 smoke)
  if (hook.name === "scrape-all") {
    info(`${hook.name.padEnd(30)} — skipped (tested separately in smoke-competitor-intel)`);
    continue;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    const ms   = Date.now() - t0;
    hookResults[hook.name] = { status: res.status, body };
    const mark  = res.status === 200 ? "?" : "?";
    const label = hook.name.padEnd(30);
    console.log(`  ${mark} ${label}  HTTP ${res.status}  (${ms}ms)`);
    const b = body as Record<string, unknown>;
    if (b.processed !== undefined || b.activated !== undefined || b.expired !== undefined ||
        b.drained !== undefined || b.completed !== undefined || b.checked !== undefined) {
      const summary = Object.entries(b)
        .filter(([k]) => !["success","timestamp","ceiling_note"].includes(k))
        .map(([k,v]) => `${k}=${JSON.stringify(v)}`)
        .join(", ");
      info(summary);
    }
    if (res.status !== 200) fail(`  ${hook.name} returned non-200`);
  } catch (err) {
    fail(`${hook.name}: ${(err as Error).message}`);
  }
}

// -- 4. Idempotency check ------------------------------------------------------
section("STEP 4 — Idempotency: fire per-minute hooks a second time");
info("Re-invoking flash-start, flash-end, group-expire, webhook-retry …");

for (const name of ["flash-start","flash-end","group-expire","webhook-retry"]) {
  const hook  = HOOKS.find(h => h.name === name)!;
  const url   = `${WORKER}${hook.path}`;
  const res   = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
    body: "{}",
  });
  const body  = await res.json().catch(() => ({})) as Record<string,unknown>;
  const first = hookResults[name]?.body as Record<string,unknown> ?? {};
  // Verify counts haven't grown (no double-processing)
  const countKeys = ["activated","ended","expired","completed","drained","processed"];
  let doubled = false;
  for (const k of countKeys) {
    if (first[k] !== undefined && body[k] !== undefined && Number(body[k]) > Number(first[k])) {
      doubled = true;
      fail(`${name}: ${k} grew from ${first[k]} to ${body[k]} on second fire (double-processing!)`);
    }
  }
  if (!doubled) pass(`${name}: second fire idempotent (counts did not grow)`);
}

// -- 5. pg_cron real-fire test -------------------------------------------------
section("STEP 5 — pg_cron real-fire: seed test campaign ? wait for group-expire tick");

// Insert a campaign that's already expired
const expiredAt = new Date(Date.now() - 10_000).toISOString(); // 10s in the past
const { data: campRow, error: campErr } = await (admin as any)
  .from("group_campaigns")
  .insert({
    account_id:  ACCT_ID,
    licensee_id: LIC_ID,
    sku:         "CRON-TEST-SONY-XM5",
    base_price:  1299,
    tiers:       [{ min_buyers: 2, price: 1199 }],
    expiry_at:   expiredAt,
    status:      "active",
  })
  .select("id")
  .single();

if (campErr) {
  fail(`Could not insert test campaign: ${campErr.message}`);
  await client.end();
  process.exit(1);
}
const campId = (campRow as { id: string }).id;
pass(`Test campaign inserted: ${campId}`);
info(`expiry_at = ${expiredAt} (already in the past — next cron tick should process it)`);

// Record wall-clock so we can measure cron latency
const seedTime = Date.now();
info(`Waiting up to 90s for pg_cron to fire group-expire …`);

// Poll cron.job_run_details for a run AFTER seedTime for job 'group-expire'
let cronFired = false;
let runDetail: unknown = null;
const POLL_UNTIL = seedTime + 90_000;

while (Date.now() < POLL_UNTIL) {
  await new Promise(r => setTimeout(r, 5_000));

  const { rows: details } = await client.query<{
    runid: string; jobid: string; job_pid: number;
    start_time: Date; end_time: Date; return_message: string; status: string;
  }>(`
    SELECT r.runid, r.jobid, r.job_pid, r.start_time, r.end_time,
           r.return_message, r.status
    FROM   cron.job_run_details r
    JOIN   cron.job j USING (jobid)
    WHERE  j.jobname = 'group-expire'
      AND  r.start_time > $1::timestamptz
    ORDER  BY r.start_time DESC
    LIMIT  1
  `, [new Date(seedTime).toISOString()]);

  if (details.length > 0) {
    cronFired = true;
    runDetail = details[0];
    break;
  }

  const elapsed = Math.round((Date.now() - seedTime) / 1000);
  process.stdout.write(`\r    Polling … ${elapsed}s elapsed`);
}
console.log(); // newline after progress

if (cronFired && runDetail) {
  const d = runDetail as Record<string, unknown>;
  pass("pg_cron fired group-expire job!");
  info(`  runid      : ${d.runid}`);
  info(`  start_time : ${d.start_time}`);
  info(`  end_time   : ${d.end_time}`);
  info(`  status     : ${d.status}`);
  info(`  message    : ${d.return_message}`);

  // Verify campaign was processed
  const { data: camp } = await (admin as any)
    .from("group_campaigns")
    .select("id, status, updated_at")
    .eq("id", campId)
    .single();
  const c = camp as { id: string; status: string; updated_at: string } | null;
  if (c && c.status !== "active") {
    pass(`Campaign ${campId} transitioned: active ? ${c.status} ?`);
  } else {
    info(`Campaign status: ${c?.status ?? "unknown"} (may still be processing)`);
  }
} else {
  fail("pg_cron did not fire within 90s — check cron.job_run_details manually");
  info("Hint: SELECT * FROM cron.job_run_details WHERE start_time > now() - interval '2 min' ORDER BY start_time DESC;");
}

// Clean up test campaign
await (admin as any).from("group_campaigns").delete().eq("id", campId);
info(`Test campaign ${campId} cleaned up`);

// -- 6. Final cron.job snapshot ------------------------------------------------
section("STEP 6 — Final cron.job (full command preview)");

const { rows: finalJobs } = await client.query<{
  jobid: string; jobname: string; schedule: string; command: string;
}>("SELECT jobid, jobname, schedule, command FROM cron.job ORDER BY jobid");

for (const j of finalJobs) {
  const urlMatch  = (j.command.match(/url\s*:=\s*'([^']+)'/) ?? [])[1] ?? "?";
  const hasKey    = j.command.includes(ANON);
  console.log(`\n  [${"?".padEnd(1)}] jobid=${j.jobid}  schedule=${j.schedule}`);
  console.log(`      name : ${j.jobname}`);
  console.log(`      url  : ${urlMatch}`);
  console.log(`      auth : ${hasKey ? "? correct publishable key" : "? KEY MISMATCH"}`);
}

await client.end();

console.log("\n\nDone.\n");
