type AlertType = "price" | "stock" | "promo" | "pattern" | "insight";
type Channel = "online" | "in-store";
type Severity = "action" | "opportunity" | "intel";

type Alert = {
  type: AlertType;
  channel: Channel;
  msg: string;
  severity: Severity;
  time: string;
};

const ALERTS: Alert[] = [
  {
    type: "price",
    channel: "online",
    msg: "Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)",
    severity: "action",
    time: "2 min ago",
  },
  {
    type: "stock",
    channel: "online",
    msg: "Lulu out of stock on Samsung Galaxy S24 Ultra. Estimated restock: 3-4 days.",
    severity: "opportunity",
    time: "18 min ago",
  },
  {
    type: "pattern",
    channel: "online",
    msg: "Talabat Eid sale detected. Matches their annual pattern. Confidence: 92%.",
    severity: "intel",
    time: "1 hr ago",
  },
  {
    type: "price",
    channel: "in-store",
    msg: "Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.",
    severity: "intel",
    time: "2 hrs ago",
  },
  {
    type: "insight",
    channel: "online",
    msg: "Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.",
    severity: "intel",
    time: "5 hrs ago",
  },
  {
    type: "promo",
    channel: "in-store",
    msg: "Lulu Hypermarket Lusail running 20% off on home appliances in-store only.",
    severity: "opportunity",
    time: "6 hrs ago",
  },
];

const TYPE_STYLES: Record<AlertType, { bg: string; color: string }> = {
  price: { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706" },
  stock: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563EB" },
  promo: { bg: "rgba(168, 85, 247, 0.1)", color: "#7C3AED" },
  pattern: { bg: "rgba(234, 88, 12, 0.1)", color: "#EA580C" },
  insight: { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A" },
};

const CHANNEL_STYLES: Record<Channel, { bg: string; color: string }> = {
  online: { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6" },
  "in-store": { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
};

const SEVERITY_STYLES: Record<Severity, { bg: string; color: string }> = {
  action: { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626" },
  opportunity: { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A" },
  intel: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563EB" },
};

function Pill({
  bg,
  color,
  fontSize = 11,
  children,
}: {
  bg: string;
  color: string;
  fontSize?: number;
  children: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: bg,
        color,
        fontSize,
        fontWeight: 600,
        borderRadius: 20,
        padding: fontSize === 10 ? "2px 8px" : "3px 10px",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

export function LiveAlerts() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <style>{`
        @keyframes prizeskout-pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            backgroundColor: "#EF4444",
            animation: "prizeskout-pulse-dot 2s ease-in-out infinite",
          }}
        />
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: 0 }}>
          Live alerts
        </h2>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
        {ALERTS.map((a, i) => {
          const t = TYPE_STYLES[a.type];
          const c = CHANNEL_STYLES[a.channel];
          const s = SEVERITY_STYLES[a.severity];
          const isLast = i === ALERTS.length - 1;
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: isLast ? "none" : "1px solid #E5E2DB",
              }}
            >
              <Pill bg={t.bg} color={t.color}>
                {a.type}
              </Pill>
              <Pill bg={c.bg} color={c.color} fontSize={10}>
                {a.channel}
              </Pill>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 400,
                  color: "#1A1A18",
                }}
              >
                {a.msg}
              </span>
              <Pill bg={s.bg} color={s.color}>
                {a.severity}
              </Pill>
              <span
                style={{
                  fontSize: 11,
                  color: "#9A9A9A",
                  minWidth: 80,
                  textAlign: "right",
                }}
              >
                {a.time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
