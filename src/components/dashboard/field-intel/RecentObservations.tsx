import { useState } from "react";
import { MapPin } from "lucide-react";

type Status = "Reviewed" | "Pending" | "Flagged";
type Condition = "Regular price" | "On promotion" | "Clearance";

type Observation = {
  product: string;
  store: string;
  price: number;
  condition: Condition;
  promoDetail?: string;
  status: Status;
  agent: string;
  time: string;
};

export const OBSERVATIONS: Observation[] = [
  {
    product: "Samsung Galaxy S24 Ultra 256GB",
    store: "Carrefour - Doha Festival City",
    price: 3849,
    condition: "Regular price",
    status: "Reviewed",
    agent: "Ahmad K.",
    time: "2 hrs ago",
  },
  {
    product: "Dyson V15 Detect Vacuum",
    store: "Lulu - Lusail",
    price: 2699,
    condition: "On promotion",
    promoDetail: "Weekend deal, 15% off until Saturday",
    status: "Reviewed",
    agent: "Sara M.",
    time: "3 hrs ago",
  },
  {
    product: "Sony WH-1000XM5",
    store: "Carrefour - Mall of Qatar",
    price: 1149,
    condition: "Clearance",
    status: "Flagged",
    agent: "Ahmad K.",
    time: "5 hrs ago",
  },
  {
    product: "Ariel Detergent 3kg",
    store: "Lulu - Al Gharafa",
    price: 37.5,
    condition: "On promotion",
    promoDetail: "Buy 2 get 10% off",
    status: "Pending",
    agent: "Fatima R.",
    time: "6 hrs ago",
  },
  {
    product: "Nike Air Max 90 Men",
    store: "Carrefour - Landmark Mall",
    price: 529,
    condition: "Regular price",
    status: "Pending",
    agent: "Omar H.",
    time: "8 hrs ago",
  },
  {
    product: "Nespresso Vertuo Pop",
    store: "Lulu - Al Messila",
    price: 429,
    condition: "On promotion",
    promoDetail: "Ramadan special, free capsule box included",
    status: "Pending",
    agent: "Sara M.",
    time: "1 day ago",
  },
];

function StatusBadge({ status }: { status: Status }) {
  const map = {
    Reviewed: { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A" },
    Pending: { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706" },
    Flagged: { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626" },
  };
  const c = map[status];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: 12,
        backgroundColor: c.bg,
        color: c.color,
        marginTop: 4,
      }}
    >
      {status}
    </span>
  );
}

export function RecentObservations() {
  const [filter, setFilter] = useState<"All" | "Pending review">("All");

  const filtered =
    filter === "All" ? OBSERVATIONS : OBSERVATIONS.filter((o) => o.status === "Pending");

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Recent observations</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Latest submissions from your field team
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {(["All", "Pending review"] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                backgroundColor: active ? "#EA580C" : "white",
                color: active ? "white" : "#6B6B6B",
                border: `1px solid ${active ? "#EA580C" : "#E5E2DB"}`,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 6 }}>
        {filtered.map((o, i) => (
          <div
            key={`${o.product}-${i}`}
            style={{
              padding: "14px 0",
              borderBottom: i === filtered.length - 1 ? "none" : "1px solid #E5E2DB",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{o.product}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B6B6B",
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MapPin size={12} color="#9A9A9A" />
                  {o.store}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#EA580C" }}>
                  QAR {o.price.toFixed(2)}
                </div>
                <StatusBadge status={o.status} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  backgroundColor: "#F5F4F1",
                  color: "#6B6B6B",
                  borderRadius: 12,
                  padding: "2px 8px",
                }}
              >
                {o.condition}
              </span>
              {o.promoDetail && (
                <span style={{ fontSize: 11, color: "#9A9A9A" }}>{o.promoDetail}</span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 11, color: "#9A9A9A" }}>Agent: {o.agent}</span>
              <span style={{ fontSize: 11, color: "#9A9A9A" }}>{o.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
