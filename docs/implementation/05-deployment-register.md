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

## Rules

- Never edit a migration marked deployed or reported deployed.
- Never deploy an “unknown” migration merely because it exists.
- Before deployment, identify dependencies, inspect production state, and update the current task packet.
- After deployment, record date, environment, operator confirmation, verification, and rollback/containment notes.
