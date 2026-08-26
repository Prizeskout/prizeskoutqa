import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import {
  AuthShell,
  BrandLogoLight,
  FormLabel,
  IconInput,
  LegalFooter,
  PrimaryAuthButton,
} from "@/components/auth/AuthShared";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Login | PrizeSkout" },
      { name: "description", content: "Login to your PrizeSkout workspace." },
    ],
  }),
  component: AccessPage,
});

const ORANGE = "#EF681A";

function AccessPage() {
  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function switchMode(next: "password" | "code") {
    setMode(next);
    setError("");
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      navigate({ to: "/dashboard" });
    } catch {
      setError("Email or password is incorrect. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function restore(event: FormEvent) {
    event.preventDefault();
    setError("");
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Enter your access code.");
      return;
    }
    setSubmitting(true);
    try {
      const storedCode = localStorage.getItem("ps_access_code");
      const storedMerchant = localStorage.getItem("ps_merchant_id");
      if (storedCode === normalized && storedMerchant) {
        localStorage.setItem("ps_connected", "true");
        navigate({ to: "/dashboard" });
        return;
      }
      const response = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      if (!response.ok) throw new Error("Code not found");
      const data = (await response.json()) as { merchant_id: string };
      localStorage.setItem("ps_merchant_id", data.merchant_id);
      localStorage.setItem("ps_access_code", normalized);
      localStorage.setItem("ps_connected", "true");
      navigate({ to: "/dashboard" });
    } catch {
      setError("Code not found. Double-check it and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell tone="light">
      <style>{`
        .ps-auth-shell-light {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
        }
        .ps-auth-shell-light .ps-auth-main {
          background: #f5f3ee !important;
          padding: 72px 28px 40px !important;
        }
        .ps-auth-shell-light .ps-auth-content { max-width: 460px !important; }
        .access-panel {
          background: #fff;
          border: 1px solid #dedbd4;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 12px 32px rgba(16,24,45,.06);
        }
        .access-logo { display: block; width: 142px; margin-bottom: 34px; }
        .ps-auth-shell-light input {
          background: #fff !important;
          border-color: #cfd2d8 !important;
          color: #10182d !important;
          border-radius: 7px !important;
          min-height: 52px;
          font-size: 16px !important;
        }
        .ps-auth-shell-light input:-webkit-autofill {
          -webkit-text-fill-color: #10182d !important;
          box-shadow: 0 0 0 1000px #fff inset !important;
        }
        .ps-auth-shell-light input:focus {
          border-color: #ef681a !important;
          box-shadow: 0 0 0 2px rgba(239,104,26,.1) !important;
        }
        .ps-auth-shell-light label { color: #303846 !important; font-size: 14px !important; font-weight: 600 !important; margin-bottom: 7px !important; }
        .ps-auth-shell-light input::placeholder { color: #9da3ad; }
        .ps-auth-shell-light [role="alert"] { color: #9f3122 !important; }
        .access-tabs button { font-size: 14px !important; }
        .access-panel form > button { min-height: 50px; font-size: 16px !important; }
        .access-secondary { font-size: 14px !important; }
        .ps-auth-shell-light .access-legal,
        .ps-auth-shell-light .access-legal span { color: #626a76 !important; }
        .ps-auth-shell-light .access-legal > div { font-size: 12px !important; }
        @media (max-width: 560px) {
          .ps-auth-shell-light .ps-auth-main { padding: 72px 16px 24px !important; align-items: flex-start !important; }
          .access-panel { padding: 28px 22px; }
          .access-logo { margin-bottom: 28px; }
        }
      `}</style>
      <div className="access-panel">
      <div className="access-logo"><BrandLogoLight /></div>
      <h1 style={{ margin: 0, color: "#10182D", fontSize: 32, lineHeight: 1.15, letterSpacing: "-.02em", fontWeight: 700 }}>Welcome back</h1>
      <p style={{ margin: "10px 0 0", color: "#626A76", fontSize: 15, lineHeight: 1.6 }}>
        {mode === "password"
          ? "Use the details you created during signup."
          : "Use your secure store access code."}
      </p>
      <div
        className="access-tabs"
        style={{
          display: "flex",
          marginTop: 28,
          padding: 3,
          gap: 2,
          borderRadius: 10,
          background: "#eeece7",
        }}
      >
        {(["password", "code"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => switchMode(item)}
            style={{
              flex: 1,
              padding: "11px 8px",
              border: 0,
              borderRadius: 8,
              background: mode === item ? ORANGE : "transparent",
              color: mode === item ? "#fff" : "#667085",
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {item === "password" ? "Email & password" : "Access code"}
          </button>
        ))}
      </div>
      {mode === "password" ? (
        <form
          onSubmit={login}
          style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <FormLabel>Email address</FormLabel>
            <IconInput
              leftIcon={<Mail size={16} />}
              value={email}
              onChange={setEmail}
              placeholder="name@business.com"
              type="email"
            />
          </div>
          <div>
            <FormLabel>Password</FormLabel>
            <IconInput
              leftIcon={<LockKeyhole size={16} />}
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              type={showPassword ? "text" : "password"}
              hasRightIcon
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    display: "flex",
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: "#7C8492",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>
          {error && <ErrorBox message={error} />}
          <PrimaryAuthButton type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Login"}
          </PrimaryAuthButton>
          <a
            className="access-secondary"
            href="/forgot-password"
            style={{ color: "#667085", fontSize: 11, textAlign: "center", textDecoration: "none" }}
          >
            Forgot your password?
          </a>
        </form>
      ) : (
        <form
          onSubmit={restore}
          style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <FormLabel>Access code</FormLabel>
            <IconInput
              leftIcon={<KeyRound size={16} />}
              value={code}
              onChange={(value) => setCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="PSK-QA-SECURE-CODE"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <PrimaryAuthButton type="submit" disabled={submitting}>
            {submitting ? "Restoring…" : "Restore access"}
          </PrimaryAuthButton>
        </form>
      )}
      <p className="access-secondary" style={{ margin: "28px 0 0", color: "#626A76", fontSize: 14, textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <a href="/signup" style={{ color: "#10182D", fontWeight: 650 }}>
          Create one
        </a>
      </p>
      <div className="access-legal"><LegalFooter /></div>
      </div>
    </AuthShell>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        padding: "9px 11px",
        border: "1px solid rgba(239,68,68,.22)",
        borderRadius: 8,
        background: "rgba(239,68,68,.08)",
        color: "#F87171",
        fontSize: 11,
      }}
    >
      {message}
    </div>
  );
}
