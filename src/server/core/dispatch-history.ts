// History of automated repricing dispatches for a merchant. defend-handler.ts
// is the only writer of new dispatch attempts (one row per aggregator per
// attempt, success or failure) — this reads it back out for the dashboard,
// plus lets a merchant delete individual log entries (e.g. test/demo rows).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RepricingRecord = {
  id: string;
  sku: string | null;
  target_channel: string | null;
  old_price: number | null;
  new_price: number;
  currency: string;
  status: string;
  upstream_message: string | null;
  http_status: number | null;
  retry_count: number | null;
  duration_ms: number | null;
  audit_snapshot: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
};

export async function getRepricingHistory(accountId: string, limit = 30): Promise<RepricingRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ps_aggregator_dispatch_log")
    .select("id, sku, target_channel, old_price, new_price, currency, status, upstream_message, http_status, retry_count, duration_ms, audit_snapshot, created_at, completed_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as RepricingRecord[];
}

export async function deleteRepricingEvent(accountId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("ps_aggregator_dispatch_log")
    .delete()
    .eq("account_id", accountId)
    .eq("id", id);
  if (error) return { ok: false, error: "Could not delete that record." };
  return { ok: true };
}
