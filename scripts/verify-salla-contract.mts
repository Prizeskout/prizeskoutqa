import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildSallaPriceUpdate,
  sallaHasNextPage,
  sallaPriceAmount,
  sallaPriceCurrency,
  sallaProductCost,
  sallaProductQuantity,
  sallaScopeString,
  missingRequiredSallaScopes,
} from "../src/server/core/salla-contract";
import { isSallaAppEvent } from "../src/server/core/salla-easy-mode";
import { sallaRefreshRequestBody, sallaTokenNeedsRefresh } from "../src/server/core/salla-token";
import { verifyHmac } from "../src/server/core/platform-webhooks";
import { isSallaOperationalEvent, sallaEventKey } from "../src/server/core/salla-store-events";
import { SALLA_SUBSCRIBED_EVENTS } from "../src/server/core/salla-webhooks";

const scopes = sallaScopeString().split(" ");
assert.deepEqual(scopes, [
  "offline_access",
  "settings.read",
  "orders.read",
  "products.read_write",
  "categories.read",
  "webhooks.read_write",
]);
assert.equal(scopes.includes("products.write"), false);
assert.deepEqual(missingRequiredSallaScopes(scopes), []);
assert.deepEqual(missingRequiredSallaScopes(scopes.map(scope => scope === "categories.read" ? "categories.read_write" : scope)), []);
assert.deepEqual(missingRequiredSallaScopes(scopes.filter(scope => scope !== "orders.read")), ["orders.read"]);

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
assert.equal(
  sallaRefreshRequestBody("client", "سر", "refresh").toString(),
  "grant_type=refresh_token&refresh_token=refresh&client_id=client&client_secret=%D8%B3%D8%B1",
);

const embeddedSource = readFileSync("src/routes/embedded/salla.tsx", "utf8");
assert.match(embeddedSource, /sessionToken\.current\s*=\s*token/);
assert.match(embeddedSource, /sessionToken\.current\s*\?\?\s*embedded\.auth\.getToken\(\)/);

const catalogSource = readFileSync("src/routes/api/repricing/catalog.ts", "utf8");
assert.match(catalogSource, /net_margin_pct:\s*currentAnalysis\?\.netMarginPct\s*\?\?\s*null/);
assert.match(catalogSource, /contribution_amount:\s*currentAnalysis\?\.netMargin\s*\?\?\s*null/);
assert.match(catalogSource, /terms_ready:\s*!missingEconomics\s*&&\s*Boolean\(decision\)/);

const copilotEvidenceSource = readFileSync("src/server/core/copilot-financial-evidence.ts", "utf8");
assert.match(copilotEvidenceSource, /ps_product_cost_versions/);
assert.match(copilotEvidenceSource, /PGRST205/);

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
for (const event of ["order.created", "invoice.created", "shipment.updated", "product.price.updated", "product.quantity.low"]) {
  assert.equal(SALLA_SUBSCRIBED_EVENTS.includes(event as never), true, `${event} must be registered`);
}
const eventPayload = { event: "order.created", merchant: 123, created_at: "2026-08-12T00:00:00Z", data: { id: 99 } };
const firstKey = await sallaEventKey(eventPayload, JSON.stringify(eventPayload));
const secondKey = await sallaEventKey(eventPayload, JSON.stringify(eventPayload));
assert.equal(firstKey, secondKey);
assert.match(firstKey, /^order\.created:99:2026-08-12T00:00:00Z:[a-f0-9]{24}$/);

assert.deepEqual(buildSallaPriceUpdate(42.75), { price: 42.75 });
assert.throws(() => buildSallaPriceUpdate(0), /greater than zero/);

console.log("Salla contract verification passed.");
