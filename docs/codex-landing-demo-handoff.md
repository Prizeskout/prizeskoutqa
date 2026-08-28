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

Test all six workflows at desktop and mobile sizes. Verify that each begins at stage 0, reaches its completed state, and that every interactive control changes the correct downstream values or status. Confirm that keyboard focus pauses rotation, focus states remain visible, there is no horizontal overflow or animated cursor, and the completed UI remains fully understandable under `prefers-reduced-motion: reduce`. Run `npm run typecheck` and `git diff --check`. Preserve unrelated working-tree changes. Do not commit or push unless I explicitly ask.
