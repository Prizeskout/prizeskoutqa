# PrizeSkout Agent Operating Contract

This repository contains production-connected financial software. Conversation history is not a source of truth.

## Required startup sequence

Before changing code, every agent must:

1. Read `docs/implementation/00-product-charter.md` completely.
2. Read `docs/implementation/state.yaml` completely.
3. Read `docs/implementation/01-current-state.md` completely.
4. Read the task packet named by `current_task` in `state.yaml`.
5. Inspect `git status --short`; preserve all user and prior-agent work.
6. Run the task packet's baseline checks when they are safe and do not require missing credentials.
7. Continue from the packet's `Exact next action`; do not restart the project from an old chat summary.

## Non-negotiable product rules

- Core reconciliation must work without aggregator, POS, or middleware APIs.
- Keep order truth, contract truth, payout truth, and receipt confirmation distinct.
- Never allocate a batch difference to an order without order-level evidence.
- Never present sample, inferred, stale, partial, or shadow data as verified live financial truth.
- Preserve original evidence, provenance, effective dates, evidence strength, and append-only audit history.
- Require merchant approval before disputes, external messages, refunds, promotions, price changes, or other protected external actions.
- Existing Zid and Salla production integrations are protected. Run their contract checks before and after related changes.
- Deployed migrations are immutable. Use later additive migrations.

## Required end-of-session sequence

After every meaningful slice, before ending:

1. Update the active task packet.
2. Update `state.yaml` without marking unverified work complete.
3. Update `01-current-state.md` if runtime, deployment, configuration, or customer-readiness state changed.
4. Update the deployment, decision, or risk register when applicable.
5. Record verification commands and their exact outcomes in `09-session-log.md`.
6. Record changed files and the exact next executable action.
7. Run `npm run verify-continuity`.

Do not commit or push unless the user explicitly requests it.
