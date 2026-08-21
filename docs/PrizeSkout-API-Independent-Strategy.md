# PrizeSkout API-Independent Strategy

---

## 1. The decision in one page

We will not wait for delivery aggregators to give us their private APIs.

We can build an independent record of what each merchant sold by collecting information from systems the merchant already controls. These include the merchant's POS, connected order-management system, business email and downloaded reports.

PrizeSkout then combines three types of information:

- **What was sold:** the orders recorded by the merchant's POS or order-management system.
- **What should have been charged:** the merchant's agreement with each delivery platform.
- **What the platform says it paid:** payout notices, settlement reports, credit notes and adjustment notices.

PrizeSkout compares these records and explains the difference.

The recommended starting plan is:

1. Build automatic collection from merchant email.
2. Build importers for the reports merchants already receive.
3. Connect to POS and order-management systems that allow merchant-approved access.
4. Apply separately to Foodics, Marn, Sapaad, Deliverect and Grubtech.
5. Keep every core reconciliation function working even when an API is unavailable.

The important principle is:

**Aggregator APIs can improve our product, but they must never be required for it to survive.**

---

## 2. The merchant problem

A merchant may be told that a platform charges a particular commission percentage. That percentage is often not the merchant's total cost.

The merchant's payout may also be reduced by:

- Merchant-funded discounts
- Payment-processing fees
- VAT charged on the platform's fees
- Advertising or featured-placement charges
- Fixed order fees
- Delivery-related charges
- Refunds and cancellations
- Equipment or subscription charges
- Unexplained adjustments

This makes it difficult for the merchant to answer a simple question:

**Did the platform pay me the correct amount under our agreement?**

We will answer that question clearly and show the evidence behind the answer.

---

## 3. What payout reconciliation means

Payout reconciliation means checking whether the money and deductions reported by a platform match what should have happened.

For every relevant order, we will:

1. Find the order amount.
2. identify the delivery platform.
3. Find the agreement that applied to that merchant, platform, branch and date.
4. Calculate the agreed commission.
5. Add valid taxes and agreed fees.
6. Identify who funded each promotion or discount.
7. Account for cancellations, refunds and later adjustments.
8. Calculate what the merchant should receive.
9. Compare that expected amount with the available payout evidence.
10. Explain every difference it can support.

Payout reconciliation is not the same as measuring profit.

- **Payout reconciliation asks:** Did the platform pay the merchant correctly?
- **Profitability asks:** After product cost and every other expense, did the merchant make money?

Product cost is not required to check whether the platform followed its agreement. Product cost is required to calculate the merchant's profit and safe selling price.

---

## 4. Every platform agreement must be recorded separately

Different merchants can have different agreements with the same platform. One merchant may pay 18 percent while another pays 25 percent.

One merchant can also have different terms across Talabat, Jahez, Keeta, HungerStation, Salla or Zid.

PrizeSkout must therefore store a separate set of commercial terms for every connected platform.

The merchant should be able to record:

- Platform name
- Branches covered by the agreement
- Start date and, where applicable, end date
- Commission percentage
- What amount the commission is calculated on
- Payment-processing percentage
- Fixed fee per order
- VAT treatment
- Delivery charges
- Promotion-funding arrangement
- Advertising or subscription charges
- Payout schedule
- Evidence supporting the terms

Old agreements must remain available. If the rate changed in June, an April order must still be checked using the April agreement.

The merchant's margin rule is different from the platform's percentage:

- **Platform percentage:** a cost charged by a sales or delivery channel.
- **Margin rule:** the minimum amount the merchant wants to keep after product cost and channel costs.

---

## 5. What information PrizeSkout needs

### Order information

Ideally, every order record includes:

- POS order number
- Platform order number
- Platform or sales channel
- Branch
- Order date and time
- Products and quantities
- Selling price
- Customer discount
- Who funded the discount
- Taxes
- Service and delivery charges
- Payment method
- Completed, cancelled or refunded status
- Later changes to the order

### Agreement information

PrizeSkout needs the merchant's real commercial terms, not a general rate found online.

The best evidence includes:

- Signed agreement
- Approved rate amendment
- Promotion confirmation
- Email from the platform's account manager
- Previous statement showing an accepted rate
- Merchant-entered terms awaiting confirmation

### Payout information

Useful payout evidence includes:

- Settlement report
- Payout notice
- Credit note
- Promotion-funding confirmation
- Adjustment notice
- Aggregator email
- Merchant confirmation that a payment was received

A private bank statement should not be compulsory. If the merchant voluntarily provides payment confirmation, it can strengthen the evidence, but reconciliation must not depend on access to the merchant's bank account.

---

## 6. How automatic email collection should work

Merchants should not have to download and upload every document manually.

We will support two simple setup choices.

### Choice A: Connect the business mailbox

1. The merchant clicks **Connect Gmail** or **Connect Microsoft email**.
2. Google or Microsoft shows the merchant exactly what PrizeSkout wants permission to read.
3. The merchant approves access.
4. PrizeSkout watches only the relevant messages or labels.
5. New payout notices, credit notes and reports are collected automatically.
6. The merchant can disconnect access at any time.

The merchant does not give us their email password.

### Choice B: Use a private PrizeSkout forwarding address

1. We give the merchant a private address created for their business.
2. The merchant creates one forwarding rule in their email account.
3. Messages from approved platform senders are forwarded automatically.
4. PrizeSkout reads the message and its attachments.
5. The original evidence is saved with the merchant's account.

This setup should be completed once. After that, the collection is automatic.

### What happens after a message arrives

We will:

1. Confirm which merchant received the message.
2. Identify the platform and document type.
3. Read the attachment or email content.
4. Extract the payout period, totals, charges and order references.
5. Check for duplicate documents.
6. Link the evidence to the appropriate orders and agreement.
7. Run reconciliation automatically.
8. Notify the merchant only when attention is genuinely required.

### Safety requirements

- Read only what is required for reconciliation.
- Do not collect unrelated personal messages.
- Encrypt saved documents.
- Record when and where evidence came from.
- Let the merchant disconnect and request deletion.
- Warn when a document appears altered, incomplete or duplicated.

---

## 7. How POS integration works in simple terms

A POS is the system the merchant uses to record sales and manage restaurant orders.

Many merchants already receive delivery-platform orders inside their POS or an order-management system. This allows us to obtain order information from the merchant's system without connecting directly to Talabat, Jahez or Keeta.

### The preferred connection

1. The merchant clicks **Connect my POS** in PrizeSkout.
2. The POS company opens its own secure permission page.
3. The merchant signs in directly with the POS company.
4. The merchant allows PrizeSkout to read selected order information.
5. The POS gives PrizeSkout a limited digital permission.
6. PrizeSkout begins receiving the permitted records automatically.

The merchant does not give us their password.

The permission should allow PrizeSkout to read orders but should not allow it to:

- Delete orders
- Issue refunds
- Change prices
- Access card information
- Change restaurant operations

The merchant should be able to disconnect PrizeSkout at any time.

---

## 8. The different POS access routes

We will support more than one route because POS providers have different rules.

### Route 1: Merchant-approved connection

The merchant gives PrizeSkout limited permission through the POS company's secure connection screen.

This is the best route because it is automatic, controlled by the merchant and does not expose passwords.

### Route 2: Approved technology partnership

Some POS providers only work with companies they have reviewed and approved. We apply, demonstrate our product, complete testing and receive partner access.

### Route 3: Order-management partner

Systems such as Deliverect and Grubtech already collect orders from several delivery platforms. Connecting to one of these systems may provide several channels through a single relationship.

### Route 4: Automatic reports

If live access is unavailable, the POS can send or export reports. PrizeSkout collects them through email or a monitored folder.

### Route 5: Merchant-installed read-only connector

Where the POS provider permits it, a small PrizeSkout program can run at the merchant's location and send approved order records securely.

Manual upload remains available for emergencies, but it should not be the normal daily process.

---

## 9. POS and order-platform findings

### Foodics - very high priority

Foodics is one of the clearest starting opportunities.

What we found:

- A merchant can authorize a registered Foodics integration.
- The merchant can select the relevant business and branches.
- Access can be changed or removed.
- Foodics also provides detailed order exports.
- Personal integration access may require an eligible subscription or API licence.

Why it matters:

Foodics can provide the merchant's order record, while its export gives PrizeSkout a fallback during the partnership process.

Our approach:

1. Apply to become a registered Foodics integration.
2. Build the Foodics order-file importer immediately.
3. Ask for read-only, branch-limited order access.
4. Confirm that the original delivery channel and external order number are available.

### Marn - very high Saudi priority

Marn is a Saudi POS provider with a public developer-enrolment route and connections to several delivery and payment services.

What remains to be confirmed:

- Whether a merchant can authorize PrizeSkout directly
- Whether formal partner approval is required
- Whether historical completed orders are available
- Whether delivery-platform order references are preserved
- Whether refunds and later changes are included
- Whether there are certification or access fees

Our approach:

Apply through Marn's developer programme and request read-only restaurant order access.

### Sapaad - very high GCC priority

Sapaad Connect brings orders from delivery platforms into the restaurant's operating system. Public material lists connections with platforms and order-management partners.

Why it matters:

Sapaad may already hold the order source, external reference, products, discounts, branch and order status required by PrizeSkout.

Our approach:

Approach Sapaad as a profit-protection and reporting partner. Ask for a read-only order feed and an automatic report option.

### Deliverect - very high partnership priority

Deliverect collects orders from multiple ordering channels and sends them to restaurant systems in one standard format.

Our position is not consumer ordering and not payment processing. We will apply as a reporting and technology partner.

Our preferred route is Deliverect's Reporting API. If the reporting information is incomplete, we will ask whether normalized order notifications can supplement it.

Questions Deliverect must answer:

- Are historical, order-level records available?
- Can the original delivery channel and external order number be identified?
- Can merchants authorize selected locations?
- Are refunds and later adjustments available?
- Are platform-funded and merchant-funded discounts separated?
- Are commissions and settlement deductions included, or only order sales?

Deliverect may provide order truth without providing final payout truth. Aggregator payout evidence will probably still be required.

### Grubtech - very high Middle East priority

Grubtech connects restaurants, POS systems and delivery platforms across the region.

Why it matters:

One Grubtech partnership may allow PrizeSkout to support several POS and delivery-platform combinations.

Our approach:

Ask for merchant-authorized, read-only order data, channel identifiers, historical access and automatic updates.

### Oracle MICROS Simphony - high enterprise priority

Oracle offers reporting access to sales, guest checks and operational records. An authorized administrator at the merchant can create the required reporting account.

Why it matters:

It is relevant for hotel groups, restaurant chains and larger operators.

Our approach:

Use the reporting connection rather than operational or payment access. Confirm the merchant's version, licence and channel mapping before promising support.

### NCR Aloha - medium priority

NCR provides developer tools, but live restaurant access may require credentials, certification and vendor coordination.

Our approach:

Do not make it an early dependency. Pursue it when committed Aloha merchants need it, or reach it through an existing order-management partner.

### Syrve - medium priority

Syrve provides tools that can expose orders, payments, discounts and statuses through a restaurant-installed integration.

Our approach:

Confirm merchant demand and vendor permission before investing in a connector.

### Geidea - lower initial priority

Geidea's public developer information focuses heavily on payment processing.

PrizeSkout does not need card-processing access. That would add risk without solving the main reconciliation problem.

Our approach:

Ask whether Geidea offers a separate read-only restaurant sales and reporting connection.

---

## 10. What PrizeSkout can prove when reports are incomplete

PrizeSkout must never claim more certainty than the evidence supports.

### Confirmed discrepancy

Use this when PrizeSkout has enough order, agreement and payout detail to show a specific incorrect charge.

### Probable discrepancy

Use this when the calculation strongly suggests an error but one supporting detail is missing.

### Unallocated batch difference

Use this when the payout total is wrong but the platform has not supplied enough detail to identify the affected order.

### Insufficient evidence

Use this when the available records cannot support a reliable conclusion.

Example:

If the platform reports QAR 9,000 in total deductions and PrizeSkout calculates QAR 8,300, PrizeSkout can show an unexplained QAR 700 difference. If the report contains no order-level breakdown, PrizeSkout must not invent which order caused it.

---

## 11. The automatic daily process

Once the merchant completes setup, the normal process should require almost no work.

1. New POS or order-system records arrive automatically.
2. Relevant emails and attachments arrive automatically.
3. PrizeSkout identifies the merchant, platform, branch and period.
4. Duplicate evidence is ignored.
5. The correct agreement version is selected.
6. PrizeSkout calculates the expected deductions and payout.
7. Available payout evidence is compared with the expectation.
8. Clear differences are placed in a review queue.
9. PrizeSkout prepares supporting evidence for a dispute.
10. The merchant approves any protected external action.
11. Recovery progress is tracked until resolved.

The merchant should only be interrupted when:

- Agreement information is missing
- A document cannot be understood safely
- Several orders have the same reference
- A discrepancy needs approval before dispute
- The available evidence is not strong enough

---

## 12. What should remain under merchant control

PrizeSkout can automatically collect, calculate and prepare evidence. It should not automatically take every external action.

Merchant approval should normally be required before:

- Submitting a dispute to a platform
- Sending an external email in the merchant's name
- Changing a live price
- Creating or activating a promotion
- Issuing a refund
- Disconnecting a commercial integration

Every action should show:

- What PrizeSkout proposes to do
- Why it is proposing it
- The supporting evidence
- The expected financial effect
- Whether the action can be reversed

---

## 13. Questions for every POS or order-system provider

1. Can an individual merchant authorize PrizeSkout?
2. Can access be limited to reading data only?
3. Can the merchant select specific branches?
4. Are completed orders available automatically?
5. Can historical orders be retrieved?
6. Is the original delivery platform identified?
7. Is the external platform order number included?
8. Are refunds, cancellations and later changes included?
9. Are discounts separated by who funded them?
10. Are taxes, service charges and delivery charges included?
11. Are actual platform commissions or settlement amounts available?
12. What happens if an automatic update is missed?
13. Can the merchant disconnect PrizeSkout themselves?
14. Is a testing environment available?
15. Are approval, certification or licence fees required?
16. Is the service available in Qatar and Saudi Arabia?
17. Where will the merchant's data be stored?
18. Is an automatic scheduled report available if live access is declined?

---

## 14. Risks and protections

### Risk: A provider refuses access

Protection: continue through merchant-owned reports, email, exports or another approved order system.

### Risk: A report is too vague

Protection: report the batch-level difference and clearly state that it cannot yet be assigned to an individual order.

### Risk: A provider changes its file format

Protection: keep the original document, detect unexpected changes and pause uncertain calculations for review.

### Risk: The wrong agreement is applied

Protection: keep start and end dates for every agreement version and branch.

### Risk: PrizeSkout collects unnecessary information

Protection: request the smallest possible read-only permission and avoid card and unrelated customer information.

### Risk: Merchants are overwhelmed by alerts

Protection: group low-value findings and interrupt the merchant only when a decision or approval is necessary.

---

## 15. Our conclusion

We are building PrizeSkout to become the merchant's independent financial record for platform sales.

Our system will not depend on one aggregator, one POS, one report format or one method of access.

The strongest design combines:

- Automatic POS or order-system records
- Automatic email evidence
- Merchant-specific agreements
- Platform payout reports
- Honest evidence-strength labels
- Merchant approval for protected external actions

In one sentence:

**PrizeSkout records what the merchant sold, calculates what each platform should have charged, compares that with what the platform reported, and shows where money is missing.**
