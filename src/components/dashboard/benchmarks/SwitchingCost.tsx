import { ShieldAlert } from "lucide-react";
import type { SwitchingCostRow } from "@/lib/benchmarks-data";

export function SwitchingCost({ data }: { data: SwitchingCostRow | null }) {
  if (!data) return null;
  return (
    <div
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.04)",
        border: "1px solid rgba(239, 68, 68, 0.12)",
        borderRadius: 10,
        padding: "18px 24px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <ShieldAlert size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{data.title}</div>
        <div style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.65, marginTop: 4 }}>
          {data.body}
        </div>
      </div>
    </div>
  );
}
