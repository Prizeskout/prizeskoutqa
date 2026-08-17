import assert from "node:assert/strict";
import { toMerchantError } from "../src/server/merchant-errors";
import { apiErrorMessage, humanizeAuthError, safeClientErrorMessage } from "../src/lib/api-error";

const oldError = console.error;
console.error = () => undefined;
try {
  const auth = toMerchantError(new Error("upstream HTTP 401 token invalid"), "sync your catalogue");
  assert.equal(auth.code, "connection_needs_attention");
  assert.match(auth.action, /Reconnect/);
  assert.doesNotMatch(auth.error, /401|token/i);

  const terms = toMerchantError(new Error("economics_not_approved"), "calculate a price");
  assert.equal(terms.code, "approved_channel_terms_required");

  const database = toMerchantError(new Error("duplicate key value violates unique constraint"), "save this agreement");
  assert.equal(database.code, "already_saved");
  assert.match(database.support_reference, /^PS-[A-F0-9]{8}$/);

  const unknown = toMerchantError(new Error("postgres relation unavailable"), "publish the price");
  assert.equal(unknown.code, "action_not_completed");
  assert.doesNotMatch(unknown.error, /postgres|relation/i);
} finally {
  console.error = oldError;
}

assert.equal(
  apiErrorMessage({ error: "The connection expired.", action: "Reconnect it.", support_reference: "PS-1234ABCD" }, "Fallback"),
  "The connection expired. Reconnect it. Support reference: PS-1234ABCD.",
);
assert.equal(humanizeAuthError({ message: "Invalid login credentials" }, "sign_in"), "The email address or password is incorrect.");
assert.doesNotMatch(humanizeAuthError({ message: "AuthApiError: internal" }, "sign_up"), /AuthApiError|internal/);
assert.doesNotMatch(safeClientErrorMessage(new Error("relation public.secret_table does not exist"), "Could not save."), /relation|secret_table/);

console.log("Merchant-facing error language verified.");
