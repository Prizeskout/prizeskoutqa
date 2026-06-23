import type { PastCampaignRow } from "@/lib/promotions-data";

function roiColors(roi: number) {
  if (roi > 2) {
    return { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A", border: "rgba(34, 197, 94, 0.2)", accent: "#22C55E" };
  }
  if (roi >= 1) {
    return { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706", border: "rgba(245, 158, 11, 0.2)", accent: "#F59E0B" };
  }
  return { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626", border: "rgba(239, 68, 68, 0.2)", accent: "#EF4444" };
}

function CampaignCard({ c }: { c: PastCampaignRow }) {
  const colors = roiColors(Number(c.roi));
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
          {Number(c.roi).toFixed(1)}x ROI
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
        {[
          { label: "Total GMV uplift", value: c.total_gmv },
          { label: "Truly incremental", value: c.incremental_gmv },
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
          borderInlineStart: `3px solid ${colors.accent}`,
          paddingInlineStart: 14,
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

export function PastCampaigns({ campaigns }: { campaigns: PastCampaignRow[] }) {
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
        {campaigns.map((c) => (
          <CampaignCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}
