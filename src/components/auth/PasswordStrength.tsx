import { useMemo } from "react";
import { Check, X, ShieldAlert } from "lucide-react";

export type StrengthResult = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  checks: {
    length: boolean;
    lower: boolean;
    upper: boolean;
    digit: boolean;
    symbol: boolean;
  };
};

export function evaluatePassword(pw: string): StrengthResult {
  const checks = {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const variety =
    Number(checks.lower) +
    Number(checks.upper) +
    Number(checks.digit) +
    Number(checks.symbol);

  if (pw.length === 0) {
    return { score: 0, label: "", color: "#E5E2DB", checks };
  }
  if (!checks.length || variety <= 1) {
    return { score: 1, label: "Weak", color: "#EF4444", checks };
  }
  if (variety === 2) {
    return { score: 2, label: "Fair", color: "#F59E0B", checks };
  }
  if (variety === 3 || pw.length < 12) {
    return { score: 3, label: "Good", color: "#22C55E", checks };
  }
  return { score: 4, label: "Strong", color: "#22C55E", checks };
}

export function PasswordStrength({ password }: { password: string }) {
  const s = useMemo(() => evaluatePassword(password), [password]);

  if (password.length === 0) return null;

  const items: { label: string; ok: boolean }[] = [
    { label: "At least 8 characters", ok: s.checks.length },
    { label: "Lowercase letter", ok: s.checks.lower },
    { label: "Uppercase letter", ok: s.checks.upper },
    { label: "Number", ok: s.checks.digit },
    { label: "Symbol", ok: s.checks.symbol },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= s.score ? s.color : "#E5E2DB",
              transition: "background-color 0.2s",
            }}
          />
        ))}
      </div>
      {s.label && (
        <div
          style={{
            fontSize: 10,
            color: s.color,
            marginTop: 4,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {s.label}
        </div>
      )}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "8px 0 0 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 12px",
        }}
      >
        {items.map((it) => (
          <li
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: it.ok ? "#15803D" : "#9A9A9A",
              lineHeight: 1.4,
            }}
          >
            {it.ok ? (
              <Check size={12} color="#22C55E" aria-hidden="true" />
            ) : (
              <X size={12} color="#C2C2C2" aria-hidden="true" />
            )}
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          marginTop: 8,
          padding: "6px 8px",
          backgroundColor: "rgba(234, 88, 12, 0.06)",
          border: "1px solid rgba(234, 88, 12, 0.15)",
          borderRadius: 6,
        }}
      >
        <ShieldAlert
          size={12}
          color="#EA580C"
          style={{ flexShrink: 0, marginTop: 1 }}
          aria-hidden="true"
        />
        <span style={{ fontSize: 10.5, color: "#7A4A1F", lineHeight: 1.45 }}>
          Passwords found in known data breaches will be rejected.
        </span>
      </div>
    </div>
  );
}
