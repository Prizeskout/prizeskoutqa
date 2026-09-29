# P0-001 — Productionize Forwarding-Email Intake

## Desired outcome

An approved pilot merchant can forward a real supported platform email to its private PrizeSkout address. PrizeSkout authenticates transport delivery, retains the original RFC822 message and supported attachments privately, deduplicates retries, creates durable processing work, and exposes an honest review/result state.

## Existing implementation

- `src/server/core/evidence-mailbox.ts`
- `src/routes/api/evidence/mailbox.ts`
- `src/routes/api/evidence/inbound-email.ts`
- `src/routes/api/public/hooks/evidence-process.ts`
- `supabase/migrations/20260832000000_merchant_evidence_mailboxes.sql`
- Private evidence storage and review foundations

## Known status

- Code: reported complete for mailbox creation and signed inbound intake.
- Migration: reported deployed and immutable.
- Live route: previously reported present; unsigned requests returned HTTP 401.
- Configuration: `INBOUND_EVIDENCE_WEBHOOK_SECRET` and real inbound transport were not yet confirmed complete.
- Production smoke test: pending; do not create fake immutable production evidence.

## Protected systems

- Existing merchant evidence and private storage
- Zid and Salla integrations
- Immutable deployed migrations

## Implementation steps

1. Inspect current code and route contract.
2. Verify current Worker deployment and route response read-only.
3. Verify secret names without exposing values.
4. Select/configure the authorized inbound-email transport to sign the exact raw body using the implemented contract.
5. Use an approved test tenant and approved test message/document.
6. Confirm retention, deduplication, processing enqueue, processing outcome, and merchant-visible state.
7. Record any unsupported layout as review-required; do not force financial normalization.

## Acceptance criteria

- Correct signatures are accepted and incorrect/absent signatures are rejected.
- The original message and attachment are retained privately and fingerprinted.
- A transport retry does not create duplicate financial evidence.
- Processing failure is visible and retryable without data loss.
- No unrelated mailbox data is collected.
- No extracted financial result bypasses required review.
- Production evidence uses an approved tenant and is documented.

## Baseline verification

```powershell
npm run verify-continuity
npm run verify-api-independent-foundation
npm run verify-evidence-release-readiness
npm run typecheck
```

## Exact next action

Perform read-only inspection of the current inbound route, Worker secret names, transport configuration, and approved test-tenant availability. Do not configure or transmit data until the specific transport and approved test evidence are established.
