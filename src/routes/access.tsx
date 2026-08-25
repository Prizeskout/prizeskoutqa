import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole, Mail } from "lucide-react";
import {
  AuthShell,
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
    <AuthShell>
      <h1 style={{ margin: 0, color: "#fff", fontSize: 24, fontWeight: 650 }}>Login</h1>
      <p style={{ margin: "7px 0 0", color: "#9CA3AF", fontSize: 13, lineHeight: 1.6 }}>
        {mode === "password"
          ? "Use the details you created during signup."
          : "Use your secure store access code."}
      </p>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          padding: 3,
          gap: 2,
          borderRadius: 10,
          background: "rgba(255,255,255,.05)",
        }}
      >
        {(["password", "code"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => switchMode(item)}
            style={{
              flex: 1,
              padding: "9px 6px",
              border: 0,
              borderRadius: 8,
              background: mode === item ? ORANGE : "transparent",
              color: mode === item ? "#fff" : "#7C8492",
              font: "inherit",
              fontSize: 12,
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
              type="password"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <PrimaryAuthButton type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Login"}
          </PrimaryAuthButton>
          <a
            href="/forgot-password"
            style={{ color: "#7C8492", fontSize: 11, textAlign: "center", textDecoration: "none" }}
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
      <p style={{ margin: "24px 0 0", color: "#6B7280", fontSize: 11, textAlign: "center" }}>
        New to PrizeSkout?{" "}
        <a href="/signup" style={{ color: "#E7E8EA", fontWeight: 600 }}>
          Create an account
        </a>
      </p>
      <LegalFooter />
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
