import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/v2_/$module")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/dashboard/${params.module}`, replace: true });
  },
});
