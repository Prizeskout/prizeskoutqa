const DEMO_SCREEN_BY_PATH: Record<string, string> = {
  "/dashboard/order-automation": "automation",
  "/dashboard/orders": "automation",
  "/dashboard/promotions": "promotions",
  "/dashboard/profit-intelligence": "leakage",
  "/dashboard/menu-intelligence": "menu",
  "/dashboard/channels": "channels",
  "/dashboard/settlements": "settlements",
  "/dashboard/integrations": "integrations",
};

export function DashboardDemoExperience() {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const screen =
    typeof window === "undefined" ? undefined : DEMO_SCREEN_BY_PATH[window.location.pathname];
  const source = `/prizeskout-demo/index.html${screen ? `#${screen}` : ""}`;
  const scale = Math.min(1, viewportWidth / 1280);

  return (
    <div
      data-testid="dashboard-demo-experience"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#0b0b0a",
      }}
    >
      <iframe
        src={source}
        title="PrizeSkout interactive restaurant dashboard demo"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: scale < 1 ? `${100 / scale}%` : "100%",
          height: scale < 1 ? `${100 / scale}%` : "100%",
          border: 0,
          background: "#0b0b0a",
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
import { useEffect, useState } from "react";
