import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PricingRule } from "@/lib/pricing-data";

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        backgroundColor: on ? "#22C55E" : "#E5E2DB",
        border: "none",
        position: "relative",
        cursor: disabled ? "wait" : "pointer",
        transition: "background-color 150ms ease",
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
      aria-pressed={on}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          transition: "left 150ms ease",
        }}
      />
    </button>
  );
}

export function PricingRules({ rules }: { rules: PricingRule[] }) {
  // Track local enabled state so toggles feel instant; persist to Cloud in the background.
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rules.map((r) => [r.id, r.enabled])),
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // If loader data refreshes (router.invalidate), sync local state with it.
  useEffect(() => {
    setStates(Object.fromEntries(rules.map((r) => [r.id, r.enabled])));
  }, [rules]);

  const handleToggle = async (rule: PricingRule) => {
    const next = !states[rule.id];
    setStates((s) => ({ ...s, [rule.id]: next }));
    setPending((p) => ({ ...p, [rule.id]: true }));
    const { error } = await supabase
      .from("pricing_rules")
      .update({ enabled: next })
      .eq("id", rule.id);
    setPending((p) => ({ ...p, [rule.id]: false }));
    if (error) {
      // Revert on failure
      setStates((s) => ({ ...s, [rule.id]: !next }));
    }
  };

  if (!rules.length) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px dashed #E5E2DB",
          borderRadius: 10,
          padding: "20px 24px",
          fontSize: 13,
          color: "#6B6B6B",
        }}
      >
        No pricing rules configured yet.
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>
        Active pricing rules
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Rules your team has configured for automated price responses
      </div>
      <div style={{ marginTop: 12 }}>
        {rules.map((rule, i) => (
          <div
            key={rule.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 0",
              borderBottom: i < rules.length - 1 ? "1px solid #E5E2DB" : "none",
            }}
          >
            <Toggle
              on={states[rule.id] ?? rule.enabled}
              onChange={() => handleToggle(rule)}
              disabled={pending[rule.id]}
            />
            <div style={{ fontSize: 13, fontWeight: 400, color: "#1A1A18", flex: 1 }}>
              {rule.rule_text}
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                color: "#EA580C",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
