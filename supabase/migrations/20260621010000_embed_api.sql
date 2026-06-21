-- ============================================================================
-- White-Label Embed API (API 13)
--
-- embed_configs: per-licensee branding + HS256 signing key.
-- One row per licensee; upsert on POST /v1/embed/config.
-- signing_key_hex is a 32-byte random key stored as hex — never returned to
-- callers; only used server-side when issuing / verifying embed JWTs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS embed_configs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id        uuid        NOT NULL UNIQUE,
  account_id         uuid        NOT NULL,
  brand_name         text        NOT NULL,
  primary_color      text        NOT NULL DEFAULT '#0066CC',
  logo_url           text,
  powered_by_visible boolean     NOT NULL DEFAULT false,
  signing_key_hex    text        NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE embed_configs ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS in Supabase by default; this policy blocks
-- direct anon/authenticated access so the signing key stays server-side.
CREATE POLICY "service_role_embed_configs" ON embed_configs
  TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON embed_configs TO service_role;

NOTIFY pgrst, 'reload schema';
