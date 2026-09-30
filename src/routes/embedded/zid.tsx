import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Circle, RefreshCw, Store, TrendingUp } from "lucide-react";

type Bootstrap = {
  ok?: boolean;
  merchantId?: string;
  accessCode?: string;
  storeName?: string;
  webhooksReady?: boolean;
  syncState?: "in_progress" | "complete" | "error";
  syncItems?: number | null;
  syncError?: string | null;
  welcomeAccepted?: boolean;
  welcomeUnavailable?: boolean;
  error?: string;
};

export const Route = createFileRoute("/embedded/zid")({
  head: () => ({ meta: [{ title: "PrizeSkout for Zid" }] }),
  component: ZidEmbeddedPage,
});

const colors = { bg: "#F7F7FA", card: "#FFFFFF", text: "#201532", muted: "#70677C", border: "#E6E1EB", accent: "#6E2A85" };
const primaryButton = { display: "inline-flex", minHeight: 44, alignItems: "center", justifyContent: "center", gap: 8, border: 0, borderRadius: 10, padding: "12px 17px", color: "#FFFFFF", background: colors.accent, fontWeight: 800, cursor: "pointer" } as const;
const card = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 15, boxShadow: "0 8px 24px rgba(36,20,46,.05)" } as const;

function ZidEmbeddedPage() {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const token = params.get("token")?.trim() ?? "";
  const arabic = (params.get("language") ?? params.get("locale") ?? params.get("lang") ?? "").toLowerCase().startsWith("ar");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<Bootstrap>({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    document.documentElement.lang = arabic ? "ar" : "en";
    document.documentElement.dir = arabic ? "rtl" : "ltr";
  }, [arabic]);

  async function bootstrap() {
    setState("loading");
    try {
      if (!token) throw new Error(arabic ? "لم يرسل زد جلسة مضمنة صالحة." : "Zid did not provide a valid embedded session.");
      const response = await fetch("/api/embedded/zid/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as Bootstrap;
      if (!response.ok || !result.ok || !result.merchantId || !result.accessCode) throw new Error(result.error ?? "PrizeSkout could not open this Zid store.");
      localStorage.setItem("ps_merchant_id", result.merchantId);
      localStorage.setItem("ps_access_code", result.accessCode);
      localStorage.setItem("ps_connected", "true");
      setData(result);
      setState("ready");
    } catch (error) {
      setData({ error: error instanceof Error ? error.message : "PrizeSkout could not start." });
      setState("error");
    }
  }

  useEffect(() => { void bootstrap(); }, [token]);

  async function retrySync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/embedded/zid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as Bootstrap;
      if (!response.ok) throw new Error(result.error ?? "Zid catalogue synchronization failed.");
      await bootstrap();
    } catch (error) {
      setData(previous => ({ ...previous, syncState: "error", syncError: error instanceof Error ? error.message : "Catalogue synchronization failed." }));
    } finally {
      setSyncing(false);
    }
  }

  const shell = { minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, PingARLT, system-ui, sans-serif" } as const;
  if (state === "loading") return <main dir={arabic ? "rtl" : "ltr"} style={{ ...shell, display: "grid", placeItems: "center" }}><div style={{ textAlign: "center" }}><RefreshCw aria-hidden="true" size={28} style={{ animation: "spin .8s linear infinite", color: colors.accent }} /><p>{arabic ? "جارٍ تجهيز مساحة عمل PrizeSkout…" : "Preparing your PrizeSkout workspace…"}</p><style>{"@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){svg{animation:none!important}}"}</style></div></main>;
  if (state === "error") return <main dir={arabic ? "rtl" : "ltr"} style={{ ...shell, display: "grid", placeItems: "center", padding: 24 }}><section style={{ ...card, maxWidth: 560, padding: 28 }}><AlertCircle aria-hidden="true" size={30} color="#D93C52" /><h1>{arabic ? "تعذر فتح PrizeSkout" : "We couldn’t open PrizeSkout"}</h1><p role="alert" style={{ color: colors.muted, lineHeight: 1.65 }}>{data.error}</p><button onClick={() => void bootstrap()} style={primaryButton}>{arabic ? "حاول مرة أخرى" : "Try again"}</button></section></main>;

  const syncComplete = data.syncState === "complete";
  const storeLabel = arabic && (!data.storeName || data.storeName === "Your Zid store")
    ? "متجر زد الخاص بك"
    : data.storeName ?? (arabic ? "متجر زد الخاص بك" : "Your Zid store");
  const steps = [
    { done: true, title: arabic ? "تم ربط زد" : "Zid connected", body: arabic ? "تم التحقق من هوية المتجر والتفويض." : "Store identity and authorization verified." },
    { done: syncComplete, title: arabic ? "راجع الكتالوج المتزامن" : "Review synchronized catalogue", body: data.syncError ? (arabic ? "تحتاج المزامنة إلى مراجعة. أعد المحاولة بأمان." : "Synchronization needs attention. Retry it safely.") : syncComplete ? (arabic ? `تمت مزامنة ${data.syncItems ?? 0} منتجًا.` : `${data.syncItems ?? 0} products synchronized and ready to review.`) : (arabic ? "جارٍ تجهيز كتالوج المنتجات." : "Your product catalogue is being prepared.") },
    { done: false, title: arabic ? "أضف التكاليف والشروط التجارية" : "Add costs and commercial terms", body: arabic ? "أكد تكلفة المنتج والعمولات والرسوم والشروط المعتمدة." : "Confirm product costs and the approved commissions, fees, and terms." },
    { done: false, title: arabic ? "أضف أدلة الطلبات والدفعات" : "Bring in order and payout evidence", body: arabic ? "اجمع ما بعته وما تم خصمه وما تم دفعه." : "Bring together what you sold, what was deducted, and what was paid." },
    { done: false, title: arabic ? "شغّل أول تدقيق موثّق" : "Run your first verified audit", body: arabic ? "اكشف تسرب الهامش وفروقات الدفع دون تجاوز ما تثبته الأدلة." : "Reveal margin leakage and payout differences without overstating the evidence." },
  ];

  return <main dir={arabic ? "rtl" : "ltr"} style={{ ...shell, padding: "28px clamp(18px,4vw,52px) 48px", overflowX: "hidden" }}><section style={{ maxWidth: 1180, margin: "0 auto" }}>
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}><div><div style={{ color: colors.accent, fontWeight: 800, fontSize: 13 }}>{arabic ? "متصل بزد" : "CONNECTED TO ZID"}</div><h1 style={{ margin: "8px 0 7px", fontSize: "clamp(26px,4vw,38px)" }}>{arabic ? "مرحبًا بك في PrizeSkout" : "Welcome to PrizeSkout"}</h1><p style={{ margin: 0, color: colors.muted }}>{arabic ? `تم ربط ${storeLabel}. أكمل الإعداد من داخل متجر زد.` : `${storeLabel} is connected. Complete setup without leaving your Zid store.`}</p></div><button onClick={() => location.assign("/dashboard/revenue-hub")} style={primaryButton}>{arabic ? "افتح مساحة العمل" : "Open full workspace"}<ArrowRight aria-hidden="true" size={17} style={{ transform: arabic ? "rotate(180deg)" : undefined }} /></button></header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, margin: "28px 0" }}>
      <Status icon={<Store aria-hidden="true" size={21} />} label={arabic ? "اتصال المتجر" : "Store connection"} value={arabic ? "سليم" : "Healthy"} detail={data.webhooksReady ? (arabic ? "التفويض والإشعارات جاهزة" : "Authorization and webhooks ready") : (arabic ? "التفويض مؤكد؛ راجع الإشعارات" : "Authorization verified; review webhooks")} />
      <Status icon={<RefreshCw aria-hidden="true" size={21} />} label={arabic ? "مزامنة الكتالوج" : "Catalogue synchronization"} value={syncComplete ? (arabic ? "مكتملة" : "Complete") : data.syncError ? (arabic ? "يلزم إجراء" : "Action needed") : (arabic ? "قيد التنفيذ" : "In progress")} detail={syncComplete ? `${data.syncItems ?? 0} ${arabic ? "منتجًا" : "products"}` : data.syncError ?? (arabic ? "يجري تجهيز بياناتك" : "Preparing your store data")} action={!syncComplete ? <button disabled={syncing} onClick={() => void retrySync()} style={{ ...primaryButton, marginTop: 10, padding: "8px 12px", opacity: syncing ? .65 : 1 }}>{syncing ? (arabic ? "جارٍ المزامنة…" : "Synchronizing…") : (arabic ? "أعد المحاولة" : "Retry sync")}</button> : null} />
      <Status icon={<TrendingUp aria-hidden="true" size={21} />} label={arabic ? "الوصول الآمن" : "Secure access"} value={data.welcomeAccepted ? (arabic ? "تم إرسال الرابط" : "Welcome accepted") : data.welcomeUnavailable ? (arabic ? "البريد غير متاح" : "Email unavailable") : (arabic ? "جاهز داخل زد" : "Ready inside Zid")} detail={arabic ? "لا نرسل كلمات مرور أو رموز وصول قابلة لإعادة الاستخدام." : "No password or reusable access code is sent by email."} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 18 }}><section style={{ ...card, padding: 24 }}><h2 style={{ marginTop: 0 }}>{arabic ? "قائمة إعدادك" : "Your setup checklist"}</h2>{steps.map((step, index) => <div key={step.title} style={{ display: "flex", gap: 13, padding: "15px 0", borderTop: index ? `1px solid ${colors.border}` : "none" }}>{step.done ? <CheckCircle2 aria-hidden="true" size={22} color="#278A5B" /> : <Circle aria-hidden="true" size={22} color="#A39AAA" />}<div><strong>{step.title}</strong><p style={{ margin: "4px 0 0", color: colors.muted, lineHeight: 1.5 }}>{step.body}</p></div></div>)}</section><aside style={{ ...card, padding: 24, background: "#F1E8F5" }}><TrendingUp aria-hidden="true" size={28} color={colors.accent} /><h2>{arabic ? "حقق أول نتيجة موثّقة" : "Reach your first verified result"}</h2><p style={{ color: colors.muted, lineHeight: 1.65 }}>{arabic ? "يجمع PrizeSkout تكاليفك وشروطك وأدلة الدفع لفهم الربح الحقيقي وشرح الاستقطاعات وتجهيز الاسترداد المدعوم بالأدلة عند الحاجة." : "PrizeSkout combines costs, approved terms, orders, and payout evidence to explain true contribution profit, deductions, and evidence-backed recovery opportunities."}</p><button onClick={() => location.assign("/dashboard/revenue-hub")} style={{ ...primaryButton, width: "100%", marginTop: 8 }}>{arabic ? "متابعة الإعداد" : "Continue setup"}</button></aside></div>
  </section></main>;
}

function Status({ icon, label, value, detail, action }: { icon: React.ReactNode; label: string; value: string; detail: string; action?: React.ReactNode }) {
  return <div style={{ ...card, padding: 18 }}><div style={{ color: colors.accent }}>{icon}</div><div style={{ color: colors.muted, fontSize: 12, marginTop: 15 }}>{label}</div><strong style={{ display: "block", fontSize: 18, margin: "3px 0" }}>{value}</strong><span style={{ color: colors.muted, fontSize: 12, lineHeight: 1.45 }}>{detail}</span>{action}</div>;
}
