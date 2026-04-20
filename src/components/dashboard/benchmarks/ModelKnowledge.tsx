import { Check } from "lucide-react";
import type { ModelKnowledgeRow } from "@/lib/benchmarks-data";

export function ModelKnowledge({ items }: { items: ModelKnowledgeRow[] }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>
        What your model knows that a generic tool does not
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Unique intelligence learned from 11 months of Snoonu data
      </div>
      <div style={{ marginTop: 8 }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "10px 0",
              borderBottom: i === items.length - 1 ? "none" : "1px solid #F5F4F1",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Check size={14} color="#22C55E" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "#1A1A18", lineHeight: 1.5 }}>
              {item.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
