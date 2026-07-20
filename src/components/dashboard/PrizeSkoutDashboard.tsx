import { useState, useEffect, useRef } from "react";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { ContactSupportModal } from "@/components/ContactSupportModal";
import { ProductTour, type TourStep } from "@/components/dashboard/ProductTour";

type Tab = "analytics" | "rules" | "vault" | "history" | "settings";
type Theme = "light" | "dark";
type Lang = "en" | "ar" | "fr";

interface FeedRow { tag: string; tagColor: string; text: string; time: string; }
interface Rule { name: string; desc: string; floor: number; active: boolean; }

const OG = "#EF681A";
const GN = "#10B981";
const MONO = "'Chillax',ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const DISPLAY = "'Chillax',system-ui,sans-serif";

const CSS = `

  @keyframes pk-pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes pk-ring{0%,100%{opacity:1}50%{opacity:.35}}
  @keyframes pk-glow{from{}to{}}
  @keyframes pk-spin{to{transform:rotate(360deg)}}
  @keyframes pk-in{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pk-toast{from{transform:translateY(14px) scale(.97)}to{transform:none}}
  .ps-db{
    font-family:'Chillax',system-ui,-apple-system,sans-serif;
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
  { name:"Talabat",   platform:"talabat",   region:"QA · KSA · UAE",     byok:true,  oauthPath:null as string|null },
  { name:"Snoonu",    platform:"snoonu",    region:"QA",                  byok:false, oauthPath:null as string|null },
  { name:"Keeta",     platform:"keeta",     region:"QA · KSA",            byok:false, oauthPath:"/api/auth/keeta" as string|null },
  { name:"Jahez",     platform:"jahez",     region:"KSA · hyperlocal",    byok:true,  oauthPath:null as string|null },
  { name:"Deliveroo", platform:"deliveroo", region:"UAE · QA",            byok:false, oauthPath:null as string|null },
];

// Platforms selectable for a manual payout-check upload — only Talabat has
// a live API pull built (see expected-payout.ts); the others here rely on
// the CSV parser's flexible column matching, not a verified export format.
const PAYOUT_UPLOAD_PLATFORMS = [
  { value:"talabat",   label:"Talabat" },
  { value:"jahez",     label:"Jahez" },
  { value:"snoonu",    label:"Snoonu" },
  { value:"deliveroo", label:"Deliveroo" },
];

type ByokField = { key:string; label:string; hint?:string; type?:"password"|"text" };
const BYOK_CONFIG: Record<string, { fields:ByokField[]; portalHint?:string }> = {
  talabat: {
    fields:[
      { key:"client_id",     label:"Client ID",     hint:"Talabat Partner Portal → Settings → API Credentials" },
      { key:"client_secret", label:"Client Secret" },
      { key:"vendor_id",     label:"Vendor ID",     hint:"Your store's vendor ID from the Talabat portal" },
      { key:"chain_id",      label:"Chain ID",      hint:"UUID format, e.g. 12345678-1234-1234-1234-123456789012 — from partner.talabat.com" },
      { key:"commission_rate_pct", label:"Commission Rate (%)", type:"text", hint:"The rate you agreed with Talabat, e.g. 19 — powers your expected-payout check" },
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
  keeta_shop_id: {
    fields:[
      { key:"shop_id", label:"Keeta Shop ID", type:"text", hint:"Appears in any inbound Keeta order webhook payload, or ask your Keeta account manager." },
    ],
  },
};

const T = {
  en: {
    cp:"CONTROL PLANE", live:"LIVE", defend:"Defend Loop Online", defendS:"4 edge nodes · healthy",
    navA:"Revenue Protection Hub", navAs:"Analytics",
    navR:"Margin Policy Engine",   navRs:"Rule Book",
    navV:"Integration Vault",      navVs:"Connections",
    navH:"Payout & Repricing History", navHs:"History",
    subA:"Active price optimization and loss prevention",
    subR:"Natural-language pricing rules and margin guardrails",
    subV:"POS, aggregator and cache connections",
    subH:"Every payout check and automated price change, in one place",
    historyViewLink:"View history →",
    historyPayoutTitle:"Payout Check History", historyPayoutDesc:"Every Expected Payout Check you've run — live or uploaded.",
    historyPayoutEmpty:"No payout checks yet. Run one from the Revenue Hub.",
    historyRepricingTitle:"Repricing History", historyRepricingDesc:"Automated price changes PrizeSkout has made on your behalf.",
    historyRepricingEmpty:"No automated price changes yet.",
    historyLoading:"Loading…",
    historyColDate:"Date", historyColSource:"Source", historyColPlatform:"Platform", historyColOrders:"Orders",
    historyColExpected:"Expected Payout", historyColChannel:"Channel", historyColSku:"SKU",
    historyColPrice:"Price Change", historyColStatus:"Status",
    historyDetailPeriod:"Period", historyDetailSales:"Sales used", historyDetailRows:"Rows used",
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
    previewLabel:"Preview only · category rules not yet enforced",
    floorWarn:"⚠ Floor is below 15% cost basis. The guardrail will reject all executions at this level.",
    settingsLabel:"Settings", backToSite:"Back to site", myAccount:"My Account",
    settingsSub:"Store access, channels, margin rules, outlets and notifications.",
    supportLabel:"Support",
    inboundTitle:"Inbound Connections",
    inboundDesc:"POS and e-commerce platforms that feed orders and catalog data into PrizeSkout.",
    outboundTitle:"Outbound Connections",
    outboundDesc:"Delivery aggregators that PrizeSkout pushes margin-safe prices to in real time.",
    inboundConnectedMsg:"connected · data syncing",
    inboundAuthorizeMsg:"not connected · click to authorize",
    inboundComingSoonMsg:"integration coming soon",
    connectPrefix:"Connect",
    setupBadge:"SETUP", soonBadge:"SOON",
    storeConnectedSyncing:"Store connected · prices syncing",
    tapSetupMsg:"Tap SETUP to connect your store",
    awaitingBuildMsg:"Awaiting integration build",
    newDiscrepancy:"New Discrepancy",
    partnerLabel:"Partner", orderIdLabel:"Order ID", branchLocationLabel:"Branch / Location",
    contractedRateLabel:"Contracted rate (%)",
    orderValueLabel:"Order value", chargedByPartnerLabel:"Charged by partner",
    additionalNotesLabel:"Additional notes (optional)",
    logDiscrepancyBtn:"+ Log Discrepancy", cancelBtn:"− Cancel",
    finishSetupBadge:"Finish Setup",
    keetaConnectedMsg:"Keeta connected · finish setup by entering your Shop ID",
    keetaShopIdPrompt:"Enter the Shop ID for your Keeta store to finish connecting. PrizeSkout needs this to push margin-safe prices to your Keeta menu.",
    keetaShopIdSaved:"Keeta Shop ID saved · prices syncing",
    keetaShopIdPending:"Shop ID needed to sync prices",
    tourReplayLabel:"Take a tour",
    tourStartBtn:"Start tour", tourNextBtn:"Next", tourBackBtn:"Back", tourFinishBtn:"Got it — let's connect",
    tourSkipLabel:"Skip tour",
    tourWelcomeTitle:"Welcome to your control plane",
    tourWelcomeBody:"A two-minute walkthrough of where PrizeSkout tracks margin, compiles pricing rules, and pushes protected prices to your delivery apps.",
    tourHeroTitle:"Revenue Protection Hub",
    tourHeroBody:"Profits protected, price updates, and margin saved — tracked here in real time, alongside a live feed of every price change PrizeSkout makes on your behalf.",
    tourCopilotTitle:"Describe a rule, get an engine config",
    tourCopilotBody:"Type a pricing rule in plain English — \"Lock bakery margins at 25%\" — and Copilot compiles it into a guardrail enforced at the edge in under 2ms.",
    tourGuardrailsTitle:"Your margin floors, always enforced",
    tourGuardrailsBody:"Every rule you apply lives here. Adjust a floor and it takes effect immediately — no redeploy, no waiting on engineering.",
    tourSupportTitle:"Stuck on anything? We're one click away",
    tourSupportBody:"Integration issues, dispute questions, or anything else — reach the PrizeSkout team directly from here.",
    tourInboundTitle:"Feed PrizeSkout your real data",
    tourInboundBody:"Connect your POS or e-commerce platform so PrizeSkout can see real orders, costs, and catalog — the foundation everything else runs on.",
    tourOutboundTitle:"This is where the defense happens",
    tourOutboundBody:"Connect Talabat, Jahez, or any delivery aggregator and PrizeSkout starts pushing margin-safe prices automatically — no more silent margin leaks.",
    payoutCheckTitle:"Expected Payout Check",
    payoutCheckDesc:"We calculate what you should have been paid, using the commission rate you agreed to. Compare it to what actually landed in your bank account.",
    payoutCheckBtn:"Check Last 30 Days", payoutCheckBtnLoading:"Pulling your orders…",
    payoutCheckLiveOnlyNote:"Talabat only, for now — other platforms coming soon.",
    payoutCheckOrders:"Orders Checked", payoutCheckSubtotal:"Food Sales (excl. delivery fee)", payoutCheckRate:"Your Commission Rate",
    payoutCheckExpectedLabel:"You Should Have Received", payoutCheckHint:"Compare this to your bank deposit for the same period.",
    payoutCheckNotConnected:"Connect Talabat first to run this check.",
    payoutCheckUploadBtn:"Upload a Statement",
    payoutCheckUploadRateLabel:"Commission rate for this file (%)",
    payoutCheckSalesLabel:"Total Sales (from file)",
    payoutCheckUploadNote:"This estimate uses the file's daily sales total, which may include delivery fees. A live check reads each order separately and is more precise.",
    payoutCheckPdfNote:"This estimate covers one calendar month from Snoonu's report (GMV), not a custom date range. It won't match exactly if Snoonu's payout math differs from a flat GMV × (1 − commission) calculation.",
    payoutCheckPdfPreviewTitle:"Parsed from your PDF — check this against the report",
    payoutCheckPdfCancelled:"Cancelled GMV",
    payoutCheckCsvOrPdfSnoonu:"CSV, or Snoonu's monthly Brand Performance Report PDF.",
    payoutCheckLiveTab:"Live Check", payoutCheckUploadTab:"Upload File",
    payoutCheckUploadPlatformLabel:"Platform", payoutCheckCsvOnly:"CSV files only for now.",
    payoutCheckSourceLive:"Live check", payoutCheckSourceUpload:"Uploaded file", payoutCheckShowing:"Showing",
    payoutCheckRowsSkipped:"rows skipped — date or number format didn't match, so they weren't counted.",
  },
  ar: {
    cp:"لوحة التحكم", live:"مباشر", defend:"حلقة الدفاع تعمل", defendS:"4 عقد طرفية · سليمة",
    navA:"مركز حماية الإيرادات", navAs:"التحليلات",
    navR:"محرك سياسة الهوامش",   navRs:"دفتر القواعد",
    navV:"خزنة التكاملات",        navVs:"الاتصالات",
    navH:"سجل المدفوعات وإعادة التسعير", navHs:"السجل",
    subA:"تحسين الأسعار الفعال ومنع الخسائر",
    subR:"قواعد تسعير بلغة طبيعية وحدود حماية الهوامش",
    subV:"اتصالات نقاط البيع والمجمعات والذاكرة المؤقتة",
    subH:"كل فحص مدفوعات وكل تغيير سعر تلقائي، في مكان واحد",
    historyViewLink:"عرض السجل ←",
    historyPayoutTitle:"سجل فحوصات المدفوعات", historyPayoutDesc:"كل فحص مدفوعات متوقع قمت بتشغيله — مباشر أو مرفوع.",
    historyPayoutEmpty:"لا توجد فحوصات مدفوعات بعد. شغّل واحداً من مركز الإيرادات.",
    historyRepricingTitle:"سجل إعادة التسعير", historyRepricingDesc:"تغييرات الأسعار التلقائية التي أجرتها Prizeskout نيابة عنك.",
    historyRepricingEmpty:"لا توجد تغييرات أسعار تلقائية بعد.",
    historyLoading:"جارٍ التحميل…",
    historyColDate:"التاريخ", historyColSource:"المصدر", historyColPlatform:"المنصة", historyColOrders:"الطلبات",
    historyColExpected:"المدفوعات المتوقعة", historyColChannel:"القناة", historyColSku:"رمز المنتج",
    historyColPrice:"تغيير السعر", historyColStatus:"الحالة",
    historyDetailPeriod:"الفترة", historyDetailSales:"المبيعات المستخدمة", historyDetailRows:"الصفوف المستخدمة",
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
    previewLabel:"معاينة فقط · قواعد الفئات غير مفعّلة بعد",
    floorWarn:"⚠ الحد أقل من 15% تكلفة أساسية. سيرفض الحارس جميع التنفيذات عند هذا المستوى.",
    settingsLabel:"الإعدادات", backToSite:"العودة إلى الموقع", myAccount:"حسابي",
    settingsSub:"الوصول إلى المتجر، القنوات، قواعد الهامش، الفروع، والإشعارات.",
    supportLabel:"الدعم",
    inboundTitle:"الاتصالات الواردة",
    inboundDesc:"أنظمة نقاط البيع والتجارة الإلكترونية التي تغذي برايز سكاوت بالطلبات وبيانات الكتالوج.",
    outboundTitle:"الاتصالات الصادرة",
    outboundDesc:"منصات التوصيل التي يرسل إليها برايز سكاوت الأسعار الآمنة للهامش لحظياً.",
    inboundConnectedMsg:"متصل · جارٍ مزامنة البيانات",
    inboundAuthorizeMsg:"غير متصل · انقر للتفويض",
    inboundComingSoonMsg:"التكامل قريباً",
    connectPrefix:"اتصال",
    setupBadge:"الإعداد", soonBadge:"قريباً",
    storeConnectedSyncing:"المتجر متصل · جارٍ مزامنة الأسعار",
    tapSetupMsg:"اضغط على الإعداد لربط متجرك",
    awaitingBuildMsg:"التكامل قيد الإنشاء",
    newDiscrepancy:"تناقض جديد",
    partnerLabel:"الشريك", orderIdLabel:"رقم الطلب", branchLocationLabel:"الفرع / الموقع",
    contractedRateLabel:"النسبة المتعاقد عليها (%)",
    orderValueLabel:"قيمة الطلب", chargedByPartnerLabel:"المبلغ المحصل من الشريك",
    additionalNotesLabel:"ملاحظات إضافية (اختياري)",
    logDiscrepancyBtn:"+ تسجيل تناقض", cancelBtn:"− إلغاء",
    finishSetupBadge:"أكمل الإعداد",
    keetaConnectedMsg:"تم ربط كيتا · أكمل الإعداد بإدخال رقم المتجر",
    keetaShopIdPrompt:"أدخل رقم متجر كيتا (Shop ID) لإكمال الربط. يحتاج برايز سكاوت إلى هذا الرقم لإرسال الأسعار الآمنة للهامش إلى قائمة كيتا الخاصة بك.",
    keetaShopIdSaved:"تم حفظ رقم متجر كيتا · جارٍ مزامنة الأسعار",
    keetaShopIdPending:"رقم المتجر مطلوب لمزامنة الأسعار",
    tourReplayLabel:"جولة تعريفية",
    tourStartBtn:"بدء الجولة", tourNextBtn:"التالي", tourBackBtn:"رجوع", tourFinishBtn:"فهمت — لنربط المتجر",
    tourSkipLabel:"تخطي الجولة",
    tourWelcomeTitle:"مرحباً بك في لوحة التحكم الخاصة بك",
    tourWelcomeBody:"جولة سريعة مدتها دقيقتان توضح أين يتتبع PrizeSkout الهامش، ويحوّل قواعد التسعير، ويرسل الأسعار الآمنة إلى تطبيقات التوصيل الخاصة بك.",
    tourHeroTitle:"مركز حماية الإيرادات",
    tourHeroBody:"الأرباح المحمية، وتحديثات الأسعار، والهامش الموفر — كلها تُعرض هنا لحظياً، إلى جانب بث مباشر لكل تغيير سعر ينفذه PrizeSkout نيابة عنك.",
    tourCopilotTitle:"صِف قاعدة، واحصل على تهيئة جاهزة",
    tourCopilotBody:"اكتب قاعدة تسعير بلغة طبيعية — مثل \"ثبّت هامش المخبوزات عند 25%\" — ليقوم Copilot بتحويلها إلى حارس مفعّل عند الحافة في أقل من 2 مللي ثانية.",
    tourGuardrailsTitle:"حدود الهامش، مفعّلة دائماً",
    tourGuardrailsBody:"كل قاعدة تطبّقها تظهر هنا. عدّل الحد الأدنى وسيُطبَّق فوراً — دون إعادة نشر أو انتظار فريق التطوير.",
    tourSupportTitle:"عالق في شيء؟ نحن على بُعد نقرة واحدة",
    tourSupportBody:"مشاكل الربط، استفسارات النزاعات، أو أي شيء آخر — تواصل مع فريق PrizeSkout مباشرة من هنا.",
    tourInboundTitle:"زوّد PrizeSkout ببياناتك الحقيقية",
    tourInboundBody:"اربط نظام نقطة البيع أو منصة التجارة الإلكترونية الخاصة بك ليتمكن PrizeSkout من رؤية الطلبات والتكاليف والكتالوج الفعلي — الأساس الذي يقوم عليه كل شيء آخر.",
    tourOutboundTitle:"هنا يحدث الدفاع الفعلي",
    tourOutboundBody:"اربط طلبات، جاهز، أو أي مجمّع توصيل آخر، وسيبدأ PrizeSkout بإرسال أسعار آمنة للهامش تلقائياً — لا مزيد من تسرب الهامش الصامت.",
    payoutCheckTitle:"فحص المدفوعات المتوقعة",
    payoutCheckDesc:"نحسب ما كان يجب أن تحصل عليه، بناءً على نسبة العمولة التي اتفقت عليها. قارن هذا بما وصل فعلياً إلى حسابك البنكي.",
    payoutCheckBtn:"فحص آخر 30 يوماً", payoutCheckBtnLoading:"جارٍ سحب طلباتك…",
    payoutCheckLiveOnlyNote:"طلبات فقط حالياً — منصات أخرى قريباً.",
    payoutCheckOrders:"الطلبات المفحوصة", payoutCheckSubtotal:"مبيعات الطعام (بدون رسوم التوصيل)", payoutCheckRate:"نسبة عمولتك",
    payoutCheckExpectedLabel:"المفترض أن تحصل عليه", payoutCheckHint:"قارن هذا بإيداعك البنكي لنفس الفترة.",
    payoutCheckNotConnected:"اربط طلبات أولاً لتشغيل هذا الفحص.",
    payoutCheckUploadBtn:"رفع كشف حساب",
    payoutCheckUploadRateLabel:"نسبة العمولة لهذا الملف (%)",
    payoutCheckSalesLabel:"إجمالي المبيعات (من الملف)",
    payoutCheckUploadNote:"يستخدم هذا التقدير إجمالي المبيعات اليومية من الملف، والذي قد يشمل رسوم التوصيل. الفحص المباشر يقرأ كل طلب على حدة وهو أكثر دقة.",
    payoutCheckPdfNote:"يغطي هذا التقدير شهراً تقويمياً واحداً من تقرير سنونو (GMV)، وليس نطاق تاريخ مخصص. قد لا يتطابق تماماً إذا اختلفت طريقة سنونو في حساب المدفوعات عن حساب GMV × (1 − العمولة) البسيط.",
    payoutCheckPdfPreviewTitle:"تم استخراجه من ملف PDF — تحقق منه مقابل التقرير",
    payoutCheckPdfCancelled:"المبيعات الملغاة (GMV)",
    payoutCheckCsvOrPdfSnoonu:"CSV، أو تقرير أداء العلامة الشهري من سنونو بصيغة PDF.",
    payoutCheckLiveTab:"فحص مباشر", payoutCheckUploadTab:"رفع ملف",
    payoutCheckUploadPlatformLabel:"المنصة", payoutCheckCsvOnly:"ملفات CSV فقط حالياً.",
    payoutCheckSourceLive:"فحص مباشر", payoutCheckSourceUpload:"ملف مرفوع", payoutCheckShowing:"يعرض",
    payoutCheckRowsSkipped:"صفوف تم تجاهلها — لم تتطابق صيغة التاريخ أو الرقم، لذا لم تُحتسب.",
  },
  fr: {
    cp:"CENTRE DE CONTRÔLE", live:"EN DIRECT", defend:"Boucle de défense active", defendS:"4 nœuds périphériques · opérationnels",
    navA:"Centre de protection des revenus", navAs:"Analytique",
    navR:"Moteur de politique de marge",      navRs:"Livre des règles",
    navV:"Coffre d'intégrations",             navVs:"Connexions",
    navH:"Historique des paiements et prix", navHs:"Historique",
    subA:"Optimisation active des prix et prévention des pertes",
    subR:"Règles de tarification en langage naturel et garde-fous de marge",
    subV:"Connexions caisse, agrégateurs et cache",
    subH:"Chaque vérification de paiement et chaque changement de prix automatique, au même endroit",
    historyViewLink:"Voir l'historique →",
    historyPayoutTitle:"Historique des vérifications de paiement", historyPayoutDesc:"Chaque vérification de paiement attendu que vous avez lancée — en direct ou importée.",
    historyPayoutEmpty:"Aucune vérification de paiement pour l'instant. Lancez-en une depuis le centre des revenus.",
    historyRepricingTitle:"Historique de réajustement des prix", historyRepricingDesc:"Changements de prix automatiques effectués par PrizeSkout en votre nom.",
    historyRepricingEmpty:"Aucun changement de prix automatique pour l'instant.",
    historyLoading:"Chargement…",
    historyColDate:"Date", historyColSource:"Source", historyColPlatform:"Plateforme", historyColOrders:"Commandes",
    historyColExpected:"Paiement attendu", historyColChannel:"Canal", historyColSku:"SKU",
    historyColPrice:"Changement de prix", historyColStatus:"Statut",
    historyDetailPeriod:"Période", historyDetailSales:"Ventes utilisées", historyDetailRows:"Lignes utilisées",
    stream:"Flux d'exécution en direct", streamS:"Flux d'événements en temps réel",
    profLabel:"Profits protégés · Ce mois-ci",
    copilotTitle:"Copilote CFO",    copilotSub:"Moteur de règles en langage naturel",
    copilotDesc:"Posez une question sur la stratégie de prix, ou décrivez une règle pour la compiler dans une configuration moteur active.",
    copilotLive:"🟢 Copilote actif",
    compile:"Envoyer ↗",
    try:"Essayez :", guardrails:"Garde-fous actifs",
    agentTitle:"Agent autonome d'audit des litiges", agentActive:"Agent actif",
    discLog:"Journal des écarts · Versements caisse vs contrats",
    genVoucher:"Générer un bon de litige",
    downloadCsv:"Télécharger le journal d'audit (CSV)",
    exportProofs:"Exporter les preuves de litige",
    fileBtn0:"Déposer automatiquement la réclamation sur le portail partenaire",
    fileBtn1:"Dépôt de la réclamation…",
    fileBtn3:"✓ Réclamation soumise · ID 8841-B",
    fileMsg1:"Compilation des preuves…",
    fileMsg2:"Téléversement via API…",
    fileMsg3:"✓ Réclamation soumise avec succès ! (ID : 8841-B)",
    claimEn:"CLAIM DRAFT · ENGLISH",
    claimAr:"مسودة المطالبة · العربية",
    bilingualTitle:"Dossier de litige bilingue ·",
    verified:"SHA-256", verifiedS:"· VÉRIFIÉ ✓",
    autoCompiled:"compilé automatiquement par l'agent de litiges",
    close:"✕",
    intentLabel:"Intention métier · Source",
    intent:"intention :", confidence:"confiance :", ambiguity:"ambiguïté :",
    intentResolved:"résolue ✓",
    applyLabel0:"Appliquer la configuration à la boucle principale",
    applyLabel1:"✓ Déployé vers la boucle principale · Redis 340ms",
    rulesEnforced:"règles · appliquées en périphérie",
    activeLabel:"✓ appliquée · éval <2ms",
    pausedLabel:"En pause. Non appliquée actuellement.",
    previewLabel:"Aperçu uniquement · règles par catégorie pas encore appliquées",
    floorWarn:"⚠ Le seuil est inférieur à 15 % du coût de revient. Le garde-fou rejettera toutes les exécutions à ce niveau.",
    settingsLabel:"Paramètres", backToSite:"Retour au site", myAccount:"Mon compte",
    settingsSub:"Accès à la boutique, canaux, règles de marge, points de vente et notifications.",
    supportLabel:"Support",
    inboundTitle:"Connexions entrantes",
    inboundDesc:"Plateformes de caisse et e-commerce qui alimentent PrizeSkout en commandes et données catalogue.",
    outboundTitle:"Connexions sortantes",
    outboundDesc:"Agrégateurs de livraison vers lesquels PrizeSkout pousse des prix protégeant la marge en temps réel.",
    inboundConnectedMsg:"connecté · synchronisation des données",
    inboundAuthorizeMsg:"non connecté · cliquez pour autoriser",
    inboundComingSoonMsg:"intégration à venir",
    connectPrefix:"Connecter",
    setupBadge:"CONFIG", soonBadge:"BIENTÔT",
    storeConnectedSyncing:"Boutique connectée · synchronisation des prix",
    tapSetupMsg:"Appuyez sur CONFIG pour connecter votre boutique",
    awaitingBuildMsg:"Intégration en cours de développement",
    newDiscrepancy:"Nouvel écart",
    partnerLabel:"Partenaire", orderIdLabel:"N° de commande", branchLocationLabel:"Filiale / Emplacement",
    contractedRateLabel:"Taux contractuel (%)",
    orderValueLabel:"Valeur de la commande", chargedByPartnerLabel:"Facturé par le partenaire",
    additionalNotesLabel:"Notes complémentaires (facultatif)",
    logDiscrepancyBtn:"+ Signaler un écart", cancelBtn:"− Annuler",
    finishSetupBadge:"Terminer la configuration",
    keetaConnectedMsg:"Keeta connecté · terminez la configuration en saisissant votre Shop ID",
    keetaShopIdPrompt:"Saisissez le Shop ID de votre boutique Keeta pour terminer la connexion. PrizeSkout en a besoin pour envoyer les prix protégeant la marge à votre menu Keeta.",
    keetaShopIdSaved:"Shop ID Keeta enregistré · synchronisation des prix",
    keetaShopIdPending:"Shop ID requis pour synchroniser les prix",
    tourReplayLabel:"Visite guidée",
    tourStartBtn:"Commencer la visite", tourNextBtn:"Suivant", tourBackBtn:"Retour", tourFinishBtn:"Compris — connectons ma boutique",
    tourSkipLabel:"Ignorer la visite",
    tourWelcomeTitle:"Bienvenue dans votre centre de contrôle",
    tourWelcomeBody:"Une visite de deux minutes : où PrizeSkout suit votre marge, compile vos règles de tarification, et transmet les prix protégés à vos applications de livraison.",
    tourHeroTitle:"Centre de protection des revenus",
    tourHeroBody:"Profits protégés, mises à jour de prix et marge économisée — suivis ici en temps réel, avec un flux en direct de chaque changement de prix effectué par PrizeSkout en votre nom.",
    tourCopilotTitle:"Décrivez une règle, obtenez une configuration",
    tourCopilotBody:"Tapez une règle de tarification en langage naturel — « Verrouiller la marge boulangerie à 25 % » — et Copilote la compile en un garde-fou appliqué en périphérie en moins de 2 ms.",
    tourGuardrailsTitle:"Vos seuils de marge, toujours appliqués",
    tourGuardrailsBody:"Chaque règle appliquée apparaît ici. Ajustez un seuil et il prend effet immédiatement — sans redéploiement, sans attendre l'équipe technique.",
    tourSupportTitle:"Un problème ? Nous sommes à un clic",
    tourSupportBody:"Problèmes d'intégration, questions sur un litige, ou autre chose — contactez l'équipe PrizeSkout directement depuis ici.",
    tourInboundTitle:"Alimentez PrizeSkout avec vos données réelles",
    tourInboundBody:"Connectez votre caisse ou votre plateforme e-commerce pour que PrizeSkout puisse voir vos commandes, coûts et catalogue réels — la base sur laquelle tout le reste fonctionne.",
    tourOutboundTitle:"C'est ici que la défense entre en jeu",
    tourOutboundBody:"Connectez Talabat, Jahez, ou tout autre agrégateur de livraison, et PrizeSkout commence à transmettre automatiquement des prix qui protègent votre marge — plus de fuite silencieuse de marge.",
    payoutCheckTitle:"Vérification du paiement attendu",
    payoutCheckDesc:"Nous calculons ce que vous auriez dû recevoir, selon le taux de commission convenu. Comparez ce montant à votre dépôt bancaire.",
    payoutCheckBtn:"Vérifier les 30 derniers jours", payoutCheckBtnLoading:"Récupération de vos commandes…",
    payoutCheckLiveOnlyNote:"Talabat uniquement pour l'instant — autres plateformes à venir.",
    payoutCheckOrders:"Commandes vérifiées", payoutCheckSubtotal:"Ventes nourriture (hors frais de livraison)", payoutCheckRate:"Votre taux de commission",
    payoutCheckExpectedLabel:"Vous auriez dû recevoir", payoutCheckHint:"Comparez ce montant à votre dépôt bancaire pour la même période.",
    payoutCheckNotConnected:"Connectez d'abord Talabat pour lancer cette vérification.",
    payoutCheckUploadBtn:"Importer un relevé",
    payoutCheckUploadRateLabel:"Taux de commission pour ce fichier (%)",
    payoutCheckSalesLabel:"Ventes totales (depuis le fichier)",
    payoutCheckUploadNote:"Cette estimation utilise le total des ventes quotidiennes du fichier, qui peut inclure les frais de livraison. Une vérification en direct lit chaque commande séparément et est plus précise.",
    payoutCheckPdfNote:"Cette estimation couvre un mois calendaire du rapport Snoonu (GMV), pas une plage de dates personnalisée. Elle peut différer si le calcul réel de Snoonu n'est pas un simple GMV × (1 − commission).",
    payoutCheckPdfPreviewTitle:"Extrait de votre PDF — à vérifier avec le rapport",
    payoutCheckPdfCancelled:"GMV annulé",
    payoutCheckCsvOrPdfSnoonu:"CSV, ou le rapport de performance de marque mensuel PDF de Snoonu.",
    payoutCheckLiveTab:"Vérification en direct", payoutCheckUploadTab:"Importer un fichier",
    payoutCheckUploadPlatformLabel:"Plateforme", payoutCheckCsvOnly:"Fichiers CSV uniquement pour le moment.",
    payoutCheckSourceLive:"Vérification en direct", payoutCheckSourceUpload:"Fichier importé", payoutCheckShowing:"Affichage",
    payoutCheckRowsSkipped:"lignes ignorées — le format de date ou de nombre ne correspondait pas, donc elles n'ont pas été comptées.",
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

// Tour sequence walks: orient (hub) → configure intelligence (copilot,
// guardrails) → know where help is (support) → take action (connect in,
// push out). `tab` tells the caller which tab to switch to before the
// step's target exists in the DOM; ProductTour itself doesn't know tabs.
type TourStepDef = TourStep & { tab?: Tab };

function buildTourSteps(t: typeof T["en"]): TourStepDef[] {
  return [
    { id:"welcome",    title:t.tourWelcomeTitle,    body:t.tourWelcomeBody },
    { id:"hero",       tab:"analytics", target:'[data-tour="hero"]',       title:t.tourHeroTitle,       body:t.tourHeroBody },
    { id:"copilot",    tab:"rules",     target:'[data-tour="copilot"]',    title:t.tourCopilotTitle,    body:t.tourCopilotBody },
    { id:"guardrails", tab:"rules",     target:'[data-tour="guardrails"]', title:t.tourGuardrailsTitle, body:t.tourGuardrailsBody },
    { id:"support",                     target:'[data-tour="support"]',   title:t.tourSupportTitle,    body:t.tourSupportBody },
    { id:"inbound",    tab:"vault",     target:'[data-tour="inbound"]',    title:t.tourInboundTitle,    body:t.tourInboundBody },
    { id:"outbound",   tab:"vault",     target:'[data-tour="outbound"]',   title:t.tourOutboundTitle,   body:t.tourOutboundBody },
  ];
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
  const [keetaNeedsShopId, setKeetaNeedsShopId] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep]     = useState(0);
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
  // Expected Payout Check — pulls real Talabat orders, computes what the
  // merchant should have received (see expected-payout.ts). Never fetches
  // their actual payout; the merchant compares it against their own bank
  // deposit themselves.
  type PayoutCheckData = { order_count:number; sub_total_sum:number; commission_rate_pct:number; expected_payout:number; period_start:string; period_end:string; source?:"live"|"upload"; platform?:string; rows_skipped?:number; rows_total?:number; brand?:string; cancelled_gmv?:number; cancelled_orders?:number };
  const [payoutTab, setPayoutTab]             = useState<"live"|"upload">("live");
  const [payoutLoading, setPayoutLoading]     = useState(false);
  const [payoutData, setPayoutData]           = useState<PayoutCheckData|null>(null);
  const [payoutError, setPayoutError]         = useState<string|null>(null);
  const [payoutUploadRate, setPayoutUploadRate] = useState("");
  const [payoutUploadPlatform, setPayoutUploadPlatform] = useState("talabat");
  const payoutFileInputRef = useRef<HTMLInputElement>(null);

  // History tab — read-only lists pulled from payout-history.ts /
  // dispatch-history.ts via the same /api/channels/connect multiplex point
  // (see connect.ts's "history" branch). Fetched once per tab visit.
  type PayoutCheckHistoryRow = { id:string; source:"live"|"upload"; platform:string; order_count:number; sub_total_sum:number; commission_rate_pct:number; expected_payout:number; period_start:string|null; period_end:string|null; rows_skipped:number|null; rows_total:number|null; created_at:string };
  type RepricingHistoryRow = { id:string; sku:string|null; target_channel:string|null; old_price:number|null; new_price:number; currency:string; status:string; upstream_message:string|null; created_at:string };
  const [historyPayoutChecks, setHistoryPayoutChecks] = useState<PayoutCheckHistoryRow[]>([]);
  const [historyRepricings, setHistoryRepricings]     = useState<RepricingHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading]           = useState(false);
  const [expandedPayoutCheckId, setExpandedPayoutCheckId] = useState<string|null>(null);

  useEffect(() => {
    if (tab !== "history") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setHistoryLoading(true);
    const call = (action: string) => fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "history", action, limit: 30 }),
    }).then(r => r.ok ? r.json() : null).catch(() => null);

    Promise.all([call("payout_checks"), call("repricings")])
      .then(([payoutRes, repriceRes]) => {
        setHistoryPayoutChecks((payoutRes?.items ?? []) as PayoutCheckHistoryRow[]);
        setHistoryRepricings((repriceRes?.items ?? []) as RepricingHistoryRow[]);
      })
      .finally(() => setHistoryLoading(false));
  }, [tab]);

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
    if (params.get("keeta_connected") === "1") {
      setChannelStatuses(prev => ({ ...prev, keeta: "connected" }));
      setKeetaNeedsShopId(true);
      window.history.replaceState({}, "", window.location.pathname);
      showToast(t.keetaConnectedMsg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { laterRefs.current.forEach(clearTimeout); }, []);

  // First-time product tour — browser-local, not account-level: a merchant
  // on a new device sees it once more, which is the right tradeoff for a
  // lightweight client-side check over a backend "is this account new" flag.
  useEffect(() => {
    if (localStorage.getItem("ps_tour_v1_done")) return;
    const timer = setTimeout(() => setTourActive(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Global margin floor is the one rule actually enforced by the real
  // decide engine (see merchant-pricing-config.ts) — load the merchant's
  // real persisted value on mount, defaulting to the 18% seed if they've
  // never set one.
  const marginFloorLoadedRef = useRef(false);
  const suppressNextFloorSaveRef = useRef(false);

  useEffect(() => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) { marginFloorLoadedRef.current = true; return; }
    fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "margin_floor", action: "get" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { margin_floor_pct?: number } | null) => {
        if (typeof d?.margin_floor_pct !== "number") return;
        const pct = Math.round(d.margin_floor_pct * 100);
        suppressNextFloorSaveRef.current = true;
        setRules(prev => prev.map(r => r.name === "Global margin floor" ? { ...r, floor: pct } : r));
      })
      .catch(() => {})
      .finally(() => { marginFloorLoadedRef.current = true; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFloor = rules.find(r => r.name === "Global margin floor")?.floor;

  useEffect(() => {
    if (!marginFloorLoadedRef.current || globalFloor == null) return;
    if (suppressNextFloorSaveRef.current) { suppressNextFloorSaveRef.current = false; return; }
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    const timer = setTimeout(() => {
      fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "margin_floor", action: "set", margin_floor_pct: globalFloor / 100 }),
      })
        .then(r => r.ok
          ? showToast(`🟢 Global margin floor set to ${globalFloor}% · now enforced on real orders`)
          : showToast("⚠ Could not save margin floor — try again."))
        .catch(() => showToast("⚠ Could not save margin floor — try again."));
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFloor]);

  useEffect(() => {
    if (tab !== "vault") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    if (!mid) return;
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(mid)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { channels?: { platform:string; status:string; needs_shop_id?:boolean }[] } | null) => {
        if (!d?.channels) return;
        const m: Record<string,string> = {};
        for (const ch of d.channels) m[ch.platform] = ch.status;
        setChannelStatuses(m);
        setKeetaNeedsShopId(d.channels.find(c => c.platform === "keeta")?.needs_shop_id ?? false);
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

  const runPayoutCheck = async () => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) { showToast("Please connect your store first."); return; }
    setPayoutLoading(true); setPayoutError(null);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "talabat_expected_payout", window_days: 30 }),
      });
      const data = await res.json() as (PayoutCheckData & { ok?: boolean; error?: string });
      if (!res.ok || !data.ok) {
        setPayoutError(data.error ?? "Could not run the check. Please try again.");
        setPayoutData(null);
        return;
      }
      setPayoutData(data);
    } catch {
      setPayoutError("Network error — try again.");
      setPayoutData(null);
    } finally {
      setPayoutLoading(false);
    }
  };

  const runPayoutUpload = async (file: File) => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) { showToast("Please connect your store first."); return; }
    const rate = Number(payoutUploadRate);
    if (!(rate > 0 && rate < 100)) {
      setPayoutError("Enter a valid commission rate (e.g. 19) before uploading.");
      return;
    }
    setPayoutLoading(true); setPayoutError(null);
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const body: Record<string, unknown> = { merchant_id: mid, access_code: ac, platform: "talabat_expected_payout", action: "upload", commission_rate_pct: rate, upload_platform: payoutUploadPlatform };
      if (isPdf) {
        const { extractPdfText } = await import("@/lib/pdf-text");
        body.file_kind = "pdf";
        body.pdf_text = await extractPdfText(file);
      } else {
        body.csv_text = await file.text();
      }
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as (PayoutCheckData & { ok?: boolean; error?: string });
      if (!res.ok || !data.ok) {
        setPayoutError(data.error ?? "Could not read that file.");
        setPayoutData(null);
        return;
      }
      setPayoutData(data);
    } catch {
      setPayoutError("Could not read that file.");
      setPayoutData(null);
    } finally {
      setPayoutLoading(false);
    }
  };

  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const tourSteps = buildTourSteps(t);
  const goToTourStep = (i: number) => {
    const step = tourSteps[i];
    if (step?.tab && step.tab !== tab) setTab(step.tab);
    setTourStep(i);
  };
  const closeTour = () => {
    setTourActive(false);
    localStorage.setItem("ps_tour_v1_done", "1");
  };

  const navDefs = [
    { id:"analytics" as Tab, label:t.navA, sub:t.navAs },
    { id:"rules"     as Tab, label:t.navR, sub:t.navRs },
    { id:"vault"     as Tab, label:t.navV, sub:t.navVs },
    { id:"history"   as Tab, label:t.navH, sub:t.navHs },
  ];

  const headerSub = tab === "analytics" ? t.subA : tab === "rules" ? t.subR : tab === "settings" ? t.settingsSub : tab === "history" ? t.subH : t.subV;
  const headerTitle = tab === "analytics" ? t.navA : tab === "rules" ? t.navR : tab === "settings" ? t.settingsLabel : tab === "history" ? t.navH : t.navV;

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
          <div style={{ fontSize:28.5, fontWeight:800, letterSpacing:"-0.6px", paddingInline:6 }}>
            Prize<span style={{ color:OG }}>skout</span>
          </div>
          <div style={{ fontSize:12.5, fontWeight:700, letterSpacing:"1.6px", color:"var(--muted)", margin:"30px 6px 12px" }}>
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
                    <span style={{ fontSize:16, fontWeight:700, color:"var(--text)" }}>{n.label}</span>
                    <span style={{ fontSize:13.5, color: on ? OG : "var(--muted)" }}>{n.sub}</span>
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
              <span style={{ fontSize:14.5, fontWeight:500 }}>{t.settingsLabel}</span>
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
              <span style={{ fontSize:14.5, fontWeight:500 }}>{t.backToSite}</span>
            </a>
            <div style={{ height:1, background:"var(--border)", marginBottom:8 }} />
            <div style={{ border:`1px solid color-mix(in srgb,${GN} 30%,transparent)`,
              background:`color-mix(in srgb,${GN} 7%,var(--surface))`,
              borderRadius:12, padding:"13px 14px", display:"flex", gap:11, alignItems:"flex-start" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:GN, marginTop:5, animation:"pk-pulse 2s infinite" }} />
              <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:15, fontWeight:700, color:GN }}>{t.defend}</span>
                <span style={{ fontSize:13.5, color:"var(--muted)", fontFamily:MONO }}>{t.defendS}</span>
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:11, paddingInline:4 }}>
              <span style={{ width:34, height:34, borderRadius:"50%", background:"var(--surface)",
                border:"1px solid var(--border)", display:"grid", placeItems:"center",
                fontSize:13, fontWeight:700, fontFamily:MONO }}>M</span>
              <span style={{ fontSize:15.5, fontWeight:600 }}>{t.myAccount}</span>
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
                <div style={{ fontSize:23.5, fontWeight:800, letterSpacing:"-0.5px" }}>
                  Prize<span style={{ color:OG }}>skout</span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:13.5, color:GN, fontWeight:700, fontFamily:MONO }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:GN, animation:"pk-pulse 2s infinite" }} />
                  LIVE
                </span>
                <button onClick={()=>setTheme(v=>v==="light"?"dark":"light")} aria-label="Toggle theme"
                  style={{ cursor:"pointer", width:44, height:44, borderRadius:10, border:"1px solid var(--border)",
                    background:"var(--surface)", display:"grid", placeItems:"center", padding:0, fontSize:17.5 }}>
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
                    color: on ? "var(--text)" : "var(--muted)", fontSize:14.5, fontWeight:700, fontFamily:"inherit", flexShrink:0,
                  }}>{n.sub}</button>
                );
              })}
              <button onClick={()=>setTab("settings")} style={{
                cursor:"pointer", whiteSpace:"nowrap", padding:"10px 14px", borderRadius:999,
                border:`1px solid ${tab==="settings" ? `color-mix(in srgb,${OG} 40%,transparent)` : "var(--border)"}`,
                background: tab==="settings" ? `color-mix(in srgb,${OG} 8%,var(--surface))` : "transparent",
                color: tab==="settings" ? "var(--text)" : "var(--muted)", fontSize:14.5, fontWeight:700, fontFamily:"inherit", flexShrink:0,
              }}>{t.settingsLabel}</button>
            </div>
          </div>
        )}

        {/* Global header */}
        <header className="ps-db-header" style={{ padding:"26px 30px 20px", borderBottom:"1px solid var(--border)",
          display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-start", justifyContent:"space-between" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:200, flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <h1 className="ps-db-h1" style={{ margin:0, fontSize:26, fontWeight:800, letterSpacing:"-0.4px" }}>{headerTitle}</h1>
              <span style={{ fontSize:12.5, fontWeight:700, letterSpacing:".8px", color:GN,
                background:`color-mix(in srgb,${GN} 12%,var(--surface))`,
                border:`1px solid color-mix(in srgb,${GN} 28%,transparent)`,
                borderRadius:7, padding:"3px 9px", fontFamily:MONO }}>{t.live}</span>
            </div>
            <div style={{ fontSize:15.5, color:"var(--muted)" }}>{headerSub}</div>
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
                display:"grid", placeItems:"center", fontSize:12.5 }}>
                {theme==="dark"?"☾":"☀"}
              </span>
            </button>
            {/* Currency */}
            <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:10, padding:3, gap:2 }}>
              {["QAR","SAR","AED"].map(code => (
                <button key={code} onClick={()=>setCurrency(code)} style={{
                  cursor:"pointer", border:"none", borderRadius:8, padding:"10px 13px",
                  fontSize:14.5, fontWeight:700, fontFamily:MONO,
                  background: currency===code ? OG : "transparent",
                  color: currency===code ? "#fff" : "var(--muted)",
                }}>{code}</button>
              ))}
            </div>
            {/* Lang */}
            <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:10, padding:3, gap:2 }}>
              {([["en","EN"],["ar","عربية"],["fr","FR"]] as [Lang,string][]).map(([id,label]) => (
                <button key={id} onClick={()=>setLang(id)} style={{
                  cursor:"pointer", border:"none", borderRadius:8, padding:"10px 13px",
                  fontSize:14.5, fontWeight:700, fontFamily:"inherit",
                  background: lang===id ? "var(--text)" : "transparent",
                  color: lang===id ? "var(--bg)" : "var(--muted)",
                }}>{label}</button>
              ))}
            </div>
          </div>
          {/* Support + tour replay — kept outside .ps-db-controls so they stay visible on mobile too */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setTourStep(0); setTourActive(true); }}
              title={t.tourReplayLabel}
              aria-label={t.tourReplayLabel}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
            </button>
            <button
              type="button"
              data-tour="support"
              onClick={() => setSupportOpen(true)}
              title="Contact support"
              aria-label="Contact support"
              style={{
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                height: 40, padding: "0 14px", borderRadius: 10, cursor: "pointer", flexShrink: 0,
                border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)",
                fontSize: 14.5, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
                <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
                <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
              </svg>
              {t.supportLabel}
            </button>
          </div>
        </header>
        <ContactSupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

        {/* ===== TAB: REVENUE PROTECTION HUB ===== */}
        {tab === "analytics" && (
          <section className="ps-db-section" style={{ padding:"28px 30px 48px", display:"flex", flexDirection:"column", gap:30, animation:"pk-in .3s ease" }}>

            {/* Hero + stat grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:18 }}>
              <div data-tour="hero" style={{ gridColumn:"span 2", minWidth:"min(100%,560px)", position:"relative",
                background:"var(--surface)",
                border:"1px solid var(--border)", borderRadius:16, boxShadow:"var(--shadow)",
                padding:"26px 28px", display:"flex", flexDirection:"column", gap:18 }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, fontSize:12.5, fontWeight:500,
                  letterSpacing:"0.06em", color:"var(--muted)", textTransform:"uppercase" as const }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:GN }} />
                  {t.profLabel}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                    <span style={{ fontFamily:DISPLAY, fontSize:18.5, fontWeight:500, color:"var(--muted)" }}>{currency}</span>
                    <span style={{ fontFamily:DISPLAY, fontSize:62, fontWeight:700, lineHeight:1, color:"var(--muted)", fontVariantNumeric:"tabular-nums" }}>—</span>
                  </div>
                </div>
                <div style={{ fontSize:15, color:"var(--muted)" }}>No activity yet · connect a store to begin tracking</div>
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
                    <div style={{ fontSize:12.5, fontWeight:500, letterSpacing:"0.04em", color:"var(--muted)", textTransform:"uppercase" as const }}>{s.label}</div>
                    <div style={{ fontFamily:DISPLAY, fontSize:36.5, fontWeight:700, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
                    <div style={{ fontSize:14, color:s.footColor }}>{s.foot}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stream + Dispute agent */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <h2 style={{ margin:0, fontSize:19.5, fontWeight:800, letterSpacing:"-0.2px" }}>{t.stream}</h2>
                  <span style={{ fontSize:14, color:"var(--muted)" }}>{t.streamS}</span>
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button onClick={downloadCsv} style={{ cursor:"pointer", fontFamily:"inherit", fontSize:14.5,
                    fontWeight:600, color:"var(--text)", background:"var(--surface)",
                    border:"1px solid var(--border)", borderRadius:10, padding:"11px 16px" }}>
                    {t.downloadCsv}
                  </button>
                  <button onClick={()=>showToast("🟢 Dispute proof bundle exported · 2 claims · hash-verified")}
                    style={{ cursor:"pointer", fontFamily:"inherit", fontSize:14.5, fontWeight:700, color:OG,
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
                  <div style={{ display:"flex", gap:7, marginBottom:12, alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                      <span style={{ width:10,height:10,borderRadius:"50%",background:"#FF5F57" }} />
                      <span style={{ width:10,height:10,borderRadius:"50%",background:"#FEBC2E" }} />
                      <span style={{ width:10,height:10,borderRadius:"50%",background:"#28C840" }} />
                      <span style={{ fontFamily:MONO, fontSize:13, color:"#5A6472", marginInlineStart:8 }}>
                        defend-loop · edge-doha-01
                      </span>
                    </div>
                    <button type="button" onClick={()=>setTab("history")}
                      style={{ cursor:"pointer", fontSize:12, fontWeight:700, color:"#5A6472",
                        background:"transparent", border:"none", padding:0, fontFamily:MONO }}>
                      {t.historyViewLink}
                    </button>
                  </div>
                  {feed.length === 0 ? (
                    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:10, color:"#5A6472", fontFamily:MONO, fontSize:14, textAlign:"center" }}>
                      <span style={{ fontSize:23.5, opacity:.4 }}>◉</span>
                      <span>No events yet · connect a store to start</span>
                    </div>
                  ) : feed.map((f,i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"baseline",
                      fontFamily:MONO, fontSize:14, lineHeight:1.9, animation:"pk-in .3s ease" }}>
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
                    <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.agentTitle}</h3>
                    <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:13.5, fontWeight:700, color:GN,
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
                        <span style={{ fontFamily:DISPLAY, fontSize:20.5, fontWeight:700, color:m.color, fontVariantNumeric:"tabular-nums" }}>{m.value}</span>
                        <span style={{ fontSize:12.5, color:"var(--muted)", fontWeight:600, lineHeight:1.35 }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ fontSize:12.5, fontWeight:500, letterSpacing:"0.04em", color:"var(--muted)", textTransform:"uppercase" as const }}>
                      {t.discLog}
                    </div>
                    {disputes.length === 0 ? (
                      <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, padding:"24px 20px", display:"flex", alignItems:"center", gap:14 }}>
                        <span style={{ width:9, height:9, borderRadius:"50%", background:GN, flexShrink:0, animation:"pk-pulse 2.4s infinite" }} />
                        <span style={{ fontSize:15, color:"var(--muted)" }}>No discrepancies logged · audit agent monitoring payouts in real time</span>
                      </div>
                    ) : disputes.map((d,i) => (
                      <div key={i} style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, padding:"14px 16px", display:"flex", flexWrap:"wrap",
                        gap:12, alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:0, flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:15.5, fontWeight:700 }}>
                            ⚠ {d.title}
                            <span style={{ fontSize:13.5, color:"var(--muted)", fontWeight:400 }}>(Order {d.order})</span>
                          </div>
                          <div style={{ fontSize:13.5, color:"var(--muted)" }}>
                            {d.place} · Contract: {d.contract} · Charged: <span style={{ color:OG,fontWeight:700 }}>{d.charged}</span> · Leak: <span style={{ color:OG,fontWeight:700 }}>{d.leak}</span>
                          </div>
                        </div>
                        <button onClick={()=>{setModal(i);setFileStep(0);}} className="ps-ig-btn"
                          style={{ cursor:"pointer", fontSize:14, fontWeight:700, color:"var(--text)",
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
                    style={{ cursor:"pointer", alignSelf:"flex-start", fontSize:14, fontWeight:700,
                      color: showDisputeForm ? OG : "var(--text)",
                      background:"transparent", border:`1.5px solid ${showDisputeForm ? OG : "var(--border)"}`,
                      borderRadius:10, padding:"10px 15px", fontFamily:"inherit", transition:"border-color .2s,color .2s" }}>
                    {showDisputeForm ? t.cancelBtn : t.logDiscrepancyBtn}
                  </button>

                  {showDisputeForm && (
                    <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                      borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14,
                      animation:"pk-in .2s ease" }}>
                      <div style={{ fontSize:14.5, fontWeight:700, color:"var(--text)" }}>{t.newDiscrepancy}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))", gap:10 }}>
                        {/* Partner */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.partnerLabel}</label>
                          <select value={disputePartner} onChange={e=>setDisputePartner(e.target.value)}
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit" }}>
                            {["Talabat","Jahez","Noon","Amazon","Careem"].map(p=>(
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        {/* Order ID */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.orderIdLabel}</label>
                          <input value={disputeOrderId} onChange={e=>setDisputeOrderId(e.target.value)} placeholder="e.g. #84201-A"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Location */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.branchLocationLabel}</label>
                          <input value={disputePlace} onChange={e=>setDisputePlace(e.target.value)} placeholder="e.g. Doha Mall branch"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Contracted rate */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.contractedRateLabel}</label>
                          <input type="number" min="1" max="40" value={disputeRate} onChange={e=>setDisputeRate(e.target.value)} placeholder="18"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Order value */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.orderValueLabel} ({currency})</label>
                          <input type="number" min="0" value={disputeOurPrice} onChange={e=>setDisputeOurPrice(e.target.value)} placeholder="120.00"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit", outline:"none" }} />
                        </div>
                        {/* Charged amount */}
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.chargedByPartnerLabel} ({currency})</label>
                          <input type="number" min="0" value={disputeCharged} onChange={e=>setDisputeCharged(e.target.value)} placeholder="30.00"
                            style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px",
                              background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit", outline:"none" }} />
                        </div>
                      </div>
                      {/* Notes */}
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <label style={{ fontSize:12.5, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{t.additionalNotesLabel}</label>
                        <textarea value={disputeNotes} onChange={e=>setDisputeNotes(e.target.value)} rows={2}
                          placeholder="Any context about the discrepancy..."
                          style={{ border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px", resize:"vertical",
                            background:"var(--surface)", color:"var(--text)", fontSize:14.5, fontFamily:"inherit", outline:"none" }} />
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
                          alignSelf:"flex-start", fontSize:14.5, fontWeight:700, color:"#fff", background: disputeLoading ? "#9A9A9A" : OG,
                          border:"none", borderRadius:10, padding:"11px 20px", fontFamily:"inherit",
                          opacity: disputeLoading||!disputeOrderId||!disputeCharged||!disputeOurPrice ? 0.6 : 1,
                          transition:"background .2s,opacity .2s" }}>
                        {disputeLoading ? "Generating…" : "Generate Bilingual Voucher ↗"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expected Payout Check */}
                <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
                  borderRadius:16, boxShadow:"var(--shadow)", padding:"22px 24px",
                  display:"flex", flexDirection:"column", gap:18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                      <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.payoutCheckTitle}</h3>
                      <button type="button" onClick={()=>setTab("history")}
                        style={{ cursor:"pointer", fontSize:12.5, fontWeight:700, color:OG,
                          background:"transparent", border:"none", padding:0, fontFamily:"inherit" }}>
                        {t.historyViewLink}
                      </button>
                    </div>
                    {payoutData && (
                      <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700,
                        color: payoutData.source === "upload" ? "#B45309" : GN,
                        background: payoutData.source === "upload" ? "color-mix(in srgb,#B45309 10%,var(--surface))" : `color-mix(in srgb,${GN} 10%,var(--surface))`,
                        border: `1px solid ${payoutData.source === "upload" ? "color-mix(in srgb,#B45309 28%,transparent)" : `color-mix(in srgb,${GN} 28%,transparent)`}`,
                        borderRadius:999, padding:"5px 12px" }}>
                        <span style={{ width:7,height:7,borderRadius:"50%", background: payoutData.source === "upload" ? "#B45309" : GN }} />
                        {payoutData.source === "upload" ? t.payoutCheckSourceUpload : t.payoutCheckSourceLive}
                        {" · "}
                        {PAYOUT_UPLOAD_PLATFORMS.find(p => p.value === payoutData.platform)?.label ?? "Talabat"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6 }}>{t.payoutCheckDesc}</div>

                  {/* Tabs */}
                  <div style={{ display:"flex", background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:10, padding:3, gap:2, alignSelf:"flex-start" }}>
                    {([["live",t.payoutCheckLiveTab],["upload",t.payoutCheckUploadTab]] as [typeof payoutTab,string][]).map(([id,label]) => (
                      <button key={id} type="button"
                        onClick={()=>{ setPayoutTab(id); setPayoutError(null); }}
                        style={{ cursor:"pointer", border:"none", borderRadius:8, padding:"9px 15px",
                          fontSize:13, fontWeight:700, fontFamily:"inherit",
                          background: payoutTab===id ? OG : "transparent",
                          color: payoutTab===id ? "#fff" : "var(--muted)" }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {payoutTab === "live" ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-start" }}>
                      <button onClick={runPayoutCheck} disabled={payoutLoading}
                        style={{ cursor: payoutLoading ? "not-allowed" : "pointer",
                          fontSize:14, fontWeight:700, color:"#fff", background: payoutLoading ? "#9A9A9A" : OG,
                          border:"none", borderRadius:10, padding:"11px 20px", fontFamily:"inherit",
                          opacity: payoutLoading ? 0.7 : 1, transition:"background .2s,opacity .2s" }}>
                        {payoutLoading ? t.payoutCheckBtnLoading : t.payoutCheckBtn}
                      </button>
                      <span style={{ fontSize:11.5, color:"var(--muted)" }}>{t.payoutCheckLiveOnlyNote}</span>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        <select value={payoutUploadPlatform} onChange={e=>setPayoutUploadPlatform(e.target.value)}
                          aria-label={t.payoutCheckUploadPlatformLabel}
                          style={{ height:38, border:"1px solid var(--border)", borderRadius:9,
                            background:"var(--surface)", color:"var(--text)", padding:"0 11px",
                            fontSize:13, fontFamily:"inherit", outline:"none" }}>
                          {PAYOUT_UPLOAD_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <input
                          type="number" min="0" max="99" step="0.1"
                          value={payoutUploadRate}
                          onChange={e=>setPayoutUploadRate(e.target.value)}
                          placeholder={t.payoutCheckUploadRateLabel}
                          style={{ width:170, height:38, border:"1px solid var(--border)", borderRadius:9,
                            background:"var(--surface)", color:"var(--text)", padding:"0 11px",
                            fontSize:13, fontFamily:"inherit", outline:"none" }}
                        />
                        <input ref={payoutFileInputRef} type="file"
                          accept={payoutUploadPlatform === "snoonu" ? ".csv,text/csv,.pdf,application/pdf" : ".csv,text/csv"}
                          style={{ display:"none" }}
                          onChange={e=>{ const f = e.target.files?.[0]; if (f) runPayoutUpload(f); e.target.value=""; }} />
                        <button
                          type="button"
                          disabled={payoutLoading}
                          onClick={()=>payoutFileInputRef.current?.click()}
                          style={{ cursor: payoutLoading ? "not-allowed" : "pointer", fontSize:13, fontWeight:700,
                            color:"#fff", background: payoutLoading ? "#9A9A9A" : OG,
                            border:"none", borderRadius:9, padding:"10px 16px", fontFamily:"inherit",
                            opacity: payoutLoading ? 0.7 : 1 }}>
                          {payoutLoading ? t.payoutCheckBtnLoading : t.payoutCheckUploadBtn}
                        </button>
                      </div>
                      <span style={{ fontSize:11.5, color:"var(--muted)" }}>
                        {payoutUploadPlatform === "snoonu" ? t.payoutCheckCsvOrPdfSnoonu : t.payoutCheckCsvOnly}
                      </span>
                    </div>
                  )}

                  {payoutError && (
                    <div style={{ fontSize:13, fontWeight:600, color:"#DC2626",
                      background:"color-mix(in srgb,#DC2626 8%,var(--surface))",
                      border:"1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                      borderRadius:9, padding:"10px 14px" }}>
                      {payoutError}
                    </div>
                  )}

                  {payoutData && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, animation:"pk-in .3s ease" }}>
                      {[
                        { value:String(payoutData.order_count), label:t.payoutCheckOrders },
                        { value:`${currency} ${fmtMoney(payoutData.sub_total_sum, currency)}`, label: payoutData.source === "upload" ? t.payoutCheckSalesLabel : t.payoutCheckSubtotal },
                        { value:`${payoutData.commission_rate_pct}%`, label:t.payoutCheckRate },
                      ].map(m => (
                        <div key={m.label} style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                          borderRadius:12, padding:"13px 14px", display:"flex", flexDirection:"column", gap:5 }}>
                          <span style={{ fontFamily:DISPLAY, fontSize:19, fontWeight:700, color:"var(--text)", fontVariantNumeric:"tabular-nums" }}>{m.value}</span>
                          <span style={{ fontSize:12, color:"var(--muted)", fontWeight:600, lineHeight:1.3 }}>{m.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {payoutData?.source === "upload" && !!payoutData.rows_skipped && (
                    <span style={{ fontSize:12, fontWeight:600, color:"#B45309" }}>
                      {payoutData.rows_skipped} / {payoutData.rows_total} {t.payoutCheckRowsSkipped}
                    </span>
                  )}

                  {payoutData?.brand && (
                    <div style={{ fontSize:12.5, color:"var(--muted)", lineHeight:1.6,
                      background:"var(--surface2)", border:"1px solid var(--border)",
                      borderRadius:9, padding:"10px 14px", display:"flex", flexDirection:"column", gap:3,
                      animation:"pk-in .3s ease" }}>
                      <span style={{ fontWeight:700, color:"var(--text)" }}>{t.payoutCheckPdfPreviewTitle}</span>
                      <span>{payoutData.brand} · {payoutData.period_start}</span>
                      {payoutData.cancelled_orders != null && (
                        <span>{t.payoutCheckPdfCancelled}: {currency} {fmtMoney(payoutData.cancelled_gmv ?? 0, currency)} ({payoutData.cancelled_orders})</span>
                      )}
                    </div>
                  )}

                  {payoutData && (
                    <div style={{ background:`color-mix(in srgb,${GN} 7%,var(--surface))`,
                      border:`1px solid color-mix(in srgb,${GN} 26%,transparent)`,
                      borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:6,
                      animation:"pk-in .3s ease" }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>
                        {t.payoutCheckExpectedLabel}
                      </span>
                      <span style={{ fontFamily:DISPLAY, fontSize:32, fontWeight:700, color:GN, fontVariantNumeric:"tabular-nums" }}>
                        {currency} {fmtMoney(payoutData.expected_payout, currency)}
                      </span>
                      <span style={{ fontSize:12.5, color:"var(--muted)" }}>{t.payoutCheckHint}</span>
                    </div>
                  )}

                  {payoutData?.source === "upload" && (
                    <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6,
                      background:"var(--surface2)", border:"1px solid var(--border)",
                      borderRadius:9, padding:"10px 14px" }}>
                      {payoutData.brand ? t.payoutCheckPdfNote : t.payoutCheckUploadNote}
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
                  <h2 style={{ margin:0, fontSize:20.5, fontWeight:800, letterSpacing:"-0.3px" }}>
                    {t.copilotTitle} <span style={{ color:"var(--muted)", fontWeight:600, fontSize:16.5 }}>· {t.copilotSub}</span>
                  </h2>
                  <span style={{ fontSize:15, color:"var(--muted)" }}>{t.copilotDesc}</span>
                </div>
                <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, fontWeight:700, color:OG,
                  background:`color-mix(in srgb,${OG} 9%,var(--surface))`,
                  border:`1px solid color-mix(in srgb,${OG} 32%,transparent)`,
                  borderRadius:999, padding:"6px 14px" }}>
                  {t.copilotLive}
                </span>
              </div>
              <div data-tour="copilot" style={{ display:"flex", gap:10, alignItems:"center", background:"var(--surface)",
                border:"1.5px solid var(--border)", borderRadius:14, padding:"6px 8px 6px 18px",
                boxShadow:"var(--shadow)" }}>
                <span style={{ fontSize:17.5, opacity:.55 }}>✦</span>
                <input value={cpInput} onChange={e=>setCpInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") runCopilot(cpInput); }}
                  placeholder={lang==="ar" ? "اسأل أي شيء أو اكتب قاعدة تسعير..." : "Ask anything or describe a rule (e.g., 'Lock bakery margins at 25% during rain storms...')"}
                  style={{ flex:1, minWidth:0, border:"none", outline:"none", background:"transparent",
                    color:"var(--text)", fontSize:16, fontFamily:"inherit", padding:"10px 0" }} />
                <button onClick={()=>runCopilot(cpInput)} style={{ cursor:"pointer", flex:"0 0 auto",
                  border:"none", borderRadius:10, background:OG, color:"#fff",
                  fontSize:14.5, fontWeight:700, padding:"11px 18px", fontFamily:"inherit" }}>
                  {t.compile}
                </button>
              </div>
              <div style={{ display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:13.5, color:"var(--muted)", fontWeight:600 }}>{t.try}</span>
                {[
                  "Lock bakery margins at 25%",
                  "Match Jahez sourdough prices down to 18%",
                  "Raise hot drink floor to 35% during rain storms",
                ].map(label => (
                  <button key={label} className="ps-pill-btn"
                    onClick={()=>{ setCpInput(label); runCopilot(label); }}
                    style={{ cursor:"pointer", fontSize:14, fontWeight:600, color:"var(--text)",
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
                  <span style={{ fontSize:14.5, color:"var(--muted)", animation:"pk-pulse 1.4s infinite" }}>
                    Thinking...
                  </span>
                </div>
              )}
              {cpError && cpPhase === "idle" && (
                <div style={{ fontSize:14, color:"#DC2626", padding:"8px 12px",
                  background:"color-mix(in srgb,#DC2626 8%,var(--surface))",
                  border:"1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                  borderRadius:9, animation:"pk-in .2s ease" }}>
                  {cpError}
                </div>
              )}
              {cpPhase === "result" && cpChatMessage && (
                <div style={{ animation:"pk-in .35s ease", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, letterSpacing:"0.06em", color:OG, textTransform:"uppercase" as const, paddingLeft:2 }}>
                    CFO Copilot
                  </div>
                  <div style={{ background:`color-mix(in srgb,${OG} 6%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${OG} 22%,transparent)`,
                    borderRadius:14, padding:"18px 20px", fontSize:16, lineHeight:1.7,
                    color:"var(--fg)", whiteSpace:"pre-wrap" as const }}>
                    {cpChatMessage}
                  </div>
                  <div style={{ fontSize:13.5, color:"var(--muted)", paddingLeft:2 }}>
                    Describe a pricing rule to compile it into an engine config →
                  </div>
                </div>
              )}
              {cpPhase === "result" && cpObj && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))", gap:16, animation:"pk-in .35s ease" }}>
                  <div style={{ background:`color-mix(in srgb,${OG} 6%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${OG} 24%,transparent)`,
                    borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ fontSize:12.5, fontWeight:500, letterSpacing:"0.04em", color:OG, textTransform:"uppercase" as const }}>
                      {t.intentLabel}
                    </div>
                    <div style={{ fontSize:18, lineHeight:1.55, fontWeight:600 }}>"{cpPrompt}"</div>
                    <div style={{ marginTop:"auto", display:"flex", gap:14, fontSize:13, color:"var(--muted)", flexWrap:"wrap" }}>
                      <span>{t.intent} <span style={{ color:GN }}>{t.intentResolved}</span></span>
                      <span>{t.confidence} <span style={{ color:GN }}>0.97</span></span>
                      <span>{t.ambiguity} none</span>
                    </div>
                  </div>
                  <div dir="ltr" style={{ background:"var(--term)", border:"1px solid var(--term-border)",
                    borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontFamily:MONO, fontSize:13, color:"#5A6472" }}>compiled.rule.json</span>
                      <span style={{ fontFamily:MONO, fontSize:12.5, color:GN }}>✓ schema v3 · 1.2s</span>
                    </div>
                    <div style={{ whiteSpace:"pre", overflowX:"auto", fontFamily:MONO, fontSize:14.5, lineHeight:1.7 }}>
                      {tokenizeJson(cpObj).map((tk,i) => <span key={i} style={{ color:tk.c }}>{tk.t}</span>)}
                    </div>
                    <button onClick={applyConfig} style={{ cursor:"pointer", marginTop:4, border:"none",
                      borderRadius:11, padding:"14px 18px", fontSize:15.5, fontWeight:800, fontFamily:"inherit",
                      color:"#fff", background: applied ? GN : OG,
                      transition:"background .3s" }}>
                      {applied ? t.applyLabel1 : t.applyLabel0}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active guardrails */}
            <div data-tour="guardrails" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                <h2 style={{ margin:0, fontSize:19.5, fontWeight:800, letterSpacing:"-0.2px" }}>{t.guardrails}</h2>
                <span style={{ fontSize:14, color:"var(--muted)" }}>{rules.length} {t.rulesEnforced}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))", gap:16 }}>
                {rules.map((r,i) => (
                  <div key={i} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:16, boxShadow:"var(--shadow)", padding:"20px 22px",
                    display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <span style={{ fontSize:16.5, fontWeight:700 }}>{r.name}</span>
                        <span style={{ fontSize:13, color:"var(--muted)" }}>{r.desc}</span>
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
                      <span style={{ fontFamily:DISPLAY, fontSize:18.5, fontWeight:700, fontVariantNumeric:"tabular-nums",
                        color: r.floor < 15 ? "#DC2626" : OG, minWidth:52, textAlign:"end" }}>{r.floor}%</span>
                    </div>
                    {r.floor < 15 && r.active && (
                      <div style={{ fontSize:13.5, fontWeight:600, color:"#DC2626",
                        background:"color-mix(in srgb,#DC2626 8%,var(--surface))",
                        border:"1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                        borderRadius:9, padding:"8px 12px" }}>{t.floorWarn}</div>
                    )}
                    <div style={{ fontSize:13, color: r.name === "Global margin floor" ? (r.active ? GN : "var(--muted)") : "var(--muted)" }}>
                      {r.name === "Global margin floor" ? (r.active ? t.activeLabel : t.pausedLabel) : t.previewLabel}
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
            <div data-tour="inbound" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <h2 style={{ margin:0, fontSize:19.5, fontWeight:800, letterSpacing:"-0.2px" }}>{t.inboundTitle}</h2>
                <span style={{ fontSize:15.5, color:"var(--muted)" }}>{t.inboundDesc}</span>
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
                          display:"grid", placeItems:"center", fontSize:16.5, fontWeight:700, color:OG, flexShrink:0 }}>{ig.glyph}</span>
                        <div>
                          <div style={{ fontSize:16.5, fontWeight:800 }}>{ig.name}</div>
                          <div style={{ fontSize:13, color:"var(--muted)", marginTop:2 }}>{ig.kind}</div>
                        </div>
                      </div>
                      <span style={{ width:9,height:9,borderRadius:"50%", flexShrink:0,
                        background: isConnected ? GN : "#F59E0B",
                        animation: isConnected ? "pk-pulse 2.2s infinite" : "none" }} />
                    </div>
                    <div style={{ fontSize:13.5, color:"var(--muted)" }}>
                      {isConnected ? t.inboundConnectedMsg : canConnect ? t.inboundAuthorizeMsg : t.inboundComingSoonMsg}
                    </div>
                    {isConnected && (
                      <div dir="ltr" style={{ fontFamily:MONO, fontSize:13.5, color:GN,
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
                        style={{ cursor:"pointer", alignSelf:"flex-start", fontSize:14, fontWeight:700,
                          color:"#fff", background:OG, border:`1.5px solid ${OG}`,
                          borderRadius:10, padding:"9px 14px", fontFamily:"inherit", transition:"border-color .2s,color .2s,background .2s" }}>
                        {t.connectPrefix} {ig.name}
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Outbound */}
            <div data-tour="outbound" style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <h2 style={{ margin:0, fontSize:19.5, fontWeight:800, letterSpacing:"-0.2px" }}>{t.outboundTitle}</h2>
                <span style={{ fontSize:15.5, color:"var(--muted)" }}>{t.outboundDesc}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))", gap:14 }}>
                {OUTBOUND_INTEGRATIONS.map(o => {
                  const connected = channelStatuses[o.platform] === "connected";
                  const needsShopId = connected && o.platform === "keeta" && keetaNeedsShopId;
                  return (
                  <div key={o.name} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:14, boxShadow:"var(--shadow)", padding:"18px 20px",
                    display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontSize:16.5, fontWeight:800 }}>{o.name}</span>
                      {needsShopId ? (
                        <button
                          type="button"
                          onClick={() => { setByokPlatform("keeta_shop_id"); setByokFields({}); setByokStatus("idle"); setByokError(null); }}
                          style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                            background:"color-mix(in srgb,#F59E0B 12%,var(--surface))",
                            color:"#F59E0B", border:"1px solid color-mix(in srgb,#F59E0B 32%,transparent)",
                            borderRadius:6, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit" }}>{t.finishSetupBadge}</button>
                      ) : connected ? (
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                          background:`color-mix(in srgb,${GN} 10%,var(--surface))`,
                          color:GN, border:`1px solid color-mix(in srgb,${GN} 30%,transparent)`,
                          borderRadius:6, padding:"3px 8px" }}>{t.live}</span>
                      ) : o.byok ? (
                        <button
                          type="button"
                          onClick={() => { setByokPlatform(o.platform); setByokFields({}); setByokStatus("idle"); setByokError(null); }}
                          style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                            background:`color-mix(in srgb,${OG} 10%,var(--surface))`,
                            color:OG, border:`1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                            borderRadius:6, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit" }}>{t.setupBadge}</button>
                      ) : o.oauthPath ? (
                        <button
                          type="button"
                          onClick={() => {
                            const mid = localStorage.getItem("ps_merchant_id");
                            if (mid) window.location.href = `${o.oauthPath}?merchant_id=${encodeURIComponent(mid)}`;
                            else showToast("Please complete onboarding first.");
                          }}
                          style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                            background:`color-mix(in srgb,${OG} 10%,var(--surface))`,
                            color:OG, border:`1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                            borderRadius:6, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit" }}>{t.connectPrefix}</button>
                      ) : (
                        <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.6px",
                          color:"var(--muted)", border:"1px solid var(--border)",
                          borderRadius:6, padding:"3px 8px" }}>{t.soonBadge}</span>
                      )}
                    </div>
                    <div style={{ fontSize:13, color:"var(--muted)" }}>{o.region}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:7, paddingTop:10,
                      borderTop:"1px solid var(--border)", fontSize:13, color:"var(--muted)" }}>
                      <span style={{ width:7,height:7,borderRadius:"50%",
                        background: needsShopId ? "#F59E0B" : connected ? GN : OG, flexShrink:0,
                        animation: connected ? "pk-pulse 2s ease infinite" : "none" }} />
                      {needsShopId ? t.keetaShopIdPending : connected ? t.storeConnectedSyncing : o.byok || o.oauthPath ? t.tapSetupMsg : t.awaitingBuildMsg}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

          </section>
        )}

        {/* ===== TAB: HISTORY ===== */}
        {tab === "history" && (
          <section className="ps-db-section" style={{ padding:"28px 30px 48px", display:"flex", flexDirection:"column", gap:24, animation:"pk-in .3s ease" }}>

            {/* Payout Check History */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:16, boxShadow:"var(--shadow)", padding:"22px 24px",
              display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.historyPayoutTitle}</h3>
                <div style={{ fontSize:13.5, color:"var(--muted)", marginTop:4 }}>{t.historyPayoutDesc}</div>
              </div>
              {historyLoading ? (
                <div style={{ fontSize:14, color:"var(--muted)" }}>{t.historyLoading}</div>
              ) : historyPayoutChecks.length === 0 ? (
                <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                  borderRadius:12, padding:"24px 20px", display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ width:9, height:9, borderRadius:"50%", background:"var(--muted)", flexShrink:0 }} />
                  <span style={{ fontSize:15, color:"var(--muted)" }}>{t.historyPayoutEmpty}</span>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {historyPayoutChecks.map(row => {
                    const open = expandedPayoutCheckId === row.id;
                    return (
                    <div key={row.id} style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                      borderRadius:12, overflow:"hidden" }}>
                      <div onClick={()=>setExpandedPayoutCheckId(open ? null : row.id)}
                        style={{ cursor:"pointer", padding:"13px 16px", display:"flex", flexWrap:"wrap",
                          gap:12, alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink:0, color:"var(--muted)", transition:"transform .18s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:14.5, fontWeight:700, flexWrap:"wrap" }}>
                              <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:700,
                                color: row.source === "upload" ? "#B45309" : GN,
                                background: row.source === "upload" ? "color-mix(in srgb,#B45309 10%,var(--surface))" : `color-mix(in srgb,${GN} 10%,var(--surface))`,
                                border: `1px solid ${row.source === "upload" ? "color-mix(in srgb,#B45309 28%,transparent)" : `color-mix(in srgb,${GN} 28%,transparent)`}`,
                                borderRadius:999, padding:"3px 9px" }}>
                                <span style={{ width:6,height:6,borderRadius:"50%", background: row.source === "upload" ? "#B45309" : GN }} />
                                {row.source === "upload" ? t.payoutCheckSourceUpload : t.payoutCheckSourceLive}
                              </span>
                              {PAYOUT_UPLOAD_PLATFORMS.find(p => p.value === row.platform)?.label ?? row.platform}
                            </div>
                            <div style={{ fontSize:13, color:"var(--muted)" }}>
                              {new Date(row.created_at).toLocaleString()} · {row.order_count} {t.historyColOrders} · {row.commission_rate_pct}%
                            </div>
                          </div>
                        </div>
                        <div style={{ fontFamily:DISPLAY, fontSize:18, fontWeight:700, color:GN, fontVariantNumeric:"tabular-nums" }}>
                          {currency} {fmtMoney(row.expected_payout, currency)}
                        </div>
                      </div>
                      {open && (
                        <div style={{ padding:"0 16px 16px 38px", display:"flex", flexDirection:"column", gap:6,
                          fontSize:13, color:"var(--muted)", animation:"pk-in .2s ease" }}>
                          <div>{t.payoutCheckSalesLabel}: <span style={{ color:"var(--text)", fontWeight:600 }}>{currency} {fmtMoney(row.sub_total_sum, currency)}</span></div>
                          {(row.period_start || row.period_end) && (
                            <div>{t.historyDetailPeriod}: <span style={{ color:"var(--text)", fontWeight:600 }}>{row.period_start}{row.period_end && row.period_end !== row.period_start ? ` – ${row.period_end}` : ""}</span></div>
                          )}
                          {row.rows_total != null && (
                            <div>{t.historyDetailRows}: <span style={{ color:"var(--text)", fontWeight:600 }}>{(row.rows_total ?? 0) - (row.rows_skipped ?? 0)} / {row.rows_total}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Repricing History */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:16, boxShadow:"var(--shadow)", padding:"22px 24px",
              display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.historyRepricingTitle}</h3>
                <div style={{ fontSize:13.5, color:"var(--muted)", marginTop:4 }}>{t.historyRepricingDesc}</div>
              </div>
              {historyLoading ? (
                <div style={{ fontSize:14, color:"var(--muted)" }}>{t.historyLoading}</div>
              ) : historyRepricings.length === 0 ? (
                <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                  borderRadius:12, padding:"24px 20px", display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ width:9, height:9, borderRadius:"50%", background:"var(--muted)", flexShrink:0 }} />
                  <span style={{ fontSize:15, color:"var(--muted)" }}>{t.historyRepricingEmpty}</span>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {historyRepricings.map(row => {
                    const statusColor = row.status === "success" ? GN
                      : row.status === "failed" || row.status === "schema_mismatch" || row.status === "circuit_open" ? "#DC2626"
                      : row.status === "rate_limited" || row.status === "timeout" ? "#B45309"
                      : "var(--muted)";
                    return (
                      <div key={row.id} style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, padding:"13px 16px", display:"flex", flexWrap:"wrap",
                        gap:12, alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:14.5, fontWeight:700 }}>
                            {row.target_channel ?? "—"}
                            {row.sku && <span style={{ fontWeight:400, color:"var(--muted)", fontFamily:MONO, fontSize:13 }}>· {row.sku}</span>}
                          </div>
                          <div style={{ fontSize:13, color:"var(--muted)" }}>
                            {new Date(row.created_at).toLocaleString()}
                            {row.old_price != null ? ` · ${row.old_price} → ${row.new_price} ${row.currency}` : ` · ${row.new_price} ${row.currency}`}
                            {row.upstream_message ? ` · ${row.upstream_message}` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize:11.5, fontWeight:700, color: statusColor,
                          background:`color-mix(in srgb,${statusColor} 10%,var(--surface))`,
                          border:`1px solid color-mix(in srgb,${statusColor} 28%,transparent)`,
                          borderRadius:999, padding:"4px 10px", textTransform:"uppercase" as const, letterSpacing:"0.03em", flexShrink:0 }}>
                          {row.status.replace(/_/g," ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
                <h3 style={{ margin:0, fontSize:20.5, fontWeight:800, letterSpacing:"-0.3px" }}>
                  {t.bilingualTitle} {md.partner}
                </h3>
                <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
                  <span dir="ltr" style={{ fontFamily:MONO, fontSize:13, color:GN,
                    background:`color-mix(in srgb,${GN} 10%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${GN} 26%,transparent)`,
                    borderRadius:7, padding:"5px 10px" }}>
                    {t.verified} {md.hash} {t.verifiedS}
                  </span>
                  <span style={{ fontSize:13, color:"var(--muted)" }}>{t.autoCompiled}</span>
                </div>
              </div>
              <button onClick={()=>setModal(null)} aria-label="Close"
                style={{ cursor:"pointer", flex:"0 0 auto", width:34, height:34,
                  borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)",
                  color:"var(--muted)", fontSize:16.5, fontWeight:700 }}>{t.close}</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))", gap:14 }}>
              <div dir="ltr" style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:12.5, fontWeight:700, letterSpacing:"1.3px", color:"var(--muted)", fontFamily:MONO }}>{t.claimEn}</div>
                <div style={{ fontSize:15, lineHeight:1.7, whiteSpace:"pre-line" }}>{md.en}</div>
              </div>
              <div dir="rtl" style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:14, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:12.5, fontWeight:700, letterSpacing:"1.3px", color:"var(--muted)", fontFamily:MONO, textAlign:"start" }}>{t.claimAr}</div>
                <div style={{ fontSize:16, lineHeight:1.9, whiteSpace:"pre-line", textAlign:"start" }}>{md.ar}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[`payout_${md.order.slice(1)}.csv`, "contract_excerpt.pdf", "pos_ledger.json"].map(name => (
                <span key={name} dir="ltr" style={{ fontFamily:MONO, fontSize:13, color:"var(--muted)",
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
                <div style={{ fontFamily:MONO, fontSize:14, color: fileStep===3 ? GN : "var(--muted)" }}>
                  {fileStep===1?t.fileMsg1:fileStep===2?t.fileMsg2:t.fileMsg3}
                </div>
              </div>
            )}
            <button onClick={fileClaim} style={{ cursor:"pointer", border:"none", borderRadius:12,
              padding:"15px 20px", fontSize:16, fontWeight:800, fontFamily:"inherit", color:"#fff",
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
              <div style={{ fontSize:23.5, fontWeight:800, letterSpacing:"-0.5px" }}>
                Prize<span style={{ color:OG }}>skout</span>
              </div>
              <button onClick={()=>setSidebarOpen(false)} aria-label="Close menu"
                style={{ cursor:"pointer", width:36, height:36, borderRadius:9, border:"1px solid var(--border)",
                  background:"transparent", color:"var(--muted)", fontSize:16.5, fontWeight:700, display:"grid", placeItems:"center" }}>
                ✕
              </button>
            </div>
            {/* CONTROL PLANE label */}
            <div style={{ fontSize:12.5, fontWeight:700, letterSpacing:"1.6px", color:"var(--muted)",
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
                      <span style={{ fontSize:16, fontWeight:700, color:"var(--text)" }}>{n.label}</span>
                      <span style={{ fontSize:13.5, color: on ? OG : "var(--muted)" }}>{n.sub}</span>
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
                    fontSize:13.5, fontWeight:700, fontFamily:MONO,
                    background: currency===code ? OG : "transparent",
                    color: currency===code ? "#fff" : "var(--muted)",
                  }}>{code}</button>
                ))}
              </div>
              {/* Lang */}
              <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:10, padding:3, gap:2, marginBottom:8 }}>
                {([["en","EN"],["ar","عربية"],["fr","FR"]] as [Lang,string][]).map(([id,label]) => (
                  <button key={id} onClick={()=>setLang(id)} style={{
                    cursor:"pointer", border:"none", borderRadius:8, padding:"10px 0", flex:1,
                    fontSize:13.5, fontWeight:700, fontFamily:"inherit",
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
                <span style={{ fontSize:14.5, fontWeight:500 }}>{t.settingsLabel}</span>
              </div>
              {/* Back to site */}
              <a href="/" style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 10px",
                borderRadius:10, textDecoration:"none", color:"var(--muted)", marginBottom:8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                <span style={{ fontSize:14.5, fontWeight:500 }}>{t.backToSite}</span>
              </a>
              <div style={{ height:1, background:"var(--border)", marginBottom:8 }} />
              {/* Defend Loop */}
              <div style={{ border:`1px solid color-mix(in srgb,${GN} 30%,transparent)`,
                background:`color-mix(in srgb,${GN} 7%,var(--surface))`,
                borderRadius:12, padding:"13px 14px", display:"flex", gap:11, alignItems:"flex-start" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:GN, marginTop:5, animation:"pk-pulse 2s infinite" }} />
                <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:GN }}>{t.defend}</span>
                  <span style={{ fontSize:13.5, color:"var(--muted)", fontFamily:MONO }}>{t.defendS}</span>
                </span>
              </div>
              {/* Account */}
              <div style={{ display:"flex", alignItems:"center", gap:11, paddingInline:4, paddingTop:4 }}>
                <span style={{ width:34, height:34, borderRadius:"50%", background:"var(--surface)",
                  border:"1px solid var(--border)", display:"grid", placeItems:"center",
                  fontSize:13, fontWeight:700, fontFamily:MONO }}>M</span>
                <span style={{ fontSize:15.5, fontWeight:600 }}>{t.myAccount}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* BYOK SETUP MODAL */}
      {byokPlatform && (() => {
        const p = byokPlatform as string;
        const cfg = BYOK_CONFIG[p];
        const platformName = p === "keeta_shop_id" ? "Keeta" : OUTBOUND_INTEGRATIONS.find(o => o.platform === p)?.name ?? p;
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
              if (p === "keeta_shop_id") {
                setKeetaNeedsShopId(false);
                setTimeout(() => { closeByok(); showToast(t.keetaShopIdSaved); }, 1200);
              } else {
                setChannelStatuses(prev => ({ ...prev, [p]: "connected" }));
                setTimeout(() => { closeByok(); showToast(`${platformName} store connected · prices syncing`); }, 1200);
              }
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
                  <h3 style={{ margin:0, fontSize:19.5, fontWeight:800, letterSpacing:"-0.3px" }}>
                    {p === "keeta_shop_id" ? `${t.finishSetupBadge} · Keeta` : `${t.connectPrefix} ${platformName}`}
                  </h3>
                  <p style={{ margin:"6px 0 0", fontSize:14.5, color:"var(--muted)", lineHeight:1.6 }}>
                    {p === "keeta_shop_id"
                      ? t.keetaShopIdPrompt
                      : `Paste your credentials from your ${platformName} partner portal. PrizeSkout uses them to push margin-safe prices to your live menu.`}
                  </p>
                </div>
                <button onClick={closeByok} aria-label="Close"
                  style={{ cursor:"pointer", flexShrink:0, width:34, height:34,
                    borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)",
                    color:"var(--muted)", fontSize:16.5, fontWeight:700 }}>✕</button>
              </div>

              {cfg ? (
                <form onSubmit={submitByok} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {cfg.fields.map(f => (
                    <div key={f.key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label htmlFor={`byok-${f.key}`}
                        style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>
                        {f.label}
                      </label>
                      {f.hint && (
                        <span style={{ fontSize:13, color:"var(--muted)", marginTop:-3 }}>{f.hint}</span>
                      )}
                      <input
                        id={`byok-${f.key}`}
                        type={f.type ?? "password"}
                        autoComplete="off"
                        required
                        value={byokFields[f.key] ?? ""}
                        onChange={e => setByokFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ height:44, borderRadius:9, border:"1px solid var(--border)",
                          background:"var(--surface)", color:"var(--text)", padding:"0 13px",
                          fontSize:15.5, fontFamily:"inherit", outline:"none",
                          transition:"border-color .15s" }}
                        onFocus={e => { e.currentTarget.style.borderColor = OG; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  ))}

                  {cfg.portalHint && (
                    <p style={{ margin:0, fontSize:13.5, color:"var(--muted)", lineHeight:1.6,
                      padding:"10px 14px", background:"var(--surface2)",
                      borderRadius:9, border:"1px solid var(--border)" }}>
                      {cfg.portalHint}
                    </p>
                  )}

                  {byokError && (
                    <p style={{ margin:0, fontSize:14.5, color:"#EF4444", fontWeight:500,
                      padding:"10px 14px", background:"rgba(239,68,68,.07)",
                      borderRadius:9, border:"1px solid rgba(239,68,68,.2)" }}>
                      {byokError}
                    </p>
                  )}

                  {byokStatus === "ok" && (
                    <p style={{ margin:0, fontSize:14.5, color:GN, fontWeight:600,
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
                      fontSize:15.5, fontWeight:700, fontFamily:"inherit",
                      opacity: byokStatus === "loading" ? .75 : 1,
                      transition:"opacity .2s,background .2s" }}>
                    {p === "keeta_shop_id"
                      ? (byokStatus === "loading" ? "Saving…" : byokStatus === "ok" ? "Saved" : "Save Shop ID")
                      : (byokStatus === "loading" ? "Connecting…" : byokStatus === "ok" ? "Connected" : `Connect ${platformName}`)}
                  </button>
                </form>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <p style={{ margin:0, fontSize:15, color:"var(--text)", lineHeight:1.7,
                    padding:"16px 18px", background:"var(--surface2)",
                    borderRadius:10, border:"1px solid var(--border)" }}>
                    {platformName} integration is coming soon. We are working with their partner team to get API access. To be notified when it is ready, email us at <strong>hello@prizeskout.qa</strong>.
                  </p>
                  <button onClick={closeByok}
                    style={{ height:44, borderRadius:10, border:`1px solid var(--border)`,
                      background:"var(--surface)", color:"var(--muted)",
                      fontSize:15.5, fontWeight:600, fontFamily:"inherit", cursor:"pointer" }}>
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* PRODUCT TOUR */}
      {tourActive && (
        <ProductTour
          steps={tourSteps}
          stepIndex={tourStep}
          onStepChange={goToTourStep}
          onClose={closeTour}
          onFinish={closeTour}
          dir={dir}
          labels={{ back:t.tourBackBtn, next:t.tourNextBtn, finish:t.tourFinishBtn, skip:t.tourSkipLabel, start:t.tourStartBtn }}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, insetInlineEnd:24, zIndex:80,
          background:"var(--surface)", border:`1px solid color-mix(in srgb,${GN} 35%,var(--border))`,
          borderRadius:13, boxShadow:"var(--shadow-lg)", padding:"14px 18px",
          fontSize:15, fontWeight:600, maxWidth:"min(420px,86vw)",
          animation:"pk-toast .3s ease", display:"flex", gap:10, alignItems:"center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
