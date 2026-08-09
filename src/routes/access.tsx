import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, KeyRound, MailCheck } from "lucide-react";
import {
  AuthShell,
  IconInput,
  FormLabel,
  PrimaryAuthButton,
  LegalFooter,
} from "@/components/auth/AuthShared";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Access your dashboard | PrizeSkout" },
      {
        name: "description",
        content: "Enter your store email or access code to reach your PrizeSkout dashboard.",
      },
    ],
  }),
  component: AccessPage,
});

const OG = "#EF681A";

function AccessPage() {
  const [mode, setMode] = useState<"email" | "code">("email");

  // email mode
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // code mode
  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function switchMode(m: "email" | "code") {
    setMode(m);
    setError(null);
    setEmailSent(false);
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);

    try {
      // Confirm this email actually belongs to an onboarded merchant before
      // asking Supabase to email anything — this endpoint never creates an
      // account or hands back anything usable on its own.
      const res = await fetch("/api/auth/email-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, intent: "login" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not verify access. Please try again.");
        setSubmitting(false);
        return;
      }

      // Real magic link, sent by Supabase to the merchant's actual inbox —
      // shouldCreateUser:false is a second guarantee (on top of the check
      // above) that this can never provision a new account. The merchant
      // has to open the email and click the link; nothing here grants
      // access on its own.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (otpError) {
        setError("Could not send sign-in link. Please try again.");
        setSubmitting(false);
        return;
      }

      setEmailSent(true);
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError("Enter your access code.");
      return;
    }
    setSubmitting(true);
    try {
      // If this device already has the matching code in localStorage, restore
      // directly — avoids a round-trip and handles codes generated before the
      // DB registration fix was deployed.
      const storedCode = localStorage.getItem("ps_access_code");
      const storedMid  = localStorage.getItem("ps_merchant_id");
      if (storedCode === trimmedCode && storedMid) {
        localStorage.setItem("ps_connected", "true");
        navigate({ to: "/dashboard" });
        return;
      }

      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode }),
      });
      if (!res.ok) {
        setError("Code not found. Double-check and try again.");
        setSubmitting(false);
        return;
      }
      const data = await res.json() as { merchant_id: string };
      localStorage.setItem("ps_merchant_id", data.merchant_id);
      localStorage.setItem("ps_access_code", trimmedCode);
      localStorage.setItem("ps_connected", "true");
      navigate({ to: "/dashboard" });
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", margin: 0 }}>
        Access your dashboard
      </h1>
      <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 6, margin: "6px 0 0 0" }}>
        {mode === "email"
          ? emailSent
            ? "Check your inbox for a sign-in link."
            : "Enter your store email — we'll send you a sign-in link. No password needed."
          : "Enter the access code you received when you first connected."}
      </p>

      {/* Mode toggle */}
      <div
        style={{
          display: "flex",
          marginTop: 24,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 10,
          padding: 3,
          gap: 2,
        }}
      >
        {(["email", "code"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.15s",
              background: mode === m ? OG : "transparent",
              color: mode === m ? "#fff" : "#6B7280",
              fontFamily: "inherit",
            }}
          >
            {m === "email" ? "Email" : "Access Code"}
          </button>
        ))}
      </div>

      {mode === "email" ? (
        emailSent ? (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239,104,26,0.12)",
              display: "grid", placeItems: "center" }}>
              <MailCheck size={20} color={OG} />
            </div>
            <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.6, margin: 0 }}>
              Sent to <strong style={{ color: "#E7E8EA" }}>{email.trim()}</strong>. Click the link there to sign in — this page can be closed.
            </p>
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              style={{ background: "transparent", border: "none", color: "#6B7280", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: "8px 0" }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <FormLabel>Email address</FormLabel>
              <IconInput
                leftIcon={<Mail size={16} />}
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                type="email"
              />
            </div>
            {error && <ErrorBox message={error} />}
            <div style={{ marginTop: 4 }}>
              <PrimaryAuthButton type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send sign-in link"}
              </PrimaryAuthButton>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={handleCodeSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <FormLabel>Access Code</FormLabel>
            <IconInput
              leftIcon={<KeyRound size={16} />}
              value={code}
              onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="PSK-QA-SECURE-CODE"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <div style={{ marginTop: 4 }}>
            <PrimaryAuthButton type="submit" disabled={submitting}>
              {submitting ? "Restoring…" : "Restore access"}
            </PrimaryAuthButton>
          </div>
        </form>
      )}

      <LegalFooter />
    </AuthShell>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        fontSize: 12,
        color: "#DC2626",
        backgroundColor: "rgba(239,68,68,0.08)",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid rgba(239,68,68,0.2)",
      }}
    >
      {message}
    </div>
  );
}
