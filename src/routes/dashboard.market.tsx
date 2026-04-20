import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/market")({
  head: () => ({ meta: [{ title: "Market — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Market">
      <PlaceholderPage title="Market" />
    </DashboardLayout>
  ),
});
