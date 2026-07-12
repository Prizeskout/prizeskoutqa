import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import logoDark from "@/assets/logo-dark.svg";
import logoLight from "@/assets/logo-light.svg";

export function BackToHomeLink({ tone = "light" }: { tone?: "light" | "dark" }) {
  const color = tone === "light" ? "#6B6B6B" : "#8A8A8A";
  const hoverColor = tone === "light" ? "#1A1A18" : "#FAFAF9";
  return (
    <Link
      to="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        color,
        textDecoration: "none",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = color)}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Back to home
    </Link>
  );
}

export function BrandLogo() {
  return (
    <img src={logoDark} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
  );
}

export function BrandLogoLight() {
  return (
    <img src={logoLight} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
  );
}

const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const OG = "#EF681A";

const METRICS = [
  { label: "Price Updates Today", value: "2,847", delta: "+12%", live: true },
  { label: "Active Rules", value: "6", delta: "defending", live: false },
  { label: "Avg Margin Saved", value: "31.4%", delta: "vs baseline", live: false },
];

const RULES = [
  { name: "Electronics", floor: "22%", status: "Defending" },
  { name: "Grocery", floor: "ceiling 115%", status: "Defending" },
  { name: "Home", floor: "QAR 18", status: "Paused" },
];

export function AuthLeftPanel() {
  return (
    <div style={{
      flex: 1,
      backgroundColor: "#080809",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      flexDirection: "column",
      padding: "40px 44px",
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* Logo */}
      <div>
        <BrandLogo />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 48, paddingBottom: 48 }}>

        {/* Eyebrow */}
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "1.4px", color: OG, marginBottom: 18, textTransform: "uppercase" }}>
          PRICING INFRASTRUCTURE · GCC
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#ffffff", lineHeight: 1.25, margin: "0 0 14px 0", letterSpacing: "-0.5px" }}>
          The pricing brain<br />behind commerce.
        </h1>
        <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.65, margin: 0, maxWidth: 360 }}>
          Set margin floors. Defend them automatically across every aggregator — no engineers required.
        </p>

        {/* Metric cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 36 }}>
          {METRICS.map((m) => (
            <div key={m.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
              padding: "14px 16px", background: "#0E0F12",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#6B7280", fontFamily: MONO, letterSpacing: "0.3px", marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#ffffff", fontFamily: MONO, letterSpacing: "-0.5px" }}>{m.value}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {m.live && <span style={{ width: 6, height: 6, borderRadius: 999, background: "#10B981", flexShrink: 0 }} />}
                <span style={{ fontFamily: MONO, fontSize: 11, color: m.live ? "#10B981" : "#6B7280" }}>{m.delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Rule list */}
        <div style={{ marginTop: 20, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", background: "#0E0F12" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#101116" }}>
            {["Category", "Floor", "Status"].map((h) => (
              <div key={h} style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: "#52555C", textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {RULES.map((r, i) => (
            <div key={r.name} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "11px 14px",
              borderBottom: i < RULES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#E7E8EA" }}>{r.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: OG }}>{r.floor}</div>
              <div style={{ fontSize: 11.5, fontFamily: MONO, color: r.status === "Defending" ? "#10B981" : "#6B7280" }}>{r.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: "#3A3D46" }}>
        PRIZESKOUT · DEFEND LOOP ACTIVE · QA · KSA · UAE
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 767px) { .auth-left-panel { display: none !important; } }
      `}</style>
      <div className="auth-left-panel" style={{ display: "flex", flex: 1 }}>
        <AuthLeftPanel />
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          backgroundColor: "#080809",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          position: "relative",
          outline: "none",
        }}
      >
        <div style={{ position: "absolute", top: 24, left: 24 }}>
          <BackToHomeLink tone="dark" />
        </div>
        <div style={{ maxWidth: 380, width: "100%" }}>{children}</div>
      </main>
    </div>
  );
}

export const inputBaseStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#0E0F12",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  padding: "11px 14px 11px 40px",
  fontSize: 13,
  color: "#E7E8EA",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export function FormLabel({ children }: { children: ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 500,
        color: "#9CA3AF",
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}

export function IconInput({
  leftIcon,
  rightIcon,
  type = "text",
  value,
  onChange,
  placeholder,
  hasRightIcon = false,
}: {
  leftIcon: ReactNode;
  rightIcon?: ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasRightIcon?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
          color: "#6B7280",
        }}
      >
        {leftIcon}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#EF681A";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(239,104,26,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          ...inputBaseStyle,
          paddingRight: hasRightIcon ? 40 : 14,
        }}
      />
      {rightIcon && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {rightIcon}
        </div>
      )}
    </div>
  );
}

export function IconSelect({
  leftIcon,
  value,
  onChange,
  options,
  placeholder,
}: {
  leftIcon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
          color: "#9A9A9A",
        }}
      >
        {leftIcon}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#EF681A";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(239,104,26,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          ...inputBaseStyle,
          paddingRight: 40,
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          cursor: "pointer",
          color: value ? "#E7E8EA" : "#6B7280",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} style={{ color: "#1A1A18" }}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDownIcon />
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9A9A9A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function AuthCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1px solid ${checked ? "#EF681A" : "rgba(255,255,255,0.15)"}`,
          backgroundColor: checked ? "#EF681A" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          cursor: "pointer",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
        {label}
      </span>
    </label>
  );
}

export function PrimaryAuthButton({
  children,
  onClick,
  muted = false,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  muted?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const baseBg = muted ? "#C2410C" : "#EA580C";
  const hoverBg = "#C2410C";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        width: "100%",
        backgroundColor: hover && !disabled ? hoverBg : baseBg,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: 600,
        padding: "12px",
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.15s, transform 0.15s",
        transform: active && !disabled ? "scale(0.98)" : "scale(1)",
        opacity: disabled ? 0.6 : muted ? 0.7 : 1,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

export function LegalFooter() {
  return (
    <div
      style={{
        marginTop: 32,
        textAlign: "center",
        fontSize: 11,
        color: "#52555C",
        lineHeight: 1.6,
      }}
    >
      By signing in, you agree to our{" "}
      <span style={{ color: "#6B7280" }}>Terms of Service</span> and{" "}
      <span style={{ color: "#6B7280" }}>Privacy Policy</span>
    </div>
  );
}
