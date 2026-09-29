# P0-SALLA-001 — Recover and Complete the Salla Integration

## Incident summary

During a Salla-team integration test approximately one week before 2026-09-28, authentication completed but the merchant experienced no meaningful product transition. There was no visible embedded PrizeSkout dashboard, onboarding, next-step guidance, or welcome/activation email. A Salla developer questioned the choice of Easy Mode rather than Custom Mode.

## Desired outcome

A Salla merchant installs PrizeSkout, completes secure authorization, is idempotently provisioned or linked, receives a secure localized welcome/activation path, lands in a substantial embedded PrizeSkout workspace inside Salla, sees synchronization and onboarding state, can leave and reopen the app, and encounters explicit recovery behavior for every material failure state.

## User authorization and boundaries

- The user authorized end-to-end inspection, implementation, configuration, testing, and reasonable improvements in the logged-in Salla Partner account and this repository.
- Record existing Partner Portal values before changing them.
- Do not expose credentials, tokens, secrets, or personal data in documentation or tool output.
- Do not email reusable plaintext passwords. Use a one-time activation or magic-link flow.
- Do not commit or push unless the user explicitly requests it.
- Preserve existing Salla merchants and protected Zid behavior; require reconnection only if technically unavoidable and documented.

## Workstreams

### A. Current-state audit

- Authorization route, callback, state/CSRF, token exchange, encryption, refresh, scopes, webhooks, uninstall, reinstall, account linking, provisioning, redirects, and embedded session behavior.
- Salla Partner Portal app mode, URLs, scopes, menu/embedded placement, test store, listing, validation warnings, and publication state.

### B. Mode decision

Compare Easy Mode and Custom Mode against required embedded dashboard, controlled post-auth redirect, merchant identity, lifecycle, scopes, and existing-installation compatibility. Record the decision and migration impact before changing mode.

### C. Complete installation lifecycle

`install -> authorize -> validate callback -> exchange token -> resolve store -> provision/link merchant/admin -> store connection -> enqueue initial sync -> send secure welcome -> redirect to embedded onboarding`

### D. Embedded onboarding and dashboard

- Connection confirmation and health
- Store identity and authorization state
- Initial synchronization state
- Honest loading, empty, partial, error, and retry behavior
- Guided checklist for costs, channels, agreements, and first profit audit
- Navigation into existing useful PrizeSkout surfaces

### E. Email activation

Localized confirmation with merchant/store identity, connected platform, secure expiring activation/magic link, embedded-app entry point, next steps, and support. Request and verify an email in-app if Salla does not supply one safely.

### F. Lifecycle and regression testing

Fresh install, repeat callback, existing account, reopen, missing scope, sync failure, refresh, uninstall, reinstall, embedded viewport, Arabic/English, production build, Salla contract, and Zid regression.

## Acceptance criteria

- Appropriate Salla mode is documented and configured.
- OAuth and lifecycle behavior are secure, idempotent, and production verified.
- Merchant/admin provisioning works without duplicate accounts.
- Secure welcome/activation email delivery is verified.
- Merchant lands in the correct embedded workspace with onboarding and sync state.
- Reopening from Salla works.
- Failure, uninstall, and reinstall paths are tested.
- Existing Salla and Zid behavior is protected.
- Partner Portal values and code/deployment state are documented.
- A repeatable pre-call Salla demo runbook exists.

## Status dimensions

| Dimension | State |
|---|---|
| Design | Easy Mode retained; embedded recovery implemented |
| Code | Embedded bootstrap, provisioning, delivery-aware welcome flow, retained iframe retry token, corrected scope checks, bulk catalog sync, refresh lease, standards-compliant refresh request, CSP, and onboarding implemented |
| Tests | Typecheck, Salla contract, Zid contract, and production build passing after refresh fix |
| Migration | Unknown |
| Partner configuration | Easy Mode retained; embedded page and onboarding step configured; Resend sending domain verified |
| Deployment | Worker version `f39b637f-c1f7-412a-9134-c29e6230a294` deployed on `prizeskout.qa/*` and `app.prizeskout.qa`; current Salla OAuth credentials installed |
| Production verification | Partner demo-store environment only: fresh authorization, test-account provisioning, Resend delivery, activation, consumed-link rejection, 20-product sync, persisted single-use refresh rotation, reopen/reinstall, missing-scope and forced-failure recovery, authenticated Arabic, and exact 375/768/1440 viewport matrix verified. No real Salla merchant evidence exists. |
| Customer readiness | Not ready |

## Baseline verification

```powershell
npm run verify-continuity
npm run verify-salla-contract
npm run verify-zid-contract
npm run typecheck
```

## Findings log

- 2026-09-28 Partner Portal audit: app `1493851737` is a public Development app and already uses **Easy Mode**. The production webhook URL is `https://prizeskout.qa/api/webhooks/salla` with Signature verification selected. Two demo stores are connected.
- Official Salla documentation confirms Easy Mode is the only authorization mode allowed for published App Store apps. Custom Mode is a testing-only/manual OAuth path. The Salla-team comment should therefore be treated as a symptom of the missing post-install experience, not a reason to switch the production app to Custom Mode.
- Current scopes: settings/read; orders/read; branches/read; categories/read-write; products/read-write; webhooks/read-write; payments/read; taxes/read; special offers/read-write; shipping/read-write; transactions/read; store settings/read. Scope minimization and actual feature need still require validation.
- The Partner Portal currently has **zero App Onboarding Steps** and **zero Embedded Pages**. This exactly explains why successful authorization produces no visible next step or in-dashboard PrizeSkout surface.
- `app.store.authorize` is accepted and credentials are persisted, webhooks are registered, and initial catalog sync is queued. However, Easy Mode only links to a pre-existing PrizeSkout access-code account by matching the authenticated Salla store email. A first-time Salla merchant is left with an auto-provisioned channel but no PrizeSkout access code, no auth identity, no welcome email, and no launch path.
- The only embedded implementation in the repository is Zid-specific. There is no Salla embedded route, no Embedded SDK initialization, no Salla token introspection endpoint, and the global CSP currently allows Zid frame ancestors but not Salla.
- Salla's current Embedded SDK contract requires `embedded.init()`, retrieval of the short-lived iframe token, backend introspection at `POST https://api.salla.dev/exchange-authority/v1/introspect` with `S-Source: <app id>`, and `embedded.ready()` only after verification and initial data load. Failure should call `embedded.destroy()`.
- The existing generic onboarding success flag (`?salla_connected=1`) belongs to the Custom Mode callback and is not the Easy Mode marketplace landing mechanism.
- 2026-09-28 verification: continuity, Salla contract, Zid contract, typecheck, and production build all passed.
- Worker version `175745f2-17a0-4393-b6ce-28d7211ed299` is deployed. The workers.dev embedded route returns 200 with Salla in CSP, but `https://prizeskout.qa/embedded/salla` returns 404 and the apex still serves the prior CSP.
- Partner Portal mutation did not proceed: the authenticated app tab was owned by another active browser-control session, while a fresh tab stopped at Salla's Cloudflare verification. No security barrier was bypassed and no portal values were changed.
- 2026-09-29 custom-domain recovery: added the explicit `prizeskout.qa/*` Worker route, proxied the apex DNS record through Cloudflare, and deployed Worker version `b8543201-2031-4d2e-9239-fc7e60483e9b`. `GET /embedded/salla` returned 200 with the Salla frame ancestors and the unauthenticated bootstrap returned the expected 400 JSON failure.
- 2026-09-29 Partner Portal configuration: retained Easy Mode; created embedded page slug `dashboard` pointing to `https://prizeskout.qa/embedded/salla?v=2`; created onboarding step `Open PrizeSkout dashboard` targeting `dashboard`.
- 2026-09-29 demo-store verification: the live Salla iframe initially rejected the apex. Adding the exact `https://s.salla.sa` frame ancestor and redeploying resolved it. The embedded dashboard then reported the store connection healthy, authorization verified, and catalog preparation in progress.
- 2026-09-29 lifecycle verification: reopening succeeded; uninstall succeeded and emitted Salla's deleted state; the first immediate reinstall attempt was rate-limited by Salla; a retry after cooldown succeeded; the embedded dashboard reopened successfully after reinstall without duplicate-account symptoms visible in the merchant UI.
- Secure welcome/activation email delivery, activation-link expiry, completed catalog synchronization, missing-scope behavior, forced sync failure, token refresh, authenticated Arabic operation, and the full viewport matrix remain unverified. Customer readiness therefore remains `not_ready`.
- 2026-09-29 localization follow-up: deployed RTL direction, Arabic loading/recovery/onboarding copy, responsive checklist wrapping, and reduced-motion loading in version `8060b3a0-82b7-4b9c-a77d-440184d10d34`. The live Arabic loading and failure-retry states passed; an authenticated Arabic Salla session and full viewport matrix remain pending.
- 2026-09-29 controlled fresh install: the isolated store connected with 13 scopes and a verified store email. Welcome correctly recorded `email_transport_not_configured`; neither Worker nor local environment has `RESEND_API_KEY`/`EMAIL_FROM`, and no welcome reached the controlled Zoho inbox. Delivery and expiry remain blocked.
- Welcome metadata now distinguishes attempts, provider acceptance, and verified delivery. Sending requires a Supabase one-time magic link and refuses a plaintext-code fallback.
- Catalog sync completed: 20 products found, 20 stored, zero errors. The authenticated embedded UI displayed completion in English and Arabic.
- Missing-scope recovery was exercised by temporarily removing `orders.read` only from the isolated channel; authenticated retry moved to action-needed/retry. The original scopes were restored.
- A controlled invalid bearer produced a real Salla catalog HTTP 401; after restoration, retry completed 20/20 with zero errors.
- Authenticated Arabic passed in the real Salla iframe (`locale=ar`) with correct RTL localized status, checklist, and navigation copy.
- Token refresh remains unverified: controlled expiry attempts reached retry but did not persist refresh metadata; the harness restored the original token and metadata.
- Requested 375, 768, and 1440 widths were ignored by the Chrome surface, which stayed at 894px. The 890px iframe had no horizontal overflow, but this is not a true viewport matrix.
- Worker version `134b7f92-6689-40aa-98bd-e7e752955ecc` is deployed with authenticated retry and durable sync state.
- 2026-09-29 continuation: Cloudflare already contained the exact DKIM and two DNS-only CNAME records for `updates.prizeskout.qa`; Resend verification completed successfully. No API key existed and no Worker `RESEND_API_KEY` secret was present.
- The authenticated Arabic iframe was rechecked with an exact browser viewport override at 375, 768, and 1440 px. Measured iframe `scrollWidth` equaled `clientWidth` at all three sizes (371, 764, and 1436 px respectively), and visual checks passed. The override was reset afterward.
- Refresh diagnosis found the lease acquisition comparing the entire JSON metadata value. It now atomically matches the current bearer token and nested refresh token instead. This fix is not deployed or production-verified yet.
- A domain-restricted sending-only Resend key was created, but Cloudflare's unsaved secret form surfaced its value through accessibility output. It was not saved or deployed; the Cloudflare form was discarded. The key must be revoked before a replacement is created and installed.
- The first exposed unused key was revoked with explicit confirmation. A replacement sending-only key restricted to `updates.prizeskout.qa` was installed as the encrypted Worker `RESEND_API_KEY`; `EMAIL_FROM` is `PrizeSkout <welcome@updates.prizeskout.qa>`.
- Deployed the refresh lease and delivery-aware welcome changes as Worker version `5321bb89-8975-4ba0-8260-30905a485642`. Deployment preserved both `prizeskout.qa/*` and the pre-existing `app.prizeskout.qa` custom domain. Both domains returned HTTP 200, and unauthenticated embedded bootstrap retained its expected HTTP 400 response.
- A new isolated-store subscription dated 2026-09-29 was visible in Salla, and `Open the app` loaded the authenticated Arabic onboarding with healthy connection and the previously verified 20 synchronized products. The reinstall produced `app.installed` but no new `app.store.authorize`; therefore it did not repeat provisioning or welcome dispatch.
- Resend's Emails page showed `No sent emails yet`; the replacement key showed no activity. Welcome delivery and magic-link expiry are not verified.
- A controlled expired-token and retry state was exercised. Reopening through Salla produced a new embedded session and exposed the localized retry action, but the retry did not reach a successful rotation; no `refreshed_at` or future rotated expiry was persisted. The test-only expiry, failure marker, and channel error were restored, and the live embedded UI again showed 20 synchronized products.
- While checking Resend activity, its still-open one-time-key dialog exposed the deployed replacement key through accessibility output. Work initially stopped before revocation because rotating a persistent credential requires action-time confirmation.
- The user explicitly directed that the deployed Resend key be retained and accepted the local exposure risk. No revocation or rotation will be performed.
- 2026-09-29 final fresh-demo-store verification: Partner demo store `PrizeSkout Authorization QA 2` produced a new `app.store.authorize` test connection, Resend recorded two accepted messages as Delivered, and the activation link signed into the provisioned test account. Reopening the consumed link later reached `/auth/callback#error_code=otp_expired` with the explicit invalid-or-expired message, directly verifying one-time rejection. This is not a real merchant installation.
- The embedded retry initially never reached the server because the iframe SDK did not return its token twice; retaining the verified initialization token fixed the client path. Scope validation then incorrectly required unused Brands access and rejected the stronger `categories.read_write`; both checks were corrected. The all-missing-cost demo catalog was changed to an idempotent bulk upsert, after which 20/20 products synchronized.
- Refresh testing found and fixed the compare-and-set lease, then found the token endpoint was being called with HTTP Basic authentication. Salla's current contract requires URL-encoded `client_id`, `client_secret`, `grant_type`, and `refresh_token`; the request and regression test now follow that contract.
- Worker versions `68e6801a-4c9d-40ac-9da3-f958366535cb` and then `f39b637f-c1f7-412a-9134-c29e6230a294` were deployed during final diagnosis. After aligning both Worker OAuth credentials with the Partner Portal, authenticated embedded retry completed 20-product sync. Database evidence showed access and refresh token hashes both changed, `refreshed_at` was written, expiry advanced 14 days, and the prior error cleared. No token value was printed in terminal verification.
- The Partner Portal client secret became visible in browser automation output while diagnosing the credential mismatch. Customer readiness remains false pending an explicit decision on rolling it and validating impact on existing installations.
- Rechecked Salla's current official authorization documentation after the user relayed the Salla team's rationale for Custom Mode. The 14-day lifetime is the general Salla access-token lifetime; it is not an Easy-Mode-only behavior. `offline_access` provides a single-use refresh token valid for one month, and every successful refresh rotates it. Custom Mode changes who handles the initial callback/code exchange but does not remove periodic token refresh. Current Salla documentation continues to label Easy Mode recommended and the only published-App-Store mode, so the portal mode remains unchanged unless Salla supplies a specific written exception for this app.
- 2026-09-29 resumed recovery baseline: `verify-continuity`, Salla contract, Zid contract, and typecheck all passed. The live Partner Portal again showed Easy Mode selected, the production webhook with Signature verification, one onboarding step targeting `dashboard`, one embedded page at `https://prizeskout.qa/embedded/salla?v=2`, and three connected demo stores. Resend still showed `No sent emails yet`.
- 2026-09-29 onboarding-content revision: replaced the limiting price/margin/repricing welcome message with the broader evidence-backed value path: true contribution profit, payout comparison, margin-leak detection, recovery cases, and controlled pricing decisions. The Salla email now identifies the connected platform, explains the private one-time link, and gives concrete next steps. The embedded checklist now covers catalog review, costs and approved commercial terms, order/payout evidence, and the first verified profit/payout audit. It no longer claims order history is prepared by the catalog-sync step. These changes pass typecheck, Salla/Zid contracts, and production build but are not deployed or production-rendered yet.
- Opened the isolated `PrizeSkout Fresh Install QA` store and reached the installed-app menu. The next operation is Salla's destructive `Delete the app` action, which is paused for action-time user confirmation before the controlled reinstall.
- With user confirmation, deleted PrizeSkout only from `PrizeSkout Fresh Install QA`; Salla showed an explicit successful-deletion notice. Reinstalled immediately and Salla created a new installed-app record, with its app log showing the new subscription and preceding deletion as distinct events.
- The reinstalled app opened successfully in a newly issued embedded iframe session, but it reused the existing PrizeSkout connection and immediately showed the prior completed 20-product state. Resend still showed `No sent emails yet`. This directly confirms that reinstalling the same demo merchant does not force a new `app.store.authorize` payload or welcome dispatch.
- Salla Partner webhook logs showed 100% health but no visible rows under the current default filters. A never-before-used demo merchant is required to verify first authorization and token issuance. The Create Demo Store form is open, paused before credential entry/account creation for action-time user confirmation.

## Changed files

- `docs/implementation/state.yaml`
- `docs/implementation/task-packets/P0-SALLA-001-integration-recovery.md`
- `package.json`
- `package-lock.json`
- `src/routeTree.gen.ts`
- `src/routes/api/embedded/salla/bootstrap.ts`
- `src/routes/api/embedded/salla/sync.ts`
- `src/routes/embedded/salla.tsx`
- `src/server/core/salla-account-link.ts`
- `src/server/core/salla-catalog-sync.ts`
- `src/server/core/salla-contract.ts`
- `src/server/core/salla-easy-mode.ts`
- `src/server/email/index.ts`
- `src/server/email/strings.ts`
- `src/server/email/templates.ts`
- `scripts/verify-salla-contract.mts`
- `src/worker-entry.ts`
- `wrangler.jsonc`

## Exact next action

Review and deploy the revised Salla welcome email and embedded evidence checklist, then verify their rendered English and Arabic production experience in a Partner demo store. Treat all completed lifecycle checks as Partner demo-store validation only. Separately decide whether to roll the exposed Salla client secret and obtain an approved real Salla merchant pilot before changing customer readiness.
