import { useState, type ReactNode } from "react";
import { AccountTab } from "./AccountTab";
import { CompetitorsTab } from "./CompetitorsTab";
import { LocationsTab } from "./LocationsTab";
import { NotificationsTab } from "./NotificationsTab";
import { IntegrationsTab } from "./IntegrationsTab";
import { TeamTab } from "./TeamTab";

const TABS = [
  "Account",
  "Competitors",
  "Locations",
  "Notifications",
  "Integrations",
  "Team",
] as const;

type Tab = (typeof TABS)[number];

const RENDERERS: Record<Tab, () => ReactNode> = {
  Account: () => <AccountTab />,
  Competitors: () => <CompetitorsTab />,
  Locations: () => <LocationsTab />,
  Notifications: () => <NotificationsTab />,
  Integrations: () => <IntegrationsTab />,
  Team: () => <TeamTab />,
};

export function SettingsTabs() {
  const [active, setActive] = useState<Tab>("Account");

  return (
    <div>
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
          const isActive = t === active;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "#1A1A18";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "#9A9A9A";
              }}
              style={{
                padding: "12px 20px",
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "#1A1A18" : "#9A9A9A",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${isActive ? "#EA580C" : "transparent"}`,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
      {RENDERERS[active]()}
    </div>
  );
}
