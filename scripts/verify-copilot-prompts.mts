import { deterministicZidInsight } from "../src/routes/api/copilot/compile";
import { productMatches } from "../src/server/core/zid-product-match";
import {compactConversation,normalizeCopilotPrompt,resolveProductReferences} from "../src/lib/copilot-understanding";
import {validateManagerWorkflow} from "../src/server/core/store-manager-capabilities";

type Parsed = { type?:string; message?:string; operation?: { operation?: string; product_mode?: string; publish_product?: boolean; query?: string; coupon_code?:string; coupon_name?:string; coupon_discount_pct?:number; coupon_start_date?:string; product_price?:number } };

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
  ["Use this direct image URL: `https://picsum.photos/seed/prizeskout-product/800/800.jpg`\nExample prompt: `Add product image https://picsum.photos/seed/prizeskout-product/800/800.jpg to PrizeSkout Wireless Charger Plus`", "product_image_upload"],
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

const pastedImage=deterministicZidInsight("Use this direct image URL: `https://picsum.photos/seed/prizeskout-product/800/800.jpg`\nExample prompt: `Add product image https://picsum.photos/seed/prizeskout-product/800/800.jpg to PrizeSkout Wireless Charger Plus`") as Parsed|null;
if(pastedImage?.operation?.query!=="PrizeSkout Wireless Charger Plus")throw new Error(`Pasted image guidance target failed: ${JSON.stringify(pastedImage)}`);
console.log("PASS: pasted image guidance preserves the exact product name");

const followUp = deterministicZidInsight("publish it", { created_product_sku: "IPAD-PRO-123" }) as Parsed | null;
const priceOfProduct=deterministicZidInsight("Change the price of Test Wireless Charger to SAR 135") as Parsed|null;
if(priceOfProduct?.operation?.operation!=="product_change"||priceOfProduct.operation.query!=="Test Wireless Charger")throw new Error(`Price-of-product target failed: ${JSON.stringify(priceOfProduct)}`);
console.log("PASS: price-of-product phrasing preserves the exact product name");
const duplicateByName=deterministicZidInsight("Duplicate PrizeSkout Wireless Charger, rename the copy to PrizeSkout Wireless Charger Plus, and publish it") as Parsed|null;
if(duplicateByName?.operation?.query!=="PrizeSkout Wireless Charger"||(duplicateByName.operation as Record<string,unknown>).new_product_name!=="PrizeSkout Wireless Charger Plus")throw new Error(`Duplicate punctuation cleanup failed: ${JSON.stringify(duplicateByName)}`);
console.log("PASS: duplicate phrasing preserves both exact names without separator punctuation");
const reviewCoupon=deterministicZidInsight("create a coupon for customers on 4/8/2026 with percentage 50% and the name is CouponTest50") as Parsed|null;
if(reviewCoupon?.operation?.coupon_name!=="CouponTest50"||reviewCoupon.operation.coupon_code!=="COUPONTEST50"||reviewCoupon.operation.coupon_discount_pct!==50||reviewCoupon.operation.coupon_start_date!=="2026-08-04")throw new Error(`Zid review coupon prompt failed: ${JSON.stringify(reviewCoupon)}`);
console.log("PASS: Zid review coupon preserves name, percentage, and exact Saudi date");
const arabicPrice=deterministicZidInsight("غيّر سعر المنتج قهوة عربية فاخرة إلى 85 ريال") as Parsed|null;
if(arabicPrice?.operation?.operation!=="product_change"||arabicPrice.operation.query!=="قهوة عربية فاخرة"||arabicPrice.operation.product_price!==85)throw new Error(`Arabic product instruction failed: ${JSON.stringify(arabicPrice)}`);
console.log("PASS: Arabic product price instruction preserves the Arabic product name");
const localizedProduct={name:{en:"Premium Arabic Coffee",ar:"قَهْوَة عَرَبِيَّة فاخرة"},sku:"AR-COFFEE-1"};
if(!productMatches(localizedProduct,"قهوة عربية فاخرة",true))throw new Error("Arabic localized-name matching failed");
console.log("PASS: Arabic names match across diacritics and localized Zid name fields");
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

if(normalizeCopilotPrompt("  publsh   prodcut ٢٨  ")!=="publish product 28")throw new Error("Prompt normalization failed");
console.log("PASS: prompt normalization repairs common typos and Arabic numerals");

const catalogue=[
  {name:"Small Coffee",sku:"COFFEE-S",platform:"zid"},
  {name:"Small Iced Coffee",sku:"ICED-COFFEE-S",platform:"zid"},
  {name:"iPad Pro 11-inch M4",sku:"IPAD-M4-11",platform:"zid"},
];
const exactResolution=resolveProductReferences(catalogue,"IPAD-M4-11","zid");
if(exactResolution.status!=="resolved"||exactResolution.matches[0]?.sku!=="IPAD-M4-11")throw new Error(`Exact SKU grounding failed: ${JSON.stringify(exactResolution)}`);
console.log("PASS: exact SKU grounding outranks fuzzy product names");
const ambiguousResolution=resolveProductReferences(catalogue,"coffee","zid");
if(ambiguousResolution.status!=="ambiguous"||ambiguousResolution.matches.length<2)throw new Error(`Ambiguity detection failed: ${JSON.stringify(ambiguousResolution)}`);
console.log("PASS: similar product names trigger ambiguity instead of an unsafe guess");
const compacted=compactConversation(Array.from({length:9},(_,index)=>({role:index%2?"assistant" as const:"user" as const,text:`turn ${index}`})));
if(compacted.length!==6||compacted[0]?.text!=="turn 3")throw new Error("Conversation compaction failed");
console.log("PASS: recent conversation context is bounded and preserves follow-ups");
const workflow=validateManagerWorkflow({steps:[{title:"Inspect catalogue",capability:"catalog.inspect"},{title:"Publish approved products",capability:"product.publish"},{title:"Ask partner to enroll the campaign",capability:"manual.coordinate"}]});
if(!workflow.ok||workflow.steps[0]?.approval_required!==false||workflow.steps[1]?.approval_required!==true||workflow.steps[2]?.execution!=="manual_fallback")throw new Error(`Manager workflow safety enrichment failed: ${JSON.stringify(workflow)}`);
console.log("PASS: manager workflows derive approvals, verification, risk, and manual fallback from the capability registry");
const invalidWorkflow=validateManagerWorkflow({steps:[{title:"Pretend tool",capability:"invented.magic"}]});
if(invalidWorkflow.ok)throw new Error("Unsupported manager capability was accepted");
console.log("PASS: unsupported capabilities cannot be presented as connected automation");
