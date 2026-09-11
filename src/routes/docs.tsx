import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";
import { ApiReference } from "@/components/docs/ApiReference";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "API Reference | PrizeSkout" },
      {
        name: "description",
        content:
          "PrizeSkout REST API reference for commerce ingestion, connectors, pricing, profitability, webhooks and operations. Includes request schemas, responses and runnable examples.",
      },
      { property: "og:title", content: "API Reference | PrizeSkout" },
      {
        property: "og:description",
        content:
          "Build a PrizeSkout integration with searchable endpoints, request schemas, responses and test-mode examples.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const location = useLocation();
  if (location.pathname !== "/docs") return <Outlet />;
  return (
    <MarketingShell>
      <DocsSubNav />
      <ApiReference />
    </MarketingShell>
  );
}
