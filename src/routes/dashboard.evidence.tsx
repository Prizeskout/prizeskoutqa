import { createFileRoute } from "@tanstack/react-router";
import { DashboardV2ProductWorkspace } from "@/components/dashboard-v2/DashboardV2ProductWorkspace";

export const Route = createFileRoute("/dashboard/evidence")({
  head: () => ({ meta: [{ title: "Evidence Inbox | PrizeSkout" }] }),
  component: EvidenceRoute,
});

function EvidenceRoute() {
  return <DashboardV2ProductWorkspace workspace="evidence" />;
}
