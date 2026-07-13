import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  RefreshCw,
  Zap,
  Settings2,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ProductRepricingCard } from "@/components/dashboard/pricing/ProductRepricingCard";
import type { RepricingProduct } from "@/routes/api/repricing/catalog";

// Re-export PricingDecision shape so RecommendationCard can import it from this
// module (it was referencing this path before the route existed in main).
export type PricingDecision = {
  id: string;
  recommendation_id: string;
  decision: "applied" | "dismissed" | "snoozed";
  snooze_until: string | null;
  created_at: string;
};

// ─── Auto-apply settings (stored in localStorage) ────────────────────────────

const AUTO_APPLY_KEY = "ps_repricing_auto_apply";
const AUTO_THRESHOLD_KEY = "ps_repricing_threshold";

function loadAutoSettings(): { enabled: boolean; threshold: number } {
  if (typeof window === "undefined") return { enabled: false, threshold: 15 };
  return {
    enabled: localStorage.getItem(AUTO_APPLY_KEY) === "true",
    threshold: Number(localStorage.getItem(AUTO_THRESHOLD_KEY) ?? "15"),
  };
}

function saveAutoSettings(enabled: boolean, threshold: number) {
  localStorage.setItem(AUTO_APPLY_KEY, String(enabled));
  localStorage.setItem(AUTO_THRESHOLD_KEY, String(threshold));
}

// ─── Stats bar ───────────────────────────────────────────────────────────────

function StatsBar({ products }: { products: RepricingProduct[] }) {
  const pushed   = products.filter(p => p.status === "repriced").length;
  const breached = products.filter(p => p.floor_breached).length;
  const pending  = products.filter(p => p.status !== "repriced").length;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {[
        { label: "Total products", value: products.length, color: "#1A1A18" },
        { label: "Repriced",       value: pushed,           color: "#22C55E" },
        { label: "Pending",        value: pending,          color: "#F59E0B" },
        { label: "Below floor",    value: breached,         color: "#EF4444" },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            flex: "1 1 120px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Auto-apply settings panel ───────────────────────────────────────────────

function AutoApplyPanel({
  enabled,
  threshold,
  onToggle,
  onThresholdChange,
  products,
  onApplyAll,
  applyingAll,
}: {
  enabled: boolean;
  threshold: number;
  onToggle: () => void;
  onThresholdChange: (v: number) => void;
  products: RepricingProduct[];
  onApplyAll: () => void;
  applyingAll: boolean;
}) {
  const qualifying = products.filter(
    p => p.status !== "repriced" &&
      Math.round(Math.min(100, Math.max(0, (p.net_margin_pct ?? 0) * 100))) >= threshold,
  ).length;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Settings2 size={16} color="#6B6B6B" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Auto-apply settings</div>
            <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 2 }}>
              Highlight qualifying products and apply them in one click.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onApplyAll}
          disabled={applyingAll || qualifying === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            backgroundColor: qualifying > 0 && !applyingAll ? "#EA580C" : "#E5E2DB",
            color: qualifying > 0 && !applyingAll ? "#FFFFFF" : "#9A9A9A",
            cursor: applyingAll || qualifying === 0 ? "not-allowed" : "pointer",
            transition: "background-color 150ms",
          }}
        >
          <Zap size={13} />
          {applyingAll ? "Applying…" : `Apply all (${qualifying})`}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {/* Auto-highlight toggle */}
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
        >
          <div
            onClick={onToggle}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              backgroundColor: enabled ? "#22C55E" : "#D1D5DB",
              position: "relative",
              cursor: "pointer",
              transition: "background-color 200ms",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: enabled ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 200ms",
              }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>
            Highlight qualifying products
          </span>
        </label>

        {/* Margin threshold slider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 12, color: "#6B6B6B", whiteSpace: "nowrap" }}>
            Min margin:
          </span>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={threshold}
            onChange={e => onThresholdChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#EA580C" }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#EA580C",
              minWidth: 36,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {threshold}%
          </span>
        </div>
      </div>

      {qualifying > 0 && (
        <div
          style={{
            fontSize: 12,
            color: "#15803D",
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 6,
            padding: "6px 12px",
          }}
        >
          <CheckCircle2 size={13} />
          {qualifying} product{qualifying === 1 ? "" : "s"} qualify for one-click apply (margin ≥ {threshold}%)
        </div>
      )}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

function PricingPage() {
  const [products, setProducts]         = useState<RepricingProduct[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [applyingAll, setApplyingAll]   = useState(false);
  const [autoEnabled, setAutoEnabled]   = useState(false);
  const [threshold, setThreshold]       = useState(15);

  useEffect(() => {
    const { enabled, threshold: t } = loadAutoSettings();
    setAutoEnabled(enabled);
    setThreshold(t);
  }, []);

  async function loadProducts() {
    const merchantId  = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode  = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({ merchant_id: merchantId, access_code: accessCode });
    try {
      const res  = await fetch(`/api/repricing/catalog?${params}`);
      const data = await res.json() as { products?: RepricingProduct[]; error?: string };
      setProducts(data.products ?? []);
    } catch {
      toast.error("Could not load pricing catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setLoading(true);
    await loadProducts();
    setRefreshing(false);
  }

  function handleToggleAuto() {
    const next = !autoEnabled;
    setAutoEnabled(next);
    saveAutoSettings(next, threshold);
  }

  function handleThresholdChange(v: number) {
    setThreshold(v);
    saveAutoSettings(autoEnabled, v);
  }

  async function handleApplyAll() {
    const merchantId  = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode  = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) return;

    const qualifying = products.filter(
      p => p.status !== "repriced" &&
        Math.round(Math.min(100, Math.max(0, (p.net_margin_pct ?? 0) * 100))) >= threshold,
    );

    if (qualifying.length === 0) {
      toast("No products qualify at the current margin threshold.");
      return;
    }

    setApplyingAll(true);
    let pushed = 0;
    let failed = 0;

    for (const product of qualifying) {
      try {
        const res = await fetch("/api/repricing/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            ingest_event_id: product.ingest_event_id,
            target_price: product.recommended_price,
          }),
        });
        const data = await res.json() as { ok?: boolean };
        if (data.ok) pushed++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setApplyingAll(false);

    if (pushed > 0) {
      toast.success(`${pushed} price${pushed === 1 ? "" : "s"} pushed successfully.`);
    }
    if (failed > 0) {
      toast.error(`${failed} product${failed === 1 ? "" : "s"} failed — check platform connection.`);
    }

    await loadProducts();
  }

  const pendingCount = products.filter(p => p.status !== "repriced").length;

  return (
    <DashboardLayout
      title="Repricing"
      subtitle="Push AI-recommended or custom prices directly to your connected stores."
      helpItems={[
        "Products are sourced from your connected Salla or Zid catalog. Connect channels from Settings → Channels.",
        "The margin % circle shows the engine's calculated net margin. Red means below floor; yellow means marginal.",
        "Use Override to enter any price before pushing, or click Push to apply the recommended price.",
        "Apply All pushes all products above your margin threshold in one operation.",
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stats bar */}
        {products.length > 0 && <StatsBar products={products} />}

        {/* Auto-apply settings panel */}
        {products.length > 0 && (
          <AutoApplyPanel
            enabled={autoEnabled}
            threshold={threshold}
            onToggle={handleToggleAuto}
            onThresholdChange={handleThresholdChange}
            products={products}
            onApplyAll={handleApplyAll}
            applyingAll={applyingAll}
          />
        )}

        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          {pendingCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B6B6B" }}>
              <AlertCircle size={14} color="#F59E0B" />
              {pendingCount} product{pendingCount === 1 ? "" : "s"} pending review
            </div>
          )}
          <div style={{ marginInlineStart: "auto" }}>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid #E5E2DB",
                backgroundColor: "#FFFFFF",
                color: "#1A1A18",
                fontSize: 12,
                fontWeight: 500,
                cursor: refreshing || loading ? "wait" : "pointer",
                opacity: refreshing || loading ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={13}
                style={{ animation: refreshing ? "ps-spin 0.8s linear infinite" : "none" }}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Product list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 120,
                  borderRadius: 10,
                  backgroundColor: "#F5F4F1",
                  animation: "ps-pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              borderRadius: 10,
            }}
          >
            <EmptyState
              icon={<ShoppingBag size={20} strokeWidth={1.75} />}
              title="No products yet"
              description="Connect your Salla or Zid store from Settings → Channels. Once connected, your product catalog will appear here with AI pricing recommendations."
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {products.map(product => (
              <ProductRepricingCard
                key={product.ingest_event_id}
                product={product}
                autoApplyThreshold={autoEnabled ? threshold : null}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ps-spin   { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes ps-pulse  { 0%, 100% { opacity: 0.5 } 50% { opacity: 1 } }
      `}</style>
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/dashboard/pricing")({
  head: () => ({ meta: [{ title: "Repricing | PrizeSkout" }] }),
  component: PricingPage,
});
