-- Add 'keeta' to the ps_merchant_channels platform allow-list.
--
-- Keeta (Qatar/KSA delivery aggregator) uses a merchant self-authorization
-- OAuth flow with per-request SHA-256 request signing (see
-- src/server/core/keeta-client.ts) rather than a simple bearer-token paste.
-- The integration code is complete ahead of Keeta's manual developer-approval
-- process; KEETA_APP_ID/KEETA_APP_SECRET are set as Cloudflare Worker
-- secrets once Keeta issues them.

ALTER TABLE ps_merchant_channels
  DROP CONSTRAINT IF EXISTS ps_merchant_channels_platform_check;

ALTER TABLE ps_merchant_channels
  ADD CONSTRAINT ps_merchant_channels_platform_check
  CHECK (platform IN ('salla','foodics','zid','talabat','jahez','snoonu','deliveroo','keeta'));
