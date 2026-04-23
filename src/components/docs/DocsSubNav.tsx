// Sub-navigation bar shown beneath the main marketing header on docs pages.
// API Reference / Guides / Changelog tabs.

import { Link, useLocation } from "@tanstack/react-router";

const TABS = [
  { label: "API Reference", to: "/docs" as const },
  { label: "Guides", to: "/docs/guides" as const },
  { label: "Changelog", to: "/docs/changelog" as const },
];

export function DocsSubNav() {
  const loc = useLocation();
  const path = loc.pathname;
  const isActive = (to: string) => {
    if (to === "/docs/changelog") return path === "/docs/changelog";
    if (to === "/docs/guides") return path.startsWith("/docs/guides");
    if (to === "/docs") return path === "/docs" || (path.startsWith("/docs") && !path.startsWith("/docs/guides") && !path.startsWith("/docs/changelog"));
    return path === to;
  };

  return (
    <div
      style={{
        background: "#FFF",
        borderBottom: "1px solid #E8E8E5",
        padding: "0 20px",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", gap: 4, maxWidth: 1600, margin: "0 auto" }}>
        {TABS.map((t) => {
          const active = isActive(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              style={{
                padding: "14px 14px 12px",
                fontSize: 13.5,
                fontWeight: 500,
                color: active ? "#1A1A18" : "#8A8A8A",
                textDecoration: "none",
                borderBottom: active ? "2px solid #EA580C" : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
