import { Calendar } from "lucide-react";
import type { TimingInsightRow } from "@/lib/promotions-data";

export function TimingInsight({ insights }: { insights: TimingInsightRow[] }) {
  if (insights.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {insights.map((insight) => (
        <div
          key={insight.id}
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
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{insight.title}</div>
            <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, marginTop: 4 }}>
              {insight.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
