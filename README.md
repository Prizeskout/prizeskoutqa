# PrizeSkout

PrizeSkout is an evidence-first financial reconciliation workspace for platform merchants. It keeps order, contract, payout, and receipt-confirmation records distinct so that missing money is reported only at the strength supported by retained evidence.

## Start here

This repository is connected to production financial workflows. Before changing code, read and follow [`AGENTS.md`](AGENTS.md), then continue from the active task recorded in [`docs/implementation/state.yaml`](docs/implementation/state.yaml). Conversation history and old handoff notes are not authoritative.

## Local setup

```powershell
npm install
npm run typecheck
```

Copy `.env.example` to a local environment file and provide only the credentials needed for the task. Never commit secrets or reusable merchant credentials.

## Required safety checks

For changes that could affect the protected Zid or Salla integrations, run the relevant contract checks before and after the change:

```powershell
npm run verify-zid-contract
npm run verify-salla-contract
```

Before handing work off, update the active task packet and continuity records, record exact verification outcomes in `docs/implementation/09-session-log.md`, and run:

```powershell
npm run verify-continuity
```

Do not treat a successful build, commit, or deployment as proof of live financial correctness or customer readiness. Those states are tracked separately in the implementation documents.
