import assert from "node:assert/strict";
import { normalizeZidOrder, zidLocalizedText, zidNumber } from "../src/server/core/platform-webhooks";
import { zidTokenNeedsRefresh } from "../src/server/core/zid-token";
import { ZID_SUBSCRIBED_EVENTS } from "../src/server/core/zid-webhooks";
import { verifiedZidStoreFromProfile } from "../src/server/core/zid-account-link";
import { readFile } from "node:fs/promises";

assert.deepEqual([...ZID_SUBSCRIBED_EVENTS], [
  "product.create", "product.update", "product.publish", "product.delete",
  "order.create", "order.status.update", "order.payment_status.update",
]);

assert.equal(zidNumber({ amount: "29.50" }), 29.5);
assert.equal(zidNumber("invalid"), 0);
assert.equal(zidLocalizedText({ en: "Coffee", ar: "قهوة" }, "ar"), "قهوة");

const order = normalizeZidOrder({
  id: 123, code: "Z-123", status: "ready",
  payment_status: { code: "paid" }, currency: { code: "SAR" },
  total: { amount: "84.25" }, products: [{ sku: "COF-1" }],
  updated_at: "2026-08-17T12:00:00Z",
});
assert.equal(order.orderCode, "Z-123");
assert.equal(order.paymentStatus, "paid");
assert.equal(order.total, 84.25);
assert.equal(order.items.length, 1);

const now = Date.parse("2026-08-17T00:00:00Z");
assert.equal(zidTokenNeedsRefresh({ expires_at: "2027-08-17T00:00:00Z" }, now), false);
assert.equal(zidTokenNeedsRefresh({ expires_at: "2026-09-01T00:00:00Z" }, now), true);
assert.equal(zidTokenNeedsRefresh({}, now), true);

assert.deepEqual(verifiedZidStoreFromProfile({
  store: { id: 42, title: "Demo Zid Store", email: "OWNER@EXAMPLE.COM", locale: "ar" },
}), { id: "42", name: "Demo Zid Store", email: "owner@example.com", locale: "ar" });
assert.deepEqual(verifiedZidStoreFromProfile({
  data: { store: { uuid: "store-7", name: "Nested Store" }, manager: { email: "merchant@example.com" } },
}), { id: "store-7", name: "Nested Store", email: "merchant@example.com", locale: "en" });

const callbackSource = await readFile(new URL("../src/routes/api/auth/zid/callback.ts", import.meta.url), "utf8");
assert.match(callbackSource, /authorization session expired/);
assert.match(callbackSource, /const marketplaceInstall = merchantId === "marketplace"/);
assert.match(callbackSource, /const defaultDest = marketplaceInstall/);
assert.match(callbackSource, /provisionZidMerchantAccess/);
assert.match(callbackSource, /initial_catalog_sync_items_stored/);

const accountLinkSource = await readFile(new URL("../src/server/core/zid-account-link.ts", import.meta.url), "utf8");
assert.match(accountLinkSource, /welcome_email_provider_accepted_at/);
assert.match(accountLinkSource, /type: "magiclink"/);
assert.match(accountLinkSource, /prizeskout_merchant_id: accountId/);
assert.match(accountLinkSource, /dashboardUrl: link\.properties\.action_link/);
assert.doesNotMatch(accountLinkSource, /dashboardUrl:\s*access/);

const embeddedSource = await readFile(new URL("../src/routes/embedded/zid.tsx", import.meta.url), "utf8");
assert.match(embeddedSource, /CONNECTED TO ZID/);
assert.match(embeddedSource, /Your setup checklist/);
assert.match(embeddedSource, /No password or reusable access code is sent by email/);
assert.match(embeddedSource, /params\.get\("language"\)/);
assert.match(embeddedSource, /document\.documentElement\.dir = arabic \? "rtl" : "ltr"/);

const appMarketSource = await readFile(new URL("../src/server/core/platform-webhooks.ts", import.meta.url), "utf8");
assert.match(appMarketSource, /ZID_WEBHOOK_SECRET/);
assert.match(appMarketSource, /app\.market\.application\.uninstall/);

const dashboardSource = await readFile(new URL("../src/components/dashboard/PrizeSkoutDashboard.tsx", import.meta.url), "utf8");
const moneyFormatter = dashboardSource.match(/function fmtMoney[\s\S]*?\n}/)?.[0] ?? "";
assert.doesNotMatch(moneyFormatter, /QAR_RATES/);
assert.match(dashboardSource, /product\.source_platform === approvedContract\.platform/);

const promotionSource = await readFile(new URL("../src/components/dashboard/promotions/PromotionProfitabilityWorkspace.tsx", import.meta.url), "utf8");
assert.match(promotionSource, /products\.filter\(\(p\) => targetChannels\.includes\(p\.source_platform\)\)/);

const merchantExperienceSource = await readFile(new URL("../src/server/core/merchant-experience.ts", import.meta.url), "utf8");
assert.match(merchantExperienceSource, /recovery\.calculation\?\.currency/);
assert.match(merchantExperienceSource, /currency:recoveryCurrency/);

const merchantLanguageSource = await readFile(new URL("../src/lib/merchant-language.ts", import.meta.url), "utf8");
assert.match(merchantLanguageSource, /approval expired before it could run/);
assert.match(merchantLanguageSource, /waiting for merchant approval before it could run/);
assert.match(merchantLanguageSource, /no store data was changed/);

const operatingLoopSource = await readFile(new URL("../src/components/dashboard/MerchantOperatingLoop.tsx", import.meta.url), "utf8");
assert.match(operatingLoopSource, /Currency not recorded/);
assert.match(operatingLoopSource, /valueByCurrency/);

const recoveryWorkspaceSource = await readFile(new URL("../src/components/dashboard/payout/RecoveryWorkspace.tsx", import.meta.url), "utf8");
assert.match(recoveryWorkspaceSource, /calculation: \{ amount: finding\.amount \?\? null, currency, trace:/);

const orderGuardSource = await readFile(new URL("../src/components/dashboard/OrderGuardPanel.tsx", import.meta.url), "utf8");
assert.match(orderGuardSource, /Order Guard is not available in this workspace yet/);
assert.match(orderGuardSource, /!guard\?\.source && !unavailable/);

console.log("Zid production contract checks passed.");
