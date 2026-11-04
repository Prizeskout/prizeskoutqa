import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMerchantCredentials } from "@/lib/merchant-session";

export const Route = createFileRoute("/dashboard")({
  component: DashboardSessionGate,
});

function DashboardSessionGate() {
  const navigate = useNavigate();
  const { credentials, resolving } = useMerchantCredentials();
  useEffect(() => {
    if (!resolving && (!credentials.merchant_id || !credentials.access_code)) {
      void navigate({ to: "/access", replace: true });
    }
  }, [credentials.access_code, credentials.merchant_id, navigate, resolving]);
  if (resolving || !credentials.merchant_id || !credentials.access_code) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Inter, system-ui, sans-serif", color: "#667085" }} role="status">Restoring your PrizeSkout workspace…</main>;
  }
  return <Outlet />;
}
