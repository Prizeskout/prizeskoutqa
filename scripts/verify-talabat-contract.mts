import assert from "node:assert/strict";
import {
  buildTalabatOrderUpdate,
  constantTimeTokenMatch,
  parseTalabatCallback,
  talabatStaticToken,
  verifyTalabatMiddlewareJwt,
  validateTalabatOrderUpdate,
} from "../src/server/core/talabat-contract.ts";
import { exchangeTalabatToken, getTalabatOrders, TALABAT_SANDBOX_BASE, updateTalabatOrder } from "../src/server/core/talabat-client.ts";
import { compileTalabatCatalog } from "../src/server/core/talabat-catalog.ts";

const officialOrderFixture = JSON.stringify({
  order_id: "9d4a63b5-3e07-4440-96af-aa04797da3a0",
  order_code: "wxfr-2440-rtbs",
  order_type: "DELIVERY",
  client: { chain_id: "79d3a074-0f4c-44ac-892c-787fdfb04ba1", country_code: "qa", store_id: "nbet" },
  items: [{ _id: "item-1", sku: "HSMVTE", status: "IN_CART", pricing: { quantity: 1, unit_price: 39.75 } }],
  payment: { order_total: 41.75, sub_total: 39.75, delivery_fee: 1, total_taxes: 1, type: "PAID" },
  status: "RECEIVED",
  sys: { created_at: "2024-09-30T10:00:36.947Z", updated_at: "2024-09-30T10:05:36.947Z" },
  transport_type: "LOGISTICS_DELIVERY",
  promotion_status: "AVAILABLE",
});

const order = await parseTalabatCallback(officialOrderFixture, "order");
assert.equal(order.kind, "order");
assert.equal(order.vendorId, "nbet");
assert.equal(order.orderId, "9d4a63b5-3e07-4440-96af-aa04797da3a0");
assert.equal(order.occurredAt, "2024-09-30T10:05:36.947Z");
assert.equal(order.eventKey, (await parseTalabatCallback(officialOrderFixture, "order")).eventKey, "retry key must be deterministic");

const catalog = await parseTalabatCallback(JSON.stringify({
  job_id: "a946a2c7-f4e7-46ac-ae63-8a5497cb0ad9",
  status: "COMPLETED",
  platform_vendor_id: "naez",
  download_url: "https://example.com/feedback.csv",
}), "catalog");
assert.equal(catalog.kind, "catalog");
assert.equal(catalog.vendorId, "naez");
assert.equal(catalog.eventKey, "a946a2c7-f4e7-46ac-ae63-8a5497cb0ad9:COMPLETED");

assert.equal(talabatStaticToken("secret-token"), "secret-token");
assert.equal(talabatStaticToken("Bearer secret-token"), "secret-token");
assert.equal(constantTimeTokenMatch("secret-token", "secret-token"), true);
assert.equal(constantTimeTokenMatch("wrong-token", "secret-token"), false);

const base64url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
};
const jwtHeader = base64url(JSON.stringify({ alg: "HS512", typ: "JWT" }));
const jwtPayload = base64url(JSON.stringify({ service: "middleware", exp: Math.floor(Date.now() / 1000) + 300 }));
const jwtInput = `${jwtHeader}.${jwtPayload}`;
const jwtKey = await crypto.subtle.importKey("raw", new TextEncoder().encode("middleware-secret"), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
const jwtSignature = new Uint8Array(await crypto.subtle.sign("HMAC", jwtKey, new TextEncoder().encode(jwtInput)));
const middlewareJwt = `${jwtInput}.${base64url(jwtSignature)}`;
assert.equal((await verifyTalabatMiddlewareJwt(`Bearer ${middlewareJwt}`, "middleware-secret")).valid, true);
assert.equal((await verifyTalabatMiddlewareJwt(`Bearer ${middlewareJwt}`, "wrong-secret")).valid, false);

const originalFetch = globalThis.fetch;
let loginRequest: { url: string; body: string } | null = null;
globalThis.fetch = async (input, init) => {
  loginRequest = { url: String(input), body: String(init?.body ?? "") };
  return new Response(JSON.stringify({ access_token: "jwt", token_type: "bearer", expires_in: 1800 }), { status: 200, headers: { "Content-Type": "application/json" } });
};
const login = await exchangeTalabatToken("plugin-user", "plugin-password", "sandbox");
globalThis.fetch = originalFetch;
assert.equal(login.ok, true);
assert.equal(loginRequest?.url, `${TALABAT_SANDBOX_BASE}/v2/login`);
assert.match(loginRequest?.body ?? "", /username=plugin-user/);
assert.match(loginRequest?.body ?? "", /password=plugin-password/);

const reportRequests: string[] = [];
globalThis.fetch = async input => {
  const url = String(input); reportRequests.push(url);
  if (url.includes("/orders/ids"))
    return new Response(JSON.stringify({ orderIdentifiers: url.includes("accepted") ? ["order-1"] : ["order-2"], count: 1 }), { status: 200 });
  return new Response(JSON.stringify({ order: { token: url.endsWith("order-1") ? "order-1" : "order-2" } }), { status: 200 });
};
const orderReport = await getTalabatOrders({
  chainId: "prizeskout-qa", vendorId: "test-vendor", accessToken: "jwt",
  startTime: new Date(Date.now() - 12 * 3_600_000).toISOString(), endTime: new Date().toISOString(), environment: "sandbox",
});
globalThis.fetch = originalFetch;
assert.equal(orderReport.ok, true);
assert.equal(orderReport.data?.length, 2);
assert.equal(reportRequests.filter(url => url.includes("/orders/ids")).length, 2);
assert.ok(reportRequests.every(url => url.startsWith(`${TALABAT_SANDBOX_BASE}/v2/chains/`)));

const compiledCatalog = compileTalabatCatalog({
  posVendorId: "prizeskout-test-vendor",
  callbackUrl: "https://app.prizeskout.com/api/talabat/plugin/catalog-status",
  products: [{ remoteId: "SKU-1", name: "Chicken bowl", categoryId: "CAT-MAINS", categoryName: "Mains", price: 29.5 }],
});
assert.deepEqual(compiledCatalog.vendors, ["prizeskout-test-vendor"]);
assert.equal(compiledCatalog.catalog.items["SKU-1"].price, "29.50");
assert.equal(compiledCatalog.catalog.items["CAT-MAINS"].type, "Category");
assert.throws(() => compileTalabatCatalog({ posVendorId: "vendor", callbackUrl: "http://insecure.test/callback", products: [{ remoteId: "SKU", name: "Item", categoryId: "CAT", categoryName: "Category", price: 1 }] }), /HTTPS/);

const acceptanceTime = "2026-08-26T12:30:00+03:00";
const acceptedCallback = `${TALABAT_SANDBOX_BASE}/v2/order/status/order-token`;
assert.equal(validateTalabatOrderUpdate({ status: "order_accepted", callbackUrl: acceptedCallback, environment: "sandbox", acceptanceTime }), null);
assert.match(validateTalabatOrderUpdate({ status: "order_accepted", callbackUrl: acceptedCallback, environment: "sandbox" }) ?? "", /acceptance_time/i);
assert.match(validateTalabatOrderUpdate({ status: "order_rejected", callbackUrl: acceptedCallback, environment: "sandbox", rejectionReason: "NOT_REAL" }) ?? "", /rejection_reason/i);
assert.match(validateTalabatOrderUpdate({ status: "order_picked_up", callbackUrl: "https://attacker.example/callback", environment: "sandbox" }) ?? "", /environment/i);
assert.deepEqual(buildTalabatOrderUpdate({ status: "order_rejected", rejectionReason: "ITEM_UNAVAILABLE", message: "Out of stock" }), {
  status: "order_rejected", reason: "ITEM_UNAVAILABLE", message: "Out of stock",
});

let lifecycleRequest: { url: string; method?: string; body?: string } | null = null;
globalThis.fetch = async (input, init) => {
  lifecycleRequest = { url: String(input), method: init?.method, body: String(init?.body ?? "") };
  return new Response(JSON.stringify({ message: "Order status successfully changed." }), { status: 200 });
};
const accepted = await updateTalabatOrder({ status: "order_accepted", callbackUrl: acceptedCallback,
  acceptanceTime, remoteOrderId: "pos-order-1", accessToken: "jwt", environment: "sandbox" });
globalThis.fetch = originalFetch;
assert.equal(accepted.ok, true);
assert.equal(lifecycleRequest?.url, acceptedCallback);
assert.equal(lifecycleRequest?.method, "POST");
assert.deepEqual(JSON.parse(lifecycleRequest?.body ?? "{}"), {
  status: "order_accepted", acceptanceTime, remoteOrderId: "pos-order-1",
});

console.log("Talabat POS Middleware contract fixtures passed.");
