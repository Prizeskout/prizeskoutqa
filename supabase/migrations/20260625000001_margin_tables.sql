-- Margin product: per-channel net margin analytics for aggregator sellers.
-- Tables are separate from PrizeSkout intelligence tables — no cross-contamination.

-- Supported aggregator platform enum
CREATE TYPE margin_platform AS ENUM (
  'talabat', 'snoonu', 'noon', 'amazon_ae', 'deliveroo', 'careem', 'other'
);

CREATE TYPE margin_upload_status AS ENUM (
  'pending', 'processing', 'done', 'error'
);

-- Per-user channel configuration (one row per aggregator they sell through)
CREATE TABLE margin_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        margin_platform NOT NULL,
  display_name    text NOT NULL,
  commission_rate numeric(5,4),          -- 0.25 = 25 %
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

ALTER TABLE margin_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "margin_channels_own" ON margin_channels
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CSV / payout file uploads
CREATE TABLE margin_uploads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform       margin_platform NOT NULL,
  filename       text NOT NULL,
  row_count      integer,
  date_from      date,
  date_to        date,
  status         margin_upload_status NOT NULL DEFAULT 'pending',
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz
);

ALTER TABLE margin_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "margin_uploads_own" ON margin_uploads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Normalised order records (one row per delivery order, across all platforms)
CREATE TYPE margin_daypart AS ENUM ('breakfast', 'lunch', 'dinner', 'late_night', 'other');

CREATE TABLE margin_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id        uuid REFERENCES margin_uploads(id) ON DELETE SET NULL,
  platform         margin_platform NOT NULL,
  external_order_id text NOT NULL,
  order_date       timestamptz NOT NULL,
  gross_revenue    numeric(12,2) NOT NULL,
  commission_amount numeric(12,2),
  commission_rate  numeric(5,4),
  net_payout       numeric(12,2),
  items            jsonb NOT NULL DEFAULT '[]', -- [{name, qty, unit_price}]
  daypart          margin_daypart,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, external_order_id)
);

ALTER TABLE margin_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "margin_orders_own" ON margin_orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX margin_orders_user_date ON margin_orders (user_id, order_date DESC);
CREATE INDEX margin_orders_platform ON margin_orders (user_id, platform);

-- Cost profiles: user's COGS + packaging costs per item name
CREATE TABLE margin_cost_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name          text NOT NULL,
  cogs               numeric(12,2),
  packaging_cost     numeric(12,2),
  prep_time_minutes  integer,
  hourly_labor_cost  numeric(12,2),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_name)
);

ALTER TABLE margin_cost_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "margin_cost_profiles_own" ON margin_cost_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger: keep updated_at current on margin_channels and margin_cost_profiles
CREATE TRIGGER set_margin_channels_updated_at
  BEFORE UPDATE ON margin_channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_margin_cost_profiles_updated_at
  BEFORE UPDATE ON margin_cost_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
