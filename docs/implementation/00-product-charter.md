# Product Charter

## Product promise

PrizeSkout is the merchant's independent financial record for platform commerce. It records what the merchant sold, applies the commercial terms that were effective for that merchant, channel, branch, and date, compares the result with payout evidence, and shows where money is missing without overstating what the evidence proves.

## Initial customer and wedge

- Restaurant groups, cloud kitchens, and digital-commerce merchants in Qatar, Saudi Arabia, and the wider GCC.
- Initial wedge: platform payout correctness, true contribution profit, margin leakage, and evidence-backed recovery.
- Primary activation outcome: first verified financial finding, not account creation or dashboard viewing.

## Three truths and one optional confirmation

1. **Order truth:** what the merchant sold, normally from POS or order records.
2. **Contract truth:** what the merchant agreed to pay the channel.
3. **Payout truth:** what the platform reports it deducted and paid.
4. **Receipt confirmation:** whether funds arrived; useful but not mandatory for base reconciliation.

These records must remain structurally and conceptually distinct.

## Evidence conclusions

- Confirmed discrepancy
- Probable discrepancy
- Unallocated batch difference
- Insufficient evidence
- Reconciled / no discrepancy

Only an evidenced, allocated underpayment with an applicable approved agreement and no blockers may become claims-ready automatically.

## Architectural principles

- Merchant-controlled evidence first: email, forwarding address, exports, retained documents, and optional read-only connections.
- APIs and formal partnerships are accelerators, never prerequisites for core value.
- Original evidence is privately retained and fingerprinted before interpretation.
- Normalized events, processing attempts, matches, findings, and recovery history are append-only and provenance-bearing.
- Provider format changes stop for review rather than falling through to fuzzy financial parsing.
- Product calculations are deterministic and governed; AI may extract, explain, and orchestrate but must not invent financial facts.
- Dashboard and Copilot use the same controlled services and definitions.
- External actions remain merchant-controlled.

## Near-term north-star workflow

`collect evidence -> approve terms -> calculate expected payout -> compare payout -> explain finding -> prepare recovery pack -> merchant approves -> track recovery`

## Current non-goals

- A generic restaurant AI workforce
- Voice briefings
- CCTV, labor, loyalty, or customer-review suites
- Broad BI unrelated to platform profitability
- Mandatory bank access
- Fully autonomous disputes or price changes
- Connector-count marketing unsupported by reliable, documented capabilities
