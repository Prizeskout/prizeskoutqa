// Legacy /api-reference URL redirects to the new /docs reference.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api-reference")({
  beforeLoad: () => {
    throw redirect({ to: "/docs" });
  },
  component: () => null,
});
