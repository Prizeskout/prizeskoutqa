import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PricingMetrics } from "@/components/dashboard/pricing/PricingMetrics";
import { ModelStatusBanner } from "@/components/dashboard/pricing/ModelStatusBanner";
import { RecommendationsList } from "@/components/dashboard/pricing/RecommendationsList";
import { PricingRules } from "@/components/dashboard/pricing/PricingRules";
import { ModelLearningCallout } from "@/components/dashboard/pricing/ModelLearningCallout";

export const Route = createFileRoute("/dashboard/pricing")({
  head: () => ({ meta: [{ title: "Pricing — PrizeSkout" }] }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <DashboardLayout title="Pricing">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PricingMetrics />
        <ModelStatusBanner />
        <RecommendationsList />
        <PricingRules />
        <ModelLearningCallout />
      </div>
    </DashboardLayout>
  );
}
