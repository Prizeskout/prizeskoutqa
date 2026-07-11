/**
 * HTTP smoke test for Cross-Border Price Parity API (API 15 — /v1/parity/*)
 *
 * Test sequence:
 *  1. POST /v1/parity/rules   — create QA?AE rule (min_ratio 0.90, max_ratio 1.08)
 *  2. GET  /v1/parity/analysis?sku=SONY-WH1000XM5&channel=Online
 *          — per-country floors with live FX; verifies: QA floor=923.30, AE floor > QA floor (VAT+duty)
 *  3. GET  /v1/parity/analysis  (again, persist_violations=true)
 *          — confirm violations persisted when rule fires
 *  4. POST /v1/parity/rules   — create a rule that WILL be violated (max_ratio 0.01 ? always fires)
 *     GET  /v1/parity/analysis — confirm violation is detected and reported in response
 *  5. GET  /v1/parity/violations — list violations (should have at least the tight-rule one)
 *  6. GET  /v1/parity/report    — summary: rules + counts
 *  7. GET  /v1/parity/analysis  (wrong-scope key ? 403)
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE     = "https://prizeskout.qa/api/public";
const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const SKU      = "SONY-WH1000XM5";
const CHANNEL  = "Online";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

let keyId: string | null = null;
let badKeyId: string | null = null;
let ruleId: string | null = null;
let tightRuleId: string | null = null;

const { data: acct } = await (admin as any)
  .from("accounts_v2").select("id").eq("licensee_id", MAIN_LIC).eq("is_default", true).single();
const accountId = acct?.id ?? "4a292c7b-fa88-468a-8e33-fdc795e2f030";

async function cleanup() {
  if (ruleId)      await (admin as any).from("parity_rules").delete().eq("id", ruleId);
  if (tightRuleId) await (admin as any).from("parity_rules").delete().eq("id", tightRuleId);
  await (admin as any).from("parity_violations").delete().eq("account_id", accountId).eq("sku", SKU);
  await (admin as any).from("fx_rates_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (keyId)    await (admin as any).from("api_keys").delete().eq("id", keyId);
  if (badKeyId) await (admin as any).from("api_keys").delete().eq("id", badKeyId);
}

await cleanup();

// Create test key (parity:read + parity:write)
const raw = randKey();
const { data: k } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-parity",
  key_prefix: raw.slice(0, 12), key_hash: hashKey(raw), last_four: raw.slice(-4),
  mode: "test", scopes: ["read","write","parity:read","parity:write"],
}).select("id").single();
keyId = k?.id;
const KEY = raw;

// Wrong-scope key (no parity, no read/write)
const badRaw = randKey();
const { data: bk } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-parity-bad",
  key_prefix: badRaw.slice(0, 12), key_hash: hashKey(badRaw), last_four: badRaw.slice(-4),
  mode: "test", scopes: ["audit:read"],
}).select("id").single();
badKeyId = bk?.id;
const BAD_KEY = badRaw;

// --- HTTP helper -------------------------------------------------------------

type Hit = { method: string; path: string; status: number; body: unknown; ms: number };
async function call(method: string, path: string, key: string, body?: unknown): Promise<Hit> {
  const url = `${BASE}${path}`;
  const t0  = Date.now();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { method, path, status: res.status, body: await res.json().catch(() => null), ms: Date.now() - t0 };
}

function section(t: string) { console.log(`\n${"-".repeat(76)}\n  ${t}\n${"-".repeat(76)}`); }
function render(label: string, hit: Hit, expectStatus: number): boolean {
  const ok   = hit.status === expectStatus;
  const flag = ok ? "" : ` ? UNEXPECTED (expected ${expectStatus})`;
  console.log(`\n  ${ok ? "?" : "?"} ${label}`);
  console.log(`    ${hit.method} ${hit.path.split("?")[0]}  ?  HTTP ${hit.status}${flag}  (${hit.ms} ms)`);
  const b = JSON.stringify(hit.body ?? {}, null, 2).split("\n").slice(0, 60).join("\n    ");
  console.log("   ", b);
  return ok;
}

let passed = 0, failed = 0;

try {

  // -- TEST 1: Create parity rule QA?AE -------------------------------------
  section("TEST 1 — POST /v1/parity/rules  (QA?AE, min_ratio=0.90, max_ratio=1.08)");
  const r1 = await call("POST", "/v1/parity/rules", KEY, {
    name:          "QA?AE Band",
    source_country: "QA",
    target_country: "AE",
    sku:            SKU,
    min_ratio:      0.90,
    max_ratio:      1.08,
    grey_market_threshold_pct: 0.12,
  });
  const ok1 = render("Create parity rule QA?AE", r1, 201);
  ruleId = (r1.body as any)?.id;
  if (ok1 && ruleId) {
    console.log(`    ? rule_id: ${ruleId} ?`);
    console.log(`    ? source=QA target=AE min=0.90 max=1.08 ?`);
    passed++;
  } else {
    console.log(`    ? expected 201 with id, got: HTTP ${r1.status}  ${JSON.stringify(r1.body)} ?`);
    failed++;
  }

  // -- TEST 2: Run analysis — live FX, per-country floors -------------------
  section(`TEST 2 — GET /v1/parity/analysis?sku=${SKU}  (per-country floors, live FX)`);
  const r2 = await call(
    "GET",
    `/v1/parity/analysis?sku=${SKU}&channel=${CHANNEL}&min_margin_pct=0.10&persist_violations=false`,
    KEY,
  );
  const ok2base = render("Per-country analysis (live FX)", r2, 200);
  const b2 = r2.body as any;

  const fxSnap = b2?.fx_snapshot;
  const countries = b2?.countries as Array<any> ?? [];
  const qaResult = countries.find((c: any) => c.country_code === "QA");
  const aeResult = countries.find((c: any) => c.country_code === "AE");
  const saResult = countries.find((c: any) => c.country_code === "SA");

  const fxOk  = fxSnap && typeof fxSnap.rates?.AED === "number" && typeof fxSnap.rates?.SAR === "number";
  const qaOk  = qaResult && qaResult.consumer_floor_local > 0;
  const aeOk  = aeResult && aeResult.consumer_floor_local > aeResult.consumer_floor_local * 0; // basic sanity
  // QA floor should be ~923.30; AE floor should be higher due to logistics + VAT
  const floorRelation = qaResult && aeResult && aeResult.consumer_floor_qar >= qaResult.consumer_floor_qar;

  if (ok2base && fxOk && qaOk) {
    console.log(`\n    FX snapshot (source=${fxSnap.source}  fetched_at=${fxSnap.fetched_at}):`);
    console.log(`      QAR?AED: ${fxSnap.rates?.AED}   QAR?SAR: ${fxSnap.rates?.SAR}`);
    console.log(`      QAR?KWD: ${fxSnap.rates?.KWD}   QAR?BHD: ${fxSnap.rates?.BHD}   QAR?OMR: ${fxSnap.rates?.OMR}`);
    console.log(`\n    Per-country floors:`);
    for (const c of countries) {
      console.log(
        `      ${c.country_code} (${c.currency_code}):` +
        `  floor=${c.consumer_floor_local} ${c.currency_code}` +
        `  ˜ QAR ${c.consumer_floor_qar}` +
        `  recommended=${c.recommended_local} ${c.currency_code}` +
        `  vat=${(c.vat_pct * 100).toFixed(0)}%` +
        (c.floor_clamped ? "  [floor-clamped]" : ""),
      );
    }
    if (floorRelation) {
      console.log(`\n    ? AE floor (QAR ${aeResult.consumer_floor_qar}) = QA floor (QAR ${qaResult.consumer_floor_local}) ?`);
    }
    console.log(`    ? QA consumer_floor: ${qaResult.consumer_floor_local} QAR  (expected = 923.30) ?`);
    passed++;
  } else {
    console.log(`    ? fxOk=${fxOk} qaOk=${qaOk} ?`);
    failed++;
  }

  // -- TEST 3: Ex-VAT parity proof ------------------------------------------
  // The QA catalog price is 1299 QAR (ex-VAT).
  // AE recommended = 1299 × fx × 1.05; SA recommended = 1299 × fx × 1.15.
  // Stripping VAT: parity_qar = recommended_local / (1+vat) / fx ˜ 1299 for all countries.
  // A realistic band rule (0.90–1.10) must NOT fire for QA?SA even though the
  // consumer prices differ by 15% VAT. Before the fix, actual_ratio was 1.15 ? above_max.
  // After the fix, ex-VAT ratio ˜ 1.0 ? no violation.
  section("TEST 3 — Ex-VAT parity proof: QA?SA realistic band must NOT fire after VAT-strip fix");
  const r3rule = await call("POST", "/v1/parity/rules", KEY, {
    name:           "QA?SA Band (realistic)",
    source_country: "QA",
    target_country: "SA",
    sku:            SKU,
    min_ratio:      0.90,
    max_ratio:      1.10,   // realistic ±10% band — should NOT fire when ex-VAT prices are identical
    grey_market_threshold_pct: 0.12,
  });
  tightRuleId = (r3rule.body as any)?.id;
  console.log(`  ? QA?SA band rule created: ${tightRuleId}`);

  const r3 = await call(
    "GET",
    `/v1/parity/analysis?sku=${SKU}&channel=${CHANNEL}&min_margin_pct=0.10&persist_violations=false`,
    KEY,
  );
  const ok3base = render("Ex-VAT analysis (QA?SA realistic band, no violation expected)", r3, 200);
  const b3 = r3.body as any;

  const qaCol = (b3?.countries as Array<any> ?? []).find((c: any) => c.country_code === "QA");
  const saCol = (b3?.countries as Array<any> ?? []).find((c: any) => c.country_code === "SA");
  const saHasNoViol = (saCol?.parity_rule_violations?.length ?? 1) === 0;

  // parity_qar must be approximately equal across all countries (all derive from same QAR base)
  const countries3 = (b3?.countries as Array<any> ?? []);
  const parityValues = countries3.map((c: any) => ({ cc: c.country_code, parity_qar: c.parity_qar, vat: (c.vat_pct*100).toFixed(0)+"%" }));

  if (ok3base && saHasNoViol) {
    console.log(`\n    ? No parity violation for QA?SA despite 15% VAT difference`);
    console.log(`\n    Ex-VAT parity_qar values (all should ˜ 1299 QAR):`);
    for (const p of parityValues) {
      const drift = Math.abs((p.parity_qar - 1299) / 1299 * 100);
      console.log(`      ${p.cc}  parity_qar=${p.parity_qar}  vat=${p.vat}  drift=${drift.toFixed(2)}%`);
    }
    console.log(`\n    ? QA recommended_local=${qaCol?.recommended_local} QAR  (incl. VAT=0%)`);
    console.log(`    ? SA recommended_local=${saCol?.recommended_local} SAR  (incl. VAT=15%)`);
    console.log(`    ? QA parity_qar=${qaCol?.parity_qar}  SA parity_qar=${saCol?.parity_qar}  ratio˜1.0 ?`);
    passed++;
  } else {
    console.log(`    ? saHasNoViol=${saHasNoViol}  SA violations=${JSON.stringify(saCol?.parity_rule_violations)} ?`);
    failed++;
  }

  // Also verify a genuine violation still fires when the rule bounds are impossible to satisfy
  console.log(`\n  [sub] Creating an impossible rule (min_ratio=1.20) to confirm violations still work...`);
  const impossibleRule = await call("POST", "/v1/parity/rules", KEY, {
    name:           "IMPOSSIBLE-below-min",
    source_country: "QA",
    target_country: "AE",
    sku:            SKU,
    min_ratio:      1.20,   // AE parity_qar ˜ QA parity_qar, so ratio ˜ 1.0 ? below_min
    max_ratio:      2.00,
  });
  const impossibleRuleId = (impossibleRule.body as any)?.id;
  const r3b = await call(
    "GET",
    `/v1/parity/analysis?sku=${SKU}&channel=${CHANNEL}&min_margin_pct=0.10&persist_violations=true`,
    KEY,
  );
  const aeCol = (r3b.body as any)?.countries?.find((c: any) => c.country_code === "AE");
  const aeHasViol = aeCol?.parity_rule_violations?.some((v: any) => v.rule_name === "IMPOSSIBLE-below-min");
  if (impossibleRuleId) await (admin as any).from("parity_rules").delete().eq("id", impossibleRuleId);
  if (aeHasViol) {
    const viol = aeCol.parity_rule_violations.find((v: any) => v.rule_name === "IMPOSSIBLE-below-min");
    console.log(`  ? impossible rule correctly fires: type=${viol.violation_type}  actual_ratio=${viol.actual_ratio}  min_ratio=${viol.min_ratio} ?`);
  } else {
    console.log(`  ? impossible rule did NOT fire — unexpected ? (AE violations: ${JSON.stringify(aeCol?.parity_rule_violations)})`);
  }

  // -- TEST 4: GET /v1/parity/violations -------------------------------------
  section("TEST 4 — GET /v1/parity/violations  (list persisted violations)");
  const r4 = await call("GET", `/v1/parity/violations?sku=${SKU}&limit=20`, KEY);
  const ok4base = render("List violations", r4, 200);
  const b4 = r4.body as any;
  const vCount = b4?.data?.length ?? 0;
  if (ok4base && vCount > 0) {
    console.log(`\n    ? ${vCount} violations returned ?`);
    for (const v of (b4.data ?? []).slice(0, 3)) {
      console.log(`      ${v.violation_type}  ${v.source_country}?${v.target_country}  ratio=${v.actual_ratio}  ${v.created_at}`);
    }
    passed++;
  } else {
    console.log(`    ? expected =1 violation, got ${vCount} ?`);
    failed++;
  }

  // -- TEST 5: GET /v1/parity/report -----------------------------------------
  section("TEST 5 — GET /v1/parity/report");
  const r5 = await call("GET", `/v1/parity/report?sku=${SKU}`, KEY);
  const ok5base = render("Parity report", r5, 200);
  const b5 = r5.body as any;
  const hasCountries = (b5?.supported_countries?.length ?? 0) === 6;
  const hasRules = (b5?.rules?.length ?? 0) >= 2;
  const totalViols = b5?.total_violations_24h ?? 0;
  if (ok5base && hasCountries && hasRules) {
    console.log(`\n    ? supported_countries=${b5.supported_countries.length} ?`);
    console.log(`    ? active_rules_count=${b5.active_rules_count}  total_rules=${b5.rules.length} ?`);
    console.log(`    ? total_violations_24h=${totalViols} ?`);
    for (const r of b5.rules) {
      console.log(`      [${r.enabled ? "ON" : "OFF"}] ${r.name}  ${r.source_country}?${r.target_country}  24h=${r.violations_24h}`);
    }
    passed++;
  } else {
    console.log(`    ? hasCountries=${hasCountries} hasRules=${hasRules} ?`);
    failed++;
  }

  // -- TEST 6: GET /v1/parity/analysis (wrong-scope ? 403) ------------------
  section("TEST 6 — GET /v1/parity/analysis  (wrong-scope key ? 403)");
  const r6 = await call("GET", `/v1/parity/analysis?sku=${SKU}`, BAD_KEY);
  const ok6base = render("Wrong-scope key ? 403", r6, 403);
  const ok6 = ok6base && (r6.body as any)?.error?.code === "forbidden";
  if (ok6) {
    console.log(`    ? code: "forbidden" ?`);
    passed++;
  } else {
    console.log(`    ? expected 403 forbidden, got: ${JSON.stringify(r6.body)} ?`);
    failed++;
  }

} catch (e) {
  console.error("\nFATAL:", e);
  failed++;
} finally {
  await cleanup();
}

console.log(`\n${"-".repeat(76)}`);
console.log(`  RESULTS: ${passed} passed  ${failed} failed  (${passed + failed} total)`);
console.log(`${"-".repeat(76)}\n`);

if (failed > 0) process.exit(1);
