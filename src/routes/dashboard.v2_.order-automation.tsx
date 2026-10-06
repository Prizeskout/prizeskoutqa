import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2OrderAutomation } from "@/components/dashboard-v2/DashboardV2OrderAutomation";

export const Route = createFileRoute("/dashboard/v2_/order-automation")({
  head: () => ({ meta: [{ title: "Order Automation | PrizeSkout" }] }),
  component: DashboardV2OrderAutomation,
});
