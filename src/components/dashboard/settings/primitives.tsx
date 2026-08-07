import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { MerchantField, inferredMerchantHelp } from "@/components/ui/MerchantField";

export const cardStyle: CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "20px 24px",
};

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{children}</div>;
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{children}</div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--muted)",
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}

const baseInputStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "email" | "tel";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      style={baseInputStyle}
    />
  );
}

export function TextareaField({
  value,
  onChange,
  height = 80,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      style={{
        ...baseInputStyle,
        height,
        resize: "vertical",
        lineHeight: 1.5,
      }}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  /** Optional display-label override per option value (e.g. for translated labels). Falls back to the raw option value. */
  labels?: Record<string, string>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...baseInputStyle,
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          paddingInlineEnd: 38,
          cursor: "pointer",
          borderColor: focused ? "var(--accent)" : "var(--border)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        color="var(--muted)"
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <MerchantField label={label} help={help ?? inferredMerchantHelp(label)} style={{ flex: 1 }}>
      {children}
    </MerchantField>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{children}</div>
  );
}

export function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: hover ? "color-mix(in srgb, var(--accent) 82%, black)" : "var(--accent)",
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: 600,
        padding: "10px 24px",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        transition: "background-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function OutlineAddButton({
  icon,
  children,
  onClick,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: hover ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--surface)",
        border: "1px solid var(--accent)",
        color: "var(--accent)",
        fontSize: 12,
        fontWeight: 600,
        padding: "8px 18px",
        borderRadius: 8,
        cursor: "pointer",
        transition: "background-color 0.15s",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconAction({
  icon,
  hoverColor = "var(--accent)",
  onClick,
  ariaLabel,
}: {
  icon: ReactNode;
  hoverColor?: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--surface2)",
        border: `1px solid ${hover ? hoverColor : "var(--border)"}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "border-color 0.15s",
        padding: 0,
      }}
    >
      {icon}
    </button>
  );
}

export function Toggle({
  on,
  onChange,
  size = "md",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  size?: "md" | "sm";
}) {
  const w = size === "sm" ? 32 : 40;
  const h = size === "sm" ? 18 : 22;
  const knob = size === "sm" ? 14 : 18;
  const offset = (h - knob) / 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        backgroundColor: on ? "var(--green)" : "var(--border)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: offset,
          left: on ? w - knob - offset : offset,
          width: knob,
          height: knob,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.18)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

export function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        display: "inline-block",
      }}
    />
  );
}
