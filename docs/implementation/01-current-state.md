# Current State

Last reconciled with the repository: 2026-09-29.

## Repository condition

- The working tree contains substantial untracked user artifacts in `.codex-build/`, `deliverables/`, `output/`, `tmp/`, and `tools/`. They are out of scope and must be preserved.
- No root `AGENTS.md` or structured continuity directory existed before this pack.
- `docs/NEXT_CODEX_HANDOFF.md` remains valuable legacy context but contains stale summaries and internal status contradictions. Use this pack first.

## Implemented foundations visible in the repository

- Merchant evidence intake, private original-file retention, mailboxes, document processing, OCR drafts, merchant review, layout registry, agreement matching, normalized commerce events, and shadow reconciliation.
- Evidence-backed findings, recovery cases, recovery evidence packs, and recovery lifecycle services.
- Provider-neutral evidence-source registry, authorization, freshness, coverage, completeness, and read-only source synchronization.
- A bounded Foodics read-only evidence adapter.
- Protected Zid and Salla integrations; Talabat and Keeta integration foundations; Snoonu pilot and universal connector contracts.
- Engine control-plane, action bridges, approval, recovery, and connector-receipt migrations exist in the repository.
- Verification scripts cover core financial, evidence, integration, and action-safety contracts.

## Deployment knowledge

- Zid marketplace hardening Worker version `6b718054-cd9b-4474-91ee-6e12766053f3` is deployed. Marketplace OAuth is state-bound and returns to the Zid embedded app; verified-store passwordless provisioning, localized embedded readiness/sync/checklist, native-currency catalogue display, and channel-scoped promotion selection are implemented. A logged-in PrizeSkout pass synchronized 12 Zid items, retained the 32-item combined catalogue, showed missing evidence as `Not calculated`, displayed SAR 999 consistently, and limited a Zid scenario to 12 products. Authenticated Zid store `3181397` completed a 9-product embedded retry, full-workspace handoff, reopen persistence, Arabic RTL, and 375/768/1440 overflow checks. A later standalone merchant pass fixed cross-page recovery currency mislabeling, mixed/unproven-currency aggregation, raw workflow diagnostics, and the unavailable Order Guard state. Fresh-install welcome delivery and one-time activation remain pending because this existing installation predates the new provisioning path.
- With explicit user confirmation, PrizeSkout was deactivated on Zid demo store `3181397` for a fresh lifecycle test. Zid's merchant-side reinstall flow requires the published Core plan and reaches a real SAR 412.85/month checkout with no trial. A second Partner development store, `3251312` (`PrizeSkout Lifecycle QA 2`), was created and PrizeSkout's `Application Testing` one-click install reported success without checkout. However, the fresh merchant dashboard lists PrizeSkout under `Deactivated apps`, and both `Activate`/the app page lead to the paid `Subscribe` experience. For this already-published paid app, Partner test installation does not grant active access or bypass billing. No payment was submitted.

- Salla recovery Worker version `bab47b84-5fbd-4b8d-8caf-ffc2ce5528cb` is deployed on `prizeskout.qa/*` and the preserved `app.prizeskout.qa` custom domain. Both public routes and `/embedded/salla` returned 200 after deployment. A logged-in PrizeSkout smoke pass synchronized the connected Salla demo catalog and verified 32 total products (20 Salla, 12 Zid), 25% cost coverage, SAR currency integrity, evidence-gated margin output, target-channel promotion filtering, and the Copilot legacy-cost fallback.
- Salla app `1493851737` remains in Easy Mode with embedded `dashboard` and matching onboarding. All lifecycle evidence is from Salla Partner demo stores; PrizeSkout does not yet have a real Salla merchant. A never-before-used Partner demo store completed first authorization, test-account provisioning, 20-product sync, delivered welcome email, activation sign-in, consumed-link rejection, and persisted single-use access/refresh-token rotation. Reopen, uninstall/reinstall, controlled missing-scope recovery, forced HTTP-401 sync failure and successful retry, authenticated Arabic RTL, and 375/768/1440 viewport checks are also verified in demo stores only. The current Partner Portal client ID and secret are installed in the Worker; the secret became visible during portal verification and must be treated as a credential risk until the user decides whether to roll it after assessing installation impact. Customer readiness remains false, and none of this is real-merchant production evidence.

- The legacy handoff explicitly reports production deployment of the API-independent evidence migrations from `20260830000000` through `20260833000000`, then `20260835000000` through `20260848000000`, with `20260834000000` notably reported as still needing deployment at the time it was written.
- It reports `20260902000000_evidence_automation_scheduler.sql` deployed and immutable.
- Migration files after `20260848000000` exist locally, including evidence hardening and September engine/enterprise work, but their production deployment is not proven by file existence. Treat deployment as unknown until read-only production verification or an updated deployment record establishes it.
- A prior service-role smoke check verified selected Talabat and evidence tables and verified public-key denial. Re-run only when a current task requires it.

## Known operational gaps from the latest reliable handoff

- Supabase CLI migration listing was blocked by `LegacyDbConfigLoginRoleStatusError` / HTTP 403 for the logged-in project role. This is an account authorization issue, not evidence of a database-schema failure.
- Production forwarding-email transport, matching inbound webhook secret, and an approved test tenant/document were still required for end-to-end email smoke testing.
- Salla first-time welcome delivery and consumed-link rejection are verified through Resend and the live PrizeSkout callback. Time-elapsed expiry beyond one-time consumption was not separately waited out.
- Evidence source-pull routing, Worker deployment, Worker/Vault secrets, and scheduler activation required joint verification.
- Real merchant samples are required before a provider layout can be described as verified.
- No real Salla merchant has installed or validated PrizeSkout. Partner demo-store success must not be described as merchant adoption, customer validation, or production merchant verification.
- Automatic connectors must never imply complete coverage merely because a sync succeeded.
- Order Guard remains unavailable in production because its database objects are not provisioned. The merchant UI now explains that the feature is not available, hides unusable activation controls, and confirms that catalog/prices/store data are unchanged; do not deploy an unverified migration solely to enable it.

## Protected production surfaces

- Zid authorization, callbacks, scopes, tokens, webhooks, identifiers, catalogue operations, and connected merchants.
- Salla authorization, callbacks, scopes, tokens, webhooks, identifiers, catalogue operations, and connected merchants.
- Deployed migrations and immutable evidence/audit records.

## Customer-readiness rule

Code presence is not customer readiness. Each feature must separately record code, tests, migration, configuration, deployment, production verification, and release state in its task packet and in `state.yaml`.
