# Verification Runbook

## Always-safe baseline

```powershell
npm run verify-continuity
npm run typecheck
```

## Evidence and reconciliation baseline

```powershell
npm run verify-api-independent-foundation
npm run verify-settlement-reconciliation
npm run verify-settlement-reference-intake
npm run verify-payout-authority
npm run verify-evidence-release-readiness
```

## Protected integrations

```powershell
npm run verify-zid-contract
npm run verify-salla-contract
npm run verify-talabat-contract
npm run verify-keeta-contract
npm run verify-snoonu-pilot-contract
npm run verify-universal-connector-contract
```

## Automatic evidence source

```powershell
npm run verify-foodics-evidence-adapter
```

## Action and financial safety

```powershell
npm run verify-price-action-safety
npm run verify-margin-policy
npm run verify-restaurant-commerce-contract
npm run verify-restaurant-cost-contract
npm run verify-restaurant-settlement-contract
npm run verify-engine-state-machine
```

## Production verification rules

- Production inspection must be read-only unless the active task explicitly authorizes a mutation.
- Do not create immutable fake evidence in production.
- Use an approved test tenant and approved test document for retained-evidence smoke tests.
- Record HTTP status, table/route checked, date, environment, and whether the result proves code, configuration, deployment, or customer readiness.
- A passing local test does not establish Worker deployment, Vault configuration, provider transport configuration, or successful production scheduling.
