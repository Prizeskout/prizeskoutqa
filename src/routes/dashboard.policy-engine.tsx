import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/policy-engine")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/revenue-hub" }); },
  component: () => null,
});
