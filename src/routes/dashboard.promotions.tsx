import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2Promotions } from "@/components/dashboard-v2/DashboardV2Promotions";

export const Route = createFileRoute("/dashboard/promotions")({
  head: () => ({ meta: [{ title: "Promotions & Discounts | PrizeSkout" }] }),
  component: DashboardV2Promotions,
});
