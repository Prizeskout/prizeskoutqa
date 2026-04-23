import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings | PrizeSkout" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <DashboardLayout
      title="Settings"
      subtitle="Configure your account, team, locations, integrations, and how the AI models your business."
      helpItems={[
        "Use the tabs to navigate between Account, Team, Locations, Integrations, and ROI model.",
        "Branding controls how the app and exported PDFs look for your team.",
        "ROI model parameters drive the Promotions simulator — keep them current.",
      ]}
    >
      <SettingsTabs />
    </DashboardLayout>
  );
}
