import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import {
  AuthShell,
  IconInput,
  FormLabel,
  AuthCheckbox,
  PrimaryAuthButton,
  LegalFooter,
} from "@/components/auth/AuthShared";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in | PrizeSkout" },
      {
        name: "description",
        content: "Sign in to your PrizeSkout commerce intelligence dashboard.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <AuthShell>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A18", margin: 0 }}>
        Sign in to your account
      </h1>
      <p style={{ fontSize: 13, color: "#6B6B6B", marginTop: 6, margin: "6px 0 0 0" }}>
        Enter your credentials to access your dashboard
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
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
          <FormLabel>Password</FormLabel>
          <IconInput
            leftIcon={<Lock size={16} />}
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            hasRightIcon
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#9A9A9A",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <AuthCheckbox checked={remember} onChange={setRemember} label="Remember me" />
          <Link
            to="/forgot-password"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#EA580C",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Forgot password?
          </Link>
        </div>

        <div style={{ marginTop: 8 }}>
          <PrimaryAuthButton type="submit">Sign in</PrimaryAuthButton>
        </div>
      </form>

      <div
        style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 13,
          color: "#6B6B6B",
        }}
      >
        Do not have an account?{" "}
        <Link
          to="/signup"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#EA580C",
            textDecoration: "none",
          }}
        >
          Get started
        </Link>
      </div>

      <LegalFooter />
    </AuthShell>
  );
}
