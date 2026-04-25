import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/console")({
  head: () => ({ meta: [{ title: "Licensee Console | PrizeSkout" }] }),
  component: ConsoleLayout,
});

const TABS = [
  { to: "/dashboard/console", label: "Overview", exact: true },
  { to: "/dashboard/console/tenants", label: "Tenants", exact: false },
  { to: "/dashboard/console/team", label: "Team", exact: false },
] as const;

function ConsoleLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <DashboardLayout
      title="Licensee Console"
      subtitle="Manage your organization, tenants, and team. This is the control plane behind the API keys you issue."
      helpItems={[
        "Overview shows your licensee summary, accounts, and recent API activity.",
        "Tenants are the operating units (e.g. 'Talabat Qatar') under your licensee. Each account has its own catalog and decisions.",
        "Team controls who can read or write to this licensee. Roles: viewer, developer, admin, owner.",
      ]}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #E5E2DB",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => {
          const isActive = t.exact
            ? pathname === t.to
            : pathname === t.to || pathname.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              style={{
                padding: "12px 20px",
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "#1A1A18" : "#9A9A9A",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${isActive ? "#EA580C" : "transparent"}`,
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </DashboardLayout>
  );
}
