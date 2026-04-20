import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

export const Route = createFileRoute("/dashboard/benchmarks")({
  head: () => ({ meta: [{ title: "Benchmarks — PrizeSkout" }] }),
  component: () => (
    <DashboardLayout title="Benchmarks">
      <PlaceholderPage title="Benchmarks" />
    </DashboardLayout>
  ),
});
