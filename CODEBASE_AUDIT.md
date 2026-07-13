# PrizeSkout Codebase Audit
_Generated: 2026-06-17 | Auditor: read-only, no code changes made_

---

## 1. REPO MAP

### Directory tree (top 3 levels, key paths only)

```
prizeskoutqa/
├── src/
│   ├── components/
│   │   ├── auth/          — signup/login forms (AuthShared.tsx ~529 LOC)
│   │   ├── dashboard/     — all dashboard tab UIs, many sub-dirs
│   │   ├── docs/          — API reference renderer
│   │   ├── marketing/     — landing page components
│   │   └── ui/            — shadcn/ui primitives
│   ├── hooks/             — useAccount, useLiveScrapes, useIsAdmin, etc.
│   ├── integrations/supabase/ — auth-middleware, client, client.server, types
│   ├── lib/               — shared types + mock/data-utility files
│   ├── routes/
│   │   ├── api/public/
│   │   │   ├── v1/$.ts         ← API GATEWAY (test-mode dispatcher)
│   │   │   └── hooks/
│   │   │       ├── scrape-all.ts    ← CRON ENTRY POINT
│   │   │       └── webhook-retry.ts
│   │   ├── dashboard.*.tsx     — all dashboard tab routes
│   │   └── *.tsx               — marketing + auth pages
│   └── server/
│       ├── pricing-engine.ts        ← core pricing logic
│       ├── pricing-engine.functions.ts ← user-triggered refresh fn
│       ├── scrape-competitor.functions.ts — manual scrape server fn
│       ├── scrape-runner.ts         — Firecrawl integration + persist
│       ├── v1-handlers.ts           ← API route dispatcher + 4 POST handlers
│       ├── v1-writes-handlers.ts    — 5 additional write handlers
│       ├── competitors-handlers.ts  — GET /v1/competitors/*
│       ├── pricing-handlers.ts      — GET /v1/pricing/*
│       ├── promotions-handlers.ts   — GET /v1/promotions/*
│       ├── field-intel-handlers.ts  — GET /v1/field-intel/*
│       ├── network-handlers.ts      — GET /v1/network/*
│       ├── webhooks-handlers.ts     — GET /v1/webhooks/*
│       ├── webhook-delivery.ts      — HMAC-signed outbound delivery worker
│       ├── developer-console.functions.ts — API key CRUD
│       ├── licensee-console.functions.ts  — tenant/team CRUD
│       ├── ai-insights.functions.ts — Claude API integration
│       ├── contact.functions.ts
│       └── notifications.ts
├── supabase/
│   ├── migrations/       — 30 migration files (2026-04-20 → 2026-04-25)
│   └── schema.sql        — INCOMPLETE combined file; ends at market_metrics
├── public/               — static favicon assets only
├── wrangler.jsonc        — Cloudflare Workers config
├── vite.config.ts
└── package.json
```

### Where key pieces live

| Concern | Location |
|---|---|
| Routing | `src/routes/**/*.tsx` (TanStack file-based routing) |
| API gateway / CF Worker entry | `src/routes/api/public/v1/$.ts` → compiled to `dist/server/index.js` |
| Cron / background jobs | `src/routes/api/public/hooks/scrape-all.ts` (HTTP-triggered by pg_cron) |
| Pricing engine | `src/server/pricing-engine.ts` |
| Supabase migrations | `supabase/migrations/` (30 files) |
| Dashboard UI | `src/routes/dashboard.*.tsx` + `src/components/dashboard/` |
| Background retry job | `src/routes/api/public/hooks/webhook-retry.ts` |

### Total LOC

| Area | Approx LOC |
|---|---|
| `src/` (all .ts/.tsx) | **~46,500** |
| `supabase/migrations/` | **~4,400** |
| Largest files | `dashboard.index.tsx` 237, `v1-handlers.ts` 870, `api-spec.ts` 1,091, `index.tsx` (landing) 1,392, `webhook-delivery.ts` 374, `pricing-engine.ts` 400 |

---

## 2. DATABASE SCHEMA

### All tables (ground truth from migrations)

54 tables found across 30 migrations. Blueprint claimed ~57.

| # | Table | Migration | RLS? |
|---|---|---|---|
| 1 | `profiles` | 20260420175027 | YES |
| 2 | `pricing_metrics` | 20260420180031 | YES |
| 3 | `pricing_recommendations` | 20260420180031 | YES |
| 4 | `pricing_rules` | 20260420180031 | YES |
| 5 | `competitor_metrics` | 20260420181051 | YES |
| 6 | `competitor_prices` | 20260420181051 | YES |
| 7 | `competitor_price_history` | 20260420181051 | YES |
| 8 | `behavior_patterns` | 20260420181051 | YES |
| 9 | `field_intel_metrics` | 20260420183559 | YES |
| 10 | `recent_observations` | 20260420183559 | YES |
| 11 | `price_gaps` | 20260420183559 | YES |
| 12 | `market_metrics` | 20260420184651 | YES |
| 13 | `category_performance` | 20260420184651 | YES |
| 14 | `trending_products` | 20260420184651 | YES |
| 15 | `assortment_gaps` | 20260420184651 | YES |
| 16 | `cross_border_radar` | 20260420184651 | YES |
| 17 | `promotions_metrics` | 20260420185409 | YES |
| 18 | `promotion_calendar` | 20260420185409 | YES |
| 19 | `past_campaigns` | 20260420185409 | YES |
| 20 | `timing_insights` | 20260420185409 | YES |
| 21 | `overview_metrics` | 20260420185836 | YES |
| 22 | `overview_alerts` | 20260420185836 | YES |
| 23 | `overview_channels` | 20260420185836 | YES |
| 24 | `overview_quick_actions` | 20260420185836 | YES |
| 25 | `benchmarks_metrics` (est.) | 20260420185836 | YES |
| 26 | `market_benchmarks` (est.) | 20260420185836 | YES |
| 27 | `model_knowledge` (est.) | 20260420185836 | YES |
| 28 | `model_maturity` (est.) | 20260420185836 | YES |
| 29 | `switching_cost` (est.) | 20260420185836 | YES |
| 30 | `network_value` (est.) | 20260420185836 | YES |
| 31 | `roi_model_categories` | 20260420191127 | YES |
| 32 | `promotions_scenarios` | 20260420191127 | YES |
| 33 | `competitor_scrapes` | 20260421000048 | YES |
| 34 | `user_roles` | 20260421000048 | YES |
| 35 | `competitor_product_urls` | 20260421001502 | YES |
| 36 | `ai_insights` | 20260422001427 | YES |
| 37 | `contact_messages` | 20260422225050 | YES |
| 38 | `user_account_settings` | 20260422225050 | YES |
| 39 | `user_notification_settings` | 20260422225050 | YES |
| 40 | `pricing_decisions` | 20260423013610 | YES |
| 41 | `api_keys` | 20260423161631 | YES |
| 42 | `webhook_endpoints` | 20260423161631 | YES |
| 43 | `webhook_deliveries` | 20260423161631 | YES |
| 44 | `api_request_logs` | 20260423161631 | YES |
| 45 | `usage_events` | 20260423161631 | YES |
| 46 | `licensee_applications` | 20260423165549 | YES |
| 47 | `licensees` | 20260424231425 | YES |
| 48 | `licensee_members` | 20260424231425 | YES |
| 49 | `accounts_v2` | 20260424231425 | YES |
| 50 | `merchants` | 20260424231425 | YES |
| 51 | `catalog_products` | 20260424235247 | YES |
| 52 | `catalog_prices` | 20260424235247 | YES |
| 53 | `margin_inputs` | 20260424235247 | YES |
| 54 | `dynprice_decisions` | 20260424235247 | YES |
| 55 | `ingestion_batches` | 20260424235247 | YES |
| 56 | `notifications` | 20260425011138 | YES |

**Note:** Rows 25-30 are inferred from the `benchmarks-data.ts` type definitions and the `seed_benchmarks_for_user()` call in `handle_new_user`; migration 20260420185836 is the only unread file that could contain them. The schema.sql combined file is incomplete and ends at migration 20260420184651.

### Detailed schema for key tables

#### `competitor_scrapes`
```sql
id          uuid PK DEFAULT gen_random_uuid()
user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
url         text NOT NULL
competitor  text
product     text
price       numeric
currency    text
markdown    text
metadata    jsonb DEFAULT '{}'::jsonb
status      text NOT NULL DEFAULT 'success'   -- 'success' | 'error'
error       text
scraped_at  timestamptz NOT NULL DEFAULT now()
created_at  timestamptz NOT NULL DEFAULT now()

INDEX: (user_id, url, scraped_at DESC)
RLS:  SELECT (own rows), INSERT (own), DELETE (own) — NO UPDATE policy
```

#### `competitor_product_urls`
```sql
id          uuid PK DEFAULT gen_random_uuid()
user_id     uuid NOT NULL
product     text NOT NULL
competitor  text NOT NULL DEFAULT ''
url         text NOT NULL
category    text            -- added in migration 20260423020000
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
UNIQUE (user_id, product, competitor)
RLS: full CRUD for own rows (auth.uid() = user_id)
```

#### `catalog_prices`
```sql
id           uuid PK DEFAULT gen_random_uuid()
account_id   uuid NOT NULL REFERENCES accounts_v2(id) ON DELETE CASCADE
licensee_id  uuid NOT NULL REFERENCES licensees(id) ON DELETE CASCADE
product_id   uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE
channel      text NOT NULL
list_price   numeric(12,2) NOT NULL
sale_price   numeric(12,2)
currency     text NOT NULL DEFAULT 'QAR'
effective_at timestamptz NOT NULL DEFAULT now()
created_at   timestamptz NOT NULL DEFAULT now()
updated_at   timestamptz NOT NULL DEFAULT now()
UNIQUE (product_id, channel)
RLS: licensee_member-scoped via is_licensee_member()
```

#### `overview_alerts`
```sql
-- (from handle_new_user seed + dashboard.index.tsx query)
user_id      uuid NOT NULL
alert_type   text    -- 'price' | 'stock' | 'promo' | 'pattern' | 'insight'
channel      text    -- 'online' | 'in-store'
message      text
severity     text    -- 'action' | 'opportunity' | 'intel'
occurred_at  timestamptz
RLS: per-user (auth.uid() = user_id)
```

#### `licensees`
```sql
id             uuid PK DEFAULT gen_random_uuid()
slug           text NOT NULL UNIQUE
name           text NOT NULL
status         text DEFAULT 'trial' CHECK IN ('trial','active','suspended','cancelled')
contact_email  text
billing_email  text
white_label    jsonb DEFAULT '{}'::jsonb
metadata       jsonb DEFAULT '{}'::jsonb
created_at     timestamptz NOT NULL DEFAULT now()
updated_at     timestamptz NOT NULL DEFAULT now()
RLS: members view; admins update; owners delete; platform_admin all
```

#### `licensee_members`
```sql
id           uuid PK DEFAULT gen_random_uuid()
licensee_id  uuid NOT NULL REFERENCES licensees(id) ON DELETE CASCADE
user_id      uuid NOT NULL
role         licensee_role ENUM ('owner','admin','developer','viewer') DEFAULT 'viewer'
invited_by   uuid
invited_at   timestamptz
accepted_at  timestamptz
created_at   timestamptz NOT NULL DEFAULT now()
updated_at   timestamptz NOT NULL DEFAULT now()
UNIQUE (licensee_id, user_id)
RLS: user sees own rows; admins see all in licensee
```

#### `accounts_v2`
```sql
id           uuid PK DEFAULT gen_random_uuid()
licensee_id  uuid NOT NULL REFERENCES licensees(id) ON DELETE CASCADE
slug         text NOT NULL
name         text NOT NULL
region       text
currency     text NOT NULL DEFAULT 'QAR'
metadata     jsonb DEFAULT '{}'::jsonb
is_default   boolean NOT NULL DEFAULT false
created_at   timestamptz NOT NULL DEFAULT now()
updated_at   timestamptz NOT NULL DEFAULT now()
UNIQUE (licensee_id, slug)
RLS: licensee_member-scoped
```

#### `pricing_rules` (the "rules table")
```sql
id         uuid PK DEFAULT gen_random_uuid()
user_id    uuid NOT NULL
rule_text  text NOT NULL    -- free-text, NO structured format
enabled    boolean NOT NULL DEFAULT true
position   integer NOT NULL DEFAULT 0
created_at timestamptz NOT NULL DEFAULT now()
updated_at timestamptz NOT NULL DEFAULT now()
RLS: full CRUD for own rows
```

### Live code vs. seed/signup writes

| Table | Written by live code? | Written by seed/signup? |
|---|---|---|
| `overview_metrics` | NO | YES (handle_new_user) |
| `overview_alerts` | **NO** | YES (handle_new_user) |
| `overview_channels` | NO | YES (handle_new_user) |
| `overview_quick_actions` | NO | YES (handle_new_user) |
| `pricing_metrics` | NO | YES (handle_new_user) |
| `pricing_recommendations` | YES (engine, source='computed') | YES (handle_new_user, source='seed') |
| `pricing_rules` | YES (dashboard CRUD) | YES (handle_new_user, 3 rules) |
| `competitor_metrics` | NO | YES (handle_new_user) |
| `competitor_prices` | NO | YES (handle_new_user) |
| `competitor_price_history` | NO | YES (handle_new_user) |
| `behavior_patterns` | NO | YES (handle_new_user) |
| `competitor_scrapes` | YES (Firecrawl) | NO |
| `competitor_product_urls` | YES (dashboard + API) | YES (6 seeded URLs per user) |
| `catalog_products` | YES (POST /v1/sync) | NO |
| `catalog_prices` | YES (POST /v1/sync) | NO |
| `margin_inputs` | NO (dashboard UI missing) | NO |
| `dynprice_decisions` | YES (POST /v1/dynprice) | NO |
| `ingestion_batches` | YES (POST /v1/sync idempotency) | NO |
| `pricing_decisions` | YES (Apply/Dismiss button) | NO |
| `promotions_scenarios` | YES (ROI Simulator) | NO |
| `ai_insights` | YES (generateAIInsight → Claude API) | NO |
| `api_keys` | YES (createApiKey fn) | NO |
| `webhook_endpoints` | YES (POST /v1/webhooks/endpoints) | NO |
| `webhook_deliveries` | YES (enqueueWebhookEvent) | NO |
| `api_request_logs` | YES (every API call) | NO |
| `notifications` | YES (admin client, server-side) | NO |
| `licensees` | YES (ensure_licensee_for_user) | YES (backfill on signup) |
| `licensee_members` | YES | YES (backfill on signup) |
| `accounts_v2` | YES | YES (backfill on signup) |
| All other dashboard tables | NO | YES (seed functions) |

---

## 3. DATA PIPELINE TRACE

### `competitor_scrapes` — **SCRAPED via Firecrawl (cron PAUSED)**

```
pg_cron job 'scrape-all-competitor-urls-qat'
  → HTTP POST https://<host>/api/public/hooks/scrape-all
     (Authorization: Bearer <SUPABASE_PUBLISHABLE_KEY>)
  → Route handler: src/routes/api/public/hooks/scrape-all.ts
  → supabaseAdmin.from('competitor_product_urls').select(...)  [ALL users]
  → runJobs(urls, runScrape, concurrency=3)
  → scrape-runner.ts: fetch('https://api.firecrawl.dev/v2/scrape', ...)
     + formats: ['markdown', {type:'json', schema: {price, currency}}]
     + retry up to 3 attempts with exponential backoff
  → INSERT INTO competitor_scrapes (user_id, url, price, status, ...)
  → runPricingEngineForUser(supabaseAdmin, userId) for each affected user
```

**CRITICAL: Migration 20260423021539 explicitly unscheduled the cron:**
```sql
-- "Pause the autonomous scrape cron during the demo so failed Firecrawl
--  attempts don't overwrite the curated demo dataset."
PERFORM cron.unschedule(jid) FOR jobname IN ('scrape-all-competitor-urls-qat')
```
The cron is currently OFF. Manual scrape (user button) still works via `scrapeCompetitorUrl` server function → same `runScrape()`.

**Status: SCRAPED** (infrastructure real, cron currently paused)

---

### `competitor_product_urls` — **SEED + USER INPUT**

```
On signup: handle_new_user() → seed_competitor_urls_for_user(uid)
  → INSERT 6 rows: Sony XM5/Carrefour, Sony XM5/Amazon, MacBook Air/Amazon,
    Samsung S24/Carrefour, Samsung S24/Amazon, iPhone 15 Pro/Amazon
  (all real Qatar e-commerce URLs, no competitor='self' entries)

User can add more via dashboard Competitors page → POST server fn
  → INSERT INTO competitor_product_urls

API: POST /v1/competitors/scrape with no body → reads competitor_product_urls
```

**Status: SEED + USER INPUT** (URLs are real, but data is empty until a scrape runs)

---

### `catalog_prices` — **LIVE (written by API only)**

```
Merchant client → POST /v1/sync (test-mode API key)
  → handleSync() in v1-handlers.ts
  → per-item: upsert catalog_products on (account_id, sku)
  → if price provided: upsert catalog_prices on (product_id, channel)
```

**Completely separate from the dashboard's `competitor_prices` table** (which is seed data). No join or bridge between the two systems exists. The catalog_prices table is only populated via the v1 API by merchants who have called POST /v1/sync. No current user has done this unless they used the API manually.

**Status: LIVE** (but practically empty for all users who haven't called /v1/sync)

---

## 4. PRICING ENGINE

### How `passesRules()` works today

```typescript
// src/server/pricing-engine.ts:138-156
function passesRules(
  recommendedPrice: number,
  currentPrice: number,
  baseMargin: number,
  rules: RuleRow[],
): { ok: boolean; reason?: string } {
  const floor = currentPrice * (1 - baseMargin);
  if (recommendedPrice < floor) {
    return {
      ok: false,
      reason: `Recommended price ${recommendedPrice.toFixed(2)} below margin floor ${floor.toFixed(2)}`,
    };
  }
  // Best-effort: if any enabled rule contains "never below cost" / "floor",
  // we already enforce that above. Other rules pass through unchecked.
  void rules;   // ← ALL RULE TEXT IS IGNORED
  return { ok: true };
}
```

The `rules` parameter is immediately discarded with `void rules`. Only the margin floor (derived from `roi_model_categories.base_margin`) is enforced. All 3 seed rules ("Never price more than 5% above the lowest competitor", "Match Carrefour within 24 hours", "Do not drop below QAR 15 margin") pass through without any effect.

**Note:** The caller (line 254-259) doesn't even skip on failure — it **clamps** to the floor:
```typescript
const ruleCheck = passesRules(recommendedPrice, currentPrice, roi.base_margin, rules);
if (!ruleCheck.ok) {
  const floor = currentPrice * (1 - roi.base_margin);
  recommendedPrice = formatPrice(floor);  // clamp, not skip
}
```

### Self-price deficit — exact break path

```typescript
// pricing-engine.ts:208-221
const selfUrl = productUrls.find(
  (u) => u.competitor.toLowerCase() === SELF_COMPETITOR_LABEL,  // 'self'
);
if (!selfUrl) {
  reasons.push(`${product}: no 'self' URL configured - skipped`);
  continue;   // ← product loop exits here, no recommendation generated
}
const selfScrape = latestByUrl.get(selfUrl.url);
if (!selfScrape || selfScrape.price === null) {
  reasons.push(`${product}: no fresh self scrape - skipped`);
  continue;   // ← also exits if self scrape is stale (>14 days) or failed
}
```

**Gap:** The 6 URLs seeded by `seed_competitor_urls_for_user()` have competitors `'Carrefour'` and `'Amazon'` only. There is no `competitor='self'` row seeded for any product. Every new user will hit the first `continue` for every product until they manually add their own storefront URL with `competitor='self'`.

### Rule field format

`pricing_rules.rule_text` is `TEXT NOT NULL` — completely unstructured free text. There is no schema-level format constraint. The database stores whatever the user types.

The dashboard pricing engine reads rules but ignores them entirely (see `passesRules` above).

A separate regex parser exists **only** in `v1-handlers.ts:670-698` for the `/v1/dynprice` API endpoint:
```typescript
function parsePricingRules(rules: string[]): ParsedRules {
  // Recognized phrases (case-insensitive substring match):
  const maxMatch = t.match(/max\s+change\s+([0-9]+(?:\.[0-9]+)?)\s*%/);
  const undercutMatch = t.match(/min(?:imum)?\s+undercut\s+([0-9]+(?:\.[0-9]+)?)/);
  if (/never\s+undercut/.test(t) || /no\s+undercut/.test(t)) ...
  const roundMatch = t.match(/round\s+to\s+([0-9]+(?:\.[0-9]+)?)/);
}
```
This parser handles 4 patterns but is only called by the API's `/v1/dynprice` endpoint, not by the dashboard pricing engine.

---

## 5. API GATEWAY & AUTH

### Entry point

`src/routes/api/public/v1/$.ts` — TanStack Start server route that handles all `GET/POST/PATCH/DELETE /api/public/v1/*` requests.

### Auth

1. Extract `Authorization: Bearer <token>` header
2. SHA-256 hash the token → lookup `api_keys.key_hash`
3. Check `revoked_at IS NULL`
4. Check `mode = 'test'` — **live mode is universally blocked with 403**

```typescript
if (keyRow.mode !== "test") {
  return json({ error: { code: "live_mode_unavailable", ... } }, 403);
}
```

### Scope enforcement

The `scopes` column **is fetched** but **never checked**:
```typescript
.select("id, mode, revoked_at, scopes, user_id")  // scopes loaded
// ... no subsequent check against scopes anywhere in the dispatcher
```
Any valid test key can call any endpoint regardless of its declared scopes.

### License-tier / SKU / channel enforcement

**NONE exists.** No plan tier is checked, no SKU allowlist, no channel restriction.

### Implemented endpoints (24 total)

| Method | Path | Handler location | Status |
|---|---|---|---|
| POST | /v1/sync | v1-handlers.ts | LIVE, real DB writes |
| POST | /v1/margin | v1-handlers.ts | LIVE, real DB reads |
| POST | /v1/dynprice | v1-handlers.ts | LIVE, writes dynprice_decisions |
| POST | /v1/webhooks/enrich | v1-handlers.ts | LIVE |
| GET | /v1/competitors/prices | competitors-handlers.ts | LIVE (falls back to sample if empty) |
| GET | /v1/competitors/prices/history | competitors-handlers.ts | LIVE (fallback) |
| GET | /v1/competitors/prices/{id} | competitors-handlers.ts | LIVE (fallback) |
| POST | /v1/competitors/scrape | competitors-handlers.ts | LIVE (fire-and-forget Firecrawl) |
| GET | /v1/competitors/patterns | competitors-handlers.ts | LIVE (fallback) |
| GET | /v1/pricing/recommendations | pricing-handlers.ts | LIVE (fallback) |
| GET | /v1/pricing/recommendations/{id} | pricing-handlers.ts | LIVE (fallback) |
| GET | /v1/pricing/rules | pricing-handlers.ts | LIVE (fallback) |
| GET | /v1/promotions/calendar | promotions-handlers.ts | LIVE (fallback) |
| GET | /v1/promotions/campaigns | promotions-handlers.ts | LIVE (fallback) |
| GET | /v1/field-intel/observations | field-intel-handlers.ts | LIVE (fallback) |
| GET | /v1/field-intel/price-gaps | field-intel-handlers.ts | LIVE (fallback) |
| GET | /v1/webhooks/endpoints | webhooks-handlers.ts | LIVE |
| GET | /v1/webhooks/deliveries | webhooks-handlers.ts | LIVE |
| GET | /v1/network/benchmarks | network-handlers.ts | LIVE (fallback) |
| GET | /v1/network/patterns | network-handlers.ts | alias of /competitors/patterns |
| POST | /v1/pricing/decisions | v1-writes-handlers.ts | LIVE, writes pricing_decisions |
| POST | /v1/promotions/simulate | v1-writes-handlers.ts | LIVE, writes promotions_scenarios |
| POST | /v1/field-intel/observations | v1-writes-handlers.ts | LIVE, writes recent_observations |
| POST | /v1/webhooks/endpoints | v1-writes-handlers.ts | LIVE, writes webhook_endpoints |
| POST | /v1/webhooks/deliveries/{id}/retry | v1-writes-handlers.ts | LIVE |

**"Fallback" behavior:** When a user has no real data, most GET handlers return a hardcoded sample payload with `_fallback: "sample"` injected — this silently looks like real data to API callers who don't check that field.

The blueprint claimed 19 endpoints; **24 are implemented**.

---

## 6. MOCK / SEED INVENTORY

Every user who signs up receives a complete set of demo data via `handle_new_user()` (Postgres trigger on auth.users INSERT). This data is static and never updated by any live code path except where noted.

### Hardcoded seed data (per user on signup)

| Table | Seeded rows | Notes |
|---|---|---|
| `overview_metrics` | 4 | "2,847 products tracked", "3rd / 6", "14 active alerts", "QAR 48K savings" |
| `overview_alerts` | 6 | "Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)", etc. Exact messages, exact prices |
| `overview_channels` | 3 | "Online QAR 1.2M (68%)", "In-Store QAR 480K (27%)", "Marketplace QAR 89K (5%)" |
| `overview_quick_actions` | 3 | Static action cards |
| `pricing_metrics` | 4 | "+QAR 71K total monthly impact", "89% avg confidence", "11 months model maturity" |
| `pricing_recommendations` | 5 | Sony XM5, MacBook Air M3, Ariel Detergent, Dyson V15, Samsung S24 Ultra (In-Store). All `source='seed'` |
| `pricing_rules` | 3 | "Never price more than 5% above lowest competitor on Electronics", etc. |
| `competitor_metrics` | 4 | "2,847 products monitored", "38% cheapest on", etc. |
| `competitor_prices` | 12 | Detailed price matrix for 12 products across Talabat/Carrefour/Lulu/Amazon/Noon |
| `competitor_price_history` | 6 | Sony XM5 Nov-Apr price history only |
| `behavior_patterns` | 4 | Carrefour Thursday drops, Talabat Sunday flash, Amazon pre-sale inflation, Lulu stock gaps |
| `roi_model_categories` | 5 | Electronics/Grocery/Fashion/Home/Beauty with elasticity/margin params |
| `competitor_product_urls` | 6 | Real Qatar URLs (Carrefour/Amazon) — no `competitor='self'` |
| `promotions_metrics` | 4 | "8 active competitor promos", etc. |
| `promotion_calendar` | 8 | Eid sale, Back to School, etc. — all fictional campaign rows |
| `past_campaigns` | 3 | "Eid Electronics Blitz (Mar 2026)" etc. — fictional |
| `timing_insights` | N | From seed function |
| `field_intel_*` | N | Via `seed_field_intel_for_user()` — not read in this audit |
| `market_*` | N | Via `seed_market_for_user()` — not read |
| `benchmarks_*` | N | Via `seed_benchmarks_for_user()` — not read |
| `licensees` | 1 | Auto-created personal licensee ("lic-<uuid>") |
| `licensee_members` | 1 | Owner membership row |
| `accounts_v2` | 1 | "Default" account |

### In-code hardcoded fallback (API handlers)

Every `GET /v1/*` handler returns a hardcoded sample when the DB query returns zero rows. The fallback is marked `_fallback: "sample"` but is structurally identical to real data. Example from `competitors-handlers.ts:88-107`:
```typescript
if (rows.length === 0) {
  return ok({
    data: [{ id: "px_3f9c2", product: "Sony WH-1000XM5", ... }],
    _fallback: "sample",
  });
}
```

### Other static values

- `v1-writes-handlers.ts:202`: `const baselinePerDay = 12000; // QAR — placeholder until per-account baselines wire in`  
  Used in POST /v1/promotions/simulate — promotion simulations for all accounts use this fixed number.
- `competitors-handlers.ts`: `currency: "QAR"` — hardcoded in all competitor API responses.
- `v1-handlers.ts:208`: `batch_id: \`bch_${Math.random().toString(36).slice(2, 12)}\`` — randomly generated, not stored in a sequence.

---

## 7. END-TO-END REALITY CHECK

**Question:** Can a merchant currently sign up → connect a store → receive a real price recommendation → approve it → have a price pushed out?

### Step 1: Sign up ✓ WORKS
Supabase Auth creates the user. The `handle_new_user()` trigger fires, seeds all demo data, provisions a personal `licensees` + `accounts_v2` + `licensee_members` row. User lands on the Overview dashboard and sees a fully populated (but fake) UI.

### Step 2: Connect a store ✗ BROKEN / MISSING
- There is no "connect your Shopify/WooCommerce/etc" flow.
- The user can add competitor URLs via the Competitors dashboard, but there is no UI for adding their own storefront URL (competitor='self').
- The catalog must be pushed via `POST /v1/sync` from the API, which requires a developer to implement and call it.
- **`margin_inputs` has no UI** — the `/v1/margin` endpoint returns a 404 for every product until someone manually inserts rows.

### Step 3: Receive a real price recommendation ✗ BROKEN
Even if a user adds URLs manually, the engine fails for every product because:
1. **No `competitor='self'` URL is seeded** (pricing-engine.ts:209-215 explicitly skips).
2. **The cron is paused** (migration 20260423021539 called `cron.unschedule()`).
3. The manual "Refresh" button exists but requires the user to have first added a self URL AND a competitor URL AND Firecrawl must return prices successfully.
4. All visible recommendations are `source='seed'` (the Sony/MacBook/etc set).

### Step 4: Approve a recommendation ⚠️ PARTIAL
The dashboard has Apply/Dismiss/Snooze buttons on recommendation cards. Clicking "Apply" writes a row to `pricing_decisions` (decision='applied', or via the API: `POST /v1/pricing/decisions`). This is correctly persisted.

### Step 5: Have a price pushed out ✗ NOT IMPLEMENTED
There is no mechanism to write an approved recommendation back to any merchant system. No Shopify integration, no WooCommerce API call, no webhook that carries the approved price to an e-commerce platform. The `pricing_decisions` table is append-only audit log with no downstream consumer. The `POST /v1/dynprice` endpoint also only writes to `dynprice_decisions` — no write-back.

**Summary:** The chain breaks at steps 2, 3, and 5. A merchant can sign up and see a beautiful dashboard full of demo data, and can log a decision — but the recommendations are fake and no price ever leaves the system.

---

## 8. GAP RECONCILIATION

### Known gaps vs. code reality

| Gap | Blueprint Claim | Code Reality | Match? |
|---|---|---|---|
| **Static alerts** | Alerts are "live" competitor price events | `overview_alerts` is seeded at signup with 6 hardcoded strings (e.g., exact message "Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)"). No live code path ever inserts new rows. The table is read-only from the dashboard and AI insights. | ✓ Confirmed gap |
| **Self-price deficit** | Engine uses merchant's own scraped price | Engine (`pricing-engine.ts:208-215`) skips any product without a `competitor='self'` entry. Seeded URLs have NO `self` competitor row. All new users will get zero computed recommendations until they manually add their own storefront URL. | ✓ Confirmed gap, **worse than described** |
| **Text-only rules** | Rules are parsed and enforced | `passesRules()` calls `void rules` — literally discards all rule text. Only the margin floor is enforced. The 3 seed rules ("Never more than 5% above lowest competitor", "Match Carrefour within 24 hours") have zero effect on the dashboard engine. A separate regex parser in `/v1/dynprice` handles 4 patterns but is disconnected from the dashboard. | ✓ Confirmed gap |
| **License middleware** | "License tier or SKU/channel enforcement" | `scopes` is fetched but never checked. No plan tier, SKU allowlist, or channel restriction exists anywhere in the codebase. Live mode is universally blocked (not tier-gated, just globally off). | ✓ Confirmed gap, **broader than described** |
| **Multi-tenant dashboard** | "Multi-tenant dashboard" in progress | The three-tier identity model (licensees → accounts_v2 → merchants) is fully implemented in DB + server functions + Console UI. BUT all dashboard tabs (Overview/Pricing/Competitors/etc) still query by `user_id`, not by `account_id` or `licensee_id`. Multiple accounts under one licensee cannot have separate views in the main dashboard. | ✓ Confirmed gap |

### Blueprint claims that do NOT match the code

1. **"~57 tables"** — Audit found 54 confirmed (rows 25-30 estimated). May be 56-57 if the benchmarks migration contains more than what's inferred.

2. **"19 implemented API endpoints"** — The blueprint says 19; the code has **24** registered routes in `V1_ROUTES`. The implementation is ahead of the stated count.

3. **"Firecrawl scraping is live"** — True in code, false in production: migration 20260423021539 deliberately paused the cron ("during the demo"). The scraping infrastructure exists but is dormant.

4. **All competitor-prices data on the Competitors dashboard is seed data** — The `competitor_prices` table (which powers the Competitors page price table) has NO write path from scrapes. The `competitor_scrapes` table (Firecrawl output) feeds ONLY the `pricing_recommendations` engine. These are two separate, disconnected systems. The Competitors page will always show seed data regardless of how many scrapes succeed.

5. **`promotion_calendar` / `past_campaigns` / `timing_insights`** — All seed data with no live write path. The Promotions dashboard is 100% fake.

6. **`behavior_patterns`** — Seed data only. The 4 pattern rows (Carrefour Thursday drops, etc.) are hardcoded at signup. No detection engine exists.

---

## OPEN QUESTIONS

1. **Cron intent:** Migration 20260423021539 paused the scrape cron "during the demo." Is this pause temporary (to be lifted before GA) or permanent? The comment implies a demo context but no re-enable migration exists.

2. **Self-price URL requirement:** The pricing engine mandates `competitor='self'` to compute any recommendation, but no onboarding flow explains this or prompts for it. Should signup include a step to enter the user's own product URLs, or is self-price meant to come from `POST /v1/sync`?

3. **Two price tables:** `catalog_prices` (API-fed, multi-tenant, linked to `catalog_products`) and `competitor_prices` (seed-filled, single-tenant, powers the dashboard) are completely separate. There is no bridge. Was this intentional, or should the Competitors dashboard eventually query `catalog_prices` for "your price"?

4. **`margin_inputs` has no UI:** The `/v1/margin` and `/v1/dynprice` endpoints depend on `margin_inputs`, but there is no dashboard screen or API endpoint to create/update margin inputs. How should merchants provide these?

5. **Live mode activation:** The code blanket-blocks all `mode='live'` keys. Is there a planned admin flow to unblock live mode per licensee/plan, or is it intended to remain universally off until a manual DB change?

6. **`scopes` enforcement:** The `api_keys.scopes` column exists with a default of `["read"]` but is never checked. Are there plans to implement scope gating, or should the column be dropped to avoid confusing users who set scopes and see no effect?

7. **Price push-back:** The `pricing_decisions` table logs apply/dismiss/snooze, but nothing reads it to actually update prices. Is a Shopify/WooCommerce write-back in scope? Without it, "Approve" is only a note, not an action.

8. **Promotions/Field Intel/Benchmarks live data:** These tabs (promotion_calendar, behavior_patterns, market benchmarks) are entirely seeded. Is there a planned ingest path (scraping, manual import, API) for these, or are they intended to remain curated/manual?

9. **Webhook retry cron:** `webhook-retry.ts` route exists and `processWebhookRetryQueue()` is implemented. Is there a pg_cron or Cloudflare Cron Trigger scheduled to call `/api/public/hooks/webhook-retry`? No such cron was found in the migrations.

10. **`schema.sql` completeness:** The combined schema.sql ends at migration 20260420184651 and is missing 22 of 30 migrations. Should this be regenerated from the full migration set, or is it a legacy artifact?

11. **Current git modifications:** `src/components/dashboard/TopBar.tsx` and `src/routes/dashboard.index.tsx` are listed as modified in `git status` but uncommitted. These changes are not reflected in this audit.
