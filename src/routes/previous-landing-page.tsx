import { createFileRoute } from "@tanstack/react-router";
import { ImmersiveEconomicTwinLanding } from "@/components/landing/ImmersiveEconomicTwinLanding";

export const Route = createFileRoute("/previous-landing-page")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | Previous landing page" },
      {
        name: "description",
        content: "Archived PrizeSkout landing page retained for internal review.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImmersiveEconomicTwinLanding,
});
