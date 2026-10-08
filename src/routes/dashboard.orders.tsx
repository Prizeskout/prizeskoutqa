import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2OrderAutomation } from "@/components/dashboard-v2/DashboardV2OrderAutomation";

export const Route = createFileRoute("/dashboard/orders")({
  head: () => ({ meta: [{ title: "Orders | PrizeSkout" }] }),
  component: () => <DashboardV2OrderAutomation activePage="orders" />,
});
