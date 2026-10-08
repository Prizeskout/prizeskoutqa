import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/v2_/promotions")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/promotions", replace: true }); },
});
