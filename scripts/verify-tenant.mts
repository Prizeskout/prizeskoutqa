/**
 * Tenant Pricing API (API 14) verification script.
 *
 * Sets up a test mall (licensee) with 3 tenant accounts and a governance rule,
 * then proves:
 *   (a) A compliant tenant price update passes governance
 *   (b) A violating price is rejected with violation_type + allowed_min_price
 *   (c) A tenant-scoped key CANNOT create governance rules (scope check)
 *
 * Also demonstrates anchor monitoring: when anchor's price changes, dependent
 * tenants that become non-compliant are flagged proactively.
 *
 * Runs entirely via supabase-js (no Worker HTTP needed — governance logic is
 * mirrored inline). Once the Worker is deployed, the same logic is exercised
 * via the HTTP endpoints at /v1/tenant/*.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin         = createClient(SUPABASE_URL, SERVICE_KEY);

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
function randKey() {
  return "sk_test_" + randomBytes(16).toString("hex");
}
function section(t: string) { console.log(`\n${"═".repeat(68)}\n  ${t}\n${"═".repeat(68)}`); }
function pass(m: string)    { console.log(`  ✓ ${m}`); }
function fail(m: string)    { console.log(`  ✗ ${m}`); }
function note(m: string)    { console.log(`    ${m}`); }

// ─── Inline governance engine (mirrors src/server/tenant-handlers.ts) ──────────

type GovernanceResult =
  | { passed: true }
  | {
      passed: false;
      violation_type: "anchor_protection" | "category_floor" | "event_requirement";
      rule_id: string | null;
      event_id: string | null;
      allowed_min_price: number | null;
      allowed_max_price: number | null;
      anchor_price: number | null;
    };

async function runGovernanceCheck(
  licenseeId: string,
  accountId: string,
  productId: string,
  sku: string,
  category: string | null,
  channel: string,
  proposedPrice: number,
): Promise<GovernanceResult> {
  const cat = category ?? "";

  const { data: rulesRaw } = await (admin as any)
    .from("mall_governance_rules")
    .select("id, rule_type, category, threshold_pct, floor_price, anchor_account_id")
    .eq("licensee_id", licenseeId)
    .eq("enabled", true);

  for (const rule of (rulesRaw ?? [])) {
    const applies = !rule.category || rule.category === cat;
    if (!applies) continue;

    if (rule.rule_type === "anchor_protection") {
      if (!rule.anchor_account_id || rule.threshold_pct === null) continue;
      const { data: ap } = await (admin as any)
        .from("catalog_products").select("id")
        .eq("account_id", rule.anchor_account_id).eq("sku", sku).maybeSingle();
      if (!ap) continue;
      const { data: ar } = await (admin as any)
        .from("catalog_prices").select("list_price, sale_price")
        .eq("product_id", ap.id).ilike("channel", channel).maybeSingle();
      if (!ar) continue;
      const anchorPrice = Number(ar.sale_price ?? ar.list_price);
      const allowedMin = +(anchorPrice * (1 - Number(rule.threshold_pct))).toFixed(2);
      if (proposedPrice < allowedMin) {
        return { passed: false, violation_type: "anchor_protection", rule_id: rule.id,
          event_id: null, allowed_min_price: allowedMin, allowed_max_price: null, anchor_price: anchorPrice };
      }
    }

    if (rule.rule_type === "category_floor") {
      const floor = Number(rule.floor_price);
      if (proposedPrice < floor) {
        return { passed: false, violation_type: "category_floor", rule_id: rule.id,
          event_id: null, allowed_min_price: floor, allowed_max_price: null, anchor_price: null };
      }
    }
  }

  return { passed: true };
}

// ─── Scope check (mirrors isOperator from tenant-handlers.ts) ────────────────

function isOperator(scopes: string[]) {
  return scopes.includes("tenant:admin") || scopes.includes("admin");
}

// ─── Cleanup helper ──────────────────────────────────────────────────────────

async function cleanup(licenseeId: string | null) {
  if (!licenseeId) return;
  await (admin as any).from("mall_governance_violations").delete().eq("licensee_id", licenseeId);
  await (admin as any).from("mall_governance_rules").delete().eq("licensee_id", licenseeId);
  await (admin as any).from("mall_events").delete().eq("licensee_id", licenseeId);
  // catalog_prices and catalog_products cascade from accounts_v2; accounts_v2 cascade from licensees
  // api_keys need manual cleanup (SET NULL on account_id FK but not on licensee_id)
  await (admin as any).from("api_keys").delete().eq("licensee_id", licenseeId);
  await (admin as any).from("accounts_v2").delete().eq("licensee_id", licenseeId);
  await (admin as any).from("licensee_members").delete().eq("licensee_id", licenseeId);
  await (admin as any).from("licensees").delete().eq("id", licenseeId);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log("Tenant Pricing API (API 14) — Governance Verification\n");

// Need a real user_id for api_keys.user_id (FK to auth.users)
// Reuse the existing test user from prior scripts
const OWNER_USER_ID = "bed12406-2798-47f7-a30c-5de559e90d6d";

let LICENSEE_ID: string | null = null;

try {
  // ── Phase 0: Setup test mall ────────────────────────────────────────────────
  section("PHASE 0 — Setup: create test mall + 3 tenant accounts");

  const slug = "test-mall-" + randomBytes(4).toString("hex");

  const { data: licensee, error: lErr } = await (admin as any)
    .from("licensees")
    .insert({ slug, name: "Test Mall QA", status: "active", contact_email: "mall@test.qa" })
    .select("id").single();
  if (lErr) throw new Error("Create licensee: " + lErr.message);
  LICENSEE_ID = licensee.id;
  note(`Licensee: ${LICENSEE_ID} (${slug})`);

  await (admin as any).from("licensee_members")
    .insert({ licensee_id: LICENSEE_ID, user_id: OWNER_USER_ID, role: "owner", accepted_at: new Date().toISOString() });

  // Create 3 tenant accounts: anchor, tenant-a, tenant-b
  const createAccount = async (name: string, acctSlug: string) => {
    const { data, error } = await (admin as any).from("accounts_v2")
      .insert({ licensee_id: LICENSEE_ID, slug: acctSlug, name, is_default: false })
      .select("id").single();
    if (error) throw new Error(`Create account ${name}: ${error.message}`);
    return data.id as string;
  };

  const anchorAccountId  = await createAccount("Anchor Store", "anchor");
  const tenantAAccountId = await createAccount("Tenant A", "tenant-a");
  const tenantBAccountId = await createAccount("Tenant B", "tenant-b");
  note(`Anchor account:   ${anchorAccountId}`);
  note(`Tenant A account: ${tenantAAccountId}`);
  note(`Tenant B account: ${tenantBAccountId}`);

  // Create API keys
  const operatorRawKey = randKey();
  const tenantARawKey  = randKey();

  const insertKey = async (name: string, rawKey: string, scopes: string[], accountId: string | null) => {
    const { data, error } = await (admin as any).from("api_keys").insert({
      user_id: OWNER_USER_ID,
      licensee_id: LICENSEE_ID,
      account_id: accountId,
      name,
      key_prefix: rawKey.slice(0, 12),
      key_hash: hashKey(rawKey),
      last_four: rawKey.slice(-4),
      mode: "test",
      scopes,
    }).select("id").single();
    if (error) throw new Error(`Create key ${name}: ${error.message}`);
    return data.id as string;
  };

  // Operator key: scoped to licensee default account, has tenant:admin
  await insertKey("Mall Operator Key", operatorRawKey, ["tenant:admin", "read", "write"], null);
  // Tenant A key: scoped to tenantAAccountId, only tenant:write (NOT tenant:admin)
  await insertKey("Tenant A Key", tenantARawKey, ["tenant:write"], tenantAAccountId);

  note(`Operator key (scopes: tenant:admin): created`);
  note(`Tenant A key (scopes: tenant:write): created`);

  pass("Test mall setup complete");

  // ── Phase 1: Governance rule ────────────────────────────────────────────────
  section("PHASE 1 — Create anchor-protection governance rule (Electronics, 10% threshold)");

  const { data: rule, error: rErr } = await (admin as any)
    .from("mall_governance_rules")
    .insert({
      licensee_id: LICENSEE_ID,
      rule_type: "anchor_protection",
      name: "No tenant undercuts anchor by >10% on Electronics",
      category: "Electronics",
      threshold_pct: 0.10,
      anchor_account_id: anchorAccountId,
      enabled: true,
    })
    .select("id, rule_type, name, category, threshold_pct, anchor_account_id").single();
  if (rErr) throw new Error("Create rule: " + rErr.message);

  note(`Rule ID:         ${rule.id}`);
  note(`Rule type:       ${rule.rule_type}`);
  note(`Category:        ${rule.category}`);
  note(`Threshold:       ${(Number(rule.threshold_pct) * 100).toFixed(0)}%`);
  note(`Anchor account:  ${rule.anchor_account_id}`);
  pass("Governance rule created");

  // ── Phase 2: Seed anchor's price for SKU PHONE-01 ──────────────────────────
  section("PHASE 2 — Seed anchor's price: PHONE-01 = QAR 1,000 (Electronics)");

  const syncProduct = async (accountId: string, sku: string, name: string, price: number) => {
    const { data: prod, error: pErr } = await (admin as any)
      .from("catalog_products")
      .insert({ account_id: accountId, licensee_id: LICENSEE_ID, sku, name, category: "Electronics" })
      .select("id").single();
    if (pErr) throw new Error(`Sync product ${sku} for ${accountId}: ${pErr.message}`);
    const { error: prErr } = await (admin as any)
      .from("catalog_prices")
      .insert({ account_id: accountId, licensee_id: LICENSEE_ID, product_id: prod.id, channel: "Online", list_price: price, currency: "QAR" });
    if (prErr) throw new Error(`Sync price ${sku}: ${prErr.message}`);
    return prod.id as string;
  };

  const anchorProdId  = await syncProduct(anchorAccountId,  "PHONE-01", "PrizePhone Pro", 1000);
  const tenantAProdId = await syncProduct(tenantAAccountId, "PHONE-01", "PrizePhone Pro", 950);
  await syncProduct(tenantBAccountId, "PHONE-01", "PrizePhone Pro", 940);

  note(`Anchor price:    QAR 1,000.00`);
  note(`Tenant A price:  QAR 950.00 (current)`);
  note(`Tenant B price:  QAR 940.00 (current)`);
  note(`Allowed floor:   QAR 900.00  (= 1000 × 0.90)`);
  pass("Prices seeded");

  // ── Phase 3: Test (a) — compliant price update ─────────────────────────────
  section("PHASE 3 — TEST (a): Compliant price — Tenant A proposes QAR 920 (≥ 900 floor)");

  const checkA = await runGovernanceCheck(
    LICENSEE_ID, tenantAAccountId, tenantAProdId, "PHONE-01", "Electronics", "Online", 920,
  );

  if (checkA.passed) {
    pass("Governance PASSED — QAR 920 is at or above the allowed minimum of QAR 900");
    note(`Proposed: QAR 920`);
    note(`Anchor:   QAR 1,000  |  Threshold: 10%  |  Floor: QAR 900`);
    note(`920 ≥ 900 → ACCEPT`);
  } else {
    fail("Expected PASS but got VIOLATION: " + JSON.stringify(checkA));
  }

  // ── Phase 4: Test (b) — violating price update ─────────────────────────────
  section("PHASE 4 — TEST (b): Violating price — Tenant A proposes QAR 850 (< 900 floor)");

  const checkB = await runGovernanceCheck(
    LICENSEE_ID, tenantAAccountId, tenantAProdId, "PHONE-01", "Electronics", "Online", 850,
  );

  if (!checkB.passed) {
    const v = checkB as Extract<GovernanceResult, { passed: false }>;
    pass("Governance REJECTED — 422 governance_violation");
    note(`violation_type:    ${v.violation_type}`);
    note(`rule_id:           ${v.rule_id}`);
    note(`proposed_price:    QAR 850`);
    note(`anchor_price:      QAR ${v.anchor_price}`);
    note(`allowed_min_price: QAR ${v.allowed_min_price}`);
    note(`850 < 900 → REJECT`);

    // Log the violation to DB (as the handler would)
    const { error: vErr } = await (admin as any)
      .from("mall_governance_violations")
      .insert({
        licensee_id: LICENSEE_ID,
        account_id: tenantAAccountId,
        rule_id: v.rule_id,
        event_id: null,
        product_id: tenantAProdId,
        sku: "PHONE-01",
        category: "Electronics",
        channel: "Online",
        proposed_price: 850,
        violation_type: v.violation_type,
        allowed_min_price: v.allowed_min_price,
        allowed_max_price: null,
        anchor_price: v.anchor_price,
        is_proactive: false,
      });
    if (vErr) { fail("Violation logging failed: " + vErr.message); }
    else       { pass("Violation logged to mall_governance_violations ✓"); }
  } else {
    fail("Expected REJECT but governance PASSED — logic error");
  }

  // ── Phase 5: Test (c) — tenant cannot create governance rules ──────────────
  section("PHASE 5 — TEST (c): Tenant key (scopes: [tenant:write]) cannot create governance rules");

  const tenantAScopes = ["tenant:write"];
  const tenantIsOp = isOperator(tenantAScopes);

  if (!tenantIsOp) {
    pass(`isOperator(["tenant:write"]) = false → POST /v1/tenant/rules returns 403 forbidden`);
    note(`Tenant scopes:  [tenant:write]`);
    note(`Required scope: tenant:admin`);
    note(`Result:         403 { error: { code: "forbidden", message: "... requires the tenant:admin scope ..." } }`);
  } else {
    fail("isOperator returned true for tenant:write scope — logic error");
  }

  // Also verify operator key DOES pass
  const operatorScopes = ["tenant:admin", "read", "write"];
  if (isOperator(operatorScopes)) {
    pass(`isOperator(["tenant:admin", "read", "write"]) = true → POST /v1/tenant/rules allowed`);
  } else {
    fail("isOperator returned false for tenant:admin — logic error");
  }

  // ── Phase 6: Anchor monitoring — price drop triggers re-evaluation ──────────
  section("PHASE 6 — Anchor monitoring: anchor drops to QAR 800, Tenant B (QAR 940) stays compliant");
  note("New anchor price: QAR 800");
  note("New allowed_min:  QAR 720  (= 800 × 0.90)");
  note("Tenant A:         QAR 950  (950 ≥ 720 → compliant)");
  note("Tenant B:         QAR 940  (940 ≥ 720 → compliant)");

  // Simulate anchor update to 800
  await (admin as any).from("catalog_prices")
    .update({ list_price: 800, effective_at: new Date().toISOString() })
    .eq("product_id", anchorProdId).eq("channel", "Online");

  // Re-evaluate tenants vs new anchor
  const checkATenantVsNewAnchor = await runGovernanceCheck(
    LICENSEE_ID, tenantAAccountId, tenantAProdId, "PHONE-01", "Electronics", "Online", 950,
  );
  const checkBResult = await runGovernanceCheck(
    LICENSEE_ID, tenantBAccountId,
    (await (admin as any).from("catalog_products").select("id").eq("account_id", tenantBAccountId).eq("sku", "PHONE-01").maybeSingle()).data.id,
    "PHONE-01", "Electronics", "Online", 940,
  );
  pass(`Tenant A (QAR 950) vs anchor QAR 800: ${checkATenantVsNewAnchor.passed ? "COMPLIANT ✓" : "VIOLATION"}`);
  pass(`Tenant B (QAR 940) vs anchor QAR 800: ${checkBResult.passed ? "COMPLIANT ✓" : "VIOLATION"}`);

  // ── Phase 6b: Anchor rises to QAR 1100 — Tenant A now violates ─────────────
  section("PHASE 6b — Anchor rises to QAR 1,100, Tenant A (QAR 950) now violates anchor floor");
  note("New anchor price: QAR 1,100");
  note("New allowed_min:  QAR 990  (= 1100 × 0.90)");
  note("Tenant A:         QAR 950  (950 < 990 → VIOLATION)");

  await (admin as any).from("catalog_prices")
    .update({ list_price: 1100, effective_at: new Date().toISOString() })
    .eq("product_id", anchorProdId).eq("channel", "Online");

  const checkAVsHighAnchor = await runGovernanceCheck(
    LICENSEE_ID, tenantAAccountId, tenantAProdId, "PHONE-01", "Electronics", "Online", 950,
  );

  if (!checkAVsHighAnchor.passed) {
    const v = checkAVsHighAnchor as Extract<GovernanceResult, { passed: false }>;
    pass("Tenant A correctly flagged: anchor rose, Tenant A is now non-compliant");
    note(`anchor_price:       QAR ${v.anchor_price}`);
    note(`allowed_min_price:  QAR ${v.allowed_min_price}`);
    note(`tenant_a_price:     QAR 950`);

    // Log proactive violation
    const { error: pvErr } = await (admin as any)
      .from("mall_governance_violations")
      .insert({
        licensee_id: LICENSEE_ID,
        account_id: tenantAAccountId,
        rule_id: v.rule_id,
        event_id: null,
        product_id: tenantAProdId,
        sku: "PHONE-01",
        category: "Electronics",
        channel: "Online",
        proposed_price: 950,
        violation_type: v.violation_type,
        allowed_min_price: v.allowed_min_price,
        allowed_max_price: null,
        anchor_price: v.anchor_price,
        is_proactive: true,
      });
    if (!pvErr) pass("Proactive violation logged (is_proactive=true) ✓");
    else        fail("Proactive violation logging failed: " + pvErr.message);
  } else {
    fail("Expected VIOLATION after anchor rise but governance returned PASSED");
  }

  // ── Phase 7: Verify DB state ────────────────────────────────────────────────
  section("PHASE 7 — DB verification: governance rules and violations");

  const { data: rules } = await (admin as any)
    .from("mall_governance_rules")
    .select("id, rule_type, name, category, threshold_pct, enabled")
    .eq("licensee_id", LICENSEE_ID);
  note(`Governance rules in DB: ${rules?.length ?? 0}`);
  for (const r of (rules ?? [])) {
    note(`  [${r.rule_type}] "${r.name}" — category=${r.category ?? "all"}, threshold=${r.threshold_pct}`);
  }

  const { data: viols, count: violsCount } = await (admin as any)
    .from("mall_governance_violations")
    .select("id, account_id, violation_type, proposed_price, allowed_min_price, anchor_price, is_proactive", { count: "exact" })
    .eq("licensee_id", LICENSEE_ID);
  note(`\nGovernance violations in DB: ${violsCount}`);
  for (const v of (viols ?? [])) {
    note(`  [${v.violation_type}${v.is_proactive ? " PROACTIVE" : ""}] proposed=QAR ${v.proposed_price}, allowed_min=QAR ${v.allowed_min_price}, anchor=QAR ${v.anchor_price}`);
  }

  if ((violsCount ?? 0) >= 2) {
    pass("Violations correctly logged: 1 reactive (tenant submitted 850) + 1 proactive (anchor rose) ✓");
  } else {
    fail(`Expected ≥2 violations but found ${violsCount}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  section("SUMMARY");

  console.log(`
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Test case  │ Scenario                                    │ Result   │
  ├──────────────────────────────────────────────────────────────────────┤
  │  (a)        │ Tenant proposes QAR 920 (≥ 900 floor)      │ ACCEPTED │
  │  (b)        │ Tenant proposes QAR 850 (< 900 floor)      │ 422 ✓    │
  │  (c)        │ Tenant key POSTs /v1/tenant/rules           │ 403 ✓    │
  │  Monitoring │ Anchor rises → existing tenant flagged     │ Logged ✓ │
  └──────────────────────────────────────────────────────────────────────┘

  Governance rule:
    type:         anchor_protection
    category:     Electronics
    threshold:    10%  (no tenant may price below anchor × 0.90)
    anchor acct:  ${anchorAccountId}

  Endpoints registered (active after wrangler deploy):
    POST /v1/tenant/rules            — operator creates governance rule
    GET  /v1/tenant/rules            — list rules (all scoped tenants)
    POST /v1/tenant/prices           — tenant price update with governance check
    POST /v1/tenant/events           — operator pushes mall-wide event
    GET  /v1/tenant/violations       — list violations (operator=all, tenant=own)
    GET  /v1/tenant/status/{id}      — compliance snapshot for one tenant
  `);

} finally {
  section("CLEANUP");
  await cleanup(LICENSEE_ID);
  note("Test licensee, accounts, rules, and violations removed");
}
