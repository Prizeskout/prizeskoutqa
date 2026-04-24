import { createFileRoute } from "@tanstack/react-router";
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
          "Four pillars: Pricing Intelligence, Commerce Events, Multi-Tenant Ops, and Network Moat. Full REST reference with cURL and JavaScript examples.",
      },
      { property: "og:title", content: "API Reference | PrizeSkout" },
      {
        property: "og:description",
        content:
          "The shadow infrastructure for commerce — organised around four pillars. Try every endpoint live against test mode.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <ApiReference />
    </MarketingShell>
  );
}
