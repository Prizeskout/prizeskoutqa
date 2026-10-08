import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2Overview } from "@/components/dashboard-v2/DashboardV2Overview";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Executive Overview | PrizeSkout" }] }),
  component: DashboardV2Overview,
});
