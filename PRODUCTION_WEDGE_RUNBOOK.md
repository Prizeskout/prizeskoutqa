# Salla/Foodics → Talabat production wedge

## Release gates

1. Apply `20260801000000_production_wedge_foundation.sql` in staging, then production.
2. Set `CRON_SECRET` in the Worker and `app.settings.cron_secret` in Postgres.
3. Connect Salla or Foodics and Talabat using partner-issued production credentials.
4. Upload/approve the Talabat contract. Approval publishes a new effective-dated economics version.
5. Ensure every automated SKU has a current cost from platform, ERP, merchant upload, or manual verification. Missing cost blocks pricing.
6. Configure the aggregator's supported catalogue-job status callback/readback adapter to call `/api/public/hooks/dispatch-confirmation` with the observed live price. API acceptance alone never marks a job confirmed.
7. Run a low-risk SKU through ingest → decide → queue → Talabat accepted → live confirmed → payout statement reconciliation.
8. Force a confirmation mismatch in staging and verify the original price is queued at priority 1 and the failed job enters dead letter.

## Performance verification

Run only against an authorized staging store:

```powershell
$env:LOAD_URL='https://staging.example/api/public/v1/sync/ingest'
$env:LOAD_TOKEN='staging-key'
$env:LOAD_MERCHANT_ID='staging-merchant-id'
$env:LOAD_REQUESTS='1000'
$env:LOAD_CONCURRENCY='25'
npm run load:wedge
```

Record P50/P95/P99, success rate, queue depth, confirmation latency, dead-letter count, and rollback success. Do not publish an SLA until repeated production-like runs meet it.

## Operational alerts

- Any dead-letter job
- Confirmation older than the partner's documented processing window
- Audit-chain verification failure
- P99 decision or enqueue latency above the agreed budget
- Missing/expired economics or cost version
- Payout variance outside the approved contract tolerance

## Compliance

Use `COMPLIANCE_EVIDENCE_PACKAGE.md` for the external assessor. Technical completion is not QFC/PDPL certification.
