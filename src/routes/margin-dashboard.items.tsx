import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Upload, ArrowRight } from "lucide-react";
import { MarginLayout } from "@/components/margin/MarginLayout";

export const Route = createFileRoute("/margin-dashboard/items")({
  component: MarginItemsPage,
});

const BRAND = "#10B981";

const DEMO_ITEMS = [
  { name: "Chicken Shawarma",    revenue: 4200, netMargin: 0.31, orders: 187, verdict: "keep"   },
  { name: "Grilled Salmon",      revenue: 3800, netMargin: 0.24, orders:  94, verdict: "keep"   },
  { name: "Veggie Burger",       revenue: 1900, netMargin: 0.18, orders: 112, verdict: "review" },
  { name: "Mixed Salad",         revenue:  940, netMargin: 0.09, orders:  76, verdict: "review" },
  { name: "Kids Meal Bundle",    revenue: 1200, netMargin: 0.03, orders:  98, verdict: "drop"   },
  { name: "Family Platter",      revenue: 2100, netMargin:-0.04, orders:  43, verdict: "drop"   },
];

const VERDICT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  keep:   { bg: "rgba(16,185,129,0.1)",  color: BRAND,     label: "Profitable" },
  review: { bg: "rgba(234,179,8,0.1)",   color: "#CA8A04", label: "Review price" },
  drop:   { bg: "rgba(239,68,68,0.1)",   color: "#DC2626", label: "Margin negative" },
};

function ItemRow({
  name,
  revenue,
  netMargin,
  orders,
  verdict,
  isDemo,
}: {
  name: string;
  revenue: number;
  netMargin: number;
  orders: number;
  verdict: string;
  isDemo?: boolean;
}) {
  const v = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.review;
  const barWidth = Math.max(0, Math.min(100, netMargin * 100 * 2));

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2EDE8",
        borderRadius: 10,
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "1fr 80px 100px 110px",
        alignItems: "center",
        gap: 20,
        filter: isDemo ? "blur(3px)" : "none",
        userSelect: isDemo ? "none" : "auto",
        pointerEvents: isDemo ? "none" : "auto",
      }}
    >
      {/* Name + bar */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15", marginBottom: 6 }}>{name}</div>
        <div style={{ height: 4, background: "#F0F5F2", borderRadius: 2, overflow: "hidden", width: 140 }}>
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: netMargin < 0 ? "#EF4444" : netMargin < 0.12 ? "#F59E0B" : BRAND,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      {/* Orders */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Orders</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1A15" }}>{orders}</div>
      </div>
      {/* Revenue */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Net revenue</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1A15" }}>QAR {revenue.toLocaleString()}</div>
      </div>
      {/* Verdict */}
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: v.bg,
            color: v.color,
            padding: "4px 10px",
            borderRadius: 20,
            letterSpacing: "0.04em",
          }}
        >
          {v.label}
        </span>
        <div style={{ fontSize: 12, fontWeight: 700, color: netMargin < 0 ? "#DC2626" : "#0F1A15", marginTop: 5 }}>
          {(netMargin * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function MarginItemsPage() {
  const hasRealData = false;

  return (
    <MarginLayout
      title="Item profitability"
      subtitle="Which items make money and which ones don't — after all costs"
    >
      <div style={{ position: "relative" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 100px 110px",
            gap: 20,
            padding: "0 20px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "#8AAF98",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span>Item</span>
          <span style={{ textAlign: "right" }}>Orders</span>
          <span style={{ textAlign: "right" }}>Net revenue</span>
          <span style={{ textAlign: "right" }}>Margin</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DEMO_ITEMS.map((item) => (
            <ItemRow key={item.name} {...item} isDemo={!hasRealData} />
          ))}
        </div>

        {!hasRealData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2EDE8",
                borderRadius: 12,
                padding: "32px 36px",
                textAlign: "center",
                maxWidth: 420,
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
                <Package size={20} color={BRAND} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F1A15", marginBottom: 8 }}>
                No item data yet
              </div>
              <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.6, marginBottom: 20 }}>
                Upload a payout CSV to see every item ranked by true net margin — after
                commission, packaging, and prep costs.
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
