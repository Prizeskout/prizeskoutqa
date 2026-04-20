import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/promotions")({
  head: () => ({ meta: [{ title: "Promotions — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Promotions">
      <PlaceholderPage title="Promotions" />
    </DashboardLayout>
  ),
});
