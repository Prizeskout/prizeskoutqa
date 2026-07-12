import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Store, KeyRound } from "lucide-react";
import {
  AuthShell,
  IconInput,
  FormLabel,
  PrimaryAuthButton,
  LegalFooter,
} from "@/components/auth/AuthShared";

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
  const [storeName, setStoreName] = useState("");

  // code mode
  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function switchMode(m: "email" | "code") {
    setMode(m);
    setError(null);
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/email-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, store_name: storeName.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.action_link) {
        setError(json.error ?? "Could not verify access. Please try again.");
        setSubmitting(false);
        return;
      }
      // Redirect the browser directly to the magic link — same mechanism as
      // clicking the link in an email, guaranteed to work regardless of
      // Supabase project auth settings.
      window.location.href = json.action_link;
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
          ? "Enter your store email and you're in — no password needed."
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
          <div>
            <FormLabel>
              Store name{" "}
              <span style={{ color: "#52555C", fontWeight: 400 }}>(optional)</span>
            </FormLabel>
            <IconInput
              leftIcon={<Store size={16} />}
              value={storeName}
              onChange={setStoreName}
              placeholder="e.g. Al Meera, Carrefour Qatar"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <div style={{ marginTop: 4 }}>
            <PrimaryAuthButton type="submit" disabled={submitting}>
              {submitting ? "Connecting…" : "Access dashboard"}
            </PrimaryAuthButton>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <FormLabel>Access Code</FormLabel>
            <IconInput
              leftIcon={<KeyRound size={16} />}
              value={code}
              onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="PSK-QA-0000"
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
