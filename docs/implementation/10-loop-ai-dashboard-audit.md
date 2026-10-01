# Loop AI dashboard audit for PrizeSkout

Date: 2026-10-01

## Evidence boundary

- Current Loop public product pages were reviewed. No authenticated Loop account was accessed.
- PrizeSkout was reviewed from the current implementation, the established dashboard design system, retained product-film screenshots, and prior dashboard-reference commits.
- The logged-in PrizeSkout browser tab was available, but browser control timed out twice. No live authenticated UI state is claimed from this session.
- The active implementation task remains `P0-ZID-001`; this design audit does not change the Zid authorization blocker or customer-readiness state.

## What Loop does well

1. **One governed foundation before AI output.** Loop frames connectors, approved definitions, validation, mappings, and lineage as the foundation for finance, marketing, and operations answers.
2. **Conversation creates usable views.** The user asks for an analysis, sees reasoning/progress, receives a scoped dashboard, and can refine or add the result to a dashboard.
3. **Every view answers an operational question.** Examples emphasize busiest daypart, worst error rate, bank shortfall, disputable amount, or offer performance instead of displaying generic charts.
4. **Scope stays visible.** Location, marketplace, date, audience, and tender controls remain attached to the answer they affect.
5. **Financial flows are explained as sequences.** `Sales → settlement → books` makes reconciliation easier to understand than disconnected totals.
6. **Role-specific agents share the same model.** Finance, marketing, and operations feel specialized without becoming separate data products.

## What PrizeSkout should borrow

- The interaction loop: **ask → inspect reasoning/status → receive evidence-bounded result → refine → retain**.
- A persistent scope strip for period, branch, channel, currency, and evidence coverage.
- One dominant answer or decision per screen, with supporting detail progressively disclosed.
- A visual financial sequence that keeps order truth, contract truth, payout truth, and receipt confirmation distinct.
- Contextual `Refine`, `Explain`, `Compare`, and `Save to review` actions on analytical modules.
- Visible definition, source, freshness, and lineage details near every decision-grade metric.

## What PrizeSkout should not borrow

- Loop's broad workforce scope across labor, cameras, loyalty, reviews, and voice briefings. These conflict with PrizeSkout's near-term financial-evidence wedge.
- Connector-count marketing as a proxy for reliable coverage.
- Generic BI charts that are not tied to a merchant decision.
- AI output that obscures deterministic calculations or approval boundaries.
- Any presentation that makes incomplete, inferred, stale, demo, or shadow data look verified.

## Current PrizeSkout UI findings

### 1. Navigation exposes the product map, not the merchant's workday

The sidebar presents more than a dozen destinations with similar visual weight. Monitoring, recovery, automation, agents, integrations, evidence, and settings compete at once. This increases choice cost and makes the merchant remember the architecture.

Recommendation: group destinations into four mental models:

- **Today:** Overview, Attention, Ask PrizeSkout
- **Money:** Margin, Payout Recovery, Promotions
- **Store:** Catalog, Store Manager, Connections
- **Records:** Evidence, Settings

The sidebar may retain direct links, but only the four groups and the current context should dominate.

### 2. Overview is an equal-weight tile wall

Payout metrics, margin metrics, health donuts, alerts, action queues, and integrations sit on nearly the same plane. The page has information density but no decisive focal point.

Recommendation: lead with one `Today's financial position` module containing the most important supported conclusion, its evidence strength, its amount, and one next action. Put supporting metrics below it.

### 3. Empty evidence looks like a finished dashboard

Repeated `0`, `Not calculated`, and `Not confirmed` cards consume the same space as real findings. In retained screenshots, an empty margin chart still shows uniform percentages, which risks implying evidence that is not present.

Recommendation: replace empty metric grids with one evidence-readiness module that explains what is missing, why it matters, and the shortest path to first verified value. Never draw a quantitative chart from fallback or placeholder values.

### 4. The AI manager is conversational but not yet an operating surface

The command deck supports natural conversation, but prepared work, deterministic preview, approval, connector receipt, and readback are not presented as one coherent lifecycle. The recent `Task prepared` and Zid 401 audit exposed this gap.

Recommendation: every operational response should use the same five-state card:

`Prepared → checked against live scope → awaiting approval → sent → verified by readback`

Each state must show the exact product/store, fields, source, timestamp, and failure recovery action.

### 5. Scope and provenance are too far from the numbers

The financial-scope controls are useful, but evidence freshness and definition provenance are not visually attached to each result.

Recommendation: add a compact evidence footer to decision-grade modules: `source · period · definition · freshness · confidence`. Selecting it opens the evidence trail rather than a generic detail page.

## Proposed direction

### Intent

The primary human is a GCC restaurant or commerce operator opening PrizeSkout between daily operational tasks. They need to know whether money is missing, why margin moved, and what they can safely approve. The product should feel like a calm control room with an auditor beside them: precise, protective, and fast.

### Domain

- Ledger
- Settlement
- Evidence packet
- Reconciliation bridge
- Margin guardrail
- Approval seal
- Receipt
- Chain of custody

### Color world

- Ink navy from signed financial records
- Warm paper from invoices and statements
- Ledger-rule blue-gray
- PrizeSkout orange for merchant decisions
- Evidence green for verified outcomes
- Risk amber for review states
- Destructive red only for failures or irreversible actions

### Signature

**Truth Trail:** a compact, reusable rail that shows `order → terms → expected → payout → finding → approval → receipt`. It appears on Overview, Payout Recovery, Margin Intelligence, and AI actions, making PrizeSkout identifiable even without its logo.

### Defaults to reject

- Equal card grids → replace with one dominant decision plus quieter supporting evidence.
- A long flat sidebar → replace with four merchant-work groups and contextual secondary navigation.
- Generic assistant chat → replace with evidence-linked answer cards and a visible protected-action lifecycle.

### Component checkpoint

- **Palette:** keep the existing ink navy, paper, orange, evidence green, amber, and red because they map naturally to records, decisions, verification, review, and failure.
- **Depth:** use the existing quiet layered-shadow system consistently; navigation and dense tables use borders, while only decision cards and overlays receive lift.
- **Surfaces:** paper canvas → raised evidence card → overlay/detail. Avoid introducing unrelated tinted surfaces.
- **Typography:** retain Plus Jakarta Sans and tabular numerals; make the primary conclusion larger and reduce uppercase micro-label density.
- **Spacing:** retain the 4px base; use 16–20px inside operational cards and 24–32px between decision regions.

## Recommended implementation slices

1. **Overview hierarchy:** replace the six equal top metrics with a dominant `Today's financial position` card and a compact evidence-readiness strip.
2. **Truth Trail component:** implement a reusable, accessible order/contract/payout/receipt sequence with explicit unknown states.
3. **Scoped intelligence modules:** attach period, branch, channel, definition, freshness, and evidence strength to each material result.
4. **AI action lifecycle:** unify prepared, approval, execution, connector receipt, and readback in the command deck.
5. **Navigation simplification:** introduce four merchant-work groups without deleting existing routes.
6. **Empty-state integrity:** remove placeholder quantitative charts and replace them with guided first-value actions.
7. **Responsive and accessibility pass:** verify keyboard flow, 44px targets, focus states, reduced motion, RTL, and 375/768/1440 layouts.

## Recommended first implementation

Start with **Overview hierarchy + Truth Trail**. This gives the largest improvement without changing financial calculations, connector permissions, or protected actions. Keep the current Zid authorization recovery as the active operational blocker and do not imply that the redesign resolves it.
