# Next Codex Handoff Prompt

Copy everything below this line into the next Codex session.

---

You are continuing implementation of PrizeSkout in this existing workspace:

`C:\Users\DELL\Projects\prizeskoutqa`

Read the repository and current git status before editing. Preserve all existing user changes. Do not reset, discard or overwrite unrelated work.

## Primary objective

Implement the architecture described in:

- `docs/PrizeSkout-API-Independent-Strategy.pdf`
- `docs/PrizeSkout-API-Independent-Strategy.md`

The governing principle is:

**PrizeSkout must deliver its core value without aggregator, POS or middleware APIs. Approved APIs may improve speed or detail, but they are optional adapters and must never become prerequisites.**

## Protected production integrations

Zid and Salla are already approved/published integrations and must remain protected.

Do not break or unnecessarily change:

- Existing Zid or Salla authorization routes
- Callback URLs
- Requested permissions/scopes
- Token storage or refresh behavior
- Webhook URLs, verification or acknowledgements
- Duplicate-event handling
- Merchant, store, product and order identifiers
- Catalogue synchronization
- Price, stock or coupon operations
- Existing merchant connections
- Approval and action-safety controls
- Marketplace-compliant behavior
- Existing Zid and Salla connection flows

Existing Zid and Salla merchants must not be required to reconnect or grant new permissions for the API-independent system.

Before changing anything near either integration, inspect and run the existing contract checks. New architecture must sit behind adapters and receive copies of data without interrupting existing webhook or synchronization paths. A failure in the new ledger must never fail a Zid or Salla request.

## Architectural direction

Build around universal merchant-owned financial records, not provider-specific APIs.

Core sources, in priority order:

1. Automatically collected business email and attachments
2. Private merchant forwarding addresses
3. POS/order CSV, Excel and PDF exports
4. Watched export folders or a permitted merchant-installed read-only connector
5. Merchant agreements, rate amendments and promotion confirmations
6. Merchant confirmation of payout receipt where evidence is incomplete
7. Optional merchant-authorized APIs
8. Optional formal partnerships

Foodics, Marn, Deliverect, Grubtech and similar providers are optional accelerators only. Do not make the architecture depend on them.

The central flow is:

`merchant-controlled evidence -> immutable intake -> normalized universal records -> effective-dated commercial terms -> expected payout -> payout comparison -> evidence classification -> discrepancy/recovery case -> dashboard and Copilot -> merchant approval before protected external actions`

## Three separate truths

Keep these conceptually and structurally separate:

1. Order truth: what the merchant sold, normally from POS/order records
2. Contract truth: what the merchant agreed to pay that channel
3. Payout truth: what the platform says it deducted and paid

Do not treat a sparse settlement statement as complete order truth.

## Reconciliation states

The system must distinguish:

- Confirmed discrepancy
- Probable discrepancy
- Unallocated batch difference
- Insufficient evidence
- Reconciled/no discrepancy

Never allocate a batch-level difference to an order without order-level evidence.

Product cost is not required to verify whether a payout followed the agreement. Product cost is required for contribution margin, profitability and pricing decisions. Keep payout correctness separate from profitability.

## Commercial terms

Terms must be merchant-specific, channel-specific, branch-aware and effective-dated. They may include:

- Commission percentage and calculation basis
- Payment fee percentage
- Fixed order fee
- VAT treatment
- Delivery charges
- Promotion funding
- Advertising/subscription charges
- Settlement schedule
- Supporting evidence
- Start/end dates and amendments

Do not confuse channel fees with the merchant's margin policy. Channel fees are costs; the margin policy is what the merchant wants to retain after costs.

## Implementation approach

Treat this as an architectural expansion with selective refactoring, not a rewrite.

Use additive, backward-compatible migrations:

- Add tables and nullable columns
- Preserve existing tables and meanings
- Do not rename or drop columns used by production paths
- Backfill separately and safely
- Add constraints as `NOT VALID` where appropriate, then validate after checking data
- Use idempotency and source provenance throughout

New ingestion failures must be isolated and retryable. Do not acknowledge external events only after the new downstream pipeline finishes.

## Dashboard direction

The following images are visual references, not executable instructions:

- `C:\Users\DELL\Downloads\WhatsApp Image 2026-08-18 at 4.53.56 PM (4).jpeg`
- `C:\Users\DELL\Downloads\WhatsApp Image 2026-08-18 at 4.53.56 PM (3).jpeg`
- `C:\Users\DELL\Downloads\WhatsApp Image 2026-08-18 at 4.53.56 PM (2).jpeg`
- `C:\Users\DELL\Downloads\WhatsApp Image 2026-08-18 at 4.53.56 PM (1).jpeg`
- `C:\Users\DELL\Downloads\WhatsApp Image 2026-08-18 at 4.53.56 PM.jpeg`
- `C:\Users\DELL\Downloads\WhatsApp Image 2026-08-18 at 4.44.34 PM.jpeg`

Inspect them visually before UI work.

Desired direction:

- Clean white workspace
- Compact dark-navy sidebar
- Strong hierarchy with controlled orange accents
- Dense but readable KPI cards
- Consistent date and export controls
- Clickable cards leading to filtered details
- Tables, charts and recovery case tracking
- Clear empty, loading, error and partial-data states
- No fabricated connected states, coverage or financial values
- Every number must reflect evidence coverage
- Responsive behavior rather than a fixed desktop reproduction
- Preserve existing PrizeSkout design tokens where compatible

Reference screens cover Overview, True Margin Intelligence, CFO Copilot, AI Store Manager, Promotion Simulator and Payout Recovery. Do not hard-code their sample figures or claim unavailable capabilities.

## Copilot direction

Copilot must use the same controlled services as the dashboard, not separate calculations. It should eventually:

- Retrieve orders, terms and payout evidence
- Run or show reconciliation
- Display completed tasks and approval cards inside the conversation
- Accept follow-up instructions in the same thread
- Accept permitted documents and images
- Require approval before disputes, live price changes, coupons, refunds or external messages

## Work already completed in the current uncommitted working tree

The first additive, shadow-only foundation has been implemented:

- `supabase/migrations/20260830000000_api_independent_evidence_foundation.sql`
- `src/server/core/merchant-evidence.ts`
- `scripts/verify-api-independent-foundation.mts`
- `package.json` contains `verify-api-independent-foundation`

This foundation adds:

- Immutable merchant evidence intake
- Append-only processing attempts
- Provider-neutral commerce events
- Merchant-controlled source types
- Optional API source type
- Protected integration copy source type
- Evidence-strength and reconciliation classification
- Batch-difference protection

It does not modify Zid or Salla and performs no live actions.

The merchant has run `20260830000000_api_independent_evidence_foundation.sql`. It is deployed and immutable. Do not modify it; create a later additive migration for any schema changes.

The following checks passed immediately after implementation:

- `npm run verify-api-independent-foundation`
- `npm run verify-zid-contract`
- `npm run verify-salla-contract`
- `npm run typecheck`

The next slice has also been completed:

- `src/server/core/merchant-evidence-intake.ts` validates and deduplicates source-neutral evidence intake.
- The existing payout upload path records a soft-fail, shadow-only evidence item and processing attempt.
- Shadow intake failure never changes the existing payout response.
- The legacy upload currently retains extracted text, not original file bytes; this limitation is recorded explicitly and must be fixed with private object storage before calling the evidence fully retained.
- Mandatory bank-transaction details were deprecated. Merchant receipt confirmation is allowed without a private bank statement; voluntary bank evidence remains supported.
- Reconciliation runs no longer become `insufficient_evidence` solely because receipt/bank evidence is absent. Receipt evidence is still needed to prove funds actually landed and for the strongest claims-ready conclusion.

After this slice, these checks passed:

- `npm run verify-api-independent-foundation`
- `npm run verify-settlement-reconciliation`
- `npm run verify-settlement-reference-intake`
- `npm run verify-payout-authority`
- `npm run verify-zid-contract`
- `npm run verify-salla-contract`
- `npm run typecheck`

The private-original-file slice is implemented and deployed:

- `supabase/migrations/20260831000000_private_merchant_evidence_storage.sql`
- `src/routes/api/evidence/intake.ts`
- Payout files are first retained in the private `merchant-evidence` bucket, fingerprinted, and registered before parsing.
- The old parser remains only as a temporary compatibility parser after private intake; it is not the architectural intake boundary anymore.
- Bank-specific fields and visible labels were removed from the merchant receipt-confirmation flow. It now asks only for amount, currency, platform settlement reference, payout type, period, and optional note.
- Internal legacy names such as `merchant_received` and `BankReceipt` still exist in calculation types for backward compatibility. Migrate these names only through an additive compatibility change; do not break saved audit records.

The merchant has run `20260831000000_private_merchant_evidence_storage.sql`. It is deployed and immutable. Do not modify it; create migration `20260832000000` or later for further schema changes.

The first provider-neutral normalization slice is also implemented:

- `src/server/core/normalized-commerce-events.ts`
- Detailed transaction rows become order snapshots and refunds.
- Settlement rows become settlement events, retaining whether they can be matched to an order.
- A platform-stated settlement-report total becomes a payout-total event.
- Aggregate daily reports are never expanded into invented order records; they remain summary evidence and are marked as needing more detail.
- Normalization is append-only and retry-safe. The legacy parser remains a temporary compatibility processor while output parity is verified.

The normalized reconciliation shadow slice is implemented:

- `src/server/core/normalized-reconciliation-shadow.ts`
- It reads provider-neutral events and applies the approved, effective channel agreement.
- It never turns a batch payout total into order-level allocations.
- It persists append-only reconciliation runs under `normalized-reconciliation-shadow-v1`.
- Results are marked `shadow_only` and cannot authorize disputes or live merchant actions.
- Where both engines have a defensibly comparable expected total, the run records `matching` or `mismatch`; otherwise it records `not_comparable` instead of forcing a conclusion.

The merchant-email automation slice is implemented and its migration has been run:

- `supabase/migrations/20260832000000_merchant_evidence_mailboxes.sql`
- `src/server/core/evidence-mailbox.ts`
- `src/routes/api/evidence/mailbox.ts`
- `src/routes/api/evidence/inbound-email.ts`
- Each merchant can receive a stable private forwarding address.
- The model explicitly preserves all three merchant choices: direct use of the private forwarding address, an automatic rule in the merchant's existing mailbox, and an optional read-only connected mailbox.
- A signed, provider-neutral inbound webhook retains original RFC822 mail and supported attachments in private storage.
- Provider retries deduplicate by message identity and content fingerprint.
- Deterministic filename/subject hints classify common payout, settlement, order, credit-note, promotion, and contract evidence without pretending uncertain documents are known.
- Configure `EVIDENCE_MAILBOX_DOMAIN` and `INBOUND_EVIDENCE_WEBHOOK_SECRET` before enabling inbound delivery. The email transport provider remains replaceable.
- The merchant has run `20260832000000_merchant_evidence_mailboxes.sql`. It is deployed and immutable. Do not modify it; use migration `20260833000000` or later for schema changes.

The first automatic document-processing slice is implemented:

- `src/server/core/evidence-document-processor.ts`
- `src/routes/api/public/hooks/evidence-process.ts`
- Retained CSV, XLS, and XLSX files are read server-side, classified conservatively, normalized, and sent through shadow reconciliation.
- Unsupported layouts remain retained and move to `needs_review`; empty documents are quarantined. PDFs, images, and raw email wait for the verified text/OCR stage instead of producing guessed figures.
- Processor claims are idempotent, and the scheduled hook requires `EVIDENCE_PROCESSOR_SECRET`.
- No new migration is required for this slice.

The verified PDF-text slice is implemented:

- `src/server/core/server-pdf-text.ts`
- Text-based PDFs are read server-side with page boundaries and reconstructed visual reading order.
- PDF signature, readable-page coverage, replacement-character rate, page limits, and truncation are recorded.
- The existing verified Snoonu report parser may normalize a matching text PDF. Other layouts remain `needs_review`.
- Scanned/image-only PDFs are explicitly marked `SCANNED_PDF_OCR_REQUIRED`; no financial values are guessed from them.

The scanned-document draft extraction slice is implemented:

- `src/server/core/ocr-evidence-extractor.ts`
- Scanned PDFs and JPEG/PNG/WebP evidence can be sent through the OpenAI Responses API as direct file/image inputs using `store:false` and a strict structured function schema.
- Configure `OPENAI_API_KEY`; optionally set `OPENAI_DOCUMENT_MODEL`.
- OCR output is stored only inside an append-only processing attempt as `ocr_draft`, with source quotes, page references, confidence, warnings, and missing information.
- Every OCR result is `needs_review`. It does not create normalized events, approve a contract, confirm a discrepancy, or authorize an action.

The merchant review gate is implemented and migration `20260833000000_evidence_review_approval.sql` has been deployed:

- Machine-extracted OCR and structured values become immutable review drafts.
- The Evidence Inbox shows the original private document, editable extracted values, citations, warnings and missing information.
- Approval and rejection create a permanent reviewer record.
- Newly extracted values do not create normalized financial events or run reconciliation until merchant approval.
- Migration `20260833000000` is deployed and immutable. Do not modify it.

The automatic evidence-processing reliability slice is implemented but its migration still needs to be deployed:

- `supabase/migrations/20260834000000_evidence_processing_reliability.sql`
- Retained evidence automatically enters a durable leased queue.
- Failed processing retries with exponential backoff and enters `dead_letter` after five attempts.
- Worker runs persist heartbeats and outcome counts for stall monitoring.
- The Evidence Inbox shows waiting, processing, completed and failed counts and permits a merchant-authorized retry of a dead-letter document.
- The processor hook now drains leased queue jobs instead of scanning all evidence.
- Production scheduling requires `EVIDENCE_PROCESSOR_SECRET` plus Vault secrets named `evidence_processor_url` and `evidence_processor_secret`. The migration installs a five-minute pg_cron job that remains a no-op until both secrets exist.
- Real email delivery and merchant mailbox setup remain intentionally deferred by merchant request.

The first broader document-coverage slice is implemented locally without a new migration:

- `src/server/core/evidence-layout-registry.ts` recognizes only explicit, versioned header families and fingerprints their normalized columns.
- Talabat payout metadata v1, order-transaction v1 and daily-order-summary v1 are registered layouts; new or changed headers stop for review instead of falling through to fuzzy financial parsing.
- XLS/XLSX processing inspects up to 25 sheets, parses every recognized financial sheet, and safely combines compatible results.
- Conflicting platforms, mixed currencies and repeated order references across sheets stop for review.
- Unsupported layouts now create visible review drafts with their fingerprint and warnings, but the API prevents merchants from approving them into financial calculations.
- Real merchant samples are still required before adding named Jahez, Keeta, Rafeeq or other provider-specific profile versions. Do not describe generic profiles as verified provider formats.

The automatic agreement-matching slice is implemented locally and requires a new migration:

- `supabase/migrations/20260835000000_evidence_agreement_matching.sql`
- `src/server/core/evidence-agreement-matcher.ts`
- Approved evidence is matched against approved agreements using platform, complete effective-date coverage, currency, branch, brand and legal entity when available.
- A single globally applicable agreement may match automatically. Equal candidates or missing scope for a branch/brand/entity-specific agreement require merchant confirmation.
- Matching decisions, scores, reasons, blockers, candidates and confirmer identity are auditable.
- Shadow reconciliation uses only the automatic or merchant-confirmed agreement and cannot silently fall back to a potentially wrong platform agreement after the matcher reports ambiguity.
- The Evidence Inbox displays match reasoning and candidate agreements for confirmation.
- Migration `20260835000000` was deployed by the merchant and is immutable.

The Evidence Inbox agreement-draft slice is implemented locally and requires a new migration:

- `supabase/migrations/20260836000000_evidence_contract_drafts.sql`
- Retained files classified as contracts or amendments use the evidence-backed contract extractor instead of a payout-layout parser.
- Readable PDFs, images and text agreements become editable merchant review drafts with clause citations, missing terms, warnings and extraction confidence.
- Approving the extraction creates a separate agreement draft tied to the retained evidence item and permanent review decision.
- Evidence approval never activates commercial terms. The agreement must still be separately approved in the Contract Intelligence Vault before reconciliation can use it.
- Unsupported or unreadable contract files remain visible and cannot be approved into an agreement draft.
- Migration `20260836000000` was deployed by the merchant and is immutable.

The durable reconciliation-conclusions slice is implemented locally and requires a new migration:

- `supabase/migrations/20260837000000_reconciliation_findings.sql`
- Every stored reconciliation allocation receives an append-only evidence conclusion: confirmed discrepancy, probable discrepancy, unallocated batch difference, insufficient evidence, or reconciled.
- Only an evidenced underpayment with an order-level allocation, applicable approved agreement, and no blockers is marked claims-ready automatically.
- Overpayments, probable discrepancies and batch-only differences remain review-required; missing evidence remains evidence-required.
- The Evidence Inbox displays the conclusion, amount, evidence strength, blockers and recovery readiness without overstating certainty.
- Migration `20260837000000` was deployed by the merchant and is immutable.

The reconciliation-to-recovery bridge is implemented locally and requires a new migration:

- `supabase/migrations/20260838000000_reconciliation_recovery_bridge.sql`
- A merchant can prepare a recovery case directly from an Evidence Inbox reconciliation conclusion.
- The case retains immutable links to its finding and reconciliation run plus the retained evidence source.
- Only a supported underpayment already marked claims-ready becomes a ready case with a positive claims-ready amount.
- Probable, batch-only, overpayment and incomplete findings create evidence-required cases with zero claims-ready amount.
- Preparing a case never submits a dispute or sends an email. External submission remains separately merchant-controlled and manually recorded.
- Migration `20260838000000` was deployed by the merchant and is immutable. It was made self-contained before deployment because this Supabase environment did not contain the older `ps_recovery_cases` table.

The cross-document reconciliation slice is implemented locally and requires a new migration:

- `supabase/migrations/20260839000000_cross_document_reconciliation.sql`
- Approved order and settlement evidence can be combined when platform, explicit date coverage and the exact automatic or merchant-confirmed agreement match are compatible.
- Evidence with an ambiguous/different agreement is excluded rather than silently mixed across branches or contract scopes.
- Every reconciliation run stores an append-only manifest of all retained evidence documents used and their roles.
- The run fingerprint includes the complete evidence set, event fingerprints and approved agreement, making retries idempotent and changed inputs produce a new immutable run.
- Reconciliation findings are displayed from the shared run on every contributing Evidence Inbox document.
- Migration `20260839000000` was deployed by the merchant and is immutable.

The grouped reconciliation-attention slice is implemented locally without a new migration:

- `src/server/core/reconciliation-attention.ts`
- Actionable findings are grouped by reconciliation run, recovery readiness and currency so merchants are not shown one alert per order.
- Reconciled findings are suppressed. Findings already moved into recovery cases are also suppressed because the recovery workflow owns the next action.
- Claims-ready underpayments receive high-priority dashboard attention; review-required and evidence-required groups receive medium-priority attention with honest wording.
- Stable fingerprints deduplicate repeated dashboard refreshes. Stale groups resolve automatically when findings are reconciled or moved into recovery.
- This creates dashboard attention only. Real email delivery remains intentionally deferred.

The evidence-readiness explanation slice is implemented locally without a new migration:

- Every new cross-document run records a readiness score and explicit checks for orders, agreement, payout evidence, order allocation, final/strong order evidence and currency consistency.
- Readiness is `ready`, `partial` or `blocked`; it never changes the underlying evidence conclusion or silently fills a missing input.
- The Evidence Inbox shows the latest run's score, number of approved documents used and concrete next evidence needed.
- Existing immutable runs are not rewritten; readiness appears on new reconciliation runs produced after this slice.

The agreement-rematch recovery slice is implemented locally and requires a new migration:

- `supabase/migrations/20260840000000_agreement_rematch_revisions.sql`
- Agreement matches are revisioned. Approving new commercial terms creates a new match result for previously blocked or ambiguous evidence instead of overwriting the earlier audit record.
- Evidence that becomes an unambiguous automatic match reruns reconciliation with the newly approved agreement.
- Evidence that remains ambiguous stays merchant-confirmation-required with a refreshed candidate list.
- Stale match revisions cannot be confirmed, and cross-document reconciliation uses only the latest match revision.
- Approving a new effective-dated agreement no longer supersedes older approved periods; it supersedes only a competing version with the same effective start date.
- Migration `20260840000000` was deployed by the merchant and is immutable.

The verified recovery-evidence-pack slice is implemented locally and requires a new migration:

- `supabase/migrations/20260841000000_recovery_evidence_packs.sql`
- `src/server/core/recovery-evidence-pack.ts`
- The server builds an immutable manifest from the recovery case, classified finding, reconciliation run and allocations, exact approved agreement (including extraction provenance), and every retained source document with its SHA-256 hash.
- A deterministic manifest fingerprint makes unchanged preparation idempotent and changed evidence produce a new pack.
- Pack approval is a separate immutable merchant record and explicitly does not authorize external submission.
- A recovery case linked to reconciliation cannot be recorded as submitted until an evidence pack has been prepared and approved.
- The Recovery Workspace can prepare, download and approve the pack. Existing manual cases remain compatible with the earlier workflow.
- Migration `20260841000000` was deployed by the merchant and is immutable.

The richer reviewed-financial-events slice is implemented locally without a new migration:

- Credit notes and adjustment notices retain amount, direction, reason, order and settlement references as normalized commercial-adjustment events.
- Promotion confirmations retain total discount and the platform/merchant funding split as normalized promotion-term events.
- Explicit cancellation amounts become normalized cancellation events.
- Merchant payment confirmations retain the received amount and confirmation reference and can match an exact settlement reference during reconciliation. This does not require bank-account access or a bank statement.
- Batch or ambiguously directed adjustments and promotions remain visible evidence but never silently change order-level expected payout calculations.
- Existing approved documents are not rewritten; older documents containing these types require explicit reprocessing if they need the new normalized event shapes.

The recovery-lifecycle timeline slice is implemented locally and requires a new migration:

- `supabase/migrations/20260842000000_recovery_case_timeline.sql`
- Material recovery changes are recorded automatically in an immutable timeline: submission, platform-review status, acceptance/rejection, recovered amount and closure.
- Invalid status jumps are rejected; a case cannot be marked recovered without a positive recovered amount.
- The Recovery Workspace offers only valid next statuses and displays the latest timeline entries.
- This records merchant-managed progress only. It does not submit disputes or send external messages.
- Migration `20260842000000` was deployed by the merchant and is immutable.

The controlled CFO Copilot financial-evidence slice is implemented locally without a new migration:

- Merchant-specific CFO questions can receive a server-built, access-controlled snapshot of reviewed evidence, latest reconciliation runs, classified findings, approved agreements and recovery progress.
- The browser cannot supply authoritative payout figures; the server verifies merchant access and reads the same stored records used by the dashboard.
- Raw retained documents and unrelated merchant information are not placed in the model context.
- Copilot is instructed to state evidence limitations and never invent missing amounts.
- This slice is read-only. It does not submit disputes, change prices or send external messages.

The evidence-scope identity slice is implemented locally without a new migration:

- OCR review drafts now extract branch reference, brand and legal entity only when visibly supported by the document.
- Merchants can correct those fields during evidence review before approval.
- Approved normalized events retain the branch reference, and agreement matching uses branch, brand and legal entity to prevent the wrong scoped agreement from being selected.
- Missing scope on a branch- or entity-specific agreement continues to require merchant confirmation instead of an automatic match.

The provider-layout drift slice is implemented locally and requires a new migration:

- `supabase/migrations/20260843000000_evidence_layout_drift.sql`
- PrizeSkout records an append-only fingerprint of every recognized provider report layout.
- If a provider changes columns after a prior layout was merchant-approved, the next document is clearly flagged as format drift and remains behind the existing review gate.
- Approving the document also records an immutable approval for that exact provider/profile fingerprint; unknown layouts still cannot be approved for financial calculations.
- Migration `20260843000000` was deployed by the merchant and is immutable.

The provider-neutral evidence-source registry slice is implemented locally and requires a new migration:

- `supabase/migrations/20260844000000_evidence_source_connections.sql`
- Read-only optional APIs, automatic reports, watched folders, local connectors and order-management partners share one connection contract.
- Connections retain provider, branch scope, allowed evidence permissions, sync cursor and health only; credentials remain in the existing encrypted connector vault.
- Any permission outside completed orders, refunds, cancellations, promotion funding, taxes, charges and settlement references is rejected.
- Durable sync-run records support isolated retries and measurable coverage without coupling core reconciliation to one provider.
- The authenticated `/api/evidence/sources` endpoint registers, lists, pauses and disconnects sources. It does not activate a real provider without its separate merchant-authorized setup.
- Migration `20260844000000` was deployed by the merchant and is immutable.

The provider-neutral read-only order-sync slice is implemented locally without a new migration:

- `src/server/core/evidence-source-sync.ts`
- Active registered sources can send bounded batches of completed-order evidence through a secret-protected internal hook.
- The adapter accepts only order identity, time, channel, branch, currency and financial totals; customer, card and unrelated payload fields are discarded before hashing or retention.
- Each sanitized batch becomes immutable evidence, provider-neutral normalized order events and a durable sync result with cursor progression and duplicate counts.
- Discounts, taxes, refunds and cancellations remain distinct financial values. Non-final orders are marked partial rather than claim-ready.
- Configure `EVIDENCE_SOURCE_SYNC_SECRET` only when a real merchant-authorized source adapter is enabled. No provider is activated by this slice.

The automatic-source authorization and reconciliation slice is implemented locally and requires a new migration:

- `supabase/migrations/20260845000000_evidence_source_authorizations.sql`
- Activating automatic evidence creates an immutable merchant authorization containing the exact read-only permissions and branch scope.
- Source batches are rejected unless completed-order access is authorized and every record stays within the authorized branches.
- Sanitized batches receive an immutable approval record tied to that authorization, then enter the same agreement matcher and cross-document reconciliation service used by reviewed uploads.
- Pausing stops new batches; disconnection is terminal and requires a new authorization before reconnecting.
- This authorizes collection and calculation only. It never authorizes provider writes, disputes, refunds, promotions, pricing changes or messages.
- Migration `20260845000000` was deployed by the merchant and is immutable.

The automatic evidence-source freshness slice is implemented locally and requires a new migration:

- `supabase/migrations/20260846000000_evidence_source_freshness.sql`
- Every source has an explicit expected sync interval, defaulting to daily and configurable from 15 minutes to 7 days.
- Source health distinguishes setup required, waiting for first sync, current, late, latest-sync failure, paused and disconnected.
- Missing or late evidence produces a source-health warning only. It never implies that a platform paid correctly and never fabricates financial coverage.
- Health and immutable authorization status are returned by the authenticated evidence-sources endpoint.
- Migration `20260846000000` was deployed by the merchant and is immutable.

The evidence-source attention slice is implemented locally without a new migration:

- Setup-required, first-sync, failed and late sources create one merchant-facing attention item per source.
- Healthy, paused and disconnected sources automatically clear the related warning.
- Repeated failed sync attempts update the same warning instead of flooding the merchant with one item per run.
- Source warnings state only that evidence may be missing. They never imply that payouts are correct or that a recoverable discrepancy exists.

The automatic-source coverage slice is implemented locally and requires a new migration:

- `supabase/migrations/20260847000000_evidence_source_coverage.sql`
- Every successful delivery records its earliest and latest observed event, final and non-final record counts, channels, currencies and branches.
- The evidence-sources endpoint summarizes the observed window and explicitly labels completeness as `not_guaranteed`.
- Coverage boundaries describe only records PrizeSkout actually received. A successful connector run does not prove the provider supplied every expected order or financial adjustment.
- Migration `20260847000000` was deployed by the merchant and is immutable.

The merchant-facing source-coverage slice is implemented locally without a new migration:

- The Evidence Inbox shows every registered automatic source, authorization and health state, observed-through date, record counts, and final versus partial evidence.
- It states that completeness is not guaranteed and displays no fabricated coverage when a source has not delivered evidence.
- The panel is read-only. It cannot activate, pause, disconnect or otherwise change a merchant integration.

The normalized-event revision slice is implemented locally and requires a new migration:

- `supabase/migrations/20260848000000_normalized_event_heads.sql`
- Every partial, final, refunded or cancelled revision remains immutable evidence.
- A database-maintained head identifies the latest revision for each provider event identity.
- Reconciliation uses only current heads, preventing an earlier partial snapshot and a later final update from being double-counted or misreported as duplicate orders.
- Historical rows remain available for audit and recovery evidence.
- Migration `20260848000000` was deployed by the merchant and is immutable.

The automatic-source permission-enforcement slice is implemented locally without a new migration:

- Every delivery requires completed-order permission.
- Refund, cancellation, discount-funding and tax values are rejected unless the immutable merchant authorization includes the matching permission.
- Branch scope continues to be enforced for every record.
- A rejected delivery is retained as a failed sync run and never enters normalized financial evidence.

The automatic-delivery completeness slice is implemented locally and requires a new migration:

- `supabase/migrations/20260849000000_evidence_delivery_completeness.sql`
- A connector must explicitly declare a delivery complete; when it supplies a declared record count, that count must match what PrizeSkout received.
- Missing completion confirmation or a count mismatch creates a partial sync result and source warning.
- Valid records from a partial delivery remain observed evidence, but the delivery does not advance the source's last-success timestamp and cannot imply complete coverage.

The evidence security-hardening slice is implemented locally and requires a new migration:

- `supabase/migrations/20260850000000_evidence_security_hardening.sql`
- Recovery cases now receive the same explicit anonymous/authenticated revoke as the other server-controlled evidence tables.
- Trigger-only security-definer functions cannot be executed directly through exposed database roles.
- Evidence source-hook authentication now uses timing-safe secret comparison.
- Evidence Inbox GET requests send merchant credentials in headers instead of URL query parameters, avoiding access-code exposure in ordinary URL logs and browser history.
- `npm run verify-evidence-release-readiness` checks cumulative RLS/revokes, fixed security-definer search paths, private evidence storage, timing-safe hook authentication and URL credential handling.

The spreadsheet-parser security replacement is implemented locally without a migration:

- Vulnerable production dependency `xlsx` was removed and replaced with actively maintained `read-excel-file` for both browser and server processing.
- `.xlsx` multi-sheet extraction, CSV quoting, 5 MB workbook limits and 10,000-row-per-sheet limits remain enforced.
- Legacy `.xls` files are retained but deliberately routed to review with instructions to save as `.xlsx` or CSV; they are never parsed by an unsafe compatibility path.
- The document processor version is now `evidence-document-processor-v2` so parser provenance remains explicit.

Run them again before and after relevant changes.

## Existing migration context

Recent deployed migrations include:

- `20260824000000_channel_margin_policy_v2.sql`
- `20260825000000_price_action_safety.sql`
- `20260826000000_pricing_evidence_freshness.sql`
- `20260827000000_settlement_calendar_terms.sql`
- `20260828000000_settlement_reconciliation_ledger.sql`
- `20260829000000_copilot_conversation_workspace.sql`

The merchant has run migrations through `20260831000000`. Do not modify deployed migrations. Create later additive migrations after that point.

## Strategy-document context

Current documents:

- `docs/PrizeSkout-API-Independent-Strategy.md`
- `docs/PrizeSkout-API-Independent-Strategy.pdf`

PDF generator:

- `scripts/generate-ceo-payout-pos-report-pdf.mjs`

Do not reintroduce the removed “Recommended delivery plan” or “Research references” sections unless explicitly asked.

## Working method

1. Inspect git status, repository instructions and current architecture.
2. Run baseline Zid and Salla contract checks before integration-adjacent work.
3. Continue with the smallest safe vertical slice.
4. Keep API-independent intake and processing shadow-only initially.
5. Use additive migrations only.
6. Add verification with each meaningful change.
7. Run focused checks, Zid/Salla contract checks and typecheck.
8. Report exactly what changed, what remains shadow-only and which migration the merchant must run.
9. Do not commit or push unless the user explicitly asks.
10. Continue from existing progress rather than restarting.

Never misrepresent mocked, sample or dashboard data as live merchant evidence.
