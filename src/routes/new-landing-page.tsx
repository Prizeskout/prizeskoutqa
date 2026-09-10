import { createFileRoute } from "@tanstack/react-router";
import { NewLandingPage } from "@/components/landing/NewLandingPage";

export const Route = createFileRoute("/new-landing-page")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | Landing page preview" },
      {
        name: "description",
        content:
          "Reconstruct the real unit economics of every order, predict the profit impact of commercial actions, and defend your margin automatically.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewLandingPage,
});
