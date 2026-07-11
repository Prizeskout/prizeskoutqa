import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/integration-vault")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/revenue-hub" }); },
  component: () => null,
});
