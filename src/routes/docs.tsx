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
          "Live competitor prices, pricing recommendations, promo ROI, field intel, and webhooks. Full REST API reference with cURL and JavaScript examples.",
      },
      { property: "og:title", content: "API Reference | PrizeSkout" },
      {
        property: "og:description",
        content: "REST API reference for PrizeSkout. Try every endpoint live against test mode.",
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
