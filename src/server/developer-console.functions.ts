import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, randomBytes } from "crypto";

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
    const { raw, prefix, lastFour } = generateRawKey(data.mode);
    const { data: inserted, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
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
