# Snoonu → PrizeSkout Partner API v1

Base URL: `https://prizeskout.qa/api/partners/snoonu/v1`

All control-plane calls require `Authorization: Bearer <partner-token>`. The token is exchanged with Snoonu through an approved secure channel and is never sent to merchants. Responses use `Cache-Control: no-store`.

## Activation flow

1. The merchant requests Snoonu activation in PrizeSkout.
2. Snoonu lists consented, pending requests with `GET /activation-requests`.
3. Snoonu provisions one request with `PUT /merchants/{prizeskout_merchant_id}` and its authoritative Snoonu merchant and branch IDs.
4. PrizeSkout returns the merchant-specific webhook secret once.
5. Snoonu signs and sends merchant events to `POST /api/webhooks/snoonu`.

## List pending requests

```http
GET /activation-requests
Authorization: Bearer <partner-token>
```

## Provision an approved merchant

```http
PUT /merchants/1202db01-a910-4ac0-95fb-24ab24925372
Authorization: Bearer <partner-token>
Content-Type: application/json

{
  "external_merchant_id": "SN-M-42",
  "branch_ids": ["SN-B-1", "SN-B-2"],
  "scopes": ["merchant:read", "branches:read", "orders:read", "settlements:read"]
}
```

Provisioning is rejected unless that PrizeSkout merchant requested activation. A Snoonu merchant identity cannot be connected to two active PrizeSkout tenants.

## Inspect connection status

```http
GET /merchants/{prizeskout_merchant_id}
Authorization: Bearer <partner-token>
```

Status responses never contain the webhook secret.

## Rotate a compromised or expired webhook secret

```http
POST /merchants/{prizeskout_merchant_id}/rotate-webhook-secret
Authorization: Bearer <partner-token>
```

The replacement secret is returned once and takes effect immediately.

## Suspend a merchant

```http
DELETE /merchants/{prizeskout_merchant_id}
Authorization: Bearer <partner-token>
Content-Type: application/json

{ "reason": "Merchant authorization withdrawn" }
```

Suspension immediately removes the webhook secret and stops event acceptance. Historical financial evidence is retained according to PrizeSkout's retention policy.

## Event authentication

Snoonu signs the exact raw JSON body using HMAC-SHA256 over `<timestamp>.<raw-body>` with the merchant-specific webhook secret. It sends the hexadecimal signature and timestamp as:

```http
X-Snoonu-Timestamp: 1789142400
X-Snoonu-Signature: sha256=<hex-signature>
```

PrizeSkout rejects invalid signatures, timestamps outside five minutes, unauthorized merchant/branch identities, malformed payloads and unsupported event types. Duplicate event IDs are acknowledged without duplicating financial records.
