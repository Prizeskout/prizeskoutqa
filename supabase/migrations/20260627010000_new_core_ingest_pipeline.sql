-- =============================================================================
-- New Core: GCC Pricing Infrastructure Pipeline
-- ps_ prefix keeps these tables isolated from the legacy analytics schema.
-- Tables: ingest → decide → dispatch → govern
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ps_ingest_events: raw inbound events from Salla / Foodics / Zid / SAP
-- ---------------------------------------------------------------------------
CREATE TABLE ps_ingest_events (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid        NOT NULL,
  licensee_id           uuid        NOT NULL,
  api_key_id            uuid,
  -- identity
  event_id              text        NOT NULL,
  idempotency_key       text        NOT NULL,
  region                text        NOT NULL CHECK (region IN ('QA','SA','AE','KW','BH','OM')),
  source_platform       text        NOT NULL CHECK (source_platform IN ('foodics','salla','zid','sap','microsoft')),
  merchant_id           text        NOT NULL,
  location_id           text,
  -- item
  item_id               text,
  sku                   text        NOT NULL,
  item_name_en          text,
  item_name_ar          text,
  inventory_status      text        NOT NULL DEFAULT 'in_stock',
  -- financials
  base_cost             numeric(14,4) NOT NULL,
  current_retail_price  numeric(14,4) NOT NULL,
  currency              text        NOT NULL DEFAULT 'QAR',
  vat_rate              numeric(8,6) NOT NULL DEFAULT 0,
  -- raw
  raw_payload           jsonb       NOT NULL DEFAULT '{}',
  -- pipeline state
  status                text        NOT NULL DEFAULT 'received'
                          CHECK (status IN ('received','decided','dispatched','failed')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, idempotency_key)
);

CREATE INDEX idx_ps_ingest_events_account    ON ps_ingest_events(account_id, created_at DESC);
CREATE INDEX idx_ps_ingest_events_merchant   ON ps_ingest_events(account_id, merchant_id);
CREATE INDEX idx_ps_ingest_events_sku        ON ps_ingest_events(account_id, sku);

-- ---------------------------------------------------------------------------
-- 2. ps_decide_results: margin calculation output per ingest event
-- ---------------------------------------------------------------------------
CREATE TABLE ps_decide_results (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_event_id       uuid        NOT NULL REFERENCES ps_ingest_events(id) ON DELETE CASCADE,
  account_id            uuid        NOT NULL,
  licensee_id           uuid        NOT NULL,
  region                text        NOT NULL,
  merchant_id           text        NOT NULL,
  sku                   text        NOT NULL,
  -- inputs
  base_cost             numeric(14,4) NOT NULL,
  current_retail_price  numeric(14,4) NOT NULL,
  commission_rate       numeric(8,6) NOT NULL,
  vat_rate              numeric(8,6) NOT NULL,
  logistics_subsidy     numeric(14,4) NOT NULL DEFAULT 0,
  margin_floor_pct      numeric(8,6) NOT NULL,
  -- outputs
  net_margin            numeric(14,4) NOT NULL,
  net_margin_pct        numeric(10,8) NOT NULL,
  floor_breached        boolean     NOT NULL,
  recommended_price     numeric(14,4),
  decision_action       text        NOT NULL
                          CHECK (decision_action IN ('hold','reprice_up','reprice_down','cannot_achieve_floor')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ps_decide_results_ingest    ON ps_decide_results(ingest_event_id);
CREATE INDEX idx_ps_decide_results_account   ON ps_decide_results(account_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. ps_merchant_channels: channel credential vault
-- ---------------------------------------------------------------------------
CREATE TABLE ps_merchant_channels (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid        NOT NULL,
  licensee_id       uuid        NOT NULL,
  merchant_id       text        NOT NULL,
  platform          text        NOT NULL
                      CHECK (platform IN ('salla','foodics','zid','talabat','jahez','snoonu','deliveroo')),
  -- credentials (encrypted in production via vault)
  bearer_token      text,
  manager_token     text,           -- Zid only: X-MANAGER-TOKEN
  scopes            text[]      NOT NULL DEFAULT '{}',
  -- connection state
  status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','connected','error','revoked')),
  error_message     text,
  connected_at      timestamptz,
  last_verified_at  timestamptz,
  metadata          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, merchant_id, platform)
);

CREATE INDEX idx_ps_channels_account ON ps_merchant_channels(account_id, merchant_id);

-- ---------------------------------------------------------------------------
-- 4. ps_aggregator_dispatch_log: outbound reprice attempts
-- ---------------------------------------------------------------------------
CREATE TABLE ps_aggregator_dispatch_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id            text        NOT NULL UNIQUE
                        DEFAULT ('trc_' || replace(gen_random_uuid()::text, '-', '')),
  ingest_event_id     uuid        REFERENCES ps_ingest_events(id),
  decide_result_id    uuid        REFERENCES ps_decide_results(id),
  account_id          uuid        NOT NULL,
  licensee_id         uuid        NOT NULL,
  merchant_id         text        NOT NULL,
  sku                 text        NOT NULL,
  target_channel      text        NOT NULL,
  remote_branch_id    text,
  menu_item_id        text,
  action_type         text        NOT NULL DEFAULT 'dynamic_margin_defense',
  old_price           numeric(14,4),
  new_price           numeric(14,4) NOT NULL,
  currency            text        NOT NULL DEFAULT 'QAR',
  -- immutable audit snapshot (embedded at dispatch time)
  audit_snapshot      jsonb       NOT NULL,
  -- result
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending','success','failed',
                          'rate_limited','timeout','schema_mismatch',
                          'queued','circuit_open'
                        )),
  http_status         int,
  upstream_message    text,
  retry_count         int         NOT NULL DEFAULT 0,
  max_retries         int         NOT NULL DEFAULT 5,
  next_retry_at       timestamptz,
  duration_ms         int,
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX idx_ps_dispatch_account   ON ps_aggregator_dispatch_log(account_id, created_at DESC);
CREATE INDEX idx_ps_dispatch_channel   ON ps_aggregator_dispatch_log(account_id, target_channel);
CREATE INDEX idx_ps_dispatch_retry     ON ps_aggregator_dispatch_log(status, next_retry_at)
  WHERE status IN ('rate_limited','timeout','queued');

-- ---------------------------------------------------------------------------
-- 5. ps_circuit_breaker_state: per-account per-channel breaker
-- ---------------------------------------------------------------------------
CREATE TABLE ps_circuit_breaker_state (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid        NOT NULL,
  target_channel  text        NOT NULL,
  state           text        NOT NULL DEFAULT 'closed'
                    CHECK (state IN ('closed','half_open','open')),
  error_count     int         NOT NULL DEFAULT 0,
  last_error_at   timestamptz,
  opened_at       timestamptz,
  next_probe_at   timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, target_channel)
);

CREATE INDEX idx_ps_circuit_breaker ON ps_circuit_breaker_state(account_id);

-- ---------------------------------------------------------------------------
-- 6. ps_govern_audit_log: bilingual cryptographic audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE ps_govern_audit_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id          text        NOT NULL UNIQUE,
  account_id        uuid        NOT NULL,
  licensee_id       uuid        NOT NULL,
  ingest_event_id   uuid        REFERENCES ps_ingest_events(id),
  dispatch_id       uuid        REFERENCES ps_aggregator_dispatch_log(id),
  merchant_id       text        NOT NULL,
  sku               text        NOT NULL,
  region            text        NOT NULL,
  source_platform   text,
  target_channel    text,
  event_type        text        NOT NULL
                      CHECK (event_type IN ('ingest','decide','dispatch','error','channel_connect')),
  -- bilingual output
  summary_en        text        NOT NULL,
  summary_ar        text        NOT NULL,
  -- compliance
  data_route        text,           -- e.g. 'QA' or 'QA→KSA'
  pdpl_compliant    boolean     NOT NULL DEFAULT true,
  -- cryptographic integrity
  payload_hash      text        NOT NULL,
  payload_snapshot  jsonb       NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ps_govern_account  ON ps_govern_audit_log(account_id, created_at DESC);
CREATE INDEX idx_ps_govern_merchant ON ps_govern_audit_log(account_id, merchant_id);
CREATE INDEX idx_ps_govern_trace    ON ps_govern_audit_log(trace_id);

-- ---------------------------------------------------------------------------
-- RLS — service role bypasses all policies (our server uses service role key)
-- ---------------------------------------------------------------------------
ALTER TABLE ps_ingest_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_decide_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_merchant_channels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_aggregator_dispatch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_circuit_breaker_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ps_govern_audit_log       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON ps_ingest_events
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON ps_decide_results
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON ps_merchant_channels
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON ps_aggregator_dispatch_log
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON ps_circuit_breaker_state
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON ps_govern_audit_log
  FOR ALL USING (auth.role() = 'service_role');
