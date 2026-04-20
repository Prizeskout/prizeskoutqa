import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/pricing")({
  head: () => ({ meta: [{ title: "Pricing — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Pricing">
      <PlaceholderPage title="Pricing" />
    </DashboardLayout>
  ),
});
