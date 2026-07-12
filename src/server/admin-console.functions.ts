import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function requireAdmin(supabase: any, callerId: string) {
  const { data, error } = await (supabase as any).rpc("has_role", {
    _user_id: callerId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin role required");
}

// --- Overview stats ---

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const [appsRes, pendingRes, channelsRes, codesRes, auditRes] = await Promise.all([
      supabaseAdmin
        .from("licensee_applications")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("licensee_applications")
        .select("*", { count: "exact", head: true })
        .eq("live_status", "pending"),
      supabaseAdmin
        .from("ps_merchant_channels")
        .select("*", { count: "exact", head: true })
        .eq("status", "connected"),
      supabaseAdmin
        .from("ps_access_codes")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("ps_govern_audit_log")
        .select("*", { count: "exact", head: true }),
    ]);

    const { data: recentAudit } = await supabaseAdmin
      .from("ps_govern_audit_log")
      .select(
        "trace_id, event_type, source_platform, target_channel, merchant_id, sku, region, summary_en, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: channelRows } = await supabaseAdmin
      .from("ps_merchant_channels")
      .select("platform")
      .eq("status", "connected");

    const channelBreakdown: Record<string, number> = {};
    for (const row of channelRows ?? []) {
      channelBreakdown[row.platform] = (channelBreakdown[row.platform] ?? 0) + 1;
    }

    return {
      totalApps:      appsRes.count     ?? 0,
      pendingApps:    pendingRes.count   ?? 0,
      activeChannels: channelsRes.count  ?? 0,
      totalCodes:     codesRes.count     ?? 0,
      totalAuditEvents: auditRes.count   ?? 0,
      recentAudit:    recentAudit        ?? [],
      channelBreakdown,
    };
  });

// --- Channels ---

export const getAllChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { data, error } = await supabaseAdmin
      .from("ps_merchant_channels")
      .select("account_id, platform, status, connected_at")
      .order("connected_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return { channels: data ?? [] };
  });

export const adminRevokeChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string; platform: string }) => ({
    accountId: String(input?.accountId ?? "").trim(),
    platform:  String(input?.platform  ?? "").trim(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    if (!data.accountId || !data.platform) throw new Error("accountId and platform required");

    const { error } = await supabaseAdmin
      .from("ps_merchant_channels")
      .update({ status: "revoked" })
      .eq("account_id", data.accountId)
      .eq("platform", data.platform);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Access codes ---

export const getAllAccessCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { data, error } = await supabaseAdmin
      .from("ps_access_codes")
      .select("code, merchant_id, created_at")
      .order("created_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const generateAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { region: string; merchantId?: string }) => ({
    region:     String(input?.region     ?? "QA").trim().toUpperCase().slice(0, 4),
    merchantId: String(input?.merchantId ?? "").trim().slice(0, 64),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const code = `PSK-${data.region}-${suffix}`;

    const { error } = await supabaseAdmin
      .from("ps_access_codes")
      .insert({ code, merchant_id: data.merchantId ?? "" });
    if (error) {
      if (error.code === "23505") throw new Error(`Code ${code} already exists — try again`);
      throw new Error(error.message);
    }
    return { code };
  });

export const deleteAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => ({
    code: String(input?.code ?? "").trim(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    if (!data.code) throw new Error("code required");

    const { error } = await supabaseAdmin
      .from("ps_access_codes")
      .delete()
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Audit log ---

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { data, error } = await supabaseAdmin
      .from("ps_govern_audit_log")
      .select(
        "trace_id, event_type, account_id, merchant_id, sku, region, source_platform, target_channel, summary_en, pdpl_compliant, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });
