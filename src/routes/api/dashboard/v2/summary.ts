import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMerchantAccess } from "@/server/core/byok-connect";
import { summarizeDashboardV2Evidence } from "@/server/core/dashboard-v2-summary";
import { getDashboardStats } from "@/server/core/dashboard-stats";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
});

export const Route = createFileRoute("/api/dashboard/v2/summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const merchantId = (request.headers.get("x-merchant-id") ?? "").trim();
        const accessCode = request.headers.get("x-access-code") ?? "";
        if (!await verifyMerchantAccess(merchantId, accessCode)) return json({ error: "Unauthorized" }, 403);

        const requestedDays = Number(new URL(request.url).searchParams.get("days") ?? 30);
        const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(366, Math.floor(requestedDays))) : 30;
        const db = supabaseAdmin as any;
        const previousEnd = new Date(); previousEnd.setUTCDate(previousEnd.getUTCDate() - days);
        const [eventsResult, headsResult, agreementsResult, findingsResult, recoveryCasesResult, statsResult, previousStatsResult] = await Promise.all([
          db.from("ps_normalized_commerce_events")
            .select("id,event_kind,evidence_item_id,source_kind,source_provider,occurred_at,created_at,currency,evidence_strength")
            .eq("account_id", merchantId).eq("merchant_id", merchantId)
            .order("occurred_at", { ascending: false }).limit(10000),
          db.from("ps_normalized_event_heads").select("current_event_id").eq("account_id", merchantId).limit(10000),
          db.from("ps_evidence_agreement_matches")
            .select("id,evidence_item_id,contract_term_id,state,platform,evidence_date_start,evidence_date_end,currency,matcher_version,created_at")
            .eq("account_id", merchantId).eq("merchant_id", merchantId)
            .order("created_at", { ascending: false }).limit(2000),
          db.from("ps_reconciliation_findings")
            .select("id,run_id,evidence_item_id,contract_term_id,conclusion,recoverability,order_external_id,settlement_reference,currency,expected_amount,reported_amount,variance,evidence_strength,explanation,blockers,created_at")
            .eq("account_id", merchantId).order("created_at", { ascending: false }).limit(100),
          db.from("ps_recovery_cases")
            .select("id,reconciliation_finding_id,status,claims_ready_amount,exception_amount,currency,created_at")
            .eq("account_id", merchantId).order("created_at", { ascending: false }).limit(100),
          getDashboardStats(merchantId, { days }).then((value) => ({ data: value, error: null })).catch((error: unknown) => ({ data: null, error })),
          getDashboardStats(merchantId, { days, endDate: previousEnd }).then((value) => ({ data: value, error: null })).catch((error: unknown) => ({ data: null, error })),
        ]);

        const summary = summarizeDashboardV2Evidence({
          accountId: merchantId,
          merchantId,
          days,
          events: eventsResult.data ?? [],
          currentEventIds: (headsResult.data ?? []).map((row: any) => String(row.current_event_id)),
          agreementMatches: agreementsResult.data ?? [],
          findings: findingsResult.data ?? [],
          recoveryCases: recoveryCasesResult.data ?? [],
          economicTwin: statsResult.data?.economic_twin ?? null,
          previousEconomicTwin: previousStatsResult.data?.economic_twin ?? null,
          availability: {
            events: !eventsResult.error && !headsResult.error,
            agreements: !agreementsResult.error,
            findings: !findingsResult.error,
            recoveryCases: !recoveryCasesResult.error,
            economicTwin: !statsResult.error && Boolean(statsResult.data?.economic_twin),
          },
        });

        return json({ ok: true, summary });
      },
    },
  },
});
