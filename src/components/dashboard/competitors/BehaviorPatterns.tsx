import type { CSSProperties, ReactNode } from "react";
import { Eye } from "lucide-react";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { exportPatternsPdf } from "./exportPatternsPdf";

type Pattern = {
  competitor: string;
  channel: "Online" | "In-Store" | "Both";
  category: string;
  detectionPeriod: string;
  confidence: number;
  pattern: string;
  depth: string | null;
  evidence: { date: string; description: string }[];
  recommendation: string;
  impact: string;
};

const PATTERNS: Pattern[] = [
  {
    competitor: "Carrefour",
    channel: "Both",
    category: "Electronics",
    detectionPeriod: "14 months of data",
    confidence: 94,
    pattern:
      "Drops electronics prices every 3rd Thursday of the month by 8 to 12%",
    depth: "8-12%",
    evidence: [
      { date: "Nov 16, 2025", description: "Electronics category dropped 9.2% across 47 products" },
      { date: "Dec 21, 2025", description: "Electronics dropped 11.1% across 52 products" },
      { date: "Jan 18, 2026", description: "Electronics dropped 8.7% across 44 products" },
      { date: "Feb 20, 2026", description: "Electronics dropped 10.3% across 49 products" },
    ],
    recommendation:
      "Hold your electronics promotions until the Friday after Carrefour's Thursday drop. Their traffic spike peaks Thursday evening and fades by Saturday. You capture the residual demand at a better margin. Do not try to compete during their drop window. Instead, position yourself as the option for shoppers who missed the deals or want faster delivery.",
    impact: "+QAR 14K monthly from better promotion timing",
  },
  {
    competitor: "Talabat",
    channel: "Online",
    category: "Grocery",
    detectionPeriod: "11 months of data",
    confidence: 89,
    pattern: "Runs flash grocery discounts every Sunday between 6pm and 9pm",
    depth: "10-15%",
    evidence: [
      { date: "Jan 5, 2026", description: "Grocery flash sale 6:02pm to 8:58pm, avg discount 12.4%" },
      { date: "Jan 12, 2026", description: "Grocery flash sale 6:10pm to 9:05pm, avg discount 11.8%" },
      { date: "Feb 2, 2026", description: "Grocery flash sale 5:55pm to 9:00pm, avg discount 13.1%" },
      { date: "Mar 9, 2026", description: "Grocery flash sale 6:00pm to 8:50pm, avg discount 10.9%" },
    ],
    recommendation:
      "Schedule your grocery push for Monday morning. Talabat's Sunday buyers have already purchased, but Monday has low competition and your delivery speed advantage peaks during working hours when people order for home delivery. Run a 'Monday Fresh' campaign specifically targeting items that Talabat discounted the night before.",
    impact: "+QAR 8K monthly from shifted grocery promotion timing",
  },
  {
    competitor: "Amazon.ae",
    channel: "Online",
    category: "Electronics",
    detectionPeriod: "9 months of data",
    confidence: 91,
    pattern:
      "Raises prices 5 to 8 days before a major sale, then discounts back to the original price",
    depth: "Perceived 20-30% discount, actual 3-5%",
    evidence: [
      { date: "Nov 17, 2025", description: "Avg electronics price raised 18% across 230 products" },
      { date: "Nov 25, 2025", description: "Black Friday sale launched with 'up to 25% off', net price 2.8% below pre-inflation" },
      { date: "Mar 5, 2026", description: "Avg electronics price raised 22% across 195 products" },
      { date: "Mar 14, 2026", description: "Spring sale launched with 'up to 30% off', net price 4.1% below pre-inflation" },
    ],
    recommendation:
      "Do not react to Amazon's pre-sale price hikes. Your team may see their prices jump and think demand is shifting. It is artificial inflation. Hold your prices steady. When their sale launches, your regular prices are already competitive without any margin sacrifice. Communicate this to your category managers so they do not panic-adjust.",
    impact: "Prevents unnecessary margin erosion of 3-5% during Amazon sale periods",
  },
  {
    competitor: "Lulu",
    channel: "In-Store",
    category: "Electronics, Home",
    detectionPeriod: "8 months of data",
    confidence: 87,
    pattern:
      "Stocks out on premium electronics and home appliances 2 to 3 days before weekend",
    depth: null,
    evidence: [
      { date: "Dec 18, 2025", description: "Dyson, Samsung premium range out of stock at Lusail location by Wednesday" },
      { date: "Jan 15, 2026", description: "Apple accessories, Dyson out of stock at Al Gharafa by Thursday morning" },
      { date: "Feb 12, 2026", description: "Premium electronics stock gaps at 3 of 4 monitored Lulu locations by Wednesday" },
      { date: "Mar 19, 2026", description: "Similar pattern, stock gaps appearing Wednesday afternoon" },
    ],
    recommendation:
      "Push premium electronics and home appliance ads on Thursday evening, specifically targeting areas near Lulu locations (Lusail, Al Gharafa, Al Messila). Their stock gaps are your conversion opportunity. Customers who visited Lulu and found items out of stock will search online. Be the first result they see with guaranteed same-day delivery.",
    impact: "+QAR 11K monthly from capturing Lulu stock gap demand",
  },
];

export function BehaviorPatterns() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ExportPdfButton onExport={() => exportPatternsPdf(PATTERNS)} />
      </div>
      <ContextBanner />
      {PATTERNS.map((p) => (
        <PatternCard key={p.competitor} pattern={p} />
      ))}
      <PatternSummary />
    </div>
  );
}

function ContextBanner() {
  return (
    <div
      style={{
        backgroundColor: "rgba(234, 88, 12, 0.04)",
        border: "1px solid rgba(234, 88, 12, 0.15)",
        borderRadius: 10,
        padding: "18px 24px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: "rgba(234, 88, 12, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Eye size={20} color="#EA580C" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18" }}>
          Patterns no one else can see
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6B6B6B",
            lineHeight: 1.6,
            marginTop: 4,
          }}
        >
          These behavioral patterns were detected by monitoring your competitors
          continuously over 8 to 14 months. They reveal recurring pricing
          strategies, promotional rhythms, and stock management habits. A
          competitor or in-house tool starting today would need the same amount
          of time to detect these same patterns. This is intelligence that
          compounds over time.
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          alignSelf: "center",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: "#EA580C" }}>
          4 patterns
        </div>
        <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
          detected
        </div>
      </div>
    </div>
  );
}

function channelPillStyle(ch: Pattern["channel"]): CSSProperties {
  const map: Record<Pattern["channel"], { bg: string; color: string }> = {
    Online: { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6" },
    "In-Store": { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
    Both: { bg: "rgba(234, 88, 12, 0.08)", color: "#EA580C" },
  };
  const { bg, color } = map[ch];
  return {
    backgroundColor: bg,
    color,
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 10px",
    borderRadius: 20,
  };
}

function ConfidenceRing({ value }: { value: number }) {
  const color =
    value > 90 ? "#22C55E" : value >= 80 ? "#EA580C" : "#F59E0B";
  const size = 56;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
        }}
      >
        <svg width={size} height={size} style={{ display: "block" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F5F4F1"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color,
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "#9A9A9A", marginTop: 4 }}>
        confidence
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  color = "#9A9A9A",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {children}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "24px 28px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1A1A18" }}>
            {pattern.competitor}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 6,
              flexWrap: "wrap",
            }}
          >
            <span style={channelPillStyle(pattern.channel)}>
              {pattern.channel}
            </span>
            <span
              style={{
                backgroundColor: "#F5F4F1",
                color: "#6B6B6B",
                fontSize: 10,
                fontWeight: 500,
                borderRadius: 20,
                padding: "2px 10px",
              }}
            >
              {pattern.category}
            </span>
            <span
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                color: "#3B82F6",
                fontSize: 10,
                fontWeight: 500,
                borderRadius: 20,
                padding: "2px 10px",
              }}
            >
              {pattern.detectionPeriod}
            </span>
          </div>
        </div>
        <ConfidenceRing value={pattern.confidence} />
      </div>

      {/* Detected pattern */}
      <div
        style={{
          marginTop: 18,
          backgroundColor: "#FAFAF9",
          borderRadius: 8,
          padding: "16px 20px",
        }}
      >
        <SectionLabel>Detected pattern</SectionLabel>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#1A1A18",
            lineHeight: 1.5,
            marginTop: 6,
          }}
        >
          {pattern.pattern}
        </div>
        {pattern.depth && (
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
            Typical depth: {pattern.depth}
          </div>
        )}
      </div>

      {/* Evidence */}
      <div style={{ marginTop: 14 }}>
        <SectionLabel>Evidence</SectionLabel>
        <Timeline items={pattern.evidence} />
      </div>

      {/* Recommendation */}
      <div
        style={{
          marginTop: 14,
          backgroundColor: "rgba(234, 88, 12, 0.04)",
          borderRadius: 8,
          padding: "16px 20px",
          borderLeft: "3px solid #EA580C",
        }}
      >
        <SectionLabel color="#EA580C">Recommendation for Snoonu</SectionLabel>
        <div
          style={{
            fontSize: 13,
            color: "#1A1A18",
            lineHeight: 1.65,
            marginTop: 6,
          }}
        >
          {pattern.recommendation}
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 500, color: "#9A9A9A" }}>
            Estimated impact:
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#22C55E" }}>
            {pattern.impact}
          </span>
        </div>
      </div>
    </div>
  );
}

function Timeline({
  items,
}: {
  items: { date: string; description: string }[];
}) {
  return (
    <div style={{ position: "relative", marginTop: 8, paddingLeft: 14 }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 3,
          top: 12,
          bottom: 12,
          width: 1,
          backgroundColor: "#E5E2DB",
        }}
      />
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "6px 0",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: -14,
              top: 12,
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#EA580C",
              boxShadow: "0 0 0 3px #FFFFFF",
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#1A1A18",
              minWidth: 100,
              flexShrink: 0,
            }}
          >
            {it.date}
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>
            {it.description}
          </div>
        </div>
      ))}
    </div>
  );
}

function PatternSummary() {
  const blocks = [
    {
      bg: "rgba(34, 197, 94, 0.06)",
      label: "Monthly value",
      value: "+QAR 45K",
      valueColor: "#22C55E",
      sub: "from better timing and positioning",
    },
    {
      bg: "rgba(234, 88, 12, 0.06)",
      label: "Patterns detected",
      value: "4",
      valueColor: "#EA580C",
      sub: "with more emerging as data grows",
    },
    {
      bg: "rgba(59, 130, 246, 0.06)",
      label: "Time to replicate",
      value: "8-14 months",
      valueColor: "#3B82F6",
      sub: "minimum for any new entrant",
    },
  ];
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
        Total estimated value of pattern intelligence
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        {blocks.map((b) => (
          <div
            key={b.label}
            style={{
              flex: "1 1 200px",
              backgroundColor: b.bg,
              borderRadius: 8,
              padding: "18px 22px",
            }}
          >
            <div style={{ fontSize: 11, color: "#9A9A9A" }}>{b.label}</div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: b.valueColor,
                marginTop: 4,
              }}
            >
              {b.value}
            </div>
            <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 4 }}>
              {b.sub}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          backgroundColor: "rgba(234, 88, 12, 0.04)",
          border: "1px solid rgba(234, 88, 12, 0.15)",
          borderRadius: 10,
          padding: "14px 20px",
          fontSize: 13,
          color: "#6B6B6B",
          lineHeight: 1.6,
        }}
      >
        These patterns are invisible to anyone without continuous, long-term
        competitive tracking. Every month you use PrizeSkout, the pattern
        library grows deeper. Competitors starting fresh today are 8 to 14
        months behind and counting.
      </div>
    </div>
  );
}
