import type { ReactNode } from "react";
import { MarginSidebar } from "./MarginSidebar";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function MarginLayout({ title, subtitle, action, children }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F7FAF8" }}>
      <MarginSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Page header */}
        <div
          style={{
            borderBottom: "1px solid #E2EDE8",
            backgroundColor: "#FFFFFF",
            padding: "18px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#0F1A15",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 13, color: "#5A7A68", margin: "3px 0 0", lineHeight: 1.4 }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
