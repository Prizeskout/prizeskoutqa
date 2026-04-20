import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PasswordStrength,
  evaluatePassword,
} from "@/components/auth/PasswordStrength";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  Briefcase,
  Globe,
} from "lucide-react";
import {
  AuthShell,
  IconInput,
  IconSelect,
  FormLabel,
  AuthCheckbox,
  PrimaryAuthButton,
} from "@/components/auth/AuthShared";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account | PrizeSkout" },
      {
        name: "description",
        content:
          "Start your 14-day free trial of PrizeSkout commerce intelligence.",
      },
    ],
  }),
  component: SignupPage,
});

const businessTypes = [
  "E-commerce platform",
  "Physical retail store",
  "Hypermarket / Supermarket",
  "Mall / Shopping center",
  "Omnichannel brand",
  "Marketplace",
  "Other",
] as const;

const countries = [
  "Qatar",
  "UAE",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Egypt",
  "Jordan",
  "Other",
] as const;

function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!name || !email || !password) {
      setError("Please fill in your name, email, and password.");
      return;
    }
    const pwScore = evaluatePassword(password);
    if (!pwScore.checks.length) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pwScore.score < 2) {
      setError("Please choose a stronger password — mix letters, numbers, and symbols.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          display_name: name,
          company,
          business_type: businessType,
          country,
        },
      },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      await router.invalidate();
      navigate({ to: "/dashboard" });
    } else {
      setInfo("Check your inbox to confirm your email, then sign in.");
    }
  };

  return (
    <AuthShell>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A18", margin: 0 }}>
        Create your account
      </h1>
      <p style={{ fontSize: 13, color: "#6B6B6B", marginTop: 6, margin: "6px 0 0 0" }}>
        Start your 14-day free trial. No credit card required.
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
          <FormLabel>Full name</FormLabel>
          <IconInput
            leftIcon={<User size={16} />}
            value={name}
            onChange={setName}
            placeholder="Your full name"
          />
        </div>

        <div>
          <FormLabel>Work email</FormLabel>
          <IconInput
            leftIcon={<Mail size={16} />}
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
            type="email"
          />
        </div>

        <div>
          <FormLabel>Company name</FormLabel>
          <IconInput
            leftIcon={<Building2 size={16} />}
            value={company}
            onChange={setCompany}
            placeholder="Your company or brand name"
          />
        </div>

        <div>
          <FormLabel>Business type</FormLabel>
          <IconSelect
            leftIcon={<Briefcase size={16} />}
            value={businessType}
            onChange={setBusinessType}
            options={businessTypes}
            placeholder="Select your business type"
          />
        </div>

        <div>
          <FormLabel>Country</FormLabel>
          <IconSelect
            leftIcon={<Globe size={16} />}
            value={country}
            onChange={setCountry}
            options={countries}
            placeholder="Select country"
          />
        </div>

        <div>
          <FormLabel>Password</FormLabel>
          <IconInput
            leftIcon={<Lock size={16} />}
            value={password}
            onChange={setPassword}
            placeholder="Create a password (min 8 characters)"
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
          <PasswordStrength password={password} />
        </div>

        <div style={{ marginTop: 4 }}>
          <AuthCheckbox
            checked={agreed}
            onChange={setAgreed}
            label={
              <>
                I agree to the{" "}
                <span style={{ color: "#1A1A18", fontWeight: 500 }}>
                  Terms of Service
                </span>{" "}
                and{" "}
                <span style={{ color: "#1A1A18", fontWeight: 500 }}>
                  Privacy Policy
                </span>
              </>
            }
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

        {info && (
          <div
            role="status"
            style={{
              fontSize: 12,
              color: "#15803D",
              backgroundColor: "rgba(34, 197, 94, 0.08)",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            {info}
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          <PrimaryAuthButton type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </PrimaryAuthButton>
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
        Already have an account?{" "}
        <Link
          to="/login"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#EA580C",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
