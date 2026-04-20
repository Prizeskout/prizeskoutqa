import { Users } from "lucide-react";
import type { NetworkValueRow } from "@/lib/benchmarks-data";

export function NetworkValueCallout({ data }: { data: NetworkValueRow | null }) {
  if (!data) return null;
  return (
    <div
      style={{
        backgroundColor: "rgba(234, 88, 12, 0.04)",
        border: "1px solid rgba(234, 88, 12, 0.15)",
        borderRadius: 10,
        padding: "16px 22px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <Users size={18} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{data.title}</div>
        <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, marginTop: 4 }}>
          {data.body}
        </div>
      </div>
    </div>
  );
}
