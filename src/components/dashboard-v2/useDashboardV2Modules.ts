import { useEffect, useState } from "react";
import type { DashboardV2OrderModule, DashboardV2PromotionModule } from "@/server/core/dashboard-v2-modules";
import type { DashboardV2PlatformDemoPayload } from "@/server/core/dashboard-v2-platform-demo";
import { dashboardV2PeriodDays, useDashboardV2Period } from "./useDashboardV2Period";

export function useDashboardV2Modules() {
  const period = useDashboardV2Period();
  const [value, setValue] = useState<{ loading: boolean; order: DashboardV2OrderModule | null; promotions: DashboardV2PromotionModule | null; platformDemo: DashboardV2PlatformDemoPayload | null }>({ loading: true, order: null, promotions: null, platformDemo: null });
  useEffect(() => { const merchantId = localStorage.getItem("ps_merchant_id")?.trim() ?? "", accessCode = localStorage.getItem("ps_access_code")?.trim() ?? ""; if (!merchantId || !accessCode) { setValue({ loading: false, order: null, promotions: null, platformDemo: null }); return; } const controller = new AbortController(); void fetch(`/api/dashboard/v2/modules?days=${dashboardV2PeriodDays(period)}`, { headers: { "X-Merchant-Id": merchantId, "X-Access-Code": accessCode }, cache: "no-store", signal: controller.signal }).then(async (response) => { const body = await response.json() as { order_automation?: DashboardV2OrderModule; promotions?: DashboardV2PromotionModule; platform_demo?: DashboardV2PlatformDemoPayload }; if (!response.ok) throw new Error(); setValue({ loading: false, order: body.order_automation ?? null, promotions: body.promotions ?? null, platformDemo: body.platform_demo ?? null }); }).catch(() => { if (!controller.signal.aborted) setValue({ loading: false, order: null, promotions: null, platformDemo: null }); }); return () => controller.abort(); }, [period]);
  return value;
}
