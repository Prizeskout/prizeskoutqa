import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {authorizePricePublication,pricesMatch,validPriceActionKey} from "../src/server/core/price-action-safety.ts";

assert.equal(authorizePricePublication({approvalMode:"recommend_only",merchantConfirmed:true}).allowed,false);
assert.equal(authorizePricePublication({approvalMode:"approval_every_change",merchantConfirmed:false}).reason,"merchant_approval_required");
assert.equal(authorizePricePublication({approvalMode:"approval_every_change",merchantConfirmed:true}).actorType,"merchant");
assert.equal(authorizePricePublication({approvalMode:"auto_within_limit",merchantConfirmed:false}).actorType,"automation");
assert.equal(pricesMatch(10,10.004),true);
assert.equal(pricesMatch(10,10.005),false);
assert.equal(validPriceActionKey("price:550e8400-e29b-41d4-a716-446655440000"),true);
assert.equal(validPriceActionKey("bad key"),false);
const migration=readFileSync(new URL("../supabase/migrations/20260825000000_price_action_safety.sql",import.meta.url),"utf8");
assert.match(migration,/unique\(account_id,idempotency_key\)/i);
assert.match(migration,/ps_price_actions_one_active_target/i);
assert.match(migration,/enable row level security/i);
assert.match(migration,/revoke all on public\.ps_price_actions from anon,authenticated/i);
console.log("Price approval, idempotency-key, and stale-price safety verified.");
