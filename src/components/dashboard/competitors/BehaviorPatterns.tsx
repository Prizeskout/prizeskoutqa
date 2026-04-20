import type { CSSProperties, ReactNode } from "react";
import { Eye } from "lucide-react";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { exportPatternsPdf } from "./exportPatternsPdf";
import { useBranding, accentRgba } from "@/hooks/useBranding";
import type { BehaviorPattern } from "@/lib/competitors-data";

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

// Map a DB-shaped BehaviorPattern (snake_case) into the local Pattern shape
// used by the card UI and the PDF export.
function toPattern(p: BehaviorPattern): Pattern {
  return {
    competitor: p.competitor,
    channel: p.channel,
    category: p.category,
    detectionPeriod: p.detection_period,
    confidence: p.confidence,
    pattern: p.pattern,
    depth: p.depth,
    evidence: p.evidence ?? [],
    recommendation: p.recommendation,
    impact: p.impact,
  };
}

export function BehaviorPatterns({ patterns }: { patterns: BehaviorPattern[] }) {
  const mapped = patterns.map(toPattern);

  if (!mapped.length) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px dashed #E5E2DB",
          borderRadius: 10,
          padding: "20px 24px",
          fontSize: 13,
          color: "#6B6B6B",
        }}
      >
        No behavior patterns detected yet — patterns appear once we have at least 8 months of
        competitor tracking data.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ExportPdfButton onExport={() => exportPatternsPdf(mapped)} />
      </div>
      <ContextBanner count={mapped.length} />
      {mapped.map((p) => (
        <PatternCard key={p.competitor} pattern={p} />
      ))}
      <PatternSummary count={mapped.length} />
    </div>
  );
}

function ContextBanner() {
  const { accentColor } = useBranding();
  return (
    <div
      style={{
        backgroundColor: accentRgba(accentColor, 0.04),
        border: `1px solid ${accentRgba(accentColor, 0.15)}`,
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
          backgroundColor: accentRgba(accentColor, 0.1),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Eye size={20} color={accentColor} />
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
        <div style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>
          4 patterns
        </div>
        <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
          detected
        </div>
      </div>
    </div>
  );
}

function channelPillStyle(
  ch: Pattern["channel"],
  accent: string,
): CSSProperties {
  const map: Record<Pattern["channel"], { bg: string; color: string }> = {
    Online: { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6" },
    "In-Store": { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
    Both: { bg: accentRgba(accent, 0.08), color: accent },
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
  const { accentColor } = useBranding();
  const color =
    value > 90 ? "#22C55E" : value >= 80 ? accentColor : "#F59E0B";
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
  const { accentColor, brandName } = useBranding();
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
            <span style={channelPillStyle(pattern.channel, accentColor)}>
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
          backgroundColor: accentRgba(accentColor, 0.04),
          borderRadius: 8,
          padding: "16px 20px",
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        <SectionLabel color={accentColor}>
          Recommendation for {brandName}
        </SectionLabel>
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
  const { accentColor } = useBranding();
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
              backgroundColor: accentColor,
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
  const { accentColor, brandName } = useBranding();
  const blocks = [
    {
      bg: "rgba(34, 197, 94, 0.06)",
      label: "Monthly value",
      value: "+QAR 45K",
      valueColor: "#22C55E",
      sub: "from better timing and positioning",
    },
    {
      bg: accentRgba(accentColor, 0.06),
      label: "Patterns detected",
      value: "4",
      valueColor: accentColor,
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
          backgroundColor: accentRgba(accentColor, 0.04),
          border: `1px solid ${accentRgba(accentColor, 0.15)}`,
          borderRadius: 10,
          padding: "14px 20px",
          fontSize: 13,
          color: "#6B6B6B",
          lineHeight: 1.6,
        }}
      >
        These patterns are invisible to anyone without continuous, long-term
        competitive tracking. Every month you use {brandName}, the pattern
        library grows deeper. Competitors starting fresh today are 8 to 14
        months behind and counting.
      </div>
    </div>
  );
}
