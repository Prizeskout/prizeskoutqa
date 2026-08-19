# PrizeSkout Complete Product Walkthrough and Presenter Guide

Use this as your speaking guide while presenting. The wording is intentionally simple. Each section tells you what to click, what each field means, what to say, and what result to expect.

## The one-sentence explanation

PrizeSkout connects to a merchant's sales channels, reconstructs what the merchant truly keeps after product cost and platform charges, finds margin and payout problems, recommends safe actions, requires the right approval, checks the result, and keeps evidence of what happened.

## The five ideas to repeat

1. Product cost tells us what the item itself costs the merchant.
2. Platform percentages and fees tell us what the channel takes.
3. The margin policy tells us what the merchant wants left after costs.
4. PrizeSkout never treats an estimate as verified money.
5. A protected change is prepared, approved, sent, checked, and recorded.

## How to explain any number on screen

Whenever somebody points to a number and asks, “What does that mean?”, answer in this order:

1. Name the number: state exactly what it measures.
2. Name the scope: state the merchant, channel, branch, currency, and period it covers.
3. Name the source: state whether it came from the connected platform, an approved contract, a merchant entry, an uploaded statement, or bank evidence.
4. Name the calculation: explain what was added, removed, divided, or compared.
5. Name the evidence state: say whether it is verified, estimated, incomplete, or claims-ready.
6. Name the action: explain what the merchant should do next.

Example: “QAR 679 is potential value identified across the active issues currently in scope. It is based on the evidence available for this merchant and period. It is not cash recovered. We must open the issues, confirm the contract and settlement evidence, submit any valid claim, and then prove the credit or bank receipt before calling it recovered.”

Do not answer a challenge with only “the system calculated it.” PrizeSkout’s defensible answer is always the source, scope, rule, calculation, evidence state, and next action.

## The three different percentages people commonly confuse

### Platform percentage

This is a cost charged by a platform, such as commission or payment processing. It comes from the commercial agreement or, when clearly labelled, an unverified merchant entry. It reduces what the merchant receives. Different platforms can charge different percentages, and the percentage may apply to different bases.

### Margin percentage

This is the percentage of relevant revenue left after product cost and known variable channel costs. It is an output of the economics calculation, not a platform charge and not a setting by itself.

### Margin-policy percentage

This is the merchant’s chosen minimum acceptable contribution margin. It is a control target. PrizeSkout compares the calculated margin with this target to decide whether the item is healthy, below target, or cannot yet be judged.

Defensible example: a platform may charge 25%, while the merchant wants to retain an 18% contribution margin after product cost and all known variable channel charges. The two percentages answer different questions and must never be substituted for one another.

## Where each important input comes from

- Product identity, SKU, selling price, stock, orders, refunds, and platform activity normally come from the connected store or uploaded platform evidence.
- Product cost may come from an integrated source when available, or from a merchant-entered value with evidence and a timestamp. PrizeSkout must not invent it.
- Commission, fee bases, settlement timing, funding promises, and dispute deadlines should come from an approved contract version.
- A manually entered commission is useful for an estimate, but it is not contractual proof until reviewed against the agreement.
- Platform statement totals come from platform-issued settlement evidence.
- Actual cash received comes from a bank record or another reliable receipt, not from the platform saying it paid.
- Margin floors, cash floors, price movement limits, and approval modes come from the merchant’s active policy version.
- “Recovered” comes only from evidence of a later credit, offset, or bank receipt tied to the case.

## Evidence strength in plain language

- Connected data means PrizeSkout received data through an authorized connection. It does not automatically prove the contract terms or bank receipt.
- Merchant-entered data means the merchant supplied the value. It can support planning, but must remain labelled until independently supported.
- Uploaded evidence means a file was supplied and classified. Classification tells us what the file appears to be; it does not guarantee every number is correct.
- Approved terms mean a named reviewer checked and accepted the contract version for a stated scope and date range.
- Matched evidence means records were aligned to the same platform, entity, currency, reference, and period.
- Claims-ready means the difference and contractual basis are sufficiently supported to prepare a claim. It does not mean the platform has accepted it.
- Recovered means repayment or credit is evidenced. It is the last state, not a synonym for identified.

## Essential terms

- Product cost: what the merchant pays to make or buy one unit. It is required for profitability and safe pricing, but not normally for the narrow comparison of a platform payout with the platform's order and fee records.
- Platform commission: percentage the platform charges under the commercial agreement.
- Other platform fees: payment fees, fixed fees, delivery contributions, advertising charges, VAT on fees, and other agreed deductions.
- Contribution profit: selling revenue left after product cost and known variable channel costs.
- Contribution margin: contribution profit divided by the relevant revenue basis.
- Margin floor: minimum contribution margin the merchant wants to keep.
- Minimum cash contribution: minimum money the merchant wants to keep per sale even when the percentage floor is met.
- Expected payout: what should be paid after agreed deductions are applied to eligible activity for the same period.
- Actual payout: what the statement or bank evidence says was paid.
- Payout difference: expected versus actual for the same merchant, platform, currency, entity, and period.
- Identified: possible value has been detected.
- Estimated: the amount depends on assumptions or incomplete evidence.
- Claims-ready: contract, activity, settlement, and required evidence support a claim.
- Recovered: money was actually returned or credited and evidence supports it.
- Margin policy versus platform rate: the platform rate is a cost; the margin policy is the desired result after costs. They are not the same percentage.

## Before presenting

1. Use a demo merchant and demo store for every action that can change a channel.
2. Open PrizeSkout and the demo store in separate tabs.
3. Choose one simple product, preferably without variants.
4. Record its name, SKU, price, stock, and original cost.
5. Record the original price and restore it after any live-write demonstration.
6. Prepare one test platform agreement, activity report, payout statement, and bank receipt for full reconciliation.
7. Confirm the files cover the same platform, currency, entity, and period.
8. Never show real customer personal data publicly.
9. Never approve a real dispute, refund, order-status change, promotion, or price update in a rehearsal.

## Recommended 20-minute route

1. Landing page: click Merchant login.
2. Restore the demo merchant with email or access code.
3. Show Today and its summary cards.
4. Open Integration Vault and sync one channel.
5. Open Catalog and find the prepared product.
6. Explain price, cost, fees, profit, and margin.
7. Open Margin Intelligence and show the risk.
8. Open Margin Policy Engine and show a channel override.
9. Show one prepared price action without publishing, unless it is a disposable demo store.
10. Open Payout Recovery, approve test contract terms, add evidence, and run reconciliation.
11. Explain identified, estimated, claims-ready, and recovered.
12. Simulate one promotion.
13. Ask CFO Copilot a financial question.
14. Ask AI Store Manager to prepare a task.
15. End in Evidence & History.

---

## 1. Landing page and returning merchant access

1. Open the landing page.
2. Click Merchant login in the top navigation.
3. The Access your dashboard page opens.
4. Choose Email or Access code.

### Email

- Email address: email already associated with the merchant. This route does not create a new merchant.
- Send sign-in link: verifies the onboarded merchant and sends a one-time link.
- Say: “A returning merchant can use a secure email link without remembering a password.”

### Access code

- Access code: private store-specific code created during connection or registration.
- Continue: checks the code, restores the correct merchant context on this browser, and opens the dashboard.
- Say: “The code restores the correct merchant and should be kept private.”

Expected result: the existing dashboard opens, not new-merchant onboarding.

If access fails, remove spaces, confirm the registered email or correct code, and do not create a duplicate merchant as a workaround.

---

## 2. Dashboard navigation and global controls

### Left menu

- Catalog: products, prices, costs, stock, and source evidence.
- Margin Intelligence: true profit and products below target.
- Alerts: current attention inbox.
- Payout Recovery: contracts, expected payouts, settlements, exceptions, and recovery.
- Promotion Simulator: campaign economics before launch and funding checks afterward.
- Defend Loop: pricing rules, plans, approvals, publication, verification, and reversals.
- AI Store Manager: delegated operational work.
- CFO Copilot: financial questions about profit, fees, payouts, and risk.
- Integration Vault: connect platforms and sync catalogues.
- Evidence & History: completed, failed, confirmed, and investigated activity.
- Settings: identity, channels, margin rules, locations, notifications, competitor access, and images.
- Give Feedback: sends product feedback.
- Logout: signs out and removes merchant context from the browser.

### Top controls

- Theme: visual light/dark setting only.
- Currency: display currency where conversion is supported; it does not rewrite original transaction currency.
- Language: interface language; it does not alter source evidence.
- Support: opens support for access, connection, or data problems.

---

## 3. Today — daily operating brief

### Top cards

1. Connected channels: number of connected data sources. Click to open Channels settings. Connection does not mean every capability is supported.
2. Tracked products: imported products PrizeSkout can review. Click to open Catalog.
3. Price updates this month: confirmed recorded pricing activity. Click to open Evidence & History. Prepared or failed actions are not confirmed updates.
4. Store status:
   - Protected: active safeguards show no current critical condition.
   - Needs attention: a material issue requires review.
   - Monitoring: available data is being watched, but stronger evidence may still be needed.
   Click to open the attention inbox.

### Assistant box

1. Click the question box.
2. Type one clear question or outcome.
3. Click Send.
4. PrizeSkout routes a financial question to CFO Copilot and operational work to Store Manager.
5. Open the cited evidence or prepared action before deciding.

Suggested question chips are shortcuts, not different engines.

### Daily brief cards

- Management tasks: delegated work tracked until completion or verification. Click for Management desk.
- Waiting approval: tasks blocked until the merchant decides. Click for the filtered approval queue.
- High priority: urgent/high-impact active items. Click for Attention inbox.
- Money identified: possible value on active issues. Click for Outcome proof. It is not automatically recovered.

### Attention actions

- Active/Resolved/All: filter inbox state.
- Assign: name the responsible person or role.
- Snooze: defer temporarily; it returns later.
- Resolve: close and record in history.
- Dismiss: close as no action required; use only with a defensible reason.
- Ask Copilot: explain the item using its context.

### Outcome proof states

- Verified: completed evidence and confirmation exist.
- Protected: a confirmed safeguard avoided loss.
- Recovered: money was actually returned or credited.
- Identified: a possible exception/opportunity exists.
- Estimated: assumptions or incomplete evidence remain.
- Pending: action or confirmation is outstanding.

---

## 4. Integration Vault — connect and sync

### Universal flow

1. Click Integration Vault.
2. Find the platform card.
3. Read region, status, and setup message.
4. Click Connect or Setup.
5. Complete authorization or credentials.
6. Return to PrizeSkout.
7. Confirm Connected, Active, or Finish setup.
8. Click Sync now where available.
9. Wait for one result; never double-click a running sync.
10. Open Catalog and verify records came from that exact platform.

### Status meanings

- Not connected: no usable connection.
- Pending: credentials/platform approval are being verified.
- Connected: authorization exists.
- Finish setup: authorization exists but a required identifier is missing.
- Degraded: a recent check failed or credentials need attention.
- Syncing: latest available data is being requested.

### Zid and Salla

- Connect opens the platform's authorization page.
- Salla may open in a new tab; allow pop-ups.
- Sync now must sync only the named platform.
- Confirm the returned product source in Catalog.
- Use a demo Salla/Zid store for controlled writes.

### Foodics

Foodics is a POS connection. Available data depends on the granted credentials and business identifier. Confirm the store/business scope before trusting imports.

### Talabat fields

- Client ID: approved API client identity.
- Client secret: confidential proof paired with the client.
- Vendor ID: restaurant/vendor account.
- Chain ID: relevant group or chain.
- Commission rate: contractual percentage on the defined base.
- VAT on fees: tax on platform fees, not automatically the whole order.
- Payment fee: separate processing percentage.
- Fixed order fee: fixed deduction per eligible order.
- Delivery contribution: merchant-funded delivery amount.
- Environment: sandbox for tests; production for live operations.
- Contract currency: currency used to interpret terms and settlement.
- Connect/Verify: validates and stores only for an authorized merchant session.

### Jahez fields

- API key: integration identity.
- Secret code: confidential paired proof.
- Branch ID: exact branch scope.
- The connection may remain pending until platform access is available.

### Keeta

1. Click Connect.
2. Approve access on Keeta's merchant authorization page.
3. Return to PrizeSkout.
4. If Finish setup appears, enter Keeta Shop ID.
- Shop ID identifies the exact menu/store; Keeta OAuth does not return it automatically.
- Required callback: https://prizeskout.qa/api/channels/connect?oauth_callback=keeta
- A PipeOps 503 means hosting rejected the route before PrizeSkout handled it.

### Snoonu and Deliveroo

If the card says awaiting build or manual evidence only, do not imply live API access. Approved contracts and uploaded statements may still support analysis.

### Disconnect

1. Click Disconnect.
2. Confirm the exact platform.
3. Keep connected cancels; Disconnect confirms.
4. Historical evidence stays, but future sync/writes stop.

---

## 5. Catalog — products and costs

### Cards

- Catalog items: all imported products.
- Costs confirmed: verified costs safe for supported calculations.
- Costs missing: product economics are incomplete; automation must not guess.
- Out of stock: unavailable products.
- Connected sources: channels feeding the catalog.

### Search, filter, and paging

- Search: product name or SKU.
- Source filter: one platform.
- Cost status: all, verified, or missing.
- Availability: available or out of stock.
- Sort by risk: attention items first.
- Previous/Next: changes page, not filter.

### Product-list fields

- Product: merchant-facing name.
- SKU: exact stock-keeping identifier.
- Channel: source platform.
- Selling price: recorded customer price and currency.
- Product cost: verified unit cost or Cost required.
- Availability: stock quantity/state.
- Data status: Ready means core inputs exist; Needs cost means profitability is incomplete.

### Open and verify a product

1. Click the row.
2. Confirm name and SKU first.
3. Confirm channel.
4. Compare price and stock with the connected store.
5. Review cost source, status, and timestamp.
6. Review margin only after identity and cost are correct.

### Cost fields

- Base/Product cost: direct cost to make or purchase one unit.
- Currency: cost currency; it must match or be reliably converted.
- Evidence status: verified is confirmed; estimated stays visibly estimated.
- Observed at: when the cost was known true.
- Evidence expiry: latest time it may authorize a live decision without refresh.
- Save: records cost and evidence state.

Refresh and reopen after saving. Blank, zero, negative, stale, wrong-item, or wrong-currency cost must not silently become verified.

---

## 6. Margin Intelligence — what the merchant keeps

Say: “PrizeSkout starts with the sale, removes confirmed taxes where appropriate, product cost, platform commission, and other known variable charges. What remains is contribution profit.”

### Fields

- Gross selling price: customer price before relevant deductions.
- Net revenue: revenue after confirmed tax, discount, refund, or exclusions.
- Product cost: verified unit cost.
- Commission: contractual rate on the proven base.
- VAT on fees: tax on applicable platform charges.
- Payment fee: payment-processing cost.
- Fixed fee: fixed per-order cost.
- Delivery contribution: merchant-funded delivery.
- Contribution profit: net revenue minus product and variable channel costs.
- Contribution margin: contribution profit divided by the chosen revenue basis.
- Target/floor: minimum merchant requirement.
- Gap to target: improvement needed.
- Evidence coverage: share with verified usable inputs.

### States

- Above floor: known economics meet target.
- Below floor: verified economics miss target.
- Unknown: evidence is missing/stale; this is not profitable or unprofitable.
- Over-limit: required movement exceeds safety cap; manual exception review is required.

### Review a recommended price

1. Confirm current price, product, SKU, channel, and currency.
2. Confirm cost and freshness.
3. Confirm channel-specific policy.
4. Confirm contract percentages and bases.
5. Read recommended price and expected margin.
6. Check movement cap.
7. Stop if over limit.
8. Prepare the action. Do not call it live yet.

---

## 7. Margin Policy Engine

1. Click Settings, Protection, Margin Rules.
2. Review the active summary.
3. Click Open Margin Policy Engine.

### Default policy

- Default minimum contribution margin: desired percentage after product/channel costs.
- Minimum cash contribution: smallest amount to retain per sale.
- Largest price increase allowed: maximum movement under this version.
- Handling mode:
  - Show suggestions — you update prices: recommendation only.
  - Ask before every price change: explicit approval each time.
  - Update automatically within your limit: only with complete evidence and all active limits satisfied.
- Active version: immutable ruleset that governed a decision.

### Channel overrides

1. Choose the channel.
2. Enter margin floor.
3. Enter minimum cash contribution.
4. Enter maximum increase.
5. Choose approval mode.
6. Save/activate the new version.

Say: “A merchant might require 18% on their own store and 24% on Talabat. A channel without an override inherits the default.”

Category/product overrides remain unavailable until their safeguards work end to end. New rules apply prospectively; history retains its original version.

---

## 8. Defend Loop and Channel Price Architecture

### Lifecycle

- Detected: risk/opportunity found.
- Prepared: exact action exists; nothing sent.
- Waiting approval: merchant decision required.
- Approved: exact action is authorized within its window.
- Executing: sending.
- Verifying: reading channel to confirm.
- Confirmed/Completed: expected result observed.
- Failed: not completed; never show as success.
- Reversed: previous value restored and recorded.

### Safety evidence

- Expected current price: value expected before writing; mismatch stops the action.
- Target price: exact proposed value.
- Channel item ID/SKU: exact remote item.
- Currency: target context currency.
- Economics version: commercial assumptions used.
- Policy version: guardrails used.
- Approval expiry: approval no longer valid afterward.
- Decision expiry: recommendation must be regenerated afterward.
- Idempotency key: prevents duplicate writes on retry.

### Price plan fields/actions

1. Select channels. Live write means supported publication; Plan only means manual application.
2. Plan name: recognizable batch name.
3. Manual approval above %: review threshold.
4. Maximum movement per plan %: hard movement cap.
5. Search product/channel: filters plan rows.
6. Review proposed prices.
7. Save draft plan: never publishes.
8. Enter Finance approver.
9. Approve plan.
10. Publish live only when authorized.
11. Retry remaining only after fixing partial-publication failures.

### Safe live demonstration

1. Record original price.
2. Confirm item, SKU, channel, currency, and expected current price.
3. Confirm fresh cost and rules.
4. Approve one small demo change.
5. Wait; do not double-click.
6. Confirm in the store.
7. Confirm old/new price, channel, time, and status in history.
8. Restore original price and verify it.

---

## 9. Payout Recovery — what reconciliation means

Say: “Payout reconciliation checks whether platform activity, agreed commercial terms, the platform settlement, and the bank receipt agree for the same merchant, channel, currency, and period.”

Eligible sales and adjustments minus agreed commission, fees, tax on fees, refunds, delivery contributions, reserves, and supported deductions equals expected payout. Expected payout is compared with the statement and bank receipt.

### Product cost question

- Product cost is not required for the narrow question: did the platform pay according to its activity and contract?
- Product cost is required for the wider question: after product and channel costs, was the business profitable?
- Never insert product cost into platform settlement unless the platform actually settles it under a proven arrangement.

### Evidence chain

1. Approved contract proves rate, basis, dates, scope, and calendar.
2. Activity proves orders, sales, refunds, cancellations, discounts, and adjustments.
3. Platform statement proves what the platform calculated.
4. Bank receipt proves what landed.
5. Recovery evidence proves later repayment or credit.

A difference alone is not claims-ready.

### Worked payout example you can present

Use this example to explain the calculation. State that the figures are illustrative unless they match the live demo evidence.

1. Eligible order sales for the settlement period are QAR 10,000.
2. The approved contract commission is 20% of eligible sales. Commission is QAR 2,000.
3. The approved payment fee is 2% on the same proven base. Payment fee is QAR 200.
4. VAT on those applicable fees is 5%. If both charges are taxable, VAT on fees is 5% of QAR 2,200, which is QAR 110.
5. Supported merchant-funded delivery contributions total QAR 150.
6. Supported refunds and adjustments total QAR 300.
7. Expected payout is QAR 10,000 minus QAR 2,000 minus QAR 200 minus QAR 110 minus QAR 150 minus QAR 300, which equals QAR 7,240.
8. The platform statement says QAR 7,140. The statement difference is QAR 100.
9. The bank shows QAR 7,140 with the matching settlement reference. The statement-to-bank difference is zero.

The defensible conclusion is: “The bank received the amount stated by the platform, but the platform statement is QAR 100 below the contract-based expectation. We investigate that QAR 100 against transaction rows and contract clauses. We do not yet call it recovered, and we call it claims-ready only if the evidence supports the cause and amount.”

### Why product cost is excluded from that payout calculation

Assume the products sold in the example cost the merchant QAR 3,500. That QAR 3,500 matters when calculating the merchant’s profit, but the delivery platform does not normally reimburse or deduct the merchant’s own kitchen or inventory cost in its settlement. Adding product cost to the payout formula would mix two separate questions:

- Settlement question: did the platform pay what the commercial agreement required?
- Profit question: after the sale, product cost, and channel costs, what did the merchant keep?

For the wider profit view, the illustrative contribution after product cost is QAR 7,240 minus QAR 3,500, or QAR 3,740, before any additional costs outside the calculation. The exact margin denominator must be stated on screen; do not silently divide by a different revenue basis.

### The four comparisons inside reconciliation

1. Activity to contract: recompute what should have happened using eligible orders and approved terms.
2. Expected payout to platform statement: find whether the platform’s settlement agrees with that recomputation.
3. Platform statement to bank: find whether the amount the platform says it paid actually arrived.
4. Exception to recovery: prove whether a challenged amount was later credited, offset, or deposited.

These comparisons locate the problem. If expected payout differs from the statement, the issue may be a platform calculation or unsupported deduction. If the statement agrees with expectation but the bank differs, the issue may be payment timing, reference matching, withholding, bundling, or a missing deposit. If a recovery case exists but no later credit is evidenced, the amount remains open.

### Matching rules you must state before trusting a difference

- Same merchant legal entity: otherwise one company’s sales may be compared with another company’s bank account.
- Same platform account and branch scope: otherwise orders or fees may be missing or duplicated.
- Same currency: otherwise a difference may be exchange-rate movement rather than underpayment.
- Same activity and settlement period: otherwise timing creates a false exception.
- Same accounting basis: gross sales, eligible sales, and net sales cannot be interchanged.
- Same settlement reference where available: this is stronger than matching only by amount.
- No duplicated source files or rows: duplicates inflate expected or stated totals.
- Approved terms effective during the period: a current rate cannot automatically be applied to an older settlement.

### Reasons a real difference may not be an underpayment

- The payout covers a different cutoff window.
- Several settlements were combined into one bank deposit.
- A minimum threshold rolled the balance into the next cycle.
- A reserve was contractually held and is not yet due.
- A refund, cancellation, promotion, or advertising charge is valid but missing from the first dataset.
- The commission base was misunderstood.
- VAT was applied to fees on a different lawful basis.
- The deposit is in another currency or includes conversion charges.
- The platform paid correctly but the bank receipt has not yet been supplied.

Say: “A variance is a lead for investigation. Evidence and contractual basis turn it into a valid exception.”

---

## 10. Contract Intelligence Vault

1. Open Payout Recovery and Contract Intelligence Vault.
2. Click Add contract terms.
3. Choose platform.
4. Enter terms or attach an agreement.

### Every contract field

- Contract name: recognizable agreement/version name.
- Platform: channel governed.
- Commission rate: agreed percentage.
- Commission base: gross before discount, net after discount, or eligible sales.
- VAT on fees: tax percentage on applicable platform fees.
- Payment fee: separate processing percentage.
- Fixed order fee: fixed charge per eligible order.
- Delivery contribution: merchant-funded delivery amount.
- Settlement lag: days from activity/cutoff to payout.
- Lag basis: calendar days count all days; business days skip configured weekends/holidays.
- Payout schedule: daily, weekly, twice monthly, or monthly.
- Weekly payout day: 0 Sunday through 6 Saturday.
- Monthly payout dates: comma-separated dates such as 1, 15.
- Daily cutoff hour: 0–23; later activity enters the next window.
- Settlement timezone: timezone for cutoff/due dates, such as Asia/Riyadh.
- Weekend days: numeric weekdays excluded from business-day calculations.
- Settlement holidays: excluded dates.
- Reserve delay: additional days before reserves release.
- Minimum payout threshold: balance below which payout may roll forward.
- Dispute deadline: days allowed to challenge settlement.
- Advertising commitment: agreed advertising obligation.
- Minimum spend: contractual spending requirement.
- Currency: agreement currency.
- Effective from/to: exact validity period.
- Covered legal entity: company governed.
- Covered brands/branches: comma-separated included scope.
- Source agreement: supporting PDF, text, or image.
- SHA-256 fingerprint: unique identity of the reviewed file.
- Review notes: ambiguity, exception, or follow-up.

### Review and approve

1. Attach agreement and wait for extraction.
2. Review every value, quote, page, warning, missing term, and confidence score.
3. Correct unclear values manually.
4. Save for review; this creates a draft only.
5. Enter Reviewer name.
6. Click Check source details.
7. Compare with the agreement.
8. Click Approve terms only when the reviewer agrees.

Say: “AI assists with reading; a named reviewer makes the terms authoritative.”

### How to defend the contract fields when questioned

- Commission rate alone is incomplete. You also need the commission base, effective dates, platform, and covered scope. Twenty percent of gross sales is not the same charge as twenty percent of sales after discounts.
- Commission base decides which sales amount is multiplied by the rate. If the agreement is unclear, mark the result uncertain instead of choosing the most convenient base.
- VAT on fees is kept separate because it is generally a tax on applicable platform charges, not another commission rate. The supported contract and jurisdiction determine its treatment.
- Payment fee is separate from commission so an apparently correct commission cannot hide an excessive processing deduction.
- Fixed order fee is multiplied by eligible order count. It must not be treated as a percentage.
- Delivery contribution records the merchant-funded portion. Customer-paid delivery revenue and platform-funded delivery must not automatically be treated as the merchant’s cost.
- Promotion funding establishes who bears the discount. A promised platform share remains a receivable or expected adjustment until settlement evidence confirms it.
- Effective dates stop old terms being applied to new activity, or new terms being applied retrospectively.
- Covered entity, brands, and branches prevent one agreement from being used for stores it does not govern.
- Settlement frequency says how often a payout cycle occurs. Settlement lag says how long after the relevant cutoff the payout is due. They are separate controls.
- Cutoff hour and timezone decide which day owns a late transaction. Without them, an order near midnight can create a false period mismatch.
- Weekend and holiday settings affect business-day calculations. They do not remove transactions; they move the contractual due date.
- Minimum payout threshold explains why a valid small balance may roll forward rather than arrive immediately.
- Reserve delay explains when a contractual hold should release. Before the release date it may be expected; after that date it may become overdue.
- Dispute deadline tells the team how long it has to challenge a settlement. It should create urgency, not prove the claim itself.
- Advertising commitment and minimum spend may explain deductions, but they require the contract and supporting charge evidence.
- Currency defines how amounts are interpreted. A conversion should record the original currency, rate source, rate time, and converted currency.
- Source fingerprint identifies the exact reviewed file. It helps detect replacement or duplication; it does not prove that the agreement is genuine by itself.
- Reviewer name establishes human accountability. Approval means the reviewer accepted the captured terms for the stated scope, not that every future settlement is correct.

### What Save for review and Approve terms actually do

- Save for review stores a draft contract version. Draft terms may inform a clearly labelled estimate, but should not authorize a definitive claim or live pricing decision.
- Check source details exposes the extracted source and warnings so the reviewer can compare the screen with the agreement.
- Approve terms turns the reviewed version into the authoritative commercial input for its covered dates and scope.
- Replacing terms should create a new version. It should not rewrite the terms attached to old decisions or audits.
- If two approved versions overlap, stop and resolve the scope conflict rather than allowing whichever record loads first to govern silently.

---

## 11. Live expected-payout check

1. Open Payout Recovery and Live check.
2. Choose 7 or 30 days.
3. Confirm approved commission rate.
4. Click Check Expected Payout.

### Result fields

- Orders: included order count.
- Gross sales: sales before supported deductions.
- Eligible sales: contract-defined commission base after exclusions.
- Commission rate/amount: approved rate and recomputed charge.
- VAT on fees: tax on applicable charges.
- Payment/fixed/delivery charges: supported separate deductions.
- Expected payout: contractual result.
- Platform statement total: platform-stated amount, if provided.
- Actual received: bank amount, if provided.
- Difference: same-period, same-scope comparison.

If marked estimate, explain which evidence is missing.

---

## 12. Upload Statements — evidence intake

1. Open Payout Recovery, Upload Statements.
2. Select platform.
3. Add platform reports.
4. Add bank receipt separately.
5. Confirm one platform and one period.
6. Run audit.

### Platform reports fields

- Description: optional scope label; useful context, not proof.
- Platform: source channel; audit mixed platforms separately.
- Commission rate %: fallback typed rate; estimates only without approved terms.
- Rate authority: approved contract or unverified merchant entry.
- Choose Statements: CSV/spreadsheet; supported Snoonu PDF where applicable.
- Multiple files: daily activity plus payout statement creates stronger evidence.

### Classification

- Daily Log: daily activity.
- Platform Transactions: order-level/transaction data.
- Statement: platform settlement statement.
- Report: supported summary.
- Confidence: certainty of document identity, not correctness of every figure.
- Accounting basis: gross before deductions, net after deductions, or unclear.
- Suggested type: recommended interpretation.
- Treat sales as net: reviewer override only when the source proves it.
- Remove: excludes the staged item.

### Bank receipt fields

- Note: optional context.
- Amount received: exact bank amount.
- Currency: deposit currency.
- Bank transaction date: date shown by bank.
- Bank reference: bank identifier.
- Platform settlement reference: link to platform settlement.
- Deposit type: regular payout, adjustment, refund/reversal, recovery payment, or combined payout.
- Settlement period start/end: activity period claimed by the deposit.
- Evidence fingerprint: local file is fingerprinted; the UI says it remains on the device in this flow.
- Add Bank Receipt: stages the receipt.

### Pre-audit checks

1. Same platform and entity.
2. Same currency or approved conversion.
3. Same period.
4. No duplicated daily files.
5. Approved contract covers the period.
6. Deposit maps to the correct settlement.
7. Classification warnings reviewed.

---

## 13. Reconciliation workpaper

### Executive conclusion

States what was confirmed, what is uncertain, and whether a difference is supported.

### How money was matched

Shows activity → expected payout → platform statement → bank receipt. A missing stage weakens the conclusion.

### Expected payout calculation

- Step: calculation stage.
- Amount: addition/deduction.
- Based on: supporting source/rule.
- See source: evidence explanation.
- Information not provided: deliberately not guessed.

### Exception register

- Exception ID: case identifier.
- Category/assertion: issue type.
- Status: case state.
- Severity: importance after value/evidence.
- Amount: quantified difference.
- Claims-ready: supported claim amount, possibly zero.
- Confidence: evidence support level.
- Affected orders: linked transactions.
- Root cause: proven explanation or pending investigation.
- Owner/Due date: responsibility and deadline.
- Recovery: filed/recovered state.
- Click a row for workpaper and next actions.

### Transaction ledger

- Date, Orders, Eligible sales, Contractual commission, Expected net, and Total show the period computation.

### Evidence and lineage

- Document ID, Filename, SHA-256, Source, Period, Parser, Rows, AI confidence, Overrides, and Review make the source traceable.

### Materiality

- Overall materiality %: importance threshold relative to expected payout.
- Performance materiality: lower working threshold, displayed at 75%.
- Trivial threshold %: small-error threshold as a share of materiality.
- Merchant approval: accepts the basis; it does not waive a valid claim.

### Signoff and lock

- Prepared by: workpaper preparer.
- Reviewed by: independent reviewer.
- Subsequent events: post-cutoff events or “none identified.”
- Merchant acknowledgement: merchant reviewed report.
- Adjustment approval: proposed adjustments approved.
- Lock reviewed report: stops current-session editing after prerequisites.
- Do not call this a persistent cryptographic signature unless server-side signing exists.

---

## 14. Settlement calendar and forecast

- Activity window: included sales period.
- Cutoff: boundary between cycles.
- Expected settlement date: calculated from approved lag, schedule, weekends, and holidays.
- Expected amount: transaction-based forecast.
- Status: upcoming, due, overdue, received, or exception.
- Transaction forecast lineage: records behind the forecast.
- Search product/SKU/order: filters lineage.
- Previous/Next: pages records.

Expected date is contractual. Received date requires bank evidence.

---

## 15. Recovery cases and reconciliation ledger

1. Open a supported exception.
2. Review amount, period, clause, and evidence.
3. Create recovery case only with a defensible basis.
4. Assign owner and due date.
5. Record submission reference/date when filed.
6. Record platform response.
7. Mark recovered only after a bank credit or supported adjustment.

The settlement ledger preserves expected, stated, received, matched, exception, claim, and recovery stages and prevents repeated counting.

---

## 16. Promotion Simulator

### Fields

1. Campaign name: private scenario identifier.
2. Discount %: customer discount.
3. Platform funding %: share of discount paid by platform.
4. Commission %: campaign commission.
5. VAT on fees %: tax on platform fees.
6. Payment fee %: processing deduction.
7. Fixed order fee: fixed charge per campaign order.
8. Commission base: gross before discount, net after discount, or eligible sales.
9. Expected order lift %: forecast increase in orders.
10. Baseline orders: expected orders without campaign.
11. Duration: campaign days.
12. Minimum margin %: lowest acceptable contribution margin.
13. Products: exact included SKUs.
14. Target channels: platforms where campaign is intended.

### Results

- Customer discount, platform-funded amount, merchant-funded amount, projected orders/revenue, product cost, platform charges, contribution profit/margin, and safe/unsafe/unknown status.

### Actions

1. Save draft; no live campaign changes.
2. Enter Finance and Operations reviewers.
3. Approve the exact version.
4. Prepare launch.
5. Publish only to an authorized supported demo channel.
6. For manual channels, follow instructions and record partner campaign ID.
7. After campaign, reconcile promised funding with actual settlement. Promised is not received.

---

## 17. AI Store Manager

### Controls

- Task description: requested outcome.
- Delegate task: creates tracked work.
- Observe: monitor only.
- Recommend: prepare safe actions.
- Approve: wait for approval on protected actions.
- Auto-protect: act only within complete evidence and active limits.
- Priority: critical/high/medium/low.
- Risk: read-only can run; protected write needs approval.
- Start review/Run task, Approve, Run check/Retry check, and Show all tasks control workflow.

### Live read-only prompts

1. Check my connected stores and tell me which needs attention.
2. Show products with missing costs.
3. Show out-of-stock products.
4. Find price differences across channels.
5. Check whether today's Zid orders arrived.
6. Summarize today's order statuses.
7. Find products without verified costs.
8. Check whether catalog sync is current.
9. Show failed or unverified price actions.
10. Show tasks waiting approval.
11. Explain high-priority items.
12. Check whether SKU [SKU] is published.
13. Find product SKU [SKU].
14. Show latest Salla products.
15. Show latest Zid products.
16. Find stock conflicts across channels.
17. Summarize catalog changes today.
18. Show approvals that expired.
19. Show tasks awaiting verification.
20. Prepare my highest-priority tasks today.

### Preparation prompts — must not silently write

21. Prepare a safe price recommendation for SKU [SKU].
22. Prepare a plan to fix missing costs.
23. Prepare a draft product named [name] at [price].
24. Prepare a price update for SKU [SKU] from [old] to [new].
25. Prepare a low-stock review.
26. Prepare to publish draft product [name].
27. Prepare a correction for the product with the wrong name.
28. Prepare a campaign-readiness checklist.
29. Prepare a task to investigate today's failed sync.
30. Prepare the safest next action for every high-priority alert.

### Protected demo-only prompts

31. Change SKU [SKU] to [price].
32. Publish draft product [name].
33. Update stock of SKU [SKU] to [quantity].
34. Move order [reference] to [status].
35. Prepare a refund of [amount] for reverse order [reference].
36. Launch approved campaign [name].

Stop at preview unless using authorized disposable data. Explain store, object, old/new value, approval, and verification.

---

## 18. CFO Copilot prompt library

### Profit and margin

1. What did I actually keep from orders this month?
2. Which products are below my margin floor?
3. Rank products by contribution profit.
4. Which product loses most per sale?
5. Show margins unknown because cost is missing.
6. Explain margin for SKU [SKU].
7. What reduces margin most: cost, commission, or other fees?
8. Compare Zid and Salla margin for the same product.
9. Which channel leaves the highest margin?
10. Which channel has the highest cost burden?
11. How much margin is at risk today?
12. Which products meet percentage floor but fail cash contribution?
13. Which recommended prices exceed movement limits?
14. Show evidence age behind recommendations.
15. What share of ordered units has verified costs?
16. Why is this item unknown rather than loss-making?
17. What price gives SKU [SKU] a 20% contribution margin?
18. What changes if commission rises two percentage points?
19. Show margin before and after VAT on fees.
20. Separate verified profit from estimated profit.

### Payout and reconciliation

21. What payout should Talabat have paid in 30 days?
22. Compare expected payout, statement, and bank receipt.
23. Which differences are claims-ready?
24. Which differences are estimates?
25. Explain the largest exception.
26. Show the contract clause supporting commission.
27. Which settlements are overdue?
28. Which bank receipts are unmatched?
29. Which statements lack bank evidence?
30. Show duplicate dates or overlapping reports.
31. Why is claims-ready lower than identified?
32. What evidence is missing before dispute?
33. Show commission above agreed rate.
34. Separate payouts, adjustments, refunds, and recoveries.
35. Which dispute deadline is nearest?
36. Has identified money actually been recovered?
37. Show source documents behind expected payout.
38. Does this statement report gross or net sales?
39. Does the approved contract cover this period?
40. Give the safest next step for each exception.

### Promotions

41. Can I afford a 15% discount on SKU [SKU]?
42. What platform funding keeps this above floor?
43. Compare gross-before and net-after commission bases.
44. Which products make this campaign unsafe?
45. How many extra orders offset the merchant discount?
46. Separate contractual inputs from estimates.
47. What if expected order lift does not happen?
48. Did platform funding actually arrive?

### Controls and evidence

49. What rules govern Talabat pricing?
50. Which channels inherit the default policy?
51. Show active channel overrides.
52. What approval mode applies to Salla?
53. Which decisions expired?
54. Show actions without final verification.
55. What changed today and who approved it?
56. Show policy/economics versions behind latest action.
57. Separate verified, estimated, identified, claims-ready, and recovered.
58. State limitations of the current conclusion.
59. Prepare a finance review of the top three risks.
60. Summarize this dashboard for an owner in five sentences.

### Follow-ups after any answer

- Show source records.
- Which part is estimated?
- What evidence is missing?
- Which contract and policy versions did you use?
- What period and currency did you use?
- Did you exclude refunds/cancellations?
- Can this change the live store?
- What approval is required?
- How will the outcome be verified?

A good answer uses this merchant's data, states period/currency, separates facts from assumptions, never invents missing values, points to evidence, and prepares rather than silently performs protected actions.

---

## 19. Evidence & History

- Search: product, platform, document, or action.
- Needs attention: failed, incomplete, or critical records.
- Confirmed: completed verified actions.
- Product/SKU and Channel: exact target.
- Old/New price: before/requested values.
- Status: lifecycle state.
- Timestamp: event time.
- Evidence: verification or failure reason.
- Expand: opens retained report.
- Export PDF/Word: shareable retained report.
- Delete: confirmed removal of test history only; never delete audit evidence during presentation.

Payout history must show expected, actual/stated, difference, source, contract authority, and retained investigation details.

---

## 20. Settings

### Store Access

- Business name and Save: merchant display identity.
- Store access code and Copy: private dashboard-restoration code.
- Store Access link: returning-merchant page.

### Channels

Connection, verification, sync, Keeta Shop ID, and disconnection.

### Competitor Radar

- Competitor URL: exact public product page.
- Product mapping: matching merchant product.
- Channel: comparison context.
- Add/Track: saves target.
- Check price now: requests fresh public observation.
- Remove: stops monitoring.
- Match status/Last check: mapping quality and observation time.

### Product Images

- Upload, Match, Preview, Approve, Verify, and Undo form a protected image-change lifecycle.

### Margin Rules

Active default policy and channel overrides.

### Locations

- Name, address/city, and channel/store mapping define the outlet context; Save retains it.

### Notifications

- In-dashboard and webhook toggles change notification delivery, not underlying evidence or actions.

---

## 21. Group Control, when enabled

- Group name, legal entities, brands, branches, city, channels, monthly sales, expected/actual settlement define hierarchy.
- Team member roles: finance reviewer, operations reviewer, branch manager, viewer.
- Save hierarchy creates the governed version.
- Finance and Operations approvals are separate.
- Group margin floor can activate only against the exact jointly approved hierarchy.

---

## 22. Warning meanings

- Cost required: profitability cannot be safely calculated.
- Contract required: typed rate supports estimates, not claims-ready conclusions.
- Period mismatch: records cannot be directly compared.
- Duplicate dates quarantined: excluded to prevent double counting.
- Currency mismatch: do not combine without approved conversion.
- Stale evidence: regenerate decision.
- Current price changed: safety check stopped a stale write.
- Approval expired: review a new action.
- Over movement limit: manual exception review.
- Partial publication: inspect each channel result.
- Unknown: insufficient evidence, not zero.
- Project unavailable/503: hosting rejected request before PrizeSkout handled it.

---

## 23. Never claim these things

- Identified money is recovered.
- An estimate is claims-ready.
- Product cost is required to check platform settlement compliance.
- Margin floor equals platform commission.
- Every connected platform supports live writes.
- A saved draft was published.
- Approved means verified.
- Extracted contract values are authoritative before review.
- Expected settlement date proves receipt.
- Session lock is a cryptographic signature.
- Manual bank receipt flow is a direct bank connection.

---

## 24. Presenter challenge questions and defensible answers

### “Does connected mean all data is complete and live?”

No. Connected means authorization exists. The platform decides which records and actions its interface exposes. Check the last successful sync, capability labels, source coverage, and evidence freshness before describing the data as current or complete.

### “Why can the same product have different margins on different channels?”

The selling price, commission, discounts, payment fee, fixed fee, delivery contribution, tax treatment, and promotion funding can differ by channel. The same product cost can therefore produce a different contribution on Zid, Salla, Talabat, Jahez, or Keeta. Channel-specific policy lets the merchant choose a different acceptable floor for each commercial model.

### “Why not use one universal margin target?”

A universal default is useful as a fallback, but it may not reflect each channel’s economics or strategy. A direct commerce store may tolerate one floor while a delivery aggregator requires another. A channel override takes precedence; a channel with no override inherits the default. This is controlled inheritance, not duplicated settings.

### “Can the merchant simply type any commission?”

The merchant can enter a rate to model an estimate, but PrizeSkout must label its authority. For a defensible audit or claim, the rate, base, dates, scope, and related fees should be supported by an approved agreement. A typed percentage without its base can be materially misleading.

### “What happens when the contract changes mid-month?”

Each transaction should use the contract version effective for its activity date and scope. The period may need to be split between versions. Applying the newest rate to the entire month would rewrite history and could create a false variance.

### “Why do you need product cost?”

We need product cost to calculate contribution profit, margin, promotion affordability, and a safe price. We do not normally need it to check whether a platform paid according to its settlement agreement. That narrower calculation concerns eligible sales and contractual deductions.

### “What if product cost is missing?”

PrizeSkout can still show supported sales and payout facts, but profitability becomes unknown. It should ask for cost evidence and block autonomous margin-based pricing. Missing is not zero.

### “What if the cost changed after the recommendation?”

The decision carries its cost observation time and expiry. If the evidence is stale or changed, regenerate the recommendation. An old approval must not silently authorize a decision based on new economics.

### “Why does VAT basis matter?”

VAT may apply to platform fees rather than the entire customer sale, and treatment can depend on the agreement and jurisdiction. Applying the tax rate to the wrong base changes both the expected payout and margin. PrizeSkout must show the base it used rather than merely showing a VAT percentage.

### “What exactly does expected payout mean?”

It is PrizeSkout’s recomputation of what should be settled for a defined activity period, using supported activity and approved commercial terms. It is not a bank balance, not a platform promise by itself, and not proof of payment.

### “What is the difference between statement amount and actual payout?”

The statement amount is what the platform says it settled. Actual payout is what reliable bank evidence says arrived. They can match while both differ from the contract-based expectation, or the statement can be correct while the bank deposit is missing or bundled.

### “Why can’t every variance become a claim?”

A variance may come from timing, scope, currency, a valid reserve, a valid adjustment, incomplete files, or a mistaken accounting basis. Claims-ready status requires a supported amount, a contractual basis, linked source rows, required evidence, and review.

### “What does confidence mean?”

Confidence describes how strongly the available evidence supports an interpretation or classification. It is not the probability of winning a dispute and does not replace reviewer judgment. A high-confidence document classification can still contain an incorrect platform charge.

### “When is money recovered?”

Only when a repayment, credit, or approved offset is evidenced and tied to the recovery case. Filing a claim, receiving an email acknowledgement, or seeing an identified amount is not recovery.

### “Can PrizeSkout automatically change prices?”

Only where the channel supports a live write, the merchant selected an automatic approval mode, and every active safeguard passes. The exact item, current price, currency, cost evidence, economics version, policy version, movement limit, approval window, and idempotency protection still matter. Other channels remain plan-only.

### “What happens if somebody changed the store price first?”

The expected-current-price check should stop the stale action. PrizeSkout should request a fresh value and regenerate the decision rather than overwrite an unexpected merchant or platform change.

### “Does clicking Approve mean the action succeeded?”

No. Approval authorizes the exact prepared action. Success requires execution and independent verification from the target channel. Approved, executing, verifying, confirmed, failed, and reversed are deliberately separate states.

### “How do retries avoid duplicate changes?”

The action carries an idempotency key. A retry of the same authorized operation should resolve to the same logical action instead of creating a second write. A changed target or expired decision requires a new action.

### “Why keep old policy and contract versions?”

History must explain why a past calculation or action was reasonable at that time. If settings were overwritten in place, a reviewer could not reproduce the old decision. Versioning preserves the actual rules and terms used.

### “What does locked mean?”

Locked means the reviewed report version should no longer be edited through the workflow. It preserves a review point. Do not describe it as a cryptographic signature or external audit certification unless those separate controls exist.

### “Is PrizeSkout the bank, accountant, or platform of record?”

No. PrizeSkout organizes connected data, commercial rules, calculations, evidence, decisions, and follow-up. Platform records and bank evidence remain their respective source records, and professional accounting or legal judgment may still be required.

## 25. What every common button means

- Connect: begins authorization or credential verification. It does not promise a successful sync.
- Reconnect: renews or repairs authorization. It should not create a second channel identity.
- Sync now: requests the newest supported source data. It does not change store content unless explicitly described as a write action.
- Save draft: stores work without authorizing or publishing it.
- Save for review: creates a reviewable version and keeps it non-authoritative until approval.
- Approve: records a named decision on the exact version. It is authorization, not execution or verification.
- Prepare: creates the exact proposed action and safety context. It changes nothing live.
- Publish/Apply live: attempts the authorized external write. Wait for verification before calling it complete.
- Verify: reads evidence or the target system to check the expected result.
- Retry: repeats an eligible failed/incomplete operation under duplicate protection. Investigate the reason first.
- Undo/Reverse: prepares or performs restoration of a prior supported value and records the outcome.
- Resolve: closes an issue because the required outcome or conclusion has been recorded.
- Dismiss: closes an issue as not requiring action; it should capture a reason and must not pretend the issue was fixed.
- Snooze: defers attention until later; it does not resolve the underlying condition.
- Export PDF/Word/CSV: creates a portable report or schedule from the current evidence and state. Export does not strengthen weak evidence.
- Remove staged file: excludes an item before audit. It should not erase the original source outside PrizeSkout.
- Disconnect: stops future channel access and writes after confirmation. Retained history should remain available.
- Logout: ends the merchant session on the device. It does not disconnect the merchant’s channel integrations.

## 26. Full rehearsal checklist

Mark PASS, PARTIAL, FAIL, or NOT TESTED.

1. Merchant login is visible: __________
2. Email/code restores correct merchant: __________
3. Logout works: __________
4. Every sidebar item opens: __________
5. Today cards reach evidence: __________
6. Correct channel is connected: __________
7. Channel-only sync names correct platform: __________
8. Demo product identity/price/stock match: __________
9. Cost saves after refresh: __________
10. Margin explains line by line: __________
11. Default and override policies are correct: __________
12. Protected action waits for approval: __________
13. Demo price reaches correct item: __________
14. Original price restored: __________
15. Approved contract covers period: __________
16. Reports classify correctly: __________
17. Bank receipt maps correctly: __________
18. Reconciliation separates evidence states: __________
19. Settlement forecast uses calendar terms: __________
20. Promotion simulation changes nothing live: __________
21. Unsafe campaign warns: __________
22. CFO Copilot cites merchant data: __________
23. Manager separates read-only/protected work: __________
24. History records demo actions: __________

## Cleanup

1. Restore demo prices.
2. Remove/cancel test campaigns.
3. Cancel test orders where appropriate.
4. Ensure nothing remains Executing/Verifying.
5. Confirm no real merchant data changed.
6. Save failure screenshots with time, merchant, platform, object, expected, and actual result.
7. Log out and log in once.

## Closing statement

“PrizeSkout does more than show sales. It reconstructs what the merchant truly keeps, applies the merchant's rules per channel, prepares safe action, requires approval, checks the real outcome, and keeps evidence for every decision.”

## Presentation record

- Date/time: __________
- Presenter: __________
- Demo merchant: __________
- Demo channels: __________
- Demo product/SKU: __________
- Original price: __________
- Passed/Partial/Failed/Not tested: __________
- Safe to demonstrate live: YES / NO
- Most important limitation to disclose: __________
