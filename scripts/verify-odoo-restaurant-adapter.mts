import assert from "node:assert/strict";
import {
  fetchOdooProductCosts,
  fetchOdooRestaurantOrders,
  mapOdooPosOrder,
  mapOdooProductCost,
} from "../src/server/core/odoo-restaurant-adapter";

const mapping = {
  currency: "QAR",
  companyExternalIds: { "1": "ma-group" },
  brandByCompany: { "1": "vamos" },
  branchByConfig: { "8": "vamos-dfc" },
  revenueCenterByConfig: { "8": "pos-8" },
  channelByOrderType: { talabat: "talabat" },
  defaultChannel: "direct",
};
const order = {
  id: 42,
  name: "Order 0042",
  pos_reference: "POS/0042",
  date_order: "2026-09-05 09:15:00",
  write_date: "2026-09-05 09:16:00",
  state: "paid",
  amount_total: 95,
  amount_tax: 0,
  company_id: [1, "MA Group"],
  config_id: [8, "Vamos DFC"],
  x_delivery_channel: "talabat",
};
const lines = [
  {
    id: 101,
    order_id: [42, "Order 0042"],
    product_id: [7, "Burger"],
    product_default_code: "BURGER-1",
    full_product_name: "Classic Burger",
    qty: 2,
    price_unit: 50,
    discount: 10,
  },
];
const mapped = mapOdooPosOrder(order, lines, mapping);
assert.equal(mapped.legal_entity_external_id, "ma-group");
assert.equal(mapped.brand_external_id, "vamos");
assert.equal(mapped.branch_external_id, "vamos-dfc");
assert.equal(mapped.channel, "talabat");
assert.equal(mapped.gross_amount, 105);
assert.equal(mapped.discount_amount, 10);
assert.equal(mapped.net_amount, 95);

const responses = [[order], lines];
const requests: Array<{ url: string; init: RequestInit }> = [];
const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
  requests.push({ url: String(url), init: init ?? {} });
  return new Response(JSON.stringify(responses.shift()), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}) as typeof fetch;
const page = await fetchOdooRestaurantOrders({
  baseUrl: "https://ma-group.example",
  database: "ma",
  apiKey: "secret",
  mapping,
  fetchImpl,
  limit: 250,
});
assert.equal(page.batch?.orders.length, 1);
assert.equal(page.batch?.delivery_complete, true);
assert.equal(page.cursorAfter, 42);
assert.equal(requests.length, 2);
assert.match(requests[0].url, /\/json\/2\/pos.order\/search_read$/);
assert.equal((requests[0].init.headers as Record<string, string>)["X-Odoo-Database"], "ma");
assert.doesNotMatch(JSON.stringify(page), /customer|employee|card/i);
assert.throws(
  () => mapOdooPosOrder({ ...order, state: "cancel" }, lines, mapping),
  /cancellation event/,
);

const product = {
  id: 7,
  default_code: "BURGER-1",
  standard_price: 12.5,
  company_id: [1, "MA Group"],
  uom_id: [1, "Units"],
  write_date: "2026-09-04 18:30:00",
  active: true,
};
const productCost = mapOdooProductCost(product, mapping);
assert.equal(productCost.sku, "BURGER-1");
assert.equal(productCost.brand_external_id, "vamos");
assert.equal(productCost.unit_cost, 12.5);
assert.deepEqual(productCost.cost_components, { standard_price: 12.5 });
const costRequests: Array<{ url: string; init: RequestInit }> = [];
const costFetch = (async (url: string | URL | Request, init?: RequestInit) => {
  costRequests.push({ url: String(url), init: init ?? {} });
  return new Response(JSON.stringify([product]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}) as typeof fetch;
const costPage = await fetchOdooProductCosts({
  baseUrl: "https://ma-group.example",
  database: "ma",
  apiKey: "secret",
  mapping,
  companyId: 1,
  fetchImpl: costFetch,
});
assert.equal(costPage.batch?.costs[0].sku, "BURGER-1");
assert.equal(costPage.batch?.costs[0].unit_cost, 12.5);
assert.match(costRequests[0].url, /\/json\/2\/product.product\/search_read$/);
const costRequestBody = JSON.parse(String(costRequests[0].init.body));
assert.deepEqual(costRequestBody.context.allowed_company_ids, [1]);
assert.throws(
  () => mapOdooProductCost({ ...product, default_code: "" }, mapping),
  /missing its ID, SKU/,
);

console.log("Odoo restaurant adapter verification passed.");
