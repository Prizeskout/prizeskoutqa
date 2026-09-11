export const SNOONU_CONNECTOR_VERSION = "0.1.0";

export type SnoonuCapabilityState =
  | "implemented_proposed_contract"
  | "document_supported"
  | "external_source"
  | "partner_documentation_required"
  | "unavailable";

export const SNOONU_CONNECTOR_CAPABILITIES = {
  merchantIdentity: "partner_documentation_required",
  branches: "partner_documentation_required",
  catalogue: "partner_documentation_required",
  productPrice: "partner_documentation_required",
  availability: "partner_documentation_required",
  inboundOrderEvents: "implemented_proposed_contract",
  inboundSettlementEvents: "implemented_proposed_contract",
  orderApi: "partner_documentation_required",
  orderUpdatesApi: "partner_documentation_required",
  cancellationsApi: "partner_documentation_required",
  refundsApi: "partner_documentation_required",
  settlementDocuments: "document_supported",
  settlementApi: "partner_documentation_required",
  promotionDocuments: "document_supported",
  promotionApi: "partner_documentation_required",
  contracts: "document_supported",
  payoutReceiptConfirmation: "external_source",
  fullBankStatementRequired: "unavailable",
  productCost: "external_source",
  priceWrites: "unavailable",
} as const satisfies Record<string, SnoonuCapabilityState>;

export const SNOONU_CONNECTOR_PRIVACY = {
  fullBankStatementRequired: false,
  payoutReceiptConfirmationOptional: true,
  acceptedReceiptEvidence: [
    "merchant_confirmation",
    "settlement_reference",
    "redacted_transaction_receipt",
    "narrowly_scoped_bank_confirmation",
  ],
} as const;

export const SNOONU_CONNECTOR_MANIFEST = {
  connector: "snoonu",
  version: SNOONU_CONNECTOR_VERSION,
  status: "partner_activation_required",
  contractStatus: "proposal_not_snoonu_contract",
  capabilities: SNOONU_CONNECTOR_CAPABILITIES,
  privacy: SNOONU_CONNECTOR_PRIVACY,
} as const;
