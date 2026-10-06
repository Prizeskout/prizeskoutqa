import { useEffect, useState } from "react";
import type { DashboardV2Summary } from "@/server/core/dashboard-v2-summary";

export type DashboardV2LoadState =
  | { phase: "loading"; summary: null; message: null }
  | { phase: "ready"; summary: DashboardV2Summary; message: null }
  | { phase: "unavailable"; summary: null; message: string };

export function useDashboardV2Summary(): DashboardV2LoadState {
  const [load, setLoad] = useState<DashboardV2LoadState>({ phase: "loading", summary: null, message: null });

  useEffect(() => {
    const merchantId = localStorage.getItem("ps_merchant_id")?.trim() ?? "";
    const accessCode = localStorage.getItem("ps_access_code")?.trim() ?? "";
    if (!merchantId || !accessCode) {
      setLoad({ phase: "unavailable", summary: null, message: "A verified merchant session is required before financial evidence can be loaded." });
      return;
    }
    const controller = new AbortController();
    void fetch("/api/dashboard/v2/summary?days=30", {
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
  }, []);

  return load;
}
