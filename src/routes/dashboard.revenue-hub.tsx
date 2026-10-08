import { createFileRoute, redirect } from "@tanstack/react-router";

type RevenueHubSearch = Record<string, unknown> & { workspace?: string };

export const Route = createFileRoute("/dashboard/revenue-hub")({
  validateSearch: (search: Record<string, unknown>): RevenueHubSearch => ({
    ...search,
    workspace: typeof search.workspace === "string" ? search.workspace : undefined,
  }),
  beforeLoad: ({ search }) => {
    switch (search.workspace) {
      case "catalog":
        throw redirect({ to: "/dashboard/$module", params: { module: "menu-intelligence" }, replace: true });
      case "manager":
        throw redirect({ to: "/dashboard/$module", params: { module: "store-manager" }, replace: true });
      case "promotions":
        throw redirect({ to: "/dashboard/promotions", replace: true });
      case "rules":
      case "settings":
        throw redirect({ to: "/dashboard/$module", params: { module: "settings" }, replace: true });
      case "vault":
        throw redirect({ to: "/dashboard/$module", params: { module: "integrations" }, replace: true });
      case "history":
        throw redirect({ to: "/dashboard/$module", params: { module: "audit-log" }, replace: true });
      case "today":
        throw redirect({ to: "/dashboard/priority-centre", replace: true });
      default:
        throw redirect({ to: "/dashboard", replace: true });
    }
  },
});
