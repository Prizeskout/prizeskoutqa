// Single source of truth for the public API documentation.
// Drives the /api/v1/$ test-mode dispatcher.

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type FieldSpec = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  example?: string;
};

export type ResponseSpec = {
  status: number;
  label: string;
  example: unknown;
};

export type ErrorSpec = {
  status: number;
  code: string;
  description: string;
};

export type EndpointSpec = {
  slug: string; // url-safe, unique within group
  method: HttpMethod;
  path: string; // e.g. /v1/competitors/prices
  title: string;
  summary: string;
  description?: string;
  auth: "bearer";
  scopes: string[];
  pathParams?: FieldSpec[];
  queryParams?: FieldSpec[];
  body?: FieldSpec[];
  responses: ResponseSpec[];
  errors?: ErrorSpec[];
  notes?: string[];
  // Sample response returned by the live "Try it out" dispatcher when running
  // against test-mode keys. Defaults to the first 2xx response example.
  sampleResponse?: unknown;
};

export type PillarSlug =
  | "pricing-intelligence"
  | "commerce-events"
  | "multi-tenant-ops"
  | "network-moat";

export type PillarSpec = {
  slug: PillarSlug;
  name: string;
  tagline: string;
  description: string;
  positioning: string; // one-liner used in marketing + docs
};

export const PILLARS: Record<PillarSlug, PillarSpec> = {
  "pricing-intelligence": {
    slug: "pricing-intelligence",
    name: "Pricing Intelligence",
    tagline: "Decide what to charge, in real time.",
    description:
      "Live competitor signals, AI price recommendations, and promo ROI simulation. The decision layer that sits between your catalog and your storefront.",
    positioning: "The price-decision API for modern commerce.",
  },
  "commerce-events": {
    slug: "commerce-events",
    name: "Commerce Events",
    tagline: "React to every market move within seconds.",
    description:
      "Signed webhooks for price drops, promo launches, and recommendation changes. Subscribe once, replay forever, retry with exponential backoff.",
    positioning: "The event bus for retail intelligence.",
  },
  "multi-tenant-ops": {
    slug: "multi-tenant-ops",
    name: "Multi-Tenant Ops",
    tagline: "One key per tenant. Hard-isolated data. Audit-clean.",
    description:
      "Catalog sync, landed-cost margin compute, and field-team observation ingestion — designed to run inside multi-store, multi-region operators with strict tenancy boundaries.",
    positioning: "Run pricing across every store, every region, every brand.",
  },
  "network-moat": {
    slug: "network-moat",
    name: "Network Moat",
    tagline: "Patterns no single retailer can see alone.",
    description:
      "Cross-tenant detected behaviors, market benchmarks, and category-level signals. The data compounds with every operator on the network.",
    positioning: "Intelligence that gets sharper with every tenant.",
  },
};

export type GroupSpec = {
  slug: string;
  name: string;
  tagline: string;
  pillar: PillarSlug;
  endpoints: EndpointSpec[];
};

const COMMON_ERRORS: ErrorSpec[] = [
  { status: 401, code: "unauthorized", description: "Missing or invalid API key." },
  {
    status: 403,
    code: "forbidden",
    description: "Your key is missing the required scope for this endpoint.",
  },
  {
    status: 404,
    code: "not_found",
    description: "The requested resource does not exist or is not visible to your account.",
  },
  {
    status: 422,
    code: "validation_failed",
    description: "One or more fields failed validation. The response includes per-field errors.",
  },
  {
    status: 429,
    code: "rate_limited",
    description:
      "You have exceeded the per-minute request quota. Retry after the Retry-After header.",
  },
  {
    status: 500,
    code: "internal_error",
    description: "Unexpected server error. Safe to retry with the same request id.",
  },
];

// ---------- Competitor Prices ----------

const COMPETITORS_GROUP: GroupSpec = {
  slug: "competitors",
  name: "Competitor Prices",
  tagline: "Live and historical competitor prices across online and in-store channels.",
  pillar: "pricing-intelligence",
  endpoints: [
    {
      slug: "list-prices",
      method: "GET",
      path: "/v1/competitors/prices",
      title: "List competitor prices",
      summary:
        "Returns the latest competitor prices for each tracked SKU, including your own price for context.",
      auth: "bearer",
      scopes: ["competitors.read"],
      queryParams: [
        {
          name: "category",
          type: "string",
          description: "Filter by category (Electronics, Grocery, etc.)",
          example: "Electronics",
        },
        {
          name: "channel",
          type: "string",
          description: "Filter by channel: online, in-store, or both.",
          example: "online",
        },
        {
          name: "competitor",
          type: "string",
          description: "Filter to a single competitor key.",
          example: "carrefour",
        },
        {
          name: "limit",
          type: "integer",
          description: "Page size, 1-100. Defaults to 25.",
          example: "25",
        },
        {
          name: "cursor",
          type: "string",
          description: "Pagination cursor returned by the previous page.",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Prices returned",
          example: {
            data: [
              {
                id: "px_3f9c2",
                product: "Sony WH-1000XM5",
                category: "Electronics",
                channel: "online",
                your_price: 1199,
                currency: "QAR",
                competitors: {
                  carrefour: { price: 1149, observed_at: "2026-04-23T10:14:00Z" },
                  amazon: { price: 1179, observed_at: "2026-04-23T10:09:00Z" },
                  noon: { price: 1199, observed_at: "2026-04-23T10:11:00Z" },
                },
                signal: "undercut",
              },
            ],
            page: { has_more: false, next_cursor: null },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Prices are refreshed every 6 hours by default. Trigger an immediate scrape with POST /v1/competitors/scrape.",
        "The `signal` field is one of: aligned, undercut, premium, missing.",
      ],
    },
    {
      slug: "get-price",
      method: "GET",
      path: "/v1/competitors/prices/{id}",
      title: "Retrieve a competitor price snapshot",
      summary: "Returns a single price record by id, including the full competitor breakdown.",
      auth: "bearer",
      scopes: ["competitors.read"],
      pathParams: [
        {
          name: "id",
          type: "string",
          required: true,
          description: "Price snapshot id (px_...).",
          example: "px_3f9c2",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Price returned",
          example: {
            id: "px_3f9c2",
            product: "Sony WH-1000XM5",
            category: "Electronics",
            channel: "online",
            your_price: 1199,
            currency: "QAR",
            competitors: {
              carrefour: { price: 1149, observed_at: "2026-04-23T10:14:00Z" },
              amazon: { price: 1179, observed_at: "2026-04-23T10:09:00Z" },
            },
            signal: "undercut",
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "price-history",
      method: "GET",
      path: "/v1/competitors/prices/history",
      title: "Get historical price series",
      summary: "Returns a monthly time series of your price vs each tracked competitor for a SKU.",
      auth: "bearer",
      scopes: ["competitors.read"],
      queryParams: [
        {
          name: "product",
          type: "string",
          required: true,
          description: "Exact product name as tracked.",
          example: "Sony WH-1000XM5",
        },
        {
          name: "months",
          type: "integer",
          description: "Number of months to return. 1-24, default 6.",
          example: "6",
        },
      ],
      responses: [
        {
          status: 200,
          label: "History returned",
          example: {
            product: "Sony WH-1000XM5",
            currency: "QAR",
            series: [
              { month: "2025-11", you: 1299, carrefour: 1249, amazon: 1259, talabat: 1279 },
              { month: "2025-12", you: 1249, carrefour: 1199, amazon: 1229, talabat: 1259 },
              { month: "2026-01", you: 1199, carrefour: 1149, amazon: 1179, talabat: 1239 },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "trigger-scrape",
      method: "POST",
      path: "/v1/competitors/scrape",
      title: "Trigger a fresh scrape",
      summary:
        "Runs an out-of-band scrape for a specific URL or all tracked URLs. Returns immediately with a job id.",
      auth: "bearer",
      scopes: ["competitors.write"],
      body: [
        {
          name: "url",
          type: "string",
          description:
            "Optional. Scrape a single competitor URL. If omitted, runs all tracked URLs.",
          example: "https://www.carrefourqatar.com/.../sony-wh-1000xm5",
        },
      ],
      responses: [
        {
          status: 202,
          label: "Job accepted",
          example: {
            job_id: "scr_8f2a1",
            status: "queued",
            estimated_completion: "2026-04-23T10:18:00Z",
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Each tracked URL counts as 1 unit of usage when scraped.",
        "Concurrent scrapes are capped at 3 per account to protect upstream sources.",
      ],
    },
    {
      slug: "list-patterns",
      method: "GET",
      path: "/v1/competitors/patterns",
      title: "List detected behavior patterns",
      summary:
        "Returns competitor pricing/promo patterns detected by the model with confidence scores.",
      auth: "bearer",
      scopes: ["competitors.read"],
      queryParams: [
        {
          name: "competitor",
          type: "string",
          description: "Filter to a single competitor.",
          example: "talabat",
        },
        {
          name: "min_confidence",
          type: "integer",
          description: "0-100. Default 70.",
          example: "80",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Patterns returned",
          example: {
            data: [
              {
                id: "pat_4b1d",
                competitor: "Talabat",
                category: "Electronics",
                channel: "online",
                pattern: "Drops electronics 12-18% the Thursday before public holidays",
                confidence: 92,
                detection_period: "Last 11 months",
                impact: "high",
                recommendation: "Pre-position your prices Wednesday evening, not Thursday morning.",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
  ],
};

// ---------- Pricing Recommendations ----------

const PRICING_GROUP: GroupSpec = {
  slug: "pricing",
  name: "Pricing Recommendations",
  tagline: "AI-generated price changes with expected margin and unit impact.",
  pillar: "pricing-intelligence",
  endpoints: [
    {
      slug: "list-recommendations",
      method: "GET",
      path: "/v1/pricing/recommendations",
      title: "List pricing recommendations",
      summary: "Returns active recommendations awaiting decision, ranked by expected net impact.",
      auth: "bearer",
      scopes: ["pricing.read"],
      queryParams: [
        { name: "category", type: "string", description: "Filter by category." },
        { name: "channel", type: "string", description: "online, in-store, or both." },
        { name: "min_confidence", type: "integer", description: "0-100. Default 60." },
        { name: "limit", type: "integer", description: "1-100. Default 25." },
      ],
      responses: [
        {
          status: 200,
          label: "Recommendations returned",
          example: {
            data: [
              {
                id: "rec_9a2c1",
                product: "Sony WH-1000XM5",
                category: "Electronics",
                channel: "online",
                current_price: 1199,
                recommended_price: 1149,
                currency: "QAR",
                confidence: 87,
                reason: "Carrefour and Amazon both undercutting by 4-8% over the last 36 hours.",
                expected: {
                  net_monthly: "+QAR 14,200",
                  margin_impact: "-1.8pp",
                  unit_impact: "+22%",
                },
                source: "engine_v3",
                generated_at: "2026-04-23T08:02:00Z",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "get-recommendation",
      method: "GET",
      path: "/v1/pricing/recommendations/{id}",
      title: "Retrieve a recommendation",
      summary: "Returns a single recommendation with full reasoning and supporting evidence.",
      auth: "bearer",
      scopes: ["pricing.read"],
      pathParams: [
        {
          name: "id",
          type: "string",
          required: true,
          description: "Recommendation id (rec_...).",
          example: "rec_9a2c1",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Recommendation returned",
          example: {
            id: "rec_9a2c1",
            product: "Sony WH-1000XM5",
            category: "Electronics",
            channel: "online",
            current_price: 1199,
            recommended_price: 1149,
            currency: "QAR",
            confidence: 87,
            reason: "Carrefour and Amazon both undercutting by 4-8% over the last 36 hours.",
            expected: { net_monthly: "+QAR 14,200", margin_impact: "-1.8pp", unit_impact: "+22%" },
            evidence: [
              { source: "carrefour", price: 1149, observed_at: "2026-04-23T10:14:00Z" },
              { source: "amazon", price: 1179, observed_at: "2026-04-23T10:09:00Z" },
            ],
            generated_at: "2026-04-23T08:02:00Z",
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "create-decision",
      method: "POST",
      path: "/v1/pricing/decisions",
      title: "Log a pricing decision",
      summary:
        "Record an accept, override, reject, or snooze action for the audit trail. This endpoint does not execute a storefront price change.",
      auth: "bearer",
      scopes: ["pricing.write"],
      body: [
        {
          name: "recommendation_id",
          type: "string",
          required: true,
          description: "The recommendation being acted on.",
          example: "rec_9a2c1",
        },
        {
          name: "decision",
          type: "enum",
          required: true,
          description: "One of: accepted, overridden, rejected, snoozed.",
          example: "accepted",
        },
        {
          name: "applied_price",
          type: "number",
          description: "The merchant-approved override price. Required when decision is overridden; it is not applied by this endpoint.",
          example: "1169",
        },
        {
          name: "snooze_until",
          type: "string (ISO 8601)",
          description: "Required when decision is snoozed.",
          example: "2026-04-25T00:00:00Z",
        },
        {
          name: "note",
          type: "string",
          description: "Free-text rationale, surfaced in the audit log.",
        },
      ],
      responses: [
        {
          status: 201,
          label: "Decision logged",
          example: {
            id: "dec_b3e1",
            recommendation_id: "rec_9a2c1",
            decision: "accepted",
            approved_price: 1149,
            execution_status: "not_executed",
            effect: "Decision recorded only; no storefront price was changed.",
            logged_at: "2026-04-23T10:31:00Z",
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "list-rules",
      method: "GET",
      path: "/v1/pricing/rules",
      title: "List pricing guardrails",
      summary:
        "Returns the active pricing rules that constrain recommendations (min margin, MAP, channel parity, etc.).",
      auth: "bearer",
      scopes: ["pricing.read"],
      responses: [
        {
          status: 200,
          label: "Rules returned",
          example: {
            data: [
              {
                id: "rul_1",
                rule_text: "Never price below 8% gross margin on Electronics",
                enabled: true,
              },
              {
                id: "rul_2",
                rule_text: "Stay within ±3% of Talabat on grocery essentials",
                enabled: true,
              },
              {
                id: "rul_3",
                rule_text: "Never undercut iPhone pricing on weekends",
                enabled: false,
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
  ],
};

// ---------- Promotions / ROI ----------

const PROMOTIONS_GROUP: GroupSpec = {
  slug: "promotions",
  name: "Promotions & ROI",
  tagline: "Simulate campaigns, list competitor promos, and inspect past performance.",
  pillar: "pricing-intelligence",
  endpoints: [
    {
      slug: "calendar",
      method: "GET",
      path: "/v1/promotions/calendar",
      title: "Get the promotion calendar",
      summary:
        "Returns live and upcoming competitor promotions across online and in-store channels.",
      auth: "bearer",
      scopes: ["promotions.read"],
      queryParams: [
        {
          name: "status",
          type: "string",
          description: "live, upcoming, or ended. Defaults to live+upcoming.",
        },
        { name: "competitor", type: "string", description: "Filter by competitor key." },
      ],
      responses: [
        {
          status: 200,
          label: "Calendar returned",
          example: {
            data: [
              {
                id: "prm_42",
                competitor: "Talabat",
                campaign: "Eid Al-Fitr Mega Sale",
                channel: "both",
                dates: "Mar 28 - Apr 5",
                duration: "9 days",
                depth: "15-25%",
                categories: "All categories",
                status: "live",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "simulate",
      method: "POST",
      path: "/v1/promotions/simulate",
      title: "Simulate a campaign",
      summary:
        "Validates whether sufficient product-cost, channel-term, sales-mix, and measured demand evidence exists for a campaign projection. It fails closed when that evidence is incomplete.",
      auth: "bearer",
      scopes: ["promotions.write"],
      body: [
        {
          name: "category",
          type: "string",
          required: true,
          description: "Category to run the campaign on.",
          example: "Electronics",
        },
        {
          name: "channel",
          type: "enum",
          required: true,
          description: "online, in-store, or both.",
          example: "online",
        },
        {
          name: "depth_pct",
          type: "number",
          required: true,
          description: "Discount depth as a percentage (1-50).",
          example: "15",
        },
        {
          name: "duration_days",
          type: "integer",
          required: true,
          description: "Campaign length in days (1-30).",
          example: "7",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Simulation returned",
          example: {
            scenario_id: "sim_77c1",
            inputs: { category: "Electronics", channel: "online", depth_pct: 15, duration_days: 7 },
            outputs: {
              gmv_uplift: 184000,
              incremental_orders: 412,
              cannibalization_pct: 31,
              net_roi: 1.7,
              healthy: true,
              currency: "QAR",
            },
            verdict: "Healthy. Cannibalization is below the 40% threshold. Recommend running.",
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "list-campaigns",
      method: "GET",
      path: "/v1/promotions/campaigns",
      title: "List your past campaigns",
      summary:
        "Returns measured outcomes for campaigns you have run, with verdict and recommended changes.",
      auth: "bearer",
      scopes: ["promotions.read"],
      queryParams: [{ name: "limit", type: "integer", description: "1-100. Default 25." }],
      responses: [
        {
          status: 200,
          label: "Campaigns returned",
          example: {
            data: [
              {
                id: "cmp_18",
                name: "Eid Electronics Blitz (Mar 2026)",
                discount: "20% off all electronics",
                total_gmv: "+QAR 312K",
                incremental_gmv: "+QAR 187K",
                cannibalized: "QAR 125K (40%)",
                roi: 1.4,
                verdict: "Moderate cannibalization. Recommend reducing to 15% next time.",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
  ],
};

// ---------- Field Intel + Webhooks ----------

const FIELD_GROUP: GroupSpec = {
  slug: "field-intel",
  name: "Field Intel",
  tagline: "In-store observations from your field team and detected price gaps.",
  pillar: "multi-tenant-ops",
  endpoints: [
    {
      slug: "list-observations",
      method: "GET",
      path: "/v1/field-intel/observations",
      title: "List recent observations",
      summary:
        "Returns in-store observations submitted by your field team, including price, condition, and reviewer status.",
      auth: "bearer",
      scopes: ["field.read"],
      queryParams: [
        { name: "status", type: "string", description: "pending, reviewed, or flagged." },
        { name: "store", type: "string", description: "Filter by store name fragment." },
        { name: "limit", type: "integer", description: "1-100. Default 25." },
      ],
      responses: [
        {
          status: 200,
          label: "Observations returned",
          example: {
            data: [
              {
                id: "obs_2c11",
                product: "Samsung Galaxy S24 Ultra 256GB",
                store: "Carrefour - Doha Festival City",
                price: 3849,
                currency: "QAR",
                condition: "Regular price",
                promo_detail: null,
                status: "reviewed",
                agent: "Ahmad K.",
                observed_at: "2026-04-23T08:00:00Z",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "submit-observation",
      method: "POST",
      path: "/v1/field-intel/observations",
      title: "Submit an observation",
      summary: "Record an in-store price observation. Useful for mobile apps used by field agents.",
      auth: "bearer",
      scopes: ["field.write"],
      body: [
        {
          name: "product",
          type: "string",
          required: true,
          description: "Product name or SKU.",
          example: "Samsung Galaxy S24 Ultra 256GB",
        },
        {
          name: "store",
          type: "string",
          required: true,
          description: "Store identifier.",
          example: "Carrefour - Doha Festival City",
        },
        {
          name: "price",
          type: "number",
          required: true,
          description: "Observed shelf price.",
          example: "3849",
        },
        {
          name: "currency",
          type: "string",
          description: "ISO currency code. Defaults to account currency.",
          example: "QAR",
        },
        {
          name: "condition",
          type: "enum",
          description: "Regular price, On promotion, or Clearance.",
          example: "On promotion",
        },
        {
          name: "promo_detail",
          type: "string",
          description: "Free-text promo description if condition is On promotion.",
        },
      ],
      responses: [
        {
          status: 201,
          label: "Observation recorded",
          example: {
            id: "obs_4d22",
            product: "Samsung Galaxy S24 Ultra 256GB",
            store: "Carrefour - Doha Festival City",
            price: 3849,
            currency: "QAR",
            condition: "On promotion",
            status: "pending",
            observed_at: "2026-04-23T10:31:00Z",
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "list-gaps",
      method: "GET",
      path: "/v1/field-intel/price-gaps",
      title: "List in-store vs online price gaps",
      summary:
        "Returns SKUs where the in-store price differs from the same competitor's online price by more than 1%.",
      auth: "bearer",
      scopes: ["field.read"],
      responses: [
        {
          status: 200,
          label: "Gaps returned",
          example: {
            data: [
              {
                id: "gap_19",
                product: "Sony WH-1000XM5",
                competitor: "Carrefour",
                online_price: 1199,
                in_store_price: 1149,
                gap_pct: -4.2,
                direction: "down",
                observed_at: "2026-04-23T05:00:00Z",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
  ],
};

const WEBHOOKS_GROUP: GroupSpec = {
  slug: "webhooks",
  name: "Webhooks",
  tagline: "Subscribe to price drops, recommendation changes, and delivery events.",
  pillar: "commerce-events",
  endpoints: [
    {
      slug: "list-endpoints",
      method: "GET",
      path: "/v1/webhooks/endpoints",
      title: "List webhook endpoints",
      summary: "Returns all configured webhook endpoints for your account.",
      auth: "bearer",
      scopes: ["webhooks.read"],
      responses: [
        {
          status: 200,
          label: "Endpoints returned",
          example: {
            data: [
              {
                id: "wh_e1c2",
                url: "https://api.acme.com/hooks/prizeskout",
                events: ["price.dropped", "recommendation.created"],
                enabled: true,
                last_delivery_at: "2026-04-23T10:14:00Z",
                last_delivery_success: true,
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "create-endpoint",
      method: "POST",
      path: "/v1/webhooks/endpoints",
      title: "Create a webhook endpoint",
      summary:
        "Register a new endpoint. We sign every delivery with HMAC-SHA256 using the returned signing_secret.",
      auth: "bearer",
      scopes: ["webhooks.write"],
      body: [
        {
          name: "url",
          type: "string",
          required: true,
          description: "HTTPS URL to receive deliveries.",
          example: "https://api.acme.com/hooks/prizeskout",
        },
        {
          name: "events",
          type: "string[]",
          required: true,
          description: "Event types to subscribe to.",
          example: '["price.dropped","recommendation.created"]',
        },
        { name: "description", type: "string", description: "Optional internal label." },
      ],
      responses: [
        {
          status: 201,
          label: "Endpoint created",
          example: {
            id: "wh_e1c2",
            url: "https://api.acme.com/hooks/prizeskout",
            events: ["price.dropped", "recommendation.created"],
            signing_secret: "whsec_test_3fa9d0c1b2e4f5a6b7c8d9e0f1a2b3c4",
            enabled: true,
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Save the signing_secret immediately. It is only returned once at creation.",
        "Verify deliveries by recomputing HMAC-SHA256(body, signing_secret) and comparing against the X-Webhook-Signature header.",
      ],
    },
    {
      slug: "list-deliveries",
      method: "GET",
      path: "/v1/webhooks/deliveries",
      title: "List recent deliveries",
      summary: "Returns delivery attempts across all endpoints, with status and retry information.",
      auth: "bearer",
      scopes: ["webhooks.read"],
      queryParams: [
        { name: "endpoint_id", type: "string", description: "Filter to a single endpoint." },
        {
          name: "success",
          type: "boolean",
          description: "Filter to successful (true) or failed (false) deliveries.",
        },
        { name: "limit", type: "integer", description: "1-100. Default 25." },
      ],
      responses: [
        {
          status: 200,
          label: "Deliveries returned",
          example: {
            data: [
              {
                id: "whd_a91",
                endpoint_id: "wh_e1c2",
                event_type: "price.dropped",
                status_code: 200,
                success: true,
                attempt: 1,
                duration_ms: 142,
                delivered_at: "2026-04-23T10:14:00Z",
              },
              {
                id: "whd_a90",
                endpoint_id: "wh_e1c2",
                event_type: "recommendation.created",
                status_code: 503,
                success: false,
                attempt: 2,
                duration_ms: 8021,
                error: "upstream timeout",
                next_retry_at: "2026-04-23T10:24:00Z",
                delivered_at: "2026-04-23T10:09:00Z",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "retry-delivery",
      method: "POST",
      path: "/v1/webhooks/deliveries/{id}/retry",
      title: "Retry a failed delivery",
      summary:
        "Manually retries a failed delivery. The retry counts against the endpoint's max_attempts setting.",
      auth: "bearer",
      scopes: ["webhooks.write"],
      pathParams: [
        {
          name: "id",
          type: "string",
          required: true,
          description: "Delivery id (whd_...).",
          example: "whd_a90",
        },
      ],
      responses: [
        {
          status: 202,
          label: "Retry queued",
          example: { id: "whd_a90", status: "queued", queued_at: "2026-04-23T10:32:00Z" },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "emit-enrich",
      method: "POST",
      path: "/v1/webhooks/enrich",
      title: "Emit an enrichment event",
      summary:
        "Fans out an enrichment event (price changed, promo detected, new competitor) to every active webhook endpoint subscribed to enrich.* events. Each delivery is HMAC-signed and recorded.",
      auth: "bearer",
      scopes: ["webhooks.write"],
      body: [
        {
          name: "event_type",
          type: "string",
          required: true,
          description:
            "One of: enrich.price_changed, enrich.promo_detected, enrich.new_competitor.",
          example: "enrich.price_changed",
        },
        {
          name: "payload",
          type: "object",
          description: "Event-specific payload. Forwarded verbatim under data on each delivery.",
          example: '{"sku":"SKU-001","old_price":1199,"new_price":1149,"competitor":"carrefour"}',
        },
      ],
      responses: [
        {
          status: 200,
          label: "Event delivered",
          example: {
            event_id: "evt_a8c2d1f0e2",
            event_type: "enrich.price_changed",
            delivered_count: 1,
            attempted_count: 1,
            deliveries: [{ endpoint_id: "wh_e1c2", success: true, status_code: 200, error: null }],
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Delivery is synchronous in v1: the response returns once every subscriber has been called (or timed out at 8s).",
        "Subscribers are matched by event_type, the wildcard *, or the family pattern enrich.*.",
      ],
    },
  ],
};

// ---------- Multi-Tenant Ops ----------

const OPERATIONS_GROUP: GroupSpec = {
  slug: "operations",
  name: "Multi-Tenant Operations",
  tagline: "Catalog sync, landed-cost margin compute, and dynamic-price decisions per account.",
  pillar: "multi-tenant-ops",
  endpoints: [
    {
      slug: "sync-catalog",
      method: "POST",
      path: "/v1/sync",
      title: "Sync catalog products and prices",
      summary:
        "Idempotent batch upsert for catalog products (and optional channel prices). Per-item results let you fix one bad SKU without resubmitting the whole batch.",
      auth: "bearer",
      scopes: ["catalog.write"],
      body: [
        {
          name: "products",
          type: "object[]",
          required: true,
          description:
            "Array of products. Each item: { sku, name, brand?, category?, attributes?, price?: { list, sale?, channel?, currency? } }. Max 1000 per call.",
          example:
            '[{"sku":"SKU-001","name":"Sony WH-1000XM5","brand":"Sony","category":"Electronics","price":{"list":1199,"channel":"online","currency":"QAR"}}]',
        },
      ],
      responses: [
        {
          status: 200,
          label: "Batch processed",
          example: {
            batch_id: "bch_3a9c2f0e1d",
            item_count: 1,
            ok_count: 1,
            error_count: 0,
            results: [{ sku: "SKU-001", status: "created", product_id: "prod_3a9c2f" }],
          },
        },
      ],
      errors: [
        ...COMMON_ERRORS,
        {
          status: 207,
          code: "partial_success",
          description: "Some items succeeded and some failed. Inspect the per-item results array.",
        },
      ],
      notes: [
        "Required header: Idempotency-Key. Replays of the same key return the cached response without re-processing.",
        "Products are upserted on (account_id, sku). Prices are upserted on (product_id, channel).",
      ],
    },
    {
      slug: "compute-margin",
      method: "POST",
      path: "/v1/margin",
      title: "Compute landed cost and margin",
      summary:
        "Computes landed cost (unit cost + freight + duty + fees) and gross margin from your stored margin_inputs and current catalog price.",
      auth: "bearer",
      scopes: ["pricing.read"],
      body: [
        {
          name: "sku",
          type: "string",
          required: true,
          description: "Catalog SKU.",
          example: "SKU-001",
        },
        {
          name: "list_price",
          type: "number",
          description: "Override the catalog list price for the calculation.",
          example: "1149",
        },
        {
          name: "channel",
          type: "string",
          description: "Channel for the catalog price lookup. Default: online.",
          example: "online",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Margin computed",
          example: {
            sku: "SKU-001",
            product_id: "prod_3a9c2f",
            channel: "online",
            currency: "QAR",
            inputs: {
              unit_cost: 700,
              freight: 25,
              duty_pct: 0.05,
              fees_pct: 0.08,
              list_price: 1199,
            },
            breakdown: { duty_amount: 35, fees_amount: 95.92, landed_cost: 855.92 },
            margin: { gross_margin: 343.08, gross_margin_pct: 0.2861 },
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "dynprice-recommend",
      method: "POST",
      path: "/v1/dynprice",
      title: "Get a dynamic price recommendation",
      summary:
        "Returns the latest evidence-backed margin decision for a synced product. Requires current product-cost evidence and approved channel economics.",
      auth: "bearer",
      scopes: ["pricing.write"],
      body: [
        {
          name: "sku",
          type: "string",
          required: true,
          description: "Catalog SKU.",
          example: "SKU-001",
        },
        {
          name: "channel",
          type: "string",
          description: "Connected source channel such as zid or salla. Omit to use the latest synced occurrence of the SKU.",
          example: "zid",
        },
        {
          name: "target_margin_pct (deprecated; rejected in live mode)",
          type: "number",
          description: "Desired gross-margin floor as a fraction (0–0.95). Default: 0.20.",
          example: "0.25",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Recommendation returned",
          example: {
            sku: "SKU-001",
            product_id: "prod_3a9c2f",
            channel: "zid",
            current_price: 1199,
            recommended_price: 1148,
            action: "recommend",
            authority: "evidence_backed_margin_engine",
            floor_breached: false,
            decision_id: "dec_3a9c2f",
            policy_version: 4,
            expires_at: "2026-04-23T11:14:00Z",
            reason:
              "Undercut cheapest competitor (1149) by 1 unit while respecting the 20% margin floor.",
            signals: {
              margin_floor: 1069.9,
              competitor_min: 1149,
              competitor_count: 3,
              target_margin_pct: 0.2,
              active_rules: ["Never go below 18% gross margin on Electronics."],
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Live recommendations use the merchant's active approved margin policy; request-level margin overrides are rejected.",
        "This endpoint returns a recommendation and never changes a storefront price.",
        "Algorithm: max(margin_floor, competitor_min - 1). If only one signal is available, the other is skipped and the reason explains why.",
        "Active pricing_rules are returned as informational signals — the v1 engine does not enforce them automatically.",
      ],
    },
  ],
};

// ---------- Network Moat ----------

const NETWORK_GROUP: GroupSpec = {
  slug: "network",
  name: "Network Intelligence",
  tagline: "Cross-tenant patterns and market benchmarks no single retailer can compute alone.",
  pillar: "network-moat",
  endpoints: [
    {
      slug: "list-benchmarks",
      method: "GET",
      path: "/v1/network/benchmarks",
      title: "List market benchmarks",
      summary:
        "Returns category-level benchmarks (your value, market average, top quartile) computed across all tenants in your market.",
      auth: "bearer",
      scopes: ["network.read"],
      queryParams: [
        {
          name: "metric",
          type: "string",
          description: "Filter to a single metric key.",
          example: "avg_price_volatility",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Benchmarks returned",
          example: {
            data: [
              {
                id: "bm_vol",
                metric: "Avg price volatility (Electronics)",
                you: 4.2,
                market_avg: 6.8,
                top: 3.1,
                position: "top quartile",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Benchmarks are anonymised and aggregated. Individual tenant data is never exposed.",
        "Updated daily at 02:00 UTC.",
      ],
    },
    {
      slug: "list-patterns",
      method: "GET",
      path: "/v1/network/patterns",
      title: "List cross-tenant detected patterns",
      summary:
        "Returns competitor and category patterns detected across the entire network. Aliased from /v1/competitors/patterns for discoverability.",
      auth: "bearer",
      scopes: ["network.read", "competitors.read"],
      queryParams: [
        {
          name: "competitor",
          type: "string",
          description: "Filter to a single competitor.",
          example: "talabat",
        },
        {
          name: "min_confidence",
          type: "integer",
          description: "0-100. Default 70.",
          example: "80",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Patterns returned",
          example: {
            data: [
              {
                id: "pat_4b1d",
                competitor: "Talabat",
                category: "Electronics",
                pattern: "Drops electronics 12-18% the Thursday before public holidays",
                confidence: 92,
                detection_period: "Last 11 months",
                impact: "high",
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
  ],
};

const RESTAURANT_COMMERCE_GROUP: GroupSpec = {
  slug: "restaurant-commerce",
  name: "Restaurant Commerce",
  tagline: "Normalize POS, ERP and delivery orders into one economic record.",
  pillar: "commerce-events",
  endpoints: [
    {
      slug: "ingest-order-batch",
      method: "POST",
      path: "/v1/commerce/order-batches",
      title: "Ingest a restaurant order batch",
      summary:
        "Accepts idempotent order batches from an ERP, POS, connector or customer data pipeline.",
      description:
        "The first canonical contract for enterprise restaurant groups. Source identifiers and original economic components are retained so the same payload can support Odoo, Oracle, CSV and custom integrations.",
      auth: "bearer",
      scopes: ["write"],
      body: [
        {
          name: "batch_id",
          type: "string",
          required: true,
          description: "Stable source batch identifier; reuse it for retries.",
          example: "odoo:2026-09-05:001",
        },
        {
          name: "source_provider",
          type: "string",
          required: true,
          description: "POS, ERP or connector producing the batch.",
          example: "odoo",
        },
        {
          name: "schema_version",
          type: "string",
          required: true,
          description: "Canonical contract version.",
          example: "2026-09-05",
        },
        {
          name: "delivery_complete",
          type: "boolean",
          required: true,
          description: "Whether the source declares this batch complete.",
        },
        {
          name: "declared_record_count",
          type: "integer",
          description: "Source-declared count used to detect partial delivery.",
          example: "100",
        },
        {
          name: "orders",
          type: "array",
          required: true,
          description: "One to 1,000 canonical restaurant orders.",
        },
      ],
      responses: [
        {
          status: 202,
          label: "Batch accepted",
          example: {
            data: {
              batch_id: "odoo:2026-09-05:001",
              evidence_item_id: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
              duplicate: false,
              accepted: 100,
              events_created: 100,
              delivery_complete: true,
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "The API rejects totals that do not reconcile with their supplied components.",
        "Retries with the same API key, batch ID and normalized content return the original evidence identity.",
        "Customer, card and unrelated personal fields are not part of this contract.",
      ],
    },
    {
      slug: "ingest-product-cost-batch",
      method: "POST",
      path: "/v1/commerce/cost-batches",
      title: "Ingest product costs",
      summary: "Accepts immutable, effective-dated product costs from an ERP or costing pipeline.",
      description:
        "Stores SKU costs at group, brand or branch scope and uses the most specific cost effective on an order's business date when calculating contribution.",
      auth: "bearer",
      scopes: ["write"],
      body: [
        {
          name: "batch_id",
          type: "string",
          required: true,
          description: "Stable source batch identifier used for safe retries.",
          example: "odoo:costs:2026-09-05",
        },
        {
          name: "source_provider",
          type: "string",
          required: true,
          description: "ERP or costing source.",
          example: "odoo",
        },
        {
          name: "schema_version",
          type: "string",
          required: true,
          description: "Canonical contract version.",
          example: "2026-09-05",
        },
        {
          name: "costs",
          type: "array",
          required: true,
          description: "One to 5,000 effective-dated SKU cost records.",
        },
      ],
      responses: [
        {
          status: 202,
          label: "Costs accepted",
          example: {
            data: {
              batch_id: "odoo:costs:2026-09-05",
              duplicate: false,
              accepted: 250,
              costs_created: 250,
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Branch-scoped costs take precedence over brand-scoped and account-wide costs.",
        "Historical records remain immutable; corrections arrive as new effective-dated evidence.",
        "Contribution is withheld when any order-line SKU lacks applicable cost evidence.",
      ],
    },
    {
      slug: "get-order-economics",
      method: "GET",
      path: "/v1/profit/orders/{external_order_id}",
      title: "Retrieve order economics",
      summary: "Returns the current normalized economic record for an external order ID.",
      description:
        "Returns every current source record matching the order ID without overstating profit when product-cost or settlement evidence is absent.",
      auth: "bearer",
      scopes: ["read"],
      pathParams: [
        {
          name: "external_order_id",
          type: "string",
          required: true,
          description: "The order identifier supplied by the POS, ERP or delivery source.",
          example: "POS/0042",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Order economics returned",
          example: {
            data: [
              {
                external_order_id: "POS/0042",
                channel: "talabat",
                currency: "QAR",
                economics: {
                  gross_amount: 105,
                  discount_amount: 10,
                  tax_amount: 0,
                  fee_amount: 0,
                  net_amount: 95,
                  product_cost_amount: null,
                  contribution_amount: null,
                },
                completeness: "order_economics_without_product_cost",
                evidence: { strength: "strong", limitations: [] },
              },
            ],
            meta: { count: 1, note: null },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Contribution remains null until every order line has supported product-cost evidence.",
        "Multiple current records are returned when different sources reuse the same external order ID.",
      ],
    },
    {
      slug: "ingest-settlement-batch",
      method: "POST",
      path: "/v1/commerce/settlement-batches",
      title: "Ingest settlements and receipts",
      summary: "Accepts platform settlement allocations and bank receipt confirmations.",
      description:
        "Normalizes order-level payout lines and bank confirmations into immutable evidence that can be reconciled against supported order and contract facts.",
      auth: "bearer",
      scopes: ["write"],
      body: [
        {
          name: "batch_id",
          type: "string",
          required: true,
          description: "Stable identifier used for idempotent retries.",
          example: "talabat:settlement:2026-09-05",
        },
        {
          name: "source_provider",
          type: "string",
          required: true,
          description: "System that supplied the evidence.",
          example: "talabat",
        },
        {
          name: "channel",
          type: "string",
          required: true,
          description: "Delivery or commerce channel being settled.",
          example: "talabat",
        },
        {
          name: "schema_version",
          type: "string",
          required: true,
          description: "Canonical contract version.",
          example: "2026-09-05",
        },
        {
          name: "delivery_complete",
          type: "boolean",
          required: true,
          description: "Whether the source declared the export complete.",
        },
        {
          name: "settlements",
          type: "array",
          required: true,
          description: "Platform payout lines, preferably allocated to external order IDs.",
        },
        {
          name: "receipts",
          type: "array",
          required: true,
          description: "Bank or treasury confirmations linked by settlement reference.",
        },
      ],
      responses: [
        {
          status: 202,
          label: "Settlement evidence accepted",
          example: {
            data: {
              batch_id: "talabat:settlement:2026-09-05",
              duplicate: false,
              settlements_created: 100,
              receipts_created: 1,
              events_created: 101,
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Batch totals without order allocation are retained but never converted into fictional order-level discrepancies.",
        "Component arithmetic is checked when all settlement components are supplied.",
      ],
    },
    {
      slug: "create-reconciliation-run",
      method: "POST",
      path: "/v1/profit/reconciliation-runs",
      title: "Run settlement reconciliation",
      summary: "Reconciles approved order, agreement, payout and receipt evidence.",
      description:
        "Creates an immutable reconciliation run and evidence-strength-aware findings. An explicit approved contract term is required so platform fees are not guessed.",
      auth: "bearer",
      scopes: ["write"],
      body: [
        {
          name: "evidence_item_id",
          type: "uuid",
          required: true,
          description: "Seed evidence item defining the reviewed reconciliation set.",
        },
        {
          name: "contract_term_id",
          type: "uuid",
          required: true,
          description: "Approved contract terms used to calculate expected settlement.",
        },
      ],
      responses: [
        {
          status: 201,
          label: "Reconciliation completed",
          example: {
            data: {
              run_id: "a942e767-2476-4597-b2aa-728b7f3adad2",
              status: "completed_with_exceptions",
              duplicate: false,
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "The same evidence and contract inputs return the existing immutable run.",
        "A claim-ready finding requires strong order, contract and allocated payout evidence.",
      ],
    },
  ],
};

const CONNECTORS_GROUP: GroupSpec = {
  slug: "connectors",
  name: "Connector Management",
  tagline: "Register and operate merchant-authorized POS and ERP connections.",
  pillar: "multi-tenant-ops",
  endpoints: [
    {
      slug: "list-definitions",
      method: "GET",
      path: "/v1/connectors/definitions",
      title: "List available connectors",
      summary:
        "Returns every registered connector and its current readiness, authorization methods and supported data streams.",
      auth: "bearer",
      scopes: ["read"],
      responses: [
        {
          status: 200,
          label: "Connector definitions returned",
          example: {
            data: [
              {
                provider: "odoo",
                display_name: "Odoo",
                system_type: "pos_erp",
                readiness: "sandbox",
                auth_methods: ["api_key"],
                capabilities: ["branches.read", "orders.read"],
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
      notes: [
        "Readiness is explicit. A listed connector is not necessarily enabled for production use.",
      ],
    },
    {
      slug: "list-connections",
      method: "GET",
      path: "/v1/connectors",
      title: "List merchant connections",
      summary: "Lists non-revoked connector connections belonging to the authenticated account.",
      auth: "bearer",
      scopes: ["read"],
      responses: [
        {
          status: 200,
          label: "Connections returned",
          example: {
            data: [
              {
                id: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
                merchant_id: "merchant_doha_01",
                provider: "odoo",
                environment: "sandbox",
                auth_method: "api_key",
                status: "setup_required",
                requested_capabilities: ["orders.read"],
              },
            ],
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "create-connection",
      method: "POST",
      path: "/v1/connectors",
      title: "Create a merchant connection",
      summary:
        "Registers a tenant-owned connector without accepting raw credentials in its configuration.",
      description:
        "Create one connection for each merchant and provider environment. PrizeSkout checks that the requested authorization method and capabilities are advertised by the connector definition.",
      auth: "bearer",
      scopes: ["write"],
      body: [
        {
          name: "merchant_id",
          type: "string",
          required: true,
          description: "Your stable merchant identifier.",
          example: "merchant_doha_01",
        },
        {
          name: "provider",
          type: "string",
          required: true,
          description: "Registered provider key.",
          example: "odoo",
        },
        {
          name: "environment",
          type: "enum",
          required: true,
          description: "sandbox or production.",
          example: "sandbox",
        },
        {
          name: "auth_method",
          type: "enum",
          required: true,
          description: "A method advertised by the connector definition.",
          example: "api_key",
        },
        {
          name: "external_merchant_id",
          type: "string",
          description: "Merchant identifier used by the source system.",
          example: "odoo-company-7",
        },
        {
          name: "requested_capabilities",
          type: "string[]",
          required: true,
          description: "The minimum data permissions required.",
          example: "orders.read",
        },
        {
          name: "configuration",
          type: "object",
          description: "Non-secret connector settings. Odoo uses base_url, database and currency.",
        },
      ],
      responses: [
        {
          status: 201,
          label: "Connection registered",
          example: {
            data: {
              id: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
              merchant_id: "merchant_doha_01",
              provider: "odoo",
              environment: "sandbox",
              auth_method: "api_key",
              status: "setup_required",
              requested_capabilities: ["orders.read"],
            },
          },
        },
      ],
      errors: [
        ...COMMON_ERRORS,
        {
          status: 422,
          code: "raw_credentials_forbidden",
          description: "Configuration contains a password, token, key or other raw credential.",
        },
      ],
      notes: [
        "Do not place secrets in configuration. Use the credentials endpoint after the connection has been created.",
      ],
    },
    {
      slug: "store-credential",
      method: "POST",
      path: "/v1/connectors/{id}/credentials",
      title: "Store an Odoo API key",
      summary: "Encrypts a dedicated provider API key in the account-scoped credential vault.",
      auth: "bearer",
      scopes: ["write"],
      pathParams: [
        {
          name: "id",
          type: "uuid",
          required: true,
          description: "Connector connection ID.",
          example: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
        },
      ],
      body: [
        {
          name: "api_key",
          type: "string",
          required: true,
          description: "A dedicated provider API key. User passwords are rejected.",
          example: "odoo_api_key_here",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Credential encrypted",
          example: {
            data: {
              connection_id: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
              credential_reference: "vault://credential-id",
              status: "pending_approval",
            },
          },
        },
      ],
      errors: [
        ...COMMON_ERRORS,
        {
          status: 409,
          code: "auth_method_mismatch",
          description: "The connection was not configured for API-key authorization.",
        },
      ],
      notes: ["The API key is write-only. PrizeSkout never returns its plaintext value."],
    },
    {
      slug: "run-sync",
      method: "POST",
      path: "/v1/connectors/{id}/sync",
      title: "Run a connector sync",
      summary:
        "Pulls the next bounded page from an enabled connector and advances its checkpoint after ingestion.",
      auth: "bearer",
      scopes: ["write"],
      pathParams: [
        {
          name: "id",
          type: "uuid",
          required: true,
          description: "Connector connection ID.",
          example: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Sync completed",
          example: {
            data: {
              connection_id: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
              stream: "orders",
              records_seen: 100,
              records_accepted: 100,
              cursor_after: "opaque_cursor",
              delivery_complete: false,
            },
          },
        },
      ],
      errors: [
        ...COMMON_ERRORS,
        {
          status: 409,
          code: "adapter_unavailable",
          description: "The provider has no enabled pull adapter.",
        },
        {
          status: 502,
          code: "connector_sync_failed",
          description: "The provider request or downstream ingestion failed.",
        },
      ],
      notes: [
        "The managed pull adapter currently enabled is Odoo POS orders.",
        "Retry after a 502. The saved checkpoint prevents already accepted pages from being treated as new evidence.",
      ],
    },
    {
      slug: "save-mapping",
      method: "PATCH",
      path: "/v1/connectors/{id}/mappings",
      title: "Map a source identity",
      summary:
        "Maps a source branch, product or other identity to its canonical PrizeSkout record.",
      auth: "bearer",
      scopes: ["write"],
      pathParams: [
        {
          name: "id",
          type: "uuid",
          required: true,
          description: "Connector connection ID.",
          example: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
        },
      ],
      body: [
        {
          name: "identity_type",
          type: "enum",
          required: true,
          description: "legal_entity, brand, branch, revenue_center, product, customer or order.",
          example: "branch",
        },
        {
          name: "external_id",
          type: "string",
          required: true,
          description: "Identity in the source system.",
          example: "odoo-pos-config-4",
        },
        {
          name: "canonical_id",
          type: "string",
          required: true,
          description: "Approved PrizeSkout identity.",
          example: "branch_west_bay",
        },
        {
          name: "confidence",
          type: "number",
          description: "Confidence from 0 to 1 for a proposed mapping.",
          example: "0.95",
        },
        {
          name: "merchant_approved",
          type: "boolean",
          description: "Set true only after the merchant confirms the mapping.",
          example: "true",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Mapping saved",
          example: {
            data: {
              identity_type: "branch",
              external_id: "odoo-pos-config-4",
              canonical_id: "branch_west_bay",
              match_status: "confirmed",
              confidence: 1,
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
    {
      slug: "update-checkpoint",
      method: "PATCH",
      path: "/v1/connectors/{id}/checkpoints",
      title: "Report a connector checkpoint",
      summary:
        "Records progress and health for a stream operated by an approved external connector worker.",
      auth: "bearer",
      scopes: ["write"],
      pathParams: [
        {
          name: "id",
          type: "uuid",
          required: true,
          description: "Connector connection ID.",
          example: "7f43cf95-3fc0-4c0d-8d1f-2fe927a4cf03",
        },
      ],
      body: [
        {
          name: "stream",
          type: "string",
          required: true,
          description: "Logical stream, such as orders or costs.",
          example: "orders",
        },
        {
          name: "cursor",
          type: "string",
          description: "Opaque source cursor saved after successful processing.",
          example: "page-42",
        },
        {
          name: "watermark_at",
          type: "string (ISO 8601)",
          description: "Latest source event time known to be complete.",
          example: "2026-09-11T10:00:00Z",
        },
        {
          name: "status",
          type: "enum",
          required: true,
          description: "idle, running, healthy, partial or failed.",
          example: "healthy",
        },
        {
          name: "records_received",
          type: "integer",
          description: "Records observed in this attempt.",
          example: "100",
        },
        {
          name: "error",
          type: "string",
          description: "Safe diagnostic text when status is failed.",
        },
      ],
      responses: [
        {
          status: 200,
          label: "Checkpoint updated",
          example: {
            data: {
              stream: "orders",
              cursor_value: "page-42",
              status: "healthy",
              records_received: 100,
            },
          },
        },
      ],
      errors: COMMON_ERRORS,
    },
  ],
};

export const API_GROUPS: GroupSpec[] = [
  CONNECTORS_GROUP,
  RESTAURANT_COMMERCE_GROUP,
  COMPETITORS_GROUP,
  PRICING_GROUP,
  PROMOTIONS_GROUP,
  WEBHOOKS_GROUP,
  OPERATIONS_GROUP,
  FIELD_GROUP,
  NETWORK_GROUP,
];

export function findEndpoint(
  groupSlug: string,
  endpointSlug: string,
): { group: GroupSpec; endpoint: EndpointSpec } | null {
  const group = API_GROUPS.find((g) => g.slug === groupSlug);
  if (!group) return null;
  const endpoint = group.endpoints.find((e) => e.slug === endpointSlug);
  if (!endpoint) return null;
  return { group, endpoint };
}

export function getDefaultEndpoint(): { group: GroupSpec; endpoint: EndpointSpec } {
  const group = API_GROUPS[0];
  return { group, endpoint: group.endpoints[0] };
}

export type PillarGroup = { pillar: PillarSpec; groups: GroupSpec[] };

export function getGroupsByPillar(): PillarGroup[] {
  const order: PillarSlug[] = [
    "pricing-intelligence",
    "commerce-events",
    "multi-tenant-ops",
    "network-moat",
  ];
  return order.map((slug) => ({
    pillar: PILLARS[slug],
    groups: API_GROUPS.filter((g) => g.pillar === slug),
  }));
}

export const API_BASE_URL = "https://prizeskout.qa/api/public";

export const ALL_SCOPES = Array.from(
  new Set(API_GROUPS.flatMap((g) => g.endpoints.flatMap((e) => e.scopes))),
).sort();
