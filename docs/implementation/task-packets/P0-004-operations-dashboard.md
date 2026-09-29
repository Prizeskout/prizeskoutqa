# P0-004 — Operational Readiness and Connection Center

## Desired outcome

Merchants and internal operators can see which sources are connected, authorized, current, late, failed, partial, or awaiting setup, and understand what each source permits PrizeSkout to prove.

## Required merchant-facing information

- Source and connection method
- Read-only permissions and branch scope
- Authorization state
- Last attempt and last successful delivery
- Observed-through date and received record counts
- Partial versus final records
- Completeness declaration/result
- Current warning and exact next action
- Clear statement that observed coverage is not automatically complete coverage

## Required operational information

- Waiting, processing, retrying, dead-letter, and completed evidence counts
- Layout drift and unsupported documents
- Missing or ambiguous agreement mappings
- Reconciliation coverage and blockers
- Expiring/revoked credentials without revealing secrets

## Acceptance criteria

- No fabricated connected state, coverage, or financial value.
- Ingestion failures, mapping gaps, insufficient evidence, and financial discrepancies are visually distinct.
- Cards lead to filtered details and remediation.
- Empty, loading, partial, late, error, and disconnected states are covered.
- Responsive and accessible behavior is verified.

## Exact next action

Start after P0-001/P0-002 establish reliable production signals; inventory existing evidence-source and inbox UI before designing new surfaces.
