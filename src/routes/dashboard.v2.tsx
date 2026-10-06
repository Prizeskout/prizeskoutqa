import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardV2Overview } from "@/components/dashboard-v2/DashboardV2Overview";

export const Route = createFileRoute("/dashboard/v2")({
  beforeLoad: () => {
    const enabled = import.meta.env.DEV || import.meta.env.VITE_DASHBOARD_V2_ENABLED === "true";
    if (!enabled) throw redirect({ to: "/dashboard/revenue-hub" });
  },
  head: () => ({ meta: [{ title: "Dashboard V2 Preview | PrizeSkout" }] }),
  component: DashboardV2Overview,
});
