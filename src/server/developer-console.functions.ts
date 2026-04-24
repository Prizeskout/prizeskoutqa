import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Developer console server functions.
 * API keys are generated server-side, shown once to the user, then stored as a
 * SHA-256 hash. The raw secret never goes back to the database or the client
 * after creation.
 */

type CreateKeyInput = {
  name: string;
  mode: "test" | "live";
};

function generateRawKey(mode: "test" | "live") {
  const prefix = mode === "live" ? "sk_live" : "sk_test";
  // 32 bytes → 64 hex chars: plenty of entropy, URL-safe.
  const secret = randomBytes(32).toString("hex");
  return {
    raw: `${prefix}_${secret}`,
    prefix,
    lastFour: secret.slice(-4),
  };
}

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateKeyInput): CreateKeyInput => {
    const name = String(input?.name ?? "").trim().slice(0, 120);
    const mode = input?.mode === "live" ? "live" : "test";
    if (!name) throw new Error("Key name is required");
    return { name, mode };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve the user's primary licensee (owner membership). Personal
    // licensees are auto-provisioned by ensure_licensee_for_user on signup
    // and by the W1 backfill for existing users.
    const { data: membership, error: mErr } = await supabase
      .from("licensee_members")
      .select("licensee_id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!membership) {
      throw new Error(
        "No licensee found for this user. Please refresh the page or contact support.",
      );
    }
    const licenseeId = membership.licensee_id;

    // Phase B gate: live keys require an approved application.
    if (data.mode === "live") {
      const { data: application, error: aErr } = await supabase
        .from("licensee_applications")
        .select("live_status")
        .eq("user_id", userId)
        .maybeSingle();
      if (aErr) throw new Error(aErr.message);
      if (!application || application.live_status !== "approved") {
        throw new Error(
          "Live API access has not been approved for this account. Submit a live access request from the API Keys page."
        );
      }
    }

    const { raw, prefix, lastFour } = generateRawKey(data.mode);
    const { data: inserted, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        licensee_id: licenseeId,
        name: data.name,
        mode: data.mode,
        key_prefix: prefix,
        key_hash: hashKey(raw),
        last_four: lastFour,
        scopes: ["read"],
      })
      .select("id, name, mode, key_prefix, last_four, created_at")
      .single();
    if (error) throw new Error(error.message);
    // IMPORTANT: raw is returned only here, once, never persisted.
    return { key: inserted, secret: raw };
  });

// ---------- Phase B: live access approval ----------

type LiveAccessInput = {
  companyName: string;
  companyDomain: string;
  useCase: string;
  expectedVolume: string;
  billingEmail: string;
};

export const requestLiveAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LiveAccessInput) => ({
    companyName: String(input?.companyName ?? "").trim().slice(0, 160),
    companyDomain: String(input?.companyDomain ?? "").trim().slice(0, 160),
    useCase: String(input?.useCase ?? "").trim().slice(0, 2000),
    expectedVolume: String(input?.expectedVolume ?? "").trim().slice(0, 80),
    billingEmail: String(input?.billingEmail ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.companyName || !data.useCase || !data.billingEmail) {
      throw new Error("Company name, use case, and billing email are required");
    }
    const { error } = await supabase
      .from("licensee_applications")
      .upsert(
        {
          user_id: userId,
          live_status: "pending",
          company_name: data.companyName,
          company_domain: data.companyDomain || null,
          use_case: data.useCase,
          expected_volume: data.expectedVolume || null,
          billing_email: data.billingEmail,
          requested_at: new Date().toISOString(),
          decided_at: null,
          decided_by: null,
          decision_note: null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type DecisionInput = { userId: string; note?: string };

async function requireAdmin(supabase: ReturnType<typeof Object>, callerId: string) {
  const { data, error } = await (supabase as any).rpc("has_role", {
    _user_id: callerId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin role required");
}

export const approveLiveAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DecisionInput) => ({
    userId: String(input?.userId ?? ""),
    note: String(input?.note ?? "").trim().slice(0, 1000) || null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    if (!data.userId) throw new Error("userId required");
    await requireAdmin(supabase, callerId);
    const { error } = await supabase
      .from("licensee_applications")
      .update({
        live_status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: callerId,
        decision_note: data.note,
      })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectLiveAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DecisionInput) => ({
    userId: String(input?.userId ?? ""),
    note: String(input?.note ?? "").trim().slice(0, 1000) || null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    if (!data.userId) throw new Error("userId required");
    await requireAdmin(supabase, callerId);
    const { error } = await supabase
      .from("licensee_applications")
      .update({
        live_status: "rejected",
        decided_at: new Date().toISOString(),
        decided_by: callerId,
        decision_note: data.note,
      })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeLiveAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DecisionInput) => ({
    userId: String(input?.userId ?? ""),
    note: String(input?.note ?? "").trim().slice(0, 1000) || null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    if (!data.userId) throw new Error("userId required");
    await requireAdmin(supabase, callerId);
    const { error } = await supabase
      .from("licensee_applications")
      .update({
        live_status: "none",
        decided_at: new Date().toISOString(),
        decided_by: callerId,
        decision_note: data.note,
      })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    // Also revoke any existing live keys for that user
    await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", data.userId)
      .eq("mode", "live")
      .is("revoked_at", null);
    return { ok: true };
  });


export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type CreateWebhookInput = {
  url: string;
  description?: string;
  events: string[];
};

export const createWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateWebhookInput) => {
    const url = String(input?.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("URL must start with http(s)://");
    const description = String(input?.description ?? "").trim().slice(0, 240) || null;
    const events = Array.isArray(input?.events) ? input.events.slice(0, 20) : [];
    return { url: url.slice(0, 500), description, events };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const signingSecret = `whsec_${randomBytes(24).toString("hex")}`;
    const { data: inserted, error } = await supabase
      .from("webhook_endpoints")
      .insert({
        user_id: userId,
        url: data.url,
        description: data.description,
        events: data.events,
        signing_secret: signingSecret,
        enabled: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { endpoint: inserted };
  });

export const toggleWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; enabled: boolean }) => ({
    id: String(input.id),
    enabled: Boolean(input.enabled),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("webhook_endpoints")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("webhook_endpoints").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Retry config ----------

export const updateWebhookRetryConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; maxAttempts: number; backoffSeconds: number }) => ({
      id: String(input.id),
      maxAttempts: Math.max(1, Math.min(10, Math.round(Number(input.maxAttempts) || 5))),
      backoffSeconds: Math.max(5, Math.min(3600, Math.round(Number(input.backoffSeconds) || 30))),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("webhook_endpoints")
      .update({
        max_attempts: data.maxAttempts,
        backoff_seconds: data.backoffSeconds,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Manual delivery retry ----------

function signPayload(secret: string, body: string, timestamp: number) {
  const signedPayload = `${timestamp}.${body}`;
  const hex = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return { signature: `t=${timestamp},v1=${hex}`, hex };
}

export const retryWebhookDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deliveryId: string }) => ({ deliveryId: String(input.deliveryId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: delivery, error: dErr } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .eq("id", data.deliveryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!delivery) throw new Error("Delivery not found");

    const { data: endpoint, error: eErr } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("id", delivery.endpoint_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!endpoint) throw new Error("Endpoint not found");
    if (!endpoint.enabled) throw new Error("Endpoint is disabled — enable it before retrying");

    const payload =
      (delivery.payload && typeof delivery.payload === "object"
        ? delivery.payload
        : { event: delivery.event_type, delivery_id: delivery.id, replayed: true });
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const { signature } = signPayload(endpoint.signing_secret, body, timestamp);

    const nextAttempt = (delivery.attempt ?? 1) + 1;
    const started = Date.now();
    let statusCode: number | null = null;
    let ok = false;
    let errorText: string | null = null;
    let responseBody: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PrizeSkout-Event": delivery.event_type,
          "X-PrizeSkout-Signature": signature,
          "X-PrizeSkout-Delivery-Id": delivery.id,
          "X-PrizeSkout-Attempt": String(nextAttempt),
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      statusCode = res.status;
      ok = res.ok;
      try {
        responseBody = (await res.text()).slice(0, 2000);
      } catch {
        responseBody = null;
      }
      if (!ok) errorText = `HTTP ${res.status}`;
    } catch (e) {
      errorText = (e as Error).message || "Request failed";
      ok = false;
    }

    const duration = Date.now() - started;
    const maxAttempts = endpoint.max_attempts ?? 5;
    const backoff = endpoint.backoff_seconds ?? 30;
    const nextRetryAt =
      !ok && nextAttempt < maxAttempts
        ? new Date(Date.now() + backoff * Math.pow(2, nextAttempt - 1) * 1000).toISOString()
        : null;

    const { error: uErr } = await supabase
      .from("webhook_deliveries")
      .update({
        attempt: nextAttempt,
        status_code: statusCode,
        success: ok,
        error: errorText,
        response_body: responseBody,
        duration_ms: duration,
        delivered_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
        payload,
      })
      .eq("id", delivery.id);
    if (uErr) throw new Error(uErr.message);

    await supabase
      .from("webhook_endpoints")
      .update({
        last_delivery_at: new Date().toISOString(),
        last_delivery_success: ok,
      })
      .eq("id", endpoint.id);

    return {
      ok,
      statusCode,
      duration,
      attempt: nextAttempt,
      responseBody,
      error: errorText,
      nextRetryAt,
    };
  });

// ---------- Signature verification tester ----------

export const testWebhookSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { endpointId: string; payload?: string; signature?: string }) => ({
      endpointId: String(input.endpointId),
      payload: String(input?.payload ?? "").slice(0, 10_000),
      signature: String(input?.signature ?? "").slice(0, 500),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: endpoint, error } = await supabase
      .from("webhook_endpoints")
      .select("id, signing_secret")
      .eq("id", data.endpointId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!endpoint) throw new Error("Endpoint not found");

    const body = data.payload || JSON.stringify({ event: "test.ping", ts: Date.now() });
    const timestamp = Math.floor(Date.now() / 1000);
    const { signature: computed, hex: computedHex } = signPayload(
      endpoint.signing_secret,
      body,
      timestamp,
    );

    // If user provided a signature to verify, compare against computed hex using timing-safe equal.
    let userMatch: boolean | null = null;
    if (data.signature) {
      // Accept either "t=...,v1=<hex>" format or raw hex.
      const m = data.signature.match(/v1=([a-f0-9]+)/i);
      const provided = (m ? m[1] : data.signature).trim().toLowerCase();
      try {
        const a = Buffer.from(provided, "hex");
        const b = Buffer.from(computedHex, "hex");
        userMatch = a.length === b.length && timingSafeEqual(a, b);
      } catch {
        userMatch = false;
      }
    }

    return {
      ok: true,
      body,
      timestamp,
      expectedSignature: computed,
      expectedHex: computedHex,
      userMatch,
    };
  });
