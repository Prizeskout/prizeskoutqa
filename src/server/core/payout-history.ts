// Persists Expected Payout Check results so a merchant can look back at past
// runs (live or uploaded) instead of the number disappearing the moment they
// navigate away. See expected-payout.ts / payout-csv-parser.ts for how a
// result is computed — this module only stores and lists what already ran.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ExpectedPayoutResult } from "./expected-payout";

export type PayoutCheckRecord = {
  id: string;
  source: "live" | "upload";
  platform: string;
  order_count: number;
  sub_total_sum: number;
  commission_rate_pct: number;
  expected_payout: number;
  period_start: string | null;
  period_end: string | null;
  rows_skipped: number | null;
  rows_total: number | null;
  created_at: string;
};

export async function savePayoutCheck(accountId: string, result: ExpectedPayoutResult): Promise<void> {
  if (!result.ok) return;
  try {
    await supabaseAdmin.from("ps_payout_checks").insert({
      account_id: accountId,
      source: result.source ?? "live",
      platform: result.platform ?? "talabat",
      order_count: result.order_count ?? 0,
      sub_total_sum: result.sub_total_sum ?? 0,
      commission_rate_pct: result.commission_rate_pct ?? 0,
      expected_payout: result.expected_payout ?? 0,
      period_start: result.period_start ?? null,
      period_end: result.period_end ?? null,
      rows_skipped: result.rows_skipped ?? null,
      rows_total: result.rows_total ?? null,
    });
  } catch (err) {
    // History is a convenience log, not the source of truth for the check
    // itself — never let a logging failure break the result the merchant is
    // waiting on.
    console.error("[payout-history] failed to save check:", err);
  }
}

export async function getPayoutCheckHistory(accountId: string, limit = 30): Promise<PayoutCheckRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ps_payout_checks")
    .select("id, source, platform, order_count, sub_total_sum, commission_rate_pct, expected_payout, period_start, period_end, rows_skipped, rows_total, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as PayoutCheckRecord[];
}
