import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardDemoExperience } from "@/components/dashboard-v2/DashboardDemoExperience";
import { useDashboardV2Context } from "@/components/dashboard-v2/useDashboardV2Context";

function DashboardRoot() {
  const context = useDashboardV2Context();

  if (context?.demo_mode) {
    return <DashboardDemoExperience />;
  }

  return <Outlet />;
}

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ps_connected")) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: DashboardRoot,
});
