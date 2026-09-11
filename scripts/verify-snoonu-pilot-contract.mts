import assert from "node:assert/strict";
import { isFreshSnoonuTimestamp, normalizeSnoonuPilotEvent, parseSnoonuPilotEnvelope, signSnoonuPilotPayload, verifySnoonuPilotSignature } from "../src/server/core/snoonu-pilot-contract";
import { SNOONU_CONNECTOR_MANIFEST } from "../src/lib/snoonu-connector-capabilities";
import { snoonuConnector } from "../src/server/connectors/snoonu";
import { validateSnoonuActivationRequest } from "../src/server/connectors/snoonu/activation";
import { validatePrizeSkoutMerchantId, validateSnoonuProvisioningInput } from "../src/server/connectors/snoonu/partner-control";

const fixture = {
  schema_version: "2026-09-09", event_id: "evt_sn_001", event_type: "order.created",
  occurred_at: "2026-09-09T12:00:00.000Z", merchant: { id: "sn_merchant_42" }, branch: { id: "sn_branch_doha_1" },
  data: { order_id: "SN-1001", currency: "QAR", gross_amount: 100, commission_amount: 20,
    discount_amount: 5, refund_amount: 0, net_amount: 75, status: "delivered", line_items: [{ sku: "SKU-1", quantity: 2 }] },
};
const parsed = parseSnoonuPilotEnvelope(fixture);
assert.equal(normalizeSnoonuPilotEvent(parsed).net_amount, 75);
assert.throws(() => parseSnoonuPilotEnvelope({ ...fixture, event_type: "unknown" }), /Unsupported event_type/);
const raw = JSON.stringify(fixture), timestamp = "1788955200", secret = "pilot-secret-not-for-production";
const signature = await signSnoonuPilotPayload(raw, timestamp, secret);
assert.equal(await verifySnoonuPilotSignature(raw, timestamp, secret, `sha256=${signature}`), true);
assert.equal(await verifySnoonuPilotSignature(`${raw} `, timestamp, secret, signature), false);
assert.equal(isFreshSnoonuTimestamp(timestamp, 1_788_955_200_000), true);
assert.equal(isFreshSnoonuTimestamp(timestamp, 1_788_956_000_001), false);
assert.equal(snoonuConnector.manifest, SNOONU_CONNECTOR_MANIFEST);
assert.equal(snoonuConnector.capability("inboundOrderEvents"), "implemented_proposed_contract");
assert.equal(snoonuConnector.capability("orderApi"), "partner_documentation_required");
assert.equal(snoonuConnector.capability("settlementDocuments"), "document_supported");
assert.equal(snoonuConnector.capability("fullBankStatementRequired"), "unavailable");
assert.equal(snoonuConnector.manifest.privacy.fullBankStatementRequired, false);
assert.equal(snoonuConnector.manifest.privacy.payoutReceiptConfirmationOptional, true);
const incomplete = snoonuConnector.normalizeFixture({ ...fixture, data: { order_id: "SN-1002", currency: "QAR" } });
assert.equal(incomplete.commission_amount, null);
assert.equal(incomplete.net_amount, null);
const activation = validateSnoonuActivationRequest({ modes: ["partner_api_pull", "partner_webhook_push"] });
assert.deepEqual(activation.modes, ["partner_api_pull", "partner_webhook_push"]);
assert.deepEqual(activation.scopes, ["merchant:read", "branches:read", "orders:read", "settlements:read"]);
assert.throws(() => validateSnoonuActivationRequest({ modes: ["invented_mode"] }), /unsupported mode/);
const provisioning = validateSnoonuProvisioningInput({ external_merchant_id: "SN-M-42", branch_ids: ["SN-B-1", "SN-B-1", "SN-B-2"] });
assert.deepEqual(provisioning.branchIds, ["SN-B-1", "SN-B-2"]);
assert.equal(validatePrizeSkoutMerchantId("1202db01-a910-4ac0-95fb-24ab24925372"), "1202db01-a910-4ac0-95fb-24ab24925372");
assert.throws(() => validatePrizeSkoutMerchantId("merchant-name"), /must be a UUID/);
assert.throws(() => validateSnoonuProvisioningInput({ external_merchant_id: "SN-M-42", branch_ids: [] }), /between 1 and 500/);
console.log("Snoonu pilot contract fixtures passed.");
