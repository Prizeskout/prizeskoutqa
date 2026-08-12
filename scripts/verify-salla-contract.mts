import assert from "node:assert/strict";
import {
  buildSallaPriceUpdate,
  sallaHasNextPage,
  sallaPriceAmount,
  sallaPriceCurrency,
  sallaProductCost,
  sallaProductQuantity,
  sallaScopeString,
} from "../src/server/core/salla-contract";
import { isSallaAppEvent } from "../src/server/core/salla-easy-mode";
import { sallaTokenNeedsRefresh } from "../src/server/core/salla-token";
import { verifyHmac } from "../src/server/core/platform-webhooks";
import { isSallaOperationalEvent, sallaEventKey } from "../src/server/core/salla-store-events";

const scopes = sallaScopeString().split(" ");
assert.deepEqual(scopes, [
  "offline_access",
  "orders.read",
  "products.read_write",
  "webhooks.read_write",
]);
assert.equal(scopes.includes("products.write"), false);

assert.equal(sallaHasNextPage({ pagination: { currentPage: 1, totalPages: 2 } }, 1), true);
assert.equal(sallaHasNextPage({ pagination: { currentPage: 2, totalPages: 2 } }, 2), false);
assert.equal(sallaHasNextPage({}, 1), false);

assert.equal(sallaPriceAmount({ amount: 125.5, currency: "SAR" }), 125.5);
assert.equal(sallaPriceAmount(99), 99);
assert.equal(sallaPriceCurrency({ amount: 10, currency: "SAR" }), "SAR");
assert.equal(sallaProductCost({ id: 1, cost_price: "35.25" }), 35.25);
assert.equal(sallaProductQuantity({ id: 1, quantity: "50" }), 50);

assert.equal(isSallaAppEvent("app.store.authorize"), true);
assert.equal(isSallaAppEvent("app.uninstalled"), true);
assert.equal(isSallaAppEvent("product.created"), false);

const now = Date.now();
assert.equal(sallaTokenNeedsRefresh({ expires_at: new Date(now + 60_000).toISOString() }, now), true);
assert.equal(sallaTokenNeedsRefresh({ expires_at: new Date(now + 600_000).toISOString() }, now), false);

const rawBody = JSON.stringify({ event: "app.store.authorize", merchant: 123 });
const secret = "salla-test-secret";
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
const signature = Array.from(new Uint8Array(signed)).map(byte => byte.toString(16).padStart(2, "0")).join("");
assert.equal(await verifyHmac(rawBody, secret, signature), true);
assert.equal(await verifyHmac(`${rawBody} `, secret, signature), false);

assert.equal(isSallaOperationalEvent("order.created"), true);
assert.equal(isSallaOperationalEvent("invoice.created"), true);
assert.equal(isSallaOperationalEvent("shipment.updated"), true);
assert.equal(isSallaOperationalEvent("category.updated"), true);
assert.equal(isSallaOperationalEvent("brand.deleted"), true);
assert.equal(isSallaOperationalEvent("communication.whatsapp.send"), false);
const eventPayload = { event: "order.created", merchant: 123, created_at: "2026-08-12T00:00:00Z", data: { id: 99 } };
const firstKey = await sallaEventKey(eventPayload, JSON.stringify(eventPayload));
const secondKey = await sallaEventKey(eventPayload, JSON.stringify(eventPayload));
assert.equal(firstKey, secondKey);
assert.match(firstKey, /^order\.created:99:2026-08-12T00:00:00Z:[a-f0-9]{24}$/);

assert.deepEqual(buildSallaPriceUpdate(42.75), { price: 42.75 });
assert.throws(() => buildSallaPriceUpdate(0), /greater than zero/);

console.log("Salla contract verification passed.");
