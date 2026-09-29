# P0-003 — Complete Production-Grade Foodics Read-Only Adapter

## Desired outcome

An authorized Foodics merchant can supply branch-scoped completed-order evidence automatically without exposing customer, card, note, device, or unrelated payload data.

## Existing implementation

- `src/server/core/foodics-evidence-adapter.ts`
- `src/server/core/evidence-source-pull.ts`
- `scripts/verify-foodics-evidence-adapter.mts`

## Known safeguards

- Reference-based pagination bounded to 20 pages / 1,000 records.
- Bearer-token-only access.
- Branch filtering.
- Only closed orders marked final.
- External order reference retained.
- Customer/payment/note/item/device payloads discarded.

## Acceptance criteria

- Explicit merchant authorization and branch scope are recorded.
- Least-privilege data minimization is verified.
- Historical and incremental cursor behavior are tested.
- Partial/final/refunded/cancelled revisions remain auditable without double counting.
- Completeness is never inferred from a successful request alone.
- A pilot source can be paused and disconnected safely.

## Verification

```powershell
npm run verify-foodics-evidence-adapter
npm run verify-api-independent-foundation
npm run typecheck
```

## Exact next action

Begin only after the production evidence scheduler is verified; inspect Foodics authorization requirements and test against an approved merchant or sandbox.
