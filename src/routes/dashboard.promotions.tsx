import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PromotionsMetrics } from "@/components/dashboard/promotions/PromotionsMetrics";
import { PromotionCalendar } from "@/components/dashboard/promotions/PromotionCalendar";
import { ROISimulator } from "@/components/dashboard/promotions/ROISimulator";
import { PastCampaigns } from "@/components/dashboard/promotions/PastCampaigns";
import { TimingInsight } from "@/components/dashboard/promotions/TimingInsight";

export const Route = createFileRoute("/dashboard/promotions")({
  head: () => ({ meta: [{ title: "Promotions | PrizeSkout" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  return (
    <DashboardLayout title="Promotions">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PromotionsMetrics />
        <PromotionCalendar />
        <ROISimulator />
        <PastCampaigns />
        <TimingInsight />
      </div>
    </DashboardLayout>
  );
}
