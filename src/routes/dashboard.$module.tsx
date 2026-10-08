import { createFileRoute, notFound } from "@tanstack/react-router";
import { dashboardV2WorkspaceIds, type DashboardV2WorkspaceId } from "@/components/dashboard-v2/DashboardV2Workspace";
import { DashboardV2ProductWorkspace } from "@/components/dashboard-v2/DashboardV2ProductWorkspace";

export const Route = createFileRoute("/dashboard/$module")({
  beforeLoad: ({ params }) => {
    if (!dashboardV2WorkspaceIds.includes(params.module as DashboardV2WorkspaceId)) throw notFound();
  },
  head: ({ params }) => ({ meta: [{ title: `${params.module.replaceAll("-", " ")} | PrizeSkout` }] }),
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  const { module } = Route.useParams();
  return <DashboardV2ProductWorkspace workspace={module as DashboardV2WorkspaceId} />;
}
