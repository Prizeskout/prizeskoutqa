import { Zap, FlaskConical } from "lucide-react";
import { useModeContext } from "@/lib/mode-context";

export function ModeSwitcher() {
  const { mode, switchMode } = useModeContext();
  const isLive = mode === "live";

  return (
    <div
      role="group"
      aria-label="Environment mode"
      style={{
        display: "inline-flex",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        padding: 3,
        backgroundColor: "#FFFFFF",
        gap: 2,
      }}
    >
      <ModeButton
        active={isLive}
        onClick={() => switchMode("live")}
        icon={<Zap size={12} strokeWidth={2.5} />}
        label="Live"
        activeStyle={{ backgroundColor: "#16A34A", color: "#FFFFFF" }}
      />
      <ModeButton
        active={!isLive}
        onClick={() => switchMode("sandbox")}
        icon={<FlaskConical size={12} strokeWidth={2} />}
        label="Sandbox"
        activeStyle={{ backgroundColor: "#1A1A18", color: "#FFFFFF" }}
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  activeStyle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeStyle: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 6,
        border: "none",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 0.15s ease, color 0.15s ease",
        ...(active
          ? activeStyle
          : { backgroundColor: "transparent", color: "#9A9A9A" }),
      }}
    >
      {icon}
      {label}
    </button>
  );
}
