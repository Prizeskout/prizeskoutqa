import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, ShieldCheck } from "lucide-react";
import {
  IconInput,
  FormLabel,
  PrimaryAuthButton,
  BrandLogoLight,
} from "@/components/auth/AuthShared";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | PrizeSkout" },
      {
        name: "description",
        content: "Reset the password for your PrizeSkout account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAFAF9",
        fontFamily:
          "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        padding: "10vh 24px 40px 24px",
      }}
    >
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          maxWidth: 400,
          margin: "0 auto",
          padding: 40,
          outline: "none",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: "#6B6B6B",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A18")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to home
          </Link>
        </div>
        <BrandLogoLight />

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1A1A18",
            marginTop: 24,
            margin: "24px 0 0 0",
          }}
        >
          Reset your password
        </h1>
        <p style={{ fontSize: 13, color: "#6B6B6B", marginTop: 6, margin: "6px 0 0 0" }}>
          Enter your email and we will send you a reset link
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          style={{ marginTop: 24 }}
        >
          <FormLabel>Email address</FormLabel>
          <IconInput
            leftIcon={<Mail size={16} />}
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
            type="email"
          />

          <div style={{ marginTop: 16 }}>
            <PrimaryAuthButton type="submit" muted={sent}>
              {sent ? "Resend link" : "Send reset link"}
            </PrimaryAuthButton>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              backgroundColor: "#F5F2EC",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: "#1A1A18",
                marginBottom: 6,
              }}
            >
              <ShieldCheck size={13} color="#EA580C" aria-hidden="true" />
              When you set a new password
            </div>
            <ul
              style={{
                listStyle: "disc",
                margin: 0,
                paddingLeft: 18,
                fontSize: 11.5,
                color: "#6B6B6B",
                lineHeight: 1.6,
              }}
            >
              <li>At least 8 characters long</li>
              <li>Mix of letters, numbers, and symbols</li>
              <li>
                Passwords found in known data breaches will be rejected
              </li>
            </ul>
          </div>
            <div
              style={{
                marginTop: 16,
                backgroundColor: "rgba(34, 197, 94, 0.06)",
                border: "1px solid rgba(34, 197, 94, 0.15)",
                borderRadius: 8,
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <CheckCircle
                size={18}
                color="#22C55E"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div style={{ fontSize: 13, color: "#22C55E", lineHeight: 1.5 }}>
                Reset link sent. Check your email for instructions.
              </div>
            </div>
          )}
        </form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#EA580C",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
