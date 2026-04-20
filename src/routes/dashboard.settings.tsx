import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Settings">
      <PlaceholderPage title="Settings" />
    </DashboardLayout>
  ),
});
