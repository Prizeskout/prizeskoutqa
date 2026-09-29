# P0-002 — Activate Evidence Processing and Source-Pull Scheduling

## Desired outcome

Evidence processing and authorized source pulling run on production schedules with matching Worker/Vault configuration, isolated failures, observable outcomes, and safe no-op behavior when configuration is absent.

## Existing implementation

- `src/routes/api/public/hooks/evidence-process.ts`
- `src/routes/api/public/hooks/evidence-source-pull.ts`
- `src/server/core/evidence-source-pull.ts`
- `supabase/migrations/20260902000000_evidence_automation_scheduler.sql`

## Known status

- Scheduler migration: reported deployed and immutable.
- Code: exists locally.
- Prior live state: source-pull route once returned HTTP 404 because the Worker build had not been deployed.
- Secrets/Vault values: completion not proven.

## Acceptance criteria

- Routes are deployed and reject missing/incorrect authorization.
- Worker secrets and matching Vault values exist without values being exposed in documentation.
- Scheduled invocations produce durable success/failure records.
- One failing source does not block other sources.
- Empty successful polls are recorded honestly.
- Missing configuration remains a safe no-op, not a false success.

## Baseline verification

```powershell
npm run verify-continuity
npm run verify-api-independent-foundation
npm run verify-foodics-evidence-adapter
npm run typecheck
```

## Exact next action

After P0-001, inspect the current production route and scheduler/Vault state read-only, then reconcile configuration before any deployment.
