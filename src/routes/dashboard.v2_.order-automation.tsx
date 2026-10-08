import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/v2_/order-automation")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/order-automation", replace: true }); },
});
