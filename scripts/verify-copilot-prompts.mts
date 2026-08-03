import { deterministicZidInsight } from "../src/routes/api/copilot/compile";

type Parsed = { type?:string; message?:string; operation?: { operation?: string; product_mode?: string; publish_product?: boolean; query?: string } };

const cases = [
  ['Create and publish a new product with this name: "iPad Pro 11-inch M4 256GB" and set the price at SAR 3000', "create_product_draft"],
  ["Add a new product called Coffee with cost SAR 6, price SAR 12 and 10 units in stock", "create_product_draft"],
  ["Change the iPad Pro price to SAR 2900", "product_change"],
  ["Mark Coffee out of stock", "product_change"],
  ["Publish iPad Pro", "product_change"],
  ["publsh the prodcut iPad Pro", "product_change"],
  ["Rename iPad Pro to iPad Pro M4", "product_change"],
  ["Make Coffee unlimited stock", "product_change"],
  ["Delete iPad Pro", "product_change"],
  ["Permanently delete iPad Pro", "product_change"],
  ['أنشئ منتج باسم "آيباد برو" بسعر ٣٠٠٠ ريال وانشره', "create_product_draft"],
  ["Create coupon SAVE10 for 10%", "coupon_change"],
  ["Disable coupon SAVE10", "coupon_change"],
  ["Move iPad Pro to the Electronics category", "category_assign"],
  ["Find customer with +966500000000", "customer_search"],
  ["Add 50 loyalty points to +966500000000", "loyalty_adjust"],
  ["Refund reverse order 64d0f002-0185-4fd1-94d2-e3a86be622c9 for SAR 100 via zid_bank_transfer", "reverse_refund"],
  ["Add product image https://example.com/ipad.jpg to iPad Pro", "product_image_upload"],
  ["Add color variants Black, Silver and Blue to iPad Pro, price SAR 3000, stock 10", "variant_create"],
  ["Schedule publish iPad Pro at 2026-08-03T09:00:00+03:00", "schedule_product_action"],
] as const;

for (const [prompt, expected] of cases) {
  const parsed = deterministicZidInsight(prompt) as Parsed | null;
  if (parsed?.operation?.operation !== expected) {
    throw new Error(`${prompt} compiled to ${JSON.stringify(parsed)}, expected ${expected}`);
  }
  console.log(`PASS: ${prompt}`);
}

const followUp = deterministicZidInsight("publish it", { created_product_sku: "IPAD-PRO-123" }) as Parsed | null;
const priceOfProduct=deterministicZidInsight("Change the price of Test Wireless Charger to SAR 135") as Parsed|null;
if(priceOfProduct?.operation?.operation!=="product_change"||priceOfProduct.operation.query!=="Test Wireless Charger")throw new Error(`Price-of-product target failed: ${JSON.stringify(priceOfProduct)}`);
console.log("PASS: price-of-product phrasing preserves the exact product name");
const duplicateByName=deterministicZidInsight("Duplicate PrizeSkout Wireless Charger, rename the copy to PrizeSkout Wireless Charger Plus, and publish it") as Parsed|null;
if(duplicateByName?.operation?.query!=="PrizeSkout Wireless Charger"||(duplicateByName.operation as Record<string,unknown>).new_product_name!=="PrizeSkout Wireless Charger Plus")throw new Error(`Duplicate punctuation cleanup failed: ${JSON.stringify(duplicateByName)}`);
console.log("PASS: duplicate phrasing preserves both exact names without separator punctuation");
if (followUp?.operation?.product_mode !== "publish" || followUp.operation.query !== "IPAD-PRO-123") {
  throw new Error(`Follow-up failed: ${JSON.stringify(followUp)}`);
}
console.log("PASS: publish it resolves the previously created product");

const cancelled=deterministicZidInsight("cancel that",{operation:"product_change"}) as Parsed|null;
if(cancelled?.type!=="chat"||!cancelled.message?.includes("Nothing"))throw new Error(`Cancellation failed: ${JSON.stringify(cancelled)}`);
console.log("PASS: cancel that stops a pending action");

const unsupported=deterministicZidInsight("Change the shipping weight for iPad Pro",{}) as Parsed|null;
if(unsupported?.type!=="chat"||!unsupported.message?.includes("not safely connected"))throw new Error(`Unsupported guard failed: ${JSON.stringify(unsupported)}`);
console.log("PASS: unsupported writes explain the limitation without pretending to execute");
