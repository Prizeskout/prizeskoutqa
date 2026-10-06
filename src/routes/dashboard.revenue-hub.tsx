import { createFileRoute } from "@tanstack/react-router";
import { PrizeSkoutDashboard } from "@/components/dashboard/PrizeSkoutDashboard";
import { DashboardV2Overview } from "@/components/dashboard-v2/DashboardV2Overview";

type RevenueHubSearch = Record<string, unknown> & { workspace?: string };

function RevenueHubEntry() {
  const { workspace } = Route.useSearch();
  return workspace ? <PrizeSkoutDashboard /> : <DashboardV2Overview />;
}

export const Route = createFileRoute("/dashboard/revenue-hub")({
  validateSearch: (search: Record<string, unknown>): RevenueHubSearch => ({
    ...search,
    workspace: typeof search.workspace === "string" ? search.workspace : undefined,
  }),
  head: () => ({ meta: [{ title: "Executive Overview | PrizeSkout" }] }),
  component: RevenueHubEntry,
});
