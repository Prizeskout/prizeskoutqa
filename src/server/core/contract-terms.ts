import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ContractTerm = {
  id: string;
  platform: string;
  contract_name: string;
  commission_rate_pct: number;
  vat_on_fees_pct: number;
  payment_fee_pct: number;
  fixed_order_fee: number;
  delivery_contribution: number;
  commission_base: "gross_before_discount"|"net_after_discount"|"eligible_sales"|"unknown";
  promotion_funding_platform_pct: number | null;
  refund_liability: "merchant"|"platform"|"shared"|"conditional"|"unknown";
  cancellation_liability: "merchant"|"platform"|"shared"|"conditional"|"unknown";
  settlement_frequency: string | null;
  settlement_days: number | null;
  dispute_deadline_days: number | null;
  advertising_commitment: number | null;
  minimum_spend: number | null;
  currency: string | null;
  coverage_legal_entity: string | null;
  coverage_brands: string[];
  coverage_branches: string[];
  effective_from: string;
  effective_to: string | null;
  status: "draft" | "approved" | "superseded";
  source_file_name: string | null;
  source_sha256: string | null;
  notes: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  created_at: string;
  extraction_json: Record<string, unknown> | null;
  extraction_model: string | null;
  extraction_confidence: number | null;
  extracted_at: string | null;
};

const table = () => (supabaseAdmin as any).from("ps_marketplace_contract_terms");
// Fall back while either migration is still waiting for deployment. 42P01 is
// the base table; 42703 is an extraction-provenance column from phase two.
const missingTable = (error: any) =>
  error?.code === "42P01" || error?.code === "42703"
  || /ps_marketplace_contract_terms/i.test(error?.message ?? "");

async function fallbackTerms(accountId: string): Promise<ContractTerm[]> {
  const { data } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("metadata")
    .eq("account_id", accountId);
  return (data ?? []).flatMap(row => {
    const terms = (row.metadata as Record<string, unknown> | null)?.contract_terms;
    return Array.isArray(terms) ? terms as ContractTerm[] : [];
  }).sort((a,b)=>b.effective_from.localeCompare(a.effective_from));
}

export async function listContractTerms(accountId: string): Promise<ContractTerm[]> {
  const { data, error } = await table()
    .select("id, platform, contract_name, commission_rate_pct, vat_on_fees_pct, payment_fee_pct, fixed_order_fee, delivery_contribution, commission_base, promotion_funding_platform_pct, refund_liability, cancellation_liability, settlement_frequency, settlement_days, dispute_deadline_days, advertising_commitment, minimum_spend, currency, coverage_legal_entity, coverage_brands, coverage_branches, effective_from, effective_to, status, source_file_name, source_sha256, notes, reviewed_by, approved_at, created_at, extraction_json, extraction_model, extraction_confidence, extracted_at")
    .eq("account_id", accountId)
    .order("effective_from", { ascending: false });
  if (missingTable(error)) return fallbackTerms(accountId);
  if (error) throw new Error(`Could not load contract terms: ${error.message}`);
  return (data ?? []) as ContractTerm[];
}

export async function saveContractDraft(accountId: string, input: Omit<ContractTerm, "id"|"status"|"reviewed_by"|"approved_at"|"created_at">): Promise<ContractTerm> {
  const { data, error } = await table().insert({
    account_id: accountId,
    ...input,
    status: "draft",
  }).select("*").single();
  if (missingTable(error)) {
    const { data: channel } = await supabaseAdmin
      .from("ps_merchant_channels")
      .select("id, metadata")
      .eq("account_id", accountId)
      .eq("platform", input.platform)
      .maybeSingle();
    if (!channel) throw new Error(`Connect ${input.platform} before storing its contract terms.`);
    const metadata = (channel.metadata as Record<string, unknown> | null) ?? {};
    const existing = Array.isArray(metadata.contract_terms) ? metadata.contract_terms as ContractTerm[] : [];
    const draft = { ...input, id:crypto.randomUUID(), status:"draft", reviewed_by:null, approved_at:null, created_at:new Date().toISOString() } as ContractTerm;
    const { error: updateError } = await supabaseAdmin.from("ps_merchant_channels")
      .update({ metadata:{ ...metadata, contract_terms:[...existing,draft] } })
      .eq("id", channel.id);
    if (updateError) throw new Error(updateError.message);
    return draft;
  }
  if (error || !data) throw new Error(error?.message ?? "Could not save contract draft.");
  return data as ContractTerm;
}

export async function approveContractTerm(accountId: string, id: string, reviewedBy: string): Promise<ContractTerm> {
  const { data: target, error: targetError } = await table()
    .select("id, platform, effective_from")
    .eq("account_id", accountId)
    .eq("id", id)
    .maybeSingle();
  if (missingTable(targetError)) {
    const { data: channels } = await supabaseAdmin.from("ps_merchant_channels").select("id, metadata").eq("account_id", accountId);
    for (const channel of channels ?? []) {
      const metadata = (channel.metadata as Record<string, unknown> | null) ?? {};
      const existing = Array.isArray(metadata.contract_terms) ? metadata.contract_terms as ContractTerm[] : [];
      const found = existing.find(term=>term.id===id);
      if (!found) continue;
      const now = new Date().toISOString();
      const approved = { ...found, status:"approved" as const, reviewed_by:reviewedBy, approved_at:now };
      const updated = existing.map(term=>term.id===id?approved:term.platform===found.platform&&term.status==="approved"?{...term,status:"superseded" as const}:term);
      const { error } = await supabaseAdmin.from("ps_merchant_channels").update({ metadata:{...metadata,contract_terms:updated} }).eq("id",channel.id);
      if(error)throw new Error(error.message);
      return approved;
    }
    throw new Error("Contract draft was not found.");
  }
  if (!target) throw new Error("Contract draft was not found.");

  await table()
    .update({ status: "superseded", updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("platform", target.platform)
    .eq("status", "approved");

  const now = new Date().toISOString();
  const { data, error } = await table()
    .update({ status: "approved", reviewed_by: reviewedBy, approved_at: now, updated_at: now })
    .eq("account_id", accountId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not approve contract terms.");
  return data as ContractTerm;
}

export async function getApprovedContractTerm(accountId: string, platform: string, asOf?: string): Promise<ContractTerm | null> {
  const date = asOf || new Date().toISOString().slice(0, 10);
  const { data, error } = await table()
    .select("*")
    .eq("account_id", accountId)
    .eq("platform", platform)
    .eq("status", "approved")
    .lte("effective_from", date)
    .or(`effective_to.is.null,effective_to.gte.${date}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (missingTable(error)) {
    const terms = await fallbackTerms(accountId);
    return terms.find(term=>term.platform===platform&&term.status==="approved"&&term.effective_from<=date&&(!term.effective_to||term.effective_to>=date)) ?? null;
  }
  if (error) throw new Error(error.message);
  return data as ContractTerm | null;
}
