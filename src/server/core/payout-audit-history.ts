// Persists a saved multi-document commission audit (see
// src/lib/commission-audit.ts for how one is computed) so a merchant can
// look back at a past reconciliation run instead of it disappearing the
// moment they navigate away. Mirrors payout-history.ts's shape exactly —
// this is a plain persist/list/delete layer, no computation happens here.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AuditAssurance, ClassifiedDocument, CrossCheckWindow, Finding, FourWayReconciliation, LedgerRow } from "@/lib/commission-audit";

export type PayoutAuditRecord = {
  id: string;
  commission_rate_pct: number;
  document_count: number;
  // Full documents (with per-document result/evidence/overrides) only for
  // audits saved after 2026-07-27; older rows retain the pre-fix summarized
  // shape (file_name/document_type/order_count/sub_total_sum only), which is
  // why the UI checks `assurance != null` before trusting this as full detail.
  documents: ClassifiedDocument[];
  findings: Finding[];
  ledger: LedgerRow[] | null;
  ledger_totals: LedgerRow | null;
  period_start: string | null;
  period_end: string | null;
  assurance: AuditAssurance | null;
  four_way: FourWayReconciliation | null;
  cross_check_windows: CrossCheckWindow[] | null;
  net_sales_override_docs: string[] | null;
  created_at: string;
};

export type SavePayoutAuditInput = {
  commission_rate_pct: number;
  documents: ClassifiedDocument[];
  findings: Finding[];
  ledger: LedgerRow[];
  ledger_totals: LedgerRow | null;
  period_start: string | null;
  period_end: string | null;
  assurance: AuditAssurance | null;
  four_way: FourWayReconciliation | null;
  cross_check_windows: CrossCheckWindow[] | null;
  net_sales_override_docs: string[] | null;
};

export async function savePayoutAudit(accountId: string, audit: SavePayoutAuditInput): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("ps_payout_audits").insert({
    account_id: accountId,
    commission_rate_pct: audit.commission_rate_pct,
    document_count: audit.documents.length,
    documents: audit.documents,
    findings: audit.findings,
    ledger: audit.ledger,
    ledger_totals: audit.ledger_totals,
    period_start: audit.period_start,
    period_end: audit.period_end,
    assurance: audit.assurance,
    four_way: audit.four_way,
    cross_check_windows: audit.cross_check_windows,
    net_sales_override_docs: audit.net_sales_override_docs,
  });
  if (error) return { ok: false, error: "Could not save that audit." };
  return { ok: true };
}

export async function getAuditHistory(accountId: string, limit = 30): Promise<PayoutAuditRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ps_payout_audits")
    .select("id, commission_rate_pct, document_count, documents, findings, ledger, ledger_totals, period_start, period_end, assurance, four_way, cross_check_windows, net_sales_override_docs, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as PayoutAuditRecord[];
}

// Scoped by account_id (not just id) so a merchant can only ever delete
// their own records, even though this is only ever called through the
// already-authenticated dashboard flow.
export async function deletePayoutAudit(accountId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("ps_payout_audits")
    .delete()
    .eq("account_id", accountId)
    .eq("id", id);
  if (error) return { ok: false, error: "Could not delete that record." };
  return { ok: true };
}
