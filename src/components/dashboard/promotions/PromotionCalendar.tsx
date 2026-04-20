import { useMemo, useState } from "react";

type Channel = "Online" | "In-Store" | "Both";
type Status = "Live" | "Upcoming" | "Ended";

type Promo = {
  competitor: string;
  campaign: string;
  channel: Channel;
  dates: string;
  duration: string;
  depth: string;
  categories: string;
  status: Status;
};

const PROMOS: Promo[] = [
  { competitor: "Talabat", campaign: "Eid Al-Fitr Mega Sale", channel: "Both", dates: "Mar 28 - Apr 5", duration: "9 days", depth: "15-25%", categories: "All categories", status: "Live" },
  { competitor: "Carrefour", campaign: "Back to School", channel: "Both", dates: "Apr 10 - Apr 20", duration: "11 days", depth: "10-20%", categories: "Electronics, Stationery", status: "Upcoming" },
  { competitor: "Lulu", campaign: "Weekend Flash Deals", channel: "In-Store", dates: "Every Thu-Sat", duration: "Recurring", depth: "5-15%", categories: "Grocery, Home", status: "Live" },
  { competitor: "Amazon.ae", campaign: "Spring Deals", channel: "Online", dates: "Apr 15 - Apr 22", duration: "8 days", depth: "20-40%", categories: "Electronics, Fashion", status: "Upcoming" },
  { competitor: "Noon", campaign: "Yellow Friday Mini", channel: "Online", dates: "Apr 18 - Apr 19", duration: "2 days", depth: "10-30%", categories: "Electronics", status: "Upcoming" },
  { competitor: "Carrefour", campaign: "Doha Festival City Exclusive", channel: "In-Store", dates: "Apr 1 - Apr 14", duration: "14 days", depth: "10-15%", categories: "Home, Beauty", status: "Live" },
  { competitor: "Talabat", campaign: "Free Delivery Week", channel: "Online", dates: "Apr 7 - Apr 13", duration: "7 days", depth: "Free delivery", categories: "All categories", status: "Live" },
  { competitor: "Lulu", campaign: "Ramadan Clearance", channel: "Both", dates: "Mar 20 - Mar 30", duration: "11 days", depth: "20-40%", categories: "Grocery, Home", status: "Ended" },
];

const COMPETITORS = ["All", "Talabat", "Carrefour", "Lulu", "Amazon.ae", "Noon"];

function ChannelPill({ channel }: { channel: Channel }) {
  const map = {
    Online: { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6" },
    "In-Store": { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
    Both: { bg: "rgba(234, 88, 12, 0.08)", color: "#EA580C" },
  } as const;
  const { bg, color } = map[channel];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 12,
        backgroundColor: bg,
        color,
      }}
    >
      {channel}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "Live") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 20,
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          color: "#16A34A",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#22C55E",
            animation: "pulse-dot 2s ease-in-out infinite",
          }}
        />
        Live
      </span>
    );
  }
  if (status === "Upcoming") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 20,
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          color: "#2563EB",
        }}
      >
        Upcoming
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        backgroundColor: "#F5F4F1",
        color: "#9A9A9A",
      }}
    >
      Ended
    </span>
  );
}

const th: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "#9A9A9A",
  padding: "12px 10px",
  textAlign: "left",
};

export function PromotionCalendar() {
  const [filter, setFilter] = useState("All");
  const filtered = useMemo(
    () => (filter === "All" ? PROMOS : PROMOS.filter((p) => p.competitor === filter)),
    [filter],
  );

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
        Competitor promotion calendar
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Current and upcoming promotions across Qatar commerce
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {COMPETITORS.map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = "#EA580C";
                  e.currentTarget.style.color = "#EA580C";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = "#E5E2DB";
                  e.currentTarget.style.color = "#6B6B6B";
                }
              }}
              style={{
                backgroundColor: active ? "#EA580C" : "#FFFFFF",
                border: `1px solid ${active ? "#EA580C" : "#E5E2DB"}`,
                color: active ? "#FFFFFF" : "#6B6B6B",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 20,
                padding: "6px 16px",
                cursor: "pointer",
                transition: "all 120ms ease",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
      <div className="table-scroll" style={{ marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
              <th style={th}>Competitor</th>
              <th style={th}>Campaign</th>
              <th style={th}>Channel</th>
              <th style={th}>Dates</th>
              <th style={th}>Duration</th>
              <th style={{ ...th, textAlign: "right" }}>Discount depth</th>
              <th style={th}>Categories</th>
              <th style={{ ...th, textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={`${p.competitor}-${p.campaign}`}
                style={{
                  borderBottom: "1px solid #E5E2DB",
                  backgroundColor: i % 2 === 1 ? "#FAFAF9" : "transparent",
                  cursor: "pointer",
                  transition: "background-color 120ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F4F1")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = i % 2 === 1 ? "#FAFAF9" : "transparent")
                }
              >
                <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>
                  {p.competitor}
                </td>
                <td style={{ padding: "14px 10px", fontSize: 13, color: "#1A1A18" }}>
                  {p.campaign}
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <ChannelPill channel={p.channel} />
                </td>
                <td style={{ padding: "14px 10px", fontSize: 12, color: "#6B6B6B" }}>{p.dates}</td>
                <td style={{ padding: "14px 10px", fontSize: 12, color: "#9A9A9A" }}>{p.duration}</td>
                <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 600, color: "#1A1A18", textAlign: "right" }}>
                  {p.depth}
                </td>
                <td style={{ padding: "14px 10px", fontSize: 12, color: "#6B6B6B", maxWidth: 140 }}>
                  {p.categories}
                </td>
                <td style={{ padding: "14px 10px", textAlign: "center" }}>
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
