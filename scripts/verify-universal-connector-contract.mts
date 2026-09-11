import assert from "node:assert/strict";
import { containsRawCredential } from "../src/server/core/universal-connectors";

assert.equal(containsRawCredential({ base_url: "https://merchant.example.com", company_id: "7" }), false);
assert.equal(containsRawCredential({ access_token: "must-not-be-here" }), true);
assert.equal(containsRawCredential({ nested: { client_secret: "must-not-be-here" } }), true);
assert.equal(containsRawCredential({ endpoints: [{ apiKey: "must-not-be-here" }] }), true);
console.log("Universal connector contract verification passed.");
