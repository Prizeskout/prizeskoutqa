// Per-merchant pricing config. Currently just the global margin floor —
// previously hardcoded (DEFAULT_MARGIN_FLOOR in decide-engine.ts) and
// identical for every merchant. A missing row means "use the 0.18 default",
// so any merchant who hasn't set a custom floor keeps today's behavior.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_MARGIN_FLOOR } from "./decide-engine";

export async function getMerchantMarginFloor(accountId: string): Promise<number> {
  if (!accountId) return DEFAULT_MARGIN_FLOOR;
  const { data } = await supabaseAdmin
    .from("ps_merchant_pricing_config")
    .select("margin_floor_pct")
    .eq("account_id", accountId)
    .maybeSingle();
  const pct = data?.margin_floor_pct;
  return typeof pct === "number" && pct > 0 && pct < 1 ? pct : DEFAULT_MARGIN_FLOOR;
}

export async function setMerchantMarginFloor(accountId: string, marginFloorPct: number): Promise<{ ok: boolean; error?: string }> {
  if (!accountId) return { ok: false, error: "account_id required" };
  if (!(marginFloorPct > 0 && marginFloorPct < 1)) {
    return { ok: false, error: "margin_floor_pct must be between 0 and 1 (exclusive)" };
  }
  const { error } = await supabaseAdmin
    .from("ps_merchant_pricing_config")
    .upsert(
      { account_id: accountId, margin_floor_pct: marginFloorPct, updated_at: new Date().toISOString() },
      { onConflict: "account_id" },
    );
  if (error) return { ok: false, error: "Failed to save margin floor." };
  return { ok: true };
}
