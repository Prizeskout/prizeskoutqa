import { createFileRoute } from "@tanstack/react-router";
import { ImmersiveEconomicTwinLanding } from "@/components/landing/ImmersiveEconomicTwinLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | Deep-Tech Commerce Infrastructure" },
      {
        name: "description",
        content:
          "Reconstruct the real unit economics of every order, predict the profit impact of commercial actions, and defend your margin automatically.",
      },
      { property: "og:title", content: "PrizeSkout | Deep-Tech Commerce Infrastructure" },
      {
        property: "og:description",
        content: "Reported profit is a story. True profit is a system.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://prizeskout.qa/" },
      { property: "og:site_name", content: "PrizeSkout" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PrizeSkout | Deep-Tech Commerce Infrastructure" },
      {
        name: "twitter:description",
        content: "Understand true profit and protect margins across every connected commerce channel.",
      },
      { name: "prizeskout-release", content: "economic-twin-route-only-2026-08-24" },
    ],
  }),
  component: ImmersiveEconomicTwinLanding,
});
