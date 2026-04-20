import { Info } from "lucide-react";

export function ModelLearningCallout() {
  return (
    <div
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.04)",
        border: "1px solid rgba(59, 130, 246, 0.12)",
        borderRadius: 10,
        padding: "18px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <Info size={18} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
          These recommendations improve every month
        </div>
        <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, marginTop: 4 }}>
          The pricing model learns from your sales outcomes. Every time a recommendation is
          applied, the model tracks the result and refines future suggestions. After 11 months of
          training on Snoonu data, accuracy is at 91%. A competitor building this from scratch
          would start at 61% and need over a year to reach the same level.
        </div>
      </div>
    </div>
  );
}
