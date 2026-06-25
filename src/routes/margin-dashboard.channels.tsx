import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Upload, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { MarginLayout } from "@/components/margin/MarginLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/margin-dashboard/channels")({
  component: MarginChannelsPage,
});

const BRAND = "#10B981";

type ChannelData = {
  platform: string;
  commission: number;
  gross: number;
  net: number;
  orders: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  talabat: "Talabat", snoonu: "Snoonu", noon: "Noon",
  amazon_ae: "Amazon.ae", deliveroo: "Deliveroo", careem: "Careem", other: "Other",
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-QA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ChannelRow({ platform, commission, gross, net, orders, isDemo }: ChannelData & { isDemo?: boolean }) {
  const netMarginPct = gross > 0 ? (net / gross) * 100 : 0;
  const positive = netMarginPct >= 20;

  return (
    <div
      style={{
        background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10,
        padding: "18px 22px", display: "grid",
        gridTemplateColumns: "1fr auto auto auto auto",
        alignItems: "center", gap: 24,
        filter: isDemo ? "blur(3px)" : "none",
        userSelect: isDemo ? "none" : "auto",
        pointerEvents: isDemo ? "none" : "auto",
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1A15" }}>
          {PLATFORM_LABEL[platform] ?? platform}
        </div>
        <div style={{ fontSize: 12, color: "#8AAF98", marginTop: 3 }}>{orders} orders</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Commission</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: commission > 0 ? "#EF4444" : "#8AAF98" }}>
          {commission > 0 ? `${fmt(commission * 100, 1)}%` : "—"}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Gross</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1A15" }}>QAR {fmt(gross)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Net payout</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1A15" }}>QAR {fmt(net)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Net margin</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          {positive ? <TrendingUp size={13} color={BRAND} /> : <TrendingDown size={13} color="#EF4444" />}
          <span style={{ fontSize: 15, fontWeight: 700, color: positive ? BRAND : "#EF4444" }}>
            {fmt(netMarginPct, 1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

const DEMO_CHANNELS: ChannelData[] = [
  { platform: "talabat",   commission: 0.28, gross: 24800, net: 14200, orders: 312 },
  { platform: "snoonu",    commission: 0.22, gross: 11200, net:  7400, orders: 148 },
  { platform: "deliveroo", commission: 0.30, gross:  8400, net:  5300, orders:  97 },
];

function MarginChannelsPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("margin_orders")
      .select("platform, gross_revenue, net_payout, commission_rate")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const orders = data ?? [];
        if (orders.length > 0) {
          const map: Record<string, { gross: number; net: number; orders: number; rates: number[] }> = {};
          for (const o of orders) {
            if (!map[o.platform]) map[o.platform] = { gross: 0, net: 0, orders: 0, rates: [] };
            map[o.platform].gross += o.gross_revenue ?? 0;
            map[o.platform].net   += o.net_payout ?? 0;
            map[o.platform].orders++;
            if (o.commission_rate != null) map[o.platform].rates.push(o.commission_rate);
          }
          const result = Object.entries(map)
            .map(([platform, d]) => ({
              platform,
              commission: d.rates.length > 0 ? d.rates.reduce((a, b) => a + b, 0) / d.rates.length : 0,
              gross: d.gross,
              net: d.net,
              orders: d.orders,
            }))
            .sort((a, b) => (b.net / (b.gross || 1)) - (a.net / (a.gross || 1)));
          setChannels(result);
        }
        setLoading(false);
      });
  }, [user?.id]);

  const hasRealData = channels.length > 0;
  const displayChannels = hasRealData ? channels : DEMO_CHANNELS;

  return (
    <MarginLayout title="Channel breakdown" subtitle="Net margin per aggregator after commission and costs">
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#8AAF98" }}>Loading…</div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayChannels.map(c => (
              <ChannelRow key={c.platform} {...c} isDemo={!hasRealData} />
            ))}
          </div>

          {!hasRealData && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 12, padding: "32px 36px", textAlign: "center", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Layers size={20} color={BRAND} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0F1A15", marginBottom: 8 }}>No channel data yet</div>
                <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.6, marginBottom: 20 }}>
                  Upload your first payout CSV to see real margin broken down per aggregator channel.
                </div>
                <Link
                  to="/margin-dashboard/upload"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `linear-gradient(135deg, ${BRAND}, #059669)`, color: "#FFFFFF", fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 8, textDecoration: "none" }}
                >
                  <Upload size={13} /> Upload payout CSV <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </MarginLayout>
  );
}
