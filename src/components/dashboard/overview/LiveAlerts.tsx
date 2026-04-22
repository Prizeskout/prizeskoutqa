import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { type OverviewAlert, formatRelativeTime } from "@/lib/overview-data";

// Map each alert type to the dashboard surface that owns the underlying data.
// Clicking an alert deep-links the user to that page so they can act on it.
const ALERT_ROUTE: Record<AlertType, string> = {
  price: "/dashboard/competitors",
  stock: "/dashboard/field-intel",
  promo: "/dashboard/competitors",
  pattern: "/dashboard/competitors",
  insight: "/dashboard/market",
};

type AlertType = "price" | "stock" | "promo" | "pattern" | "insight";
type Channel = "online" | "in-store";
type Severity = "action" | "opportunity" | "intel";

const TYPE_STYLES: Record<AlertType, { bg: string; color: string }> = {
  price: { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706" },
  stock: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563EB" },
  promo: { bg: "rgba(168, 85, 247, 0.1)", color: "#7C3AED" },
  pattern: { bg: "rgba(234, 88, 12, 0.1)", color: "#EA580C" },
  insight: { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A" },
};

const CHANNEL_STYLES: Record<Channel, { bg: string; color: string }> = {
  online: { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6" },
  "in-store": { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
};

const SEVERITY_STYLES: Record<Severity, { bg: string; color: string }> = {
  action: { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626" },
  opportunity: { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A" },
  intel: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563EB" },
};

function Pill({
  bg,
  color,
  fontSize = 11,
  children,
}: {
  bg: string;
  color: string;
  fontSize?: number;
  children: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: bg,
        color,
        fontSize,
        fontWeight: 600,
        borderRadius: 20,
        padding: fontSize === 10 ? "2px 8px" : "3px 10px",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  // SSR-safe: only compute "X min ago" on the client to avoid hydration drift.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="live-alert-time">{now ? formatRelativeTime(iso, now) : ""}</span>;
}

export function LiveAlerts({ alerts }: { alerts: OverviewAlert[] }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <style>{`
        @keyframes prizeskout-pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .live-alert-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 4px;
          border-radius: 6px;
          margin: 0 -4px;
          transition: background-color 0.12s ease;
        }
        .live-alert-row:hover {
          background-color: #FAFAF9;
        }
        .live-alert-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .live-alert-time {
          font-size: 11px;
          color: #9A9A9A;
          margin-left: auto;
        }
        @media (min-width: 768px) {
          .live-alert-row {
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }
          .live-alert-meta {
            flex-wrap: nowrap;
          }
          .live-alert-time {
            min-width: 80px;
            text-align: right;
            margin-left: 0;
          }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            backgroundColor: "#EF4444",
            animation: "prizeskout-pulse-dot 2s ease-in-out infinite",
          }}
        />
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: 0 }}>
          Live alerts
        </h2>
      </div>

      {alerts.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6B6B6B", margin: "12px 0 0" }}>
          No alerts yet - your dashboard will populate as competitors and prices change.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {alerts.map((a, i) => {
            const t = TYPE_STYLES[a.alert_type];
            const c = CHANNEL_STYLES[a.channel];
            const s = SEVERITY_STYLES[a.severity];
            const isLast = i === alerts.length - 1;
            const href = ALERT_ROUTE[a.alert_type] ?? "/dashboard";
            return (
              <li
                key={a.id}
                style={{ borderBottom: isLast ? "none" : "1px solid #E5E2DB" }}
              >
                <Link
                  to={href}
                  className="live-alert-row"
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <div className="live-alert-meta">
                    <Pill bg={t.bg} color={t.color}>
                      {a.alert_type}
                    </Pill>
                    <Pill bg={c.bg} color={c.color} fontSize={10}>
                      {a.channel}
                    </Pill>
                  </div>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      fontWeight: 400,
                      color: "#1A1A18",
                    }}
                  >
                    {a.message}
                  </span>
                  <div className="live-alert-meta">
                    <Pill bg={s.bg} color={s.color}>
                      {a.severity}
                    </Pill>
                    <RelativeTime iso={a.occurred_at} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
