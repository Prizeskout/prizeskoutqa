import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Tables in the newest migration are not present in generated Supabase types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const terminal = new Set(["ready", "completed", "cancelled", "unable_to_fulfil"]);
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value);
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export type GuardOrder = {
  id: string;
  external_order_id: string;
  external_branch_id: string | null;
  channel: string | null;
  status: string;
  risk_level: string;
  currency: string;
  order_total: number | null;
  placed_at: string;
  expected_ready_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  ready_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export function classifyOrderRisk(input: {
  status: string;
  ageSeconds: number;
  acknowledgedAgeSeconds: number;
  readyDeadlineMissed: boolean;
  acknowledgementSeconds: number;
  managerEscalationSeconds: number;
  criticalEscalationSeconds: number;
  preparationStallSeconds: number;
}) {
  if (terminal.has(input.status)) return "cleared";
  if (input.readyDeadlineMissed) return "critical";
  if (input.status !== "watching")
    return input.acknowledgedAgeSeconds >= input.preparationStallSeconds ? "critical" : "watching";
  if (input.ageSeconds >= input.criticalEscalationSeconds) return "critical";
  if (input.ageSeconds >= input.managerEscalationSeconds) return "manager";
  if (input.ageSeconds >= input.acknowledgementSeconds) return "attention";
  return "watching";
}

export function normalizeUrbanPiperOrder(input: unknown) {
  const root = record(input),
    order = record(root.order ?? root.data ?? root),
    details = record(order.details),
    store = record(order.store);
  const id = text(order.id ?? order.order_id ?? details.id ?? details.order_id);
  const businessId = text(details.biz_id ?? order.biz_id ?? root.biz_id);
  if (!id) throw new Error("UrbanPiper order id is required.");
  if (!businessId) throw new Error("UrbanPiper business id is required.");
  const createdRaw = order.created ?? order.created_at ?? details.created ?? Date.now();
  const placedAt =
    typeof createdRaw === "number"
      ? new Date(createdRaw > 10_000_000_000 ? createdRaw : createdRaw * 1000)
      : new Date(String(createdRaw));
  if (!Number.isFinite(placedAt.getTime()))
    throw new Error("UrbanPiper order creation time is invalid.");
  const nextState = text(order.next_state ?? root.next_state).toLowerCase();
  const sourceStatus = text(
    details.state ??
      details.order_state ??
      order.status ??
      details.status ??
      root.current_state ??
      root.event_type,
  ).toLowerCase();
  // Aggregator acceptance is not proof that a branch saw the order. Only an
  // explicit kitchen/POS acknowledgement clears the initial attention timer.
  const status = /cancel/.test(sourceStatus)
    ? "cancelled"
    : /complete|deliver/.test(sourceStatus)
      ? "completed"
      : /food.ready|food_ready|ready|dispatch/.test(sourceStatus)
        ? "ready"
        : /prepar|progress/.test(sourceStatus)
          ? "preparing"
          : /acknowledg|kitchen[_ .-]?ack|pos[_ .-]?ack/.test(sourceStatus)
            ? "acknowledged"
            : "watching";
  const pickupRaw =
    order.expected_pickup_time ?? order.delivery_datetime ?? details.expected_pickup_time;
  const pickup =
    pickupRaw == null
      ? null
      : new Date(
          typeof pickupRaw === "number"
            ? pickupRaw > 10_000_000_000
              ? pickupRaw
              : pickupRaw * 1000
            : String(pickupRaw),
        );
  const total = Number(
    details.order_total ?? order.order_total ?? order.total ?? details.total ?? order.value ?? NaN,
  );
  return {
    externalOrderId: id,
    externalBusinessId: businessId,
    externalBranchId:
      text(
        store.merchant_ref_id ??
          store.id ??
          details.location_id ??
          details.biz_location_id ??
          order.location_id ??
          details.store_id,
      ) || null,
    channel: text(details.channel ?? order.channel ?? root.channel) || null,
    status,
    placedAt: placedAt.toISOString(),
    expectedReadyAt: pickup && Number.isFinite(pickup.getTime()) ? pickup.toISOString() : null,
    currency: (text(order.currency ?? details.currency) || "QAR").toUpperCase(),
    orderTotal: Number.isFinite(total) ? total : null,
    raw: root,
    nextState,
  };
}

function suppliedToken(request: Request) {
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  return (
    bearer ||
    request.headers.get("x_api_token")?.trim() ||
    request.headers.get("x-api-token")?.trim() ||
    request.headers.get("x-urbanpiper-webhook-secret")?.trim() ||
    new URL(request.url).searchParams.get("key")?.trim() ||
    ""
  );
}

export async function receiveUrbanPiperOrder(request: Request): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      persistUrbanPiperOrder(request),
      new Promise<Response>((resolve) => {
        timer = setTimeout(
          () =>
            resolve(
              Response.json(
                { error: "Order intake is temporarily busy; retry this event." },
                { status: 503, headers: { "Retry-After": "2" } },
              ),
            ),
          4_400,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function persistUrbanPiperOrder(request: Request): Promise<Response> {
  const token = suppliedToken(request);
  if (!token)
    return Response.json({ error: "Webhook authentication is required." }, { status: 401 });
  const { data: source, error: sourceError } = await db
    .from("ps_order_guard_sources")
    .select("id,account_id,merchant_id,external_business_id,status")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (sourceError)
    return Response.json(
      { error: "Order Guard is not provisioned. Apply the latest database migration." },
      { status: 503 },
    );
  if (!source || source.status !== "active")
    return Response.json({ error: "Invalid or inactive webhook credential." }, { status: 401 });
  let normalized;
  try {
    const payload = record(await request.json());
    const headerBusinessId = request.headers.get("x-upr-biz-id")?.trim() || "";
    normalized = normalizeUrbanPiperOrder(
      headerBusinessId && !payload.biz_id ? { ...payload, biz_id: headerBusinessId } : payload,
    );
    if (headerBusinessId && headerBusinessId !== normalized.externalBusinessId)
      throw new Error("UrbanPiper business header does not match the payload.");
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid order payload." },
      { status: 422 },
    );
  }
  if (normalized.externalBusinessId !== source.external_business_id)
    return Response.json(
      { error: "Business identity does not match this webhook credential." },
      { status: 403 },
    );
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("ps_order_guard_orders")
    .select("id,status,risk_level,acknowledged_at,ready_at,completed_at")
    .eq("source_id", source.id)
    .eq("external_order_id", normalized.externalOrderId)
    .maybeSingle();
  const lifecycleRank: Record<string, number> = {
    watching: 0,
    acknowledged: 1,
    preparing: 2,
    ready: 3,
    completed: 4,
    cancelled: 4,
    unable_to_fulfil: 4,
  };
  const effectiveStatus =
    existing?.status &&
    !["cancelled", "completed"].includes(normalized.status) &&
    lifecycleRank[existing.status] > lifecycleRank[normalized.status]
      ? existing.status
      : normalized.status;
  const row = {
    account_id: source.account_id,
    merchant_id: source.merchant_id,
    source_id: source.id,
    provider: "urbanpiper",
    external_order_id: normalized.externalOrderId,
    external_business_id: normalized.externalBusinessId,
    external_branch_id: normalized.externalBranchId,
    channel: normalized.channel,
    status: effectiveStatus,
    risk_level: terminal.has(effectiveStatus) ? "cleared" : (existing?.risk_level ?? "watching"),
    currency: normalized.currency,
    order_total: normalized.orderTotal,
    placed_at: normalized.placedAt,
    expected_ready_at: normalized.expectedReadyAt,
    acknowledged_at:
      existing?.acknowledged_at ??
      (["acknowledged", "preparing", "ready", "completed"].includes(effectiveStatus) ? now : null),
    ready_at: existing?.ready_at ?? (["ready", "completed"].includes(effectiveStatus) ? now : null),
    completed_at: existing?.completed_at ?? (effectiveStatus === "completed" ? now : null),
    last_source_event_at: now,
    raw_payload: normalized.raw,
    updated_at: now,
  };
  const { data: saved, error } = await db
    .from("ps_order_guard_orders")
    .upsert(row, { onConflict: "source_id,external_order_id" })
    .select("id,status,risk_level")
    .single();
  if (error) return Response.json({ error: "Order could not be retained." }, { status: 500 });
  await Promise.all([
    db
      .from("ps_order_guard_sources")
      .update({ last_event_at: now, updated_at: now })
      .eq("id", source.id),
    db.from("ps_order_guard_actions").insert({
      account_id: source.account_id,
      order_id: saved.id,
      action: existing ? "source_update" : "received",
      actor: "urbanpiper",
      detail: { status: normalized.status, next_state: normalized.nextState },
    }),
  ]);
  if (terminal.has(effectiveStatus)) {
    await db
      .from("ps_attention_items")
      .update({
        status: "resolved",
        resolved_at: now,
        resolution_note: `Order closed by UrbanPiper (${effectiveStatus}).`,
      })
      .eq("account_id", source.account_id)
      .like("fingerprint", `order-guard:${saved.id}:%`)
      .in("status", ["open", "assigned", "waiting_approval", "snoozed"]);
  }
  return Response.json(
    {
      order_ref_id: saved.id,
      accepted: true,
      duplicate: Boolean(existing),
      guard_status: saved.status,
    },
    { status: existing ? 200 : 202 },
  );
}

export async function provisionOrderGuard(
  accountId: string,
  merchantId: string,
  externalBusinessId: string,
) {
  if (!externalBusinessId.trim()) throw new Error("UrbanPiper business ID is required.");
  const normalizedBusinessId = externalBusinessId.trim();
  const { data: current } = await db
    .from("ps_order_guard_sources")
    .select("account_id")
    .eq("provider", "urbanpiper")
    .eq("external_business_id", normalizedBusinessId)
    .maybeSingle();
  if (current && current.account_id !== accountId)
    throw new Error("This UrbanPiper business is already protected by another account.");
  const token = `ps_og_${randomBytes(24).toString("base64url")}`,
    now = new Date().toISOString();
  const { data, error } = await db
    .from("ps_order_guard_sources")
    .upsert(
      {
        account_id: accountId,
        merchant_id: merchantId,
        provider: "urbanpiper",
        external_business_id: normalizedBusinessId,
        token_hash: hash(token),
        status: "active",
        updated_at: now,
      },
      { onConflict: "provider,external_business_id" },
    )
    .select("id,external_business_id,status,created_at")
    .single();
  if (error) throw error;
  await db
    .from("ps_order_guard_settings")
    .upsert({ account_id: accountId, updated_at: now }, { onConflict: "account_id" });
  return { source: data, webhook_token: token };
}

export async function sweepOrderGuard(accountId?: string) {
  let settingsQuery = db.from("ps_order_guard_settings").select("*").eq("enabled", true);
  if (accountId) settingsQuery = settingsQuery.eq("account_id", accountId);
  const { data: settings, error: settingsError } = await settingsQuery;
  if (settingsError) throw settingsError;
  let escalated = 0;
  for (const config of settings ?? []) {
    const { data: orders } = await db
      .from("ps_order_guard_orders")
      .select("*")
      .eq("account_id", config.account_id)
      .in("status", ["watching", "acknowledged", "preparing"]);
    for (const order of orders ?? []) {
      const age = (Date.now() - Date.parse(order.placed_at)) / 1000;
      const readyLate =
        order.expected_ready_at &&
        Date.now() > Date.parse(order.expected_ready_at) + config.ready_grace_seconds * 1000;
      const acknowledgedAge = order.acknowledged_at
        ? (Date.now() - Date.parse(order.acknowledged_at)) / 1000
        : 0;
      const risk = classifyOrderRisk({
        status: order.status,
        ageSeconds: age,
        acknowledgedAgeSeconds: acknowledgedAge,
        readyDeadlineMissed: Boolean(readyLate),
        acknowledgementSeconds: config.acknowledgement_seconds,
        managerEscalationSeconds: config.manager_escalation_seconds,
        criticalEscalationSeconds: config.critical_escalation_seconds,
        preparationStallSeconds: config.preparation_stall_seconds,
      });
      if (risk === order.risk_level) continue;
      await db
        .from("ps_order_guard_orders")
        .update({ risk_level: risk, updated_at: new Date().toISOString() })
        .eq("id", order.id);
      await db.from("ps_order_guard_actions").insert({
        account_id: config.account_id,
        order_id: order.id,
        action: `risk_${risk}`,
        actor: "order_guard",
        detail: { age_seconds: Math.floor(age), ready_deadline_missed: Boolean(readyLate) },
      });
      if (risk !== "watching")
        await db.from("ps_attention_items").upsert(
          {
            account_id: config.account_id,
            fingerprint: `order-guard:${order.id}:${risk}`,
            item_type: "order_guard",
            title: `${risk === "critical" ? "Critical" : "Order needs attention"}: ${order.external_order_id}`,
            detail: `${order.external_branch_id || "Branch"} has not progressed this ${order.channel || "online"} order.`,
            priority: risk === "critical" ? "critical" : "high",
            status: "open",
            evidence_strength: "verified",
            source_route: "order_guard",
            detected_at: new Date().toISOString(),
          },
          { onConflict: "account_id,fingerprint" },
        );
      escalated += 1;
    }
  }
  return { escalated };
}

export async function getOrderGuard(accountId: string) {
  await sweepOrderGuard(accountId);
  const [{ data: orders, error }, { data: source }, { data: settings }] = await Promise.all([
    db
      .from("ps_order_guard_orders")
      .select(
        "id,external_order_id,external_branch_id,channel,status,risk_level,currency,order_total,placed_at,expected_ready_at,acknowledged_at,acknowledged_by,ready_at,completed_at,updated_at",
      )
      .eq("account_id", accountId)
      .order("placed_at", { ascending: false })
      .limit(100),
    db
      .from("ps_order_guard_sources")
      .select("id,provider,external_business_id,status,last_event_at")
      .eq("account_id", accountId)
      .neq("status", "revoked")
      .maybeSingle(),
    db
      .from("ps_order_guard_settings")
      .select(
        "acknowledgement_seconds,manager_escalation_seconds,critical_escalation_seconds,preparation_stall_seconds,ready_grace_seconds,enabled",
      )
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);
  if (error) throw error;
  const rows = (orders ?? []) as GuardOrder[];
  return {
    available: true,
    source,
    settings: settings ?? {
      acknowledgement_seconds: 60,
      manager_escalation_seconds: 120,
      critical_escalation_seconds: 180,
      preparation_stall_seconds: 900,
      ready_grace_seconds: 300,
      enabled: true,
    },
    orders: rows,
    summary: {
      live: rows.filter((x) => !terminal.has(x.status)).length,
      attention: rows.filter((x) => ["attention", "manager", "critical"].includes(x.risk_level))
        .length,
      critical: rows.filter((x) => x.risk_level === "critical").length,
      protected_today: rows.filter(
        (x) =>
          x.acknowledged_at && Date.parse(x.acknowledged_at) >= new Date().setHours(0, 0, 0, 0),
      ).length,
    },
  };
}

export async function actOnGuardOrder(
  accountId: string,
  id: string,
  action: string,
  actor: string,
) {
  const allowed: Record<string, string> = {
    acknowledge: "acknowledged",
    preparing: "preparing",
    ready: "ready",
    complete: "completed",
    unable: "unable_to_fulfil",
  };
  if (!allowed[action]) throw new Error("Unsupported Order Guard action.");
  const now = new Date().toISOString(),
    status = allowed[action];
  const patch: Record<string, unknown> = {
    status,
    risk_level: terminal.has(status) ? "cleared" : "watching",
    updated_at: now,
  };
  if (action === "acknowledge") {
    patch.acknowledged_at = now;
    patch.acknowledged_by = actor || "Branch team";
  }
  if (action === "ready") patch.ready_at = now;
  if (action === "complete") patch.completed_at = now;
  const { data, error } = await db
    .from("ps_order_guard_orders")
    .update(patch)
    .eq("id", id)
    .eq("account_id", accountId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Order not found.");
  await db.from("ps_order_guard_actions").insert({
    account_id: accountId,
    order_id: id,
    action,
    actor: actor || "Branch team",
    detail: { status },
  });
  await db
    .from("ps_attention_items")
    .update({
      status: "resolved",
      resolved_at: now,
      resolution_note: `Branch marked order ${status}.`,
    })
    .eq("account_id", accountId)
    .like("fingerprint", `order-guard:${id}:%`)
    .in("status", ["open", "assigned", "waiting_approval", "snoozed"]);
  return data;
}
