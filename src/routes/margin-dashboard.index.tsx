import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload, Layers, Package, ArrowRight, TrendingDown, AlertCircle } from "lucide-react";
import { MarginLayout } from "@/components/margin/MarginLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/margin-dashboard/")({
  component: MarginOverviewPage,
});

const BRAND = "#10B981";

type UploadRow = { id: string; platform: string; status: string; created_at: string; row_count: number | null };
type Metrics = {
  totalPayout: number;
  avgCommRate: number | null;
  netMargin: number | null;
  orderCount: number;
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-QA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function MetricCard({ label, value, sub, color = "#0F1A15" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#8AAF98", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ background: "#FFFFFF", border: "1px dashed #B2CFBE", borderRadius: 12, padding: "56px 32px", textAlign: "center", maxWidth: 560, margin: "40px auto" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
        <Upload size={22} color={BRAND} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0F1A15", marginBottom: 10 }}>
        Upload your first payout CSV
      </div>
      <div style={{ fontSize: 14, color: "#5A7A68", lineHeight: 1.65, maxWidth: 420, margin: "0 auto 28px" }}>
        Download your payout statement from Talabat Partner, Snoonu, Noon Seller Central,
        or Amazon.ae and upload it here. Your real margin numbers will appear in minutes.
      </div>
      <Link
        to="/margin-dashboard/upload"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `linear-gradient(135deg, ${BRAND}, #059669)`,
          color: "#FFFFFF", fontSize: 14, fontWeight: 700,
          padding: "11px 20px", borderRadius: 8, textDecoration: "none",
        }}
      >
        Upload payout CSV <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function MarginOverviewPage() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      supabase
        .from("margin_uploads")
        .select("id, platform, status, created_at, row_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("margin_orders")
        .select("gross_revenue, net_payout, commission_rate")
        .eq("user_id", user.id),
    ]).then(([uploadsRes, ordersRes]) => {
      setUploads(uploadsRes.data ?? []);

      const orders = ordersRes.data ?? [];
      if (orders.length > 0) {
        const totalPayout = orders.reduce((s, o) => s + (o.net_payout ?? 0), 0);
        const totalGross  = orders.reduce((s, o) => s + (o.gross_revenue ?? 0), 0);
        const ratesWithData = orders.filter(o => o.commission_rate != null);
        const avgCommRate = ratesWithData.length > 0
          ? ratesWithData.reduce((s, o) => s + (o.commission_rate ?? 0), 0) / ratesWithData.length
          : null;
        const netMargin = totalGross > 0 ? totalPayout / totalGross : null;
        setMetrics({ totalPayout, avgCommRate, netMargin, orderCount: orders.length });
      }

      setLoading(false);
    });
  }, [user?.id]);

  const hasData = metrics !== null;

  return (
    <MarginLayout
      title="Overview"
      subtitle="Your aggregator channel margin at a glance"
      action={
        <Link
          to="/margin-dashboard/upload"
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: `linear-gradient(135deg, ${BRAND}, #059669)`,
            color: "#FFFFFF", fontSize: 13, fontWeight: 700,
            padding: "9px 16px", borderRadius: 8, textDecoration: "none",
          }}
        >
          <Upload size={13} /> Upload CSV
        </Link>
      }
    >
      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard
          label="Total payout received"
          value={metrics ? `QAR ${fmt(metrics.totalPayout)}` : "—"}
          sub={metrics ? undefined : "Upload data to see"}
        />
        <MetricCard
          label="Avg commission rate"
          value={metrics?.avgCommRate != null ? `${fmt(metrics.avgCommRate * 100, 1)}%` : "—"}
          sub={metrics ? (metrics.avgCommRate == null ? "Not in your CSV" : undefined) : "Upload data to see"}
          color={metrics?.avgCommRate != null ? "#EF4444" : "#0F1A15"}
        />
        <MetricCard
          label="Net margin (blended)"
          value={metrics?.netMargin != null ? `${fmt(metrics.netMargin * 100, 1)}%` : "—"}
          sub={metrics ? (metrics.netMargin == null ? "Add commission data" : undefined) : "Upload data to see"}
          color={metrics?.netMargin != null ? (metrics.netMargin < 0.15 ? "#EF4444" : BRAND) : "#0F1A15"}
        />
        <MetricCard
          label="Orders analysed"
          value={metrics ? fmt(metrics.orderCount) : "—"}
          sub={metrics ? undefined : "Upload data to see"}
        />
      </div>

      {/* Main content */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#8AAF98" }}>Loading…</div>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: 22 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0F1A15", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={15} color={BRAND} /> Channel breakdown
            </div>
            <div style={{ fontSize: 13, color: "#5A7A68", marginBottom: 14 }}>
              Net margin per aggregator after commission and costs.
            </div>
            <Link to="/margin-dashboard/channels" style={{ fontSize: 13, color: BRAND, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              View all channels <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: 22 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0F1A15", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Package size={15} color={BRAND} /> Item profitability
            </div>
            <div style={{ fontSize: 13, color: "#5A7A68", marginBottom: 14 }}>
              Which items make money and which don't.
            </div>
            <Link to="/margin-dashboard/items" style={{ fontSize: 13, color: BRAND, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              View all items <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* Recent uploads */}
      {uploads.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5A7A68", marginBottom: 10 }}>Recent uploads</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uploads.map(u => (
              <div
                key={u.id}
                style={{
                  background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 8,
                  padding: "12px 16px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {u.status === "error"
                    ? <AlertCircle size={14} color="#EF4444" />
                    : u.status === "done"
                    ? <TrendingDown size={14} color={BRAND} />
                    : <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${BRAND}`, borderTopColor: "transparent", animation: "marginSpin 0.8s linear infinite" }} />
                  }
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F1A15", textTransform: "capitalize" }}>
                      {u.platform.replace("_", ".")}
                    </div>
                    {u.row_count != null && <div style={{ fontSize: 11, color: "#8AAF98" }}>{u.row_count} orders</div>}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#8AAF98" }}>{new Date(u.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes marginSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </MarginLayout>
  );
}
