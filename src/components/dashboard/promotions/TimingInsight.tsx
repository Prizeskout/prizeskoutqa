import { Calendar } from "lucide-react";

export function TimingInsight() {
  return (
    <div
      style={{
        backgroundColor: "rgba(234, 88, 12, 0.04)",
        border: "1px solid rgba(234, 88, 12, 0.15)",
        borderRadius: 10,
        padding: "16px 22px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <Calendar size={18} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
          Optimal promotion windows for Snoonu
        </div>
        <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, marginTop: 4 }}>
          Based on 11 months of competitive tracking, the best windows for your promotions are:
          Monday through Wednesday for grocery (avoiding Lulu's Thursday to Saturday flash deals),
          Friday evening for electronics (after Carrefour's Thursday price drop traffic has peaked),
          and the first week after any major Talabat sale ends (to capture deal-seekers still
          browsing).
        </div>
      </div>
    </div>
  );
}
