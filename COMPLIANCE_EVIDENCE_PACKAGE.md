# PrizeSkout compliance evidence package

Status: technical controls implemented; independent QFC/PDPL legal and security review pending.

## Evidence for an external assessor

- Data-flow inventory: source webhook, normalized event, decision, queued dispatch, confirmation, payout reconciliation.
- Residency evidence required from Supabase/Cloudflare deployment configuration and subprocessors.
- Append-only controls: database privilege revocation plus insert-time account-scoped SHA-256 hash chain.
- Integrity verification: recompute `previous_hash + payload_hash + trace_id + sequence_no` for every account chain.
- Access evidence: service-role use is server-only; RLS enabled on production-wedge tables.
- Retention, deletion, breach response, DPIA, cross-border transfer basis, and Arabic notices require counsel approval.

## Review acceptance criteria

1. Counsel confirms the processing purpose, lawful basis, residency, transfer mechanism, retention, and data-subject workflows.
2. An independent security assessor attempts audit-log mutation, tenant crossover, credential extraction, replay, and queue poisoning.
3. Findings receive owners and due dates; no critical/high item remains open before a compliance claim is published.

PrizeSkout must not claim QFC or KSA PDPL certification solely from these technical controls.
