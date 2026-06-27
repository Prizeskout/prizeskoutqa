import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logoDark from "@/assets/logo-dark.svg";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started | PrizeSkout" },
      { name: "description", content: "Set up your pricing defense in minutes." },
    ],
  }),
  component: OnboardingPage,
});

const OG = "#EF681A";
const GN = "#10B981";
const BG = "#080809";
const MONO = "'JetBrains Mono','SFMono-Regular',Menlo,monospace";

const STEPS = [
  { label: "Store Config",      sub: "Identify your business" },
  { label: "Channel Connect",   sub: "Link your platforms"    },
  { label: "Defense Floors",    sub: "Set your margin rules"  },
];

const REGIONS = ["Qatar", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Oman"] as const;
const CURRENCIES = ["QAR", "SAR", "AED", "KWD", "BHD", "OMR"] as const;

const CATEGORIES = ["Electronics", "Grocery", "Fashion", "Home & Garden", "F&B"];

function inputStyle(focus?: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: "#0E0F12",
    border: `1px solid ${focus ? OG : "rgba(255,255,255,0.10)"}`,
    borderRadius: 8,
    padding: "11px 14px",
    fontSize: 13,
    color: "#E7E8EA",
    outline: "none",
    fontFamily: "inherit",
    boxShadow: focus ? "0 0 0 3px rgba(239,104,26,0.12)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function FocusInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={inputStyle(focus)}
    />
  );
}

function FocusSelect({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...inputStyle(focus), appearance: "none", WebkitAppearance: "none", cursor: "pointer", paddingRight: 36, color: value ? "#E7E8EA" : "#6B7280" }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o} style={{ color: "#1A1A18" }}>{o}</option>
        ))}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function StepProgress({ current }: { current: number }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: i < current ? GN : i === current ? OG : "rgba(255,255,255,0.06)",
              border: `1px solid ${i < current ? GN : i === current ? OG : "rgba(255,255,255,0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, fontFamily: MONO,
              color: i <= current ? "#fff" : "#52555C",
              transition: "all 0.2s",
            }}>
              {i < current
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < current ? GN : "rgba(255,255,255,0.07)", margin: "0 10px", transition: "background 0.3s" }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 0, marginTop: 10 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: i < STEPS.length - 1 ? 1 : "none", minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", color: i === current ? OG : i < current ? GN : "#52555C", marginBottom: 2 }}>
              {s.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 10.5, color: "#52555C" }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", background: disabled ? "rgba(239,104,26,0.4)" : OG, color: "#fff",
        fontSize: 14, fontWeight: 600, padding: "13px", border: "none", borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        boxShadow: disabled ? "none" : "0 6px 20px rgba(239,104,26,0.28)",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500,
        padding: "10px 20px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Step1({
  storeName, setStoreName, region, setRegion, currency, setCurrency,
  onNext,
}: {
  storeName: string; setStoreName: (v: string) => void;
  region: string; setRegion: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
  onNext: () => void;
}) {
  const canProceed = storeName.trim().length > 0 && region.length > 0 && currency.length > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Store Configuration</h2>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Tell us about your business so we can configure your region-specific margin rules.</p>
      </div>

      <div>
        <FieldLabel>Store Name</FieldLabel>
        <FocusInput value={storeName} onChange={setStoreName} placeholder="e.g. Al Noor Electronics" />
      </div>

      <div>
        <FieldLabel>Primary Region</FieldLabel>
        <FocusSelect value={region} onChange={setRegion} options={REGIONS} placeholder="Select region…" />
      </div>

      <div>
        <FieldLabel>Functional Currency</FieldLabel>
        <FocusSelect value={currency} onChange={setCurrency} options={CURRENCIES} placeholder="Select currency…" />
      </div>

      <div style={{ marginTop: 8 }}>
        <PrimaryBtn onClick={onNext} disabled={!canProceed}>
          Continue to Channel Connect →
        </PrimaryBtn>
      </div>
    </div>
  );
}

function Step2({
  talabatToken, setTalabatToken,
  jahezToken, setJahezToken,
  onNext, onBack,
}: {
  talabatToken: string; setTalabatToken: (v: string) => void;
  jahezToken: string; setJahezToken: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Inbound / Outbound Bridge</h2>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Connect your platforms. Salla is linked automatically — add delivery platform tokens to unlock outbound repricing.</p>
      </div>

      {/* Salla — pre-connected */}
      <div style={{ border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.06)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GN} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#E7E8EA" }}>Salla</div>
            <div style={{ fontSize: 11, color: "#6B7280", fontFamily: MONO }}>Inbound webhook · active</div>
          </div>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: GN, border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "3px 8px" }}>CONNECTED</span>
      </div>

      {/* Talabat */}
      <div>
        <FieldLabel>Talabat API Token <span style={{ color: "#52555C" }}>(optional)</span></FieldLabel>
        <FocusInput value={talabatToken} onChange={setTalabatToken} placeholder="tbt_live_xxxxxxxxxxxx" type="password" />
      </div>

      {/* Jahez */}
      <div>
        <FieldLabel>Jahez API Token <span style={{ color: "#52555C" }}>(optional)</span></FieldLabel>
        <FocusInput value={jahezToken} onChange={setJahezToken} placeholder="jhz_live_xxxxxxxxxxxx" type="password" />
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <div style={{ flex: 1 }}>
          <PrimaryBtn onClick={onNext}>
            Continue to Defense Floors →
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function Step3({
  marginFloor, setMarginFloor,
  categoryFloors, setCategoryFloor,
  onFinish, onBack,
}: {
  marginFloor: number; setMarginFloor: (v: number) => void;
  categoryFloors: Record<string, number>;
  setCategoryFloor: (cat: string, v: number) => void;
  onFinish: () => void; onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Define Defense Floors</h2>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Set your minimum net margin. PrizeSkout will defend these floors automatically across every connected aggregator.</p>
      </div>

      {/* Global floor */}
      <div style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E7E8EA" }}>Global Margin Floor</div>
            <div style={{ fontSize: 11, color: "#6B7280", fontFamily: MONO, marginTop: 2 }}>applied across all categories</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: OG }}>{marginFloor}%</div>
        </div>
        <input
          type="range" min={5} max={40} step={1} value={marginFloor}
          onChange={e => setMarginFloor(+e.target.value)}
          style={{ width: "100%", accentColor: OG, cursor: "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 10.5, color: "#52555C", marginTop: 6 }}>
          <span>5% (min)</span><span>40% (max)</span>
        </div>
      </div>

      {/* Category overrides */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 12, letterSpacing: "0.3px" }}>CATEGORY OVERRIDES (optional)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 16, background: "#0E0F12", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 12.5, color: "#A1A8B3", width: 110, flexShrink: 0 }}>{cat}</div>
              <input
                type="range" min={5} max={40} step={1}
                value={categoryFloors[cat] ?? marginFloor}
                onChange={e => setCategoryFloor(cat, +e.target.value)}
                style={{ flex: 1, accentColor: OG, cursor: "pointer" }}
              />
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: OG, width: 36, textAlign: "right", flexShrink: 0 }}>
                {categoryFloors[cat] ?? marginFloor}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <div style={{ flex: 1 }}>
          <PrimaryBtn onClick={onFinish}>
            Activate Defense Loops & Enter Command Room
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1
  const [storeName, setStoreName] = useState("");
  const [region, setRegion] = useState("");
  const [currency, setCurrency] = useState("");

  // Step 2
  const [talabatToken, setTalabatToken] = useState("");
  const [jahezToken, setJahezToken] = useState("");

  // Step 3
  const [marginFloor, setMarginFloor] = useState(18);
  const [categoryFloors, setCategoryFloors] = useState<Record<string, number>>({});

  function setCategoryFloor(cat: string, v: number) {
    setCategoryFloors(prev => ({ ...prev, [cat]: v }));
  }

  return (
    <div style={{
      minHeight: "100vh", background: BG, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 24px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');`}</style>

      {/* Logo + back link */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={logoDark} alt="PrizeSkout" style={{ height: 26, width: "auto" }} />
        <a href="/" style={{ fontSize: 12, color: "#52555C", textDecoration: "none", fontFamily: MONO }}>← Back to home</a>
      </div>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        <StepProgress current={step} />
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 560, background: "#0B0C0F",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "36px 40px",
      }}>
        {step === 0 && (
          <Step1
            storeName={storeName} setStoreName={setStoreName}
            region={region} setRegion={setRegion}
            currency={currency} setCurrency={setCurrency}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <Step2
            talabatToken={talabatToken} setTalabatToken={setTalabatToken}
            jahezToken={jahezToken} setJahezToken={setJahezToken}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Step3
            marginFloor={marginFloor} setMarginFloor={setMarginFloor}
            categoryFloors={categoryFloors} setCategoryFloor={setCategoryFloor}
            onFinish={() => navigate({ to: "/dashboard/revenue-hub" })}
            onBack={() => setStep(1)}
          />
        )}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 28, fontFamily: MONO, fontSize: 10.5, color: "#3A3D46", textAlign: "center" }}>
        PRIZESKOUT · DATA PROCESSED IN-REGION · QFC-COMPLIANT
      </div>
    </div>
  );
}
