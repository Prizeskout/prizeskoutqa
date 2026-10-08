import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/v2_/priority-centre")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/priority-centre", replace: true }); },
});
