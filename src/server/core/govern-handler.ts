// GET /v1/govern/audit
// GET /v1/govern/audit/:trace_id

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type V1Context, type V1Result } from "@/server/v1-handlers";

function err(code: string, message: string, status: number): V1Result {
  return { status, body: { error: { code, message } } };
}

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

const AUDIT_COLS =
  "id, trace_id, event_type, merchant_id, sku, region, source_platform, target_channel, summary_en, summary_ar, data_route, pdpl_compliant, payload_hash, created_at";

export async function handleListGovernAudit(_request: Request, ctx: V1Context): Promise<V1Result> {
  const url = new URL(_request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const eventType = url.searchParams.get("event_type");
  const merchantId = url.searchParams.get("merchant_id");
  const sku = url.searchParams.get("sku");

  let query = supabaseAdmin
    .from("ps_govern_audit_log")
    .select(AUDIT_COLS, { count: "exact" })
    .eq("account_id", ctx.accountId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) query = query.eq("event_type", eventType);
  if (merchantId) query = query.eq("merchant_id", merchantId);
  if (sku) query = query.eq("sku", sku);

  const { data, count, error } = await query;
  if (error) return err("internal_error", "Failed to retrieve audit log.", 500);

  return ok({ audit_entries: data ?? [], total: count ?? 0, limit, offset });
}

export async function handleGetGovernAuditEntry(_request: Request, ctx: V1Context, traceId: string): Promise<V1Result> {
  const { data, error } = await supabaseAdmin
    .from("ps_govern_audit_log")
    .select(`${AUDIT_COLS}, payload_snapshot`)
    .eq("account_id", ctx.accountId)
    .eq("trace_id", traceId)
    .maybeSingle();

  if (error) return err("internal_error", "Failed to retrieve audit entry.", 500);
  if (!data) return err("not_found", `No audit entry found for trace_id: ${traceId}`, 404);

  return ok({ audit_entry: data });
}
