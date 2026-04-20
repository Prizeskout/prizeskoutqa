import { Brain } from "lucide-react";

export function ModelStatusBanner() {
  return (
    <div
      style={{
        backgroundColor: "rgba(234, 88, 12, 0.04)",
        border: "1px solid rgba(234, 88, 12, 0.15)",
        borderRadius: 10,
        padding: "16px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
        <Brain size={20} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
            Your custom pricing model
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6B6B6B",
              maxWidth: 600,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Trained on 11 months of Snoonu sales data, margin structure, delivery costs, and
            customer behavior. These recommendations are unique to your business.
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#EA580C" }}>91% accuracy</div>
        <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
          vs 61% for a new client starting today
        </div>
      </div>
    </div>
  );
}
