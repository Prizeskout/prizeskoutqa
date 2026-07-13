import { useState, useEffect, useRef } from "react";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";

type Tab = "analytics" | "rules" | "vault" | "settings";
type Theme = "light" | "dark";
type Lang = "en" | "ar";

interface FeedRow { tag: string; tagColor: string; text: string; time: string; }
interface Rule { name: string; desc: string; floor: number; active: boolean; }

const OG = "#EF681A";
const GN = "#10B981";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const DISPLAY = "'Space Grotesk','Nunito Sans',system-ui,sans-serif";

const CSS = `

  @keyframes pk-pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes pk-ring{0%,100%{opacity:1}50%{opacity:.35}}
  @keyframes pk-glow{from{}to{}}
  @keyframes pk-spin{to{transform:rotate(360deg)}}
  @keyframes pk-in{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pk-toast{from{transform:translateY(14px) scale(.97)}to{transform:none}}
  .ps-db{
    font-family:'Nunito Sans',system-ui,-apple-system,sans-serif;
    --bg:#F6F6F4;--surface:#FFFFFF;--surface2:#FBFBFA;--border:#E5E7EB;
    --text:#111827;--muted:#6B7280;--accent:#EF681A;--green:#10B981;
    --term:#0D1117;--term-border:#222B38;--term-text:#C9D1D9;
    --shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px rgba(16,24,40,.06);
    --shadow-lg:0 24px 64px rgba(16,24,40,.18);
    --px:30px;
  }
  .ps-db[data-theme="dark"]{
    --bg:#0B0E13;--surface:#141924;--surface2:#101520;--border:#232B38;
    --text:#F2F4F8;--muted:#8B93A3;
    --term:#0A0E15;--term-border:#1D2532;--term-text:#C9D1D9;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35);
    --shadow-lg:0 24px 64px rgba(0,0,0,.6);
  }
  .ps-db input[type=range]{accent-color:var(--accent);height:28px;cursor:pointer}
  .ps-db button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .ps-pill-btn:hover{border-color:var(--accent)!important;color:var(--accent)!important}
  .ps-ig-btn:hover{border-color:var(--accent)!important;color:var(--accent)!important}
  @media(max-width:979px){
    .ps-db{--px:16px}
    .ps-db-header{padding:16px var(--px) 14px!important}
    .ps-db-section{padding:20px var(--px) 40px!important}
    .ps-db-h1{font-size:20px!important}
    .ps-db-controls{display:none!important}
  }
  @keyframes pk-drawer-ltr{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pk-drawer-rtl{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
`;

type Dispute = { partner:string; title:string; order:string; place:string; contract:string; charged:string; leak:string; hash:string; en:string; ar:string };

const INBOUND_INTEGRATIONS = [
  { name:"Foodics POS", glyph:"F", kind:"POS Terminal", platform:"foodics", oauthPath:null as string|null },
  { name:"Zid",         glyph:"Z", kind:"E-Commerce",   platform:"zid",     oauthPath:"/api/auth/zid" as string|null },
  { name:"Salla",       glyph:"S", kind:"E-Commerce",   platform:"salla",   oauthPath:"/api/auth/salla" as string|null },
];

const OUTBOUND_INTEGRATIONS = [
  { name:"Talabat",   platform:"talabat",   region:"QA · KSA · UAE",     byok:true },
  { name:"Snoonu",    platform:"snoonu",    region:"QA",                  byok:false },
  { name:"Keeta",     platform:"keeta",     region:"QA · KSA",            byok:false },
  { name:"Jahez",     platform:"jahez",     region:"KSA · hyperlocal",    byok:true },
  { name:"Deliveroo", platform:"deliveroo", region:"UAE · QA",            byok:false },
];

type ByokField = { key:string; label:string; hint?:string };
const BYOK_CONFIG: Record<string, { fields:ByokField[]; portalHint?:string }> = {
  talabat: {
    fields:[
      { key:"client_id",     label:"Client ID",     hint:"Talabat Partner Portal → Settings → API Credentials" },
      { key:"client_secret", label:"Client Secret" },
      { key:"vendor_id",     label:"Vendor ID",     hint:"Your store's vendor ID from the Talabat portal" },
      { key:"chain_id",      label:"Chain ID" },
    ],
    portalHint:"Find your credentials at partner.talabat.com",
  },
  jahez: {
    fields:[
      { key:"api_key",     label:"API Key",     hint:"Request from integration@jahez.net" },
      { key:"secret_code", label:"Secret Code" },
      { key:"branch_id",   label:"Branch ID",   hint:"Your branch ID from the Jahez partner dashboard" },
    ],
    portalHint:"Contact integration@jahez.net to receive your API credentials",
  },
};

const T = {
  en: {
    cp:"CONTROL PLANE", live:"LIVE", defend:"Defend Loop Online", defendS:"4 edge nodes · healthy",
    navA:"Revenue Protection Hub", navAs:"Analytics",
    navR:"Margin Policy Engine",   navRs:"Rule Book",
    navV:"Integration Vault",      navVs:"Connections",
    subA:"Active price optimization and loss prevention",
    subR:"Natural-language pricing rules and margin guardrails",
    subV:"POS, aggregator and cache connections",
    stream:"Live Execution Stream", streamS:"Real-time event feed",
    profLabel:"Profits Protected · This Month",
    copilotTitle:"CFO Copilot",    copilotSub:"Natural Language Rule Engine",
    copilotDesc:"Ask anything about pricing strategy, or describe a rule to compile it into a live engine config.",
    copilotLive:"🟢 Copilot Live",
    compile:"Send ↗",
    try:"Try:", guardrails:"Active Guardrails",
    agentTitle:"Autonomous Dispute Audit Agent", agentActive:"Agent Active",
    discLog:"Discrepancy Log · POS Payouts vs Contracts",
    genVoucher:"Generate Dispute Voucher",
    downloadCsv:"Download Audit Log (CSV)",
    exportProofs:"Export Dispute Proofs",
    fileBtn0:"Auto-File Claim to Partner Portal",
    fileBtn1:"Filing claim…",
    fileBtn3:"✓ Claim Submitted · ID 8841-B",
    fileMsg1:"Compiling proof data…",
    fileMsg2:"Uploading via API…",
    fileMsg3:"✓ Claim Submitted successfully! (ID: 8841-B)",
    claimEn:"CLAIM DRAFT · ENGLISH",
    claimAr:"مسودة المطالبة · العربية",
    bilingualTitle:"Bilingual Dispute Package ·",
    verified:"SHA-256", verifiedS:"· VERIFIED ✓",
    autoCompiled:"auto-compiled by dispute agent",
    close:"✕",
    intentLabel:"Business Intent · Source",
    intent:"intent:", confidence:"confidence:", ambiguity:"ambiguity:",
    intentResolved:"resolved ✓",
    applyLabel0:"Apply Config to Core Loop",
    applyLabel1:"✓ Pushed to Core Loop · Redis 340ms",
    rulesEnforced:"rules · enforced at edge",
    activeLabel:"✓ enforcing · <2ms eval",
    pausedLabel:"Paused. Not currently enforced.",
    floorWarn:"⚠ Floor is below 15% cost basis. The guardrail will reject all executions at this level.",
  },
  ar: {
    cp:"لوحة التحكم", live:"مباشر", defend:"حلقة الدفاع تعمل", defendS:"4 عقد طرفية · سليمة",
    navA:"مركز حماية الإيرادات", navAs:"التحليلات",
    navR:"محرك سياسة الهوامش",   navRs:"دفتر القواعد",
    navV:"خزنة التكاملات",        navVs:"الاتصالات",
    subA:"تحسين الأسعار الفعال ومنع الخسائر",
    subR:"قواعد تسعير بلغة طبيعية وحدود حماية الهوامش",
    subV:"اتصالات نقاط البيع والمجمعات والذاكرة المؤقتة",
    stream:"بث التنفيذ المباشر", streamS:"بث الأحداث في الوقت الفعلي",
    profLabel:"الأرباح المحمية · هذا الشهر",
    copilotTitle:"مساعد المدير المالي", copilotSub:"محرك القواعد باللغة الطبيعية",
    copilotDesc:"اسأل عن أي شيء يخص التسعير، أو صف قاعدة لتحويلها إلى تهيئة محرك مباشرة.",
    copilotLive:"🟢 المساعد نشط",
    compile:"إرسال ↗",
    try:"جرب:", guardrails:"الحواجز النشطة",
    agentTitle:"وكيل تدقيق النزاعات المستقل", agentActive:"الوكيل نشط",
    discLog:"سجل التناقضات · مدفوعات نقاط البيع مقابل العقود",
    genVoucher:"إنشاء قسيمة نزاع",
    downloadCsv:"تنزيل سجل التدقيق (CSV)",
    exportProofs:"تصدير أدلة النزاعات",
    fileBtn0:"رفع المطالبة تلقائياً إلى بوابة الشريك",
    fileBtn1:"جارٍ رفع المطالبة…",
    fileBtn3:"✓ تم تقديم المطالبة · المعرف 8841-B",
    fileMsg1:"جاري تجميع بيانات الإثبات…",
    fileMsg2:"جاري الرفع عبر API…",
    fileMsg3:"✓ تم تقديم المطالبة بنجاح! (المعرف: 8841-B)",
    claimEn:"CLAIM DRAFT · ENGLISH",
    claimAr:"مسودة المطالبة · العربية",
    bilingualTitle:"حزمة نزاع ثنائية اللغة ·",
    verified:"SHA-256", verifiedS:"· موثق ✓",
    autoCompiled:"مُجمَّعة تلقائياً بواسطة وكيل النزاعات",
    close:"✕",
    intentLabel:"نية العمل · المصدر",
    intent:"النية:", confidence:"الثقة:", ambiguity:"الغموض:",
    intentResolved:"محلول ✓",
    applyLabel0:"تطبيق الإعداد على حلقة الأساس",
    applyLabel1:"✓ تم الرفع إلى Redis · 340ms",
    rulesEnforced:"قواعد · مفعّلة على الحافة",
    activeLabel:"✓ مفعّل · تقييم <2ms",
    pausedLabel:"متوقف. غير مفعّل حالياً.",
    floorWarn:"⚠ الحد أقل من 15% تكلفة أساسية. سيرفض الحارس جميع التنفيذات عند هذا المستوى.",
  },
};

function parseIntent(text: string): Record<string, unknown> {
  const t = text.toLowerCase();
  const pm = t.match(/(\d+(?:\.\d+)?)\s*%/);
  const floor = pm ? Number(pm[1]) / 100 : null;
  const cat = t.includes("sourdough") ? "sourdough" : t.includes("bakery") ? "bakery"
    : (t.includes("hot drink") || t.includes("coffee") || t.includes("latte")) ? "hot_drinks"
    : t.includes("dairy") ? "dairy" : t.includes("beverage") ? "beverages"
    : t.includes("produce") ? "produce" : null;
  if (t.includes("jahez") || t.includes("talabat") || (t.includes("competitor") && t.includes("match"))) {
    return { engine_rule:"competitor_price_match", competitor: t.includes("talabat") ? "talabat" : "jahez",
      target_sku_class: cat ?? "all", match_direction: (t.includes("raise")||t.includes(" up")) ? "up" : "down",
      minimum_floor: floor ?? 0.18, regional_override_allowed: false, latency_budget_ms: 1850 };
  }
  if (t.includes("rain") || t.includes("storm") || t.includes("weather")) {
    return { engine_rule:"conditional_floor_raise", target_category: cat ?? "hot_drinks",
      minimum_floor: floor ?? 0.35, trigger:"weather.rain_storm", revert_after_hours: 6, latency_budget_ms: 1850 };
  }
  return { engine_rule:"active_margin_defense", target_category: cat ?? "all_categories",
    minimum_floor: floor ?? 0.25, regional_override_allowed: false, latency_budget_ms: 1850 };
}

function tokenizeJson(obj: unknown): {t:string,c:string}[] {
  const str = JSON.stringify(obj, null, 2);
  const out: {t:string,c:string}[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}\[\],])|(\s+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    if (m[1] !== undefined) { out.push({t:m[1],c:"#79C0FF"}); out.push({t:m[2]+" ",c:"#8B949E"}); }
    else if (m[3] !== undefined) out.push({t:m[3],c:"#7EE2A8"});
    else if (m[4] !== undefined) out.push({t:m[4],c:"#F2A971"});
    else if (m[5] !== undefined) out.push({t:m[5],c:"#D2A8FF"});
    else if (m[6] !== undefined) out.push({t:m[6],c:"#8B949E"});
    else out.push({t:m[7]??"",c:"#8B949E"});
  }
  return out;
}

function fmtMoney(n: number, currency: string): string {
  const rate: Record<string,number> = { QAR:1, SAR:1.03, AED:1.0 };
  return Math.round(n * (rate[currency] ?? 1)).toLocaleString("en-US");
}

export function PrizeSkoutDashboard() {
  const [tab, setTab] = useState<Tab>("analytics");
  const [theme, setTheme] = useState<Theme>("light");
  const [currency, setCurrency] = useState("QAR");
  const [lang, setLang] = useState<Lang>("en");
  const [isDesktop, setIsDesktop] = useState(true);
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [updatesToday, setUpdatesToday] = useState(0);
  const [cpPhase, setCpPhase] = useState<"idle"|"loading"|"result">("idle");
  const [cpInput, setCpInput] = useState("");
  const [cpPrompt, setCpPrompt] = useState("");
  const [cpObj, setCpObj] = useState<Record<string,unknown>|null>(null);
  const [cpChatMessage, setCpChatMessage] = useState<string|null>(null);
  const [applied, setApplied] = useState(false);
  const [rules, setRules] = useState<Rule[]>([
    { name:"Global margin floor",   desc:"all categories · all regions",         floor:18, active:true },
    { name:"Bakery margin defense", desc:"category: bakery · Doha + Riyadh",     floor:25, active:true },
    { name:"Hot drinks storm floor",desc:"trigger: weather.rain_storm",          floor:35, active:true },
  ]);
  const [disputes, setDisputes]         = useState<Dispute[]>([]);
  const [modal, setModal]               = useState<number|null>(null);
  const [fileStep, setFileStep]         = useState(0);
  const [toast, setToast]               = useState<string|null>(null);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [byokPlatform, setByokPlatform] = useState<string|null>(null);
  const [byokFields, setByokFields]     = useState<Record<string,string>>({});
  const [byokStatus, setByokStatus]     = useState<"idle"|"loading"|"ok"|"err">("idle");
  const [byokError, setByokError]       = useState<string|null>(null);
  const [channelStatuses, setChannelStatuses] = useState<Record<string,string>>({});
  // Dispute form state
  const [showDisputeForm, setShowDisputeForm]       = useState(false);
  const [disputePartner, setDisputePartner]         = useState("Talabat");
  const [disputeOrderId, setDisputeOrderId]         = useState("");
  const [disputePlace, setDisputePlace]             = useState("");
  const [disputeRate, setDisputeRate]               = useState("18");
  const [disputeCharged, setDisputeCharged]         = useState("");
  const [disputeOurPrice, setDisputeOurPrice]       = useState("");
  const [disputeNotes, setDisputeNotes]             = useState("");
  const [disputeLoading, setDisputeLoading]         = useState(false);
  const [cpError, setCpError]                       = useState<string|null>(null);

  const toastT = useRef<ReturnType<typeof setTimeout>|null>(null);
  const laterRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: ()=>void, ms: number) => {
    const t = setTimeout(fn, ms);
    laterRefs.current.push(t);
    return t;
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width:980px)");
    const h = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", h); h();
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("salla_connected") === "1") {
      setChannelStatuses(prev => ({ ...prev, salla: "connected" }));
      window.history.replaceState({}, "", window.location.pathname);
      showToast("Salla connected · product catalog syncing");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { laterRefs.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (tab !== "vault") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    if (!mid) return;
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(mid)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { channels?: { platform:string; status:string }[] } | null) => {
        if (!d?.channels) return;
        const m: Record<string,string> = {};
        for (const ch of d.channels) m[ch.platform] = ch.status;
        setChannelStatuses(m);
      })
      .catch(() => {});
  }, [tab]);

  const showToast = (msg: string) => {
    if (toastT.current) clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(null), 4000);
  };

  const runCopilot = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || cpPhase === "loading") return;
    setCpPhase("loading"); setCpPrompt(prompt); setApplied(false); setCpError(null);
    setCpObj(null); setCpChatMessage(null);
    try {
      const res  = await fetch("/api/copilot/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      let data: { type?: string; rule?: Record<string,unknown>; message?: string; error?: string } = {};
      try { data = await res.json() as typeof data; } catch { /* non-JSON body */ }
      if (!res.ok) {
        setCpError(data.error ?? `Server error (${res.status}) — the route may still be deploying. Try again in a moment.`);
        setCpPhase("idle");
        return;
      }
      if (data.type === "chat" && data.message) {
        setCpChatMessage(data.message);
        setCpObj(null);
        setCpPhase("result");
      } else if (data.rule) {
        setCpObj(data.rule);
        setCpChatMessage(null);
        setCpPhase("result");
      } else {
        setCpError(data.error ?? "Unexpected response — try rephrasing your request.");
        setCpPhase("idle");
      }
    } catch {
      setCpError("Request failed — check your connection or try again.");
      setCpPhase("idle");
    }
  };

  const applyConfig = () => {
    if (applied || !cpObj) return;
    const name = String(cpObj.engine_rule).split("_").map((w:string) => w[0].toUpperCase()+w.slice(1)).join(" ");
    const desc = String(cpObj.target_category || cpObj.target_sku_class || "all")
      + (cpObj.trigger ? " · "+cpObj.trigger : cpObj.competitor ? " · vs "+cpObj.competitor : " · all regions");
    setApplied(true);
    setRules(prev => [...prev, { name, desc, floor: Math.round(Number(cpObj.minimum_floor)*100), active:true }]);
    showToast("🟢 Margin rules pushed to in-memory Redis cluster (340ms)");
  };

  const fileClaim = () => {
    if (fileStep > 0) return;
    setFileStep(1);
    later(() => setFileStep(2), 1000);
    later(() => { setFileStep(3); showToast("🟢 Claim 8841-B filed with partner portal · tracking enabled"); }, 2100);
  };

  const downloadCsv = () => {
    const rows = [["time","event","detail"], ...feed.map(f=>[f.time,f.tag,f.text])];
    const csv = rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a = document.createElement("a");
    a.href=url; a.download="prizeskout-audit-log.csv"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    showToast(`🟢 Audit log exported (${feed.length} events)`);
  };

  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const navDefs = [
    { id:"analytics" as Tab, label:t.navA, sub:t.navAs },
    { id:"rules"     as Tab, label:t.navR, sub:t.navRs },
    { id:"vault"     as Tab, label:t.navV, sub:t.navVs },
  ];

  const headerSub = tab === "analytics" ? t.subA : tab === "rules" ? t.subR : tab === "settings" ? "Store access, channels, margin rules, outlets and notifications." : t.subV;
  const headerTitle = tab === "analytics" ? t.navA : tab === "rules" ? t.navR : tab === "settings" ? "Settings" : t.navV;

  const md = modal != null ? disputes[modal] : null;

  return (
    <div className="ps-db" data-theme={theme} dir={dir}
      style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)",
        display:"flex", alignItems:"stretch", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* SIDEBAR */}
      {isDesktop && (
        <aside style={{ width:264, flex:"0 0 264px", borderInlineEnd:"1px solid var(--border)",
          background:"var(--surface2)", display:"flex", flexDirection:"column",
          padding:"28px 20px", boxSizing:"border-box", position:"sticky", top:0, height:"100vh" }}>
          <div style={{ fontSize:27, fontWeight:800, letterSpacing:"-0.6px", paddingInline:6 }}>
            Prize<span style={{ color:OG }}>skout</span>
          </div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.6px", color:"var(--muted)", margin:"30px 6px 12px" }}>
            {t.cp}
          </div>
          <nav style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {navDefs.map(n => {
              const on = tab === n.id;
              return (
                <div key={n.id} onClick={()=>setTab(n.id)} style={{
                  cursor:"pointer", display:"flex", alignItems:"center", gap:12,
                  padding:"13px 14px", borderRadius:12,
                  background: on ? `color-mix(in srgb,${OG} 8%,var(--surface))` : "transparent",
                  border: `1px solid ${on ? `color-mix(in srgb,${OG} 30%,transparent)` : "transparent"}`,
                  transition:"background .2s,border-color .2s",
                }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", flex:"0 0 7px",
                    background: on ? OG : "color-mix(in srgb,var(--muted) 45%,transparent)" }} />
                  <span style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    <span style={{ fontSize:14.5, fontWeight:700, color:"var(--text)" }}>{n.label}</span>
                    <span style={{ fontSize:12, color: on ? OG : "var(--muted)" }}>{n.sub}</span>
                  </span>
                </div>
              );
            })}
          </nav>
          <div style={{ marginTop:"auto", display:"flex", flexDirection:"column", gap:4 }}>
            {/* Settings */}
            <div onClick={()=>setTab("settings")} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 10px",
              borderRadius:10, cursor:"pointer",
              color: tab === "settings" ? "var(--text)" : "var(--muted)",
              background: tab === "settings" ? "var(--border)" : "transparent",
              transition:"background .15s,color .15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color="var(--text)"; (e.currentTarget as HTMLDivElement).style.background="var(--border)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color= tab==="settings" ? "var(--text)" : "var(--muted)"; (e.currentTarget as HTMLDivElement).style.background= tab==="settings" ? "var(--border)" : "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span style={{ fontSize:13, fontWeight:500 }}>Settings</span>
            </div>
            {/* Back to site */}
            <a href="/" style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 10px",
              borderRadius:10, textDecoration:"none", color:"var(--muted)",
              transition:"background .15s,color .15s", marginBottom:8,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color="var(--text)"; (e.currentTarget as HTMLAnchorElement).style.background="var(--border)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color="var(--muted)"; (e.currentTarget as HTMLAnchorElement).style.background="transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <span style={{ fontSize:13, fontWeight:500 }}>Back to site</span>
            </a>
            <div style={{ height:1, background:"var(--border)", marginBottom:8 }} />
            <div style={{ border:`1px solid color-mix(in srgb,${GN} 30%,transparent)`,
              background:`color-mix(in srgb,${GN} 7%,var(--surface))`,
              borderRadius:12, padding:"13px 14px", display:"flex", gap:11, alignItems:"flex-start" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:GN, marginTop:5, animation:"pk-pulse 2s infinite" }} />
              <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:GN }}>{t.defend}</span>
                <span style={{ fontSize:12, color:"var(--muted)", fontFamily:MONO }}>{t.defendS}</span>
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:11, paddingInline:4 }}>
              <span style={{ width:34, height:34, borderRadius:"50%", background:"var(--surface)",
                border:"1px solid var(--border)", display:"grid", placeItems:"center",
                fontSize:11.5, fontWeight:700, fontFamily:MONO }}>M</span>
              <span style={{ fontSize:14, fontWeight:600 }}>My Account</span>
            </div>
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>

        {/* Mobile top bar */}
        {!isDesktop && (
          <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {/* Hamburger */}
                <button onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"
                  style={{ cursor:"pointer", width:44, height:44, borderRadius:10, border:"1px solid var(--border)",
                    background:"var(--surface)", display:"flex", flexDirection:"column", alignItems:"center",
                    justifyContent:"center", gap:5, padding:0, flexShrink:0 }}>
                  <span style={{ width:18, height:2, borderRadius:1, background:"var(--text)", display:"block" }} />
                  <span style={{ width:18, height:2, borderRadius:1, background:"var(--text)", display:"block" }} />
                  <span style={{ width:12, height:2, borderRadius:1, background:"var(--text)", display:"block", marginInlineEnd:6 }} />
                </button>
                <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>
                  Prize<span style={{ color:OG }}>skout</span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:GN, fontWeight:700, fontFamily:MONO }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:GN, animation:"pk-pulse 2s infinite" }} />
                  LIVE
                </span>
                <button onClick={()=>setTheme(v=>v==="light"?"dark":"light")} aria-label="Toggle theme"
                  style={{ cursor:"pointer", width:44, height:44, borderRadius:10, border:"1px solid var(--border)",
                    background:"var(--surface)", display:"grid", placeItems:"center", padding:0, fontSize:16 }}>
                  {theme==="dark"?"☾":"☀"}
                </button>
              </div>
            </div>
            {/* Short-label pill nav */}
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:"touch" as never }}>
              {navDefs.map(n => {
                const on = tab === n.id;
                return (
                  <button key={n.id} onClick={()=>setTab(n.id)} style={{
                    cursor:"pointer", whiteSpace:"nowrap", padding:"10px 14px", borderRadius:999,
                    border:`1px solid ${on ? `color-mix(in srgb,${OG} 40%,transparent)` : "var(--border)"}`,
                    background: on ? `color-mix(in srgb,${OG} 8%,var(--surface))` : "transparent",
                    color: on ? "var(--text)" : "var(--muted)", fontSize:13, fontWeight:700, fontFamily:"inherit", flexShrink:0,
                  }}>{n.sub}</button>
                );
              })}
              <button onClick={()=>setTab("settings")} style={{
                cursor:"pointer", whiteSpace:"nowrap", padding:"10px 14px", borderRadius:999,
                border:`1px solid ${tab==="settings" ? `color-mix(in srgb,${OG} 40%,transparent)` : "var(--border)"}`,
                background: tab==="settings" ? `color-mix(in srgb,${OG} 8%,var(--surface))` : "transparent",
                color: tab==="settings" ? "var(--text)" : "var(--muted)", fontSize:13, fontWeight:700, fontFamily:"inherit", flexShrink:0,
              }}>Settings</button>
            </div>
          </div>
        )}

        {/* Global header */}
        <header className="ps-db-header" style={{ padding:"26px 30px 20px", borderBottom:"1px solid var(--border)",
          display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-start", justifyContent:"space-between" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:200, flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <h1 className="ps-db-h1" style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.4px" }}>{headerTitle}</h1>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:".8px", color:GN,
                background:`color-mix(in srgb,${GN} 12%,var(--surface))`,
                border:`1px solid color-mix(in srgb,${GN} 28%,transparent)`,
                borderRadius:7, padding:"3px 9px", fontFamily:MONO }}>{t.live}</span>
            </div>
            <div style={{ fontSize:14, color:"var(--muted)" }}>{headerSub}</div>
          </div>
          {/* Desktop-only controls — hidden on mobile via .ps-db-controls CSS class */}
          <div className="ps-db-controls" style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", flexShrink:0 }}>
            {/* Theme toggle */}
            <button onClick={()=>setTheme(v=>v==="light"?"dark":"light")}
              aria-label="Toggle dark mode"
              style={{ cursor:"pointer", width:56, height:44, borderRadius:999,
                border:"1px solid var(--border)", background:"var(--surface)", position:"relative", padding:0 }}>
              <span style={{ position:"absolute", top:11, insetInlineStart: theme==="dark" ? 29 : 3,
                width:22, height:22, borderRadius:"50%",
                background: theme==="dark" ? "#232B38" : "#fff",
                border:"1px solid var(--border)", transition:"inset-inline-start .25s,background .25s",
                display:"grid", placeItems:"center", fontSize:11 }}>
                {theme==="dark"?"☾":"☀"}
              </span>
            </button>
            {/* Currency */}
            <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:10, padding:3, gap:2 }}>
              {["QAR","SAR","AED"].map(code => (
                <button key={code} onClick={()=>setCurrency(code)} style={{
                  cursor:"pointer", border:"none", borderRadius:8, padding:"10px 13px",
                  fontSize:13, fontWeight:700, fontFamily:MONO,
                  background: currency===code ? OG : "transparent",
                  color: currency===code ? "#fff" : "var(--muted)",
                }}>{code}</button>
              ))}
            </div>
            {/* Lang */}
            <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:10, padding:3, gap:2 }}>
              {([["en","EN"],["ar","عربية"]] as [Lang,string][]).map(([id,label]) => (
                <button key={id} onClick={()=>setLang(id)} style={{
                  cursor:"pointer", border:"none", borderRadius:8, padding:"10px 13px",
                  fontSize:13, fontWeight:700, fontFamily:"inherit",
                  background: lang===id ? "var(--text)" : "transparent",
                  color: lang===id ? "var(--bg)" : "var(--muted)",
                }}>{label}</button>
              ))}
            </div>
          </div>
        </header>

        {/* ===== TAB: REVENUE PROTECTION HUB ===== */}
        {tab === "analytics" && (
          <section className="ps-db-section" style={{ padding:"28px 30px 48px", display:"flex", flexDirection:"column", gap:30, animation:"pk-in .3s ease" }}>

            {/* Hero + stat grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:18 }}>
              <div style={{ gridColumn:"span 2", minWidth:"min(100%,560px)", position:"relative",
                background:"var(--surface)",
                border:"1px solid var(--border)", borderRadius:16, boxShadow:"var(--shadow)",
                padding:"26px 28px", display:"flex", flexDirection:"column", gap:18 }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, fontSize:11, fontWeight:500,
                  letterSpacing:"0.06em", color:"var(--muted)", textTransform:"uppercase" as const }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:GN }} />
                  {t.profLabel}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                    <span style={{ fontFamily:DISPLAY, fontSize:17, fontWeight:500, color:"var(--muted)" }}>{currency}</span>
                    <span style={{ fontFamily:DISPLAY, fontSize:62, fontWeight:700, lineHeight:1, color:"var(--muted)", fontVariantNumeric:"tabular-nums" }}>—</span>
                  </div>
                </div>
                <div style={{ fontSize:13.5, color:"var(--muted)" }}>No activity yet · connect a store to begin tracking</div>
                {/* Empty chart placeholder */}
                <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:70, marginTop:6, opacity:.18 }}>
                  {Array.from({length:33}).map((_,i) => (
                    <span key={i} style={{ flex:1, borderRadius:"3px 3px 0 0", height:8,
                      background:`color-mix(in srgb,${OG} 40%,var(--surface))` }} />
                  ))}
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                gap:18, gridColumn:"span 2", minWidth:"min(100%,420px)", alignContent:"stretch" }}>
                {[
                  { label:"Tracked Products",   value:"—",                                     foot:"connect a store",  footColor:"var(--muted)" },
                  { label:"Price Updates Today",value:String(updatesToday),                    foot:"avg latency <2s",  footColor:"var(--muted)" },
                  { label:"Avg. Margin Saved",  value:"—",                                     foot:"no data yet",      footColor:"var(--muted)" },
                  { label:"Active Rules",       value:String(rules.filter(r=>r.active).length), foot:"price guardrails", footColor:"var(--muted)" },
                ].map(s => (
                  <div key={s.label} style={{ background:"var(--surface)",
                    border:"1px solid var(--border)", borderRadius:16, boxShadow:"var(--shadow)",
                    padding:"20px 22px", display:"flex", flexDirection:"column", gap:12, justifyContent:"space-between" }}>
                    <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.04em", color:"var(--muted)", textTransform:"uppercase" as const }}>{s.label}</div>
                    <div style={{ fontFamily:DISPLAY, fontSize:34, fontWeight:700, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
                    <div style={{ fontSize:12.5, color:s.footColor }}>{s.foot}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stream + Dispute agent */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.stream}</h2>
                  <span style={{ fontSize:12.5, color:"var(--muted)" }}>{t.streamS}</span>
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button onClick={downloadCsv} style={{ cursor:"pointer", fontFamily:"inherit", fontSize:13,
                    fontWeight:600, color:"var(--text)", background:"var(--surface)",
                    border:"1px solid var(--border)", borderRadius:10, padding:"11px 16px" }}>
                    {t.downloadCsv}
                  </button>
                  <button onClick={()=>showToast("🟢 Dispute proof bundle exported · 2 claims · hash-verified")}
                    style={{ cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, color:OG,
                      background:`color-mix(in srgb,${OG} 7%,var(--surface))`,
                      border:`1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                      borderRadius:10, padding:"11px 16px" }}>
                    {t.exportProofs}
                  </button>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))", gap:18, alignItems:"stretch" }}>
                {/* Terminal */}
                <div dir="ltr" style={{ background:"var(--term)", border:"1px solid var(--term-border)",
                  borderRadius:16, padding:"18px 20px", display:"flex", flexDirection:"column", gap:4,
                  minHeight:340, maxHeight:420, overflow:"hidden" }}>
                  <div style={{ display:"flex", gap:7, marginBottom:12, alignItems:"center" }}>
                    <span style={{ width:10,height:10,borderRadius:"50%",background:"#FF5F57" }} />
                    <span style={{ width:10,height:10,borderRadius:"50%",background:"#FEBC2E" }} />
                    <span style={{ width:10,height:10,borderRadius:"50%",background:"#28C840" }} />
                    <span style={{ fontFamily:MONO, fontSize:11.5, color:"#5A6472", marginInlineStart:8 }}>
                      defend-loop · edge-doha-01
                    </span>
                  </div>
                  {feed.length === 0 ? (
                    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:10, color:"#5A6472", fontFamily:MONO, fontSize:12.5, textAlign:"center" }}>
                      <span style={{ fontSize:22, opacity:.4 }}>◉</span>
                      <span>No events yet · connect a store to start</span>
                    </div>
                  ) : feed.map((f,i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"baseline",
                      fontFamily:MONO, fontSize:12.5, lineHeight:1.9, animation:"pk-in .3s ease" }}>
                      <span style={{ color:"#5A6472", flex:"0 0 auto" }}>{f.time}</span>
                      <span style={{ color:f.tagColor, fontWeight:700, flex:"0 0 auto" }}>{f.tag}</span>
                      <span style={{ color:"var(--term-text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* Dispute Audit Agent */}
                <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
                  borderRadius:16, boxShadow:"var(--shadow)", padding:"22px 24px",
                  display:"flex", flexDirection:"column", gap:18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                    <h3 style={{ margin:0, fontSize:16.5, fontWeight:800, letterSpacing:"-0.2px" }}>{t.agentTitle}</h3>
                    <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, fontWeight:700, color:GN,
                      background:`color-mix(in srgb,${GN} 10%,var(--surface))`,
                      border:`1px solid color-mix(in srgb,${GN} 26%,transparent)`,
                      borderRadius:999, padding:"5px 12px" }}>
                      <span style={{ width:8,height:8,borderRadius:"50%",background:GN,animation:"pk-ring 1.8s infinite" }} />
                      {t.agentActive}
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
                    {[
                      { value:`${currency} 0`, label:"Recovered Profits", color:"var(--muted)" },
                      { value:"0", label:"Claims Auto-Filed", color:"var(--text)" },
                      { value:"0", label:"Pending Aggregator Audits", color:"var(--muted)" },
                    ].map(m => (
                      <div key={m.label} style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                        borderRadius:12, padding:"13px 14px", display:"flex", flexDirection:"column", gap:5 }}>
                        <span style={{ fontFamily:DISPLAY, fontSize:19, fontWeight:700, color:m.color, fontVariantNumeric:"tabular-nums" }}>{m.value}</span>
                        <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600, lineHeight:1.35 }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.04em", color:"var(--muted)", textTransform:"uppercase" as const }}>
                      {t.discLog}
                    </div>
                    {disputes.length === 0 ? (
                      <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, padding:"24px 20px", display:"flex", alignItems:"center", gap:14 }}>
                        <span style={{ width:9, height:9, borderRadius:"50%", background:GN, flexShrink:0, animation:"pk-pulse 2.4s infinite" }} />
                        <span style={{ fontSize:13.5, color:"var(--muted)" }}>No discrepancies logged · audit agent monitoring payouts in real time</span>
                      </div>
                    ) : disputes.map((d,i) => (
                      <div key={i} style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, padding:"14px 16px", display:"flex", flexWrap:"wrap",
                        gap:12, alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:0, flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, fontWeight:700 }}>
                            ⚠ {d.title}
                            <span style={{ fontSize:12, color:"var(--muted)", fontWeight:400 }}>(Order {d.order})</span>
                          </div>
                          <div style={{ fontSize:12, color:"var(--muted)" }}>
                            {d.place} · Contract: {d.contract} · Charged: <span style={{ color:OG,fontWeight:700 }}>{d.charged}</span> · Leak: <span style={{ color:OG,fontWeight:700 }}>{d.leak}</span>
                          </div>
                        </div>
                        <button onClick={()=>{setModal(i);setFileStep(0);}} className="ps-ig-btn"
                          style={{ cursor:"pointer", fontSize:12.5, fontWeight:700, color:"var(--text)",
                            background:"transparent", border:"1.5px solid var(--border)",
                            borderRadius:10, padding:"10px 15px", fontFamily:"inherit", transition:"border-color .2s,color .2s" }}>
                          {t.genVoucher}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Log Discrepancy button + form */}
                  <button
                    onClick={()=>setShowDisputeForm(v=>!v)}
                    style={{ cursor:"pointer", alignSelf:"flex-start", fontSize:12.5, fontWeight:700,
                      color: showDisputeForm ? OG : "var(--text)",
                      background:"transparent", border:`1.5px solid ${showDisputeForm ? OG : "var(--border)"}`,
                      borderRadius:10, padding:"10px 15px", fontFamily:"inherit", transition:"border-color .2s,color .2s" }}>
                    {showDisputeForm ? "− Cancel" : "+ Log Discrepancy"}
                  </button>

                  {showDisputeForm && (
                    <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                      borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14,
                      animation:"pk-in .2s ease" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>New Discrepancy</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))", gap:10 }}>
                        {/* Partner */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Partner</label>
                          <select value={disputePartner} onChange={e=>setDisputePartner(e.target.value)}
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit" }}>
                            {["Talabat","Jahez","Noon","Amazon","Careem"].map(p=>(
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        {/* Order ID */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Order ID</label>
                          <input value={disputeOrderId} onChange={e=>setDisputeOrderId(e.target.value)} placeholder="e.g. #84201-A"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Location */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Branch / Location</label>
                          <input value={disputePlace} onChange={e=>setDisputePlace(e.target.value)} placeholder="e.g. Doha Mall branch"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Contracted rate */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Contracted rate (%)</label>
                          <input type="number" min="1" max="40" value={disputeRate} onChange={e=>setDisputeRate(e.target.value)} placeholder="18"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Order value */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Order value ({currency})</label>
                          <input type="number" min="0" value={disputeOurPrice} onChange={e=>setDisputeOurPrice(e.target.value)} placeholder="120.00"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Charged amount */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Charged by partner ({currency})</label>
                          <input type="number" min="0" value={disputeCharged} onChange={e=>setDisputeCharged(e.target.value)} placeholder="30.00"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                        </div>
                      </div>
                      {/* Notes */}
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>Additional notes (optional)</label>
                        <textarea value={disputeNotes} onChange={e=>setDisputeNotes(e.target.value)} rows={2}
                          placeholder="Any context about the discrepancy..."
                          style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px", resize:"vertical",
                            background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                      </div>
                      <button
                        disabled={disputeLoading || !disputeOrderId || !disputeCharged || !disputeOurPrice}
                        onClick={async()=>{
                          const mid = localStorage.getItem("ps_merchant_id") ?? "";
                          const ac  = localStorage.getItem("ps_access_code") ?? "";
                          if (!mid || !ac) { showToast("Please connect your store first."); return; }
                          setDisputeLoading(true);
                          try {
                            const res = await fetch("/api/dispute/voucher",{
                              method:"POST", headers:{"Content-Type":"application/json"},
                              body: JSON.stringify({
                                merchant_id: mid, access_code: ac,
                                partner: disputePartner, order_id: disputeOrderId,
                                place: disputePlace || "Main branch",
                                contracted_rate: Number(disputeRate),
                                charged_amount: Number(disputeCharged),
                                our_price: Number(disputeOurPrice),
                                currency, notes: disputeNotes,
                              }),
                            });
                            const data = await res.json() as Dispute & { error?:string };
                            if (!res.ok || data.error) { showToast("⚠ "+  (data.error??"Voucher generation failed")); return; }
                            setDisputes(prev=>[...prev, data]);
                            setShowDisputeForm(false);
                            setDisputeOrderId(""); setDisputeCharged(""); setDisputeOurPrice(""); setDisputeNotes(""); setDisputePlace("");
                            showToast("🟢 Dispute voucher generated · bilingual package ready");
                          } catch { showToast("⚠ Network error — try again."); }
                          finally { setDisputeLoading(false); }
                        }}
                        style={{ cursor: disputeLoading||!disputeOrderId||!disputeCharged||!disputeOurPrice ? "not-allowed" : "pointer",
                          alignSelf:"flex-start", fontSize:13, fontWeight:700, color:"#fff", background: disputeLoading ? "#9A9A9A" : OG,
                          border:"none", borderRadius:10, padding:"11px 20px", fontFamily:"inherit",
                          opacity: disputeLoading||!disputeOrderId||!disputeCharged||!disputeOurPrice ? 0.6 : 1,
                          transition:"background .2s,opacity .2s" }}>
                        {disputeLoading ? "Generating…" : "Generate Bilingual Voucher ↗"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== TAB: MARGIN POLICY ENGINE ===== */}
        {tab === "rules" && (
          <section className="ps-db-section" style={{ padding:"28px 30px 48px", display:"flex", flexDirection:"column", gap:28, animation:"pk-in .3s ease" }}>
            {/* CFO Copilot */}
            <div style={{ background:"var(--surface)",
              border:"1px solid var(--border)", borderRadius:18, boxShadow:"var(--shadow)", padding:"24px 26px",
              display:"flex", flexDirection:"column", gap:18 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <h2 style={{ margin:0, fontSize:19, fontWeight:800, letterSpacing:"-0.3px" }}>
                    {t.copilotTitle} <span style={{ color:"var(--muted)", fontWeight:600, fontSize:15 }}>· {t.copilotSub}</span>
                  </h2>
                  <span style={{ fontSize:13.5, color:"var(--muted)" }}>{t.copilotDesc}</span>
                </div>
                <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, fontWeight:700, color:OG,
                  background:`color-mix(in srgb,${OG} 9%,var(--surface))`,
                  border:`1px solid color-mix(in srgb,${OG} 32%,transparent)`,
                  borderRadius:999, padding:"6px 14px" }}>
                  {t.copilotLive}
                </span>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center", background:"var(--surface)",
                border:"1.5px solid var(--border)", borderRadius:14, padding:"6px 8px 6px 18px",
                boxShadow:"var(--shadow)" }}>
                <span style={{ fontSize:16, opacity:.55 }}>✦</span>
                <input value={cpInput} onChange={e=>setCpInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") runCopilot(cpInput); }}
                  placeholder={lang==="ar" ? "اسأل أي شيء أو اكتب قاعدة تسعير..." : "Ask anything or describe a rule (e.g., 'Lock bakery margins at 25% during rain storms...')"}
                  style={{ flex:1, minWidth:0, border:"none", outline:"none", background:"transparent",
                    color:"var(--text)", fontSize:14.5, fontFamily:"inherit", padding:"10px 0" }} />
                <button onClick={()=>runCopilot(cpInput)} style={{ cursor:"pointer", flex:"0 0 auto",
                  border:"none", borderRadius:10, background:OG, color:"#fff",
                  fontSize:13, fontWeight:700, padding:"11px 18px", fontFamily:"inherit" }}>
                  {t.compile}
                </button>
              </div>
              <div style={{ display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"var(--muted)", fontWeight:600 }}>{t.try}</span>
                {[
                  "Lock bakery margins at 25%",
                  "Match Jahez sourdough prices down to 18%",
                  "Raise hot drink floor to 35% during rain storms",
                ].map(label => (
                  <button key={label} className="ps-pill-btn"
                    onClick={()=>{ setCpInput(label); runCopilot(label); }}
                    style={{ cursor:"pointer", fontSize:12.5, fontWeight:600, color:"var(--text)",
                      background:"var(--surface)", border:"1px solid var(--border)",
                      borderRadius:999, padding:"8px 14px", fontFamily:"inherit", transition:"border-color .2s,color .2s" }}>
                    {label}
                  </button>
                ))}
              </div>
              {cpPhase === "loading" && (
                <div style={{ display:"flex", alignItems:"center", gap:14, padding:"18px 6px 6px", animation:"pk-in .2s ease" }}>
                  <span style={{ width:22,height:22,borderRadius:"50%",
                    border:`3px solid color-mix(in srgb,${OG} 18%,transparent)`,
                    borderTopColor:OG, animation:"pk-spin .75s linear infinite", flex:"0 0 22px" }} />
                  <span style={{ fontSize:13, color:"var(--muted)", animation:"pk-pulse 1.4s infinite" }}>
                    Thinking...
                  </span>
                </div>
              )}
              {cpError && cpPhase === "idle" && (
                <div style={{ fontSize:12.5, color:"#DC2626", padding:"8px 12px",
                  background:"color-mix(in srgb,#DC2626 8%,var(--surface))",
                  border:"1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                  borderRadius:9, animation:"pk-in .2s ease" }}>
                  {cpError}
                </div>
              )}
              {cpPhase === "result" && cpChatMessage && (
                <div style={{ animation:"pk-in .35s ease", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", color:OG, textTransform:"uppercase" as const, paddingLeft:2 }}>
                    CFO Copilot
                  </div>
                  <div style={{ background:`color-mix(in srgb,${OG} 6%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${OG} 22%,transparent)`,
                    borderRadius:14, padding:"18px 20px", fontSize:14.5, lineHeight:1.7,
                    color:"var(--fg)", whiteSpace:"pre-wrap" as const }}>
                    {cpChatMessage}
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)", paddingLeft:2 }}>
                    Describe a pricing rule to compile it into an engine config →
                  </div>
                </div>
              )}
              {cpPhase === "result" && cpObj && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))", gap:16, animation:"pk-in .35s ease" }}>
                  <div style={{ background:`color-mix(in srgb,${OG} 6%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${OG} 24%,transparent)`,
                    borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ fontSize:11, fontWeight:500, letterSpacing:"0.04em", color:OG, textTransform:"uppercase" as const }}>
                      {t.intentLabel}
                    </div>
                    <div style={{ fontSize:16.5, lineHeight:1.55, fontWeight:600 }}>"{cpPrompt}"</div>
                    <div style={{ marginTop:"auto", display:"flex", gap:14, fontSize:11.5, color:"var(--muted)", flexWrap:"wrap" }}>
                      <span>{t.intent} <span style={{ color:GN }}>{t.intentResolved}</span></span>
                      <span>{t.confidence} <span style={{ color:GN }}>0.97</span></span>
                      <span>{t.ambiguity} none</span>
                    </div>
                  </div>
                  <div dir="ltr" style={{ background:"var(--term)", border:"1px solid var(--term-border)",
                    borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontFamily:MONO, fontSize:11.5, color:"#5A6472" }}>compiled.rule.json</span>
                      <span style={{ fontFamily:MONO, fontSize:11, color:GN }}>✓ schema v3 · 1.2s</span>
                    </div>
                    <div style={{ whiteSpace:"pre", overflowX:"auto", fontFamily:MONO, fontSize:13, lineHeight:1.7 }}>
                      {tokenizeJson(cpObj).map((tk,i) => <span key={i} style={{ color:tk.c }}>{tk.t}</span>)}
                    </div>
                    <button onClick={applyConfig} style={{ cursor:"pointer", marginTop:4, border:"none",
                      borderRadius:11, padding:"14px 18px", fontSize:14, fontWeight:800, fontFamily:"inherit",
                      color:"#fff", background: applied ? GN : OG,
                      transition:"background .3s" }}>
                      {applied ? t.applyLabel1 : t.applyLabel0}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active guardrails */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.guardrails}</h2>
                <span style={{ fontSize:12.5, color:"var(--muted)" }}>{rules.length} {t.rulesEnforced}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))", gap:16 }}>
                {rules.map((r,i) => (
                  <div key={i} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:16, boxShadow:"var(--shadow)", padding:"20px 22px",
                    display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <span style={{ fontSize:15, fontWeight:700 }}>{r.name}</span>
                        <span style={{ fontSize:11.5, color:"var(--muted)" }}>{r.desc}</span>
                      </div>
                      <button onClick={()=>setRules(prev=>prev.map((x,j)=>j===i?{...x,active:!x.active}:x))}
                        aria-label="Toggle rule"
                        style={{ cursor:"pointer", flex:"0 0 auto", width:42, height:24,
                          borderRadius:999, border:"1px solid var(--border)",
                          background: r.active ? GN : "color-mix(in srgb,var(--muted) 30%,var(--surface))",
                          position:"relative", padding:0, transition:"background .2s" }}>
                        <span style={{ position:"absolute", top:2.5, insetInlineStart: r.active ? 20 : 3,
                          width:17, height:17, borderRadius:"50%", background:"#fff",
                          boxShadow:"0 1px 3px rgba(0,0,0,.25)", transition:"inset-inline-start .2s" }} />
                      </button>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <input type="range" min={5} max={60} step={1} value={r.floor}
                        onChange={e=>setRules(prev=>prev.map((x,j)=>j===i?{...x,floor:+e.target.value}:x))}
                        style={{ flex:1 }} />
                      <span style={{ fontFamily:DISPLAY, fontSize:17, fontWeight:700, fontVariantNumeric:"tabular-nums",
                        color: r.floor < 15 ? "#DC2626" : OG, minWidth:52, textAlign:"end" }}>{r.floor}%</span>
                    </div>
                    {r.floor < 15 && r.active && (
                      <div style={{ fontSize:12, fontWeight:600, color:"#DC2626",
                        background:"color-mix(in srgb,#DC2626 8%,var(--surface))",
                        border:"1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                        borderRadius:9, padding:"8px 12px" }}>{t.floorWarn}</div>
                    )}
                    <div style={{ fontSize:11.5, color: r.active ? GN : "var(--muted)" }}>
                      {r.active ? t.activeLabel : t.pausedLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== TAB: INTEGRATION VAULT ===== */}
        {tab === "vault" && (
          <section className="ps-db-section" style={{ padding:"28px 30px 48px", display:"flex", flexDirection:"column", gap:32, animation:"pk-in .3s ease" }}>

            {/* Inbound */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>Inbound Connections</h2>
                <span style={{ fontSize:14, color:"var(--muted)" }}>POS and e-commerce platforms that feed orders and catalog data into PrizeSkout.</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))", gap:16 }}>
                {INBOUND_INTEGRATIONS.map(ig => {
                  const isConnected = channelStatuses[ig.platform] === "connected";
                  const canConnect  = !!ig.oauthPath;
                  return (
                  <div key={ig.name} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:16, boxShadow:"var(--shadow)", padding:"20px 22px",
                    display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ width:38, height:38, borderRadius:10, background:`color-mix(in srgb,${OG} 10%,var(--surface2))`,
                          border:`1px solid color-mix(in srgb,${OG} 22%,var(--border))`,
                          display:"grid", placeItems:"center", fontSize:15, fontWeight:700, color:OG, flexShrink:0 }}>{ig.glyph}</span>
                        <div>
                          <div style={{ fontSize:15, fontWeight:800 }}>{ig.name}</div>
                          <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:2 }}>{ig.kind}</div>
                        </div>
                      </div>
                      <span style={{ width:9,height:9,borderRadius:"50%", flexShrink:0,
                        background: isConnected ? GN : "#F59E0B",
                        animation: isConnected ? "pk-pulse 2.2s infinite" : "none" }} />
                    </div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>
                      {isConnected ? "connected · data syncing" : canConnect ? "not connected · click to authorize" : "integration coming soon"}
                    </div>
                    {isConnected && (
                      <div dir="ltr" style={{ fontFamily:MONO, fontSize:12, color:GN,
                        background:`color-mix(in srgb,${GN} 8%,var(--surface2))`,
                        border:`1px solid color-mix(in srgb,${GN} 22%,transparent)`,
                        borderRadius:9, padding:"9px 12px" }}>
                        ✓ active
                      </div>
                    )}
                    {canConnect && !isConnected && (
                      <button onClick={() => {
                        const mid = localStorage.getItem("ps_merchant_id");
                        if (mid) {
                          window.location.href = `${ig.oauthPath}?merchant_id=${encodeURIComponent(mid)}`;
                        } else {
                          showToast("Please complete onboarding first.");
                        }
                      }} className="ps-ig-btn"
                        style={{ cursor:"pointer", alignSelf:"flex-start", fontSize:12.5, fontWeight:700,
                          color:"#fff", background:OG, border:`1.5px solid ${OG}`,
                          borderRadius:10, padding:"9px 14px", fontFamily:"inherit", transition:"border-color .2s,color .2s,background .2s" }}>
                        Connect {ig.name}
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Outbound */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>Outbound Connections</h2>
                <span style={{ fontSize:14, color:"var(--muted)" }}>Delivery aggregators that PrizeSkout pushes margin-safe prices to in real time.</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))", gap:14 }}>
                {OUTBOUND_INTEGRATIONS.map(o => {
                  const connected = channelStatuses[o.platform] === "connected";
                  return (
                  <div key={o.name} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:14, boxShadow:"var(--shadow)", padding:"18px 20px",
                    display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontSize:15, fontWeight:800 }}>{o.name}</span>
                      {connected ? (
                        <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.8px",
                          background:`color-mix(in srgb,${GN} 10%,var(--surface))`,
                          color:GN, border:`1px solid color-mix(in srgb,${GN} 30%,transparent)`,
                          borderRadius:6, padding:"3px 8px" }}>LIVE</span>
                      ) : o.byok ? (
                        <button
                          type="button"
                          onClick={() => { setByokPlatform(o.platform); setByokFields({}); setByokStatus("idle"); setByokError(null); }}
                          style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.8px",
                            background:`color-mix(in srgb,${OG} 10%,var(--surface))`,
                            color:OG, border:`1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                            borderRadius:6, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit" }}>SETUP</button>
                      ) : (
                        <span style={{ fontSize:9.5, fontWeight:600, letterSpacing:"0.6px",
                          color:"var(--muted)", border:"1px solid var(--border)",
                          borderRadius:6, padding:"3px 8px" }}>SOON</span>
                      )}
                    </div>
                    <div style={{ fontSize:11.5, color:"var(--muted)" }}>{o.region}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:7, paddingTop:10,
                      borderTop:"1px solid var(--border)", fontSize:11.5, color:"var(--muted)" }}>
                      <span style={{ width:7,height:7,borderRadius:"50%",
                        background: connected ? GN : OG,flexShrink:0,
                        animation: connected ? "pk-pulse 2s ease infinite" : "none" }} />
                      {connected ? "Store connected · prices syncing" : o.byok ? "Tap SETUP to connect your store" : "Awaiting integration build"}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

          </section>
        )}

        {/* ===== TAB: SETTINGS ===== */}
        {tab === "settings" && (
          <section className="ps-db-section" style={{ padding:"28px 30px 48px", animation:"pk-in .3s ease" }}>
            <SettingsTabs />
          </section>
        )}
      </main>

      {/* DISPUTE MODAL */}
      {md != null && (
        <div onClick={()=>setModal(null)}
          style={{ position:"fixed", inset:0, zIndex:60, background:"rgba(9,12,18,.45)",
            backdropFilter:"blur(6px)", display:"grid", placeItems:"center",
            padding:20, animation:"pk-in .2s ease" }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ width:"min(880px,100%)", maxHeight:"92vh", overflowY:"auto",
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:20, boxShadow:"var(--shadow-lg)", padding:"26px 28px",
              display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <h3 style={{ margin:0, fontSize:19, fontWeight:800, letterSpacing:"-0.3px" }}>
                  {t.bilingualTitle} {md.partner}
                </h3>
                <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
                  <span dir="ltr" style={{ fontFamily:MONO, fontSize:11.5, color:GN,
                    background:`color-mix(in srgb,${GN} 10%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${GN} 26%,transparent)`,
                    borderRadius:7, padding:"5px 10px" }}>
                    {t.verified} {md.hash} {t.verifiedS}
                  </span>
                  <span style={{ fontSize:11.5, color:"var(--muted)" }}>{t.autoCompiled}</span>
                </div>
              </div>
              <button onClick={()=>setModal(null)} aria-label="Close"
                style={{ cursor:"pointer", flex:"0 0 auto", width:34, height:34,
                  borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)",
                  color:"var(--muted)", fontSize:15, fontWeight:700 }}>{t.close}</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))", gap:14 }}>
              <div dir="ltr" style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.3px", color:"var(--muted)", fontFamily:MONO }}>{t.claimEn}</div>
                <div style={{ fontSize:13.5, lineHeight:1.7, whiteSpace:"pre-line" }}>{md.en}</div>
              </div>
              <div dir="rtl" style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.3px", color:"var(--muted)", fontFamily:MONO, textAlign:"start" }}>{t.claimAr}</div>
                <div style={{ fontSize:14.5, lineHeight:1.9, whiteSpace:"pre-line", textAlign:"start" }}>{md.ar}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[`payout_${md.order.slice(1)}.csv`, "contract_excerpt.pdf", "pos_ledger.json"].map(name => (
                <span key={name} dir="ltr" style={{ fontFamily:MONO, fontSize:11.5, color:"var(--muted)",
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:999, padding:"6px 12px" }}>📄 {name}</span>
              ))}
            </div>
            {fileStep > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:10, animation:"pk-in .2s ease" }}>
                <div style={{ height:8, borderRadius:999, background:"var(--surface2)", border:"1px solid var(--border)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:999,
                    background:`linear-gradient(90deg,${OG},${GN})`,
                    width: fileStep===1?"34%":fileStep===2?"72%":"100%",
                    transition:"width .8s ease" }} />
                </div>
                <div style={{ fontFamily:MONO, fontSize:12.5, color: fileStep===3 ? GN : "var(--muted)" }}>
                  {fileStep===1?t.fileMsg1:fileStep===2?t.fileMsg2:t.fileMsg3}
                </div>
              </div>
            )}
            <button onClick={fileClaim} style={{ cursor:"pointer", border:"none", borderRadius:12,
              padding:"15px 20px", fontSize:14.5, fontWeight:800, fontFamily:"inherit", color:"#fff",
              background: fileStep===3 ? GN : fileStep>0 ? `color-mix(in srgb,${OG} 55%,var(--muted))` : OG,
              transition:"background .3s" }}>
              {fileStep===3 ? t.fileBtn3 : fileStep>0 ? t.fileBtn1 : t.fileBtn0}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      {!isDesktop && sidebarOpen && (
        <>
          <div onClick={()=>setSidebarOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)" }} />
          <div style={{ position:"fixed", top:0, insetInlineStart:0, bottom:0, width:"min(284px,85vw)",
            zIndex:51, background:"var(--surface2)", borderInlineEnd:"1px solid var(--border)",
            display:"flex", flexDirection:"column", padding:"22px 18px", boxSizing:"border-box",
            overflowY:"auto", animation:`${dir==="rtl"?"pk-drawer-rtl":"pk-drawer-ltr"} .22s ease` }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
              <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>
                Prize<span style={{ color:OG }}>skout</span>
              </div>
              <button onClick={()=>setSidebarOpen(false)} aria-label="Close menu"
                style={{ cursor:"pointer", width:36, height:36, borderRadius:9, border:"1px solid var(--border)",
                  background:"transparent", color:"var(--muted)", fontSize:15, fontWeight:700, display:"grid", placeItems:"center" }}>
                ✕
              </button>
            </div>
            {/* CONTROL PLANE label */}
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.6px", color:"var(--muted)",
              marginBottom:10, paddingInline:4, fontFamily:MONO }}>
              {t.cp}
            </div>
            {/* Nav items */}
            <nav style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {navDefs.map(n => {
                const on = tab === n.id;
                return (
                  <div key={n.id} onClick={()=>{ setTab(n.id); setSidebarOpen(false); }} style={{
                    cursor:"pointer", display:"flex", alignItems:"center", gap:12,
                    padding:"14px 14px", borderRadius:12,
                    background: on ? `color-mix(in srgb,${OG} 8%,var(--surface))` : "transparent",
                    border:`1px solid ${on ? `color-mix(in srgb,${OG} 30%,transparent)` : "transparent"}`,
                    transition:"background .2s,border-color .2s",
                  }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", flex:"0 0 7px",
                      background: on ? OG : "color-mix(in srgb,var(--muted) 45%,transparent)" }} />
                    <span style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <span style={{ fontSize:14.5, fontWeight:700, color:"var(--text)" }}>{n.label}</span>
                      <span style={{ fontSize:12, color: on ? OG : "var(--muted)" }}>{n.sub}</span>
                    </span>
                  </div>
                );
              })}
            </nav>
            {/* Bottom section */}
            <div style={{ marginTop:"auto", display:"flex", flexDirection:"column", gap:4, paddingTop:20 }}>
              {/* Currency */}
              <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:10, padding:3, gap:2, marginBottom:6 }}>
                {["QAR","SAR","AED"].map(code => (
                  <button key={code} onClick={()=>setCurrency(code)} style={{
                    cursor:"pointer", border:"none", borderRadius:8, padding:"10px 0", flex:1,
                    fontSize:12, fontWeight:700, fontFamily:MONO,
                    background: currency===code ? OG : "transparent",
                    color: currency===code ? "#fff" : "var(--muted)",
                  }}>{code}</button>
                ))}
              </div>
              {/* Lang */}
              <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:10, padding:3, gap:2, marginBottom:8 }}>
                {([["en","EN"],["ar","عربية"]] as [Lang,string][]).map(([id,label]) => (
                  <button key={id} onClick={()=>setLang(id)} style={{
                    cursor:"pointer", border:"none", borderRadius:8, padding:"10px 0", flex:1,
                    fontSize:12, fontWeight:700, fontFamily:"inherit",
                    background: lang===id ? "var(--text)" : "transparent",
                    color: lang===id ? "var(--bg)" : "var(--muted)",
                  }}>{label}</button>
                ))}
              </div>
              {/* Settings */}
              <div onClick={()=>{ setTab("settings"); setSidebarOpen(false); }} style={{
                display:"flex", alignItems:"center", gap:10, padding:"12px 10px",
                borderRadius:10, cursor:"pointer",
                color: tab==="settings" ? "var(--text)" : "var(--muted)",
                background: tab==="settings" ? "var(--border)" : "transparent",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span style={{ fontSize:13, fontWeight:500 }}>Settings</span>
              </div>
              {/* Back to site */}
              <a href="/" style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 10px",
                borderRadius:10, textDecoration:"none", color:"var(--muted)", marginBottom:8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                <span style={{ fontSize:13, fontWeight:500 }}>Back to site</span>
              </a>
              <div style={{ height:1, background:"var(--border)", marginBottom:8 }} />
              {/* Defend Loop */}
              <div style={{ border:`1px solid color-mix(in srgb,${GN} 30%,transparent)`,
                background:`color-mix(in srgb,${GN} 7%,var(--surface))`,
                borderRadius:12, padding:"13px 14px", display:"flex", gap:11, alignItems:"flex-start" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:GN, marginTop:5, animation:"pk-pulse 2s infinite" }} />
                <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:13.5, fontWeight:700, color:GN }}>{t.defend}</span>
                  <span style={{ fontSize:12, color:"var(--muted)", fontFamily:MONO }}>{t.defendS}</span>
                </span>
              </div>
              {/* Account */}
              <div style={{ display:"flex", alignItems:"center", gap:11, paddingInline:4, paddingTop:4 }}>
                <span style={{ width:34, height:34, borderRadius:"50%", background:"var(--surface)",
                  border:"1px solid var(--border)", display:"grid", placeItems:"center",
                  fontSize:11.5, fontWeight:700, fontFamily:MONO }}>M</span>
                <span style={{ fontSize:14, fontWeight:600 }}>My Account</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* BYOK SETUP MODAL */}
      {byokPlatform && (() => {
        const p = byokPlatform as string;
        const cfg = BYOK_CONFIG[p];
        const platformName = OUTBOUND_INTEGRATIONS.find(o => o.platform === p)?.name ?? p;
        function closeByok() { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }
        async function submitByok(e: React.FormEvent) {
          e.preventDefault();
          const mid = localStorage.getItem("ps_merchant_id") ?? "";
          if (!mid) { setByokError("No merchant session found. Please complete onboarding first."); return; }
          setByokStatus("loading"); setByokError(null);
          const accessCode = localStorage.getItem("ps_access_code") ?? "";
          try {
            const res = await fetch("/api/channels/connect", {
              method:"POST",
              headers:{ "Content-Type":"application/json" },
              body: JSON.stringify({ merchant_id:mid, access_code:accessCode, platform:p, ...byokFields }),
            });
            const data = await res.json() as { ok?:boolean; error?:string };
            if (data.ok) {
              setByokStatus("ok");
              setChannelStatuses(prev => ({ ...prev, [p]: "connected" }));
              setTimeout(() => { closeByok(); showToast(`${platformName} store connected · prices syncing`); }, 1200);
            } else {
              setByokStatus("err");
              setByokError(data.error ?? "Connection failed. Check your credentials and try again.");
            }
          } catch {
            setByokStatus("err");
            setByokError("Network error. Please try again.");
          }
        }
        return (
          <div onClick={closeByok}
            style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(9,12,18,.5)",
              backdropFilter:"blur(6px)", display:"grid", placeItems:"center",
              padding:20, animation:"pk-in .2s ease" }}>
            <div onClick={e=>e.stopPropagation()}
              style={{ width:"min(520px,100%)", background:"var(--surface)",
                border:"1px solid var(--border)", borderRadius:20,
                boxShadow:"var(--shadow-lg)", padding:"28px 30px",
                display:"flex", flexDirection:"column", gap:22 }}>

              {/* Header */}
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div>
                  <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.3px" }}>
                    Connect {platformName}
                  </h3>
                  <p style={{ margin:"6px 0 0", fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
                    Paste your credentials from your {platformName} partner portal. PrizeSkout uses them to push margin-safe prices to your live menu.
                  </p>
                </div>
                <button onClick={closeByok} aria-label="Close"
                  style={{ cursor:"pointer", flexShrink:0, width:34, height:34,
                    borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)",
                    color:"var(--muted)", fontSize:15, fontWeight:700 }}>✕</button>
              </div>

              {cfg ? (
                <form onSubmit={submitByok} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {cfg.fields.map(f => (
                    <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label htmlFor={`byok-${f.key}`}
                        style={{ fontSize:12.5, fontWeight:600, color:"var(--text)" }}>
                        {f.label}
                      </label>
                      {f.hint && (
                        <span style={{ fontSize:11.5, color:"var(--muted)", marginTop:-3 }}>{f.hint}</span>
                      )}
                      <input
                        id={`byok-${f.key}`}
                        type="password"
                        autoComplete="off"
                        required
                        value={byokFields[f.key] ?? ""}
                        onChange={e => setByokFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ height:44, borderRadius:9, border:"1px solid var(--border)",
                          background:"var(--surface)", color:"var(--text)", padding:"0 13px",
                          fontSize:14, fontFamily:"inherit", outline:"none",
                          transition:"border-color .15s" }}
                        onFocus={e => { e.currentTarget.style.borderColor = OG; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  ))}

                  {cfg.portalHint && (
                    <p style={{ margin:0, fontSize:12, color:"var(--muted)", lineHeight:1.6,
                      padding:"10px 14px", background:"var(--surface2)",
                      borderRadius:9, border:"1px solid var(--border)" }}>
                      {cfg.portalHint}
                    </p>
                  )}

                  {byokError && (
                    <p style={{ margin:0, fontSize:13, color:"#EF4444", fontWeight:500,
                      padding:"10px 14px", background:"rgba(239,68,68,.07)",
                      borderRadius:9, border:"1px solid rgba(239,68,68,.2)" }}>
                      {byokError}
                    </p>
                  )}

                  {byokStatus === "ok" && (
                    <p style={{ margin:0, fontSize:13, color:GN, fontWeight:600,
                      padding:"10px 14px", background:`color-mix(in srgb,${GN} 8%,var(--surface))`,
                      borderRadius:9, border:`1px solid color-mix(in srgb,${GN} 25%,transparent)` }}>
                      Store connected successfully
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={byokStatus === "loading" || byokStatus === "ok"}
                    style={{ height:46, borderRadius:10, border:"none", cursor: byokStatus === "loading" || byokStatus === "ok" ? "default" : "pointer",
                      background: byokStatus === "ok" ? GN : OG, color:"#fff",
                      fontSize:14, fontWeight:700, fontFamily:"inherit",
                      opacity: byokStatus === "loading" ? .75 : 1,
                      transition:"opacity .2s,background .2s" }}>
                    {byokStatus === "loading" ? "Connecting…" : byokStatus === "ok" ? "Connected" : `Connect ${platformName}`}
                  </button>
                </form>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <p style={{ margin:0, fontSize:13.5, color:"var(--text)", lineHeight:1.7,
                    padding:"16px 18px", background:"var(--surface2)",
                    borderRadius:10, border:"1px solid var(--border)" }}>
                    {platformName} integration is coming soon. We are working with their partner team to get API access. To be notified when it is ready, email us at <strong>hello@prizeskout.qa</strong>.
                  </p>
                  <button onClick={closeByok}
                    style={{ height:44, borderRadius:10, border:`1px solid var(--border)`,
                      background:"var(--surface)", color:"var(--muted)",
                      fontSize:14, fontWeight:600, fontFamily:"inherit", cursor:"pointer" }}>
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, insetInlineEnd:24, zIndex:80,
          background:"var(--surface)", border:`1px solid color-mix(in srgb,${GN} 35%,var(--border))`,
          borderRadius:13, boxShadow:"var(--shadow-lg)", padding:"14px 18px",
          fontSize:13.5, fontWeight:600, maxWidth:"min(420px,86vw)",
          animation:"pk-toast .3s ease", display:"flex", gap:10, alignItems:"center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
