import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Upload, ArrowRight, Info } from "lucide-react";
import { MarginLayout } from "@/components/margin/MarginLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/margin-dashboard/items")({
  component: MarginItemsPage,
});

const BRAND = "#10B981";

type ItemData = {
  name: string;
  revenue: number;
  netRevenue: number;
  netMargin: number;
  orders: number;
  verdict: "keep" | "review" | "drop";
};

const VERDICT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  keep:   { bg: "rgba(16,185,129,0.1)",  color: BRAND,     label: "Profitable" },
  review: { bg: "rgba(234,179,8,0.1)",   color: "#CA8A04", label: "Review price" },
  drop:   { bg: "rgba(239,68,68,0.1)",   color: "#DC2626", label: "Margin negative" },
};

function verdictFor(margin: number): "keep" | "review" | "drop" {
  if (margin >= 0.18) return "keep";
  if (margin >= 0.05) return "review";
  return "drop";
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-QA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ItemRow({ name, revenue, netMargin, orders, verdict, isDemo }: ItemData & { isDemo?: boolean }) {
  const v = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.review;
  const barWidth = Math.max(0, Math.min(100, netMargin * 100 * 2));

  return (
    <div
      style={{
        background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10,
        padding: "16px 20px", display: "grid",
        gridTemplateColumns: "1fr 80px 120px 130px",
        alignItems: "center", gap: 20,
        filter: isDemo ? "blur(3px)" : "none",
        userSelect: isDemo ? "none" : "auto",
        pointerEvents: isDemo ? "none" : "auto",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15", marginBottom: 6 }}>{name}</div>
        <div style={{ height: 4, background: "#F0F5F2", borderRadius: 2, overflow: "hidden", width: 140 }}>
          <div style={{ width: `${barWidth}%`, height: "100%", background: netMargin < 0 ? "#EF4444" : netMargin < 0.12 ? "#F59E0B" : BRAND, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Orders</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1A15" }}>{orders}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Net revenue</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1A15" }}>QAR {fmt(revenue)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 11, fontWeight: 700, background: v.bg, color: v.color, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.04em" }}>
          {v.label}
        </span>
        <div style={{ fontSize: 12, fontWeight: 700, color: netMargin < 0 ? "#DC2626" : "#0F1A15", marginTop: 5 }}>
          {(netMargin * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

const DEMO_ITEMS: ItemData[] = [
  { name: "Chicken Shawarma", revenue: 4200, netRevenue: 1302, netMargin: 0.31, orders: 187, verdict: "keep"   },
  { name: "Grilled Salmon",   revenue: 3800, netRevenue:  912, netMargin: 0.24, orders:  94, verdict: "keep"   },
  { name: "Veggie Burger",    revenue: 1900, netRevenue:  342, netMargin: 0.18, orders: 112, verdict: "review" },
  { name: "Mixed Salad",      revenue:  940, netRevenue:   85, netMargin: 0.09, orders:  76, verdict: "review" },
  { name: "Kids Meal Bundle", revenue: 1200, netRevenue:   36, netMargin: 0.03, orders:  98, verdict: "drop"   },
  { name: "Family Platter",   revenue: 2100, netRevenue:  -84, netMargin:-0.04, orders:  43, verdict: "drop"   },
];

function MarginItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemData[]>([]);
  const [hasOrders, setHasOrders] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("margin_orders")
      .select("items, gross_revenue, net_payout")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const orders = data ?? [];
        setHasOrders(orders.length > 0);

        if (orders.length > 0) {
          const map: Record<string, { gross: number; net: number; qty: number }> = {};
          for (const o of orders) {
            const orderItems = (o.items ?? []) as Array<{ name: string; qty: number; unit_price: number }>;
            const netRatio = (o.gross_revenue ?? 0) > 0 ? (o.net_payout ?? 0) / (o.gross_revenue ?? 1) : 0;
            for (const item of orderItems) {
              const key = item.name || "Unknown item";
              if (!map[key]) map[key] = { gross: 0, net: 0, qty: 0 };
              const itemGross = (item.unit_price ?? 0) * (item.qty ?? 1);
              map[key].gross += itemGross;
              map[key].net   += itemGross * netRatio;
              map[key].qty   += item.qty ?? 1;
            }
          }

          const result: ItemData[] = Object.entries(map)
            .filter(([, d]) => d.gross > 0)
            .map(([name, d]) => {
              const netMargin = d.gross > 0 ? d.net / d.gross : 0;
              return { name, revenue: d.gross, netRevenue: d.net, netMargin, orders: d.qty, verdict: verdictFor(netMargin) };
            })
            .sort((a, b) => b.netMargin - a.netMargin);

          setItems(result);
        }
        setLoading(false);
      });
  }, [user?.id]);

  const hasItemData = items.length > 0;

  return (
    <MarginLayout title="Item profitability" subtitle="Which items make money and which ones don't, after all costs">
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#8AAF98" }}>Loading…</div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 130px", gap: 20, padding: "0 20px 10px", fontSize: 11, fontWeight: 600, color: "#8AAF98", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Item</span>
            <span style={{ textAlign: "right" }}>Orders</span>
            <span style={{ textAlign: "right" }}>Net revenue</span>
            <span style={{ textAlign: "right" }}>Margin</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(hasItemData ? items : DEMO_ITEMS).map(item => (
              <ItemRow key={item.name} {...item} isDemo={!hasItemData} />
            ))}
          </div>

          {/* No orders at all: blurred overlay */}
          {!hasOrders && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 12, padding: "32px 36px", textAlign: "center", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Package size={20} color={BRAND} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0F1A15", marginBottom: 8 }}>No item data yet</div>
                <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.6, marginBottom: 20 }}>
                  Upload a payout CSV to see every item ranked by true net margin after commission, packaging, and prep costs.
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

          {/* Orders exist but CSV had no item column */}
          {hasOrders && !hasItemData && (
            <div style={{ marginTop: 20, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.65 }}>
                <strong>Your CSV does not contain item-level data.</strong> Most aggregator payout exports are order-level only.
                For per-item margin analysis, export an order detail report from your portal, or use the <strong>Other</strong> platform
                format with a column named <code style={{ background: "#FEF3C7", padding: "1px 4px", borderRadius: 3 }}>item</code> or{" "}
                <code style={{ background: "#FEF3C7", padding: "1px 4px", borderRadius: 3 }}>product</code>.
              </div>
            </div>
          )}
        </div>
      )}
    </MarginLayout>
  );
}
