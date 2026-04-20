import { Users } from "lucide-react";

export function NetworkValueCallout() {
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
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
          These benchmarks get more accurate as the network grows
        </div>
        <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, marginTop: 4 }}>
          With more brands using PrizeSkout, the benchmark pool deepens and the data becomes more
          representative. Your data is never exposed to anyone. Every client benefits from the
          network. Nobody sees anyone else's playbook.
        </div>
      </div>
    </div>
  );
}
