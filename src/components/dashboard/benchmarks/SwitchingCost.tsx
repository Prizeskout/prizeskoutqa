import { ShieldAlert } from "lucide-react";

export function SwitchingCost() {
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
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>The cost of switching</div>
        <div style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.65, marginTop: 4 }}>
          Building this in-house or switching to a competitor means starting a new model from
          scratch at 61% accuracy. It takes 12 months of continuous data to reach your current 91%
          level. During those 12 months, every pricing decision is less accurate, every promotion
          is less optimized, and every competitive gap takes longer to spot. The model you have
          built here is an asset that appreciates over time.
        </div>
      </div>
    </div>
  );
}
