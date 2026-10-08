import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/v2")({
  beforeLoad: () => { throw redirect({ to: "/dashboard", replace: true }); },
});
