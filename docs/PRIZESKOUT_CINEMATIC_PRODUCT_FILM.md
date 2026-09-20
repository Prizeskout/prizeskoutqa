# PrizeSkout product film

## Creative direction

This is a continuous, product-led merchant story—not a slideshow, feature carousel, mock dashboard, or sequence of static screenshots.

A fictional but realistic Qatar restaurant merchant connects Snoonu to PrizeSkout. The film then follows the resulting data through the actual product: orders and catalogue ingestion, payout reconciliation, recovery evidence, product economics, pricing and promotion decisions, protected automation, delegated store work, and an executive answer from CFO Copilot.

The demonstration dataset may be controlled and synthetic, but every visible screen, interaction, calculation, and state transition must run through PrizeSkout's real application and engine paths.

## Master specification

- Audience: restaurant operators, finance teams, delivery platforms, and integration partners
- Runtime: 65–75 seconds
- Master: 1920×1080, 30 fps, 16:9
- Cutdowns: 30 seconds, 15 seconds, and 9:16
- Style: fast, precise, premium, confident, and enterprise
- Typography: Plus Jakarta Sans
- Palette: PrizeSkout navy, warm white, orange, and restrained mint for verified outcomes
- Audio: no narration; modern instrumental bed with restrained interface sound design
- Product rule: the interface must remain understandable when muted

## Story

### 00:00–00:03 — Enter the product

Open directly inside PrizeSkout. Use a brief wordmark transition only; the product must be visible by the third second.

On-screen copy: `From order to payout—verified.`

### 00:03–00:11 — Connect Snoonu

1. Open Integrations.
2. Select Snoonu for the merchant's Qatar location.
3. Confirm requested read scopes for merchant, branches, orders, catalogue, and settlements.
4. Complete the connection.
5. Show the connection changing from `Connecting` to `Live`.

The screen must clearly identify this as a controlled demonstration account. Do not imply that production Snoonu access exists without approved partner credentials.

On-screen label: `Connect once`

### 00:11–00:19 — Commerce data begins flowing

1. Show the sync activity feed receiving orders.
2. Let the order count, catalogue count, branch coverage, and last-sync timestamp update.
3. Open one received order and briefly reveal its normalized event timeline.

On-screen label: `Orders and catalogue, normalized in real time`

### 00:19–00:32 — Reconcile payouts

1. Open Payout Recovery.
2. Show an incoming settlement batch for the same Snoonu merchant.
3. Run reconciliation against contract terms and commerce evidence.
4. Animate the progress through matching, fee validation, and settlement verification.
5. Reveal matched orders, missing settlement lines, excess fees, expected payout, received payout, and total variance.
6. Open one discrepancy and its supporting evidence.

This is the lead product moment. Product costs must not appear as a prerequisite for payout reconciliation.

On-screen labels:

- `Reconstruct what should have been paid`
- `Find what is missing`

### 00:32–00:40 — Prepare recovery

1. Select the verified discrepancies.
2. Generate a recovery case.
3. Show the evidence pack: affected orders, contract rule, settlement reference, discrepancy reason, and recoverable total.
4. Leave external submission merchant-controlled.

On-screen label: `Recovery evidence, ready for review`

### 00:40–00:50 — Understand product economics

1. Open Catalogue or Margin Intelligence.
2. Show merchant-supplied or AI-assisted product costs arriving in bulk.
3. Open a weak-margin product.
4. Show contribution margin and the specific fee or cost pressure causing the problem.
5. Reveal a protected repricing recommendation.

On-screen label: `Know which products need action`

### 00:50–00:57 — Test and protect

1. Open Promotion Simulator and test a proposed discount.
2. Show the projected margin crossing below the approved floor.
3. Adjust the offer to a safe level.
4. Open Defend Loop and show the guardrail protecting the merchant.

On-screen label: `Test before launch. Protect after approval.`

### 00:57–01:06 — Delegate the work

1. Open AI Store Manager.
2. Enter: `Prepare the Snoonu products below our margin floor for review.`
3. Show PrizeSkout creating the task, identifying affected products, preparing proposed actions, and waiting for merchant approval.
4. Approve one safe action and show its read-back or retained pending state.

On-screen label: `Turn findings into controlled work`

### 01:06–01:12 — Ask the business question

1. Open CFO Copilot.
2. Ask: `What did Snoonu owe us, what was missing, and what should we do next?`
3. Show a concise evidence-backed answer with links to the reconciliation, recovery case, and protected action.

On-screen label: `Every answer tied to evidence`

### 01:12–01:15 — Close

Pull back to Overview with the connected channel, reconciled payout, recoverable amount, protected margin action, and completed management task visible together.

End copy: `Know what every order actually earns.`

## Camera and interaction language

- Maintain one continuous desktop session; do not reset into disconnected scenes.
- Use direct cuts, match cuts, and controlled 4–8% camera pushes.
- Use larger 10–14% pushes only for short evidence or reconciliation details.
- Keep cursor travel purposeful and fast, with a brief orange highlight on click.
- Pan only when it follows the cursor or connects a cause to its result.
- Let counters, rows, statuses, and charts update on screen; do not replace them with title slides.
- Keep contextual labels to five words or fewer whenever possible.
- Avoid browser chrome, native alerts, decorative AI sparkles, stock restaurant footage, holograms, fake terminals, and fabricated dashboards.

## Authenticity requirements

- Use the real PrizeSkout dashboard and production UI components.
- Use the Snoonu webhook and normalization contract already implemented in the product.
- Drive reconciliation through the actual settlement-reconciliation engine.
- Drive recovery through the actual evidence and recovery lifecycle.
- Drive margin and pricing through the existing cost, margin-policy, and price-safety logic.
- Drive Store Manager tasks through the real task lifecycle and approval states.
- Clearly label controlled synthetic data as demonstration data.
- Never claim an external write, recovery submission, or Snoonu production connection unless it is genuinely available and verified.

## Production gates

The film must not be delivered until all gates pass:

1. The full merchant journey works interactively before recording.
2. No loading failures, empty states, native browser alerts, or placeholder copy appear.
3. Every important value is legible at normal playback size.
4. Frame samples are visually inspected at least every five seconds.
5. The final MP4 is watched from beginning to end after export.
6. Runtime, resolution, frame rate, bitrate, and audio streams are verified.
7. The 30-second cutdown is derived only after the master is approved.

## Current status

- The previous slideshow and defective second render are rejected and must not be reused.
- The existing product contains real Snoonu webhook fixtures, reconciliation logic, recovery workflows, pricing safeguards, Store Manager tasks, and dashboard workspaces.
- The next production step is to assemble a clean, reversible demonstration tenant that exercises those paths end to end, then record that working session.
