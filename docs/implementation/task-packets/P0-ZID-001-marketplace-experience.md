# P0-ZID-001 — Complete the Zid Marketplace Experience

## Desired outcome

A Zid merchant activates PrizeSkout from Zid App Market, completes a secure OAuth flow, is idempotently provisioned, receives a localized passwordless welcome email, and opens a useful embedded PrizeSkout setup workspace without leaving the Zid Merchant Dashboard.

## Boundaries

- Preserve existing Zid merchants and the protected Salla integration.
- Do not expose Zid or PrizeSkout reusable credentials in email.
- Do not change Partner scopes, secrets, installations, or merchant data without recording the current state and applying the appropriate confirmation boundary.
- Do not represent Partner demo-store evidence as real-merchant production validation.
- Do not commit or push unless explicitly requested.

## Baseline

```powershell
npm run verify-continuity
npm run verify-zid-contract
npm run verify-salla-contract
npm run typecheck
```

## Acceptance criteria

- Marketplace activation always uses a state-bound OAuth session.
- A verified Zid store is provisioned idempotently without duplicate PrizeSkout tenants.
- Welcome email uses a private one-time passwordless link and never contains reusable credentials.
- Embedded opening requires Zid's registered UUID and provides connection, sync, recovery, and first-value guidance inside the store dashboard.
- App-market and per-store webhooks are authenticated and their required events are verified.
- Arabic, English, responsive layout, reopen, retry, and logged-in PrizeSkout behavior are production checked in a Partner demo store.
- Protected Salla and existing Zid contract checks continue to pass.

## Status dimensions

| Dimension | State |
|---|---|
| Design | Localized embedded setup workspace implemented and authenticated English/Arabic iframe reviewed |
| Code | State-bound OAuth, idempotent tenant/access provisioning, passwordless welcome, embedded bootstrap/retry/checklist, webhook handling, and catalogue sync implemented |
| Tests | Zid contract, Salla contract, contextual copilot prompts, typecheck, and production build passing locally |
| Migration | Not expected; verify before changing |
| Partner configuration | Published OAuth app `7116`; URLs and app-market webhook verified; scope reduction requires a separate capability/reconnection decision |
| Deployment | Git-deployed Worker version `089bdce8-a787-4c2d-b1b2-9679eef6d0fe` |
| Production verification | PrizeSkout and authenticated Zid iframe sync/reopen/English/Arabic/responsive checks passed; standalone merchant journey and a 50-prompt AI Store Manager audit passed after direct-answer, evidence, currency, and parser hardening; a later read-only logged-in follow-up baseline passed, while the unified contextual-agent change remains local and undeployed; demo app deactivated for the authorized lifecycle test and reinstall is blocked at a real SAR 412.85/month checkout |
| Customer readiness | Not ready |

## Findings log

- 2026-09-29 Partner audit: published OAuth app `7116`; application, callback, and redirect URLs point to the production PrizeSkout embedded/OAuth routes.
- The app-market webhook targets `/api/webhooks/zid/app-market` and subscribes to install, authorized, and uninstall events. A matching Worker secret name is configured.
- Current Partner scopes are broader than the read-first activation path and include multiple write capabilities. Scope reduction must account for protected product, coupon, inventory, and order workflows before any Partner mutation.
- The marketplace OAuth callback provisions a tenant and syncs the catalogue but does not create passwordless user access or send a welcome email.
- The current embedded route is a redirect shim that creates a reusable access code and immediately redirects to the full dashboard; it has no connection status, sync progress, checklist, or localized recovery workspace.
- The development-store dashboard is not authenticated in the available browser session. The user must sign in before live iframe verification; authentication will not be automated.
- OAuth callbacks without the state-bound cookie are now rejected, and marketplace callbacks return to the embedded Zid application rather than the standalone dashboard.
- Verified store profiles now provision an idempotent access record and one-time passwordless activation email. Reusable PrizeSkout access codes and Zid credentials are not included in email.
- The embedded route now validates Zid's registered UUID and provides bilingual connection, webhook, catalogue sync/retry, secure-access, and first-value checklist states inside Zid.
- Live PrizeSkout sync completed for Zid. The combined catalogue retained 12 Zid and 20 Salla items, while missing cost/terms evidence continued to produce `Not calculated` rather than inferred margin.
- Corrected a currency display defect that rendered an already-SAR price of 999 as SAR 1,029 by applying an exchange multiplier twice. Production catalogue and margin views now agree at SAR 999.
- Corrected the promotion workspace so a Zid-labelled scenario selects and counts only Zid products. Production now shows 12 products · ZID rather than 32 mixed-channel products.
- Partner scope audit found broad write grants. They support existing protected product, coupon, inventory, order, embedded, and webhook workflows; changing them on a published app may require merchant reauthorization and was not done in this slice.
- Partner UI inspection exposed existing secret/token values to the local automation output. Values were not copied into repository records; rotation impact must be assessed before changing production credentials.
- Authenticated demo store `3181397` opened PrizeSkout inside Zid. Embedded retry moved from `Synchronizing…` to `Complete` with 9 products, continuing setup loaded the full dashboard inside the same Zid iframe, and reopening restored the completed checklist.
- Zid supplies locale as `language=ar`; the original embedded route only read `locale`/`lang`, so Arabic initially rendered English. The route now accepts `language`, sets document `lang`/`dir`, and localizes the missing-store-name fallback.
- Live Arabic verification passed with `lang="ar"`, `dir="rtl"`, translated status/checklist copy, and no horizontal overflow at 375, 768, or 1440 browser widths. The viewport override was reset afterward.
- With user confirmation, deactivated PrizeSkout on demo store `3181397`. Zid moved it to Deactivated Apps and the app-market uninstall lifecycle was triggered.
- Reinstall selection reached the scope-consent dialog and then Zid checkout. The published Core plan has no trial and totals SAR 412.85/month including Zid's displayed total. The user explicitly authorized the recurring purchase, but the checkout has no saved payment method; its embedded card fields require user entry and `Complete purchase` remains disabled and unsubmitted. Partner controls expose no free development-store reinstall path.
- A read-only inspection of the published Core plan editor confirmed that Zid supports a selectable 7-day trial. The portal requires saving the change as a draft and submitting it for Zid review; the editor warns that plans cannot be edited again until Zid approves and publishes the revision. No trial value was changed or submitted.
- Zid's `Application Testing` section still marks development store `3181397` as `Installed` and offers `View your app here`, but following that link after merchant-side deactivation opens the public PrizeSkout page with `Subscribe`. A fresh second development store, `3251312` (`PrizeSkout Lifecycle QA 2`), was then created. Partner one-click `Install App` reported success with no checkout and changed its Partner status to `Installed`, but the merchant dashboard places PrizeSkout under `Deactivated apps` and its app page still requires `Subscribe` at SAR 412.85/month. The Partner testing control therefore does not bypass billing for this already-published paid app.
- Standalone merchant audit traversed Overview, Catalog and bulk-cost setup, Integrations, Margin Intelligence, Alerts, Payout Recovery, Promotion Simulator, AI Store Manager, and Evidence & History without submitting protected actions. The same AED 679 recovery case was mislabeled QAR in merchant attention, raw workflow identifiers were exposed, and Order Guard exposed a 503 plus unusable setup controls.
- Deployed fixes now derive recovery currency only from retained case evidence, refuse to sum mixed/unproven currencies, retain currency on newly created cases, translate internal workflow details into merchant language, and replace the unavailable Order Guard controls with a non-destructive readiness message. The legacy case has no recorded currency and now truthfully displays `Currency not recorded` rather than an inferred code.
- A 50-prompt live AI Store Manager audit found that many read-only questions were unnecessarily converted into tasks and malformed model JSON leaked parser diagnostics. The manager endpoint now authenticates merchant access, routes read-only questions to evidence-backed chat, retries malformed workflow JSON once, and returns a safe failure if repair fails. Protected writes still require approval.
- Focused production regressions now report verified cost coverage deterministically as 25% (8 of 32 imported products), describe absent retained commerce records as unknown rather than zero activity, and present the Talabat 679.06 recovery amount without inventing QAR or SAR. A requested 10% bulk Zid price increase produced a prepared approval-gated task; it was not approved or executed.
- An environment-less Cloudflare automatic deployment briefly broke the dashboard after a push. Cloudflare Git builds now have the three required `VITE_SUPABASE_*` build variables, and the Vite configuration fails the build rather than emitting a broken client when any are absent. Commit `5a4652e` subsequently Git-deployed version `089bdce8-a787-4c2d-b1b2-9679eef6d0fe`; the dashboard and four public/embedded route checks passed.
- 2026-09-30 contextual-manager slice: the logged-in production account answered `What needs my attention today?` with evidence-bounded catalogue and Talabat priorities, then resolved `Which ones should I start with?` from the active conversation without a protected action. Local code now sends up to 16 manager turns to one agent contract that chooses `answer`, `clarify`, or `workflow`, instead of deciding with keyword routing. Workflow steps still pass through the capability registry and approval derivation. `npm run verify-continuity`, `npm run verify-zid-contract`, `npm run verify-salla-contract`, `npm run typecheck`, `npm run verify-copilot-prompts`, `git diff --check`, and `npm run build` passed; the build emitted only existing chunk-size and mixed-import warnings. This local change is not deployed.
- 2026-09-30 20-action production audit: catalogue sync completed and retained 32 items (12 Zid, 20 Salla). The manager lacked visible catalogue price/stock context, converted an exact read-only product lookup into a task whose run control navigated to Defend Loop, rejected repricing previews despite the catalogue holding prices, and later misstated the channel split as 1 Zid / 31 Salla. With explicit merchant authorization, approvals were recorded for Bose price SAR 999→1,009, stock 7, rename to `Bose QC Ultra Demo`, an unpublished `PrizeSkout QA Mug`, and inactive coupon `QA10`. Every task ended `Approved, not sent yet`; a fresh catalogue sync showed 32 items and the unchanged Bose name/price. No connector write is verified. The next implementation slice must connect supported manager capabilities to the existing deterministic operation executor and readback receipts rather than treating generic workflow approval as execution.

- 2026-09-30 local remediation: manager catalogue context now includes exact current price, currency, inventory quantity, infinite-stock mode, inventory status, and authoritative per-channel product/cost/out-of-stock counts. When the contextual agent selects a fully connected workflow, a second constrained compilation produces the established deterministic operation object. Risk and confirmation are derived server-side, so product, stock, coupon, price, sync, order, and other supported operations enter the existing preview/approval/execution/readback UI instead of becoming generic `manager_workflow` tasks. Workflows containing a manual fallback remain supervised tasks. Focused prompts, typecheck, protected Zid/Salla contracts, and production build pass; no deployment or post-fix live write verification has occurred.
- 2026-10-01 Margin Intelligence audit: the logged-in production journey exposed an overclaiming cross-channel subtitle, an irrelevant expected-payout KPI, a ranking with no calculated economics, order/payout evidence conflation, and expanded products with no actionable blocker. The local remediation now leads with the next safe evidence step, separates Catalog, product cost, channel terms, unit economics, margin target, approval, and readback, and routes merchants directly to Catalog or Integrations. Decision-ready and terms-ready counts replace payout language; incomplete rows form an evidence queue with a precise blocker rather than a false ranking. Desktop and phone production-server renders pass with no horizontal overflow, browser page errors, or unrelated recovery toast. This slice is not deployed.

## Exact next action

The approved first dashboard-design slice is implemented locally: the Overview now leads with one evidence-bounded conclusion and next safe action, followed by three supporting indicators and a reusable responsive Truth Trail. The rail keeps order, contract, expected-payout, payout, finding, approval, and receipt states distinct, including explicit missing receipt confirmation. No financial calculation, connector behavior, production configuration, or authorization state changed. Production build, typecheck, Economic Twin aggregation, protected Zid/Salla checks, and repeatable Playwright rendering at 1440px and 390px pass. The visual audit confirmed seven visible stages, no horizontal overflow, and no browser page errors; this remains a local verification rather than a production deployment claim.

The manager execution/context remediation is deployed through Worker `88f131ee-2949-4a05-841b-fae06ae07837`. A repeated 20-prompt production audit corrected the channel context to 12 Zid / 20 Salla, but read-only work still lacks a visible completion receipt in chat. Five reversible demo-store writes are prepared and await action-time confirmation; none has been approved or represented as executed.

The merchant subsequently confirmed the five writes. The first exact Bose price operation was halted before mutation because the live Zid store-detail request returned HTTP 401, so PrizeSkout could not obtain a preview approval token or verify a write. The other four writes were not attempted. The Overview has now passed desktop and phone visual QA. Next, extend the verified Truth Trail pattern to the related financial workflows and restore a valid Zid installation/authorization before repeating the connector-write audit.

Margin Intelligence has now received that local evidence-readiness treatment and passed repeatable desktop and phone visual QA. After explicit commit/push authorization, deploy it and repeat the logged-in production journey, verifying that the suggested evidence action reaches Catalog or Integrations and that no payout claim or false SKU ranking remains. Independently correct the stale public margin verifier: it currently exits successfully even though every `/v1/margin/*` request returns `not_found`; decide whether those routes are still a supported contract before restoring them or removing the obsolete verification path.

Choose between submitting a Zid-reviewed 7-day trial revision, completing the already authorized SAR 412.85/month checkout, or asking Zid Partner Support to grant/reset no-charge testing access for development store `3251312`. The documented Partner one-click install did not activate the published paid app. After safe activation, verify state-bound OAuth, welcome delivery, one-time activation, and reopen restoration; separately reconcile and provision Order Guard only after production migration state is authorized.
