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
| Tests | Zid contract, Salla contract, typecheck, and production build passing |
| Migration | Not expected; verify before changing |
| Partner configuration | Published OAuth app `7116`; URLs and app-market webhook verified; scope reduction requires a separate capability/reconnection decision |
| Deployment | Worker version `8bbd6b31-f7b9-4829-ba5c-beda14ab2a33` |
| Production verification | PrizeSkout and authenticated Zid iframe sync/reopen/English/Arabic/responsive checks passed; standalone merchant journey and a 50-prompt AI Store Manager audit passed after direct-answer, evidence, currency, and parser hardening; demo app deactivated for the authorized lifecycle test and reinstall is blocked at a real SAR 412.85/month checkout |
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
- An environment-less Cloudflare automatic deployment briefly broke the dashboard after a push. It was rolled back, and manual deployment restored service. Cloudflare Git builds now have the three required `VITE_SUPABASE_*` build variables, and the Vite configuration fails the build rather than emitting a broken client when any are absent. The first post-fix Git-triggered deployment still requires a standard smoke check.

## Exact next action

Choose between submitting a Zid-reviewed 7-day trial revision, completing the already authorized SAR 412.85/month checkout, or asking Zid Partner Support to grant/reset no-charge testing access for development store `3251312`. The documented Partner one-click install did not activate the published paid app. After safe activation, verify state-bound OAuth, welcome delivery, one-time activation, and reopen restoration; separately reconcile and provision Order Guard only after production migration state is authorized.
