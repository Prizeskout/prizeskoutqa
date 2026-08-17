import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import logoLight from "@/assets/logo-light.svg";

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
const BG = "#F7F9FC";
const NAVY = "#10182D";
const MUTED = "#687389";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";

const STEPS = [
  { label: "Your business",       sub: "Region and account" },
  { label: "Connect channels",    sub: "Bring your data in" },
  { label: "Set your protection", sub: "Choose margin controls" },
];

const REGIONS    = ["Qatar", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Oman"] as const;
const CURRENCIES = ["QAR", "SAR", "AED", "KWD", "BHD", "OMR"] as const;
const CATEGORIES = ["Electronics", "Grocery", "Fashion", "Home & Garden", "F&B"];

const REGION_CODE: Record<string, string> = {
  "Qatar": "QA", "Saudi Arabia": "SA", "UAE": "AE",
  "Kuwait": "KW", "Bahrain": "BH", "Oman": "OM",
};
const COUNTRY_DEFAULTS: Record<string, [string,string]> = {
  qa:["Qatar","QAR"],sa:["Saudi Arabia","SAR"],ae:["UAE","AED"],kw:["Kuwait","KWD"],bh:["Bahrain","BHD"],om:["Oman","OMR"],
};
const REGION_CURRENCY: Record<string,string> = {Qatar:"QAR","Saudi Arabia":"SAR",UAE:"AED",Kuwait:"KWD",Bahrain:"BHD",Oman:"OMR"};

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function inputStyle(focus?: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: "#fff",
    border: `1px solid ${focus ? OG : "#DDE3EB"}`,
    borderRadius: 10,
    padding: "13px 14px",
    fontSize: 13,
    color: NAVY,
    outline: "none",
    fontFamily: "inherit",
    boxShadow: focus ? "0 0 0 3px rgba(239,104,26,0.10)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 7 }}>
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
          color: value ? NAVY : "#8A93A3",
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
          background: "#fff", border: "1px solid #DDE3EB", borderRadius: 10,
          overflow: "hidden", boxShadow: "0 16px 40px rgba(16,24,45,0.14)",
        }}>
          {options.map(o => (
            <button
              key={o}
              type="button"
              onMouseDown={() => { onChange(o); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 14px", fontSize: 13, color: o === value ? OG : NAVY,
                background: o === value ? "#FFF4EC" : "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (o !== value) (e.currentTarget as HTMLButtonElement).style.background = "#F7F9FC"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = o === value ? "#FFF4EC" : "transparent"; }}
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
    <div className="ob-progress" style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: i < current ? GN : i === current ? OG : "#EEF1F5",
              border: `1px solid ${i < current ? GN : i === current ? OG : "#DDE3EB"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, fontFamily: MONO,
              color: i <= current ? "#fff" : "#8A93A3",
              transition: "all 0.2s",
            }}>
              {i < current
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < current ? GN : "#DDE3EB", margin: "0 10px", transition: "background 0.3s" }} />
            )}
          </div>
        ))}
      </div>
      <div className="ob-progress-copy" style={{ display: "flex", gap: 0, marginTop: 10 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: i < STEPS.length - 1 ? 1 : "none", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: i === current ? OG : i < current ? GN : "#8A93A3", marginBottom: 2 }}>
              {s.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 10.5, color: MUTED }}>{s.sub}</div>
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
        <span className="ob-kicker">YOUR BUSINESS</span>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: "7px 0 7px" }}>Tell us about your business</h2>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>We use this to prepare the right currency, channels and margin controls.</p>
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
        <FocusSelect value={region} onChange={value=>{setRegion(value);setCurrency(REGION_CURRENCY[value]??"")}} options={REGIONS} placeholder="Select region…" />
      </div>

      <div>
        <FieldLabel>Currency</FieldLabel>
        <FocusSelect value={currency} onChange={setCurrency} options={CURRENCIES} placeholder="Select currency…" />
      </div>

      <div style={{ marginTop: 8 }}>
        <PrimaryBtn onClick={onNext} disabled={!canProceed}>
          Continue to connect channels →
        </PrimaryBtn>
      </div>
    </div>
  );
}

function EcommCard({
  name, glyph, glyphColor, glyphBg, connected, onConnect, featured = false,
}: {
  name: string; glyph: string; glyphColor: string; glyphBg: string;
  connected: boolean; onConnect: () => void; featured?: boolean;
}) {
  return (
    <div className={`ob-channel ${featured ? "featured" : ""}`} style={{
      border: `1px solid ${connected ? "#A9E5CC" : featured ? "#F36A21" : "#DDE3EB"}`,
      background: connected ? "#F0FAF6" : featured ? "linear-gradient(135deg,#FFF7F1,#fff)" : "#fff",
      borderRadius: featured ? 16 : 12, padding: featured ? "22px" : "15px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      boxShadow: featured ? "0 18px 45px rgba(243,106,33,.10)" : "none",
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
          <div className="ob-channel-name" style={{ display:"flex",alignItems:"center",gap:8,fontSize: featured ? 17 : 13.5, fontWeight: 700, color: NAVY }}>{name}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop:4 }}>
            {connected ? "Connected and syncing your catalogue" : featured ? "Official integration for products, orders and inventory" : "Supported storefront connection"}
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
              padding: featured ? "10px 16px" : "8px 14px", border: "none", borderRadius: 9,
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
  onboardingToken,
  sallaConnected, zidConnected,
  talabat, setTalabat,
  jahez, setJahez,
  onNext, onBack,
}: {
  merchantId: string;
  onboardingToken: string;
  sallaConnected: boolean;
  zidConnected: boolean;
  talabat: Record<string,string>; setTalabat: (v:Record<string,string>) => void;
  jahez: Record<string,string>; setJahez: (v:Record<string,string>) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [validationError,setValidationError]=useState("");
  function connectSalla() {
    window.location.href = `/api/auth/salla?merchant_id=${encodeURIComponent(merchantId)}&onboarding_token=${encodeURIComponent(onboardingToken)}&return_to=%2Fonboarding`;
  }
  function connectZid() {
    window.location.href = `/api/auth/zid?merchant_id=${encodeURIComponent(merchantId)}&onboarding_token=${encodeURIComponent(onboardingToken)}&return_to=%2Fonboarding`;
  }
  const updateTalabat=(key:string,value:string)=>setTalabat({...talabat,[key]:value});
  const updateJahez=(key:string,value:string)=>setJahez({...jahez,[key]:value});
  const talabatReady=["client_id","client_secret","vendor_id","chain_id","commission_rate_pct"].every(key=>talabat[key]?.trim());
  const jahezReady=["api_key","secret_code","branch_id"].every(key=>jahez[key]?.trim());
  const hasTalabat=Object.values(talabat).some(value=>value.trim());
  const hasJahez=Object.values(jahez).some(value=>value.trim());
  const hasConnectedChannel=sallaConnected||zidConnected||talabatReady||jahezReady;
  const missingTalabat=[
    ["client_id","Client ID"],["client_secret","Client Secret"],["vendor_id","Vendor ID"],
    ["chain_id","Chain ID"],["commission_rate_pct","contract commission"],
  ].filter(([key])=>!talabat[key]?.trim()).map(([,label])=>label);
  const missingJahez=[["api_key","API Key"],["secret_code","Secret Code"],["branch_id","Branch ID"]]
    .filter(([key])=>!jahez[key]?.trim()).map(([,label])=>label);
  function continueToProtection(){
    if(hasTalabat&&!talabatReady){setValidationError(`Complete Talabat before continuing: ${missingTalabat.join(", ")}.`);return;}
    if(hasJahez&&!jahezReady){setValidationError(`Complete Jahez before continuing: ${missingJahez.join(", ")}.`);return;}
    setValidationError("");onNext();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <span className="ob-kicker">BRING YOUR DATA IN</span>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: "7px 0 7px" }}>Connect your channels</h2>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Start with your storefront, then add any connected channels you use.</p>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.12em", marginBottom: 10 }}>START HERE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <EcommCard
            featured name="Zid" glyph="Z" glyphColor={OG} glyphBg="#FFF0E6"
            connected={zidConnected} onConnect={connectZid}
          />
          <EcommCard
            name="Salla" glyph="S" glyphColor={NAVY} glyphBg="#EEF1F6"
            connected={sallaConnected} onConnect={connectSalla}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.6px", marginBottom: 10 }}>
          CONNECT YOUR ACTIVE CHANNELS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ob-credential-group"><h3>Talabat Partner API</h3><p>PrizeSkout exchanges your Client ID and Client Secret for short-lived Talabat access tokens.</p><div className="ob-credential-grid">
            <div><FieldLabel>Environment</FieldLabel><select value={talabat.environment??"sandbox"} onChange={event=>updateTalabat("environment",event.target.value)} style={{width:"100%",height:42,border:"1px solid #D8DEE8",borderRadius:9,padding:"0 12px",background:"#fff",color:NAVY}}><option value="sandbox">Sandbox (testing)</option><option value="production">Production</option></select></div>
            <div><FieldLabel>Client ID</FieldLabel><FocusInput value={talabat.client_id??""} onChange={v=>updateTalabat("client_id",v)} placeholder="From Talabat Partner Portal" /></div>
            <div><FieldLabel>Client Secret</FieldLabel><FocusInput value={talabat.client_secret??""} onChange={v=>updateTalabat("client_secret",v)} type="password" /></div>
            <div><FieldLabel>Vendor ID</FieldLabel><FocusInput value={talabat.vendor_id??""} onChange={v=>updateTalabat("vendor_id",v)} /></div>
            <div><FieldLabel>Chain ID</FieldLabel><FocusInput value={talabat.chain_id??""} onChange={v=>updateTalabat("chain_id",v)} placeholder="UUID from Shops Integrations" /></div>
            <div><FieldLabel>Contract commission (%)</FieldLabel><FocusInput value={talabat.commission_rate_pct??""} onChange={v=>updateTalabat("commission_rate_pct",v)} placeholder="e.g. 19" /></div>
          </div></div>
          <div className="ob-credential-group"><h3>Jahez</h3><p>Credentials are stored securely and remain pending until verification completes.</p><div className="ob-credential-grid">
            <div><FieldLabel>API Key</FieldLabel><FocusInput value={jahez.api_key??""} onChange={v=>updateJahez("api_key",v)} /></div>
            <div><FieldLabel>Secret Code</FieldLabel><FocusInput value={jahez.secret_code??""} onChange={v=>updateJahez("secret_code",v)} type="password" /></div>
            <div><FieldLabel>Branch ID</FieldLabel><FocusInput value={jahez.branch_id??""} onChange={v=>updateJahez("branch_id",v)} /></div>
          </div></div>
          <div className="ob-import-note"><b>Snoonu</b><span>Connect through payout report import after setup. A live API credential connector is not currently available.</span></div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
        <div style={{ flex: 1 }}>
          <PrimaryBtn onClick={continueToProtection} disabled={!hasConnectedChannel}>Continue to set protection →</PrimaryBtn>
        </div>
      </div>
      {validationError
        ? <p role="alert" style={{margin:0,color:"#B42318",fontSize:11,textAlign:"center"}}>{validationError}</p>
        : !hasConnectedChannel&&<p style={{margin:0,color:MUTED,fontSize:11,textAlign:"center"}}>Connect Zid or Salla, or complete the required Talabat or Jahez credentials to continue.</p>}
    </div>
  );
}

function Step3({
  marginFloor, setMarginFloor,
  categoryFloors, setCategoryFloor,
  onFinish, onBack, finishing, finishError,
}: {
  marginFloor: number; setMarginFloor: (v: number) => void;
  categoryFloors: Record<string, number>;
  setCategoryFloor: (cat: string, v: number) => void;
  onFinish: () => void; onBack: () => void; finishing:boolean;finishError:string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <span className="ob-kicker">SET YOUR PROTECTION</span>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: "7px 0 7px" }}>Choose your margin floor</h2>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Set the minimum margin PrizeSkout should protect when preparing channel actions.</p>
      </div>

      <div style={{ background: "#F8FAFC", border: "1px solid #DDE3EB", borderRadius: 14, padding: "20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Global Margin Floor</div>
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
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #DDE3EB", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 12.5, color: NAVY, width: 110, flexShrink: 0 }}>{cat}</div>
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
          <PrimaryBtn onClick={onFinish} disabled={finishing}>{finishing?"Verifying channels…":"Activate protection and enter dashboard"}</PrimaryBtn>
        </div>
      </div>
      {finishError&&<p role="alert" style={{margin:0,padding:"11px 13px",border:"1px solid #F5B9B5",borderRadius:9,background:"#FFF2F1",color:"#C83F36",fontSize:12}}>{finishError}</p>}
    </div>
  );
}

type TalabatWebhookSetup={orderUrl:string;assortmentUrl:string;token:string};
function AccessCodeScreen({ code, talabatWebhookSetup, onEnter }: { code: string; talabatWebhookSetup?: TalabatWebhookSetup; onEnter: () => void }) {
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

      {talabatWebhookSetup&&<div style={{margin:"24px auto 0",maxWidth:560,padding:16,border:"1px solid rgba(255,255,255,.1)",borderRadius:12,textAlign:"left"}}><b style={{display:"block",color:"#E7E8EA",fontSize:13}}>Finish Talabat webhook setup</b><p style={{color:"#7B8290",fontSize:12,lineHeight:1.6}}>Enter each URL in its matching Partner Portal field, then configure the static token as the webhook Authorization token. The token is shown only during setup.</p>{[["ORDER WEBHOOK",talabatWebhookSetup.orderUrl],["ASSORTMENT WEBHOOK",talabatWebhookSetup.assortmentUrl],["AUTHORIZATION TOKEN",talabatWebhookSetup.token]].map(([label,value])=><div key={label} style={{marginTop:10}}><small style={{display:"block",marginBottom:5,color:"#7B8290",fontFamily:MONO}}>{label}</small><button type="button" onClick={()=>navigator.clipboard.writeText(value)} style={{width:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"10px 12px",border:"1px solid rgba(239,104,26,.3)",borderRadius:8,background:"rgba(239,104,26,.08)",color:OG,fontFamily:MONO,cursor:"pointer"}}>{value}</button></div>)}</div>}

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
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Enter the secure store access code you received when you first connected.</p>
      </div>

      <div>
        <FieldLabel>Access Code</FieldLabel>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
          placeholder="PSK-QA-SECURE-CODE"
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
  const [talabatWebhookSetup,setTalabatWebhookSetup]=useState<TalabatWebhookSetup>();
  const navigate = useNavigate();

  // Step 1 — storage-backed values start empty (matching what the server
  // renders, since sessionStorage doesn't exist there) and are hydrated from
  // sessionStorage in the mount effect below. Reading sessionStorage directly
  // in a useState initializer throws during SSR, which was knocking this
  // whole page into React's error-recovery client-render fallback on every
  // load — a startup crash the merchant would never see, but the actual
  // Zid/Salla marketplace install lands right here, so their reviewers would.
  const [storeName, setStoreName] = useState("");
  const [email, setEmail]         = useState("");
  const [region, setRegion]       = useState("");
  const [currency, setCurrency]   = useState("");

  // Step 2 — merchant_id generated when advancing from Step 1
  const [merchantId,     setMerchantId]     = useState("");
  const [onboardingToken,setOnboardingToken]= useState("");
  const [sallaConnected, setSallaConnected] = useState(false);
  const [zidConnected,   setZidConnected]   = useState(false);

  // Step 2 channel credentials. These are submitted only after the merchant
  // access code is registered, so the protected connection endpoint can
  // verify ownership before storing anything.
  const [talabat, setTalabat] = useState<Record<string,string>>({});
  const [jahez, setJahez] = useState<Record<string,string>>({});
  const [finishError,setFinishError]=useState("");
  const [finishing,setFinishing]=useState(false);

  // Step 3
  const [marginFloor, setMarginFloor]         = useState(18);
  const [categoryFloors, setCategoryFloors]   = useState<Record<string, number>>({});
  function setCategoryFloor(cat: string, v: number) {
    setCategoryFloors(prev => ({ ...prev, [cat]: v }));
  }

  // Whether this browser already has a fully-completed onboarding sitting in
  // localStorage — read in the mount effect below, before any clearing/
  // regenerating, so the "already set up" prompt below can offer a real
  // choice instead of silently reusing (or silently wiping) whatever's
  // cached. Starts false so server and first client paint agree; flips true
  // a tick after mount for a returning browser.
  const [existingSetup, setExistingSetup] = useState(false);

  // handleStep1Next/handleFinish only generate a fresh merchant_id when
  // localStorage has none at all — by design, so refreshing mid-onboarding
  // (or an OAuth redirect away and back) doesn't lose progress. But that
  // means visiting /onboarding again on a browser that already completed
  // one, intending to set up a *different* store, silently continues under
  // the old identity instead — old connections and all. This is the only
  // place that actually starts over: clears every ps_* key and resets state.
  function startFreshOnboarding() {
    localStorage.removeItem("ps_merchant_id");
    localStorage.removeItem("ps_access_code");
    localStorage.removeItem("ps_connected");
    localStorage.removeItem("ps_tour_v1_done"); // so the product tour runs for the new store too
    localStorage.removeItem("ps_first_value_step_v1");
    sessionStorage.removeItem("ps_ob_storeName");
    sessionStorage.removeItem("ps_ob_email");
    sessionStorage.removeItem("ps_ob_region");
    sessionStorage.removeItem("ps_ob_currency");
    sessionStorage.removeItem("ps_ob_capability");
    setMerchantId(""); setStoreName(""); setEmail(""); setRegion(""); setCurrency("");
    setSallaConnected(false); setZidConnected(false);
    setTalabat({});setJahez({});
    setRestoreMode(false); setStep(0);
    setExistingSetup(false);
  }

  // Restore anything a returning browser already has cached — see the
  // "starts empty" comments on the state above for why this can't run in
  // the initializers themselves.
  useEffect(() => {
    const landingDefault = COUNTRY_DEFAULTS[localStorage.getItem("prizeskout-country") ?? ""];
    setStoreName(sessionStorage.getItem("ps_ob_storeName") ?? "");
    setEmail(sessionStorage.getItem("ps_ob_email") ?? "");
    setRegion(sessionStorage.getItem("ps_ob_region") ?? landingDefault?.[0] ?? "");
    setCurrency(sessionStorage.getItem("ps_ob_currency") ?? landingDefault?.[1] ?? "");
    setMerchantId(localStorage.getItem("ps_merchant_id") ?? "");
    setOnboardingToken(sessionStorage.getItem("ps_ob_capability") ?? "");
    setExistingSetup(localStorage.getItem("ps_connected") === "true");
  }, []);

  // Handle return from OAuth (Salla/Zid redirect back here with ?salla_connected=1 etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sc = params.get("salla_connected") === "1";
    const zc = params.get("zid_connected")   === "1";
    const oauthMerchantId = params.get("merchant_id") ?? "";
    if (zc && oauthMerchantId) {
      localStorage.setItem("ps_merchant_id", oauthMerchantId);
      setMerchantId(oauthMerchantId);
    }
    if (sc) setSallaConnected(true);
    if (zc) setZidConnected(true);
    if (sc || zc) {
      setStep(1);
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStep1Next() {
    // Persist form data so it survives the OAuth redirect
    sessionStorage.setItem("ps_ob_storeName", storeName);
    sessionStorage.setItem("ps_ob_email",     email);
    sessionStorage.setItem("ps_ob_region",    region);
    sessionStorage.setItem("ps_ob_currency",  currency);

    try {
      let mid = localStorage.getItem("ps_merchant_id") ?? "";
      let token = sessionStorage.getItem("ps_ob_capability") ?? "";
      if (!mid || !token) {
        const response = await fetchWithTimeout("/api/onboarding/session", { method: "POST" });
        const session = await response.json() as { merchant_id?: string; token?: string };
        if (!response.ok || !session.merchant_id || !session.token) throw new Error("Could not start a secure onboarding session.");
        mid = session.merchant_id;
        token = session.token;
        localStorage.setItem("ps_merchant_id", mid);
        sessionStorage.setItem("ps_ob_capability", token);
      }
      setMerchantId(mid);
      setOnboardingToken(token);
      setStep(1);
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "Could not start onboarding.");
    }
  }

  async function handleFinish() {
    setFinishing(true);setFinishError("");
    const mid = merchantId || localStorage.getItem("ps_merchant_id") || "";
    const token = onboardingToken || sessionStorage.getItem("ps_ob_capability") || "";
    if (!mid || !token) { setFinishError("Your secure onboarding session expired. Go back and try again."); setFinishing(false); return; }

    // Register the access code before channel credentials. The channel
    // endpoint verifies this mapping and rejects unregistered callers.
    // is stored alongside the code so the "Access your dashboard -> Email"
    // login path can later verify a real onboarded merchant owns it, rather
    // than trusting whatever's cached in the browser's localStorage.
    try {
      const registration=await fetchWithTimeout("/api/register-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: mid, onboarding_token: token, region_code: REGION_CODE[region] ?? "QA", email: email.trim().toLowerCase() || undefined, store_name: storeName.trim() || undefined }),
      });
      if(!registration.ok)throw new Error("PrizeSkout could not secure your onboarding session. Please try again.");
      const registrationData = await registration.json() as { code?: string };
      const code = registrationData.code ?? "";
      if (!code) throw new Error("PrizeSkout did not issue an access code. Please try again.");
      for(const [platform,credentials] of [["talabat",talabat],["jahez",jahez]] as const){
        if(!Object.keys(credentials).length)continue;
        const response=await fetchWithTimeout("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id:mid,access_code:code,platform,...credentials,...(platform==="talabat"?{contract_currency:currency}:{})})});
        const result=await response.json() as {ok?:boolean;error?:string;order_webhook_url?:string;assortment_webhook_url?:string;webhook_token?:string};
        if(!response.ok||!result.ok)throw new Error(result.error??`PrizeSkout could not configure ${platform}.`);
        if(platform==="talabat"&&result.order_webhook_url&&result.assortment_webhook_url&&result.webhook_token){setTalabatWebhookSetup({orderUrl:result.order_webhook_url,assortmentUrl:result.assortment_webhook_url,token:result.webhook_token});}
      }
      localStorage.setItem("ps_access_code", code);
      localStorage.setItem("ps_connected", "true");
      setAccessCode(code);
    }catch(error){
      const message=error instanceof DOMException&&error.name==="AbortError"
        ? "The connection took too long. Nothing was lost. Please try again."
        : error instanceof Error?error.message:"Setup could not be completed.";
      setFinishError(message);setFinishing(false);return;
    }
    // Create the Supabase account in the background so the merchant can use
    // email access immediately after onboarding without needing the code.
    // intent:"signup" is what allows email-bridge to create a brand-new
    // Supabase user here — the login path (access.tsx) uses intent:"login"
    // and is not allowed to create accounts.
    if (email.trim()) {
      fetch("/api/auth/email-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), store_name: storeName.trim(), intent: "signup" }),
      }).catch(() => {});
    }

    setStep(3);
    setFinishing(false);
  }

  const showProgress = !restoreMode && step < 3;

  return (
    <div className="ob-shell" style={{
      minHeight: "100vh", background: BG, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "24px 16px",
      fontFamily: "'Chillax', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        .ob-card h2{color:${NAVY}!important}.ob-kicker{color:${OG};font-size:9px;font-weight:900;letter-spacing:.14em}.ob-shell{position:relative}.ob-shell:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 78% 8%,rgba(243,106,33,.09),transparent 28%)}.ob-credential-group{padding:18px;border:1px solid #DDE3EB;border-radius:14px;background:#F8FAFC}.ob-credential-group h3{margin:0;color:${NAVY};font-size:14px}.ob-credential-group>p{margin:5px 0 14px;color:${MUTED};font-size:11px;line-height:1.55}.ob-credential-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ob-import-note{display:flex;gap:12px;padding:14px;border:1px solid #DDE3EB;border-radius:12px;background:#fff}.ob-import-note b{color:${NAVY}}.ob-import-note span{color:${MUTED};font-size:11px;line-height:1.5}
        @media(min-width:600px){.ob-card{padding:38px 42px!important}}
        @media(max-width:600px){.ob-progress-copy{display:none}.ob-channel{align-items:flex-start!important;flex-direction:column}.ob-channel>button{width:100%}.ob-credential-grid{grid-template-columns:1fr}}
      `}</style>

      {/* Logo + back link */}
      <div style={{ width: "100%", maxWidth: 620, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between",position:"relative" }}>
        <img src={logoLight} alt="PrizeSkout" style={{ height: 30, width: "auto" }} />
        {step < 3 && (
          <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none", padding: "8px 0" }}>← Back to home</a>
        )}
      </div>

      {/* Step progress (hidden on code screen and restore mode) */}
      {showProgress && (
        <div style={{ width: "100%", maxWidth: 620,position:"relative" }}>
          <StepProgress current={step} />
        </div>
      )}

      {/* Card */}
      <div className="ob-card" style={{
        width: "100%", maxWidth: 620, background: "#fff",
        border: "1px solid #DDE3EB", borderRadius: 22, padding: "30px 22px",
        boxShadow: "0 28px 80px rgba(16,24,45,.09)", position:"relative",
      }}>
        {restoreMode ? (
          <RestoreForm onCancel={startFreshOnboarding} />
        ) : existingSetup && step === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>This browser already has a store set up</h2>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.7 }}>
                Continuing will take you to that dashboard. If you meant to set up a different store, start fresh below — that clears this browser's saved store, so choose carefully if this device is shared.
              </p>
            </div>
            <PrimaryBtn onClick={() => navigate({ to: "/dashboard/revenue-hub" })}>Continue to my dashboard →</PrimaryBtn>
            <button
              type="button"
              onClick={startFreshOnboarding}
              style={{ background: "transparent", border: "none", color: "#52555C", fontSize: 13, cursor: "pointer", fontFamily: MONO, padding: "8px 0", textAlign: "center" }}
            >
              Set up a different store instead
            </button>
          </div>
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
            onboardingToken={onboardingToken}
            sallaConnected={sallaConnected}
            zidConnected={zidConnected}
            talabat={talabat} setTalabat={setTalabat}
            jahez={jahez} setJahez={setJahez}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        ) : step === 2 ? (
          <Step3
            marginFloor={marginFloor} setMarginFloor={setMarginFloor}
            categoryFloors={categoryFloors} setCategoryFloor={setCategoryFloor}
            onFinish={handleFinish}
            onBack={() => setStep(1)}
            finishing={finishing} finishError={finishError}
          />
        ) : (
          <AccessCodeScreen
            code={accessCode}
            talabatWebhookSetup={talabatWebhookSetup}
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
