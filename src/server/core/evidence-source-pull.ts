import {randomUUID} from "node:crypto";
import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {fetchFoodicsOrderEvidence} from "./foodics-evidence-adapter";
import {syncEvidenceSourceOrders} from "./evidence-source-sync";

type EvidenceSource = {
  id: string;
  account_id: string;
  merchant_id: string;
  provider: string;
  branch_references: string[];
  external_connection_reference: string;
  sync_cursor: string | null;
  expected_sync_interval_minutes: number | null;
  last_sync_at: string | null;
};

const metadataCurrency = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>).currency;
  return typeof value === "string" ? value.trim().toUpperCase() : "";
};

const isDue = (source: EvidenceSource, now: number) => {
  if (!source.last_sync_at) return true;
  const interval = Math.max(15, Number(source.expected_sync_interval_minutes) || 1440) * 60_000;
  return Date.parse(source.last_sync_at) + interval <= now;
};

async function foodicsChannel(source: EvidenceSource) {
  const db = supabaseAdmin as any;
  let query = db.from("ps_merchant_channels")
    .select("id,bearer_token,status,metadata")
    .eq("account_id", source.account_id)
    .eq("merchant_id", source.merchant_id)
    .eq("platform", "foodics")
    .eq("status", "connected");
  if (source.external_connection_reference && source.external_connection_reference !== "default") {
    query = query.eq("id", source.external_connection_reference);
  }
  const {data, error} = await query.limit(2);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("No connected Foodics credential matches this evidence source.");
  if (data.length > 1) throw new Error("Choose the Foodics channel this evidence source should use.");
  return data[0] as {id: string; bearer_token: string | null; metadata: unknown};
}

async function recordEmptySuccess(source: EvidenceSource, cursorAfter: string | null) {
  const db = supabaseAdmin as any;
  const now = new Date().toISOString();
  const {error: runError} = await db.from("ps_evidence_source_sync_runs").insert({
    account_id: source.account_id, connection_id: source.id, state: "completed",
    cursor_before: source.sync_cursor, cursor_after: cursorAfter, records_seen: 0,
    evidence_items_created: 0, duplicates_ignored: 0, started_at: now, finished_at: now,
  });
  if (runError) throw new Error(runError.message);
  const {error} = await db.from("ps_evidence_source_connections").update({
    sync_cursor: cursorAfter ?? source.sync_cursor, last_sync_at: now, last_success_at: now,
    last_error: null, last_delivery_state: "completed", updated_at: now,
  }).eq("id", source.id).eq("status", "active");
  if (error) throw new Error(error.message);
  return {ok: true as const, connectionId: source.id, records: 0};
}

async function recordPullFailure(source: EvidenceSource, error: unknown) {
  const db = supabaseAdmin as any;
  const now = new Date().toISOString();
  const message = (error instanceof Error ? error.message : "Evidence source pull failed.").slice(0, 1000);
  await db.from("ps_evidence_source_sync_runs").insert({
    account_id: source.account_id, connection_id: source.id, state: "failed",
    cursor_before: source.sync_cursor, records_seen: 0, error_message: message,
    started_at: now, finished_at: now,
  });
  await db.from("ps_evidence_source_connections").update({
    last_sync_at: now, last_error: message, last_delivery_state: "failed", updated_at: now,
  }).eq("id", source.id).eq("status", "active");
  return {ok: false as const, connectionId: source.id, error: message};
}

export async function pullFoodicsEvidenceSource(source: EvidenceSource) {
  try {
    const channel = await foodicsChannel(source);
    if (!channel.bearer_token) throw new Error("The connected Foodics channel has no access token.");
    const currency = metadataCurrency(channel.metadata);
    if (!currency) throw new Error("Set the Foodics business currency before automatic evidence collection.");
    const page = await fetchFoodicsOrderEvidence({
      accessToken: channel.bearer_token,
      currency,
      cursor: source.sync_cursor,
      branchIds: source.branch_references,
    });
    if (!page.records.length) return recordEmptySuccess(source, page.cursorAfter);
    const result = await syncEvidenceSourceOrders({
      connectionId: source.id,
      batchId: `foodics:${source.sync_cursor ?? "0"}:${page.cursorAfter ?? "end"}`,
      cursorAfter: page.cursorAfter,
      records: page.records,
      deliveryComplete: page.deliveryComplete,
      declaredRecordCount: page.records.length,
    });
    return {ok: true as const, connectionId: source.id, records: page.records.length, result};
  } catch (error) {
    return recordPullFailure(source, error);
  }
}

export async function pullDueEvidenceSources(limit = 10) {
  const db = supabaseAdmin as any;
  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 25);
  const {data, error} = await db.from("ps_evidence_source_connections")
    .select("id,account_id,merchant_id,provider,branch_references,external_connection_reference,sync_cursor,expected_sync_interval_minutes,last_sync_at")
    .eq("status", "active").eq("read_only", true).order("last_sync_at", {ascending: true, nullsFirst: true}).limit(100);
  if (error) throw new Error(error.message);
  const due = ((data ?? []) as EvidenceSource[]).filter(source => isDue(source, Date.now())).slice(0, boundedLimit);
  const runId = randomUUID();
  const results = [];
  for (const source of due) {
    if (source.provider === "foodics") results.push(await pullFoodicsEvidenceSource(source));
    else results.push(await recordPullFailure(source, new Error(`No pull adapter is enabled for ${source.provider}.`)));
  }
  return {runId, due: due.length, succeeded: results.filter(result => result.ok).length, failed: results.filter(result => !result.ok).length, results};
}
