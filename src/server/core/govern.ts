// =============================================================================
// Govern — Bilingual Cryptographic Audit Log
//
// Every event that passes through the pipeline (ingest, decide, dispatch, error)
// gets an immutable, bilingual (EN + AR) audit entry with a SHA-256 hash of the
// canonical payload snapshot. Used for PDPL/QFC dispute trail.
// =============================================================================

import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Localisation maps
// ---------------------------------------------------------------------------
const PLATFORM_AR: Record<string, string> = {
  foodics: "فوديكس",
  salla: "سلة",
  zid: "زد",
  sap: "SAP",
  microsoft: "مايكروسوفت",
};

const REGION_AR: Record<string, string> = {
  QA: "قطر",
  AE: "الإمارات العربية المتحدة",
  SA: "المملكة العربية السعودية",
  KW: "الكويت",
  BH: "البحرين",
  OM: "عُمان",
};

const CHANNEL_AR: Record<string, string> = {
  talabat: "طلبات",
  jahez: "جاهز",
  snoonu: "سنو",
  deliveroo: "ديليفرو",
  keeta: "كيتا",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AuditEventType = "ingest" | "decide" | "dispatch" | "error" | "channel_connect";

export type WriteAuditParams = {
  accountId: string;
  licenseeId: string;
  merchantId: string;
  sku: string;
  region: string;
  eventType: AuditEventType;
  sourcePlatform?: string;
  targetChannel?: string;
  dataRoute?: string;
  pdplCompliant?: boolean;
  ingestEventId?: string;
  dispatchId?: string;
  payload: Record<string, unknown>;
  summaryEn: string;
  summaryAr: string;
};

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------
export async function writeAuditLog(params: WriteAuditParams): Promise<string> {
  const traceId = `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(params.payload))
    .digest("hex");

  await supabaseAdmin.from("ps_govern_audit_log").insert({
    trace_id: traceId,
    account_id: params.accountId,
    licensee_id: params.licenseeId,
    ingest_event_id: params.ingestEventId ?? null,
    dispatch_id: params.dispatchId ?? null,
    merchant_id: params.merchantId,
    sku: params.sku,
    region: params.region,
    source_platform: params.sourcePlatform ?? null,
    target_channel: params.targetChannel ?? null,
    event_type: params.eventType,
    summary_en: params.summaryEn,
    summary_ar: params.summaryAr,
    data_route: params.dataRoute ?? params.region,
    pdpl_compliant: params.pdplCompliant ?? true,
    payload_hash: payloadHash,
    payload_snapshot: params.payload as Json,
  });

  return traceId;
}

// ---------------------------------------------------------------------------
// Summary builders — deterministic EN + AR strings from structured data
// ---------------------------------------------------------------------------
export function ingestSummary(
  platform: string, sku: string, region: string,
  netMarginPct: number, floorPct: number, floorBreached: boolean,
): { en: string; ar: string } {
  const pct = (netMarginPct * 100).toFixed(1);
  const floor = (floorPct * 100).toFixed(0);
  const platformAr = PLATFORM_AR[platform] ?? platform;
  const regionAr = REGION_AR[region] ?? region;

  const en = floorBreached
    ? `Ingest from ${platform} for SKU ${sku} in ${region}. Net margin ${pct}% is below the ${floor}% floor. Repricing triggered.`
    : `Ingest from ${platform} for SKU ${sku} in ${region}. Net margin ${pct}% is above the ${floor}% floor. No action required.`;

  const ar = floorBreached
    ? `تم استلام حدث من ${platformAr} للمنتج ${sku} في ${regionAr}. هامش الربح الصافي ${pct}٪ أقل من الحد الأدنى ${floor}٪. تم بدء إعادة التسعير.`
    : `تم استلام حدث من ${platformAr} للمنتج ${sku} في ${regionAr}. هامش الربح الصافي ${pct}٪ فوق الحد الأدنى ${floor}٪. لا يلزم اتخاذ أي إجراء.`;

  return { en, ar };
}

export function dispatchSummary(
  channel: string, sku: string,
  oldPrice: number, newPrice: number, currency: string,
  success: boolean, durationMs?: number,
): { en: string; ar: string } {
  const channelAr = CHANNEL_AR[channel] ?? channel;
  const deltaPct = oldPrice > 0 ? (((newPrice - oldPrice) / oldPrice) * 100).toFixed(1) : "0.0";
  const sign = parseFloat(deltaPct) >= 0 ? "+" : "";

  const en = success
    ? `Price updated on ${channel} for SKU ${sku}: ${oldPrice} → ${newPrice} ${currency} (${sign}${deltaPct}%). Completed in ${durationMs ?? 0}ms.`
    : `Dispatch to ${channel} failed for SKU ${sku}. Previous price ${oldPrice} ${currency} retained.`;

  const ar = success
    ? `تم تحديث السعر على ${channelAr} للمنتج ${sku}: ${oldPrice} ← ${newPrice} ${currency} (${sign}${deltaPct}٪). اكتمل في ${durationMs ?? 0} مللي ثانية.`
    : `فشل الإرسال إلى ${channelAr} للمنتج ${sku}. تم الاحتفاظ بالسعر السابق ${oldPrice} ${currency}.`;

  return { en, ar };
}

export function channelConnectSummary(
  platform: string, merchantId: string, status: string,
): { en: string; ar: string } {
  const platformAr = PLATFORM_AR[platform] ?? platform;
  const ok = status === "connected";

  const en = ok
    ? `Channel ${platform} successfully connected for merchant ${merchantId}.`
    : `Channel ${platform} connection failed for merchant ${merchantId}: ${status}.`;

  const ar = ok
    ? `تم توصيل قناة ${platformAr} بنجاح للتاجر ${merchantId}.`
    : `فشل توصيل قناة ${platformAr} للتاجر ${merchantId}: ${status}.`;

  return { en, ar };
}
