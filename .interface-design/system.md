# PrizeSkout Dashboard Design System

## Direction

**Personality:** Financial command center with an evidence-ledger signature  
**Foundation:** Cool-neutral operational surfaces with warm paper highlights  
**Depth:** Quiet layered shadows; borders provide structure and shadows indicate elevation

PrizeSkout serves restaurant operators and finance leaders who need to identify margin risk, approve protected actions, and verify retained outcomes. The product should feel calm, accountable, precise, and operational.

## Tokens

### Spacing

Base: 4px  
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Colors

- Ink navy: `#0A1734` — navigation and authority
- Command ink: `#0F1F3D` — primary text
- Paper canvas: `#F3F5F9` — application background
- Raised paper: `#FFFFFF` — cards and panels
- Inset paper: `#F7F8FB` — inputs, table headers, nested regions
- Ledger line: `#E2E7EF` — default structural border
- Muted copy: `#657492` — supporting text
- PrizeSkout orange: `#F36A21` — primary decisions and calls to action
- Evidence green: `#0D9F6E` — verified and retained states
- Risk amber: `#C98212` — review and attention states
- Destructive red: `#C43D32` — failures and destructive actions

### Radius

- Controls: 8px
- Compact panels: 10px
- Cards: 12px
- Large overlays: 16px
- Pills: 999px

### Typography

- Interface and data: Plus Jakarta Sans, then Inter and system fallbacks
- Display headings: 650–750 weight with tight tracking
- Body: 13–14px at 1.5 line height
- Operational labels: 10–11px, 700 weight, tracked uppercase
- Financial values: tabular numerals with tight tracking

## Patterns

- A stable ink-navy navigation rail across every workspace.
- A compact frosted command header that preserves context during scrolling.
- One primary decision or outcome area per page; supporting evidence is visually quieter.
- Page titles state the workspace; eyebrow labels state the operational context.
- Cards use white raised paper, subtle ledger borders, and quiet layered shadows.
- Orange identifies the primary action, never decoration.
- Green, amber, and red always include text or an icon so color is not the only signal.
- Tables use inset headers, tabular values, stable row hover, and horizontal containment on small screens.
- Drawers and dialogs open inside the app, trap attention, and preserve the originating context.
- Loading, empty, error, and disabled states retain the same card geometry to avoid layout shift.

## Signature: Evidence Rail

Key workflows should expose a consistent sequence: source → confidence → recommendation → approval → retained outcome. Existing data remains intact; the signature is expressed through headings, status treatments, timelines, and evidence summaries rather than decorative graphics.

## Responsive Behavior

- Phone: one column, 44px targets, drawer navigation, actions span available width.
- Tablet: two-column summaries where useful; dense tables scroll within their own region.
- Laptop: persistent sidebar, compact four-column metrics, primary work area emphasized.
- Wide desktop: content capped for readable scan paths rather than stretching cards indefinitely.

## Decisions

- 2026-09-11: Align dashboard craft with the public landing page while keeping all existing workflows and content.
- 2026-09-11: Reject equal-weight demo-card grids in favor of operational hierarchy and progressive disclosure.
- 2026-09-11: Use brand orange only for decisions and primary actions; blue is informational, not a competing CTA color.
