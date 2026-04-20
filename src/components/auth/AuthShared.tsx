import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Crosshair, TrendingUp, Target } from "lucide-react";

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
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            backgroundColor: "#EA580C",
          }}
        />
        <div style={{ fontSize: 20, fontWeight: 700, color: "#FAFAF9" }}>
          PrizeSkout
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 400,
          color: "#8A8A8A",
          marginTop: 6,
          marginLeft: 38,
        }}
      >
        Commerce Intelligence
      </div>
    </div>
  );
}

export function BrandLogoLight() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          backgroundColor: "#EA580C",
        }}
      />
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A18", lineHeight: 1.1 }}>
          PrizeSkout
        </div>
        <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
          Commerce Intelligence
        </div>
      </div>
    </div>
  );
}

export function AuthLeftPanel() {
  const bullets = [
    {
      Icon: Crosshair,
      text: "Real-time competitive price monitoring across online and in-store channels",
    },
    {
      Icon: TrendingUp,
      text: "AI pricing recommendations that improve every month with your data",
    },
    {
      Icon: Target,
      text: "Anonymized market benchmarks without exposing your data to competitors",
    },
  ];
  const brands = ["Snoonu", "Talabat", "Carrefour", "Lulu"];
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#050505",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 40,
        minHeight: "100vh",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <BrandLogo />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#FAFAF9",
              lineHeight: 1.3,
              margin: "40px 0 0 0",
            }}
          >
            The pricing brain behind commerce.
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#8A8A8A",
              lineHeight: 1.7,
              margin: "14px 0 0 0",
            }}
          >
            AI-powered pricing intelligence for e-commerce platforms, physical
            retailers, and omnichannel brands across Qatar and the Middle East.
          </p>
          <div
            style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {bullets.map(({ Icon, text }, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <Icon size={18} color="#EA580C" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: "#8A8A8A", flex: 1, lineHeight: 1.55 }}>
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 420, width: "100%", marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ fontSize: 11, color: "#6B6B6B" }}>
          Trusted by commerce brands across Qatar
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#6B6B6B",
            letterSpacing: "0.02em",
            marginTop: 8,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {brands.map((b, i) => (
            <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {b}
              {i < brands.length - 1 && <span style={{ color: "#3A3A3A" }}>•</span>}
            </span>
          ))}
        </div>
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
        fontFamily:
          "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div className="auth-left-panel" style={{ display: "flex", flex: 1 }}>
        <AuthLeftPanel />
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          backgroundColor: "#FAFAF9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          position: "relative",
          outline: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
          }}
        >
          <BackToHomeLink />
        </div>
        <div style={{ maxWidth: 380, width: "100%" }}>{children}</div>
      </main>
      <style>{`
        @media (max-width: 767px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export const inputBaseStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E2DB",
  borderRadius: 8,
  padding: "11px 14px 11px 40px",
  fontSize: 13,
  color: "#1A1A18",
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
        color: "#6B6B6B",
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
          color: "#9A9A9A",
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
          e.currentTarget.style.borderColor = "#EA580C";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(234, 88, 12, 0.08)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#E5E2DB";
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
          e.currentTarget.style.borderColor = "#EA580C";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(234, 88, 12, 0.08)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#E5E2DB";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          ...inputBaseStyle,
          paddingRight: 40,
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          cursor: "pointer",
          color: value ? "#1A1A18" : "#9A9A9A",
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
          border: `1px solid ${checked ? "#EA580C" : "#E5E2DB"}`,
          backgroundColor: checked ? "#EA580C" : "#FFFFFF",
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
      <span style={{ fontSize: 12, color: "#6B6B6B", marginLeft: 8 }}>
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
}: {
  children: ReactNode;
  onClick?: () => void;
  muted?: boolean;
  type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const baseBg = muted ? "#C2410C" : "#EA580C";
  const hoverBg = "#C2410C";
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        width: "100%",
        backgroundColor: hover ? hoverBg : baseBg,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: 600,
        padding: "12px",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        transition: "background-color 0.15s, transform 0.15s",
        transform: active ? "scale(0.98)" : "scale(1)",
        opacity: muted ? 0.7 : 1,
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
        color: "#9A9A9A",
        lineHeight: 1.6,
      }}
    >
      By signing in, you agree to our{" "}
      <span style={{ color: "#6B6B6B" }}>Terms of Service</span> and{" "}
      <span style={{ color: "#6B6B6B" }}>Privacy Policy</span>
    </div>
  );
}
