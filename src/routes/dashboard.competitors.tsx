import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/competitors")({
  head: () => ({ meta: [{ title: "Competitors — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Competitors">
      <PlaceholderPage title="Competitors" />
    </DashboardLayout>
  ),
});
