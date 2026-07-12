import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({ meta: [{ title: "Admin Console | PrizeSkout" }] }),
  component: AdminShell,
});

const TABS = [
  { to: "/dashboard/admin",             label: "Overview",     exact: true  },
  { to: "/dashboard/admin/live-access", label: "Live Access",  exact: false },
  { to: "/dashboard/admin/channels",    label: "Channels",     exact: false },
  { to: "/dashboard/admin/codes",       label: "Access Codes", exact: false },
  { to: "/dashboard/admin/audit",       label: "Audit Log",    exact: false },
] as const;

function AdminShell() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return (
      <DashboardLayout title="Admin Console">
        <div style={{ padding: 32, color: "#6B6B6B", fontSize: 13 }}>Checking access…</div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Admin Console">
        <div
          style={{
            padding: 20,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            color: "#991B1B",
            fontSize: 13,
          }}
        >
          Admin role required. Contact a PrizeSkout super-admin to grant access.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Admin Console"
      subtitle="Manage merchants, channels, access codes, and audit events across all of PrizeSkout."
      helpItems={[
        "Overview shows platform-wide counts and recent govern log activity.",
        "Live Access is the approval queue for licensee applications.",
        "Channels shows every aggregator connection across all merchants — no credentials displayed.",
        "Access Codes manages PSK-* onboarding codes. Deleting a code invalidates it immediately.",
        "Audit Log shows every price event written to the govern log in reverse chronological order.",
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
                transition: "color 0.12s, border-color 0.12s",
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
