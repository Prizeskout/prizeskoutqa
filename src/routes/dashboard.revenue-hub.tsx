import { createFileRoute } from "@tanstack/react-router";
import { PrizeSkoutDashboard } from "@/components/dashboard/PrizeSkoutDashboard";

export const Route = createFileRoute("/dashboard/revenue-hub")({
  component: PrizeSkoutDashboard,
});
