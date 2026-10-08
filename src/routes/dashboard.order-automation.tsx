import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2OrderAutomation } from "@/components/dashboard-v2/DashboardV2OrderAutomation";

export const Route = createFileRoute("/dashboard/order-automation")({
  head: () => ({ meta: [{ title: "Order Automation | PrizeSkout" }] }),
  component: DashboardV2OrderAutomation,
});
