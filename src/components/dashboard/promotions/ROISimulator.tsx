import { useState } from "react";
import { CheckCircle, ChevronDown } from "lucide-react";

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#6B6B6B", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            width: "100%",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: "10px 36px 10px 14px",
            fontSize: 13,
            fontWeight: 400,
            color: "#1A1A18",
            cursor: "pointer",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          color="#9A9A9A"
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}

export function ROISimulator() {
  const [category, setCategory] = useState("Electronics");
  const [depth, setDepth] = useState("15%");
  const [duration, setDuration] = useState("5 days");
  const [channel, setChannel] = useState("Online");

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Campaign ROI simulator</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Predict the impact of a promotion before you launch it
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
        <Field
          label="Category"
          value={category}
          onChange={setCategory}
          options={["Electronics", "Grocery", "Fashion", "Home", "Beauty"]}
        />
        <Field
          label="Discount depth"
          value={depth}
          onChange={setDepth}
          options={["5%", "10%", "15%", "20%", "25%", "30%"]}
        />
        <Field
          label="Duration"
          value={duration}
          onChange={setDuration}
          options={["2 days", "3 days", "5 days", "7 days", "10 days", "14 days"]}
        />
        <Field
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={["Online", "In-Store", "Both"]}
        />
      </div>

      <button
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C2410C")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#EA580C")}
        style={{
          marginTop: 14,
          backgroundColor: "#EA580C",
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 24px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          transition: "background-color 150ms ease",
        }}
      >
        Simulate
      </button>

      <div
        style={{
          marginTop: 20,
          backgroundColor: "#FAFAF9",
          borderRadius: 10,
          padding: "22px 26px",
        }}
      >
        <div style={{ display: "flex", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
          {[
            { label: "Projected GMV uplift", value: "+QAR 127K", color: "#22C55E" },
            { label: "Incremental orders", value: "+342", color: "#1A1A18" },
            { label: "Cannibalization risk", value: "18%", color: "#F59E0B" },
            { label: "Net ROI", value: "2.4x", color: "#22C55E" },
          ].map((m) => (
            <div key={m.label} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", fontWeight: 500 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color, marginTop: 6 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            backgroundColor: "rgba(34, 197, 94, 0.04)",
            border: "1px solid rgba(34, 197, 94, 0.12)",
            borderRadius: 8,
            padding: "12px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <CheckCircle size={16} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6 }}>
            This campaign profile looks strong. Low cannibalization risk and healthy ROI.
            Recommended timing: launch on a Thursday to capture weekend traffic. Avoid overlapping
            with Talabat's Eid sale for maximum impact.
          </div>
        </div>
      </div>
    </div>
  );
}
