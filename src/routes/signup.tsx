import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
      { title: "Create your account — PrizeSkout" },
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

function getStrength(pw: string) {
  const len = pw.length;
  if (len < 4) return { bars: 0, color: "#E5E2DB", label: "" };
  if (len < 6) return { bars: 1, color: "#EF4444", label: "Weak" };
  if (len < 8) return { bars: 2, color: "#F59E0B", label: "Fair" };
  if (len < 12) return { bars: 3, color: "#22C55E", label: "Good" };
  return { bars: 4, color: "#22C55E", label: "Strong" };
}

function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  return (
    <AuthShell>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A18", margin: 0 }}>
        Create your account
      </h1>
      <p style={{ fontSize: 13, color: "#6B6B6B", marginTop: 6, margin: "6px 0 0 0" }}>
        Start your 14-day free trial. No credit card required.
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
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor:
                      i < strength.bars ? strength.color : "#E5E2DB",
                    transition: "background-color 0.2s",
                  }}
                />
              ))}
            </div>
            {strength.label && (
              <div
                style={{
                  fontSize: 10,
                  color: strength.color,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {strength.label}
              </div>
            )}
          </div>
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

        <div style={{ marginTop: 4 }}>
          <PrimaryAuthButton type="submit">Create account</PrimaryAuthButton>
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
