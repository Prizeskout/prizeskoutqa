# Decision Log

## ADR-001 — API-independent core

Core reconciliation must operate from merchant-controlled evidence. APIs improve speed and detail but are optional adapters.

## ADR-002 — Separate financial truths

Order truth, contract truth, payout truth, and receipt confirmation are stored and explained separately.

## ADR-003 — Bank evidence is optional

Bank evidence strengthens confirmation that funds arrived but must not be compulsory for calculating payout correctness.

## ADR-004 — Append-only evidence and conclusions

Evidence, processing attempts, normalized revisions, agreement matches, findings, approvals, and recovery transitions preserve history rather than being overwritten.

## ADR-005 — Merchant approval for protected actions

PrizeSkout may collect, calculate, explain, and prepare. Disputes, external messages, refunds, promotions, pricing changes, and comparable actions require explicit authorization.

## ADR-006 — Conservative parsing

Unknown or drifted document layouts stop for review. Aggregate evidence remains aggregate and cannot create invented order records.

## ADR-007 — Evidence strength over opaque confidence

User-facing conclusions use evidence states and explicit blockers rather than an unsupported generic confidence percentage.

## ADR-008 — Outcome before breadth

PrizeSkout will prioritize first verified finding and controlled recovery before general restaurant BI, voice, reviews, labor, or loyalty features.

## ADR-009 — Retain Salla Easy Mode

The production Salla App Store integration remains in Easy Mode unless Salla provides an app-specific written requirement to change it. Salla's current authorization documentation labels Easy Mode recommended and states that it is the only mode allowed for published App Store apps; Custom Mode is the manual callback/code-exchange path used for testing. The 14-day access-token lifetime applies to Salla OAuth generally, not only Easy Mode. With `offline_access`, both designs still require safe refresh-token rotation; refresh tokens last one month and are single-use. PrizeSkout therefore keeps Easy Mode and supplies the missing product transition through a verified embedded page, backend token introspection, idempotent account linking/provisioning, guided onboarding, and a serialized refresh lease.

## ADR-010 - Decision-first financial overview and Truth Trail

The Overview leads with one evidence-bounded conclusion and its next safe action rather than an equal-weight metric wall. A reusable Truth Trail presents orders, commercial terms, expected payout, payout evidence, finding, merchant approval, and receipt confirmation as distinct stages with explicit verified, review, missing, or optional labels. Missing receipt confirmation is never implied by a payout summary, and protected actions remain approval-gated.

## ADR-011 - Parallel, feature-gated Dashboard V2 migration

The supplied dashboard prototype is a visual reference rather than production code. PrizeSkout will rebuild it inside the existing React application behind an internal preview route and a production-off feature flag. The current dashboard remains the fallback until merchant-scoped backend contracts, financial parity, responsive behavior, permissions, and protected-action boundaries are verified. Prototype sample values, browser-only calculations, fake live feeds, and local approval state are never shipped as merchant truth.

## ADR-012 - Canonical public margin endpoint

The supported public margin contract is the endpoint documented in `api-spec.ts`: `POST /v1/margin`. Legacy `/v1/margin/costs`, `/channels`, `/sku`, `/breakeven`, and `/impact` handlers are not published by the gateway and must not be treated as supported production routes. Verification targets the documented sandbox contract, proves synthetic non-mutating provenance, and fails on every unexpected non-2xx or malformed response. Publishing any legacy subroute requires a separate contract, scope, tenancy, and migration review.
