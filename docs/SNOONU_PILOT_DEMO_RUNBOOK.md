# Snoonu Partner Pilot Demo Runbook

## What the demo proves

The implementation proves that PrizeSkout can receive a partner event securely, constrain it to an allowlisted merchant and branch, reject replay/tampering, normalize financial fields and preserve an auditable receipt. The payload is a proposed contract, not a claim about Snoonu's private API.

## Demo sequence

1. Show the proposed OpenAPI contract in `docs/snoonu-pilot-openapi.yaml`.
2. Show a pilot channel configured in `ps_merchant_channels` with `platform=snoonu`, an external merchant ID, branch allowlist and unique webhook secret.
3. Send a signed `order.created` fixture. The endpoint returns HTTP 202 with a receipt ID.
4. Send the identical event again. The endpoint returns HTTP 200 with `replay=true`; financial totals are not duplicated.
5. Change one amount without recalculating the signature. The endpoint returns HTTP 401.
6. Send a correctly signed event with a stale timestamp. The endpoint returns HTTP 401.
7. Show the raw and normalized payloads in `ps_snoonu_webhook_events`, with merchant, branch, schema version and event ID.
8. Explain that Snoonu's real field names/authentication can be mapped inside the adapter without changing PrizeSkout's reconciliation core.

## Local contract check

```powershell
npm run verify-snoonu-pilot-contract
npm run typecheck
```

## Pilot channel metadata

Use a unique random secret delivered through an approved secure channel. Never place it in a slide, source file or terminal recording.

```json
{
  "snoonu_merchant_id": "sn_merchant_42",
  "snoonu_branch_ids": ["sn_branch_doha_1"],
  "connection_mode": "snoonu_partner_push",
  "contract_version": "2026-09-09"
}
```

## Signature definition

```text
hex(HMAC-SHA256(webhook_secret, x-snoonu-timestamp + "." + exact_raw_body))
```

The sender retries non-2xx responses with the same event ID. PrizeSkout returns quickly after durable persistence and processes downstream work asynchronously.

## Before showing Snoonu

- Deploy the database migration to a non-production environment.
- Provision a synthetic pilot channel and branch, not a real merchant.
- Run the good signature, duplicate, tamper and stale timestamp cases.
- Confirm logs redact signatures, secrets and payload personal data.
- Keep all outbound Snoonu publishing disabled.
- Replace the proposed envelope only after Snoonu supplies its actual contract and samples.
