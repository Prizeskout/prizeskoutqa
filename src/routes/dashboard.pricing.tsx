import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The standalone repricing dashboard has been retired. Keep this route only
 * as a permanent guard for bookmarks, notifications, and stale external links.
 * It intentionally imports and renders none of the retired dashboard code.
 */
export const Route = createFileRoute("/dashboard/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/revenue-hub", replace: true });
  },
});
