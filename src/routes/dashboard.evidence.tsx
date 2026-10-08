import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Evidence now lives inside the unified merchant dashboard. Keep this route as
 * a compatibility redirect for bookmarks and notifications.
 */
export const Route = createFileRoute("/dashboard/evidence")({
  beforeLoad: () => {
    throw redirect({
      to: "/dashboard/$module",
      params: { module: "audit-log" },
      replace: true,
    });
  },
});
