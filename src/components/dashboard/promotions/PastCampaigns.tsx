type Campaign = {
  name: string;
  discount: string;
  totalGMV: string;
  incrementalGMV: string;
  cannibalized: string;
  roi: number;
  verdict: string;
};

const CAMPAIGNS: Campaign[] = [
  {
    name: "Eid Electronics Blitz (Mar 2026)",
    discount: "20% off all electronics",
    totalGMV: "+QAR 312K",
    incrementalGMV: "+QAR 187K",
    cannibalized: "QAR 125K (40%)",
    roi: 1.4,
    verdict:
      "Moderate cannibalization. 40% of orders would have happened at full price. Recommend reducing to 15% and targeting only items where you are not already the cheapest option.",
  },
  {
    name: "Free Delivery Weekend (Feb 2026)",
    discount: "Free delivery on all orders",
    totalGMV: "+QAR 89K",
    incrementalGMV: "+QAR 71K",
    cannibalized: "QAR 18K (20%)",
    roi: 3.1,
    verdict:
      "Low cannibalization. Free delivery attracted genuinely new orders. This campaign profile works well. Recommend repeating monthly, especially targeting first-time buyers.",
  },
  {
    name: "Flash Sale: Headphones (Jan 2026)",
    discount: "30% off premium headphones",
    totalGMV: "+QAR 47K",
    incrementalGMV: "+QAR 12K",
    cannibalized: "QAR 35K (74%)",
    roi: 0.6,
    verdict:
      "Heavy cannibalization. 74% of buyers were already in your funnel and would have purchased at full price. You gave away margin on customers you already had. Do not repeat at this discount depth. Consider 10% maximum for this category.",
  },
];

function roiColors(roi: number) {
  if (roi > 2) {
    return { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A", border: "rgba(34, 197, 94, 0.2)", accent: "#22C55E" };
  }
  if (roi >= 1) {
    return { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706", border: "rgba(245, 158, 11, 0.2)", accent: "#F59E0B" };
  }
  return { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626", border: "rgba(239, 68, 68, 0.2)", accent: "#EF4444" };
}

function CampaignCard({ c }: { c: Campaign }) {
  const colors = roiColors(c.roi);
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>{c.discount}</div>
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            padding: "6px 18px",
            borderRadius: 20,
            backgroundColor: colors.bg,
            color: colors.color,
            border: `1px solid ${colors.border}`,
          }}
        >
          {c.roi.toFixed(1)}x ROI
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
        {[
          { label: "Total GMV uplift", value: c.totalGMV },
          { label: "Truly incremental", value: c.incrementalGMV },
          { label: "Cannibalized", value: c.cannibalized },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              flex: 1,
              minWidth: 140,
              backgroundColor: "#FAFAF9",
              borderRadius: 8,
              padding: "12px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", fontWeight: 500 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#1A1A18", marginTop: 4 }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 14,
          borderLeft: `3px solid ${colors.accent}`,
          paddingLeft: 14,
          fontSize: 13,
          color: "#6B6B6B",
          lineHeight: 1.65,
        }}
      >
        {c.verdict}
      </div>
    </div>
  );
}

export function PastCampaigns() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Past campaign analysis</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        How your recent promotions actually performed vs what they appeared to deliver
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        {CAMPAIGNS.map((c) => (
          <CampaignCard key={c.name} c={c} />
        ))}
      </div>
    </div>
  );
}
