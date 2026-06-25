import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Upload, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { MarginLayout } from "@/components/margin/MarginLayout";

export const Route = createFileRoute("/margin-dashboard/channels")({
  component: MarginChannelsPage,
});

const BRAND = "#10B981";

// ── placeholder channel cards (shown when no real data exists yet) ───────────
const DEMO_CHANNELS = [
  { platform: "Talabat",   commission: 0.28, gross: 24800, net: 14200, orders: 312 },
  { platform: "Snoonu",    commission: 0.22, gross: 11200, net:  7400, orders: 148 },
  { platform: "Deliveroo", commission: 0.30, gross:  8400, net:  5300, orders:  97 },
];

function ChannelRow({
  platform,
  commission,
  gross,
  net,
  orders,
  isDemo,
}: {
  platform: string;
  commission: number;
  gross: number;
  net: number;
  orders: number;
  isDemo?: boolean;
}) {
  const netMarginPct = ((net / gross) * 100).toFixed(1);
  const positive = net / gross >= 0.2;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2EDE8",
        borderRadius: 10,
        padding: "18px 22px",
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto auto",
        alignItems: "center",
        gap: 24,
        filter: isDemo ? "blur(3px)" : "none",
        userSelect: isDemo ? "none" : "auto",
        pointerEvents: isDemo ? "none" : "auto",
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1A15" }}>{platform}</div>
        <div style={{ fontSize: 12, color: "#8AAF98", marginTop: 3 }}>{orders} orders</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Commission</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#EF4444" }}>{(commission * 100).toFixed(0)}%</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Gross</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1A15" }}>QAR {gross.toLocaleString()}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Net payout</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1A15" }}>QAR {net.toLocaleString()}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Net margin</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          {positive
            ? <TrendingUp size={13} color={BRAND} />
            : <TrendingDown size={13} color="#EF4444" />}
          <span style={{ fontSize: 15, fontWeight: 700, color: positive ? BRAND : "#EF4444" }}>
            {netMarginPct}%
          </span>
        </div>
      </div>
    </div>
  );
}

function MarginChannelsPage() {
  // In Phase 2 this will fetch from margin_orders grouped by platform.
  // For now: show demo data blurred behind an upload prompt.
  const hasRealData = false;

  return (
    <MarginLayout
      title="Channel breakdown"
      subtitle="Net margin per aggregator after commission and costs"
    >
      {/* Demo data blurred behind CTA */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DEMO_CHANNELS.map((c) => (
            <ChannelRow key={c.platform} {...c} isDemo={!hasRealData} />
          ))}
        </div>

        {!hasRealData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2EDE8",
                borderRadius: 12,
                padding: "32px 36px",
                textAlign: "center",
                maxWidth: 440,
                boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(16,185,129,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <Layers size={20} color={BRAND} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F1A15", marginBottom: 8 }}>
                No channel data yet
              </div>
              <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.6, marginBottom: 20 }}>
                Upload your first payout CSV to see real margin broken down per aggregator channel.
              </div>
              <Link
                to="/margin-dashboard/upload"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: `linear-gradient(135deg, ${BRAND}, #059669)`,
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "10px 18px",
                  borderRadius: 8,
                  textDecoration: "none",
                }}
              >
                <Upload size={13} /> Upload payout CSV <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </MarginLayout>
  );
}
