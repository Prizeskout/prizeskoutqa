# Deployment Register

This register is intentionally conservative. “Reported deployed” means the legacy handoff explicitly says the merchant deployed it; it is not a fresh production query.

## Evidence architecture

| Migration or range | Recorded state | Evidence |
|---|---|---|
| `20260830000000` | Reported deployed; immutable | Legacy handoff |
| `20260831000000_private_merchant_evidence_storage.sql` | Reported deployed; immutable | Legacy handoff |
| `20260832000000` | Reported deployed; immutable | Legacy handoff |
| `20260833000000` | Reported deployed; immutable | Legacy handoff |
| `20260834000000` | Deployment unresolved | Legacy handoff says it still needed deployment |
| `20260835000000`–`20260848000000` | Reported deployed; immutable, excluding the unresolved `20260834000000` | Per-slice legacy handoff entries |
| `20260849000000` and later evidence migrations | Unknown | Files exist locally; deployment not proven |
| `20260902000000_evidence_automation_scheduler.sql` | Reported deployed; immutable | Legacy handoff |

## September engine and enterprise migrations

Files from `20260905000000` through `20260913010000` exist locally. Their deployment state is **unknown** until verified through authorized read-only production inspection or an explicit user-confirmed deployment record.

## Application deployments

| Date | Target | Version | State | Verification / containment |
|---|---|---|---|---|
| 2026-09-28 | Cloudflare Worker `prizeskoutqa` | `175745f2-17a0-4393-b6ce-28d7211ed299` | Deployed; not production-ready | workers.dev embedded route returned 200 with Salla in CSP. The production domain returned 404 and a stale CSP; restore its route before portal configuration. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `b8543201-2031-4d2e-9239-fc7e60483e9b` | Deployed; production verification partial | Added explicit `prizeskout.qa/*` route, proxied the apex DNS record, verified embedded route 200 and CSP, then verified live Salla iframe open, uninstall, reinstall, and reopen. Welcome email and remaining failure cases are still unverified. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `8060b3a0-82b7-4b9c-a77d-440184d10d34` | Deployed; production verification partial | Added RTL direction, Arabic onboarding/recovery copy, narrow-viewport wrapping, and reduced-motion loading. English authenticated iframe and Arabic unauthenticated recovery state verified live. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `134b7f92-6689-40aa-98bd-e7e752955ecc` | Deployed; production verification partial | Added delivery-aware welcome bookkeeping, durable catalog state, required-scope validation, and authenticated catalog retry. Fresh install, completed 20-product sync, forced failure/retry, and authenticated Arabic passed. Email delivery, token refresh, and exact viewport matrix remain unverified. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `5321bb89-8975-4ba0-8260-30905a485642` | Deployed; production verification partial | Added the atomic Salla refresh lease fix, configured `EMAIL_FROM`, and preserved `prizeskout.qa/*` plus the `app.prizeskout.qa` custom domain. Both public domains returned 200; unauthenticated embedded bootstrap returned expected 400. `RESEND_API_KEY` exists, but no email activity was observed. Its value was later exposed by Resend's one-time display; the user accepted that risk and directed that the key remain active. Delivery verification remains required. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `bab47b84-5fbd-4b8d-8caf-ffc2ce5528cb` | Deployed; logged-in smoke verification passed with one contained dependency gap | Deployed evidence-gated margin output, per-product currency, channel-scoped sync state and promotion simulation, corrected 25% coverage, evidence-vault messaging, and Copilot fallback to legacy cost versions. Apex, app, and embedded Salla routes returned 200. Logged-in Salla sync retained 32 products; margin, promotion, evidence, Store Manager, and Copilot flows passed. Order Guard still returns contained HTTP 503 because its production tables are not provisioned. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `c0f6ff05-db76-4ebc-87d6-cf84096cd6ee` | Deployed; Zid standalone smoke passed, embedded merchant verification pending | Deployed state-bound Zid marketplace OAuth, idempotent passwordless provisioning/welcome metadata, localized embedded bootstrap/checklist/retry, correct native-currency catalogue formatting, and channel-scoped promotion selection. Live Zid sync retained 12 Zid products; catalogue showed SAR 999 consistently and the Zid scenario showed 12 products. The Zid merchant dashboard remained at its login screen, so fresh install/email and authenticated iframe verification are pending. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `2710a628-5fac-468f-aaea-bbf6c8e575aa` | Deployed; authenticated Zid embedded verification passed except fresh-install email | Added Zid's `language=ar` locale handling, document-level RTL/language metadata, and localized missing-store-name fallback. Authenticated store `3181397` completed embedded 9-product retry, full workspace handoff, reopen persistence, Arabic RTL, and 375/768/1440 overflow checks. Fresh-install email remains unverified because the demo app predates provisioning and uninstall/reinstall requires confirmation. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `6b718054-cd9b-4474-91ee-6e12766053f3` | Deployed; logged-in standalone merchant regression passed | Corrected recovery currency provenance and mixed-currency presentation, retained currency on new cases, translated internal workflow diagnostics, and replaced the unavailable Order Guard form/503 with a safe readiness state. Live AI Store Manager and Evidence & History verification passed; no protected merchant action was submitted. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `5e9eb3f0-f9a7-4b16-9807-96bc62d1e10e` | Automatically deployed then rolled back | Cloudflare's automatic build omitted required client Supabase environment values and caused the dashboard error boundary. Rolled back to `6b718054-cd9b-4474-91ee-6e12766053f3`; no data mutation was involved. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `8bbd6b31-f7b9-4829-ba5c-beda14ab2a33` | Deployed; AI Store Manager regression passed | Final 50-prompt audit hardening: authenticated manager API, direct read-only answers, safe JSON repair/failure, authoritative 8/32 catalogue cost coverage, explicit missing-commerce limitation, exact missing-currency labels, and deterministic removal of inferred recovery currency. Bulk repricing remained approval-gated and was not executed. Supersedes intermediate versions `7b4341a6-594f-44e1-bcd2-6adcad2ad781`, `56d7af70-7c73-4844-af77-5a4983dcbebb`, and `eeeac187-82df-459f-b08b-ece9ca613481`. |
| 2026-09-29 | Cloudflare Worker `prizeskoutqa` | `089bdce8-a787-4c2d-b1b2-9679eef6d0fe` | Git deployment passed; automatic-build incident corrected | Commit `5a4652e` built with the three configured `VITE_SUPABASE_*` variables and deployed successfully. Apex, app, Salla embedded, and Zid embedded routes returned 200; the logged-in dashboard loaded without the missing-environment error. |

## Rules

- Never edit a migration marked deployed or reported deployed.
- Never deploy an “unknown” migration merely because it exists.
- Before deployment, identify dependencies, inspect production state, and update the current task packet.
- After deployment, record date, environment, operator confirmation, verification, and rollback/containment notes.
