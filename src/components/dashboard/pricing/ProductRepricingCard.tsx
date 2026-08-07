import { useState } from "react";
import { ArrowRight, Check, AlertTriangle, Loader2, RotateCcw, Edit3 } from "lucide-react";
import { toast } from "sonner";
import type { RepricingProduct } from "@/routes/api/repricing/catalog";

type PushStatus = "idle" | "pushing" | "pushed" | "failed";

function platformLabel(platform: string) {
  const map: Record<string, string> = {
    salla: "Salla",
    zid: "Zid",
    foodics: "Foodics",
    talabat: "Talabat",
    jahez: "Jahez",
  };
  return map[platform] ?? platform;
}

function platformColor(platform: string) {
  const map: Record<string, string> = {
    salla: "#5B21B6",
    zid: "#0EA5E9",
    foodics: "#DC2626",
    talabat: "#F97316",
    jahez: "#16A34A",
  };
  return map[platform] ?? "#6B6B6B";
}

function formatPrice(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function priceDelta(current: number, target: number) {
  if (current === 0) return null;
  const pct = ((target - current) / current) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function ProductRepricingCard({
  product,
  autoApplyThreshold,
}: {
  product: RepricingProduct;
  autoApplyThreshold: number | null;
}) {
  const alreadyRepriced = product.status === "repriced";
  const [pushStatus, setPushStatus] = useState<PushStatus>(alreadyRepriced ? "pushed" : "idle");
  const [overrideRaw, setOverrideRaw] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(
    alreadyRepriced ? product.current_price : null,
  );

  const overridePrice = overrideRaw !== "" ? parseFloat(overrideRaw) : null;
  const targetPrice =
    overridePrice !== null && !isNaN(overridePrice) ? overridePrice : product.recommended_price;

  const delta = priceDelta(product.current_price, targetPrice);
  const isDecrease = targetPrice < product.current_price;

  const confidencePct =
    product.net_margin_pct != null
      ? Math.round(Math.min(100, Math.max(0, product.net_margin_pct * 100)))
      : null;

  const qualifiesForAutoApply =
    autoApplyThreshold !== null && confidencePct !== null && confidencePct >= autoApplyThreshold;

  async function handleApply() {
    const merchantId =
      typeof window !== "undefined" ? (localStorage.getItem("ps_merchant_id") ?? "") : "";
    const accessCode =
      typeof window !== "undefined" ? (localStorage.getItem("ps_access_code") ?? "") : "";

    if (!merchantId || !accessCode) {
      toast.error("Session not found — please reconnect your store.");
      return;
    }

    if (overridePrice !== null && (isNaN(overridePrice) || overridePrice <= 0)) {
      toast.error("Enter a valid price (must be greater than 0).");
      return;
    }

    setPushStatus("pushing");
    try {
      const res = await fetch("/api/repricing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          access_code: accessCode,
          ingest_event_id: product.ingest_event_id,
          target_price: targetPrice,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        platform?: string;
        downstream?: { message: string } | null;
      };

      if (data.ok) {
        setPushStatus("pushed");
        setLastPrice(targetPrice);
        const label =
          overridePrice !== null
            ? `Your price is now live on ${platformLabel(product.source_platform)}`
            : `The recommended price is now live on ${platformLabel(product.source_platform)}`;
        toast.success(data.downstream ? `${label}. ${data.downstream.message}` : label);
        setShowOverride(false);
        setOverrideRaw("");
      } else {
        setPushStatus("failed");
        toast.error(data.error ?? data.message ?? "Push failed — try again.");
      }
    } catch {
      setPushStatus("failed");
      toast.error("Network error — check your connection.");
    }
  }

  const cardBorder =
    pushStatus === "pushed"
      ? "#22C55E"
      : pushStatus === "failed"
        ? "#EF4444"
        : product.floor_breached
          ? "#F59E0B"
          : "#E5E2DB";

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: `1px solid ${cardBorder}`,
        borderRadius: 10,
        padding: "18px 22px",
        transition: "border-color 200ms ease",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", wordBreak: "break-word" }}>
            {product.name_en || product.sku}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 20,
                backgroundColor: platformColor(product.source_platform) + "18",
                color: platformColor(product.source_platform),
              }}
            >
              {platformLabel(product.source_platform)}
            </span>
            {product.sku && (
              <span style={{ fontSize: 10, color: "#9A9A9A", fontFamily: "monospace" }}>
                {product.sku}
              </span>
            )}
            {product.floor_breached && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  backgroundColor: "rgba(245,158,11,0.1)",
                  color: "#B45309",
                }}
              >
                <AlertTriangle size={10} />
                Below your protected margin
              </span>
            )}
            {qualifiesForAutoApply && pushStatus === "idle" && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 20,
                  backgroundColor: "rgba(34,197,94,0.1)",
                  color: "#15803D",
                }}
              >
                Can be handled automatically
              </span>
            )}
          </div>
        </div>

        {/* Margin % indicator */}
        {confidencePct !== null && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: `3px solid ${confidencePct >= 15 ? "#22C55E" : confidencePct >= 8 ? "#F59E0B" : "#EF4444"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: confidencePct >= 15 ? "#22C55E" : confidencePct >= 8 ? "#F59E0B" : "#EF4444",
              }}
            >
              {confidencePct}%
            </div>
            <div style={{ fontSize: 9, color: "#9A9A9A", marginTop: 3 }}>margin</div>
          </div>
        )}
      </div>

      {/* ── Price row ── */}
      <div
        style={{
          marginTop: 14,
          backgroundColor: "#FAFAF9",
          borderRadius: 8,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Current price */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "#9A9A9A",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Current
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: "#9A9A9A",
              textDecoration: "line-through",
              marginTop: 2,
            }}
          >
            {formatPrice(product.current_price, product.currency)}
          </div>
        </div>

        <ArrowRight size={16} color="#C4C1BB" />

        {/* Recommended / override price */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: overridePrice !== null ? "#3B82F6" : "#22C55E",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {overridePrice !== null ? "Your price" : "Recommended"}
          </div>
          {showOverride ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#6B6B6B" }}>
                {product.currency}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={overrideRaw}
                onChange={(e) => setOverrideRaw(e.target.value)}
                placeholder={String(product.recommended_price)}
                autoFocus
                style={{
                  width: 90,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1A1A18",
                  border: "1px solid #3B82F6",
                  borderRadius: 6,
                  padding: "4px 8px",
                  outline: "none",
                  background: "#FFFFFF",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: overridePrice !== null ? "#3B82F6" : "#22C55E",
                marginTop: 2,
              }}
            >
              {formatPrice(targetPrice, product.currency)}
            </div>
          )}
        </div>

        {/* Delta */}
        {delta && (
          <>
            <div style={{ width: 1, height: 36, backgroundColor: "#E5E2DB", flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#9A9A9A",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Change
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isDecrease ? "#EF4444" : "#22C55E",
                  marginTop: 2,
                }}
              >
                {delta}
              </div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div
          style={{
            marginInlineStart: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {pushStatus === "pushed" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#22C55E",
                }}
              >
                <Check size={13} />
                Confirmed in {platformLabel(product.source_platform)}
                {lastPrice !== null && ` · ${formatPrice(lastPrice, product.currency)}`}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPushStatus("idle");
                  setLastPrice(null);
                }}
                title="Change price again"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "6px 10px",
                  borderRadius: 7,
                  border: "1px solid #E5E2DB",
                  backgroundColor: "transparent",
                  color: "#6B6B6B",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={11} />
                Change price again
              </button>
            </>
          )}

          {pushStatus === "failed" && (
            <button
              type="button"
              onClick={handleApply}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #EF4444",
                backgroundColor: "rgba(239,68,68,0.06)",
                color: "#DC2626",
                cursor: "pointer",
              }}
            >
              Retry push
            </button>
          )}

          {(pushStatus === "idle" || pushStatus === "pushing") && (
            <>
              {/* Override price toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowOverride((v) => !v);
                  if (showOverride) setOverrideRaw("");
                }}
                title={showOverride ? "Use recommended price" : "Enter a custom price"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "6px 10px",
                  borderRadius: 7,
                  border: `1px solid ${showOverride ? "#3B82F6" : "#E5E2DB"}`,
                  backgroundColor: showOverride ? "rgba(59,130,246,0.06)" : "transparent",
                  color: showOverride ? "#2563EB" : "#6B6B6B",
                  cursor: "pointer",
                }}
              >
                <Edit3 size={11} />
                {showOverride ? "Use recommended" : "Choose my own price"}
              </button>

              {/* Apply button */}
              <button
                type="button"
                onClick={handleApply}
                disabled={pushStatus === "pushing"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: pushStatus === "pushing" ? "#9A9A9A" : "#EA580C",
                  color: "#FFFFFF",
                  cursor: pushStatus === "pushing" ? "wait" : "pointer",
                  opacity: pushStatus === "pushing" ? 0.7 : 1,
                  transition: "opacity 150ms, background-color 150ms",
                }}
              >
                {pushStatus === "pushing" ? (
                  <>
                    <Loader2 size={13} style={{ animation: "ps-spin 0.8s linear infinite" }} />
                    Pushing…
                  </>
                ) : (
                  `Push to ${platformLabel(product.source_platform)}`
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes ps-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
