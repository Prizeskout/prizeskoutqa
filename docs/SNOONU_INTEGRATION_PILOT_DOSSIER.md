# Snoonu–PrizeSkout Integration Pilot Dossier

## Executive decision

PrizeSkout should not present the integration as a binary choice between “our API” and “Snoonu’s API.” The strongest proposal is one product with two supported connection modes behind a common data contract:

1. **Snoonu-sponsored partner connection — preferred for the pilot.** Snoonu authorizes selected merchant/branch IDs in its back office and either pushes events to PrizeSkout webhooks or gives PrizeSkout partner-scoped, read-only API access. This removes credential handling from restaurants and gives Snoonu control over pilot membership.
2. **Merchant-delegated connection — preferred for later scale.** A merchant clicks “Connect Snoonu” and grants PrizeSkout branch-specific scopes. Use OAuth 2.0 Authorization Code with PKCE if Snoonu supports it. If Snoonu currently uses portal-issued restaurant credentials, use a Snoonu-approved credential exchange/provisioning flow—not merchant portal passwords.
3. **Report import — continuity fallback.** PrizeSkout already parses one verified Snoonu Brand Performance Report layout. Keep this for reconciliation continuity and merchants outside API coverage, but do not position it as the strategic integration.

The first meeting should seek agreement on a **read-only, one-to-three merchant, 30-day pilot**, not production write access. Ask for orders, line items, adjustments, settlements, merchant/branch identity, catalog and availability. Defer automatic price/menu writes until PrizeSkout proves reconciliation accuracy, security, operational reliability and merchant value.

This recommendation is evidence-led. Snoonu exposes a merchant portal and merchant app, and public onboarding material describes centralized merchant order management, but no public Snoonu developer or OAuth documentation was found.^1,2 At the same time, Deliverect and Grubtech both advertise direct, two-way Snoonu integrations, demonstrating that a private partner interface exists or can be provisioned.^3,4 Snoonu’s parent, Jahez, currently supports an integration pattern involving a per-restaurant ID/secret and a branch integration ID, which is a strong warning not to assume Snoonu has merchant OAuth today.^5

## Why this opportunity is strategically credible

The CEO’s response is not a generic courtesy: he explicitly asked to see how PrizeSkout’s AI-driven insights can support the merchant ecosystem and delegated pilot exploration to Zaid Naqawa. Snoonu publicly identifies Zaid as **Head of Accounts – Restaurants**, responsible for partner relationships and shared growth.^6 He is therefore an excellent commercial pilot owner, but the meeting should also produce named counterparts in engineering/API partnerships, data governance/security, and finance/settlements.

The timing is favorable. Jahez completed a 76.56% acquisition of Snoonu in October 2025 for $245 million. Jahez reports that Snoonu’s 2025 GMV grew 66% year over year and gross revenue grew 72%, and it intends Snoonu to become the group’s primary international operating platform.^7 Jahez specifically cites technology integration and operational synergies as priorities.^7,8 A merchant-profitability layer can fit that agenda if framed as merchant retention, healthier unit economics, reduced disputes and measurable recovered value—not merely a third-party analytics dashboard.

The strategic message for Snoonu should therefore be:

> PrizeSkout gives Snoonu a controlled merchant-profitability capability: it reconciles what should have happened against what was reported, identifies preventable leakage, and recommends margin-safe actions. Snoonu retains merchant access control; the pilot begins read-only; every insight is evidence-linked and measurable.

Avoid implying that PrizeSkout has “trained on Snoonu data” unless PrizeSkout can prove lawful provenance, permission and methodology. Some current UI/demo copy makes that claim; it should not be shown in a partner meeting without substantiation.

## Publicly established facts and unknowns

### Established

- Snoonu operates a merchant portal and a dedicated merchant application for processing orders, tracking statuses and communicating with customers.^1,2
- Snoonu’s merchant onboarding is assisted rather than developer-self-service: merchants submit business documents and menus, and Snoonu helps set them up.^1
- Direct integration is technically possible. Deliverect describes a two-way Snoonu connection for orders, menus and POS flow; Grubtech describes orders, menu, availability and channel reporting.^3,4
- Snoonu/Jahez has a large and strategically important merchant ecosystem. Snoonu is multi-vertical—food, grocery, retail and logistics—and is intended as Jahez’s international platform.^7,8
- Qatar’s Personal Data Privacy Protection Law applies obligations to controllers and processors. NCSA guidance expects processor due diligence, written contracts, proportionate security precautions and breach notification processes.^9,10

### Not publicly established

No reliable public source establishes Snoonu’s API hostname, endpoint paths, schemas, sandbox, rate limits, authentication protocol, webhook signature method, token lifetime, scopes, pagination rules, settlement endpoints, API versioning or certification process. Any implementation that guesses these would be unsafe.

The existing PrizeSkout code correctly labels its guessed `partner-api.snoonu.com` host as non-existent, but still contains unreachable placeholder calls. Those paths must remain impossible to activate until Snoonu supplies an approved contract.

## Connection models

| Dimension | Snoonu-sponsored partner connection | Merchant-delegated connection | Report import fallback |
|---|---|---|---|
| Pilot speed | Best if Snoonu assigns an engineer and allowlists merchants | Good only if authorization already exists | Available now |
| Merchant effort | Minimal | One consent/credential step per legal entity or branch | Repeated manual exports/uploads |
| Snoonu control | Strong: allowlist, scopes, revocation | Strong if Snoonu owns authorization server | Limited |
| Data freshness | Webhook real time plus API backfill | Same | Monthly/daily, depending on export |
| Security | Partner credentials isolated server-side | Best with OAuth/PKCE and scoped refresh tokens | No long-lived platform credential |
| Reconciliation depth | Potentially order-to-settlement | Potentially order-to-settlement | Limited by report fields/layout |
| Scale | Requires partner governance | Best self-serve scale | Operationally weak |
| Recommended use | 30-day pilot and enterprise rollout | General merchant rollout | Continuity and verification |

### Model A: Snoonu calls PrizeSkout

PrizeSkout publishes a stable partner API and Snoonu sends authorized data. Recommended flow:

1. Snoonu provisions a `partner_id`, sandbox signing key and pilot merchant/branch allowlist.
2. Snoonu sends merchant, branch, catalog, order, adjustment and settlement events to versioned PrizeSkout endpoints.
3. PrizeSkout authenticates the partner, verifies the signed raw body and timestamp, rejects replays, stores an immutable receipt, and returns `202 Accepted` quickly.
4. Asynchronous workers normalize data, reconcile financial events and produce insights.
5. Snoonu can query delivery/reconciliation status or receive a result webhook.

This model is closest to the phrase “through our own APIs.” It must not mean that merchants somehow manufacture missing Snoonu data and post it to PrizeSkout. Snoonu should remain the authoritative source for platform orders, commissions, promotions, cancellations, refunds and payouts.

### Model B: PrizeSkout calls Snoonu

If Snoonu has OAuth, use Authorization Code with PKCE, exact registered redirect URIs, short-lived access tokens, rotating refresh tokens, one-time state, server-side token storage and least-privilege scopes. Current OAuth security best practice recommends PKCE even for confidential clients, exact redirect matching and protections against token replay.^11

If Snoonu instead follows the current Jahez-style model, the merchant may receive a restaurant ID, secret and integration branch ID from the portal.^5 In that case:

- Snoonu should explicitly approve PrizeSkout as an integration partner.
- Prefer Snoonu issuing credentials directly to PrizeSkout after merchant consent.
- Never ask for the merchant’s portal username/password.
- Store per-branch credentials encrypted, display only status/last four characters, support rotation and immediate revocation.
- Use read-only credentials for the pilot; require a separately approved scope/token for future writes.

PrizeSkout should use webhooks for changes and a cursor-based API for initial/backfill reconciliation. Constant order polling is an anti-pattern; mature integration platforms explicitly reserve polling for recovery and use webhooks for the normal flow.^12

## Minimum pilot data contract

### Identity

- `merchant_id`, legal entity and display name
- `brand_id`, `branch_id`, branch timezone and currency
- Snoonu external identifiers and stable lifecycle status
- effective dates for ownership/mapping changes

### Catalog and availability

- item and variant IDs, SKU/PLU, names in Arabic and English
- category, modifier groups/options, tax classification
- list price, sale price, availability, branch applicability
- item/menu version and `updated_at`

### Orders and financial events

- stable order ID, branch ID, timestamps and terminal status
- line item IDs, quantities, gross/list price and merchant-funded/platform-funded discounts
- taxes, delivery/service/payment fees, tips where relevant
- cancellation actor/reason, refund/partial-refund details
- commission amount and basis, other adjustments, net merchant receivable
- currency and monetary rounding convention

### Settlements

- payout/settlement ID, covered period and payment date
- order-level allocation where available
- debit/credit adjustment codes and descriptions
- gross, commission, tax-on-fees, payment fee, promotion contribution, penalties, other charges and net payout
- revisions and links to the superseded settlement

### Delivery semantics

Every event needs `event_id`, `event_type`, `occurred_at`, `schema_version`, merchant/branch identifiers and an idempotency key. Delivery should be at least once; PrizeSkout must deduplicate. Webhooks need a signed timestamp and nonce/event ID with a defined replay window. HTTP Message Signatures support covered components and nonces for replay detection, although Snoonu may choose a simpler documented HMAC scheme.^13

### Proposed read scopes

`merchant.read`, `branches.read`, `catalog.read`, `orders.read`, `adjustments.read`, `settlements.read` and `webhooks.manage`. Do not request customer contact details, precise delivery addresses, payment-card data or courier data; PrizeSkout does not need them for merchant profitability. Aggregate or pseudonymize customer identifiers if cohort analysis is later approved.

## Pilot architecture

```text
Snoonu sandbox / partner API
        |
        | signed webhooks + scoped backfill
        v
PrizeSkout partner gateway
  authentication -> replay check -> idempotent receipt -> 202
        |
        v
immutable raw event store -> canonical commerce events
        |                         |
        |                         +-> order/settlement reconciliation
        |                         +-> margin and leakage rules
        |                         +-> evidence-linked AI explanations
        v
audit trail, dead-letter queue, replay console, health metrics
        |
        v
merchant dashboard + Snoonu pilot scorecard
```

AI should explain and prioritize deterministic financial findings; it should not invent accounting facts or autonomously change prices. Every material finding should link to source event IDs and the calculation. Price/menu actions, if added after the pilot, require policy limits, preview, merchant approval, idempotency and rollback.

## Security, privacy and governance gate

Before real data, agree a data-processing agreement that identifies controller/processor roles, purposes, data categories, subprocessors, locations, retention, deletion, audit rights, incident notice, return/destruction on termination and restrictions on model training. Qatar NCSA guidance specifically places responsibility on controllers to conduct processor due diligence and formalize the relationship in writing.^9

Required controls:

- TLS in transit; encryption at rest; separate sandbox and production secrets.
- Tenant and branch authorization on every object, not just every endpoint. Authorization is the leading API security risk.^14
- Secrets in a managed vault, never source code or browser storage; rotation and revocation runbooks.
- Raw-body signature verification before JSON parsing; timestamp/nonce replay defense.
- Idempotent ingestion, bounded retries with jitter, dead-letter queue and reconciliation replay.
- Minimal personal data, field-level redaction in logs, retention limits and deletion workflow.
- Immutable audit events for connection, consent, import, calculation, approval, export and revocation.
- Incident contacts and a tested notification process. Qatar guidance requires notification when qualifying breaches threaten personal data.^9,10
- No use of Snoonu or merchant data to train shared models unless separately and explicitly authorized.

Qatar’s cloud policy is cloud-friendly, but emphasizes privacy, protection, transparency, interoperability and cross-border access governance.^15 PrizeSkout should disclose its Supabase/cloud regions and subprocessors rather than claiming Qatar residency it does not currently have.

## Current PrizeSkout readiness

### Reusable assets

- A generic channel record and vault structure already includes `snoonu`.
- The normalized commerce-event model already supports generic channels, evidence fingerprints, orders, refunds, settlement lines and payout totals.
- Idempotency, governance logs, reconciliation, recovery cases and evidence workflows are substantial foundations.
- One real Snoonu Brand Performance Report layout has a deliberately narrow parser, suitable as the fallback/control sample.
- Existing Talabat, Jahez, Salla, Zid and Keeta work provides patterns for OAuth, signed callbacks, channel identities, catalog sync and order lifecycle handling.

### Blockers before a live Snoonu test

1. **Remove or hard-disable guessed Snoonu network calls.** `defend-handler.ts` and `channel-vault.ts` reference a non-existent placeholder host.
2. **Implement an explicit Snoonu adapter boundary.** Do not add Snoonu conditionals across generic handlers. Define capabilities—auth, catalog, orders, settlements, webhooks and price writes—and enable only contract-confirmed capabilities.
3. **Expand ingestion contracts.** The current real-time `/v1/sync/ingest` allowlist is POS/ERP-oriented and excludes Snoonu. A separate partner-ingestion route is cleaner because Snoonu events have different trust and financial semantics.
4. **Create Snoonu-specific identity tables or typed mappings.** Account, legal entity, merchant, brand and branch must not be conflated.
5. **Add raw webhook receipts and per-event status.** Preserve the exact signed body, hash, delivery ID, schema version and processing result.
6. **Build order and settlement adapters only from supplied samples.** Do not infer fee semantics from field names.
7. **Fix dashboard connection truthfulness.** The UI currently states that live Snoonu API credentials are unavailable; keep it that way until the integration passes certification.
8. **Remove unsupported marketing claims.** “Trained on 11 months of Snoonu data” requires proof and permission.
9. **Review authentication around dashboard-facing channel endpoints.** Merchant identifiers alone must never authorize connection or status access.
10. **Resolve migration-history divergence and production resource pressure** before pilot load testing. Reliability will be part of Snoonu’s technical diligence.

## Thirty-day pilot

### Phase 0 — contract and samples (week 0)

Agree one business owner and one engineering owner per company. Select one to three merchants, one or two branches each, and a historical 30–90 day period. Receive API documentation, sandbox credentials, sample webhooks, sample payout statements, fee dictionaries and a merchant/branch mapping file. Agree the ground-truth reconciliation formula and success metrics.

### Phase 1 — read-only sandbox (week 1)

Implement authorization, webhook verification, raw receipts, canonical mapping and API backfill. Pass negative tests: invalid signature, replay, duplicate event, out-of-order update, token expiry, rate limiting, schema addition and upstream timeout. Demonstrate that no event is lost and no duplicate affects totals.

### Phase 2 — shadow production (weeks 2–3)

Enable allowlisted production data read-only. Run calculations invisibly beside existing merchant processes. Reconcile order counts, GMV, cancellations, refunds, fees and payouts against Snoonu finance exports. Review discrepancies jointly; do not show disputed findings as facts.

### Phase 3 — merchant value review (week 4)

Expose validated findings to pilot merchants and Snoonu’s account team. Require human approval for recommended actions. Produce a scorecard and decide whether to expand merchants, add daily insights, or begin a separately governed write-action pilot.

### Acceptance metrics

- ≥99.9% accepted event delivery excluding valid rejects
- 100% duplicate suppression in replay tests
- ≥99.5% order-count agreement for the agreed scope
- monetary reconciliation variance ≤0.5% after documented timing/rounding exclusions
- every finding traceable to source records and formula version
- zero cross-tenant access and zero unapproved personal-data fields
- webhook acknowledgment p95 <500 ms; asynchronous processing p95 <5 minutes
- measurable merchant outcome: recovered leakage, avoided loss, reduced dispute effort or improved contribution margin

Do not promise a specific uplift before observing pilot data. Agree how value is measured and which party validates it.

## Meeting plan

### Opening (three minutes)

Thank Zaid for the opportunity. Re-state the CEO’s objective: support Snoonu’s merchant ecosystem. Show one concise flow—data in, evidence-linked reconciliation, merchant action—and one real anonymized output. Avoid a broad product tour.

### Discovery (ten minutes)

Ask in this order:

1. What merchant problem does Snoonu most want the pilot to improve: payout trust, profitability, retention, menu economics, promotion ROI, or account-team efficiency?
2. Which one to three merchants and branches can provide representative data and rapid feedback?
3. Does Snoonu prefer partner-wide provisioning, merchant consent, or portal-issued restaurant credentials?
4. Are Deliverect/Grubtech integrations powered by a common partner API? Can PrizeSkout join the same certification path?
5. What environments, API versions, scopes, rate limits and IP/network controls exist?
6. Are orders and settlements both available? Can settlement lines be allocated to order IDs?
7. How are merchant-funded versus Snoonu-funded promotions represented?
8. Which cancellation/refund actors and adjustment codes are authoritative?
9. Are events pushed by webhook? What are retry, ordering, signature and replay semantics?
10. What data must remain in Qatar, and what security/vendor assessment is required?
11. Who owns technical integration, finance validation and data protection?
12. What result and timeline would cause Snoonu to expand the pilot?

### Proposal (five minutes)

Offer the hybrid model and a read-only 30-day pilot. Make Snoonu’s control explicit: merchant allowlist, narrow scopes, revocation, no consumer PII, no automated writes, and joint validation.

### Close (two minutes)

Do not end with “we will follow up.” Secure:

- technical and finance contacts;
- pilot merchant/branch candidates;
- NDA/DPA/security-review owner;
- API documentation/sandbox/sample-data delivery date;
- a 60-minute technical workshop date;
- written pilot success criteria.

## Negotiation boundaries

### Offer readily

- a time-boxed, read-only pilot;
- merchant-level isolation and Snoonu-controlled allowlisting;
- shared pilot scorecard and jointly reviewed findings;
- reasonable sandbox support and a limited custom adapter;
- deletion/return of pilot data under agreed terms.

### Do not concede prematurely

- exclusivity across Qatar or the GCC;
- ownership of PrizeSkout’s pre-existing models, normalization layer or generic connectors;
- unrestricted rights to train on PrizeSkout outputs or merchant data;
- unlimited bespoke engineering without commercial milestones;
- production write access before shadow validation;
- liability uncapped beyond the company’s realistic insurance/capacity;
- public performance claims before joint validation.

Separate background IP, Snoonu confidential information, merchant data, derived merchant-specific outputs and aggregated/de-identified learnings in the contract. Define whether Snoonu, the merchant or both may access each output.

## Immediate preparation checklist

- Prepare a two-minute demo using one anonymized Snoonu report and show exact evidence-to-finding traceability.
- Produce a one-page architecture/data-flow diagram and a one-page pilot charter.
- Prepare a data dictionary and sample webhook/OpenAPI contract based on the fields above, clearly labeled **proposal—not Snoonu’s actual API**.
- Create a security pack: company details, hosting regions, subprocessors, encryption, access control, logging, retention, incident response and penetration-test status.
- Identify one engineer who can answer webhook, OAuth, mapping and reliability questions live.
- Create a sanitized sample dataset with orders, refund, promotion split, commission and payout allocation.
- Prepare an NDA and short DPA draft for counsel review.
- Remove unsupported Snoonu claims and keep the broken connector disabled before any shared demo.
- Decide commercial hypotheses, but postpone pricing until scope and value are clear. Suitable later models include platform-funded pilot then per-active-merchant/branch SaaS, or merchant-paid SaaS distributed through Snoonu; avoid revenue share until the measurable value base is unambiguous.

## Bottom line

The winning posture is not “please give us an API.” It is: **Snoonu controls access; PrizeSkout minimizes data; the pilot is read-only and measurable; integration can support either partner provisioning or merchant delegation; and every financial insight is auditable.**

Public evidence proves Snoonu integrates with third parties, but it does not reveal the contract. The next dependency is organizational, not speculative coding: obtain the real integration owner, documentation, sandbox and financial samples. PrizeSkout should build the adapter only after those arrive, using its existing normalized event and reconciliation foundations.

## Sources

1. Snoonu. “[Become a Partner](https://partner.snoonu.com/).” Accessed September 2026.
2. Snoonu Trading and Services. “[Snoonu Portal](https://play.google.com/store/apps/details?id=com.snoonu.merchantportal).” Google Play, updated August 28, 2025.
3. Deliverect. “[Snoonu orders integrated to your POS](https://www.deliverect.com/en/integrations/snoonu).” Accessed September 2026.
4. Grubtech. “[Connect Snoonu with Grubtech](https://grubtech.com/en/integrations/snoonu/).” Accessed September 2026.
5. Deliverect. “[Jahez: Configure the Integration](https://help.deliverect.com/en/articles/13462166-jahez-configure-the-integration).” January 26, 2026.
6. Snoonu. “[Meet Zaid, Head of Accounts – Restaurants](https://www.linkedin.com/posts/snoonu-qatar_your-favorite-restaurants-dont-just-appear-activity-7495787399822671872-Pl5E).” LinkedIn, 2026.
7. Jahez Group. “[CFO’s Review](https://jahezgroup.com/jahez-ar/2025/leadership/cfo/).” 2025 Annual Report.
8. Jahez Group. “[Snoonu Acquisition Case Study](https://jahezgroup.com/jahez-ar/2025/snoonu-case-study/).” 2025 Annual Report.
9. Qatar National Cyber Security Agency. “[Controller and Processor Guidelines for Regulated Entities](https://assurance.ncsa.gov.qa/sites/default/files/library/2022-09/Controller%20and%20Processor%20-%20Guideline%20for%20Regulated%20Entities%20%28English%29.pdf).” Version 2.0.
10. State of Qatar, Ministry of Justice. “[Law No. 13 of 2016 on Protecting Personal Data Privacy](https://almeezan.qa/EnglishLaws/132016.pdf).” Official Gazette No. 15 of 2016.
11. IETF. “[RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/info/rfc9700/).” January 2025.
12. Deliverect. “[Public API Documentation](https://www.postman.com/deliverect/api-team/documentation/edifiys/deliverect-public-api).” Accessed September 2026.
13. IETF. “[RFC 9421: HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html).” February 2024.
14. OWASP Foundation. “[API Security Top 10 2023](https://owasp.org/blog/2023/07/03/owasp-api-top10-2023).” July 3, 2023.
15. Qatar Communications Regulatory Authority. “[Cloud Policy Framework](https://www.cra.gov.qa/-/media/System/A/B/3/F/AB3F01A7D2955C198BC8C1650FFDC104/Cloud-Policy-Framework.ashx).” June 2022.
