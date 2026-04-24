-- =====================================================================
-- Week 1: Three-tier identity model (Licensee → Account → Merchant)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Free up the `accounts` name (it's currently a "go-live application"
--    form, not a tenant model). Rename to licensee_applications.
-- ---------------------------------------------------------------------
ALTER TABLE public.accounts RENAME TO licensee_applications;

-- Rename existing policies to match the new table name (keeps semantics)
ALTER POLICY "Users insert own account" ON public.licensee_applications
  RENAME TO "Users insert own application";
ALTER POLICY "Users update own account" ON public.licensee_applications
  RENAME TO "Users update own application";
ALTER POLICY "Users view own account" ON public.licensee_applications
  RENAME TO "Users view own application";
ALTER POLICY "Admins update all accounts" ON public.licensee_applications
  RENAME TO "Admins update all applications";
ALTER POLICY "Admins view all accounts" ON public.licensee_applications
  RENAME TO "Admins view all applications";

-- ---------------------------------------------------------------------
-- 1. Licensees (top-level: the company that signed the contract)
-- ---------------------------------------------------------------------
CREATE TABLE public.licensees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  status          text NOT NULL DEFAULT 'trial'
                    CHECK (status IN ('trial','active','suspended','cancelled')),
  contact_email   text,
  billing_email   text,
  white_label     jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_licensees_status ON public.licensees(status);

ALTER TABLE public.licensees ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Licensee members (who can do what inside a licensee)
-- ---------------------------------------------------------------------
CREATE TYPE public.licensee_role AS ENUM ('owner','admin','developer','viewer');

CREATE TABLE public.licensee_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id   uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  role          public.licensee_role NOT NULL DEFAULT 'viewer',
  invited_by    uuid,
  invited_at    timestamptz,
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (licensee_id, user_id)
);
CREATE INDEX idx_licensee_members_user ON public.licensee_members(user_id);
CREATE INDEX idx_licensee_members_licensee ON public.licensee_members(licensee_id);

ALTER TABLE public.licensee_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. Accounts v2 (operating units under a licensee)
--    Named accounts_v2 because the legacy `accounts` -> `licensee_applications`
--    rename happens in the same migration; using a versioned name avoids
--    any chance of name-resolution edge cases mid-transaction.
--    Will be renamed to `accounts` in a follow-up migration once the
--    application code is fully off the legacy table.
-- ---------------------------------------------------------------------
CREATE TABLE public.accounts_v2 (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id   uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  name          text NOT NULL,
  region        text,
  currency      text NOT NULL DEFAULT 'QAR',
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (licensee_id, slug)
);
CREATE INDEX idx_accounts_v2_licensee ON public.accounts_v2(licensee_id);

ALTER TABLE public.accounts_v2 ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. Merchants (leaf tenant: restaurant, mall tenant, banner SKU owner)
-- ---------------------------------------------------------------------
CREATE TABLE public.merchants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id   uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  external_id   text,                  -- the licensee's own ID for this merchant
  name          text NOT NULL,
  category      text,
  channel       text,                  -- online | in-store | both
  country       text,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','archived')),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, external_id)
);
CREATE INDEX idx_merchants_account ON public.merchants(account_id);
CREATE INDEX idx_merchants_licensee ON public.merchants(licensee_id);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. Updated-at triggers (reuse existing set_updated_at function)
-- ---------------------------------------------------------------------
CREATE TRIGGER licensees_set_updated_at
  BEFORE UPDATE ON public.licensees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER licensee_members_set_updated_at
  BEFORE UPDATE ON public.licensee_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER accounts_v2_set_updated_at
  BEFORE UPDATE ON public.accounts_v2
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER merchants_set_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. Security-definer helper: is the caller a member of this licensee
--    with at least the given role?
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_licensee_member(
  _licensee_id uuid,
  _min_role public.licensee_role DEFAULT 'viewer'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.licensee_members m
    WHERE m.licensee_id = _licensee_id
      AND m.user_id = auth.uid()
      AND CASE _min_role
            WHEN 'viewer'    THEN m.role IN ('viewer','developer','admin','owner')
            WHEN 'developer' THEN m.role IN ('developer','admin','owner')
            WHEN 'admin'     THEN m.role IN ('admin','owner')
            WHEN 'owner'     THEN m.role = 'owner'
          END
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_licensee_member(uuid, public.licensee_role)
  TO authenticated;

-- ---------------------------------------------------------------------
-- 7. RLS — licensees
-- ---------------------------------------------------------------------
CREATE POLICY "Members view licensee"
  ON public.licensees FOR SELECT TO authenticated
  USING (public.is_licensee_member(id, 'viewer'));

CREATE POLICY "Admins update licensee"
  ON public.licensees FOR UPDATE TO authenticated
  USING (public.is_licensee_member(id, 'admin'));

CREATE POLICY "Owners delete licensee"
  ON public.licensees FOR DELETE TO authenticated
  USING (public.is_licensee_member(id, 'owner'));

-- INSERT is performed via a server function (createLicensee) which also
-- inserts the owner row in licensee_members. No client-side direct insert.
CREATE POLICY "Authenticated create licensee"
  ON public.licensees FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Platform admins (existing app_role 'admin') can see and manage everything
CREATE POLICY "Platform admins manage licensees"
  ON public.licensees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------
-- 8. RLS — licensee_members
-- ---------------------------------------------------------------------
-- A user can always see their OWN membership rows (so they can list the
-- licensees they belong to without an infinite recursion through is_licensee_member).
CREATE POLICY "User views own memberships"
  ON public.licensee_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins of a licensee can see all members of that licensee
CREATE POLICY "Admins view licensee members"
  ON public.licensee_members FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

-- Admins can invite/update members; only owners can change role to/from owner
-- (enforced in application code; SQL allows admins for now)
CREATE POLICY "Admins insert members"
  ON public.licensee_members FOR INSERT TO authenticated
  WITH CHECK (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Admins update members"
  ON public.licensee_members FOR UPDATE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Admins remove members"
  ON public.licensee_members FOR DELETE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Platform admins manage members"
  ON public.licensee_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------
-- 9. RLS — accounts_v2
-- ---------------------------------------------------------------------
CREATE POLICY "Members view accounts"
  ON public.accounts_v2 FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'viewer'));

CREATE POLICY "Admins insert accounts"
  ON public.accounts_v2 FOR INSERT TO authenticated
  WITH CHECK (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Admins update accounts"
  ON public.accounts_v2 FOR UPDATE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Admins delete accounts"
  ON public.accounts_v2 FOR DELETE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Platform admins manage accounts_v2"
  ON public.accounts_v2 FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------
-- 10. RLS — merchants
-- ---------------------------------------------------------------------
CREATE POLICY "Members view merchants"
  ON public.merchants FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'viewer'));

CREATE POLICY "Developers insert merchants"
  ON public.merchants FOR INSERT TO authenticated
  WITH CHECK (public.is_licensee_member(licensee_id, 'developer'));

CREATE POLICY "Developers update merchants"
  ON public.merchants FOR UPDATE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'developer'));

CREATE POLICY "Admins delete merchants"
  ON public.merchants FOR DELETE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Platform admins manage merchants"
  ON public.merchants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------
-- 11. Rebind api_keys to licensee_id (with backfill, zero data loss)
-- ---------------------------------------------------------------------
ALTER TABLE public.api_keys
  ADD COLUMN licensee_id uuid REFERENCES public.licensees(id) ON DELETE CASCADE;

CREATE INDEX idx_api_keys_licensee ON public.api_keys(licensee_id);

-- Backfill: create one personal licensee per user that owns api_keys or any
-- other user-scoped data, make them owner, give them one default account.
DO $$
DECLARE
  uid uuid;
  new_licensee_id uuid;
  user_email text;
  user_name text;
BEGIN
  FOR uid IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.api_keys
      UNION SELECT user_id FROM public.licensee_applications
      UNION SELECT id AS user_id FROM public.profiles
    ) u
    WHERE user_id IS NOT NULL
  LOOP
    -- Skip if this user already has a personal licensee
    IF EXISTS (
      SELECT 1 FROM public.licensee_members
      WHERE user_id = uid AND role = 'owner'
    ) THEN
      CONTINUE;
    END IF;

    SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
      INTO user_email, user_name
      FROM auth.users WHERE id = uid;

    IF user_email IS NULL THEN
      user_email := uid::text || '@unknown.local';
      user_name  := 'User ' || substr(uid::text, 1, 8);
    END IF;

    INSERT INTO public.licensees (slug, name, status, contact_email, billing_email)
    VALUES (
      'lic-' || replace(uid::text, '-', ''),
      COALESCE(user_name, user_email),
      'trial',
      user_email,
      user_email
    )
    RETURNING id INTO new_licensee_id;

    INSERT INTO public.licensee_members (licensee_id, user_id, role, accepted_at)
    VALUES (new_licensee_id, uid, 'owner', now());

    INSERT INTO public.accounts_v2 (licensee_id, slug, name, is_default)
    VALUES (new_licensee_id, 'default', 'Default', true);

    UPDATE public.api_keys
       SET licensee_id = new_licensee_id
     WHERE user_id = uid AND licensee_id IS NULL;
  END LOOP;
END $$;

-- All existing api_keys must now have a licensee_id
ALTER TABLE public.api_keys
  ALTER COLUMN licensee_id SET NOT NULL;

-- Replace api_keys RLS to read through licensee_members
DROP POLICY "Users delete own api keys" ON public.api_keys;
DROP POLICY "Users insert own api keys" ON public.api_keys;
DROP POLICY "Users update own api keys" ON public.api_keys;
DROP POLICY "Users view own api keys" ON public.api_keys;

CREATE POLICY "Members view api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'viewer'));

CREATE POLICY "Admins insert api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (
    public.is_licensee_member(licensee_id, 'admin')
    AND auth.uid() = user_id
  );

CREATE POLICY "Admins update api keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Admins delete api keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Platform admins manage api keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------
-- 12. Auto-provision a personal licensee when a new user signs up.
--     Replaces (and supersedes) the existing handle_new_user behavior
--     for profiles. We do not drop ensure_account_for_user — it now
--     ensures a licensee instead, but keeps the same name for callers.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_licensee_for_user(uid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_licensee uuid;
  new_licensee uuid;
  user_email text;
  user_name text;
BEGIN
  SELECT licensee_id INTO existing_licensee
    FROM public.licensee_members
   WHERE user_id = uid AND role = 'owner'
   LIMIT 1;

  IF existing_licensee IS NOT NULL THEN
    RETURN existing_licensee;
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
    INTO user_email, user_name
    FROM auth.users WHERE id = uid;

  IF user_email IS NULL THEN
    user_email := uid::text || '@unknown.local';
    user_name  := 'User ' || substr(uid::text, 1, 8);
  END IF;

  INSERT INTO public.licensees (slug, name, status, contact_email, billing_email)
  VALUES (
    'lic-' || replace(uid::text, '-', ''),
    COALESCE(user_name, user_email),
    'trial',
    user_email,
    user_email
  )
  RETURNING id INTO new_licensee;

  INSERT INTO public.licensee_members (licensee_id, user_id, role, accepted_at)
  VALUES (new_licensee, uid, 'owner', now());

  INSERT INTO public.accounts_v2 (licensee_id, slug, name, is_default)
  VALUES (new_licensee, 'default', 'Default', true);

  RETURN new_licensee;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_licensee_for_user(uuid)
  TO authenticated, service_role;
