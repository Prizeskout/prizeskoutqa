# PrizeSkout Universal Connector API v1

Base URL: `https://prizeskout.qa/api/public/v1`

This API registers and operates merchant-authorized POS, ERP, aggregator and settlement connectors. It does not contain provider-specific profitability logic. Source records ultimately enter the existing canonical commerce endpoints and Economic Twin.

Every request requires a tenant-scoped API key:

```http
Authorization: Bearer sk_live_...
```

## Discover available connectors

```http
GET /connectors/definitions
```

Definitions currently include Odoo, SAP S/4HANA, SAP Business One, Oracle MICROS Simphony, Oracle Fusion, Oracle NetSuite and a generic API adapter. A readiness value of `partner_approval_required` means the control plane exists but production retrieval cannot begin until the provider and merchant authorize it.

## Register a connection

```http
POST /connectors
Content-Type: application/json

{
  "merchant_id": "merchant_42",
  "provider": "odoo",
  "environment": "sandbox",
  "auth_method": "oauth2",
  "requested_capabilities": ["branches.read", "catalogue.read", "orders.read", "costs.read"],
  "external_merchant_id": "odoo-company-7",
  "credential_reference": "vault://connections/odoo-company-7",
  "configuration": { "base_url": "https://merchant.example.com" }
}
```

`credential_reference` identifies an approved secret-vault entry. Raw passwords, tokens, API keys, private keys and secrets are rejected when placed in `configuration`. Normal employee usernames and passwords must never be collected.

The connection remains `setup_required` until its provider-specific adapter completes authorization and verification. Registration never implies that a provider API is available.

## List tenant connections

```http
GET /connectors
```

The response contains operational status but never returns credentials.

## Map source identities

```http
PATCH /connectors/{connection_id}/mappings
Content-Type: application/json

{
  "identity_type": "branch",
  "external_id": "odoo-branch-west-bay",
  "canonical_id": "branch_ps_west_bay",
  "merchant_approved": true,
  "approved_by": "Finance administrator"
}
```

Supported identity types are legal entity, brand, branch, revenue centre, product, customer and order. Proposed mappings are distinct from merchant-confirmed mappings.

## Report a restartable sync checkpoint

```http
PATCH /connectors/{connection_id}/checkpoints
Content-Type: application/json

{
  "stream": "orders",
  "cursor": "2026-09-11T18:00:00Z:9382",
  "watermark_at": "2026-09-11T18:00:00Z",
  "status": "healthy",
  "records_received": 250
}
```

Checkpoints allow retries and backfills to resume without silently skipping or duplicating financial records.

## Send normalized source data

After the connection and mappings are ready, an adapter sends authorized evidence to the existing canonical endpoints:

```text
POST /commerce/order-batches
POST /commerce/cost-batches
POST /commerce/settlement-batches
```

The Order Matching Engine and Economic Twin remain shared across every provider. Connector code acquires, preserves and translates data; it never contains provider-specific profitability calculations.
