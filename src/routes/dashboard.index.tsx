import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Overview">
      <PlaceholderPage title="Overview" />
    </DashboardLayout>
  ),
});
