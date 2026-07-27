import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DefendLoopHealth = {
  state: "active" | "degraded" | "idle" | "not_monitored";
  label: string;
  detail: string;
  connected_channels: number;
  recently_verified_channels: number;
  last_activity_at: string | null;
  last_success_at: string | null;
  recent_failures: number;
  checked_at: string;
};

export async function getDefendLoopHealth(accountId: string): Promise<DefendLoopHealth> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const verificationCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).getTime();
  const [{ data: channels }, { data: dispatches }] = await Promise.all([
    supabaseAdmin
      .from("ps_merchant_channels")
      .select("platform,status,last_verified_at,error_message")
      .eq("account_id", accountId),
    supabaseAdmin
      .from("ps_aggregator_dispatch_log")
      .select("status,created_at,completed_at,target_channel")
      .eq("account_id", accountId)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const connected = (channels ?? []).filter(c => c.status === "connected");
  const recentlyVerified = connected.filter(c => c.last_verified_at && Date.parse(c.last_verified_at) >= verificationCutoff);
  const rows = dispatches ?? [];
  const failures = rows.filter(r => !["success", "completed"].includes(String(r.status).toLowerCase()));
  const successes = rows.filter(r => ["success", "completed"].includes(String(r.status).toLowerCase()));
  const lastActivity = rows[0]?.completed_at ?? rows[0]?.created_at ?? null;
  const lastSuccess = successes[0]?.completed_at ?? successes[0]?.created_at ?? null;
  const channelErrors = connected.filter(c => c.error_message).length;

  let state: DefendLoopHealth["state"];
  if (!connected.length) state = "not_monitored";
  else if (failures.length > 0 || channelErrors > 0 || recentlyVerified.length < connected.length) state = "degraded";
  else if (successes.length > 0) state = "active";
  else state = "idle";

  const label = state === "active" ? "Defend Loop active"
    : state === "degraded" ? "Defend Loop degraded"
    : state === "idle" ? "Defend Loop ready"
    : "Defend Loop not monitored";
  const detail = state === "active" ? `${connected.length} channel${connected.length === 1 ? "" : "s"} connected · last success ${lastSuccess ? new Date(lastSuccess).toLocaleString("en-GB") : "unknown"}`
    : state === "degraded" ? `${failures.length + channelErrors} issue${failures.length + channelErrors === 1 ? "" : "s"} in live signals · review Connections`
    : state === "idle" ? `${connected.length} channel${connected.length === 1 ? "" : "s"} connected · no price dispatches in 24h`
    : "Connect a supported channel to begin monitoring";

  return {
    state, label, detail, connected_channels: connected.length,
    recently_verified_channels: recentlyVerified.length,
    last_activity_at: lastActivity, last_success_at: lastSuccess,
    recent_failures: failures.length + channelErrors,
    checked_at: new Date(now).toISOString(),
  };
}
