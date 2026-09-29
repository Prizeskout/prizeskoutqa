# Integration Register

| Integration | Role | Current evidence | Protection / next verification |
|---|---|---|---|
| Zid | Published commerce integration | Auth, callbacks, tokens, webhooks, catalogue and order paths exist | Protected; run `verify-zid-contract` around related changes |
| Salla | Published commerce integration | Easy Mode, signed lifecycle webhooks, token introspection, embedded dashboard, onboarding, provisioning, catalog sync queue, and uninstall/reinstall paths exist; production iframe lifecycle verified on a demo store | Protected; run `verify-salla-contract` and `verify-zid-contract` around changes. Welcome-email delivery and remaining failure matrix are pending. |
| Talabat | Sandbox/plugin and action infrastructure | Contract checks, callback/order/action files and tables reported | Do not weaken RLS; verify current deployment before mutation |
| Keeta | Integration foundation | Auth, client, contract and operations code exist | Verify contract; production status not inferred |
| Snoonu | Partner pilot | Dossier, API contract, routes and migrations exist | Treat as pilot until external acceptance is recorded |
| Foodics | Read-only order evidence | Bounded adapter and source-pull path exist | First production evidence adapter; merchant authorization and live smoke pending |
| Universal connector | Provider-neutral ingestion | Contract, control-plane and vault migrations exist | Preserve source permissions, scope, completeness and provenance |
| Odoo | Restaurant/connector adapters | Contract and adapter checks exist | Deployment/customer state unknown |
| Gmail / Microsoft | Restricted evidence mailbox | Strategy defined; mailbox foundation exists | OAuth implementation and production consent flow pending |
| Marn / Sapaad / Deliverect / Grubtech | Planned evidence accelerators | Strategy research only in current pack | Build only with permitted access and merchant demand |

Never store secrets in this register. Record only secret names and configuration state.
