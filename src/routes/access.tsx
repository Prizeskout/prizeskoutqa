import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Store } from "lucide-react";
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
        content: "Enter your store email to access your PrizeSkout dashboard.",
      },
    ],
  }),
  component: AccessPage,
});

function AccessPage() {
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);

    // Step 1: ask the server to generate a sign-in token for this email.
    // The server uses the service role key — no email is dispatched to the user.
    let otpToken: string;
    try {
      const res = await fetch("/api/auth/email-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, store_name: storeName.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.token) {
        setError(json.error ?? "No account found for this email.");
        setSubmitting(false);
        return;
      }
      otpToken = json.token;
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    // Step 2: exchange the token for a live session — no redirect, no email click.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmed,
      token: otpToken,
      type: "magiclink",
    });

    if (verifyError) {
      setError("Could not verify access. Please try again.");
      setSubmitting(false);
      return;
    }

    await router.invalidate();
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthShell>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#ffffff",
          margin: 0,
        }}
      >
        Access your dashboard
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#9CA3AF",
          marginTop: 6,
          margin: "6px 0 0 0",
        }}
      >
        Enter your store email and you're in — no password needed.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
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

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: "#DC2626",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <PrimaryAuthButton type="submit" disabled={submitting}>
            {submitting ? "Connecting…" : "Access dashboard"}
          </PrimaryAuthButton>
        </div>
      </form>

      <LegalFooter />
    </AuthShell>
  );
}
