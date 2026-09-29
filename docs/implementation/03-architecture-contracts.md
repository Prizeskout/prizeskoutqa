# Architecture Contracts

1. **API independence:** No single provider API may be required for core reconciliation.
2. **Truth separation:** Orders, contracts, payouts, and receipt confirmation remain separate records.
3. **Evidence before claims:** A financial conclusion must carry its sources, scope, dates, currency, agreement, and blockers.
4. **No invented allocation:** Batch totals cannot be silently allocated to orders.
5. **Effective-dated terms:** Commercial terms are merchant-, channel-, branch-, brand-, entity-, currency-, and period-aware where applicable.
6. **Append-only audit:** Original evidence, processing attempts, event revisions, matches, findings, approvals, and recovery transitions are not overwritten.
7. **Review gates:** Machine extraction is a draft until authorized review; evidence approval does not automatically activate contract terms.
8. **Least privilege:** Read only the minimum permitted financial and operational fields; discard customer, card, and unrelated payload data.
9. **Safe external actions:** Collection and calculation permissions never imply permission to dispute, message, refund, promote, or reprice.
10. **Failure isolation:** New ingestion and shadow paths must not fail protected provider acknowledgements or existing integrations.
11. **One calculation layer:** Dashboard, APIs, exports, and Copilot use the same governed financial services.
12. **Honest coverage:** Freshness and observed records never equal completeness unless the connector supplies and passes explicit completeness checks.
