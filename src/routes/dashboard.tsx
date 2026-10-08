import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("ps_connected")) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: () => <Outlet />,
});
