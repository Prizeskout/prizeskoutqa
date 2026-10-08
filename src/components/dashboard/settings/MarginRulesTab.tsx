import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";

type ActivePolicy = {
  marginFloorPct: number;
  minimumContributionAmount: number;
  maxPriceIncreasePct: number;
  approvalMode: "recommend_only" | "approval_every_change" | "auto_within_limit";
  version: number;
  overrides: Array<{
    channel: string;
    servicePath?: string;
    marginFloorPct: number;
    minimumContributionAmount: number;
    maxPriceIncreasePct: number;
    approvalMode: ActivePolicy["approvalMode"];
  }>;
};

type PolicyDraft = {
  marginFloorPct: number;
  minimumContributionAmount: number;
  maxPriceIncreasePct: number;
  approvalMode: ActivePolicy["approvalMode"];
  overrides: ActivePolicy["overrides"];
};

const modeLabel: Record<ActivePolicy["approvalMode"], string> = {
  recommend_only: "Show suggestions — you update prices",
  approval_every_change: "Ask before every price change",
  auto_within_limit: "Update automatically within your limit",
};

const inputStyle = { width: "100%", boxSizing: "border-box" as const, minHeight: 42, border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--surface)", color: "var(--text)", font: "inherit" };
const primaryButtonStyle = { border: 0, borderRadius: 9, background: OG, color: "#fff", padding: "11px 16px", minHeight: 44, fontWeight: 750, cursor: "pointer", fontFamily: "inherit" };
const secondaryButtonStyle = { border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)", color: "var(--text)", padding: "9px 13px", minHeight: 40, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const smallLabelStyle = { display: "grid", gap: 5, fontSize: 11.5, fontWeight: 700 };

function updateOverride(draft: PolicyDraft, setDraft: (value: PolicyDraft) => void, index: number, update: Partial<ActivePolicy["overrides"][number]>) {
  setDraft({ ...draft, overrides: draft.overrides.map((item, row) => row === index ? { ...item, ...update } : item) });
}

export function MarginRulesTab() {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<ActivePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const makeDraft = (value: ActivePolicy): PolicyDraft => ({
    marginFloorPct: Math.round(value.marginFloorPct * 100),
    minimumContributionAmount: Number(value.minimumContributionAmount ?? 0),
    maxPriceIncreasePct: Math.round(value.maxPriceIncreasePct * 100),
    approvalMode: value.approvalMode === "auto_within_limit" ? "approval_every_change" : value.approvalMode,
    overrides: (value.overrides ?? []).map((item) => ({
      ...item,
      servicePath: item.servicePath ?? "default",
      marginFloorPct: Math.round(item.marginFloorPct * 100),
      maxPriceIncreasePct: Math.round(item.maxPriceIncreasePct * 100),
      approvalMode: item.approvalMode === "auto_within_limit" ? "approval_every_change" : item.approvalMode,
    })),
  });

  const validateDraft = (value: PolicyDraft) => {
    if (!(value.marginFloorPct > 0 && value.marginFloorPct < 100)) return "Minimum contribution margin must be between 0% and 100%.";
    if (!(value.maxPriceIncreasePct >= 0 && value.maxPriceIncreasePct <= 100)) return "Largest price increase must be between 0% and 100%.";
    if (!(value.minimumContributionAmount >= 0)) return "Minimum cash contribution cannot be negative.";
    const channels = new Set<string>();
    for (const item of value.overrides) {
      const channel = item.channel.trim().toLowerCase();
      if (!channel) return "Every channel override needs a channel name.";
      if (channels.has(channel)) return `Only one override can be active for ${channel.toUpperCase()}.`;
      channels.add(channel);
      if (!(item.marginFloorPct > 0 && item.marginFloorPct < 100)) return `${channel.toUpperCase()} margin must be between 0% and 100%.`;
      if (!(item.maxPriceIncreasePct >= 0 && item.maxPriceIncreasePct <= 100)) return `${channel.toUpperCase()} price increase must be between 0% and 100%.`;
      if (!(item.minimumContributionAmount >= 0)) return `${channel.toUpperCase()} cash contribution cannot be negative.`;
    }
    return "";
  };

  const savePolicy = async () => {
    if (!draft || saving) return;
    const validation = validateDraft(draft);
    if (validation) return setFormError(validation);
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) return setFormError("Connect a store before changing margin rules.");
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          access_code: accessCode,
          platform: "margin_floor",
          action: "set",
          margin_floor_pct: draft.marginFloorPct / 100,
          minimum_contribution_amount: draft.minimumContributionAmount,
          max_price_increase_pct: draft.maxPriceIncreasePct / 100,
          approval_mode: draft.approvalMode,
          activated_by: "merchant dashboard",
          channel_overrides: draft.overrides.map((item) => ({
            channel: item.channel.trim().toLowerCase(),
            service_path: item.servicePath ?? "default",
            margin_floor_pct: item.marginFloorPct / 100,
            minimum_contribution_amount: item.minimumContributionAmount,
            max_price_increase_pct: item.maxPriceIncreasePct / 100,
            approval_mode: item.approvalMode,
          })),
        }),
      });
      const result = (await response.json()) as { policy?: ActivePolicy; error?: string };
      if (!response.ok || !result.policy) throw new Error(result.error ?? "The margin rules could not be activated.");
      setPolicy(result.policy);
      setDraft(makeDraft(result.policy));
      setEditing(false);
      setReviewing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The margin rules could not be activated.");
    } finally {
      setSaving(false);
    }
  };

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
      body: JSON.stringify({
        merchant_id: merchantId,
        access_code: accessCode,
        platform: "margin_floor",
        action: "get",
      }),
    })
      .then(async (response) => {
        const data = (await response.json()) as { policy?: ActivePolicy; error?: string };
        if (!response.ok || !data.policy)
          throw new Error(data.error ?? "The active policy could not be loaded.");
        if (!cancelled) {
          setPolicy(data.policy);
          setDraft(makeDraft(data.policy));
        }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : "The active policy could not be loaded.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="margin-rules" style={{ maxWidth: 650 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
        {t("settingsTabs.marginRules.heading")}
      </h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.7 }}>
        Your default margin target is shown here. You can also set a different target for each sales
        channel.
      </p>

      <div
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 22px",
        }}
      >
        {loading ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading the active policy…</div>
        ) : error ? (
          <div role="alert" style={{ color: "#B42318", fontSize: 13 }}>
            {error}
          </div>
        ) : policy ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Default minimum contribution margin
                </div>
                <div style={{ marginTop: 3, fontSize: 30, fontWeight: 800, color: OG }}>
                  {Math.round(policy.marginFloorPct * 100)}%
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  background: "var(--surface)",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  Largest price increase allowed
                </div>
                <strong style={{ display: "block", marginTop: 4 }}>
                  {Math.round(policy.maxPriceIncreasePct * 100)}%
                </strong>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  background: "var(--surface)",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  How price changes are handled
                </div>
                <strong style={{ display: "block", marginTop: 4 }}>
                  {modeLabel[policy.approvalMode]}
                </strong>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  background: "var(--surface)",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  Minimum cash contribution
                </div>
                <strong style={{ display: "block", marginTop: 4 }}>
                  {Number(policy.minimumContributionAmount ?? 0).toFixed(2)} per sale
                </strong>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 12 }}>Channel overrides</strong>
              {policy.overrides?.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {policy.overrides.map((item) => (
                    <div
                      key={item.channel}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        background: "var(--surface)",
                      }}
                    >
                      <strong>{item.channel.toUpperCase()}</strong>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                        {Math.round(item.marginFloorPct * 100)}% · minimum{" "}
                        {Number(item.minimumContributionAmount ?? 0).toFixed(2)} · max increase{" "}
                        {Math.round(item.maxPriceIncreasePct * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 7 }}>
                  No channel-specific overrides are active yet. Every channel currently inherits the
                  default policy.
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {saved && <div role="status" style={{ marginTop: 16, color: "#067647", fontWeight: 700, fontSize: 13 }}>Margin rules activated successfully.</div>}
      {!editing ? <button
        type="button"
        onClick={() => { if (policy) setDraft(makeDraft(policy)); setEditing(true); setReviewing(false); setFormError(""); }}
        disabled={!policy || loading}
        style={{
          marginTop: 16,
          display: "inline-flex",
          padding: "11px 16px",
          borderRadius: 9,
          background: OG,
          color: "#fff",
          border: 0,
          cursor: !policy || loading ? "not-allowed" : "pointer",
          opacity: !policy || loading ? .55 : 1,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        Change margin rules
      </button> : draft ? <div style={{ marginTop: 18, border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: "var(--surface)" }}>
        <h4 style={{ margin: 0, fontSize: 15 }}>Change margin rules</h4>
        <p style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.6 }}>These rules guide recommendations. No store price changes happen from this form.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Minimum contribution margin (%)<input aria-label="Minimum contribution margin" type="number" min="0.01" max="99.99" step="0.1" value={draft.marginFloorPct} onChange={(event) => setDraft({ ...draft, marginFloorPct: Number(event.target.value) })} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Largest price increase (%)<input aria-label="Largest price increase" type="number" min="0" max="100" step="0.1" value={draft.maxPriceIncreasePct} onChange={(event) => setDraft({ ...draft, maxPriceIncreasePct: Number(event.target.value) })} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Minimum cash contribution<input aria-label="Minimum cash contribution" type="number" min="0" step="0.01" value={draft.minimumContributionAmount} onChange={(event) => setDraft({ ...draft, minimumContributionAmount: Number(event.target.value) })} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>How price changes are handled<select aria-label="How price changes are handled" value={draft.approvalMode} onChange={(event) => setDraft({ ...draft, approvalMode: event.target.value as ActivePolicy["approvalMode"] })} style={inputStyle}><option value="approval_every_change">Ask before every price change</option><option value="recommend_only">Show suggestions only</option></select></label>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong style={{ fontSize: 13 }}>Channel overrides</strong><button type="button" onClick={() => setDraft({ ...draft, overrides: [...draft.overrides, { channel: "", servicePath: "default", marginFloorPct: draft.marginFloorPct, minimumContributionAmount: draft.minimumContributionAmount, maxPriceIncreasePct: draft.maxPriceIncreasePct, approvalMode: draft.approvalMode }] })} style={secondaryButtonStyle}>Add channel override</button></div>
          {draft.overrides.map((item, index) => <div key={`${item.channel}-${index}`} style={{ marginTop: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface2)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <label style={smallLabelStyle}>Channel<input aria-label={`Override ${index + 1} channel`} list="margin-rule-channels" value={item.channel} onChange={(event) => updateOverride(draft, setDraft, index, { channel: event.target.value })} style={inputStyle} /></label>
              <label style={smallLabelStyle}>Margin (%)<input aria-label={`Override ${index + 1} margin`} type="number" min="0.01" max="99.99" step="0.1" value={item.marginFloorPct} onChange={(event) => updateOverride(draft, setDraft, index, { marginFloorPct: Number(event.target.value) })} style={inputStyle} /></label>
              <label style={smallLabelStyle}>Max increase (%)<input aria-label={`Override ${index + 1} maximum increase`} type="number" min="0" max="100" step="0.1" value={item.maxPriceIncreasePct} onChange={(event) => updateOverride(draft, setDraft, index, { maxPriceIncreasePct: Number(event.target.value) })} style={inputStyle} /></label>
              <label style={smallLabelStyle}>Cash contribution<input aria-label={`Override ${index + 1} cash contribution`} type="number" min="0" step="0.01" value={item.minimumContributionAmount} onChange={(event) => updateOverride(draft, setDraft, index, { minimumContributionAmount: Number(event.target.value) })} style={inputStyle} /></label>
            </div>
            <button type="button" onClick={() => setDraft({ ...draft, overrides: draft.overrides.filter((_, row) => row !== index) })} style={{ ...secondaryButtonStyle, marginTop: 10, color: "#B42318" }}>Remove override</button>
          </div>)}
          <datalist id="margin-rule-channels"><option value="zid" /><option value="salla" /><option value="foodics" /><option value="talabat" /><option value="jahez" /><option value="snoonu" /><option value="keeta" /><option value="deliveroo" /></datalist>
        </div>
        {formError && <div role="alert" style={{ marginTop: 14, color: "#B42318", fontSize: 12.5 }}>{formError}</div>}
        {reviewing && <div role="region" aria-label="Margin rule review" style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#FFF7ED", border: "1px solid #FED7AA", fontSize: 12.5, lineHeight: 1.7 }}><strong>Review before activation</strong><div>Default margin: {draft.marginFloorPct}% · maximum increase: {draft.maxPriceIncreasePct}% · minimum cash contribution: {draft.minimumContributionAmount.toFixed(2)}</div><div>{draft.overrides.length ? `${draft.overrides.length} channel override${draft.overrides.length === 1 ? "" : "s"} will be active.` : "Every channel will use the default rules."}</div><div>Future price changes will still require merchant approval.</div></div>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {!reviewing ? <button type="button" onClick={() => { const message=validateDraft(draft); setFormError(message); if (!message) setReviewing(true); }} style={primaryButtonStyle}>Review changes</button> : <button type="button" onClick={() => void savePolicy()} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? .6 : 1 }}>{saving ? "Activating…" : "Activate these rules"}</button>}
          <button type="button" onClick={() => { setEditing(false); setReviewing(false); setFormError(""); if (policy) setDraft(makeDraft(policy)); }} style={secondaryButtonStyle}>Cancel</button>
          {reviewing && <button type="button" onClick={() => setReviewing(false)} style={secondaryButtonStyle}>Back to editing</button>}
        </div>
      </div> : null}
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginTop: 12 }}>
        Channel overrides are enforced now. Category and product overrides remain unavailable until
        the same safeguards are connected end to end.
      </p>
    </div>
  );
}
