import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";

type ActivePolicy = {
  marginFloorPct: number;
  maxPriceIncreasePct: number;
  approvalMode: "recommend_only" | "approval_required" | "auto_within_guardrails";
  version: number;
};

const modeLabel: Record<ActivePolicy["approvalMode"], string> = {
  recommend_only: "Show suggestions — you update prices",
  approval_required: "Ask before every price change",
  auto_within_guardrails: "Update automatically within your limit",
};

export function MarginRulesTab() {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<ActivePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) {
      setError("Connect a store before setting a margin policy.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, access_code: accessCode, platform: "margin_floor", action: "get" }),
    })
      .then(async response => {
        const data = await response.json() as { policy?: ActivePolicy; error?: string };
        if (!response.ok || !data.policy) throw new Error(data.error ?? "The active policy could not be loaded.");
        if (!cancelled) setPolicy(data.policy);
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "The active policy could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ maxWidth: 650 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>{t("settingsTabs.marginRules.heading")}</h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.7 }}>
        Your active Margin Policy Engine settings are shown here. Change them in the engine so every product, alert, and price decision uses the same rule.
      </p>

      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px" }}>
        {loading ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading the active policy…</div>
        ) : error ? (
          <div role="alert" style={{ color: "#B42318", fontSize: 13 }}>{error}</div>
        ) : policy ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Minimum to keep from each sale</div>
                <div style={{ marginTop: 3, fontSize: 30, fontWeight: 800, color: OG }}>{Math.round(policy.marginFloorPct * 100)}%</div>
              </div>
              <span style={{ color: "#087F5B", fontWeight: 800, fontSize: 12 }}>ACTIVE · VERSION {policy.version}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 18 }}>
              <div style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)" }}>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Largest price increase allowed</div>
                <strong style={{ display: "block", marginTop: 4 }}>{Math.round(policy.maxPriceIncreasePct * 100)}%</strong>
              </div>
              <div style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)" }}>
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>How price changes are handled</div>
                <strong style={{ display: "block", marginTop: 4 }}>{modeLabel[policy.approvalMode]}</strong>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <a href="/dashboard/revenue-hub" style={{ marginTop: 16, display: "inline-flex", padding: "11px 16px", borderRadius: 9, background: OG, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
        Open Margin Policy Engine
      </a>
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginTop: 12 }}>
        Category-specific rules are not active yet. PrizeSkout will not display or save category overrides until they are enforced by the pricing engine.
      </p>
    </div>
  );
}
