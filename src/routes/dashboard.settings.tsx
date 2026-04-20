import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — PrizeSkout" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <DashboardLayout title="Settings">
      <SettingsTabs />
    </DashboardLayout>
  );
}
