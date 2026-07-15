import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
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
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";

const STEPS = [
  { label: "Store Config",    sub: "Identify your business" },
  { label: "Channel Connect", sub: "Link your platforms"    },
  { label: "Defense Floors",  sub: "Set your margin rules"  },
];

const REGIONS    = ["Qatar", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Oman"] as const;
const CURRENCIES = ["QAR", "SAR", "AED", "KWD", "BHD", "OMR"] as const;
const CATEGORIES = ["Electronics", "Grocery", "Fashion", "Home & Garden", "F&B"];

const REGION_CODE: Record<string, string> = {
  "Qatar": "QA", "Saudi Arabia": "SA", "UAE": "AE",
  "Kuwait": "KW", "Bahrain": "BH", "Oman": "OM",
};

function makeAccessCode(region: string): string {
  const rc = REGION_CODE[region] ?? "QA";
  const n  = String(Math.floor(1000 + Math.random() * 9000));
  return `PSK-${rc}-${n}`;
}

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputStyle(open),
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", textAlign: "left",
          color: value ? "#E7E8EA" : "#6B7280",
        }}
      >
        <span>{value || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
          style={{ flexShrink: 0, marginLeft: 8, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#0E0F12", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
          overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {options.map(o => (
            <button
              key={o}
              type="button"
              onMouseDown={() => { onChange(o); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 14px", fontSize: 13, color: o === value ? OG : "#E7E8EA",
                background: o === value ? "rgba(239,104,26,0.08)" : "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (o !== value) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = o === value ? "rgba(239,104,26,0.08)" : "transparent"; }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
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
        padding: "12px 20px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Step1({
  storeName, setStoreName, email, setEmail, region, setRegion, currency, setCurrency, onNext,
}: {
  storeName: string; setStoreName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  region: string; setRegion: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
  onNext: () => void;
}) {
  const emailValid = email.trim().length === 0 || email.includes("@");
  const canProceed = storeName.trim().length > 0 && region.length > 0 && currency.length > 0 && email.trim().length > 0 && emailValid;
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
        <FieldLabel>Email address</FieldLabel>
        <FocusInput value={email} onChange={setEmail} placeholder="you@company.com" type="email" />
        <div style={{ fontSize: 11, color: "#52555C", marginTop: 5 }}>
          Used to access your dashboard from any device later.
        </div>
      </div>

      <div>
        <FieldLabel>Region</FieldLabel>
        <FocusSelect value={region} onChange={setRegion} options={REGIONS} placeholder="Select region…" />
      </div>

      <div>
        <FieldLabel>Currency</FieldLabel>
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

function EcommCard({
  name, glyph, glyphColor, glyphBg, connected, onConnect,
}: {
  name: string; glyph: string; glyphColor: string; glyphBg: string;
  connected: boolean; onConnect: () => void;
}) {
  return (
    <div style={{
      border: `1px solid ${connected ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`,
      background: connected ? "rgba(16,185,129,0.06)" : "#0E0F12",
      borderRadius: 10, padding: "14px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: glyphBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {connected
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GN} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            : <span style={{ fontWeight: 700, fontSize: 14, color: glyphColor, fontFamily: MONO }}>{glyph}</span>
          }
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#E7E8EA" }}>{name}</div>
          <div style={{ fontSize: 11, color: "#6B7280", fontFamily: MONO }}>
            {connected ? "Connected · syncing catalog" : "E-commerce platform · OAuth 2.0"}
          </div>
        </div>
      </div>
      {connected
        ? <span style={{ fontFamily: MONO, fontSize: 11, color: GN, border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "3px 8px" }}>CONNECTED</span>
        : <button
            type="button"
            onClick={onConnect}
            style={{
              background: OG, color: "#fff", fontSize: 12, fontWeight: 600,
              padding: "7px 14px", border: "none", borderRadius: 7,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(239,104,26,0.22)",
            }}
          >
            Connect {name} →
          </button>
      }
    </div>
  );
}

function Step2({
  merchantId,
  sallaConnected, zidConnected,
  talabatToken, setTalabatToken,
  snoonuToken, setSnoonuToken,
  keetaToken, setKeetaToken,
  jahezToken, setJahezToken,
  onNext, onBack,
}: {
  merchantId: string;
  sallaConnected: boolean;
  zidConnected: boolean;
  talabatToken: string; setTalabatToken: (v: string) => void;
  snoonuToken: string; setSnoonuToken: (v: string) => void;
  keetaToken: string; setKeetaToken: (v: string) => void;
  jahezToken: string; setJahezToken: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  function connectSalla() {
    window.location.href = `/api/auth/salla?merchant_id=${encodeURIComponent(merchantId)}&return_to=%2Fonboarding`;
  }
  function connectZid() {
    window.location.href = `/api/auth/zid?merchant_id=${encodeURIComponent(merchantId)}&return_to=%2Fonboarding`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Connect Your Platforms</h2>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Connect your e-commerce store and delivery aggregators to start tracking margin in real time.</p>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.6px", marginBottom: 10 }}>E-COMMERCE PLATFORMS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <EcommCard
            name="Salla" glyph="S" glyphColor="#E7E8EA" glyphBg="rgba(99,102,241,0.15)"
            connected={sallaConnected} onConnect={connectSalla}
          />
          <EcommCard
            name="Zid" glyph="Z" glyphColor="#E7E8EA" glyphBg="rgba(239,104,26,0.15)"
            connected={zidConnected} onConnect={connectZid}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.6px", marginBottom: 10 }}>
          DELIVERY AGGREGATORS <span style={{ color: "#3A3D46", fontWeight: 400 }}>(optional)</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <FieldLabel>Talabat API Token</FieldLabel>
            <FocusInput value={talabatToken} onChange={setTalabatToken} placeholder="tbt_live_xxxxxxxxxxxx" type="password" />
          </div>
          <div>
            <FieldLabel>Snoonu API Token</FieldLabel>
            <FocusInput value={snoonuToken} onChange={setSnoonuToken} placeholder="snu_live_xxxxxxxxxxxx" type="password" />
          </div>
          <div>
            <FieldLabel>Keeta API Token</FieldLabel>
            <FocusInput value={keetaToken} onChange={setKeetaToken} placeholder="kta_live_xxxxxxxxxxxx" type="password" />
          </div>
          <div>
            <FieldLabel>Jahez API Token</FieldLabel>
            <FocusInput value={jahezToken} onChange={setJahezToken} placeholder="jhz_live_xxxxxxxxxxxx" type="password" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <div style={{ flex: 1 }}>
          <PrimaryBtn onClick={onNext}>Continue to Defense Floors →</PrimaryBtn>
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
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Set your minimum net margin. PrizeSkout defends these floors automatically across every connected aggregator.</p>
      </div>

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
          <PrimaryBtn onClick={onFinish}>Activate Defense Loops & Enter Command Room</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function AccessCodeScreen({ code, onEnter }: { code: string; onEnter: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      {/* Success ring */}
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 22px",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l4 4L19 7" />
        </svg>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#E7E8EA", margin: "0 0 8px" }}>
        Defense loops activated
      </h2>
      <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.75, margin: "0 auto 28px", maxWidth: 360 }}>
        This is your store access code. Save it somewhere safe — entering it on any device restores your full dashboard. No account needed.
      </p>

      {/* Code badge */}
      <div style={{
        fontFamily: MONO, fontSize: 30, fontWeight: 700, letterSpacing: "0.14em",
        color: OG, background: "rgba(239,104,26,0.07)",
        border: "1px solid rgba(239,104,26,0.28)", borderRadius: 14,
        padding: "20px 28px", display: "inline-block",
        boxShadow: "0 0 32px rgba(239,104,26,0.12)",
        marginBottom: 18,
      }}>
        {code}
      </div>

      {/* Copy button */}
      <div style={{ marginBottom: 28 }}>
        <button
          type="button"
          onClick={copyCode}
          style={{
            background: "transparent", color: copied ? GN : "#9CA3AF",
            fontSize: 13, fontWeight: 500,
            border: `1px solid ${copied ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.10)"}`,
            borderRadius: 8, padding: "9px 20px",
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 7,
          }}
        >
          {copied
            ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Copied</>
            : <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy code
              </>
          }
        </button>
      </div>

      <PrimaryBtn onClick={onEnter}>Enter Command Room →</PrimaryBtn>

      <div style={{ marginTop: 22, fontSize: 11.5, color: "#3A3D46", fontFamily: MONO }}>
        You can also find this code in Settings → Store Access
      </div>
    </div>
  );
}

function RestoreForm({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        setError("Code not found. Double-check the letters and numbers and try again.");
        return;
      }
      const data = await res.json() as { merchant_id: string };
      localStorage.setItem("ps_merchant_id", data.merchant_id);
      localStorage.setItem("ps_access_code", code.trim().toUpperCase());
      localStorage.setItem("ps_connected", "true");
      navigate({ to: "/dashboard/revenue-hub" });
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Restore dashboard access</h2>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Enter the store access code you received when you first connected. It looks like PSK-QA-0000.</p>
      </div>

      <div>
        <FieldLabel>Access Code</FieldLabel>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
          placeholder="PSK-QA-0000"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={e => { if (e.key === "Enter") handleRestore(); }}
          style={{
            ...inputStyle(focus),
            fontFamily: MONO,
            letterSpacing: "0.1em",
            fontSize: 18,
            fontWeight: 600,
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: "#F87171", marginTop: 8 }}>{error}</div>
        )}
      </div>

      <PrimaryBtn onClick={handleRestore} disabled={!code.trim() || loading}>
        {loading ? "Restoring…" : "Restore access →"}
      </PrimaryBtn>

      <button
        type="button"
        onClick={onCancel}
        style={{
          background: "transparent", border: "none", color: "#52555C",
          fontSize: 13, cursor: "pointer", fontFamily: MONO,
          padding: "12px 0", textAlign: "center",
        }}
      >
        ← New store? Connect here
      </button>
    </div>
  );
}

function OnboardingPage() {
  const [step, setStep]               = useState(0);
  const [restoreMode, setRestoreMode] = useState(false);
  const [accessCode, setAccessCode]   = useState("");
  const navigate = useNavigate();

  // Step 1
  const [storeName, setStoreName] = useState(() => sessionStorage.getItem("ps_ob_storeName") ?? "");
  const [email, setEmail]         = useState(() => sessionStorage.getItem("ps_ob_email")     ?? "");
  const [region, setRegion]       = useState(() => sessionStorage.getItem("ps_ob_region")    ?? "");
  const [currency, setCurrency]   = useState(() => sessionStorage.getItem("ps_ob_currency")  ?? "");

  // Step 2 — merchant_id generated when advancing from Step 1
  const [merchantId,     setMerchantId]     = useState(() => localStorage.getItem("ps_merchant_id") ?? "");
  const [sallaConnected, setSallaConnected] = useState(false);
  const [zidConnected,   setZidConnected]   = useState(false);

  // Step 2 aggregator tokens
  const [talabatToken, setTalabatToken] = useState("");
  const [snoonuToken,  setSnoonuToken]  = useState("");
  const [keetaToken,   setKeetaToken]   = useState("");
  const [jahezToken,   setJahezToken]   = useState("");

  // Step 3
  const [marginFloor, setMarginFloor]         = useState(18);
  const [categoryFloors, setCategoryFloors]   = useState<Record<string, number>>({});
  function setCategoryFloor(cat: string, v: number) {
    setCategoryFloors(prev => ({ ...prev, [cat]: v }));
  }

  // Handle return from OAuth (Salla/Zid redirect back here with ?salla_connected=1 etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sc = params.get("salla_connected") === "1";
    const zc = params.get("zid_connected")   === "1";
    if (sc) setSallaConnected(true);
    if (zc) setZidConnected(true);
    if (sc || zc) {
      setStep(1);
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStep1Next() {
    // Persist form data so it survives the OAuth redirect
    sessionStorage.setItem("ps_ob_storeName", storeName);
    sessionStorage.setItem("ps_ob_email",     email);
    sessionStorage.setItem("ps_ob_region",    region);
    sessionStorage.setItem("ps_ob_currency",  currency);

    // Ensure merchant_id exists before showing OAuth buttons
    let mid = localStorage.getItem("ps_merchant_id") ?? "";
    if (!mid) {
      mid = crypto.randomUUID();
      localStorage.setItem("ps_merchant_id", mid);
    }
    setMerchantId(mid);
    setStep(1);
  }

  async function handleFinish() {
    let mid = merchantId || localStorage.getItem("ps_merchant_id") || "";
    if (!mid) {
      mid = crypto.randomUUID();
      localStorage.setItem("ps_merchant_id", mid);
      setMerchantId(mid);
    }
    const code = makeAccessCode(region);
    localStorage.setItem("ps_access_code", code);
    localStorage.setItem("ps_connected", "true");

    // Persist code mapping in the background — don't block navigation
    fetch("/api/register-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: mid, code }),
    }).catch(() => {});

    // Create Supabase account in the background so the merchant can use
    // email access immediately after onboarding without needing the code.
    if (email.trim()) {
      fetch("/api/auth/email-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), store_name: storeName.trim() }),
      }).catch(() => {});
    }

    setAccessCode(code);
    setStep(3);
  }

  const showProgress = !restoreMode && step < 3;

  return (
    <div style={{
      minHeight: "100vh", background: BG, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "24px 16px",
      fontFamily: "'Chillax', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @media(min-width:600px){.ob-card{padding:36px 40px!important}}
      `}</style>

      {/* Logo + back link */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={logoDark} alt="PrizeSkout" style={{ height: 26, width: "auto" }} />
        {step < 3 && (
          <a href="/" style={{ fontSize: 13, color: "#52555C", textDecoration: "none", fontFamily: MONO, padding: "8px 0" }}>← Back to home</a>
        )}
      </div>

      {/* Step progress (hidden on code screen and restore mode) */}
      {showProgress && (
        <div style={{ width: "100%", maxWidth: 560 }}>
          <StepProgress current={step} />
        </div>
      )}

      {/* Card */}
      <div className="ob-card" style={{
        width: "100%", maxWidth: 560, background: "#0B0C0F",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 20px",
      }}>
        {restoreMode ? (
          <RestoreForm onCancel={() => setRestoreMode(false)} />
        ) : step === 0 ? (
          <Step1
            storeName={storeName} setStoreName={setStoreName}
            email={email} setEmail={setEmail}
            region={region} setRegion={setRegion}
            currency={currency} setCurrency={setCurrency}
            onNext={handleStep1Next}
          />
        ) : step === 1 ? (
          <Step2
            merchantId={merchantId}
            sallaConnected={sallaConnected}
            zidConnected={zidConnected}
            talabatToken={talabatToken} setTalabatToken={setTalabatToken}
            snoonuToken={snoonuToken}   setSnoonuToken={setSnoonuToken}
            keetaToken={keetaToken}     setKeetaToken={setKeetaToken}
            jahezToken={jahezToken}     setJahezToken={setJahezToken}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        ) : step === 2 ? (
          <Step3
            marginFloor={marginFloor} setMarginFloor={setMarginFloor}
            categoryFloors={categoryFloors} setCategoryFloor={setCategoryFloor}
            onFinish={handleFinish}
            onBack={() => setStep(1)}
          />
        ) : (
          <AccessCodeScreen
            code={accessCode}
            onEnter={() => navigate({ to: "/dashboard/revenue-hub" })}
          />
        )}
      </div>

      {/* Footer row */}
      {step < 3 && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: "#3A3D46", textAlign: "center" }}>
            PRIZESKOUT · DATA PROCESSED IN-REGION · QFC-COMPLIANT
          </div>
          {!restoreMode && (
            <>
              <button
                type="button"
                onClick={() => setRestoreMode(true)}
                style={{
                  background: "transparent", border: "none",
                  fontFamily: MONO, fontSize: 13, color: "#52555C",
                  cursor: "pointer", padding: "4px 0",
                  textDecoration: "underline", textUnderlineOffset: 3,
                }}
              >
                Already have an access code? Restore access →
              </button>
              <a
                href="/access"
                style={{
                  fontFamily: MONO, fontSize: 13, color: "#52555C",
                  textDecoration: "underline", textUnderlineOffset: 3,
                }}
              >
                Or access via email →
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
