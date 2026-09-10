import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const OG = "#EF681A",
  ALERTS = [
    { key: "margin_breach", i18nKey: "marginBreach" },
    { key: "reprice_applied", i18nKey: "repriceApplied" },
    { key: "channel_down", i18nKey: "channelDown" },
    { key: "competitor_drop", i18nKey: "competitorDrop" },
    { key: "promo_overlap", i18nKey: "promoOverlap" },
    { key: "weekly_digest", i18nKey: "weeklyDigest" },
  ],
  field = {
    minHeight: 40,
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--surface)",
    color: "var(--text)",
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: 12,
  } as const;
type AlertRule = {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  platform: string | null;
  branch_external_id: string | null;
  enabled: boolean;
};
function Toggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Turn off" : "Turn on"}
      disabled={disabled}
      onClick={onToggle}
      style={{
        width: 52,
        height: 32,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        background: on ? OG : "var(--border)",
        position: "relative",
        flexShrink: 0,
        minWidth: 52,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 4,
          left: on ? 24 : 4,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.15)",
        }}
      />
    </button>
  );
}
export function NotificationsTab() {
  const { t } = useTranslation(),
    [state, setState] = useState<Record<string, boolean>>(
      Object.fromEntries(ALERTS.map((a) => [a.key, a.key !== "weekly_digest"])),
    ),
    [loading, setLoading] = useState(true),
    [savingKey, setSavingKey] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [rules, setRules] = useState<AlertRule[]>([]),
    [draft, setDraft] = useState({
      name: "",
      metric: "payout_variance",
      operator: "gte",
      threshold: "100",
      severity: "warning",
      platform: "",
      branch: "",
    });
  async function call(platform: string, body: Record<string, string>) {
    const response = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: localStorage.getItem("ps_merchant_id") ?? "",
          access_code: localStorage.getItem("ps_access_code") ?? "",
          platform,
          ...body,
        }),
      }),
      data = (await response.json()) as {
        ok?: boolean;
        preferences?: Array<{ pref_key: string; enabled: boolean }>;
        rules?: AlertRule[];
        rule?: AlertRule;
        error?: string;
      };
    if (!response.ok || !data.ok) throw new Error(data.error ?? "Notification request failed.");
    return data;
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      call("notification_preferences", { action: "list" }),
      call("alert_rules", { action: "list" }),
    ])
      .then(([p, r]) => {
        if (cancelled) return;
        if (p.preferences?.length)
          setState((current) => ({
            ...current,
            ...Object.fromEntries(p.preferences!.map((row) => [row.pref_key, row.enabled])),
          }));
        setRules(r.rules ?? []);
      })
      .catch(() => {
        if (!cancelled) setMessage("We couldn't load your notification settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function toggle(key: string) {
    if (savingKey) return;
    const next = !state[key];
    setState((v) => ({ ...v, [key]: next }));
    setSavingKey(key);
    try {
      await call("notification_preferences", {
        action: "set",
        pref_key: key,
        enabled: String(next),
      });
      setMessage(next ? "Notification turned on." : "Notification turned off.");
    } catch {
      setState((v) => ({ ...v, [key]: !next }));
      setMessage("That choice wasn't saved.");
    } finally {
      setSavingKey(null);
    }
  }
  async function addRule() {
    if (!draft.name.trim() || !Number.isFinite(Number(draft.threshold))) return;
    setSavingKey("rule");
    try {
      const data = await call("alert_rules", {
        action: "save",
        name: draft.name,
        metric: draft.metric,
        operator: draft.operator,
        threshold: draft.threshold,
        severity: draft.severity,
        scope_platform: draft.platform,
        branch_external_id: draft.branch,
      });
      if (data.rule) setRules((v) => [...v, data.rule!]);
      setDraft({
        name: "",
        metric: "payout_variance",
        operator: "gte",
        threshold: "100",
        severity: "warning",
        platform: "",
        branch: "",
      });
      setMessage("Alert threshold saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Alert threshold was not saved.");
    } finally {
      setSavingKey(null);
    }
  }
  async function removeRule(id: string) {
    setSavingKey(id);
    try {
      await call("alert_rules", { action: "delete", id });
      setRules((v) => v.filter((rule) => rule.id !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Alert threshold was not removed.");
    } finally {
      setSavingKey(null);
    }
  }
  return (
    <div style={{ maxWidth: 760 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
        {t("settingsTabs.notifications.heading")}
      </h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 28px", lineHeight: 1.7 }}>
        {t("settingsTabs.notifications.description")}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {ALERTS.map((a, i) => (
          <div
            key={a.key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: i % 2 === 0 ? "var(--surface2)" : "var(--surface)",
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {t(`settingsTabs.notifications.alerts.${a.i18nKey}.name`)}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                {t(`settingsTabs.notifications.alerts.${a.i18nKey}.desc`)}
              </div>
            </div>
            <Toggle
              on={state[a.key]}
              disabled={loading || savingKey !== null}
              onToggle={() => void toggle(a.key)}
            />
          </div>
        ))}
      </div>
      <div
        aria-live="polite"
        style={{
          minHeight: 20,
          marginTop: 10,
          fontSize: 12.5,
          color:
            message.includes("not") || message.includes("couldn't") ? "#B42318" : "var(--muted)",
        }}
      >
        {loading ? "Loading your choices..." : message}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "28px 0 6px" }}>
        Financial alert thresholds
      </h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.6 }}>
        Rules can apply to the whole group or one platform and branch.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,1fr)", gap: 8 }}>
        <input
          aria-label="Rule name"
          placeholder="Rule name"
          value={draft.name}
          onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))}
          style={field}
        />
        <select
          aria-label="Metric"
          value={draft.metric}
          onChange={(e) => setDraft((v) => ({ ...v, metric: e.target.value }))}
          style={field}
        >
          {["gross_sales", "contribution", "payout_variance", "margin", "recoverable_amount"].map((v) => (
            <option key={v} value={v}>
              {v.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Comparison"
          value={draft.operator}
          onChange={(e) => setDraft((v) => ({ ...v, operator: e.target.value }))}
          style={field}
        >
          {[
            ["gte", "≥"],
            ["gt", ">"],
            ["lte", "≤"],
            ["lt", "<"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          aria-label="Threshold"
          type="number"
          value={draft.threshold}
          onChange={(e) => setDraft((v) => ({ ...v, threshold: e.target.value }))}
          style={field}
        />
        <select
          aria-label="Severity"
          value={draft.severity}
          onChange={(e) => setDraft((v) => ({ ...v, severity: e.target.value }))}
          style={field}
        >
          {["info", "warning", "critical"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <input
          aria-label="Platform scope"
          placeholder="Platform (optional)"
          value={draft.platform}
          onChange={(e) => setDraft((v) => ({ ...v, platform: e.target.value }))}
          style={field}
        />
        <input
          aria-label="Branch scope"
          placeholder="Branch ID (optional)"
          value={draft.branch}
          onChange={(e) => setDraft((v) => ({ ...v, branch: e.target.value }))}
          style={field}
        />
        <button
          type="button"
          disabled={savingKey !== null}
          onClick={() => void addRule()}
          style={{
            ...field,
            gridColumn: "span 3",
            background: OG,
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Add threshold
        </button>
      </div>
      <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "11px 13px",
              border: "1px solid var(--border)",
              borderRadius: 9,
              fontSize: 12,
            }}
          >
            <span>
              <strong>{rule.name}</strong> · {rule.metric.replaceAll("_", " ")} {rule.operator}{" "}
              {rule.threshold} · {rule.severity}
              {rule.platform ? ` · ${rule.platform}` : ""}
              {rule.branch_external_id ? ` · branch ${rule.branch_external_id}` : ""}
            </span>
            <button
              type="button"
              disabled={savingKey !== null}
              onClick={() => void removeRule(rule.id)}
              style={{ border: 0, background: "transparent", color: "#B42318", cursor: "pointer" }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
