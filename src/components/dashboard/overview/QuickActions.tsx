import { ArrowRight, Crosshair, TrendingUp, MapPin, Bell, type LucideIcon } from "lucide-react";
import type { OverviewQuickAction } from "@/lib/overview-data";

const ICON_MAP: Record<string, LucideIcon> = {
  crosshair: Crosshair,
  "trending-up": TrendingUp,
  "map-pin": MapPin,
  bell: Bell,
};

function ActionCard({ action }: { action: OverviewQuickAction }) {
  const Icon = ICON_MAP[action.icon] || Bell;
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "16px 20px",
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Icon size={24} strokeWidth={1.75} color="#EA580C" />
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18", marginTop: 12 }}>
        {action.title}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "#6B6B6B",
          lineHeight: 1.5,
          margin: "6px 0 14px",
          flex: 1,
        }}
      >
        {action.description}
      </p>
      <button
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          color: "#EA580C",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        {action.link_text}
        <ArrowRight size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function QuickActions({ actions }: { actions: OverviewQuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {actions.map((a) => (
        <div key={a.id} style={{ flex: "1 1 240px", minWidth: 0, display: "flex" }}>
          <ActionCard action={a} />
        </div>
      ))}
    </div>
  );
}
