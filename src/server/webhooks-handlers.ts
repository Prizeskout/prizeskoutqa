// ============================================================================
// Real handlers for the /v1/webhooks/* read endpoints (Week 10 — pillar 5).
//
// Reads from `webhook_endpoints` and `webhook_deliveries`, scoped by
// user_id. Falls back to documented sample responses when the user has no
// rows so the docs sandbox stays useful.
//
// SECURITY: signing_secret is intentionally NEVER returned by the list
// endpoint — it is only revealed once at creation time.
// ============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

function toEndpointId(uuid: string): string {
  return `wh_${uuid.replace(/-/g, "").slice(0, 8)}`;
}
function toDeliveryId(uuid: string): string {
  return `whd_${uuid.replace(/-/g, "").slice(0, 8)}`;
}

const SAMPLE_ENDPOINTS = [
  {
    id: "wh_e1c2",
    url: "https://api.acme.com/hooks/prizeskout",
    events: ["price.dropped", "recommendation.created"],
    enabled: true,
    last_delivery_at: "2026-04-23T10:14:00Z",
    last_delivery_success: true,
  },
];

const SAMPLE_DELIVERIES = [
  {
    id: "whd_a91",
    endpoint_id: "wh_e1c2",
    event_type: "price.dropped",
    status_code: 200,
    success: true,
    attempt: 1,
    delivered_at: "2026-04-23T10:14:00Z",
  },
];

// ============================================================================
// GET /v1/webhooks/endpoints
// ============================================================================
export async function handleListEndpoints(_request: Request, ctx: V1Context): Promise<V1Result> {
  const { data, error } = await supabaseAdmin
    .from("webhook_endpoints")
    .select("id, url, description, events, enabled, last_delivery_at, last_delivery_success, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });

  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_ENDPOINTS, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => ({
      id: toEndpointId(r.id),
      url: r.url,
      description: r.description,
      events: Array.isArray(r.events) ? r.events : [],
      enabled: r.enabled,
      last_delivery_at: r.last_delivery_at,
      last_delivery_success: r.last_delivery_success,
      created_at: r.created_at,
    })),
  });
}

// ============================================================================
// GET /v1/webhooks/deliveries
// ============================================================================
export async function handleListDeliveries(request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(request.url);
  const endpointFilter = url.searchParams.get("endpoint_id");
  const successParam = url.searchParams.get("success");
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));

  let q = supabaseAdmin
    .from("webhook_deliveries")
    .select("id, endpoint_id, event_type, status_code, attempt, success, error, delivered_at")
    .eq("user_id", ctx.userId)
    .order("delivered_at", { ascending: false })
    .limit(limit);

  // The endpoint_id filter is the public wh_<short> id — resolve to uuid.
  if (endpointFilter) {
    const prefix = endpointFilter.replace(/^wh_/, "");
    const { data: epRows } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("id")
      .eq("user_id", ctx.userId);
    const match = (epRows ?? []).find((r) => r.id.replace(/-/g, "").slice(0, prefix.length) === prefix);
    if (!match) {
      return ok({ data: [] });
    }
    q = q.eq("endpoint_id", match.id);
  }

  if (successParam === "true") q = q.eq("success", true);
  if (successParam === "false") q = q.eq("success", false);

  const { data, error } = await q;
  if (error) return { status: 500, body: { error: { code: "internal_error", message: error.message } } };

  if (!data || data.length === 0) {
    return ok({ data: SAMPLE_DELIVERIES, _fallback: "sample" });
  }

  return ok({
    data: data.map((r) => ({
      id: toDeliveryId(r.id),
      endpoint_id: toEndpointId(r.endpoint_id),
      event_type: r.event_type,
      status_code: r.status_code,
      success: r.success,
      attempt: r.attempt,
      error: r.error,
      delivered_at: r.delivered_at,
    })),
  });
}
