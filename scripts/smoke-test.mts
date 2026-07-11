/**
 * Live HTTP smoke test — one 200 per API, one 403, one 422.
 * Runs against the deployed Worker.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE    = "https://prizeskout.qa/api/public";
const UID     = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";   // main user's licensee
const MAIN_ACC = "4a292c7b-fa88-468a-8e33-fdc795e2f030";   // main user's default account

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

// --- Cleanup tracking --------------------------------------------------------
const keyIds: string[]   = [];
let   mallLicId: string | null = null;

async function cleanup() {
  for (const id of keyIds) await (admin as any).from("api_keys").delete().eq("id", id);
  if (mallLicId) {
    await (admin as any).from("mall_governance_violations").delete().eq("licensee_id", mallLicId);
    await (admin as any).from("mall_governance_rules").delete().eq("licensee_id", mallLicId);
    await (admin as any).from("api_keys").delete().eq("licensee_id", mallLicId);
    await (admin as any).from("accounts_v2").delete().eq("licensee_id", mallLicId);
    await (admin as any).from("licensee_members").delete().eq("licensee_id", mallLicId);
    await (admin as any).from("licensees").delete().eq("id", mallLicId);
  }
}

async function insertKey(opts: {
  name: string; scopes: string[]; licenseeId: string;
  accountId?: string; userId?: string;
}): Promise<string> {
  const raw = randKey();
  const { data, error } = await (admin as any).from("api_keys").insert({
    user_id:    opts.userId ?? UID,
    licensee_id: opts.licenseeId,
    account_id:  opts.accountId ?? null,
    name:        opts.name,
    key_prefix:  raw.slice(0, 12),
    key_hash:    hashKey(raw),
    last_four:   raw.slice(-4),
    mode:        "test",
    scopes:      opts.scopes,
  }).select("id").single();
  if (error) throw new Error(`insertKey ${opts.name}: ${error.message}`);
  keyIds.push(data.id);
  return raw;
}

// --- HTTP helper -------------------------------------------------------------

type Hit = { method: string; path: string; status: number; body: unknown; ms: number };

async function call(
  method: string, path: string, key: string, body?: unknown,
): Promise<Hit> {
  const url = `${BASE}${path}`;
  const t0  = Date.now();
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type":  "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { method, path, status: res.status, body: json, ms: Date.now() - t0 };
}

function render(label: string, hit: Hit, expectStatus: number) {
  const ok = hit.status === expectStatus;
  const icon = ok ? "?" : "?";
  const statusColor = ok ? "" : " ? UNEXPECTED";
  console.log(`\n  ${icon} ${label}`);
  console.log(`    ${hit.method} ${hit.path}`);
  console.log(`    HTTP ${hit.status}${statusColor}  (${hit.ms} ms)`);
  const body = JSON.stringify(hit.body, null, 2)
    .split("\n").slice(0, 20).join("\n    ");
  console.log(`    ${body}`);
}

function section(t: string) {
  console.log(`\n${"-".repeat(68)}\n  ${t}\n${"-".repeat(68)}`);
}

// --- MAIN --------------------------------------------------------------------

console.log("Live HTTP smoke test — Worker:", BASE.replace("/api/public",""), "\n");

try {
  // -- Key setup ---------------------------------------------------------------

  // Full-scope key on the main user's real licensee (APIs 03 / 04 / 07 / 14 reads)
  const fullKey = await insertKey({
    name: "smoke-full",
    licenseeId: MAIN_LIC,
    scopes: ["read","write","audit:read","margin:read","margin:write","tenant:admin","tenant:write"],
  });

  // Read-only key — will be denied on margin:write endpoints ? 403
  const readKey = await insertKey({
    name: "smoke-readonly",
    licenseeId: MAIN_LIC,
    scopes: ["read"],
  });

  // -- Test-mall setup for API 14 -----------------------------------------------

  const mallSlug = "smoke-mall-" + randomBytes(3).toString("hex");
  const { data: mall } = await (admin as any).from("licensees")
    .insert({ slug: mallSlug, name: "Smoke Mall", status: "active", contact_email: "smoke@test.qa" })
    .select("id").single();
  mallLicId = mall.id;

  await (admin as any).from("licensee_members")
    .insert({ licensee_id: mallLicId, user_id: UID, role: "owner", accepted_at: new Date().toISOString() });

  const mkAcct = async (slug: string, name: string) => {
    const { data } = await (admin as any).from("accounts_v2")
      .insert({ licensee_id: mallLicId, slug, name, is_default: false }).select("id").single();
    return data.id as string;
  };
  const anchorId  = await mkAcct("anchor",   "Anchor Store");
  const tenantAId = await mkAcct("tenant-a", "Tenant A");

  // Operator key — scoped to mall licensee, tenant:admin
  const opKey = await insertKey({
    name: "smoke-operator", licenseeId: mallLicId!,
    scopes: ["tenant:admin","read","write"],
  });

  // Tenant-A key — scoped to tenant-a account, only tenant:write
  const tenantKey = await insertKey({
    name: "smoke-tenant-a", licenseeId: mallLicId!,
    accountId: tenantAId,
    scopes: ["tenant:write"],
  });

  // Governance rule: anchor_protection, Electronics, 10% threshold
  await (admin as any).from("mall_governance_rules").insert({
    licensee_id: mallLicId, rule_type: "anchor_protection",
    name: "No tenant undercuts anchor >10% on Electronics",
    category: "Electronics", threshold_pct: 0.10,
    anchor_account_id: anchorId, enabled: true,
  });

  // Sync SMOKE-PHONE-01 to both accounts
  const syncProd = async (acctId: string, price: number) => {
    const { data: p } = await (admin as any).from("catalog_products")
      .insert({ account_id: acctId, licensee_id: mallLicId, sku: "SMOKE-PHONE-01",
                name: "Smoke Phone", category: "Electronics" })
      .select("id").single();
    await (admin as any).from("catalog_prices")
      .insert({ account_id: acctId, licensee_id: mallLicId, product_id: p.id,
                channel: "Online", list_price: price, currency: "QAR" });
    return p.id as string;
  };
  await syncProd(anchorId,  1000);   // anchor price = QAR 1,000
  await syncProd(tenantAId,  950);   // tenant current = QAR 950

  // -- SMOKE TESTS -------------------------------------------------------------

  section("API 03 — Pricing Recommendations   GET /v1/pricing/recommendations");
  const r03 = await call("GET", "/v1/pricing/recommendations", fullKey);
  render("200 — list recommendations for main account", r03, 200);

  section("API 04 — Audit Decisions           GET /v1/audit/decisions");
  const r04 = await call("GET", "/v1/audit/decisions?limit=2", fullKey);
  render("200 — list audit decisions (17 on record)", r04, 200);

  section("API 07 — Margin Intelligence       GET /v1/margin/sku");
  const r07 = await call("GET", "/v1/margin/sku?sku=SONY-WH1000XM5&channel=Online", fullKey);
  render("200 — margin breakdown for SONY-WH1000XM5", r07, 200);

  section("API 14 — Tenant Rules              GET /v1/tenant/rules");
  const r14 = await call("GET", "/v1/tenant/rules", opKey);
  render("200 — list governance rules for smoke mall (operator key)", r14, 200);

  section("SCOPE ENFORCEMENT   POST /v1/margin/costs with read-only key");
  const r403 = await call("POST", "/v1/margin/costs", readKey, {
    sku: "SONY-WH1000XM5", unit_cost: 750,
  });
  render("403 — margin:write required; key has only [read]", r403, 403);

  section("GOVERNANCE VIOLATION   POST /v1/tenant/prices ? 422");
  // Tenant-A proposes QAR 850. Anchor = 1000, threshold = 10% ? floor = 900.
  // 850 < 900 ? governance_violation.
  const r422 = await call("POST", "/v1/tenant/prices", tenantKey, {
    sku: "SMOKE-PHONE-01", channel: "Online", price: 850,
  });
  render("422 — anchor_protection violated (850 < 900 floor)", r422, 422);

  // -- SUMMARY TABLE ------------------------------------------------------------

  console.log(`
\n  +-------------------------------------------------------------------------+
  ¦  API  ¦ Method  ¦ Path                         ¦ Expected ¦ Got          ¦
  +-------------------------------------------------------------------------¦
  ¦  03   ¦ GET     ¦ /v1/pricing/recommendations  ¦   200    ¦  ${r03.status}  ${r03.status===200?"?":"?"}        ¦
  ¦  04   ¦ GET     ¦ /v1/audit/decisions          ¦   200    ¦  ${r04.status}  ${r04.status===200?"?":"?"}        ¦
  ¦  07   ¦ GET     ¦ /v1/margin/sku               ¦   200    ¦  ${r07.status}  ${r07.status===200?"?":"?"}        ¦
  ¦  14   ¦ GET     ¦ /v1/tenant/rules             ¦   200    ¦  ${r14.status}  ${r14.status===200?"?":"?"}        ¦
  ¦  07   ¦ POST    ¦ /v1/margin/costs             ¦   403    ¦  ${r403.status}  ${r403.status===403?"?":"?"}        ¦
  ¦  14   ¦ POST    ¦ /v1/tenant/prices            ¦   422    ¦  ${r422.status}  ${r422.status===422?"?":"?"}        ¦
  +-------------------------------------------------------------------------+`);

} finally {
  await cleanup();
  console.log("\n  Cleanup: test keys + mall data removed.");
}
