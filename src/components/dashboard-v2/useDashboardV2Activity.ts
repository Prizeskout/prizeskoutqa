import { useEffect, useState } from "react";

export type DashboardV2Activity = {
  audit: { state: string; rows: Array<Record<string, unknown>>; blocker?: string };
  channels: { state: string; rows: Array<Record<string, unknown>>; blocker?: string };
  costs: { state: string; rows: Array<Record<string, unknown>>; blocker?: string };
};

export function useDashboardV2Activity() {
  const [value, setValue] = useState<{ loading: boolean; data: DashboardV2Activity | null; error: string | null }>({ loading: true, data: null, error: null });
  useEffect(() => {
    const merchantId = localStorage.getItem("ps_merchant_id")?.trim() ?? "";
    const accessCode = localStorage.getItem("ps_access_code")?.trim() ?? "";
    if (!merchantId || !accessCode) { setValue({ loading: false, data: null, error: "A verified merchant session is required." }); return; }
    const controller = new AbortController();
    void fetch("/api/dashboard/v2/activity", { headers: { "X-Merchant-Id": merchantId, "X-Access-Code": accessCode }, cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Workspace evidence could not be loaded."); setValue({ loading: false, data: body, error: null }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setValue({ loading: false, data: null, error: error instanceof Error ? error.message : "Workspace evidence could not be loaded." }); });
    return () => controller.abort();
  }, []);
  return value;
}
