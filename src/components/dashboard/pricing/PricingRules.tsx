import { useState } from "react";

const RULES = [
  "Never price more than 5% above the lowest competitor on Electronics",
  "Match Carrefour on all Grocery items within 24 hours of their price change",
  "Do not drop below QAR 15 margin on any Home category product",
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        backgroundColor: on ? "#22C55E" : "#E5E2DB",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 150ms ease",
        flexShrink: 0,
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

export function PricingRules() {
  const [states, setStates] = useState<boolean[]>(RULES.map(() => true));

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Active pricing rules</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Rules your team has configured for automated price responses
      </div>
      <div style={{ marginTop: 12 }}>
        {RULES.map((rule, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 0",
              borderBottom: i < RULES.length - 1 ? "1px solid #E5E2DB" : "none",
            }}
          >
            <Toggle
              on={states[i]}
              onChange={() =>
                setStates((s) => s.map((v, idx) => (idx === i ? !v : v)))
              }
            />
            <div style={{ fontSize: 13, fontWeight: 400, color: "#1A1A18", flex: 1 }}>{rule}</div>
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
