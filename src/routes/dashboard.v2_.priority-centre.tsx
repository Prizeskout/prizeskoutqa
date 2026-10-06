import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardV2PriorityCentre } from "@/components/dashboard-v2/DashboardV2PriorityCentre";

export const Route = createFileRoute("/dashboard/v2_/priority-centre")({
  beforeLoad: () => {
    const enabled = import.meta.env.DEV || import.meta.env.VITE_DASHBOARD_V2_ENABLED === "true";
    if (!enabled) throw redirect({ to: "/dashboard/revenue-hub" });
  },
  head: () => ({ meta: [{ title: "Priority Centre Preview | PrizeSkout" }] }),
  component: DashboardV2PriorityCentre,
});
