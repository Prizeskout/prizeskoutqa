import { useState, type CSSProperties } from "react";

export type CompetitorsSubTab = "Price tracker" | "Behavior patterns";

const tabs: CompetitorsSubTab[] = ["Price tracker", "Behavior patterns"];

export function SubTabs({
  active,
  onChange,
}: {
  active: CompetitorsSubTab;
  onChange: (t: CompetitorsSubTab) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid #E5E2DB",
        marginBottom: 20,
      }}
    >
      {tabs.map((t) => (
        <SubTab
          key={t}
          label={t}
          active={t === active}
          onClick={() => onChange(t)}
        />
      ))}
    </div>
  );
}

function SubTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 500,
    color: active || hover ? "#1A1A18" : "#9A9A9A",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "#EA580C" : "transparent"}`,
    transition: "color 0.15s, border-color 0.15s",
    fontFamily: "inherit",
    marginBottom: -1,
  };
  return (
    <button
      type="button"
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
