import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardSubtitle,
  CardTitle,
  IconAction,
  OutlineAddButton,
  StatusDot,
} from "./primitives";

type Channel = "Online" | "In-Store";
type Status = "Active" | "Partial";

type Competitor = {
  name: string;
  channels: Channel[];
  products: number;
  status: Status;
};

const COMPETITORS: Competitor[] = [
  { name: "Talabat", channels: ["Online"], products: 2341, status: "Active" },
  { name: "Carrefour Qatar", channels: ["Online", "In-Store"], products: 1876, status: "Active" },
  { name: "Lulu Hypermarket", channels: ["Online", "In-Store"], products: 1543, status: "Active" },
  { name: "Amazon.ae", channels: ["Online"], products: 2102, status: "Active" },
  { name: "Noon", channels: ["Online"], products: 1897, status: "Active" },
  { name: "Baqaala", channels: ["Online"], products: 412, status: "Partial" },
];

function ChannelPill({ channel }: { channel: Channel }) {
  const isOnline = channel === "Online";
  return (
    <span
      style={{
        backgroundColor: isOnline ? "rgba(59, 130, 246, 0.08)" : "rgba(168, 85, 247, 0.08)",
        color: isOnline ? "#3B82F6" : "#7C3AED",
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 12,
      }}
    >
      {channel}
    </span>
  );
}

export function CompetitorsTab() {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <CardTitle>Tracked competitors</CardTitle>
          <CardSubtitle>
            Manage the competitors you monitor across online and physical channels
          </CardSubtitle>
        </div>
        <OutlineAddButton icon={<Plus size={14} strokeWidth={2} />}>
          Add competitor
        </OutlineAddButton>
      </div>

      <div style={{ marginTop: 8 }}>
        {COMPETITORS.map((c, i) => {
          const isLast = i === COMPETITORS.length - 1;
          const statusColor = c.status === "Active" ? "#22C55E" : "#F59E0B";
          return (
            <div
              key={c.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                padding: "16px 0",
                borderBottom: isLast ? "none" : "1px solid #E5E2DB",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{c.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {c.channels.map((ch) => (
                    <ChannelPill key={ch} channel={ch} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 6 }}>
                  {c.products.toLocaleString()} products tracked
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  flexShrink: 0,
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A18" }}>
                    {c.products.toLocaleString()}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <StatusDot color={statusColor} />
                    <span style={{ fontSize: 11, color: statusColor }}>{c.status}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <IconAction
                    ariaLabel={`Edit ${c.name}`}
                    icon={<Pencil size={14} color="#6B6B6B" />}
                  />
                  <IconAction
                    ariaLabel={`Remove ${c.name}`}
                    hoverColor="#EF4444"
                    icon={<Trash2 size={14} color="#9A9A9A" />}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
