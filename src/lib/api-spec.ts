// Single source of truth for the public API documentation.
// Drives the /docs reference UI and the /api/v1/$ test-mode dispatcher.

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

export type GroupSpec = {
  slug: string;
  name: string;
  tagline: string;
  endpoints: EndpointSpec[];
};

const COMMON_ERRORS: ErrorSpec[] = [
  { status: 401, code: "unauthorized", description: "Missing or invalid API key." },
  { status: 403, code: "forbidden", description: "Your key is missing the required scope for this endpoint." },
  { status: 404, code: "not_found", description: "The requested resource does not exist or is not visible to your account." },
  { status: 422, code: "validation_failed", description: "One or more fields failed validation. The response includes per-field errors." },
  { status: 429, code: "rate_limited", description: "You have exceeded the per-minute request quota. Retry after the Retry-After header." },
  { status: 500, code: "internal_error", description: "Unexpected server error. Safe to retry with the same request id." },
];

// ---------- Competitor Prices ----------

const COMPETITORS_GROUP: GroupSpec = {
  slug: "competitors",
  name: "Competitor Prices",
  tagline: "Live and historical competitor prices across online and in-store channels.",
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
        { name: "category", type: "string", description: "Filter by category (Electronics, Grocery, etc.)", example: "Electronics" },
        { name: "channel", type: "string", description: "Filter by channel: online, in-store, or both.", example: "online" },
        { name: "competitor", type: "string", description: "Filter to a single competitor key.", example: "carrefour" },
        { name: "limit", type: "integer", description: "Page size, 1-100. Defaults to 25.", example: "25" },
        { name: "cursor", type: "string", description: "Pagination cursor returned by the previous page." },
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
        { name: "id", type: "string", required: true, description: "Price snapshot id (px_...).", example: "px_3f9c2" },
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
        { name: "product", type: "string", required: true, description: "Exact product name as tracked.", example: "Sony WH-1000XM5" },
        { name: "months", type: "integer", description: "Number of months to return. 1-24, default 6.", example: "6" },
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
      summary: "Runs an out-of-band scrape for a specific URL or all tracked URLs. Returns immediately with a job id.",
      auth: "bearer",
      scopes: ["competitors.write"],
      body: [
        { name: "url", type: "string", description: "Optional. Scrape a single competitor URL. If omitted, runs all tracked URLs.", example: "https://www.carrefourqatar.com/.../sony-wh-1000xm5" },
      ],
      responses: [
        {
          status: 202,
          label: "Job accepted",
          example: { job_id: "scr_8f2a1", status: "queued", estimated_completion: "2026-04-23T10:18:00Z" },
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
      summary: "Returns competitor pricing/promo patterns detected by the model with confidence scores.",
      auth: "bearer",
      scopes: ["competitors.read"],
      queryParams: [
        { name: "competitor", type: "string", description: "Filter to a single competitor.", example: "talabat" },
        { name: "min_confidence", type: "integer", description: "0-100. Default 70.", example: "80" },
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
                expected: { net_monthly: "+QAR 14,200", margin_impact: "-1.8pp", unit_impact: "+22%" },
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
        { name: "id", type: "string", required: true, description: "Recommendation id (rec_...).", example: "rec_9a2c1" },
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
      summary: "Record an accept, override, or snooze action for a recommendation. Used for the audit trail and to retrain the model.",
      auth: "bearer",
      scopes: ["pricing.write"],
      body: [
        { name: "recommendation_id", type: "string", required: true, description: "The recommendation being acted on.", example: "rec_9a2c1" },
        { name: "decision", type: "enum", required: true, description: "One of: accepted, overridden, rejected, snoozed.", example: "accepted" },
        { name: "applied_price", type: "number", description: "Required when decision is overridden.", example: "1169" },
        { name: "snooze_until", type: "string (ISO 8601)", description: "Required when decision is snoozed.", example: "2026-04-25T00:00:00Z" },
        { name: "note", type: "string", description: "Free-text rationale, surfaced in the audit log." },
      ],
      responses: [
        {
          status: 201,
          label: "Decision logged",
          example: {
            id: "dec_b3e1",
            recommendation_id: "rec_9a2c1",
            decision: "accepted",
            applied_price: 1149,
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
      summary: "Returns the active pricing rules that constrain recommendations (min margin, MAP, channel parity, etc.).",
      auth: "bearer",
      scopes: ["pricing.read"],
      responses: [
        {
          status: 200,
          label: "Rules returned",
          example: {
            data: [
              { id: "rul_1", rule_text: "Never price below 8% gross margin on Electronics", enabled: true },
              { id: "rul_2", rule_text: "Stay within ±3% of Talabat on grocery essentials", enabled: true },
              { id: "rul_3", rule_text: "Never undercut iPhone pricing on weekends", enabled: false },
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
  endpoints: [
    {
      slug: "calendar",
      method: "GET",
      path: "/v1/promotions/calendar",
      title: "Get the promotion calendar",
      summary: "Returns live and upcoming competitor promotions across online and in-store channels.",
      auth: "bearer",
      scopes: ["promotions.read"],
      queryParams: [
        { name: "status", type: "string", description: "live, upcoming, or ended. Defaults to live+upcoming." },
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
      summary: "Returns predicted GMV uplift, cannibalization, incremental orders, and net ROI for a candidate campaign.",
      auth: "bearer",
      scopes: ["promotions.write"],
      body: [
        { name: "category", type: "string", required: true, description: "Category to run the campaign on.", example: "Electronics" },
        { name: "channel", type: "enum", required: true, description: "online, in-store, or both.", example: "online" },
        { name: "depth_pct", type: "number", required: true, description: "Discount depth as a percentage (1-50).", example: "15" },
        { name: "duration_days", type: "integer", required: true, description: "Campaign length in days (1-30).", example: "7" },
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
      summary: "Returns measured outcomes for campaigns you have run, with verdict and recommended changes.",
      auth: "bearer",
      scopes: ["promotions.read"],
      queryParams: [
        { name: "limit", type: "integer", description: "1-100. Default 25." },
      ],
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
  endpoints: [
    {
      slug: "list-observations",
      method: "GET",
      path: "/v1/field-intel/observations",
      title: "List recent observations",
      summary: "Returns in-store observations submitted by your field team, including price, condition, and reviewer status.",
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
        { name: "product", type: "string", required: true, description: "Product name or SKU.", example: "Samsung Galaxy S24 Ultra 256GB" },
        { name: "store", type: "string", required: true, description: "Store identifier.", example: "Carrefour - Doha Festival City" },
        { name: "price", type: "number", required: true, description: "Observed shelf price.", example: "3849" },
        { name: "currency", type: "string", description: "ISO currency code. Defaults to account currency.", example: "QAR" },
        { name: "condition", type: "enum", description: "Regular price, On promotion, or Clearance.", example: "On promotion" },
        { name: "promo_detail", type: "string", description: "Free-text promo description if condition is On promotion." },
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
      summary: "Returns SKUs where the in-store price differs from the same competitor's online price by more than 1%.",
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
      summary: "Register a new endpoint. We sign every delivery with HMAC-SHA256 using the returned signing_secret.",
      auth: "bearer",
      scopes: ["webhooks.write"],
      body: [
        { name: "url", type: "string", required: true, description: "HTTPS URL to receive deliveries.", example: "https://api.acme.com/hooks/prizeskout" },
        { name: "events", type: "string[]", required: true, description: "Event types to subscribe to.", example: '["price.dropped","recommendation.created"]' },
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
        "Verify deliveries by recomputing HMAC-SHA256(body, signing_secret) and comparing against the X-PrizeSkout-Signature header.",
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
        { name: "success", type: "boolean", description: "Filter to successful (true) or failed (false) deliveries." },
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
      summary: "Manually retries a failed delivery. The retry counts against the endpoint's max_attempts setting.",
      auth: "bearer",
      scopes: ["webhooks.write"],
      pathParams: [
        { name: "id", type: "string", required: true, description: "Delivery id (whd_...).", example: "whd_a90" },
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
  ],
};

export const API_GROUPS: GroupSpec[] = [
  COMPETITORS_GROUP,
  PRICING_GROUP,
  PROMOTIONS_GROUP,
  FIELD_GROUP,
  WEBHOOKS_GROUP,
];

export function findEndpoint(groupSlug: string, endpointSlug: string): { group: GroupSpec; endpoint: EndpointSpec } | null {
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

export const API_BASE_URL = "https://api.prizeskout.com";

export const ALL_SCOPES = Array.from(
  new Set(API_GROUPS.flatMap((g) => g.endpoints.flatMap((e) => e.scopes))),
).sort();
