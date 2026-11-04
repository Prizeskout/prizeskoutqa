import { useEffect, useState } from "react";
import type { DashboardV2Context } from "@/server/core/dashboard-v2-context";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantCredentials } from "@/lib/merchant-session";

export function useDashboardV2Context(): DashboardV2Context | null {
  const [context, setContext] = useState<DashboardV2Context | null>(null);
  const { credentials, resolving } = useMerchantCredentials();
  useEffect(() => {
    const merchantId = credentials.merchant_id, accessCode = credentials.access_code;
    if (resolving || !merchantId || !accessCode) return;
    const controller = new AbortController();
    void supabase.auth.getSession().then(({ data }) => fetch("/api/dashboard/v2/context", { headers: { "X-Merchant-Id": merchantId, "X-Access-Code": accessCode, ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, cache: "no-store", signal: controller.signal }))
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { context?: DashboardV2Context };
        if (response.ok && body.context) setContext(body.context);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [credentials.access_code, credentials.merchant_id, resolving]);
  return context;
}
