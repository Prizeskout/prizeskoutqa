import assert from "node:assert/strict";
import { bridgeCanTrack, zidCustomerPricePatch } from "../src/lib/channel-bridge";

assert.equal(bridgeCanTrack(null,"SKU-1"),false);
assert.equal(bridgeCanTrack({mazeed_active:true,jahez_active:false,eligible_skus:["SKU-1"]},"SKU-1"),false);
assert.equal(bridgeCanTrack({mazeed_active:true,jahez_active:true,eligible_skus:["SKU-1"]}," sku-1 "),true);
assert.equal(bridgeCanTrack({mazeed_active:true,jahez_active:true,eligible_skus:["SKU-1"]},"SKU-2"),false);
assert.deepEqual(zidCustomerPricePatch({price:100,sale_price:null},110),{price:110});
assert.deepEqual(zidCustomerPricePatch({price:100,sale_price:90},95),{sale_price:95});
console.log("Zid–Jahez bridge verification passed.");
