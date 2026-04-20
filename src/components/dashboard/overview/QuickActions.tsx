import { ArrowRight, Crosshair, TrendingUp, MapPin, type LucideIcon } from "lucide-react";

type Action = {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
};

const ACTIONS: Action[] = [
  {
    icon: Crosshair,
    title: "Price alerts need action",
    description: "3 competitors have undercut your prices on tracked products.",
    link: "View competitors",
  },
  {
    icon: TrendingUp,
    title: "5 pricing recommendations",
    description:
      "AI has identified 5 products where price adjustments could improve margins.",
    link: "Review pricing",
  },
  {
    icon: MapPin,
    title: "Field intel pending review",
    description: "4 new price observations submitted by your field team today.",
    link: "Review submissions",
  },
];

function ActionCard({ action }: { action: Action }) {
  const Icon = action.icon;
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
        {action.link}
        <ArrowRight size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function QuickActions() {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {ACTIONS.map((a) => (
        <ActionCard key={a.title} action={a} />
      ))}
    </div>
  );
}
