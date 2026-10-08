import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2PriorityCentre } from "@/components/dashboard-v2/DashboardV2PriorityCentre";

export const Route = createFileRoute("/dashboard/priority-centre")({
  head: () => ({ meta: [{ title: "Priority Centre | PrizeSkout" }] }),
  component: DashboardV2PriorityCentre,
});
