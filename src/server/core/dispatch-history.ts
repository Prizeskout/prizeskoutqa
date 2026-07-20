// Read-only history of automated repricing dispatches for a merchant.
// defend-handler.ts is the only writer of ps_aggregator_dispatch_log (one
// row per aggregator per dispatch attempt, success or failure) — this just
// reads it back out, scoped to the merchant, for display in the dashboard.
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
  created_at: string;
};

export async function getRepricingHistory(accountId: string, limit = 30): Promise<RepricingRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ps_aggregator_dispatch_log")
    .select("id, sku, target_channel, old_price, new_price, currency, status, upstream_message, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as RepricingRecord[];
}
