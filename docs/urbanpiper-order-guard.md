# UrbanPiper Order Guard

Order Guard watches orders after UrbanPiper accepts and relays them. It gives the branch an operational acknowledgement surface and escalates orders that do not progress.

## Default operating policy

- 0–59 seconds: watching for branch acknowledgement.
- 60 seconds: order needs branch attention.
- 120 seconds: manager escalation.
- 180 seconds: critical escalation.
- 15 minutes without progression after acknowledgement: critical escalation.
- Expected-ready time plus 5 minutes: critical if the order is still not ready.

The defaults are intentionally usable across quick-service and casual restaurants without per-merchant discovery. They can be made configurable later without changing the event contract.

## Activate a merchant

In **AI Store Manager → Order Guard**, enter the merchant's UrbanPiper business ID and select **Activate Order Guard**. PrizeSkout creates a one-time webhook credential. Configure the returned URL and header for both UrbanPiper `order_placed` and `order_status_update` events.

PrizeSkout stores only a SHA-256 hash of the generated credential. Provisioning the same UrbanPiper business again rotates the credential, immediately invalidating the prior URL.

UrbanPiper should send order relay events to:

```text
POST https://<prizeskout-host>/api/webhooks/urbanpiper
x_api_token: <one-time-secret>
X-UPR-Biz-Id: <UrbanPiper business ID>
```

Successful new events return `202`; replayed order IDs return `200`. Both include an `order_ref_id` at the JSON root, so UrbanPiper receives the required acknowledgement while PrizeSkout keeps the UrbanPiper order ID unique. Non-2xx responses intentionally invite UrbanPiper's configured retry scheme.

The webhook handler accepts UrbanPiper's configurable `x_api_token` header and validates `X-UPR-Biz-Id` against both the payload and the merchant connection. The legacy secret-header and URL-key forms remain accepted for backwards compatibility, but new configurations should use `x_api_token`.

## Runtime escalation

Configure the deployed scheduler to call the following endpoint at least once per minute:

```text
POST /api/public/hooks/order-guard
Authorization: Bearer <CRON_SECRET>
```

Dashboard polling also runs the sweep, but the scheduler is required for continuous escalation when nobody has the dashboard open.

Order Guard creates in-app attention items at escalation thresholds. Branch devices can additionally enable browser notifications and an audible signal from the Order Guard panel.

The branch controls currently advance PrizeSkout's operational monitoring state. Sending `Acknowledged`, `Food Ready`, `Dispatched`, or `Completed` back to UrbanPiper requires downstream partner API credentials and must be enabled only after UrbanPiper sandbox validation. The interface states this explicitly and does not claim outbound synchronization.

## What it guarantees

Order Guard detects and escalates an order that reaches PrizeSkout but is not acknowledged or progressed by the restaurant. The source heartbeat shows when UrbanPiper last delivered an event. Detecting an order that never reaches either UrbanPiper or PrizeSkout requires a second independent order source and is not claimed by this workflow.
