import { useEffect, useState } from "react";
import type { DashboardV2Context } from "@/server/core/dashboard-v2-context";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardV2Context(): DashboardV2Context | null {
  const [context, setContext] = useState<DashboardV2Context | null>(null);
  useEffect(() => {
    const merchantId = localStorage.getItem("ps_merchant_id")?.trim() ?? "";
    const accessCode = localStorage.getItem("ps_access_code")?.trim() ?? "";
    if (!merchantId || !accessCode) return;
    const controller = new AbortController();
    void supabase.auth.getSession().then(({ data }) => fetch("/api/dashboard/v2/context", { headers: { "X-Merchant-Id": merchantId, "X-Access-Code": accessCode, ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, cache: "no-store", signal: controller.signal }))
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { context?: DashboardV2Context };
        if (response.ok && body.context) setContext(body.context);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return context;
}
