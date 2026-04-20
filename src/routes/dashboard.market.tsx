import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MarketMetrics } from "@/components/dashboard/market/MarketMetrics";
import { CategoryPerformance } from "@/components/dashboard/market/CategoryPerformance";
import { AssortmentGaps } from "@/components/dashboard/market/AssortmentGaps";
import { CrossBorderRadar } from "@/components/dashboard/market/CrossBorderRadar";
import { TrendingProducts } from "@/components/dashboard/market/TrendingProducts";

export const Route = createFileRoute("/dashboard/market")({
  head: () => ({ meta: [{ title: "Market | PrizeSkout" }] }),
  component: MarketPage,
});

function MarketPage() {
  return (
    <DashboardLayout title="Market">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MarketMetrics />
        <CategoryPerformance />
        <AssortmentGaps />
        <CrossBorderRadar />
        <TrendingProducts />
      </div>
    </DashboardLayout>
  );
}
