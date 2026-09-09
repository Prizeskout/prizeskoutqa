# Codex continuation prompt — PrizeSkout landing product demo

Continue improving the PrizeSkout landing page at `/new-landing-page` as a senior product designer and frontend engineer. Use the installed `ui-ux-pro-max`, `ui-ux-design-pro`, and `frontend-animation` skills. Do not browse or copy another landing page unless I explicitly ask.

The product demo must feel like a real PrizeSkout dashboard session, not a slideshow, video player, generic SaaS animation, or decorative concept. Preserve all existing landing-page copy exactly unless I explicitly authorize copy changes. Do not add animated cursors, pause buttons, loaders, progress bars, fake browser chrome, gratuitous glow, floating particles, or generic fade-and-slide effects.

Current implementation:

- `src/components/landing/LiveDashboardDemo.tsx` renders six staged workflows using realistic seeded commerce data.
- `src/components/landing/LiveDashboardDemo.css` matches the real PrizeSkout dashboard structure and visual language.
- The six workflows are True Margin Intelligence, Payout Recovery, Promotion Simulator, Defend Loop, AI Store Manager, and CFO Copilot.
- Each workflow moves through real cause-and-effect states: inputs arrive, calculations change, exceptions appear, merchant approval occurs, and evidence is retained.
- Automatic playback is only the introduction. The visitor can select an order to inspect its economics, run payout reconciliation, change promotion discount values and see projections recalculate, change the Defend Loop margin floor and approve the policy, approve or defer AI Store Manager work, and ask CFO Copilot different questions.
- Focus or direct interaction pauses landing-page workflow rotation so the visitor retains control. Do not reset their in-progress interaction unexpectedly.
- `src/components/landing/NewLandingPage.tsx` controls workflow selection and autoplay.
- `src/components/landing/LandingMotion.css` handles restrained page-level choreography.
- Reduced-motion support is mandatory.

Before editing, inspect the real dashboard components and terminology under `src/components/dashboard/`, especially payout recovery, promotions, margin intelligence, Defend Loop, AI Store Manager, CFO Copilot, and Evidence & History. Keep the landing demo visually and behaviorally aligned with those product surfaces. If a real account state has no data, seed credible Qatar/GCC commerce data rather than showing an empty state.

Improve the work by making each state transition more causally legible and product-authentic. Animate changing values, inserted rows, reconciliation results, rule evaluation, approval states, and retained evidence—not decoration. Preserve the hybrid interaction model: autoplay teaches first, then direct manipulation takes over without a mode switch. Controls must produce immediate visible feedback and meaningful downstream state changes. Direct interactions should respond in roughly 120–220ms; dashboard state changes can take 350–700ms; staged workflow pauses should be long enough to read. Never animate layout properties when transform and opacity can express the same change.

## Highest-priority problem to solve next

The current state changes are too subtle and too slow to notice casually. A visitor may not realize the dashboard is doing anything unless they stare closely. Fix this before adding more features. The demonstration must be understandable in peripheral vision and must make the active cause, changing state, and completed result unmistakable.

- Increase the visual amplitude of meaningful transitions while keeping the interface professional. Do not solve this with glow, pulsing labels, animated cursors, progress bars, or arbitrary bouncing.
- Use controlled camera/focus effects inside the dashboard surface: briefly zoom the relevant region to roughly `1.04–1.08`, shift the viewport toward it, then settle back once the state is understood. Never scale the entire landing-page section or make text blurry.
- Combine zoom with concrete state change: a newly entered value, inserted order row, changing KPI, highlighted discrepancy, approval panel, or retained evidence card must transform together as one event.
- Make the event sequence faster and more decisive. Target approximately `180–320ms` for field entry and row insertion, `320–520ms` for recalculation or status transitions, and `700–1100ms` of readable hold time before the next event. A complete autoplay workflow should generally communicate its outcome in `4–6 seconds`, not feel like an eight-second slideshow.
- Use clear anticipation and consequence. Example: the promotion value changes, the requested scenario visibly recalculates, the margin breaches its floor, then the protected alternative comes forward. Do not reveal all cards at once.
- Changing numbers should animate from their prior values or visibly replace them; rows should enter at the point they are added; detected risks should create a strong but brief focus state; approval should visibly alter the downstream policy and evidence state.
- Use one dominant focal point at a time. Temporarily reduce unrelated regions to about `0.82–0.9` opacity while the active region moves forward, then restore them. The visitor should always know where to look without instructional labels.
- Add small spatial continuity between steps: the result of one step should visually lead into the next panel. Avoid disconnected fades and avoid treating each state as a separate slide.
- Autoplay must restart cleanly when a workflow is selected, pause as soon as the visitor interacts, and never advance away while the visitor is examining a result.
- Test the animation at normal viewing distance and at 1× playback. If a tester cannot describe what changed after one casual viewing, the choreography is not obvious enough.

The desired feeling is a real operator completing work quickly inside PrizeSkout—not a slideshow, a product-tour overlay, or a portfolio animation. Motion should be bold enough to read immediately, but every movement must correspond to an authentic product event.

Test all six workflows at desktop and mobile sizes. Record the complete autoplay sequence and at least one direct interaction sequence for review; static screenshots are insufficient for judging this task. Verify that each workflow begins at stage 0, communicates its completed outcome within 4–6 seconds, and that every interactive control changes the correct downstream values or status. Confirm that keyboard focus pauses rotation, focus states remain visible, there is no horizontal overflow or animated cursor, and the completed UI remains fully understandable under `prefers-reduced-motion: reduce`. Run `npm run typecheck` and `git diff --check`. Preserve unrelated working-tree changes. Do not commit or push unless I explicitly ask.
