import { useEffect, useState } from "react";
import type { DashboardV2Summary } from "@/server/core/dashboard-v2-summary";
import { dashboardV2PeriodDays, useDashboardV2Period } from "./useDashboardV2Period";
import { useMerchantCredentials } from "@/lib/merchant-session";

export type DashboardV2LoadState =
  | { phase: "loading"; summary: null; message: null }
  | { phase: "ready"; summary: DashboardV2Summary; message: null }
  | { phase: "unavailable"; summary: null; message: string };

export function useDashboardV2Summary(): DashboardV2LoadState {
  const period = useDashboardV2Period();
  const { credentials, resolving } = useMerchantCredentials();
  const [load, setLoad] = useState<DashboardV2LoadState>({ phase: "loading", summary: null, message: null });

  useEffect(() => {
    const merchantId = credentials.merchant_id, accessCode = credentials.access_code;
    if (resolving) { setLoad({ phase: "loading", summary: null, message: null }); return; }
    if (!merchantId || !accessCode) {
      setLoad({ phase: "unavailable", summary: null, message: "A verified merchant session is required before financial evidence can be loaded." });
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/dashboard/v2/summary?days=${dashboardV2PeriodDays(period)}`, {
      headers: { "X-Merchant-Id": merchantId, "X-Access-Code": accessCode },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { summary?: DashboardV2Summary; error?: string };
        if (!response.ok || !body.summary) throw new Error(body.error || "Financial evidence could not be loaded.");
        setLoad({ phase: "ready", summary: body.summary, message: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({ phase: "unavailable", summary: null, message: error instanceof Error ? error.message : "Financial evidence could not be loaded." });
      });
    return () => controller.abort();
  }, [credentials.access_code, credentials.merchant_id, period, resolving]);

  return load;
}
