# PrizeSkout Engine Control Plane

## Purpose

The engine is the durable control plane for inbound commerce evidence and controlled business actions. Connector code remains responsible for authentication and platform-specific persistence; the engine owns orchestration, retries, approvals, verification, audit history, and operational recovery.

## Sources under control

- Snoonu signed pilot webhooks
- Salla, Zid, Keeta, and Talabat webhook receipts
- Foodics, Salla, Zid, SAP, and Microsoft pricing-ingest events
- Partner-independent restaurant order and settlement batch APIs
- Uploaded and authorized-source commerce evidence
- Settlement reconciliation outcomes
- Price-action and dispatch outcomes
- High-risk Store Manager approvals

The partner webhook path and PrizeSkout's public restaurant APIs are independent ingress options. Both converge only after their own authentication and persistence boundaries.

## Durable lifecycle

`queued -> leased -> processing -> verifying -> completed`

Work may instead enter `waiting_evidence`, `waiting_approval`, `retry_scheduled`, `dead_letter`, or `cancelled`. PostgreSQL rejects illegal transitions. Events, transitions, approval requests, and approval decisions are immutable.

Workers claim due work with `FOR UPDATE SKIP LOCKED`, a two-minute lease, an attempt counter, and bounded exponential backoff. Every lease is recorded in the transition ledger. The recovery sweep requeues expired leases or dead-letters exhausted work.

## Approval behavior

Financial and permanent Store Manager tasks produce engine approval work. Approval or rejection updates the immutable approval ledger, the engine work item, and the Store Manager task in one database transaction. Dashboard and public API decisions use the same RPC. Expired requests dead-letter the work; replay creates a new attempt-scoped request.

## Operator APIs

All routes require a scoped PrizeSkout API key.

- `GET /v1/engine/health`
- `GET /v1/engine/work-items`
- `GET /v1/engine/work-items/{id}`
- `POST /v1/engine/work-items/{id}/resume`
- `POST /v1/engine/work-items/{id}/replay`
- `GET /v1/engine/approvals`
- `POST /v1/engine/approvals/{id}/decision`

Resume requires both a reason and a reference to evidence already persisted in an authoritative source. Replay is restricted to dead-lettered work and requires a reason.

## Recovery and attention

Normal ingestion starts a Cloudflare background drain. Supabase cron invokes `/api/public/hooks/engine` every ten minutes as the recovery path, using credentials held in Supabase Vault and Cloudflare secrets. The hook accepts no anonymous traffic.

`waiting_evidence`, `waiting_approval`, and `dead_letter` states create or update a deterministic `ps_attention_items` record. Leaving those states resolves the attention item automatically. Dead letters can be inspected through the work-item detail endpoint and replayed after the cause is corrected.

## Operational checks

1. Confirm `prizeskout-engine-recovery` is active in `cron.job`.
2. Confirm Vault contains `engine_processor_url` and `engine_processor_secret` without printing their values.
3. Check `/v1/engine/health`; investigate `degraded` or `delayed` status.
4. Inspect a work item and its ordered transition history.
5. Correct missing evidence or the external failure, then use resume or replay with a written reason.
6. Confirm the item reaches `completed`, its attention item resolves, and `last_error` is cleared.

## Verification commands

```powershell
npm run typecheck
npm run verify-engine-state-machine
npm run verify-snoonu-pilot-contract
npm run verify-restaurant-commerce-contract
npm run verify-restaurant-settlement-contract
npm run build
```

Production readiness evidence is retained under the synthetic merchant ID `synthetic_engine_readiness`. Its channel is revoked and its payloads are explicitly marked synthetic, so it cannot affect a real merchant.
