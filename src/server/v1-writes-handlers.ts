// ============================================================================
// Real handlers for the /v1/* POST writes (Week 10 — final batch).
//
// Implements:
//   - POST /v1/pricing/decisions          → log accept/override/reject/snooze
//   - POST /v1/promotions/simulate        → run a campaign scenario
//   - POST /v1/field-intel/observations   → record an in-store observation
//   - POST /v1/webhooks/endpoints         → register a webhook destination
//   - POST /v1/webhooks/deliveries/{id}/retry → re-queue a failed delivery
// ============================================================================

import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";
import { createNotification } from "@/server/notifications";

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}
function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const raw = await request.text();
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Resolve a public short-id (e.g. "rec_9a2c1") back to a uuid for the user.
async function resolveByPrefix(table: string, userIdCol: string, userId: string, prefix: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from(table as never)
    .select("id")
    .eq(userIdCol, userId);
  const match = (data ?? []).find((r: any) => (r.id as string).replace(/-/g, "").startsWith(prefix));
  return match ? (match as any).id : null;
}

// ============================================================================
// POST /v1/pricing/decisions
// ============================================================================
const DECISION_MAP: Record<string, "applied" | "dismissed" | "snoozed"> = {
  accepted: "applied",
  overridden: "applied",
  applied: "applied",
  rejected: "dismissed",
  dismissed: "dismissed",
  snoozed: "snoozed",
};

export async function handleCreateDecision(request: Request, ctx: V1Context): Promise<V1Result> {
  const json = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a JSON object.", 422);

  const recIdRaw = typeof json.recommendation_id === "string" ? json.recommendation_id : "";
  const decisionRaw = typeof json.decision === "string" ? json.decision.toLowerCase() : "";
  const internalDecision = DECISION_MAP[decisionRaw];

  if (!recIdRaw) {
    return err("validation_failed", "`recommendation_id` is required.", 422, {
      fields: [{ name: "recommendation_id", error: "required" }],
    });
  }
  if (!internalDecision) {
    return err(
      "validation_failed",
      "`decision` must be one of: accepted, overridden, rejected, snoozed.",
      422,
      { fields: [{ name: "decision", error: "invalid" }] },
    );
  }

  const appliedPrice = typeof json.applied_price === "number" ? json.applied_price : null;
  if (decisionRaw === "overridden" && appliedPrice === null) {
    return err("validation_failed", "`applied_price` is required when decision is overridden.", 422);
  }

  const snoozeUntilRaw = typeof json.snooze_until === "string" ? json.snooze_until : null;
  let snoozeUntil: string | null = null;
  if (decisionRaw === "snoozed") {
    if (!snoozeUntilRaw) {
      return err("validation_failed", "`snooze_until` is required when decision is snoozed.", 422);
    }
    const d = new Date(snoozeUntilRaw);
    if (Number.isNaN(d.getTime())) {
      return err("validation_failed", "`snooze_until` must be a valid ISO 8601 timestamp.", 422);
    }
    snoozeUntil = d.toISOString();
  }

  const note = typeof json.note === "string" ? json.note.slice(0, 2000) : null;

  // Resolve rec_<short> to the underlying uuid.
  const short = recIdRaw.replace(/^rec_/, "").trim();
  const recUuid = await resolveByPrefix("pricing_recommendations", "user_id", ctx.userId, short);
  if (!recUuid) {
    return err("not_found", `Recommendation "${recIdRaw}" not found in your account.`, 404);
  }

  // Pull the recommendation so we can persist denormalized fields.
  const { data: rec } = await supabaseAdmin
    .from("pricing_recommendations")
    .select("product, category, channel, current_price, recommended_price, net_monthly")
    .eq("id", recUuid)
    .maybeSingle();
  if (!rec) {
    return err("not_found", `Recommendation "${recIdRaw}" not found in your account.`, 404);
  }

  const finalPrice = appliedPrice ?? Number(rec.recommended_price);

  // Upsert on (user_id, recommendation_id) — repeated decisions overwrite.
  const { data: existing } = await supabaseAdmin
    .from("pricing_decisions")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("recommendation_id", recUuid)
    .maybeSingle();

  let rowId: string;
  if (existing) {
    const { error: upErr } = await supabaseAdmin
      .from("pricing_decisions")
      .update({
        decision: internalDecision,
        snooze_until: snoozeUntil,
        note,
        recommended_price: finalPrice,
      })
      .eq("id", existing.id);
    if (upErr) return err("internal_error", upErr.message, 500);
    rowId = existing.id;
  } else {
    const { data: ins, error: insErr } = await supabaseAdmin
      .from("pricing_decisions")
      .insert({
        user_id: ctx.userId,
        recommendation_id: recUuid,
        product: rec.product,
        category: rec.category,
        channel: rec.channel,
        current_price: rec.current_price,
        recommended_price: finalPrice,
        expected_net_monthly: rec.net_monthly,
        decision: internalDecision,
        snooze_until: snoozeUntil,
        note,
      })
      .select("id, created_at")
      .single();
    if (insErr || !ins) return err("internal_error", insErr?.message ?? "insert failed", 500);
    rowId = ins.id;
  }

  return ok(
    {
      id: `dec_${rowId.replace(/-/g, "").slice(0, 8)}`,
      recommendation_id: recIdRaw,
      decision: decisionRaw,
      applied_price: finalPrice,
      snooze_until: snoozeUntil,
      logged_at: new Date().toISOString(),
    },
    201,
  );
}

// ============================================================================
// POST /v1/promotions/simulate
// ============================================================================
//
// Deterministic v1 simulator — same algorithm as the dashboard scenario
// builder, persisted to promotions_scenarios so the result also shows up in
// GET /v1/promotions/campaigns.
// ============================================================================
export async function handleSimulatePromotion(request: Request, ctx: V1Context): Promise<V1Result> {
  const json = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a JSON object.", 422);

  const category = typeof json.category === "string" ? json.category.trim() : "";
  const channel = typeof json.channel === "string" ? json.channel.trim().toLowerCase() : "";
  const depthPct = typeof json.depth_pct === "number" ? json.depth_pct : NaN;
  const durationDays = typeof json.duration_days === "number" ? json.duration_days : NaN;

  const fields: Array<{ name: string; error: string }> = [];
  if (!category) fields.push({ name: "category", error: "required" });
  if (!["online", "in-store", "both"].includes(channel)) fields.push({ name: "channel", error: "must be online, in-store, or both" });
  if (!Number.isFinite(depthPct) || depthPct < 1 || depthPct > 50) fields.push({ name: "depth_pct", error: "must be 1-50" });
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) fields.push({ name: "duration_days", error: "must be integer 1-30" });
  if (fields.length > 0) {
    return err("validation_failed", "Invalid simulation inputs.", 422, { fields });
  }

  // Algorithm: GMV uplift ≈ baseline_per_day * duration * (1 + depth_elasticity).
  // We don't have per-account baselines exposed yet, so use a fixed reference
  // baseline and surface the assumption in the response.
  const baselinePerDay = 12000; // QAR — placeholder until per-account baselines wire in
  const elasticity = 1.4; // demand response per percent off
  const grossUplift = baselinePerDay * durationDays * (depthPct / 100) * elasticity;
  const cannibalizationPct = Math.min(60, Math.round(depthPct * 1.8 + durationDays * 0.6));
  const incrementalOrders = Math.round((grossUplift / 450) * (1 - cannibalizationPct / 100));
  const channelMultiplier = channel === "both" ? 1.4 : channel === "in-store" ? 0.85 : 1.0;
  const gmvUplift = Math.round(grossUplift * channelMultiplier);
  const netRoi = Math.round(((1 - cannibalizationPct / 100) * (depthPct / 100) * elasticity * 10) * 10) / 10;
  const healthy = cannibalizationPct < 40 && netRoi >= 1.2;

  const depthLabel = `${depthPct}%`;
  const durationLabel = `${durationDays} days`;

  const { data: scenario, error: insErr } = await supabaseAdmin
    .from("promotions_scenarios")
    .insert({
      user_id: ctx.userId,
      category,
      channel,
      depth: depthLabel,
      duration: durationLabel,
      gmv_uplift: gmvUplift,
      incremental_orders: incrementalOrders,
      cannibalization_pct: cannibalizationPct,
      net_roi: netRoi,
      healthy,
      is_baseline: false,
    })
    .select("id, simulated_at")
    .single();

  if (insErr || !scenario) return err("internal_error", insErr?.message ?? "insert failed", 500);

  const verdict = healthy
    ? `Healthy. Cannibalization (${cannibalizationPct}%) is below the 40% threshold and ROI is ${netRoi}x. Recommend running.`
    : `Risky. Cannibalization at ${cannibalizationPct}% with ${netRoi}x ROI — consider trimming depth or duration.`;

  if (!healthy) {
    void createNotification({
      userId: ctx.userId,
      preferenceKey: "promo_overlap",
      category: "pricing",
      severity: "warning",
      title: "This promotion may reduce what you keep",
      body: `${category}: the ${depthPct}% offer is expected to reach ${cannibalizationPct}% cannibalization and ${netRoi}x ROI. Review the discount or duration before publishing.`,
      linkTo: "/dashboard/promotions",
      dedupeKey: `promotion-risk:${scenario.id}`,
      dedupeWindowMinutes: 1440,
      metadata: { scenario_id: scenario.id, category, depth_pct: depthPct, duration_days: durationDays, net_roi: netRoi },
    });
  }

  return ok({
    scenario_id: `sim_${scenario.id.replace(/-/g, "").slice(0, 8)}`,
    inputs: { category, channel, depth_pct: depthPct, duration_days: durationDays },
    outputs: {
      gmv_uplift: gmvUplift,
      incremental_orders: incrementalOrders,
      cannibalization_pct: cannibalizationPct,
      net_roi: netRoi,
      healthy,
      currency: "QAR",
    },
    assumptions: {
      baseline_per_day: baselinePerDay,
      elasticity,
      note: "v1 simulator uses a reference baseline. Per-account baselines wire in next.",
    },
    simulated_at: scenario.simulated_at,
    verdict,
  });
}

// ============================================================================
// POST /v1/field-intel/observations
// ============================================================================
export async function handleSubmitObservation(request: Request, ctx: V1Context): Promise<V1Result> {
  const json = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a JSON object.", 422);

  const product = typeof json.product === "string" ? json.product.trim() : "";
  const store = typeof json.store === "string" ? json.store.trim() : "";
  const price = typeof json.price === "number" ? json.price : NaN;

  const fields: Array<{ name: string; error: string }> = [];
  if (!product) fields.push({ name: "product", error: "required" });
  if (!store) fields.push({ name: "store", error: "required" });
  if (!Number.isFinite(price) || price < 0) fields.push({ name: "price", error: "must be a non-negative number" });
  if (fields.length > 0) return err("validation_failed", "Invalid observation.", 422, { fields });

  const condition = typeof json.condition === "string" && json.condition.length > 0 ? json.condition : "Regular price";
  const promoDetail = typeof json.promo_detail === "string" ? json.promo_detail.slice(0, 500) : null;
  const agent = typeof json.agent === "string" ? json.agent.slice(0, 200) : "API";

  const { data, error: insErr } = await supabaseAdmin
    .from("recent_observations")
    .insert({
      user_id: ctx.userId,
      product,
      store,
      price,
      condition,
      promo_detail: promoDetail,
      status: "pending",
      agent,
      time_label: "just now",
    })
    .select("id, created_at")
    .single();

  if (insErr || !data) return err("internal_error", insErr?.message ?? "insert failed", 500);

  return ok(
    {
      id: `obs_${data.id.replace(/-/g, "").slice(0, 8)}`,
      product,
      store,
      price,
      currency: typeof json.currency === "string" ? json.currency : "QAR",
      condition,
      promo_detail: promoDetail,
      status: "pending",
      agent,
      observed_at: data.created_at,
    },
    201,
  );
}

// ============================================================================
// POST /v1/webhooks/endpoints
// ============================================================================
//
// Returns the signing_secret ONCE on creation. Subsequent reads omit it.
// ============================================================================
export async function handleCreateEndpoint(request: Request, ctx: V1Context): Promise<V1Result> {
  const json = await readJson(request);
  if (!json) return err("validation_failed", "Body must be a JSON object.", 422);

  const url = typeof json.url === "string" ? json.url.trim() : "";
  const events = Array.isArray(json.events) ? (json.events.filter((e) => typeof e === "string") as string[]) : [];
  const description = typeof json.description === "string" ? json.description.slice(0, 500) : null;

  const fields: Array<{ name: string; error: string }> = [];
  if (!url) fields.push({ name: "url", error: "required" });
  if (events.length === 0) fields.push({ name: "events", error: "must contain at least one event type" });
  if (fields.length > 0) return err("validation_failed", "Invalid webhook endpoint.", 422, { fields });

  // Enforce HTTPS for webhook destinations.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return err("validation_failed", "`url` must be a valid absolute URL.", 422);
  }
  if (parsed.protocol !== "https:") {
    return err("validation_failed", "Webhook URLs must use HTTPS.", 422);
  }

  const signingSecret = `whsec_${randomBytes(24).toString("hex")}`;

  const { data, error: insErr } = await supabaseAdmin
    .from("webhook_endpoints")
    .insert({
      user_id: ctx.userId,
      url,
      description,
      events,
      signing_secret: signingSecret,
      enabled: true,
      secret_revealed_at: new Date().toISOString(),
    })
    .select("id, created_at")
    .single();

  if (insErr || !data) return err("internal_error", insErr?.message ?? "insert failed", 500);

  return ok(
    {
      id: `wh_${data.id.replace(/-/g, "").slice(0, 8)}`,
      url,
      description,
      events,
      signing_secret: signingSecret,
      enabled: true,
      created_at: data.created_at,
      message: "Save signing_secret immediately — it is only returned once.",
    },
    201,
  );
}

// ============================================================================
// POST /v1/webhooks/deliveries/{id}/retry
// ============================================================================
//
// Marks the delivery as due-for-retry by setting next_retry_at = now(). The
// existing retry cron (processWebhookRetryQueue) will pick it up on its next
// pass, re-POST the payload, and append a fresh delivery row.
// ============================================================================
export async function handleRetryDelivery(_request: Request, ctx: V1Context, deliveryId: string): Promise<V1Result> {
  const short = deliveryId.replace(/^whd_/, "").trim();
  if (!short) return err("validation_failed", "Invalid delivery id.", 422);

  const uuid = await resolveByPrefix("webhook_deliveries", "user_id", ctx.userId, short);
  if (!uuid) return err("not_found", `Delivery "${deliveryId}" not found in your account.`, 404);

  const { data: row } = await supabaseAdmin
    .from("webhook_deliveries")
    .select("id, success, attempt, max_attempts, endpoint_id")
    .eq("id", uuid)
    .maybeSingle();

  if (!row) return err("not_found", `Delivery "${deliveryId}" not found.`, 404);
  if (row.success) {
    return err("invalid_state", "Cannot retry a delivery that already succeeded.", 409);
  }
  if ((row.attempt ?? 1) >= (row.max_attempts ?? 5)) {
    return err(
      "max_attempts_reached",
      `Delivery has already used ${row.attempt} of ${row.max_attempts} attempts. Increase max_attempts on the endpoint to retry further.`,
      409,
    );
  }

  // Verify the endpoint still exists + is enabled.
  const { data: ep } = await supabaseAdmin
    .from("webhook_endpoints")
    .select("id, enabled")
    .eq("id", row.endpoint_id)
    .maybeSingle();
  if (!ep || !ep.enabled) {
    return err("invalid_state", "The destination endpoint is disabled or removed.", 409);
  }

  const queuedAt = new Date().toISOString();
  await supabaseAdmin
    .from("webhook_deliveries")
    .update({ next_retry_at: queuedAt })
    .eq("id", uuid);

  return ok(
    {
      id: deliveryId,
      status: "queued",
      queued_at: queuedAt,
      message: "Retry queued. The webhook retry worker will attempt delivery within ~60 seconds.",
    },
    202,
  );
}
