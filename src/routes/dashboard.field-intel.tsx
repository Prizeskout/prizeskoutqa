import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/field-intel")({
  head: () => ({ meta: [{ title: "Field Intel — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Field Intel">
      <PlaceholderPage title="Field Intel" />
    </DashboardLayout>
  ),
});
