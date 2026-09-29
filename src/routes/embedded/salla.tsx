import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { embedded } from "@salla.sa/embedded-sdk";
import { AlertCircle, ArrowRight, CheckCircle2, Circle, RefreshCw, Store, TrendingUp } from "lucide-react";

type Bootstrap = {
  ok?: boolean;
  merchantId?: string;
  accessCode?: string;
  storeName?: string;
  connectedAt?: string | null;
  webhooksReady?: boolean;
  syncState?: "in_progress" | "complete";
  syncItems?: number | null;
  syncError?: string | null;
  error?: string;
};

export const Route = createFileRoute("/embedded/salla")({
  head: () => ({ meta: [{ title: "PrizeSkout for Salla" }] }),
  component: SallaEmbeddedPage,
});

function SallaEmbeddedPage() {
  const arabic = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("locale")?.toLowerCase().startsWith("ar");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<Bootstrap>({});
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [syncing, setSyncing] = useState(false);
  const sessionToken = useRef<string | null>(null);

  async function bootstrap() {
    setState("loading");
    try {
      const { layout } = await embedded.init();
      setTheme(layout?.theme === "dark" ? "dark" : "light");
      const token = embedded.auth.getToken();
      if (!token) throw new Error("Salla did not provide an embedded session. Open PrizeSkout from Apps > My Apps.");
      sessionToken.current = token;
      const response = await fetch("/api/embedded/salla/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as Bootstrap;
      if (!response.ok || !result.ok || !result.merchantId || !result.accessCode) {
        throw new Error(result.error ?? "PrizeSkout could not open this Salla store.");
      }
      localStorage.setItem("ps_merchant_id", result.merchantId);
      localStorage.setItem("ps_access_code", result.accessCode);
      localStorage.setItem("ps_connected", "true");
      setData(result);
      setState("ready");
      embedded.page.setTitle("PrizeSkout");
      embedded.ready();
    } catch (error) {
      setData({ error: error instanceof Error ? error.message : "PrizeSkout could not start." });
      setState("error");
      embedded.destroy();
    }
  }

  useEffect(() => {
    const unsubscribe = embedded.onThemeChange(next => setTheme(next));
    void bootstrap();
    return () => unsubscribe();
  }, []);

  async function retrySync() {
    setSyncing(true);
    try {
      // The SDK may expose the iframe token only during initialization. Reuse
      // that already-verified short-lived token within this embedded session.
      const token = sessionToken.current ?? embedded.auth.getToken();
      if (!token) throw new Error("Salla did not provide an embedded session.");
      const response = await fetch("/api/embedded/salla/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as Bootstrap;
      if (!response.ok) throw new Error(result.error ?? "Catalog sync failed.");
      await bootstrap();
    } catch (error) {
      setData(previous => ({ ...previous, syncError: error instanceof Error ? error.message : "Catalog sync failed." }));
    } finally {
      setSyncing(false);
    }
  }

  const dark = theme === "dark";
  const colors = dark
    ? { bg: "#111827", card: "#182231", text: "#F8FAFC", muted: "#A8B3C2", border: "#2A394A" }
    : { bg: "#F8F8F8", card: "#FFFFFF", text: "#12343B", muted: "#667781", border: "#E2E8EA" };

  if (state === "loading") return (
    <main dir={arabic ? "rtl" : "ltr"} style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: colors.bg, color: colors.text, fontFamily: "PingARLT, Inter, system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}><RefreshCw aria-hidden="true" size={28} style={{ animation: "spin .8s linear infinite", color: "#008C78" }} /><p>{arabic ? "جارٍ تجهيز مساحة عمل PrizeSkout…" : "Preparing your PrizeSkout workspace…"}</p><style>{"@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){svg{animation:none!important}}"}</style></div>
    </main>
  );

  if (state === "error") return (
    <main dir={arabic ? "rtl" : "ltr"} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: colors.bg, color: colors.text, fontFamily: "PingARLT, Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 560, padding: 28, borderRadius: 16, background: colors.card, border: `1px solid ${colors.border}` }}>
        <AlertCircle aria-hidden="true" size={30} color="#F5434A" /><h1 style={{ fontSize: 22 }}>{arabic ? "تعذر فتح PrizeSkout" : "We couldn’t open PrizeSkout"}</h1><p role="alert" style={{ color: colors.muted, lineHeight: 1.65 }}>{data.error}</p>
        <button onClick={() => void bootstrap()} style={primaryButton}>{arabic ? "حاول مرة أخرى" : "Try again"}</button>
      </section>
    </main>
  );

  const steps = [
    { done: true, title: arabic ? "تم ربط سلة" : "Salla connected", body: arabic ? "تم التحقق من هوية المتجر والصلاحيات." : "Store identity and permissions verified." },
    { done: data.syncState === "complete", title: arabic ? "مراجعة الكتالوج المتزامن" : "Review synchronized catalog", body: data.syncError ? (arabic ? "تحتاج إلى مراجعة — أعد محاولة المزامنة الآمنة مع سلة." : "Needs attention — retry the secure Salla synchronization.") : data.syncState === "complete" ? (arabic ? `تمت مزامنة ${data.syncItems ?? 0} منتجًا وأصبحت جاهزة للمراجعة.` : `${data.syncItems ?? 0} products synchronized and ready to review.`) : (arabic ? "جارٍ تجهيز كتالوج المنتجات." : "Your product catalog is being prepared.") },
    { done: false, title: arabic ? "أضف التكاليف والشروط التجارية" : "Add costs and commercial terms", body: arabic ? "أضف تكلفة المنتج والعمولات والرسوم والشروط المعتمدة لكل قناة." : "Add product costs and approve the commissions, fees, and terms that apply to each channel." },
    { done: false, title: arabic ? "أضف أدلة الطلبات والدفعات" : "Bring in order and payout evidence", body: arabic ? "استورد السجلات أو ارفع الملفات التي تثبت ما بعته وما تم خصمه وما تم دفعه." : "Import or upload the records that show what you sold, what was deducted, and what was paid." },
    { done: false, title: arabic ? "شغّل أول تدقيق للربح والدفعات" : "Run your first profit and payout audit", body: arabic ? "اكشف تسرب الهامش وفروقات الدفع وجهّز ملف استرداد مدعومًا بالأدلة عند الحاجة." : "Reveal margin leakage and payout differences, then prepare an evidence-backed recovery case when warranted." },
  ];

  return (
    <main dir={arabic ? "rtl" : "ltr"} style={{ minHeight: "100vh", padding: "28px clamp(18px,4vw,52px) 48px", background: colors.bg, color: colors.text, fontFamily: "PingARLT, Inter, system-ui, sans-serif", overflowX: "hidden" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div><div style={{ color: "#008C78", fontWeight: 800, fontSize: 13, letterSpacing: ".04em" }}>{arabic ? "متصل بسلة" : "CONNECTED TO SALLA"}</div><h1 style={{ margin: "8px 0 7px", fontSize: "clamp(26px,4vw,38px)" }}>{arabic ? "مرحبًا بك في PrizeSkout" : "Welcome to PrizeSkout"}</h1><p style={{ margin: 0, color: colors.muted, fontSize: 16 }}>{arabic ? `تم ربط ${data.storeName}. إليك الخطوات التالية.` : `${data.storeName} is connected. Here’s what happens next.`}</p></div>
          <button onClick={() => location.assign("/dashboard/revenue-hub")} style={primaryButton}>{arabic ? "افتح مساحة العمل الكاملة" : "Open full workspace"} <ArrowRight aria-hidden="true" size={17} style={{ transform: arabic ? "rotate(180deg)" : undefined }} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, margin: "28px 0" }}>
          <StatusCard colors={colors} icon={<Store aria-hidden="true" size={21} />} label={arabic ? "اتصال المتجر" : "Store connection"} value={arabic ? "سليم" : "Healthy"} detail={arabic ? "تم التحقق من التفويض" : "Authorization verified"} />
          <div style={{ ...card(colors), padding: 18 }}><div style={{ color: "#008C78" }}><RefreshCw size={21} /></div><div style={{ color: colors.muted, fontSize: 12, marginTop: 15 }}>{arabic ? "تجهيز البيانات" : "Data preparation"}</div><strong style={{ display: "block", fontSize: 18, margin: "3px 0" }}>{data.syncError ? (arabic ? "يلزم إجراء" : "Action needed") : data.syncState === "complete" ? (arabic ? "مكتمل" : "Complete") : (arabic ? "قيد التنفيذ" : "In progress")}</strong><span style={{ color: colors.muted, fontSize: 12 }}>{data.syncError ? (arabic ? "إعادة المحاولة متاحة" : "Retry available") : data.syncState === "complete" ? (arabic ? `${data.syncItems ?? 0} منتجًا` : `${data.syncItems ?? 0} products`) : (arabic ? "ابدأ المزامنة لإكمال الإعداد" : "Start synchronization to complete setup")}</span>{data.syncState !== "complete" && <button disabled={syncing} onClick={() => void retrySync()} style={{ ...primaryButton, marginTop: 12, padding: "8px 12px", opacity: syncing ? .65 : 1 }}>{syncing ? (arabic ? "جارٍ المزامنة…" : "Synchronizing…") : (arabic ? "إعادة محاولة المزامنة" : "Retry synchronization")}</button>}</div>
          <StatusCard colors={colors} icon={<TrendingUp aria-hidden="true" size={21} />} label={arabic ? "أول قيمة" : "First value"} value={arabic ? "نتيجة موثقة" : "Verified result"} detail={arabic ? "أكمل إعداد الأدلة للمتابعة" : "Complete evidence setup to unlock"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 18 }}>
          <section style={{ ...card(colors), padding: 24 }}><h2 style={{ margin: "0 0 5px", fontSize: 20 }}>{arabic ? "قائمة إعدادك" : "Your setup checklist"}</h2><p style={{ margin: "0 0 18px", color: colors.muted }}>{arabic ? "يحفظ PrizeSkout كل خطوة. يمكنك فتحه مجددًا من سلة في أي وقت." : "PrizeSkout saves each step. You can reopen it from Salla at any time."}</p>{steps.map((step, index) => <div key={step.title} style={{ display: "flex", gap: 13, padding: "15px 0", borderTop: index ? `1px solid ${colors.border}` : "none" }}>{step.done ? <CheckCircle2 size={22} color="#00B259" /> : <Circle size={22} color="#93A4AC" />}<div><strong>{step.title}</strong><p style={{ margin: "4px 0 0", color: colors.muted, fontSize: 14 }}>{step.body}</p></div></div>)}</section>
          <aside style={{ ...card(colors), padding: 24, background: dark ? "#12353A" : "#E9FBF6" }}><div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "#73FCD7", color: "#004D5B" }}><TrendingUp aria-hidden="true" size={22} /></div><h2 style={{ fontSize: 20, marginBottom: 8 }}>{arabic ? "حقق أول نتيجة موثقة" : "Reach your first verified result"}</h2><p style={{ color: colors.muted, lineHeight: 1.6 }}>{arabic ? "اجمع التكاليف والشروط وأدلة الدفع لترى ربح المساهمة الحقيقي، وتفهم الاستقطاعات، وتكشف أي أموال مفقودة دون المبالغة فيما تثبته الأدلة." : "Combine costs, commercial terms, and payout evidence to understand true contribution profit, explain deductions, and find missing money without overstating what the evidence proves."}</p><button onClick={() => location.assign("/dashboard/revenue-hub")} style={{ ...primaryButton, width: "100%", minHeight: 44, justifyContent: "center", marginTop: 8 }}>{arabic ? "متابعة الإعداد" : "Continue setup"}</button></aside>
        </div>
      </section>
    </main>
  );
}

const primaryButton = { display: "inline-flex", minHeight: 44, alignItems: "center", gap: 8, border: 0, borderRadius: 10, padding: "12px 17px", color: "#FFFFFF", background: "#006B62", fontWeight: 800, cursor: "pointer" } as const;
function card(colors: { card: string; border: string }) { return { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 15, boxShadow: "0 8px 24px rgba(12,48,55,.05)" }; }
function StatusCard({ colors, icon, label, value, detail }: { colors: { card: string; border: string; muted: string }; icon: React.ReactNode; label: string; value: string; detail: string }) { return <div style={{ ...card(colors), padding: 18 }}><div style={{ color: "#008C78" }}>{icon}</div><div style={{ color: colors.muted, fontSize: 12, marginTop: 15 }}>{label}</div><strong style={{ display: "block", fontSize: 18, margin: "3px 0" }}>{value}</strong><span style={{ color: colors.muted, fontSize: 12 }}>{detail}</span></div>; }
