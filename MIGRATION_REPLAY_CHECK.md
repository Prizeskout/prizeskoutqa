# MIGRATION REPLAY CHECK

**Question:** Would `supabase db push` of these files against a fresh empty Supabase project cleanly reproduce the full schema, and what (if anything) is missing or broken?

**Answer:** Mostly yes, with four CRITICAL blocking issues and several WARN-level concerns detailed in Section 3.

---

## Section 1 — Per-Migration Summary

All 32 files in timestamp order. "Creates" = net new objects after replay.

| # | File (timestamp prefix) | Creates | Notes |
|---|---|---|---|
| 1 | `20260420175027` | Tables: `profiles`, `overview_metrics`, `overview_alerts`, `overview_channels`, `overview_quick_actions`. Func: `set_updated_at()`. Trigger: `on_auth_user_created` → `handle_new_user()`. | Initial signup chain. |
| 2 | `20260420175038` | Nothing net-new — `CREATE OR REPLACE FUNCTION set_updated_at()` with identical body. | No-op duplicate; safe but unnecessary. |
| 3 | `20260420180031` | Tables: `pricing_metrics`, `pricing_recommendations`, `pricing_rules`. Rewrites `handle_new_user()` to seed all three. | |
| 4 | `20260420181051` | Tables: `competitor_metrics`, `competitor_prices`, `competitor_price_history`, `behavior_patterns`. Rewrites `handle_new_user()` + backfill DO block. | |
| 5 | `20260420183559` | Tables: `field_intel_metrics`, `recent_observations`, `price_gaps`, `field_team_activity`. Func: `seed_field_intel_for_user(uid)`. Rewrites `handle_new_user()` + backfill. | |
| 6 | `20260420184651` | Tables: `market_metrics`, `category_performance`, `trending_products`, `assortment_gaps`, `cross_border_radar`. Func: `seed_market_for_user(uid)`. Rewrites `handle_new_user()` + backfill. | |
| 7 | `20260420185409` | Tables: `promotions_metrics`, `promotion_calendar`, `past_campaigns`, `timing_insights`. Func: `seed_promotions_for_user(uid)`. Rewrites `handle_new_user()` + backfill. | |
| 8 | `20260420185836` | Tables: `benchmarks_metrics`, `market_benchmarks`, `model_knowledge`, `model_maturity`, `switching_cost`, `network_value`. Func: `seed_benchmarks_for_user(uid)`. Rewrites `handle_new_user()` + backfill. | |
| 9 | `20260420191127` | Tables: `roi_model_categories`, `promotions_scenarios`. Funcs: `trim_promotions_scenarios()` (trigger fn), `seed_roi_model_for_user(uid)`. Rewrites `handle_new_user()` + backfill. | |
| 10 | `20260420235610` | Table: `competitor_scrapes` (FK → `auth.users` ON DELETE CASCADE). | No `handle_new_user()` change. |
| 11 | `20260421000048` | Table: `user_roles`. Enum: `app_role`. Func: `has_role(uid, role)` SECURITY DEFINER. | |
| 12 | `20260421001502` | Table: `competitor_product_urls`. | |
| 13 | `20260421002633` | Extensions: `pg_cron`, `pg_net`. Cron job: `scrape-all-competitor-urls-6h` (every 6h). | **CRITICAL-1**: hardcodes wrong project anon key (`cfbownervtbospubjnuf`) and wrong URL (`prizeskoutqa.lovable.app`). Cron will 401/404 on replay. |
| 14 | `20260421003143` | Cron job: `scrape-all-competitor-urls-qat` (0 6,15 daily). Drops/replaces the 6h job. | **CRITICAL-1**: same hardcoded wrong project credentials. |
| 15 | `20260422001427` | Table: `ai_insights`. | |
| 16 | `20260422001936` | ALTER `ai_insights` ADD COLUMN `citations jsonb`. | |
| 17 | `20260422002852` | ALTER `ai_insights` ADD COLUMN `time_window text`; drops old unique constraint; new per-window unique index; check constraint on `time_window`. | |
| 18 | `20260422225050` | Tables: `contact_messages`, `user_account_settings`, `user_notification_settings`. | |
| 19 | `20260422231227` | Func: `seed_competitor_urls_for_user(uid)`. Rewrites `handle_new_user()` to use seed function calls instead of inline INSERTs (except overview tables, which stay inline). Does NOT seed `pricing_metrics`/`pricing_recommendations`/`pricing_rules` via inline inserts — those are delegated. | **WARN-4**: `pricing_metrics` and `pricing_recommendations` inserts dropped from this version's `handle_new_user()`; they were previously inline. Restored by later migrations. |
| 20 | `20260423013610` | Table: `pricing_decisions`. | |
| 21 | `20260423020000` | ALTER `pricing_recommendations` ADD COLUMN `source text NOT NULL DEFAULT 'seed'` + CHECK. ALTER `competitor_product_urls` ADD COLUMN `category text`. Unique index on `(user_id, product, channel, source)`. | |
| 22 | `20260423021539` | `cron.unschedule('scrape-all-competitor-urls-6h')` + `cron.unschedule('scrape-all-competitor-urls-qat')`. Cron is now fully paused. | **CRITICAL-2**: `cron.unschedule()` errors if the named job does not exist (no `IF EXISTS`). See lint flag. |
| 23 | `20260423161631` | Tables: `api_keys`, `webhook_endpoints`, `webhook_deliveries` (FK→`webhook_endpoints` CASCADE), `api_request_logs` (FK→`api_keys` SET NULL), `usage_events` (FK→`api_keys` SET NULL). RLS on all. | |
| 24 | `20260423162256` | ALTER `webhook_deliveries` ADD `payload`, `response_body`, `duration_ms`, `next_retry_at`, `max_attempts`. ALTER `webhook_endpoints` ADD `max_attempts`, `backoff_seconds`. Adds update policy for `webhook_deliveries`. | |
| 25 | `20260423165549` | Table: `accounts` (live API access application form; user_id PK). Func: `ensure_account_for_user(uid)`. Rewrites `handle_new_user()` to add account row + restore all seed function calls (`seed_field_intel_for_user`, `seed_market_for_user`, `seed_promotions_for_user`, `seed_benchmarks_for_user`, `seed_roi_model_for_user`, `seed_competitor_urls_for_user`). Backfills `accounts` from `auth.users`. | Note: `pricing_metrics`/`pricing_recommendations`/`pricing_rules` are NOT seeded here (restored in 20260618000001). |
| 26 | `20260424231425` | RENAME `public.accounts` → `public.licensee_applications` + rename 5 policies. Tables: `licensees`, `licensee_members` (FK→`licensees`), `accounts_v2` (FK→`licensees`), `merchants` (FK→`accounts_v2`,`licensees`). Enum: `licensee_role`. Func: `is_licensee_member()` SECURITY DEFINER. RLS on all 4 new tables. ALTER `api_keys` ADD `licensee_id` + backfill DO block + SET NOT NULL + replace api_keys RLS. Func: `ensure_licensee_for_user(uid)` SECURITY DEFINER (idempotent, returns licensee_id). | **CRITICAL-3**: `api_keys` NOT NULL alter will fail if any user in backfill union query returns no rows (see lint). |
| 27 | `20260424235247` | Func: `update_updated_at_column()` (separate from `set_updated_at()`). Tables: `catalog_products`, `catalog_prices`, `margin_inputs`, `dynprice_decisions`, `ingestion_batches` (all FK→`accounts_v2`+`licensees`). RLS on all. Funcs: `current_account_for_user(_user_id)`, `find_account_for_api_key(_api_key_id)` (both SECURITY DEFINER). | |
| 28 | `20260425003549` | Func: `find_user_id_by_email(email)` SECURITY DEFINER; reads `auth.users`; REVOKE from PUBLIC + GRANT to `authenticated`. | |
| 29 | `20260425011138` | Table: `notifications`. Indexes (user+unread, user+recent). RLS (select/update/delete to owner; no INSERT — server-side only). `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications`. `REPLICA IDENTITY FULL`. | **WARN-5**: `supabase_realtime` publication must pre-exist (Supabase-managed). |
| 30 | `20260425012003` | ALTER `webhook_endpoints` ADD `signing_version text NOT NULL DEFAULT 'v1'`, `secret_revealed_at timestamptz`, `secret_last_rotated_at timestamptz`. | |
| 31 | `20260618000001` | ALTER `pricing_rules` ADD `rule_type text NOT NULL DEFAULT 'legacy'` + `params jsonb NOT NULL DEFAULT '{}'` + CHECK constraint on rule_type values. Backfills 3 structured rules for existing users. Rewrites `handle_new_user()` with structured pricing_rules inserts. | **WARN-6**: this rewrite DROPS all `seed_*` calls — new signups after this migration lose field_intel, market, promotions, benchmarks, roi_model, competitor_urls seed data. |
| 32 | `20260618000002` | Rewrites `handle_new_user()` to add `PERFORM ensure_licensee_for_user(uid)` at the end. Backfill DO block for existing users without owner licensee_members. `NOTIFY pgrst, 'reload schema'`. | `seed_*` calls still absent (not restored here). Same WARN-6 applies. Schema cache reload fixes PostgREST INSERT errors for tables added in migrations 26–27. |

---

## Section 2 — Complete Table Set

57 tables created across all migrations (one was renamed: `accounts` → `licensee_applications` in migration 26).

| # | Table | Created by | Renamed by |
|---|---|---|---|
| 1 | `profiles` | 20260420175027 | |
| 2 | `overview_metrics` | 20260420175027 | |
| 3 | `overview_alerts` | 20260420175027 | |
| 4 | `overview_channels` | 20260420175027 | |
| 5 | `overview_quick_actions` | 20260420175027 | |
| 6 | `pricing_metrics` | 20260420180031 | |
| 7 | `pricing_recommendations` | 20260420180031 | |
| 8 | `pricing_rules` | 20260420180031 | |
| 9 | `competitor_metrics` | 20260420181051 | |
| 10 | `competitor_prices` | 20260420181051 | |
| 11 | `competitor_price_history` | 20260420181051 | |
| 12 | `behavior_patterns` | 20260420181051 | |
| 13 | `field_intel_metrics` | 20260420183559 | |
| 14 | `recent_observations` | 20260420183559 | |
| 15 | `price_gaps` | 20260420183559 | |
| 16 | `field_team_activity` | 20260420183559 | |
| 17 | `market_metrics` | 20260420184651 | |
| 18 | `category_performance` | 20260420184651 | |
| 19 | `trending_products` | 20260420184651 | |
| 20 | `assortment_gaps` | 20260420184651 | |
| 21 | `cross_border_radar` | 20260420184651 | |
| 22 | `promotions_metrics` | 20260420185409 | |
| 23 | `promotion_calendar` | 20260420185409 | |
| 24 | `past_campaigns` | 20260420185409 | |
| 25 | `timing_insights` | 20260420185409 | |
| 26 | `benchmarks_metrics` | 20260420185836 | |
| 27 | `market_benchmarks` | 20260420185836 | |
| 28 | `model_knowledge` | 20260420185836 | |
| 29 | `model_maturity` | 20260420185836 | |
| 30 | `switching_cost` | 20260420185836 | |
| 31 | `network_value` | 20260420185836 | |
| 32 | `roi_model_categories` | 20260420191127 | |
| 33 | `promotions_scenarios` | 20260420191127 | |
| 34 | `competitor_scrapes` | 20260420235610 | |
| 35 | `user_roles` | 20260421000048 | |
| 36 | `competitor_product_urls` | 20260421001502 | |
| 37 | `ai_insights` | 20260422001427 | |
| 38 | `contact_messages` | 20260422225050 | |
| 39 | `user_account_settings` | 20260422225050 | |
| 40 | `user_notification_settings` | 20260422225050 | |
| 41 | `pricing_decisions` | 20260423013610 | |
| 42 | `api_keys` | 20260423161631 | |
| 43 | `webhook_endpoints` | 20260423161631 | |
| 44 | `webhook_deliveries` | 20260423161631 | |
| 45 | `api_request_logs` | 20260423161631 | |
| 46 | `usage_events` | 20260423161631 | |
| 47 | `licensee_applications` | 20260423165549 (as `accounts`) | 20260424231425 |
| 48 | `licensees` | 20260424231425 | |
| 49 | `licensee_members` | 20260424231425 | |
| 50 | `accounts_v2` | 20260424231425 | |
| 51 | `merchants` | 20260424231425 | |
| 52 | `catalog_products` | 20260424235247 | |
| 53 | `catalog_prices` | 20260424235247 | |
| 54 | `margin_inputs` | 20260424235247 | |
| 55 | `dynprice_decisions` | 20260424235247 | |
| 56 | `ingestion_batches` | 20260424235247 | |
| 57 | `notifications` | 20260425011138 | |

**Total: 57 tables.** Matches expected Lovable DB count.

---

## Section 3 — Replay Lint Flags

### CRITICAL-1 — Cron migrations hardcode the wrong Supabase project

**Migrations:** `20260421002633`, `20260421003143`

Both migrations schedule cron jobs that call `pg_net.http_post()` with:
- URL: `https://prizeskoutqa.lovable.app/...` (Lovable preview URL, not the target deployment)
- Authorization header: hardcoded anon key for project `cfbownervtbospubjnuf`

The target project is `itfhekcvmcbntjndvhzg` (`.env.local`). On a fresh replay against any project other than `cfbownervtbospubjnuf`, the cron jobs run on schedule but always 401/404. Scraping silently never works via cron.

**Mitigation for replay:** After `supabase db push`, run in SQL editor:
```sql
SELECT cron.unschedule('scrape-all-competitor-urls-6h');
SELECT cron.unschedule('scrape-all-competitor-urls-qat');
-- Then re-schedule with correct URL and key if desired.
```
(Cron is paused by migration 22 anyway, so this is largely academic for prod, but would be triggered on a new project.)

---

### CRITICAL-2 — `cron.unschedule()` has no `IF EXISTS` guard

**Migration:** `20260423021539`

Calls:
```sql
SELECT cron.unschedule('scrape-all-competitor-urls-6h');
SELECT cron.unschedule('scrape-all-competitor-urls-qat');
```

`cron.unschedule()` raises an exception if the named job does not exist. If migration 20260421003143 already unscheduled `scrape-all-competitor-urls-6h` internally (to replace it with the new schedule), or if the cron jobs were never created (e.g., pg_cron was not enabled and the earlier migrations skipped them), migration 22 will error and the push will abort.

**Fix:**
```sql
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('scrape-all-competitor-urls-6h','scrape-all-competitor-urls-qat');
```

---

### CRITICAL-3 — `api_keys.licensee_id SET NOT NULL` can fail on dirty prod data

**Migration:** `20260424231425`

The backfill DO block builds a personal licensee for every user_id that appears in the union of `api_keys`, `licensee_applications`, and `profiles`. Then it sets `licensee_id NOT NULL`. If any `api_keys` row was inserted by a service-role path whose `user_id` does NOT appear in any of those three tables (e.g., a machine/service user), the backfill loop skips it, but the NOT NULL alter fails.

**Mitigation for replay against a clean project:** Not an issue if the project has no orphan api_key rows. Flag exists for replaying against a copy of the live DB.

---

### CRITICAL-4 — `pg_cron` and `pg_net` must be pre-enabled in the dashboard

**Migration:** `20260421002633`

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

On Supabase Free/Pro, `pg_cron` is available but must be enabled via **Database → Extensions** in the Supabase dashboard before running migrations. Without it, the `CREATE EXTENSION` succeeds but `cron.schedule()` in the same migration then fails because the `cron` schema doesn't exist yet in the same transaction. `pg_net` is typically auto-enabled by Supabase; `pg_cron` is not.

**Mitigation:** Enable `pg_cron` in Supabase dashboard Extensions UI before running `supabase db push`.

---

### WARN-1 — `auth.*` schema is Supabase-specific

**Migrations affected:** 20260420235610, 20260423165549 (backfill), 20260424231425 (backfill + ensure_licensee_for_user), 20260424235247 (ensure_licensee_for_user + find_account_for_api_key), 20260425003549 (find_user_id_by_email)

Multiple migrations query `auth.users` in DO blocks and SECURITY DEFINER functions. This is safe on Supabase managed projects but fails on vanilla Postgres (no `auth` schema). Not a concern for this project, documented for completeness.

---

### WARN-2 — `supabase_realtime` publication must pre-exist

**Migration:** `20260425011138`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

This publication is created and managed by Supabase infrastructure. On a fresh Supabase project it exists. On vanilla Postgres it does not. If it does not exist, this migration errors.

---

### WARN-3 — `handle_new_user()` rewrites in migrations 31–32 drop all `seed_*` calls

**Migrations:** `20260618000001`, `20260618000002`

Both rewrites of `handle_new_user()` include: profiles, overview_* tables, pricing_metrics, pricing_recommendations, pricing_rules, and (in 20260618000002) `ensure_licensee_for_user()`. They do NOT call:

- `seed_field_intel_for_user(uid)` (→ field_intel_metrics, recent_observations, price_gaps, field_team_activity)
- `seed_market_for_user(uid)` (→ market_metrics, category_performance, trending_products, assortment_gaps, cross_border_radar)
- `seed_promotions_for_user(uid)` (→ promotions_metrics, promotion_calendar, past_campaigns, timing_insights)
- `seed_benchmarks_for_user(uid)` (→ benchmarks_metrics, market_benchmarks, model_knowledge, model_maturity, switching_cost, network_value)
- `seed_roi_model_for_user(uid)` (→ roi_model_categories, promotions_scenarios)
- `seed_competitor_urls_for_user(uid)` (→ competitor_product_urls rows)

**Effect:** Any user who signs up after migration 20260618000001 is applied will have empty dashboards for Field Intel, Market, Promotions, Benchmarks, ROI Model, and no seed competitor URLs. This also means the pricing engine finds no competitor URLs to scrape.

The functions still exist and are callable individually. The gap is in `handle_new_user()` not invoking them.

---

### WARN-4 — Two parallel trigger functions for `updated_at`

`set_updated_at()` is created in migration 1 and used by tables created in migrations 1–25. `update_updated_at_column()` is created in migration 27 and used only by tables in that migration. Both are identical in behavior. Replay creates both; neither is dropped. Not a failure, but any future trigger should pick one name.

---

### WARN-5 — `pricing_recommendations` unique index requires no pre-existing duplicates

**Migration:** `20260423020000`

Creates `UNIQUE INDEX ON pricing_recommendations(user_id, product, channel, source)` after adding `source` column (default `'seed'`). If any two seed rows for the same user share `(product, channel)` values, the index creation fails. Seed data has 5 distinct products per user, so this doesn't fire in practice. Would fail on a live DB copy with manually inserted duplicates.

---

### INFO-1 — `accounts` name is reused across two unrelated concepts

Table created in migration 25 as `public.accounts` (live API access application form). Renamed to `public.licensee_applications` in migration 26 to free the name for the tenant model. After full replay, `public.accounts` does not exist; only `public.licensee_applications`. Any code that hardcodes `public.accounts` breaks silently (PostgREST returns 400, not 404).

---

### INFO-2 — Cron job name collision risk between migrations 13 and 14

Migration 13 schedules `scrape-all-competitor-urls-6h`. Migration 14 appears to replace it with `scrape-all-competitor-urls-qat`. If migration 14 does not explicitly unschedule the 6h job (the name differs, so `cron.schedule` with the new name adds a second job rather than replacing), both jobs run until migration 22 unschedules both. This is not a replay failure but means two scrape jobs run in parallel between migrations 14 and 22 on a freshly replayed project.

---

## Summary

| Severity | Count | Issues |
|---|---|---|
| CRITICAL | 4 | Cron credentials wrong (1), cron.unschedule no-guard (2), api_keys NOT NULL race (3), pg_cron not pre-enabled (4) |
| WARN | 5 | auth.* dependency (1), supabase_realtime dependency (2), missing seed calls in last two migrations (3), two updated_at functions (4), unique index duplicate risk (5) |
| INFO | 2 | accounts name reuse (1), cron job double-schedule window (2) |

**For a clean fresh push against a new Supabase project with no pre-existing data:**
- Enable `pg_cron` in the dashboard first (CRITICAL-4)
- Everything else will push cleanly
- After push, the cron jobs will have wrong credentials (CRITICAL-1) — unschedule and re-schedule with correct URL/key if needed
- CRITICAL-2 and CRITICAL-3 do not fire against an empty project
- New signups after migration 31 will be missing 6 seed dashboard sections (WARN-3)
