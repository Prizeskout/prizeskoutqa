import { useState, useEffect, useMemo, useRef } from "react";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { ContactSupportModal } from "@/components/ContactSupportModal";
import { ProductTour, type TourStep } from "@/components/dashboard/ProductTour";
import { CommissionAuditPanel } from "@/components/dashboard/payout/CommissionAuditPanel";
import { PayoutUploadStaging, type StagedItem, type PayoutCheckClassification } from "@/components/dashboard/payout/PayoutUploadStaging";
import { ContractIntelligenceVault, type ContractTerm } from "@/components/dashboard/payout/ContractIntelligenceVault";
import { SettlementForecastPanel } from "@/components/dashboard/payout/SettlementForecastPanel";
import { PromotionProfitabilityWorkspace } from "@/components/dashboard/promotions/PromotionProfitabilityWorkspace";
import { classifyResult, reconcile, type ClassifiedDocument, type DocumentType, type Finding, type LedgerRow } from "@/lib/commission-audit";

type Tab = "analytics" | "rules" | "vault" | "history" | "settings";
type Theme = "light" | "dark";
type Lang = "en" | "ar" | "fr";

interface FeedRow { tag: string; tagColor: string; text: string; time: string; }
type RuleStatus = "draft" | "testing" | "scheduled" | "active" | "paused" | "failed";
interface Rule {
  name: string;
  desc: string;
  floor: number;
  active: boolean;
  status: RuleStatus;
  scope: "global" | "category" | "channel" | "product";
  maxChangePct: number;
  dailyChangePct: number;
  approvalAbovePct: number;
  cooldownHours: number;
  rollbackOnReject: boolean;
  stopOnStaleCost: boolean;
}
interface ImportedProduct {
  ingest_event_id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  source_platform: string;
  current_price: number;
  recommended_price: number;
  net_margin_pct: number | null;
  floor_breached: boolean;
  decision_action: string;
  currency: string;
  status: string;
}

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
      { key:"commission_rate_pct", label:"Commission Rate (%)", type:"text", hint:"The rate in your Talabat contract, commonly around 19% but specific to your agreement" },
      { key:"vat_on_fees_pct", label:"VAT on Talabat Fees (%)", type:"text", hint:"VAT charged on Talabat's fees. Enter 0 if none." },
      { key:"payment_fee_pct", label:"Payment Fee (%)", type:"text", hint:"Payment processing percentage in your commercial terms. Enter 0 if none." },
      { key:"fixed_order_fee", label:"Fixed Fee per Order", type:"text", hint:"Fixed deduction per order in your store currency. Enter 0 if none." },
      { key:"delivery_contribution", label:"Delivery Contribution per Order", type:"text", hint:"Restaurant-funded delivery amount per order. Enter 0 if none." },
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
    cp:"CONTROL PLANE", live:"LIVE", defend:"Defend Loop status", defendS:"Live health is loading",
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
    historyDetailItem:"Item", historyDetailRule:"Trigger", historyDetailMargin:"Margin (before → after)",
    historyDetailDuration:"Duration", historyDetailCompleted:"Completed",
    historyDeleteConfirm:"Delete this record?", historyDeleteYes:"Delete", historyDeleteCancel:"Cancel",
    stream:"Live Execution Stream", streamS:"Real-time event feed",
    profLabel:"Profits Protected · This Month",
    profNoActivity:"No activity yet · connect a store to begin tracking",
    profDefensesLabel:"price defenses this month",
    profTrackedFoot:"across your channels", profMarginFoot:"vs. margin floor",
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
    payoutCheckTitle:"Forensic Payout Assurance",
    payoutCheckDesc:"Reconcile restaurant activity, platform settlements, contract terms, and bank receipts. Every exception is graded by evidence strength so estimates are never mistaken for claims-ready recoveries.",
    payoutCheckBtn:"Check Last 30 Days", payoutCheckBtnLoading:"Pulling your orders…",
    payoutCheckLiveOnlyNote:"Talabat only, for now — other platforms coming soon.",
    payoutCheckOrders:"Orders Checked", payoutCheckSubtotal:"Food Sales (excl. delivery fee)", payoutCheckRate:"Your Commission Rate",
    payoutCheckCommissionLabel:"Platform Commission",
    payoutBreakdownTitle:"Payout Breakdown", payoutBreakdownCommission:"Commission Charge",
    payoutBreakdownCharges:"Additional Charges", payoutBreakdownIncome:"Additional Income & Vouchers",
    payoutBreakdownTotal:"Total Payout (Talabat's statement)",
    payoutCheckAgreedVsEffective:"Agreed rate → actual effective rate",
    payoutShortfallSuffix:"less than you should have received",
    payoutSurplusSuffix:"more than your agreed rate alone would have produced",
    payoutCorrectedForAgreedRate1:"Corrected for your agreed rate — Talabat's own statement said",
    payoutCheckStatementNote:"This is Talabat's own stated payout for this period, read directly from your payout statement — not an estimate. The breakdown above shows exactly what moved between your gross sales and this number.",
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
    payoutCheckTalabatHint:"Upload Talabat's Payout Statement CSV (Finance → Payouts → Download report), not a general sales export.",
    payoutCheckLiveEstimateNote:"This is an estimate from your order history and commission rate — it doesn't include additional charges or platform-funded vouchers Talabat's own payout statement would show. For the exact number, upload your Payout Statement CSV instead.",
    payoutUnexplainedCharge1:"There's", payoutUnexplainedCharge2:"in",
    payoutUnexplainedCharge3:"with no itemized breakdown anywhere in this statement — worth asking the platform to explain it.",
    payoutUnexplainedChargeRateNote:"per order — worth asking the platform whether this matches a flat per-order fee.",
    payoutUnexplainedChargeChecked:"Checked", payoutUnexplainedChargeAllZero:"all read zero.",
    payoutManualEntryLabel:"Manual entry",
    commissionTrendTitle:"Commission Pattern", commissionTrendRateLabel:"Avg. agreed → effective rate",
    commissionTrendAcross:"across", commissionTrendStatements:"statements",
    commissionTrendExcessLabel:"Extra commission paid beyond agreed rate",
    commissionTrendUnexplainedLabel:"Unexplained Additional Charges",
    payoutDownloadPdf:"Download Report", payoutDownloadingPdf:"Generating…",
    payoutDownloadFullReport:"Download Full Report",
    payoutCheckLiveTab:"Live Check", payoutCheckUploadTab:"Upload File",
    payoutCheckUploadPlatformLabel:"Platform", payoutCheckCsvOnly:"CSV files only for now.",
    payoutCheckSourceLive:"Live check", payoutCheckSourceUpload:"Uploaded file", payoutCheckShowing:"Showing",
    payoutCheckRowsSkipped:"rows skipped — date or number format didn't match, so they weren't counted.",
    payoutCheckMultiFileHint:"You can also select multiple files at once — CSV, XLSX, or PDF (Snoonu only). Upload a daily order log and a payout statement together for a full commission audit.",
    payoutUploadingProgress:"of the files you selected have uploaded so far…",
    payoutSaveAudit:"Save to History", payoutAuditSaved:"Saved",
    historyPayoutAuditTitle:"Commission Audit History", historyPayoutAuditDesc:"Every multi-document commission audit you've run and saved.",
    historyPayoutAuditEmpty:"No saved audits yet.",
  },
  ar: {
    cp:"لوحة التحكم", live:"مباشر", defend:"حالة حلقة الدفاع", defendS:"جارٍ تحميل الحالة المباشرة",
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
    historyDetailItem:"الصنف", historyDetailRule:"سبب التفعيل", historyDetailMargin:"الهامش (قبل ← بعد)",
    historyDetailDuration:"المدة", historyDetailCompleted:"اكتمل في",
    historyDeleteConfirm:"هل تريد حذف هذا السجل؟", historyDeleteYes:"حذف", historyDeleteCancel:"إلغاء",
    stream:"بث التنفيذ المباشر", streamS:"بث الأحداث في الوقت الفعلي",
    profLabel:"الأرباح المحمية · هذا الشهر",
    profNoActivity:"لا يوجد نشاط بعد · اربط متجراً لبدء التتبع",
    profDefensesLabel:"دفاعات سعرية هذا الشهر",
    profTrackedFoot:"عبر قنواتك", profMarginFoot:"مقابل حد الهامش",
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
    payoutCheckCommissionLabel:"عمولة المنصة",
    payoutBreakdownTitle:"تفصيل المدفوعات", payoutBreakdownCommission:"رسوم العمولة",
    payoutBreakdownCharges:"رسوم إضافية", payoutBreakdownIncome:"دخل إضافي وقسائم",
    payoutBreakdownTotal:"إجمالي المدفوعات (بيان طلبات)",
    payoutCheckAgreedVsEffective:"النسبة المتفق عليها ← النسبة الفعلية",
    payoutShortfallSuffix:"أقل مما كان يجب أن تحصل عليه",
    payoutSurplusSuffix:"أكثر مما كانت ستنتجه نسبتك المتفق عليها وحدها",
    payoutCorrectedForAgreedRate1:"مصحّح وفق نسبتك المتفق عليها — بيان طلبات نفسه ذكر",
    payoutCheckStatementNote:"هذا هو المبلغ الذي أعلنته طلبات فعلياً لهذه الفترة، مأخوذ مباشرة من بيان المدفوعات الخاص بك — وليس تقديراً. يوضح التفصيل أعلاه بالضبط ما تغيّر بين إجمالي مبيعاتك وهذا الرقم.",
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
    payoutCheckTalabatHint:"ارفع ملف CSV الخاص ببيان مدفوعات طلبات (المالية ← المدفوعات ← تنزيل التقرير)، وليس تصدير مبيعات عام.",
    payoutCheckLiveEstimateNote:"هذا تقدير مبني على سجل طلباتك ونسبة عمولتك — ولا يشمل الرسوم الإضافية أو القسائم الممولة من المنصة التي قد يظهرها بيان مدفوعات طلبات نفسه. للحصول على الرقم الدقيق، ارفع ملف CSV الخاص ببيان المدفوعات بدلاً من ذلك.",
    payoutUnexplainedCharge1:"هناك", payoutUnexplainedCharge2:"ضمن",
    payoutUnexplainedCharge3:"بدون أي تفصيل في هذا البيان — يستحق سؤال المنصة لتوضيحه.",
    payoutUnexplainedChargeRateNote:"لكل طلب — يستحق سؤال المنصة عمّا إذا كان هذا يطابق رسماً ثابتاً لكل طلب.",
    payoutUnexplainedChargeChecked:"تم فحص", payoutUnexplainedChargeAllZero:"وكلها بقيمة صفر.",
    payoutManualEntryLabel:"إدخال يدوي",
    commissionTrendTitle:"نمط العمولة", commissionTrendRateLabel:"متوسط النسبة المتفق عليها ← الفعلية",
    commissionTrendAcross:"عبر", commissionTrendStatements:"بيانات",
    commissionTrendExcessLabel:"عمولة إضافية مدفوعة فوق النسبة المتفق عليها",
    commissionTrendUnexplainedLabel:"رسوم إضافية غير مفسّرة",
    payoutDownloadPdf:"تنزيل التقرير", payoutDownloadingPdf:"جارٍ الإنشاء…",
    payoutDownloadFullReport:"تنزيل التقرير الكامل",
    payoutCheckLiveTab:"فحص مباشر", payoutCheckUploadTab:"رفع ملف",
    payoutCheckUploadPlatformLabel:"المنصة", payoutCheckCsvOnly:"ملفات CSV فقط حالياً.",
    payoutCheckSourceLive:"فحص مباشر", payoutCheckSourceUpload:"ملف مرفوع", payoutCheckShowing:"يعرض",
    payoutCheckRowsSkipped:"صفوف تم تجاهلها — لم تتطابق صيغة التاريخ أو الرقم، لذا لم تُحتسب.",
    payoutCheckMultiFileHint:"يمكنك أيضاً اختيار عدة ملفات دفعة واحدة — CSV أو XLSX أو PDF (سنونو فقط). ارفع سجل الطلبات اليومي وبيان المدفوعات معاً للحصول على تدقيق عمولة كامل.",
    payoutUploadingProgress:"من الملفات التي اخترتها تم رفعها حتى الآن…",
    payoutSaveAudit:"حفظ في السجل", payoutAuditSaved:"تم الحفظ",
    historyPayoutAuditTitle:"سجل تدقيق العمولات", historyPayoutAuditDesc:"كل تدقيق عمولة متعدد المستندات قمت بتشغيله وحفظه.",
    historyPayoutAuditEmpty:"لا توجد عمليات تدقيق محفوظة بعد.",
  },
  fr: {
    cp:"CENTRE DE CONTRÔLE", live:"EN DIRECT", defend:"État de la boucle de défense", defendS:"Chargement de l’état en direct",
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
    historyDetailItem:"Article", historyDetailRule:"Déclencheur", historyDetailMargin:"Marge (avant → après)",
    historyDetailDuration:"Durée", historyDetailCompleted:"Terminé le",
    historyDeleteConfirm:"Supprimer cet enregistrement ?", historyDeleteYes:"Supprimer", historyDeleteCancel:"Annuler",
    stream:"Flux d'exécution en direct", streamS:"Flux d'événements en temps réel",
    profLabel:"Profits protégés · Ce mois-ci",
    profNoActivity:"Aucune activité pour l'instant · connectez une boutique pour commencer le suivi",
    profDefensesLabel:"défenses de prix ce mois-ci",
    profTrackedFoot:"sur vos canaux", profMarginFoot:"vs. seuil de marge",
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
    payoutCheckCommissionLabel:"Commission de la plateforme",
    payoutBreakdownTitle:"Détail du paiement", payoutBreakdownCommission:"Frais de commission",
    payoutBreakdownCharges:"Frais supplémentaires", payoutBreakdownIncome:"Revenus supplémentaires et bons",
    payoutBreakdownTotal:"Paiement total (relevé Talabat)",
    payoutCheckAgreedVsEffective:"Taux convenu → taux effectif réel",
    payoutShortfallSuffix:"de moins que ce que vous auriez dû recevoir",
    payoutSurplusSuffix:"de plus que ce que votre taux convenu seul aurait produit",
    payoutCorrectedForAgreedRate1:"Corrigé selon votre taux convenu — le relevé Talabat indiquait",
    payoutCheckStatementNote:"Il s'agit du paiement réellement déclaré par Talabat pour cette période, lu directement depuis votre relevé de paiement — pas une estimation. Le détail ci-dessus montre exactement ce qui a évolué entre vos ventes brutes et ce montant.",
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
    payoutCheckTalabatHint:"Importez le CSV du relevé de paiement Talabat (Finance → Paiements → Télécharger le rapport), pas un export de ventes général.",
    payoutCheckLiveEstimateNote:"Il s'agit d'une estimation basée sur votre historique de commandes et votre taux de commission — elle n'inclut pas les frais supplémentaires ni les bons financés par la plateforme que le relevé de paiement Talabat afficherait. Pour le montant exact, importez plutôt votre relevé de paiement CSV.",
    payoutUnexplainedCharge1:"Il y a", payoutUnexplainedCharge2:"dans",
    payoutUnexplainedCharge3:"sans aucun détail dans ce relevé — vaut la peine de demander à la plateforme de l'expliquer.",
    payoutUnexplainedChargeRateNote:"par commande — vaut la peine de demander à la plateforme si cela correspond à des frais fixes par commande.",
    payoutUnexplainedChargeChecked:"Vérifié", payoutUnexplainedChargeAllZero:"tous à zéro.",
    payoutManualEntryLabel:"Saisie manuelle",
    commissionTrendTitle:"Tendance de commission", commissionTrendRateLabel:"Taux moyen convenu → effectif",
    commissionTrendAcross:"sur", commissionTrendStatements:"relevés",
    commissionTrendExcessLabel:"Commission supplémentaire payée au-delà du taux convenu",
    commissionTrendUnexplainedLabel:"Frais supplémentaires inexpliqués",
    payoutDownloadPdf:"Télécharger le rapport", payoutDownloadingPdf:"Génération…",
    payoutDownloadFullReport:"Télécharger le rapport complet",
    payoutCheckLiveTab:"Vérification en direct", payoutCheckUploadTab:"Importer un fichier",
    payoutCheckUploadPlatformLabel:"Plateforme", payoutCheckCsvOnly:"Fichiers CSV uniquement pour le moment.",
    payoutCheckSourceLive:"Vérification en direct", payoutCheckSourceUpload:"Fichier importé", payoutCheckShowing:"Affichage",
    payoutCheckRowsSkipped:"lignes ignorées — le format de date ou de nombre ne correspondait pas, donc elles n'ont pas été comptées.",
    payoutCheckMultiFileHint:"Vous pouvez aussi sélectionner plusieurs fichiers à la fois — CSV, XLSX, ou PDF (Snoonu uniquement). Importez un journal de commandes quotidien et un relevé de paiement ensemble pour un audit de commission complet.",
    payoutUploadingProgress:"des fichiers sélectionnés ont été importés jusqu'à présent…",
    payoutSaveAudit:"Enregistrer dans l'historique", payoutAuditSaved:"Enregistré",
    historyPayoutAuditTitle:"Historique d'audit des commissions", historyPayoutAuditDesc:"Chaque audit de commission multi-documents que vous avez exécuté et enregistré.",
    historyPayoutAuditEmpty:"Aucun audit enregistré pour le moment.",
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

// Shared between the live "just ran a check" result and a History tab row's
// expanded detail — same comprehensive breakdown either way, not an
// abridged summary in one place and the full picture in the other.
type PayoutResultLike = {
  order_count: number;
  sub_total_sum: number;
  commission_rate_pct?: number | null;
  expected_payout: number;
  source?: string | null;
  platform?: string | null;
  rows_skipped?: number | null;
  rows_total?: number | null;
  brand?: string | null;
  cancelled_gmv?: number | null;
  cancelled_orders?: number | null;
  commission_amount?: number | null;
  additional_charges?: number | null;
  additional_income?: number | null;
  effective_commission_pct?: number | null;
  period_start?: string | null;
  extra_line_items?: { label:string; value:number }[] | null;
  unexplained_charge?: { label:string; amount:number } | null;
  charge_explainers?: { label:string; value:number }[] | null;
  deduction_breakdown?: { gross_sales:number; commission:number; vat_on_fees:number; payment_fees:number; fixed_order_fees:number; delivery_contribution:number; expected_net:number } | null;
  commercial_terms?: { commission_rate_pct:number; vat_on_fees_pct:number; payment_fee_pct:number; fixed_order_fee:number; delivery_contribution:number; source:string } | null;
  sale_lines?: { order_id:string; product_name:string; sku:string|null; quantity:number; gross_sale:number; commission:number; vat_on_fees:number; payment_fee:number; fixed_order_fee:number; delivery_contribution:number; expected_net:number; order_date:string|null; expected_settlement_date:string|null }[] | null;
  settlement_forecast?: { as_of:string; confidence:"verified_contract"|"incomplete_contract"|"estimated_schedule"; blockers:string[]; expected_today:number; expected_next_settlement:{date:string;amount:number}|null; by_settlement_date:{date:string;amount:number;orders:number}[]; by_product:{product_name:string;sku:string|null;amount:number;quantity:number}[]; by_platform:{platform:string;amount:number;orders:number}[]; transaction_count:number } | null;
};

function PayoutResultDetail({ data, currency, t }: { data: PayoutResultLike; currency: string; t: typeof T["en"] }) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { exportPayoutCheckPdf } = await import("@/components/dashboard/payout/exportPayoutReportPdf");
      await exportPayoutCheckPdf(data, currency);
    } catch (err) {
      console.error("Payout check PDF export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  // What Total Payout should have been if commission had actually been
  // charged at the agreed rate — not just the rate gap in isolation. The
  // headline "you should have received" figure must be THIS number, not
  // Talabat's own stated total, otherwise the app is just echoing back the
  // platform's already-inflated-commission figure under a misleading label.
  const hasRates = data.commission_rate_pct != null && data.effective_commission_pct != null;
  const expectedAtAgreed = hasRates
    ? data.expected_payout + ((data.commission_amount ?? 0) - data.sub_total_sum * (data.commission_rate_pct ?? 0) / 100)
    : data.expected_payout;
  const agreedDelta = expectedAtAgreed - data.expected_payout;
  const showAgreedDelta = hasRates && Math.abs(agreedDelta) > 0.01;
  const headlineAmount = showAgreedDelta ? expectedAtAgreed : data.expected_payout;

  return (
    <>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button type="button" onClick={handleDownload} disabled={downloading}
          style={{ cursor: downloading ? "not-allowed" : "pointer", fontFamily:"inherit", fontSize:12.5,
            fontWeight:600, color:"var(--text)", background:"var(--surface)",
            border:"1px solid var(--border)", borderRadius:8, padding:"7px 12px",
            opacity: downloading ? 0.6 : 1, display:"flex", alignItems:"center", gap:6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? t.payoutDownloadingPdf : t.payoutDownloadPdf}
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, animation:"pk-in .3s ease" }}>
        {[
          { value:String(data.order_count), label:t.payoutCheckOrders },
          { value:`${currency} ${fmtMoney(data.sub_total_sum, currency)}`, label: data.source === "upload" ? t.payoutCheckSalesLabel : t.payoutCheckSubtotal },
          { value:`${data.commission_rate_pct}%`, label:t.payoutCheckRate },
          { value:`${currency} ${fmtMoney(data.commission_amount ?? (data.sub_total_sum - data.expected_payout), currency)}`, label:t.payoutCheckCommissionLabel, accent:true },
        ].map(m => (
          <div key={m.label} style={{ background:"var(--surface2)", border:"1px solid var(--border)",
            borderRadius:12, padding:"16px 18px", display:"flex", flexDirection:"column", gap:6 }}>
            <span style={{ fontFamily:DISPLAY, fontSize:23, fontWeight:700, color: m.accent ? OG : "var(--text)", fontVariantNumeric:"tabular-nums" }}>{m.value}</span>
            <span style={{ fontSize:12.5, color:"var(--muted)", fontWeight:600, lineHeight:1.3 }}>{m.label}</span>
          </div>
        ))}
      </div>

      {data.source === "live" && data.deduction_breakdown && (
        <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:9 }}>
          <div style={{ fontSize:14, fontWeight:800 }}>Automated contractual payout waterfall</div>
          <div style={{ fontSize:11.5, color:"var(--muted)", marginBottom:4 }}>Live Talabat sales × your saved commercial terms. These expectations update whenever you run the live check.</div>
          {[
            ["Gross product sales",data.deduction_breakdown.gross_sales,false],
            [`Talabat commission (${data.commercial_terms?.commission_rate_pct ?? data.commission_rate_pct}%)`,data.deduction_breakdown.commission,true],
            [`VAT on platform fees (${data.commercial_terms?.vat_on_fees_pct ?? 0}%)`,data.deduction_breakdown.vat_on_fees,true],
            [`Payment fees (${data.commercial_terms?.payment_fee_pct ?? 0}%)`,data.deduction_breakdown.payment_fees,true],
            ["Fixed order fees",data.deduction_breakdown.fixed_order_fees,true],
            ["Restaurant delivery contribution",data.deduction_breakdown.delivery_contribution,true],
          ].map(([label,value,deduction])=>(
            <div key={String(label)} style={{ display:"flex", justifyContent:"space-between", gap:12, fontSize:13 }}>
              <span style={{ color:"var(--muted)" }}>{label}</span>
              <span style={{ fontWeight:700, color:deduction && Number(value)>0?"#DC2626":"var(--text)" }}>{deduction && Number(value)>0?"−":""}{currency} {fmtMoney(Number(value),currency)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid var(--border)", paddingTop:10, fontSize:15, fontWeight:900 }}>
            <span>Expected restaurant payout</span><span style={{ color:GN }}>{currency} {fmtMoney(data.deduction_breakdown.expected_net,currency)}</span>
          </div>
        </div>
      )}

      {data.source === "live" && !!data.sale_lines?.length && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:14, fontWeight:800 }}>Expected payout by product sale</div>
          <div style={{ fontSize:11.5, color:"var(--muted)", margin:"3px 0 12px" }}>Order deductions are allocated proportionally to each product. If Talabat omits item details, the row is truthfully labelled “Order total.”</div>
          <div className="table-scroll"><table style={{ width:"100%", borderCollapse:"collapse", minWidth:820 }}>
            <thead><tr>{["Product / order","Qty","Gross","Commission","VAT + payment","Other","Expected net"].map((h,i)=><th key={h} style={{ padding:"9px", textAlign:i?"end":"start", fontSize:10.5, color:"var(--muted)", borderBottom:"1px solid var(--border)", textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>{data.sale_lines.map((line,i)=><tr key={`${line.order_id}-${line.sku ?? line.product_name}-${i}`}>
              <td style={{ padding:"10px 9px", borderBottom:"1px solid var(--border)" }}><div style={{ fontSize:12.5,fontWeight:700 }}>{line.product_name}</div><div style={{ fontSize:10.5,color:"var(--muted)" }}>{line.sku?`${line.sku} · `:""}{line.order_id}</div></td>
              {[line.quantity,line.gross_sale,line.commission,line.vat_on_fees+line.payment_fee,line.fixed_order_fee+line.delivery_contribution,line.expected_net].map((v,j)=><td key={j} style={{ padding:"10px 9px", textAlign:"end", borderBottom:"1px solid var(--border)", fontSize:12.5, fontWeight:j===5?800:500, color:j===5?GN:"var(--text)" }}>{j===0?v:`${currency} ${fmtMoney(v,currency)}`}</td>)}
            </tr>)}</tbody>
          </table></div>
        </div>
      )}

      {data.source === "upload" && !!data.rows_skipped && (
        <span style={{ fontSize:12, fontWeight:600, color:"#B45309" }}>
          {data.rows_skipped} / {data.rows_total} {t.payoutCheckRowsSkipped}
        </span>
      )}

      {data.brand && (
        <div style={{ fontSize:12.5, color:"var(--muted)", lineHeight:1.6,
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:9, padding:"10px 14px", display:"flex", flexDirection:"column", gap:3,
          animation:"pk-in .3s ease" }}>
          <span style={{ fontWeight:700, color:"var(--text)" }}>{t.payoutCheckPdfPreviewTitle}</span>
          <span>{data.brand} · {data.period_start}</span>
          {data.cancelled_orders != null && (
            <span>{t.payoutCheckPdfCancelled}: {currency} {fmtMoney(data.cancelled_gmv ?? 0, currency)} ({data.cancelled_orders})</span>
          )}
        </div>
      )}

      {data.effective_commission_pct != null && (
        <div style={{ background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:12, padding:"18px 22px", display:"flex", flexDirection:"column", gap:9,
          animation:"pk-in .3s ease", maxWidth:480 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"var(--text)", textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
            {t.payoutBreakdownTitle}
          </span>
          {[
            { label: t.payoutCheckSubtotal, value: data.sub_total_sum },
            { label: t.payoutBreakdownCommission, value: -(data.commission_amount ?? 0) },
            { label: t.payoutBreakdownCharges, value: -(data.additional_charges ?? 0) },
            { label: t.payoutBreakdownIncome, value: data.additional_income ?? 0 },
            ...(data.extra_line_items ?? []),
          ].map(li => (
            <div key={li.label} style={{ display:"flex", justifyContent:"space-between", gap:10, fontSize:13.5 }}>
              <span style={{ color:"var(--muted)" }}>{li.label}</span>
              <span style={{ fontWeight:600, color: li.value < 0 ? "#DC2626" : "var(--text)", fontVariantNumeric:"tabular-nums" }}>
                {li.value < 0 ? "−" : ""}{currency} {fmtMoney(Math.abs(li.value), currency)}
              </span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, fontSize:14, fontWeight:800,
            borderTop:"1px solid var(--border)", paddingTop:9 }}>
            <span>{t.payoutBreakdownTotal}</span>
            <span style={{ fontVariantNumeric:"tabular-nums" }}>{currency} {fmtMoney(data.expected_payout, currency)}</span>
          </div>
          {data.commission_rate_pct != null && (
            <div style={{ fontSize:12.5, color:"var(--muted)", paddingTop:2 }}>
              {t.payoutCheckAgreedVsEffective}: <span style={{ fontWeight:700, color:"var(--text)" }}>{data.commission_rate_pct}%</span>
              {" → "}
              <span style={{ fontWeight:700, color:OG }}>{data.effective_commission_pct}%</span>
            </div>
          )}
        </div>
      )}

      {data.unexplained_charge && (
        <div style={{ fontSize:12.5, color:"#B45309", lineHeight:1.6,
          background:"color-mix(in srgb,#B45309 8%,var(--surface))",
          border:"1px solid color-mix(in srgb,#B45309 28%,transparent)",
          borderRadius:9, padding:"10px 14px", display:"flex", alignItems:"flex-start", gap:8,
          animation:"pk-in .3s ease", maxWidth:480 }}>
          <span>⚠</span>
          <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <span>
              {t.payoutUnexplainedCharge1} <strong>{currency} {fmtMoney(data.unexplained_charge.amount, currency)}</strong> {t.payoutUnexplainedCharge2} <strong>{data.unexplained_charge.label}</strong> {t.payoutUnexplainedCharge3}
            </span>
            {!!data.order_count && (
              <span style={{ fontSize:11.5, opacity:0.85 }}>
                ≈ {currency} {(data.unexplained_charge.amount / data.order_count).toFixed(2)} {t.payoutUnexplainedChargeRateNote}
              </span>
            )}
            {!!data.charge_explainers?.length && (
              <span style={{ fontSize:11.5, opacity:0.85 }}>
                {t.payoutUnexplainedChargeChecked}: {data.charge_explainers.map(c => `${c.label} (${currency} ${fmtMoney(c.value, currency)})`).join(", ")} — {t.payoutUnexplainedChargeAllZero}
              </span>
            )}
          </span>
        </div>
      )}

      <div style={{ background:`color-mix(in srgb,${GN} 7%,var(--surface))`,
        border:`1px solid color-mix(in srgb,${GN} 26%,transparent)`,
        borderRadius:14, padding:"22px 26px", display:"flex", flexDirection:"column", gap:6,
        animation:"pk-in .3s ease", maxWidth:480 }}>
        <span style={{ fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>
          {t.payoutCheckExpectedLabel}
        </span>
        <span style={{ fontFamily:DISPLAY, fontSize:38, fontWeight:700, color:GN, fontVariantNumeric:"tabular-nums" }}>
          {currency} {fmtMoney(headlineAmount, currency)}
        </span>
        <span style={{ fontSize:12.5, color:"var(--muted)" }}>{t.payoutCheckHint}</span>
        {showAgreedDelta && (
          <span style={{ fontSize:12, color:"#DC2626", fontWeight:600, paddingTop:2 }}>
            {t.payoutCorrectedForAgreedRate1} {currency} {fmtMoney(data.expected_payout, currency)}
            {" — "}{currency} {fmtMoney(Math.abs(agreedDelta), currency)} {agreedDelta > 0 ? t.payoutShortfallSuffix : t.payoutSurplusSuffix}
          </span>
        )}
      </div>

      {data.source === "upload" && (
        <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6,
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:9, padding:"10px 14px" }}>
          {data.brand ? t.payoutCheckPdfNote
            : data.effective_commission_pct != null ? t.payoutCheckStatementNote
            : t.payoutCheckUploadNote}
        </div>
      )}

      {data.source === "live" && (
        <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6,
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:9, padding:"10px 14px" }}>
          {t.payoutCheckLiveEstimateNote}
        </div>
      )}
    </>
  );
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
  const [storeName, setStoreName] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [isDesktop, setIsDesktop] = useState(true);
  const [feed, setFeed] = useState<FeedRow[]>([]);
  type HeroStats = { has_activity:boolean; profits_protected_this_month:number; price_updates_this_month:number; price_updates_today:number; avg_margin_saved_pct:number|null; tracked_products:number; daily_series:number[] };
  const [heroStats, setHeroStats] = useState<HeroStats|null>(null);
  type DefendHealth = { state:"active"|"degraded"|"idle"|"not_monitored"; label:string; detail:string; connected_channels:number; recently_verified_channels:number; last_activity_at:string|null; last_success_at:string|null; recent_failures:number; checked_at:string };
  const [defendHealth, setDefendHealth] = useState<DefendHealth|null>(null);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<"all"|"risk"|"healthy"|"repriced">("all");
  const [productSort, setProductSort] = useState<"risk"|"name"|"price">("risk");
  const [productPage, setProductPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ImportedProduct|null>(null);
  const [productPriceDraft, setProductPriceDraft] = useState("");
  const [productPushStatus, setProductPushStatus] = useState<"idle"|"confirm"|"pushing"|"failed">("idle");
  const [cpPhase, setCpPhase] = useState<"idle"|"loading"|"result">("idle");
  const [cpInput, setCpInput] = useState("");
  const [cpPrompt, setCpPrompt] = useState("");
  const [cpObj, setCpObj] = useState<Record<string,unknown>|null>(null);
  const [cpChatMessage, setCpChatMessage] = useState<string|null>(null);
  const [cpOperationProducts, setCpOperationProducts] = useState<ImportedProduct[]>([]);
  const [cpOperationStatus, setCpOperationStatus] = useState<"idle"|"running"|"ready"|"publishing"|"complete"|"failed">("idle");
  const [cpOperationMessage, setCpOperationMessage] = useState<string|null>(null);
  const [applied, setApplied] = useState(false);
  const [rules, setRules] = useState<Rule[]>([
    { name:"Global margin floor", desc:"all products · all connected channels", floor:18, active:true, status:"active", scope:"global", maxChangePct:15, dailyChangePct:20, approvalAbovePct:10, cooldownHours:24, rollbackOnReject:true, stopOnStaleCost:true },
    { name:"Bakery margin defense", desc:"category: bakery · Doha + Riyadh", floor:25, active:false, status:"draft", scope:"category", maxChangePct:12, dailyChangePct:15, approvalAbovePct:8, cooldownHours:24, rollbackOnReject:true, stopOnStaleCost:true },
    { name:"Hot drinks storm floor",desc:"trigger: weather.rain_storm", floor:35, active:false, status:"testing", scope:"category", maxChangePct:10, dailyChangePct:12, approvalAbovePct:7, cooldownHours:12, rollbackOnReject:true, stopOnStaleCost:true },
  ]);
  const [persistedGlobalFloor, setPersistedGlobalFloor] = useState(18);
  const [rulePreviewIndex, setRulePreviewIndex] = useState<number|null>(null);
  const [ruleConfirmIndex, setRuleConfirmIndex] = useState<number|null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleStatusFilter, setRuleStatusFilter] = useState<"all"|RuleStatus>("all");
  const [ruleAudit, setRuleAudit] = useState<{ action:string; rule:string; at:string }[]>([]);
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
  type PayoutCheckData = PayoutResultLike & { period_start:string; period_end:string; classification?:PayoutCheckClassification };
  const [payoutTab, setPayoutTab]             = useState<"live"|"upload">("live");
  const [payoutLoading, setPayoutLoading]     = useState(false);
  const [payoutData, setPayoutData]           = useState<PayoutCheckData|null>(null);
  const [payoutError, setPayoutError]         = useState<string|null>(null);
  const [payoutUploadRate, setPayoutUploadRate] = useState("");
  const [approvedContract, setApprovedContract] = useState<ContractTerm|null>(null);

  // Commission Audit — populated whenever an upload batch includes at least
  // one daily-log document (even a batch of one, see commission-audit.ts).
  // payoutDocuments/auditResult are separate from payoutData: payoutData
  // still drives the single-document PayoutResultDetail view unchanged,
  // auditResult drives the new ledger/findings/chart panel underneath it.
  const [payoutDocuments, setPayoutDocuments] = useState<ClassifiedDocument[]>([]);
  const [auditResult, setAuditResult]         = useState<ReturnType<typeof reconcile>|null>(null);
  const [savingAudit, setSavingAudit]         = useState(false);
  const [auditSaved, setAuditSaved]           = useState(false);

  // Staged items — the incremental "add one at a time, describe it, then
  // Run Audit" flow. Each item is added (uploaded/entered) independently;
  // reconcile() only ever runs when the merchant explicitly hits Run Audit.
  // See PayoutUploadStaging.tsx for the StagedItem type definition.
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);

  // History tab — read-only lists pulled from payout-history.ts /
  // dispatch-history.ts via the same /api/channels/connect multiplex point
  // (see connect.ts's "history" branch). Fetched once per tab visit.
  type PayoutCheckHistoryRow = { id:string; source:"live"|"upload"; platform:string; order_count:number; sub_total_sum:number; commission_rate_pct:number; expected_payout:number; period_start:string|null; period_end:string|null; rows_skipped:number|null; rows_total:number|null; commission_amount:number|null; additional_charges:number|null; additional_income:number|null; effective_commission_pct:number|null; brand:string|null; cancelled_gmv:number|null; cancelled_orders:number|null; extra_line_items:{label:string;value:number}[]|null; unexplained_charge:{label:string;amount:number}|null; created_at:string };
  type RepricingHistoryRow = { id:string; sku:string|null; target_channel:string|null; old_price:number|null; new_price:number; currency:string; status:string; upstream_message:string|null; http_status:number|null; retry_count:number|null; duration_ms:number|null; audit_snapshot:Record<string,unknown>|null; created_at:string; completed_at:string|null };
  type PayoutAuditHistoryRow = { id:string; commission_rate_pct:number; document_count:number; documents:{file_name:string;document_type:string;order_count:number|null;sub_total_sum:number|null;description?:string|null;received_amount?:number|null}[]; findings:Finding[]; ledger:LedgerRow[]|null; ledger_totals:LedgerRow|null; period_start:string|null; period_end:string|null; created_at:string };
  const [historyPayoutChecks, setHistoryPayoutChecks] = useState<PayoutCheckHistoryRow[]>([]);
  const [historyRepricings, setHistoryRepricings]     = useState<RepricingHistoryRow[]>([]);
  const [historyPayoutAudits, setHistoryPayoutAudits] = useState<PayoutAuditHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading]           = useState(false);
  const [expandedPayoutCheckId, setExpandedPayoutCheckId] = useState<string|null>(null);
  const [expandedRepricingId, setExpandedRepricingId] = useState<string|null>(null);
  const [expandedPayoutAuditId, setExpandedPayoutAuditId] = useState<string|null>(null);
  const [confirmDeletePayoutId, setConfirmDeletePayoutId] = useState<string|null>(null);
  const [deletingPayoutId, setDeletingPayoutId]           = useState<string|null>(null);
  const [confirmDeleteRepricingId, setConfirmDeleteRepricingId] = useState<string|null>(null);
  const [deletingRepricingId, setDeletingRepricingId]           = useState<string|null>(null);
  const [confirmDeletePayoutAuditId, setConfirmDeletePayoutAuditId] = useState<string|null>(null);
  const [deletingPayoutAuditId, setDeletingPayoutAuditId]           = useState<string|null>(null);

  const deleteHistoryRecord = async (action: "delete_payout_check" | "delete_repricing" | "delete_payout_audit", id: string): Promise<boolean> => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return false;
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "history", action, id }),
      });
      const data = await res.json() as { ok?: boolean };
      return res.ok && !!data.ok;
    } catch {
      return false;
    }
  };

  const handleDeletePayoutCheck = async (id: string) => {
    setConfirmDeletePayoutId(null);
    setDeletingPayoutId(id);
    const ok = await deleteHistoryRecord("delete_payout_check", id);
    if (ok) setHistoryPayoutChecks(prev => prev.filter(r => r.id !== id));
    else showToast("Could not delete that record. Please try again.");
    setDeletingPayoutId(null);
  };

  const handleDeleteRepricing = async (id: string) => {
    setConfirmDeleteRepricingId(null);
    setDeletingRepricingId(id);
    const ok = await deleteHistoryRecord("delete_repricing", id);
    if (ok) setHistoryRepricings(prev => prev.filter(r => r.id !== id));
    else showToast("Could not delete that record. Please try again.");
    setDeletingRepricingId(null);
  };

  const handleDeletePayoutAudit = async (id: string) => {
    setConfirmDeletePayoutAuditId(null);
    setDeletingPayoutAuditId(id);
    const ok = await deleteHistoryRecord("delete_payout_audit", id);
    if (ok) setHistoryPayoutAudits(prev => prev.filter(r => r.id !== id));
    else showToast("Could not delete that record. Please try again.");
    setDeletingPayoutAuditId(null);
  };

  const [downloadingHistoryPdf, setDownloadingHistoryPdf] = useState(false);
  const handleDownloadHistoryPdf = async () => {
    if (downloadingHistoryPdf) return;
    setDownloadingHistoryPdf(true);
    try {
      const { exportPayoutHistoryPdf } = await import("@/components/dashboard/payout/exportPayoutReportPdf");
      await exportPayoutHistoryPdf(historyPayoutChecks, historyRepricings, currency);
    } catch (err) {
      console.error("Payout history PDF export failed:", err);
    } finally {
      setDownloadingHistoryPdf(false);
    }
  };

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

    Promise.all([call("payout_checks"), call("repricings"), call("payout_audits")])
      .then(([payoutRes, repriceRes, auditRes]) => {
        setHistoryPayoutChecks((payoutRes?.items ?? []) as PayoutCheckHistoryRow[]);
        setHistoryRepricings((repriceRes?.items ?? []) as RepricingHistoryRow[]);
        setHistoryPayoutAudits((auditRes?.items ?? []) as PayoutAuditHistoryRow[]);
      })
      .finally(() => setHistoryLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "analytics" && tab !== "rules") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setCatalogLoading(true);
    if (tab === "analytics") {
      fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "dashboard_stats" }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.ok) setHeroStats(d as HeroStats); })
        .catch(() => {});
    }
    const params = new URLSearchParams({ merchant_id: mid, access_code: ac });
    fetch(`/api/repricing/catalog?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setImportedProducts((d?.products ?? []) as ImportedProduct[]))
      .catch(() => setImportedProducts([]))
      .finally(() => setCatalogLoading(false));
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    const loadHealth = () => {
      const mid = localStorage.getItem("ps_merchant_id") ?? "";
      const ac = localStorage.getItem("ps_access_code") ?? "";
      if (!mid || !ac) {
        if (!cancelled) setDefendHealth({ state:"not_monitored", label:"Defend Loop not monitored", detail:"Connect a supported channel to begin monitoring", connected_channels:0, recently_verified_channels:0, last_activity_at:null, last_success_at:null, recent_failures:0, checked_at:new Date().toISOString() });
        return;
      }
      fetch("/api/channels/connect", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ merchant_id:mid, access_code:ac, platform:"defend_loop_health" }),
      }).then(r => r.ok ? r.json() : null)
        .then(data => { if (!cancelled && data?.ok) setDefendHealth(data as DefendHealth); })
        .catch(() => { if (!cancelled) setDefendHealth(null); });
    };
    loadHealth();
    const timer = window.setInterval(loadHealth, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

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
        setPersistedGlobalFloor(pct);
        setRules(prev => prev.map(r => r.name === "Global margin floor" ? { ...r, floor: pct, status:"active", active:true } : r));
      })
      .catch(() => {})
      .finally(() => { marginFloorLoadedRef.current = true; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slider edits remain drafts. A live floor is changed only through the
  // preview → confirm → activate workflow below.

  useEffect(() => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    if (!mid) return;
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(mid)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { store_name?: string | null } | null) => {
        if (d?.store_name) setStoreName(d.store_name);
      })
      .catch(() => {});
  }, []);

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

  const editRule = (index:number, patch:Partial<Rule>) => {
    setRules(current => current.map((rule,i) => i === index
      ? { ...rule, ...patch, active:false, status:"draft" }
      : rule));
    setRulePreviewIndex(null);
    setRuleConfirmIndex(null);
  };

  const saveRuleDraft = (index:number) => {
    const rule = rules[index];
    if (!rule) return;
    const drafts = JSON.parse(localStorage.getItem("ps_margin_rule_drafts") ?? "[]") as Rule[];
    const next = [...drafts.filter(item=>item.name!==rule.name), { ...rule, status:"draft" as RuleStatus, active:false }];
    localStorage.setItem("ps_margin_rule_drafts", JSON.stringify(next));
    setRules(current=>current.map((item,i)=>i===index?{...item,status:"draft",active:false}:item));
    setRuleAudit(current=>[{action:"Draft saved",rule:rule.name,at:new Date().toISOString()},...current].slice(0,12));
    showToast("Draft saved. No live pricing behavior changed.");
  };

  const previewRule = (index:number) => {
    setRulePreviewIndex(index);
    setRuleConfirmIndex(null);
    setRules(current=>current.map((item,i)=>i===index?{...item,status:"testing",active:false}:item));
    const rule = rules[index];
    if (rule) setRuleAudit(current=>[{action:"Impact preview run",rule:rule.name,at:new Date().toISOString()},...current].slice(0,12));
  };

  const activateRule = async (index:number) => {
    const rule = rules[index];
    if (!rule) return;
    if (rule.scope !== "global") {
      showToast("This rule remains in Testing until category and event enforcement is connected.");
      return;
    }
    if (ruleConfirmIndex !== index) {
      setRuleConfirmIndex(index);
      return;
    }
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return showToast("Your merchant session could not be found.");
    setRuleSaving(true);
    try {
      const response = await fetch("/api/channels/connect", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({merchant_id:mid,access_code:ac,platform:"margin_floor",action:"set",margin_floor_pct:rule.floor/100}),
      });
      if (!response.ok) throw new Error("Activation failed");
      setPersistedGlobalFloor(rule.floor);
      setRules(current=>current.map((item,i)=>i===index?{...item,status:"active",active:true}:item));
      setRuleConfirmIndex(null);
      setRulePreviewIndex(null);
      setRuleAudit(current=>[{action:`Activated from ${persistedGlobalFloor}% to ${rule.floor}%`,rule:rule.name,at:new Date().toISOString()},...current].slice(0,12));
      showToast(`Global margin floor activated at ${rule.floor}%.`);
    } catch {
      setRules(current=>current.map((item,i)=>i===index?{...item,status:"failed",active:false}:item));
      showToast("Activation failed. The previous live policy remains unchanged.");
    } finally {
      setRuleSaving(false);
    }
  };

  const productPageSize = 8;
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return importedProducts
      .filter(product => {
        if (query && !`${product.name_en} ${product.name_ar} ${product.sku} ${product.source_platform}`.toLowerCase().includes(query)) return false;
        if (productFilter === "risk") return product.floor_breached;
        if (productFilter === "healthy") return !product.floor_breached;
        if (productFilter === "repriced") return product.status === "repriced";
        return true;
      })
      .sort((a,b) => {
        if (productSort === "name") return (a.name_en || a.sku).localeCompare(b.name_en || b.sku);
        if (productSort === "price") return b.current_price - a.current_price;
        return Number(b.floor_breached) - Number(a.floor_breached)
          || Math.abs(b.recommended_price - b.current_price) - Math.abs(a.recommended_price - a.current_price);
      });
  }, [importedProducts, productFilter, productSearch, productSort]);
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const visibleProducts = filteredProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize);

  useEffect(() => setProductPage(1), [productFilter, productSearch, productSort]);
  useEffect(() => {
    if (productPage > productPageCount) setProductPage(productPageCount);
  }, [productPage, productPageCount]);

  const openProduct = (product: ImportedProduct) => {
    setSelectedProduct(product);
    setProductPriceDraft(String(product.recommended_price));
    setProductPushStatus("idle");
  };

  const pushSelectedProductPrice = async () => {
    if (!selectedProduct) return;
    const targetPrice = Number(productPriceDraft);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      showToast("Enter a valid price greater than zero.");
      return;
    }
    if (productPushStatus !== "confirm") {
      setProductPushStatus("confirm");
      return;
    }
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) {
      showToast("Your session could not be found. Reopen PrizeSkout from Zid.");
      return;
    }
    setProductPushStatus("pushing");
    try {
      const response = await fetch("/api/repricing/apply", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          merchant_id:merchantId,
          access_code:accessCode,
          ingest_event_id:selectedProduct.ingest_event_id,
          target_price:targetPrice,
        }),
      });
      const result = await response.json() as { ok?:boolean; error?:string; message?:string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? result.message ?? "Price update failed");
      setImportedProducts(products => products.map(product =>
        product.ingest_event_id === selectedProduct.ingest_event_id
          ? { ...product, current_price:targetPrice, status:"repriced" }
          : product
      ));
      setSelectedProduct(product => product ? { ...product, current_price:targetPrice, status:"repriced" } : product);
      setProductPushStatus("idle");
      showToast(`Price updated successfully in ${selectedProduct.source_platform}.`);
    } catch (error) {
      setProductPushStatus("failed");
      showToast(error instanceof Error ? error.message : "Price update failed.");
    }
  };

  const runCopilot = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || cpPhase === "loading") return;
    const previousOperation = cpObj?._type === "operation" ? cpObj : null;
    const previousProducts = cpOperationProducts.map(product => ({
      name:product.name_en || product.name_ar,
      sku:product.sku,
      platform:product.source_platform,
    }));
    setCpPhase("loading"); setCpPrompt(prompt); setApplied(false); setCpError(null);
    setCpObj(null); setCpChatMessage(null); setCpOperationProducts([]); setCpOperationStatus("idle"); setCpOperationMessage(null);
    setCpInput("");
    try {
      const res  = await fetch("/api/copilot/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          ...(previousOperation ? {
            context:{
              previous_operation:previousOperation,
              products:previousProducts,
            },
          } : {}),
        }),
      });
      let data: { type?: string; rule?: Record<string,unknown>; operation?: Record<string,unknown>; message?: string; error?: string } = {};
      try { data = await res.json() as typeof data; } catch { /* non-JSON body */ }
      if (!res.ok) {
        setCpError(data.error ?? `Server error (${res.status}) — the route may still be deploying. Try again in a moment.`);
        setCpPhase("idle");
        return;
      }
      if (data.type === "operation" && data.operation) {
        const operation = { ...data.operation, _type:"operation" };
        setCpObj(operation);
        setCpChatMessage(null);
        setCpPhase("result");
        await prepareCopilotOperation(operation);
      } else if (data.type === "chat" && data.message) {
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

  const matchCopilotProducts = (operation: Record<string,unknown>, products = importedProducts) => {
    const query = String(operation.query ?? operation.sku ?? "").trim().toLowerCase();
    const platform = String(operation.platform ?? "all").toLowerCase();
    const category = String(operation.category ?? "").trim().toLowerCase();
    return products.filter(product => {
      const platformMatch = platform === "all" || product.source_platform.toLowerCase() === platform;
      const haystack = `${product.name_en} ${product.name_ar} ${product.sku} ${product.item_id}`.toLowerCase();
      const queryMatch = !query || haystack.includes(query);
      const categoryMatch = !category || haystack.includes(category);
      return platformMatch && queryMatch && categoryMatch;
    });
  };

  const fetchCopilotCatalog = async (): Promise<ImportedProduct[]> => {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) throw new Error("Reopen PrizeSkout from Zid to restore your merchant session.");
    const params = new URLSearchParams({ merchant_id:merchantId, access_code:accessCode });
    const response = await fetch(`/api/repricing/catalog?${params}`);
    const data = await response.json() as { products?:ImportedProduct[]; error?:string };
    if (!response.ok) throw new Error(data.error ?? "Could not load the catalogue.");
    const products = data.products ?? [];
    setImportedProducts(products);
    return products;
  };

  const prepareCopilotOperation = async (operation: Record<string,unknown>) => {
    const op = String(operation.operation ?? "");
    setCpOperationStatus("running");
    try {
      let products = importedProducts;
      if (op === "sync_catalog") {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
        const accessCode = localStorage.getItem("ps_access_code") ?? "";
        const platform = String(operation.platform ?? "zid").toLowerCase();
        const response = await fetch("/api/channels/connect", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ merchant_id:merchantId, access_code:accessCode, platform:"copilot_operation", action:"sync_catalog", source_platform:platform === "all" ? "zid" : platform }),
        });
        const data = await response.json() as { ok?:boolean; error?:string; result?:{items_found:number;items_stored:number;items_below_floor:number;errors:number} };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "Catalogue sync failed.");
        products = await fetchCopilotCatalog();
        const r = data.result;
        setCpOperationMessage(`Catalogue synchronized: ${r?.items_found ?? products.length} found, ${r?.items_stored ?? products.length} stored, ${r?.items_below_floor ?? 0} below the margin floor${r?.errors ? `, ${r.errors} errors` : ""}.`);
      } else {
        products = await fetchCopilotCatalog();
        const matches = matchCopilotProducts(operation, products);
        setCpOperationProducts(matches);
        setCpOperationMessage(matches.length
          ? `${matches.length} product${matches.length === 1 ? "" : "s"} matched. Review the details below.`
          : "No matching products were found. Try a product name, SKU, or a broader request.");
      }
      if (op === "sync_catalog") setCpOperationProducts(matchCopilotProducts(operation, products));
      setCpOperationStatus("ready");
    } catch (error) {
      setCpOperationStatus("failed");
      setCpOperationMessage(error instanceof Error ? error.message : "The operation could not be completed.");
    }
  };

  const publishCopilotPrices = async () => {
    if (!cpObj || cpOperationProducts.length === 0 || cpOperationStatus === "publishing") return;
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    setCpOperationStatus("publishing");
    let succeeded = 0;
    const failures:string[] = [];
    for (const product of cpOperationProducts) {
      const mode = String(cpObj.price_mode ?? "recommended");
      const fixed = Number(cpObj.target_price);
      const pct = Number(cpObj.percentage_change);
      const targetPrice = mode === "fixed" && fixed > 0 ? fixed
        : mode === "percentage_change" && Number.isFinite(pct) ? product.current_price * (1 + pct / 100)
        : product.recommended_price;
      try {
        const response = await fetch("/api/repricing/apply", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ merchant_id:merchantId, access_code:accessCode, ingest_event_id:product.ingest_event_id, target_price:Math.round(targetPrice * 100) / 100 }),
        });
        const result = await response.json() as { ok?:boolean; error?:string; message?:string };
        if (!response.ok || !result.ok) throw new Error(result.error ?? result.message ?? "Rejected");
        succeeded++;
      } catch (error) {
        failures.push(`${product.name_en || product.sku}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    await fetchCopilotCatalog().catch(() => {});
    setCpOperationStatus(failures.length ? "failed" : "complete");
    setCpOperationMessage(`${succeeded} of ${cpOperationProducts.length} live price update${cpOperationProducts.length === 1 ? "" : "s"} succeeded.${failures.length ? ` ${failures.length} failed: ${failures.slice(0,2).join("; ")}` : ""}`);
  };

  const applyConfig = () => {
    if (applied || !cpObj) return;
    const policyType = String(cpObj.policy_type ?? cpObj.engine_rule ?? "policy_draft");
    const policyNames:Record<string,string> = {
      margin_floor:"Margin floor",
      approval_threshold:"Manual approval threshold",
      stale_cost_guard:"Stale cost protection",
      maximum_price_change:"Maximum price change",
      competitor_match:"Competitor price match",
      conditional_floor:"Conditional margin floor",
      legal_ceiling:"Legal price ceiling",
      channel_parity:"Channel price parity",
    };
    const name = policyNames[policyType] ?? policyType.split("_").map((w:string) => w[0].toUpperCase()+w.slice(1)).join(" ");
    const channels = Array.isArray(cpObj.channels) ? cpObj.channels.map(String) : [];
    const desc = String(cpObj.summary
      ?? `${cpObj.target_category || cpObj.target_sku_class || "all products"}${channels.length ? ` · ${channels.join(", ")}` : " · all channels"}`);
    setApplied(true);
    const compiledFloor = typeof cpObj.minimum_floor === "number" ? cpObj.minimum_floor : null;
    const approvalThreshold = typeof cpObj.approval_threshold_pct === "number" ? cpObj.approval_threshold_pct : null;
    const maximumChange = typeof cpObj.maximum_change_pct === "number" ? cpObj.maximum_change_pct : null;
    setRules(prev => [...prev, {
      name, desc, floor:compiledFloor != null && Number.isFinite(compiledFloor) ? Math.round(compiledFloor*100) : persistedGlobalFloor, active:false,
      status:"draft", scope:channels.length ? "channel" : cpObj.target_category && cpObj.target_category !== "all" ? "category" : "global",
      maxChangePct:maximumChange != null && Number.isFinite(maximumChange) ? Math.round(maximumChange*100) : 15,
      dailyChangePct:20,
      approvalAbovePct:approvalThreshold != null && Number.isFinite(approvalThreshold) ? Math.round(approvalThreshold*100) : 10,
      cooldownHours:24,
      rollbackOnReject:true, stopOnStaleCost:Boolean(cpObj.stop_on_stale_cost),
    }]);
    showToast("Rule draft created. Preview its impact before activation.");
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
    setPayoutDocuments([]); setAuditResult(null); setStagedItems([]); setAuditSaved(false);
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

  // Parses one uploaded file into a PayoutCheckData without touching any
  // component state — a pure fetch, so addFileItems can call it in a
  // sequential loop (not Promise.all, so per-item status is possible and
  // the server never gets a burst of concurrent uploads). `description`,
  // when non-empty, is interpreted server-side by upload-classifier.ts.
  const uploadOneFile = async (
    file: File, mid: string, ac: string, rate: number, platform: string, description: string,
  ): Promise<{ ok: true; result: PayoutCheckData } | { ok: false; error: string }> => {
    try {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
      const isXlsx = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
        || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        || file.type === "application/vnd.ms-excel";
      const body: Record<string, unknown> = { merchant_id: mid, access_code: ac, platform: "talabat_expected_payout", action: "upload", commission_rate_pct: rate, upload_platform: platform };
      if (description.trim()) body.description = description.trim();
      if (isPdf) {
        const { extractPdfText } = await import("@/lib/pdf-text");
        body.file_kind = "pdf";
        body.pdf_text = await extractPdfText(file);
      } else if (isXlsx) {
        const { extractXlsxAsCsv } = await import("@/lib/xlsx-text");
        body.csv_text = await extractXlsxAsCsv(file);
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
        return { ok: false, error: data.error ?? "Could not read that file." };
      }
      return { ok: true, result: data };
    } catch {
      return { ok: false, error: "Could not read that file." };
    }
  };

  // Adds 1..N files to the staged list, one at a time (sequential, not
  // Promise.all — same reasoning as before: per-item status, no server
  // burst). Each file's document_type is always set by the deterministic
  // classifyResult() (structural, 100% reliable) — the LLM classification
  // returned alongside is shown as a caption/mismatch flag only, never used
  // to set the type. See commission-audit.ts / upload-classifier.ts.
  const addFileItems = async (files: FileList, description: string, platform: string) => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) { showToast("Please connect your store first."); return; }
    const rate = Number(payoutUploadRate);
    if (!(rate > 0 && rate < 100)) {
      setPayoutError("Enter a valid commission rate (e.g. 19) before adding a file.");
      return;
    }
    setPayoutError(null);

    for (const file of Array.from(files)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setStagedItems(prev => [...prev, { id, kind: "file", label: file.name, description, platform, status: "uploading" }]);
      const outcome = await uploadOneFile(file, mid, ac, rate, platform, description);
      setStagedItems(prev => prev.map(it => {
        if (it.id !== id) return it;
        if (!outcome.ok) return { ...it, status: "error", error: outcome.error };
        const documentType = classifyResult(outcome.result);
        return {
          ...it,
          status: "done",
          classification: outcome.result.classification,
          classifiedDoc: {
            id, file_name: file.name, document_type: documentType, result: outcome.result,
            description: description || undefined,
            platform_guess: outcome.result.classification?.ok ? outcome.result.classification.classification.platform : null,
          },
        };
      }));
    }
  };

  // Adds a manual "what I actually received" entry — never a parsed file
  // (see commission-audit.ts header comment for why). document_type is
  // always "merchant_received" here, set directly — never LLM-driven.
  const addManualItem = async (description: string, amount: string, periodStart: string, periodEnd: string, platform: string, evidence: {
    transactionDate:string; bankReference:string; depositType:string; currency:string; fileName?:string; sha256?:string;
  }) => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) { showToast("Please connect your store first."); return; }
    if (!(Number(amount) > 0)) { setPayoutError("Enter a valid amount for the manual entry."); return; }
    if (!periodStart || !periodEnd) { setPayoutError("Enter a start and end date for the manual entry."); return; }
    if (!evidence.transactionDate) { setPayoutError("Enter the date the deposit appeared on the bank statement."); return; }
    setPayoutError(null);

    const id = `${Date.now()}-manual`;
    setStagedItems(prev => [...prev, { id, kind: "manual", label: `${t.payoutManualEntryLabel} — ${periodStart} to ${periodEnd}`, description, platform, status: "uploading" }]);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid, access_code: ac, platform: "talabat_expected_payout", action: "manual_entry",
          description, amount, period_start: periodStart, period_end: periodEnd, upload_platform: platform,
          bank_transaction_date: evidence.transactionDate, bank_reference: evidence.bankReference,
          deposit_type: evidence.depositType, currency: evidence.currency,
          evidence_file_name: evidence.fileName, evidence_sha256: evidence.sha256,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; received_amount?: number; period_start?: string; period_end?: string; platform?: string|null; classification?: PayoutCheckClassification; bank_transaction_date?:string; bank_reference?:string; deposit_type?:string; currency?:string; evidence_file_name?:string; evidence_sha256?:string; evidence_level?:"manual_assertion"|"document_supported" };
      if (!res.ok || !data.ok) {
        setStagedItems(prev => prev.map(it => it.id !== id ? it : { ...it, status: "error", error: data.error ?? "Could not save that entry." }));
        return;
      }
      setStagedItems(prev => prev.map(it => it.id !== id ? it : {
        ...it, status: "done", classification: data.classification,
        classifiedDoc: {
          id, file_name: it.label, document_type: "merchant_received",
          description: description || undefined, platform_guess: data.platform ?? null,
          result: {
            received_amount: data.received_amount, period_start: data.period_start, period_end: data.period_end,
            bank_transaction_date:data.bank_transaction_date, bank_reference:data.bank_reference,
            deposit_type:data.deposit_type, currency:data.currency, evidence_file_name:data.evidence_file_name,
            evidence_sha256:data.evidence_sha256, evidence_level:data.evidence_level,
          },
        },
      }));
    } catch {
      setStagedItems(prev => prev.map(it => it.id !== id ? it : { ...it, status: "error", error: "Network error — try again." }));
    }
  };

  // Lets the merchant correct a misdetected type before running the audit —
  // the safety net for whenever the structural/LLM classification disagrees
  // with what the merchant actually meant.
  const correctStagedDocumentType = (id: string, newType: DocumentType) =>
    setStagedItems(prev => prev.map(it => it.id !== id || !it.classifiedDoc ? it : { ...it, classifiedDoc: { ...it.classifiedDoc, document_type: newType } }));

  // Explicit, disclosed override: the merchant asserts a daily log's Sales
  // is already net of commission, so the ledger should not deduct it again.
  // See commission-audit.ts's reconcile() for how this is applied and
  // surfaced — never silently, always with a visible disclosure.
  const toggleNetSalesOverride = (id: string, value: boolean) =>
    setStagedItems(prev => prev.map(it => it.id !== id || !it.classifiedDoc ? it : { ...it, classifiedDoc: { ...it.classifiedDoc, treat_sales_as_net: value } }));

  const removeStagedItem = (id: string) => setStagedItems(prev => prev.filter(it => it.id !== id));

  // The only place reconcile() is now invoked — replaces the old
  // auto-run-on-upload behavior. Preserves the existing single-item fast
  // path (PayoutResultDetail only, unchanged) when exactly one non-
  // merchant_received item is staged.
  const runStagedAudit = () => {
    const classified = stagedItems
      .filter((it): it is StagedItem & { classifiedDoc: ClassifiedDocument } => it.status === "done" && !!it.classifiedDoc)
      .map(it => it.classifiedDoc);
    if (classified.length === 0) return;
    const rate = Number(payoutUploadRate) || 0;
    setPayoutDocuments(classified);
    setAuditSaved(false);
    if (classified.length === 1 && classified[0].document_type !== "merchant_received") {
      setPayoutData(classified[0].result as PayoutCheckData);
    } else {
      setPayoutData(null);
    }
    setAuditResult(reconcile(classified, rate));
  };

  const handleSaveAudit = async () => {
    if (!auditResult || savingAudit || auditSaved) return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac  = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setSavingAudit(true);
    try {
      const documents = payoutDocuments.map(d => ({
        file_name: d.file_name,
        document_type: d.document_type,
        order_count: d.result.order_count ?? null,
        sub_total_sum: d.result.sub_total_sum ?? null,
        description: d.description ?? null,
        received_amount: d.result.received_amount ?? null,
      }));
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid, access_code: ac, platform: "history", action: "save_payout_audit",
          commission_rate_pct: Number(payoutUploadRate) || 0,
          documents, findings: auditResult.findings,
          ledger: auditResult.ledger, ledger_totals: auditResult.ledgerTotals,
          period_start: auditResult.coverage?.start ?? null,
          period_end: auditResult.coverage?.end ?? null,
        }),
      });
      const data = await res.json() as { ok?: boolean };
      if (res.ok && data.ok) setAuditSaved(true);
      else showToast("Could not save that audit. Please try again.");
    } catch {
      showToast("Could not save that audit. Please try again.");
    } finally {
      setSavingAudit(false);
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
            <div role="status" onClick={()=>setTab("vault")} title={defendHealth ? `Checked ${new Date(defendHealth.checked_at).toLocaleTimeString()}` : "Checking live operational signals"}
              style={{ border:`1px solid color-mix(in srgb,${defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B"} 30%,transparent)`,
              background:`color-mix(in srgb,${defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B"} 7%,var(--surface))`,
              borderRadius:12, padding:"13px 14px", display:"flex", gap:11, alignItems:"flex-start", cursor:"pointer" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B", marginTop:5, animation:defendHealth?.state==="active"?"pk-pulse 2s infinite":"none" }} />
              <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:15, fontWeight:700, color:defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B" }}>{defendHealth?.label ?? "Checking Defend Loop"}</span>
                <span style={{ fontSize:11.5, lineHeight:1.45, color:"var(--muted)" }}>{defendHealth?.detail ?? "Reading live channel and dispatch signals…"}</span>
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:11, paddingInline:4 }}>
              <span style={{ width:34, height:34, borderRadius:"50%", background:"var(--surface)",
                border:"1px solid var(--border)", display:"grid", placeItems:"center",
                fontSize:13, fontWeight:700, fontFamily:MONO }}>{(storeName || "M").charAt(0).toUpperCase()}</span>
              <span style={{ fontSize:15.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{storeName || t.myAccount}</span>
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
        {selectedProduct && (
          <div role="presentation" onMouseDown={event=>{ if (event.target === event.currentTarget) setSelectedProduct(null); }}
            style={{ position:"fixed", inset:0, zIndex:1200, background:"rgba(15,23,42,.48)",
              backdropFilter:"blur(3px)", display:"flex", justifyContent:"flex-end" }}>
            <section role="dialog" aria-modal="true" aria-label={`Product details for ${selectedProduct.name_en || selectedProduct.sku}`}
              style={{ width:"min(560px,100%)", height:"100%", overflowY:"auto", background:"var(--surface)",
                color:"var(--text)", boxShadow:"-18px 0 60px rgba(15,23,42,.22)", padding:"26px",
                animation:"pk-in .2s ease" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
                <div>
                  <div style={{ color:OG, fontSize:11.5, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em" }}>
                    {selectedProduct.source_platform} product
                  </div>
                  <h2 style={{ margin:"8px 0 4px", fontSize:27, lineHeight:1.2 }}>
                    {lang === "ar" && selectedProduct.name_ar ? selectedProduct.name_ar : selectedProduct.name_en || selectedProduct.sku}
                  </h2>
                  <div style={{ fontFamily:MONO, fontSize:12, color:"var(--muted)" }}>SKU {selectedProduct.sku}</div>
                </div>
                <button type="button" onClick={()=>setSelectedProduct(null)} aria-label="Close product details"
                  style={{ width:38, height:38, borderRadius:10, border:"1px solid var(--border)",
                    background:"var(--surface2)", color:"var(--text)", cursor:"pointer", fontSize:21 }}>×</button>
              </div>

              <div style={{ marginTop:24, padding:"16px", borderRadius:12,
                border:`1px solid ${selectedProduct.floor_breached ? "color-mix(in srgb,#DC2626 35%,var(--border))" : "var(--border)"}`,
                background:selectedProduct.floor_breached ? "color-mix(in srgb,#DC2626 5%,var(--surface))" : "var(--surface2)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <span style={{ color:selectedProduct.floor_breached ? "#DC2626" : GN, fontWeight:800 }}>
                    {selectedProduct.floor_breached ? "Action recommended: below margin floor" : "Margin is currently healthy"}
                  </span>
                  <span style={{ color:"var(--muted)", fontSize:12, textTransform:"capitalize" }}>{selectedProduct.status.replace(/_/g," ")}</span>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:18 }}>
                {[
                  ["Current price",`${selectedProduct.current_price.toLocaleString()} ${selectedProduct.currency}`],
                  ["Recommended price",`${selectedProduct.recommended_price.toLocaleString(undefined,{maximumFractionDigits:2})} ${selectedProduct.currency}`],
                  ["Price change",selectedProduct.current_price ? `${((selectedProduct.recommended_price-selectedProduct.current_price)/selectedProduct.current_price*100).toFixed(1)}%` : "—"],
                  ["Calculated net margin",selectedProduct.net_margin_pct == null ? "—" : `${(selectedProduct.net_margin_pct*100).toFixed(1)}%`],
                ].map(([label,value])=>(
                  <div key={label} style={{ border:"1px solid var(--border)", borderRadius:11, padding:"14px", background:"var(--surface2)" }}>
                    <div style={{ fontSize:10.5, textTransform:"uppercase", color:"var(--muted)" }}>{label}</div>
                    <div style={{ marginTop:5, fontSize:19, fontWeight:800 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:22, borderTop:"1px solid var(--border)", paddingTop:20 }}>
                <h3 style={{ margin:"0 0 5px", fontSize:17 }}>Review price update</h3>
                <p style={{ margin:"0 0 14px", color:"var(--muted)", fontSize:13.5, lineHeight:1.55 }}>
                  The recommended price is prefilled. You can enter a different amount before sending it to {selectedProduct.source_platform}.
                </p>
                <label style={{ display:"block", fontSize:11.5, fontWeight:700, color:"var(--muted)", textTransform:"uppercase" }}>
                  New price ({selectedProduct.currency})
                </label>
                <input type="number" min="0.01" step="0.01" value={productPriceDraft}
                  onChange={event=>{ setProductPriceDraft(event.target.value); setProductPushStatus("idle"); }}
                  style={{ width:"100%", marginTop:7, boxSizing:"border-box", border:"1px solid var(--border)",
                    borderRadius:10, padding:"12px 13px", background:"var(--surface2)", color:"var(--text)",
                    fontFamily:MONO, fontSize:18, fontWeight:700 }} />
                {productPushStatus === "confirm" && (
                  <div style={{ marginTop:12, color:"#B45309", background:"color-mix(in srgb,#F59E0B 10%,var(--surface))",
                    border:"1px solid color-mix(in srgb,#F59E0B 30%,var(--border))", borderRadius:9, padding:"10px 12px", fontSize:12.5 }}>
                    Confirm this live price change. Clicking the button again will update the product in {selectedProduct.source_platform}.
                  </div>
                )}
                {productPushStatus === "failed" && (
                  <div style={{ marginTop:12, color:"#DC2626", fontSize:12.5 }}>The update was not applied. Review the price and try again.</div>
                )}
                <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:16 }}>
                  <button type="button" onClick={()=>setSelectedProduct(null)}
                    style={{ border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)",
                      borderRadius:9, padding:"11px 15px", cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Cancel</button>
                  <button type="button" disabled={productPushStatus==="pushing"} onClick={pushSelectedProductPrice}
                    style={{ border:"none", background:productPushStatus==="confirm" ? "#B45309" : OG, color:"#fff",
                      borderRadius:9, padding:"11px 16px", cursor:productPushStatus==="pushing"?"wait":"pointer",
                      fontFamily:"inherit", fontWeight:800 }}>
                    {productPushStatus==="pushing" ? "Updating…" : productPushStatus==="confirm" ? `Confirm update in ${selectedProduct.source_platform}` : "Review price update"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

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
                    <span style={{ fontFamily:DISPLAY, fontSize:18.5, fontWeight:500, color: heroStats?.has_activity ? "var(--text)" : "var(--muted)" }}>{currency}</span>
                    <span style={{ fontFamily:DISPLAY, fontSize:62, fontWeight:700, lineHeight:1, color: heroStats?.has_activity ? GN : "var(--muted)", fontVariantNumeric:"tabular-nums" }}>
                      {heroStats?.has_activity ? fmtMoney(heroStats.profits_protected_this_month, currency) : "—"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize:15, color:"var(--muted)" }}>
                  {heroStats?.has_activity
                    ? `${heroStats.price_updates_this_month} ${t.profDefensesLabel}`
                    : t.profNoActivity}
                </div>
                {/* Sparkline: real daily-bucketed profit-protected totals when
                    available, a flat dim placeholder otherwise. */}
                <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:70, marginTop:6, opacity: heroStats?.has_activity ? 1 : .18 }}>
                  {(heroStats?.daily_series ?? Array.from({length:33}).map(()=>0)).map((v,i) => {
                    const max = Math.max(1, ...(heroStats?.daily_series ?? [1]));
                    return (
                      <span key={i} style={{ flex:1, borderRadius:"3px 3px 0 0", height: Math.max(4, (v / max) * 70),
                        background:`color-mix(in srgb,${OG} ${v > 0 ? 85 : 40}%,var(--surface))` }} />
                    );
                  })}
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                gap:18, gridColumn:"span 2", minWidth:"min(100%,420px)", alignContent:"stretch" }}>
                {[
                  { label:"Tracked Products",
                    value: heroStats?.has_activity ? String(heroStats.tracked_products) : "—",
                    foot: heroStats?.has_activity ? t.profTrackedFoot : "connect a store", footColor:"var(--muted)" },
                  { label:"Price Updates Today",
                    value: String(heroStats?.price_updates_today ?? 0),
                    foot:"avg latency <2s", footColor:"var(--muted)" },
                  { label:"Avg. Margin Saved",
                    value: heroStats?.avg_margin_saved_pct != null ? `+${heroStats.avg_margin_saved_pct.toFixed(1)}pp` : "—",
                    foot: heroStats?.avg_margin_saved_pct != null ? t.profMarginFoot : "no data yet", footColor:"var(--muted)" },
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

            <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:16, boxShadow:"var(--shadow)", overflow:"hidden" }}>
              <div style={{ padding:"22px 26px", display:"flex", alignItems:"center",
                justifyContent:"space-between", gap:14, flexWrap:"wrap", borderBottom:"1px solid var(--border)" }}>
                <div>
                  <h3 style={{ margin:0, fontSize:20, fontWeight:800 }}>Imported Products</h3>
                  <div style={{ marginTop:5, fontSize:13.5, color:"var(--muted)" }}>Live catalogue items synchronized from your connected stores.</div>
                </div>
                <span style={{ color:GN, background:`color-mix(in srgb,${GN} 10%,var(--surface))`,
                  border:`1px solid color-mix(in srgb,${GN} 28%,transparent)`,
                  borderRadius:999, padding:"7px 12px", fontSize:12, fontWeight:700 }}>
                  Synced from connected stores
                </span>
              </div>
              <div style={{ padding:"14px 18px", display:"flex", gap:10, flexWrap:"wrap",
                alignItems:"center", borderBottom:"1px solid var(--border)", background:"var(--surface2)" }}>
                <input value={productSearch} onChange={event=>setProductSearch(event.target.value)}
                  placeholder="Search product name, SKU, or channel…"
                  aria-label="Search imported products"
                  style={{ flex:"1 1 260px", minWidth:0, border:"1px solid var(--border)", borderRadius:9,
                    background:"var(--surface)", color:"var(--text)", padding:"10px 12px", fontFamily:"inherit", fontSize:13.5 }} />
                <select value={productFilter} onChange={event=>setProductFilter(event.target.value as typeof productFilter)}
                  aria-label="Filter imported products"
                  style={{ border:"1px solid var(--border)", borderRadius:9, background:"var(--surface)",
                    color:"var(--text)", padding:"10px 12px", fontFamily:"inherit", fontSize:13 }}>
                  <option value="all">All products ({importedProducts.length})</option>
                  <option value="risk">Below margin floor</option>
                  <option value="healthy">Margin healthy</option>
                  <option value="repriced">Repriced</option>
                </select>
                <select value={productSort} onChange={event=>setProductSort(event.target.value as typeof productSort)}
                  aria-label="Sort imported products"
                  style={{ border:"1px solid var(--border)", borderRadius:9, background:"var(--surface)",
                    color:"var(--text)", padding:"10px 12px", fontFamily:"inherit", fontSize:13 }}>
                  <option value="risk">Priority first</option>
                  <option value="name">Name A–Z</option>
                  <option value="price">Highest price</option>
                </select>
              </div>
              {catalogLoading ? (
                <div style={{ padding:28, color:"var(--muted)", fontSize:14 }}>Loading catalogue…</div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding:28, color:"var(--muted)", fontSize:14 }}>
                  {importedProducts.length === 0 ? "No products have been imported yet." : "No products match this search or filter."}
                </div>
              ) : (
                <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))", gap:14, padding:18 }}>
                  {visibleProducts.map(product => {
                    const margin = product.net_margin_pct == null ? null : product.net_margin_pct * 100;
                    const displayName = lang === "ar" && product.name_ar ? product.name_ar : product.name_en || product.sku;
                    return (
                      <div key={product.ingest_event_id} role="button" tabIndex={0}
                        aria-label={`Open details for ${displayName}`}
                        onClick={()=>openProduct(product)}
                        onKeyDown={event=>{ if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProduct(product); } }}
                        style={{ cursor:"pointer", border:"1px solid var(--border)", borderRadius:13,
                        padding:"18px 19px", background:"var(--surface2)", display:"flex", flexDirection:"column", gap:14,
                        transition:"transform .18s ease,border-color .18s ease,box-shadow .18s ease" }}
                        onMouseEnter={event=>{ event.currentTarget.style.transform="translateY(-2px)"; event.currentTarget.style.borderColor=OG; event.currentTarget.style.boxShadow="var(--shadow)"; }}
                        onMouseLeave={event=>{ event.currentTarget.style.transform="none"; event.currentTarget.style.borderColor="var(--border)"; event.currentTarget.style.boxShadow="none"; }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:17, fontWeight:800, overflowWrap:"anywhere" }}>{displayName}</div>
                            <div style={{ fontFamily:MONO, fontSize:11.5, color:"var(--muted)", marginTop:5 }}>SKU {product.sku}</div>
                          </div>
                          <span style={{ flexShrink:0, textTransform:"uppercase", fontSize:10.5, fontWeight:800,
                            color:OG, border:`1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                            borderRadius:999, padding:"4px 8px" }}>{product.source_platform}</span>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
                          <div>
                            <div style={{ fontSize:10.5, textTransform:"uppercase", color:"var(--muted)" }}>Current price</div>
                            <div style={{ fontSize:20, fontWeight:800, marginTop:3 }}>{product.current_price.toLocaleString()} <span style={{ fontSize:11, color:"var(--muted)" }}>{product.currency}</span></div>
                          </div>
                          <div>
                            <div style={{ fontSize:10.5, textTransform:"uppercase", color:"var(--muted)" }}>Recommended price</div>
                            <div style={{ fontSize:20, fontWeight:800, marginTop:3, color:GN }}>
                              {product.recommended_price.toLocaleString(undefined,{ maximumFractionDigits:2 })} <span style={{ fontSize:11, color:"var(--muted)" }}>{product.currency}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize:10.5, textTransform:"uppercase", color:"var(--muted)" }}>Net margin</div>
                            <div style={{ fontSize:20, fontWeight:800, marginTop:3, color:product.floor_breached ? "#DC2626" : GN }}>
                              {margin == null ? "—" : `${margin.toFixed(1)}%`}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", gap:10, paddingTop:12,
                          borderTop:"1px solid var(--border)", fontSize:12 }}>
                          <span style={{ color:product.floor_breached ? "#DC2626" : GN, fontWeight:700 }}>{product.floor_breached ? "Below margin floor" : "Margin healthy"}</span>
                          <span style={{ color:"var(--muted)", textTransform:"capitalize" }}>
                            Recommendation: {product.decision_action.replace(/_/g, " ")} · {product.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", color:OG,
                          fontSize:12.5, fontWeight:800 }}>Open product details →</div>
                      </div>
                    );
                  })}
                </div>
                {productPageCount > 1 && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                    padding:"14px 18px", borderTop:"1px solid var(--border)", fontSize:12.5, color:"var(--muted)" }}>
                    <span>Showing {(productPage-1)*productPageSize+1}–{Math.min(productPage*productPageSize,filteredProducts.length)} of {filteredProducts.length}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <button type="button" disabled={productPage===1} onClick={()=>setProductPage(page=>Math.max(1,page-1))}
                        style={{ border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)",
                          color:"var(--text)", padding:"8px 11px", cursor:productPage===1?"not-allowed":"pointer", fontFamily:"inherit" }}>Previous</button>
                      <span>Page {productPage} of {productPageCount}</span>
                      <button type="button" disabled={productPage===productPageCount} onClick={()=>setProductPage(page=>Math.min(productPageCount,page+1))}
                        style={{ border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)",
                          color:"var(--text)", padding:"8px 11px", cursor:productPage===productPageCount?"not-allowed":"pointer", fontFamily:"inherit" }}>Next</button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>

            {/* Expected Payout Check — full-width, placed right after the
                hero so it's one of the first things a merchant sees, not
                buried below the live feed/dispute agent. */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:16, boxShadow:"var(--shadow)", padding:"26px 28px",
              display:"flex", flexDirection:"column", gap:18 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <h3 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:"-0.2px" }}>{t.payoutCheckTitle}</h3>
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

              <ContractIntelligenceVault onApproved={term=>{
                setApprovedContract(term);
                setPayoutUploadRate(String(term.commission_rate_pct));
              }} />

              <PromotionProfitabilityWorkspace
                products={importedProducts.map(product=>({
                  sku:product.sku,
                  name:product.name_en||product.name_ar||product.sku,
                  current_price:product.current_price,
                  net_margin_pct:product.net_margin_pct,
                  source_platform:product.source_platform,
                }))}
                contract={approvedContract}
                currency={currency}
              />

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
                <PayoutUploadStaging
                  items={stagedItems}
                  platforms={PAYOUT_UPLOAD_PLATFORMS}
                  rate={payoutUploadRate}
                  onRateChange={setPayoutUploadRate}
                  onAddFile={addFileItems}
                  onAddManual={addManualItem}
                  onCorrectType={correctStagedDocumentType}
                  onToggleNetSales={toggleNetSalesOverride}
                  onRemove={removeStagedItem}
                  onRunAudit={runStagedAudit}
                />
              )}

              {payoutError && (
                <div style={{ fontSize:13, fontWeight:600, color:"#DC2626",
                  background:"color-mix(in srgb,#DC2626 8%,var(--surface))",
                  border:"1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                  borderRadius:9, padding:"10px 14px" }}>
                  {payoutError}
                </div>
              )}

              {payoutData?.source==="live"&&payoutData.settlement_forecast&&payoutData.sale_lines&&<SettlementForecastPanel forecast={payoutData.settlement_forecast} lines={payoutData.sale_lines} currency={currency}/>}
              {payoutData && <PayoutResultDetail data={payoutData} currency={currency} t={t} />}

              {auditResult && (auditResult.ledger.length > 0 || auditResult.findings.length > 0) && (
                <>
                  <CommissionAuditPanel result={auditResult} currency={currency} documentCount={payoutDocuments.length} documents={payoutDocuments} approvedContract={approvedContract} />
                  <div>
                    <button type="button" onClick={handleSaveAudit} disabled={savingAudit || auditSaved}
                      style={{ cursor: savingAudit || auditSaved ? "not-allowed" : "pointer", fontFamily:"inherit", fontSize:12.5,
                        fontWeight:700, color: auditSaved ? GN : "#fff", background: auditSaved ? "transparent" : OG,
                        border: auditSaved ? `1px solid ${GN}` : "none", borderRadius:9, padding:"9px 16px",
                        opacity: savingAudit ? 0.7 : 1 }}>
                      {auditSaved ? t.payoutAuditSaved : savingAudit ? t.payoutDownloadingPdf : t.payoutSaveAudit}
                    </button>
                  </div>
                </>
              )}
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
                    Commerce Copilot <span style={{ color:"var(--muted)", fontWeight:600, fontSize:16.5 }}>· Catalogue, pricing and policy operations</span>
                  </h2>
                  <span style={{ fontSize:15, color:"var(--muted)" }}>Ask Copilot to sync or search your catalogue, preview repricing, publish approved prices, or draft a margin policy.</span>
                </div>
                <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, fontWeight:700, color:OG,
                  background:`color-mix(in srgb,${OG} 9%,var(--surface))`,
                  border:`1px solid color-mix(in srgb,${OG} 32%,transparent)`,
                  borderRadius:999, padding:"6px 14px" }}>
                  Copilot ready
                </span>
              </div>
              <div data-tour="copilot" style={{ display:"flex", gap:10, alignItems:"center", background:"var(--surface)",
                border:"1.5px solid var(--border)", borderRadius:14, padding:"6px 8px 6px 18px",
                boxShadow:"var(--shadow)" }}>
                <span style={{ fontSize:17.5, opacity:.55 }}>✦</span>
                <input value={cpInput} onChange={e=>setCpInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") runCopilot(cpInput); }}
                  placeholder={lang==="ar" ? "اسأل أي شيء أو اكتب قاعدة تسعير..." : "Try: Pull my Zid catalogue, find Sony A7S III, or preview repricing all products"}
                  style={{ flex:1, minWidth:0, border:"none", outline:"none", background:"transparent",
                    color:"var(--text)", fontSize:16, fontFamily:"inherit", padding:"10px 0" }} />
                <button onClick={()=>runCopilot(cpInput)} style={{ cursor:"pointer", flex:"0 0 auto",
                  border:"none", borderRadius:10, background:OG, color:"#fff",
                  fontSize:14.5, fontWeight:700, padding:"11px 18px", fontFamily:"inherit" }}>
                  {t.compile}
                </button>
              </div>
              {cpObj?._type === "operation" && cpOperationStatus !== "running" && (
                <div style={{ marginTop:-10, fontSize:12.5, color:"var(--muted)" }}>
                  Follow up naturally—Copilot remembers this product scope. Try “show only this product”, “reprice it”, or “push it live”.
                </div>
              )}
              <div style={{ display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:13.5, color:"var(--muted)", fontWeight:600 }}>{t.try}</span>
                {[
                  "Pull my latest catalogue from Zid",
                  "Find Sony A7S III and show its recommendation",
                  "Preview repricing for all Zid products",
                  "Maintain at least 25% net margin for cameras sold through Zid",
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
              {cpPhase === "result" && cpObj?._type === "operation" && (
                <div style={{ border:"1px solid var(--border)", borderRadius:14, overflow:"hidden", animation:"pk-in .35s ease" }}>
                  <div style={{ padding:"17px 19px", background:"var(--surface2)", display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".08em" }}>Operational plan</div>
                      <div style={{ fontSize:17, fontWeight:800, marginTop:4 }}>{String(cpObj.summary ?? cpPrompt)}</div>
                    </div>
                    <span style={{ padding:"6px 11px", borderRadius:999, fontSize:12, fontWeight:800,
                      color:cpOperationStatus==="failed"?"#DC2626":cpOperationStatus==="complete"?GN:OG, border:"1px solid currentColor" }}>
                      {cpOperationStatus==="running"?"Running":cpOperationStatus==="publishing"?"Publishing":cpOperationStatus==="complete"?"Completed":cpOperationStatus==="failed"?"Needs attention":"Ready for review"}
                    </span>
                  </div>
                  <div style={{ padding:"18px 19px", display:"flex", flexDirection:"column", gap:14 }}>
                    {cpOperationMessage && <div style={{ fontSize:14.5, lineHeight:1.55 }}>{cpOperationMessage}</div>}
                    {cpOperationProducts.length > 0 && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:10 }}>
                          {cpOperationProducts.slice(0,12).map(product => (
                            <button key={product.ingest_event_id} onClick={()=>openProduct(product)}
                              style={{ textAlign:"left", cursor:"pointer", fontFamily:"inherit", color:"var(--text)", background:"var(--surface)",
                                border:"1px solid var(--border)", borderRadius:11, padding:"12px 13px" }}>
                              <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                                <strong>{product.name_en || product.sku}</strong>
                                <span style={{ fontSize:10.5, color:OG, textTransform:"uppercase" }}>{product.source_platform}</span>
                              </div>
                              <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:3 }}>SKU {product.sku}</div>
                              <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginTop:10, fontSize:12.5 }}>
                                <span>{product.currency} {product.current_price.toLocaleString()}</span>
                                <strong style={{ color:product.floor_breached?"#DC2626":GN }}>→ {product.currency} {product.recommended_price.toLocaleString()}</strong>
                              </div>
                            </button>
                          ))}
                        </div>
                        {cpOperationProducts.length > 12 && <div style={{ fontSize:12.5, color:"var(--muted)" }}>Showing 12 of {cpOperationProducts.length} matched products. All matched products are included.</div>}
                        {String(cpObj.operation) !== "publish_prices" && (
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            {String(cpObj.operation) !== "preview_reprice" && (
                              <button onClick={()=>runCopilot("Preview repricing for these products")}
                                style={{ cursor:"pointer", border:"1px solid var(--border)", borderRadius:9, padding:"9px 12px",
                                  background:"var(--surface)", color:"var(--text)", fontFamily:"inherit", fontWeight:700 }}>
                                Preview repricing
                              </button>
                            )}
                            <button onClick={()=>runCopilot("Push these recommended prices live")}
                              style={{ cursor:"pointer", border:`1px solid color-mix(in srgb,${OG} 45%,var(--border))`, borderRadius:9,
                                padding:"9px 12px", background:`color-mix(in srgb,${OG} 7%,var(--surface))`, color:OG,
                                fontFamily:"inherit", fontWeight:800 }}>
                              Prepare live update
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {String(cpObj.operation) === "publish_prices" && cpOperationProducts.length > 0 && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap",
                        background:"color-mix(in srgb,#F59E0B 9%,var(--surface))", border:"1px solid color-mix(in srgb,#F59E0B 35%,var(--border))",
                        borderRadius:11, padding:"13px 14px" }}>
                        <div style={{ maxWidth:720, fontSize:13.5 }}>
                          <strong>Live change confirmation required.</strong> This will publish the displayed prices to {cpOperationProducts.length} connected-store product{cpOperationProducts.length===1?"":"s"}. Each result is recorded separately.
                        </div>
                        <button onClick={publishCopilotPrices} disabled={cpOperationStatus==="publishing" || cpOperationStatus==="complete"}
                          style={{ border:"none", borderRadius:9, padding:"11px 15px", fontFamily:"inherit", fontWeight:800, color:"#fff",
                            background:cpOperationStatus==="complete"?GN:OG, cursor:cpOperationStatus==="publishing"?"wait":"pointer" }}>
                          {cpOperationStatus==="publishing"?"Publishing…":cpOperationStatus==="complete"?"Prices published":"Confirm and publish live"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {cpPhase === "result" && cpObj && cpObj._type !== "operation" && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))", gap:16, animation:"pk-in .35s ease" }}>
                  <div style={{ background:`color-mix(in srgb,${OG} 6%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${OG} 24%,transparent)`,
                    borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ fontSize:12.5, fontWeight:500, letterSpacing:"0.04em", color:OG, textTransform:"uppercase" as const }}>
                      {t.intentLabel}
                    </div>
                    <div style={{ fontSize:18, lineHeight:1.55, fontWeight:600 }}>"{cpPrompt}"</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:9, marginTop:4 }}>
                      {[
                        ["Policy",String(cpObj.policy_type ?? cpObj.engine_rule ?? "Draft").replace(/_/g," ")],
                        ["Scope",Array.isArray(cpObj.channels) && cpObj.channels.length ? cpObj.channels.join(", ") : String(cpObj.target_category ?? "All products")],
                        ["Control",typeof cpObj.approval_threshold_pct==="number" ? `Approval above ${cpObj.approval_threshold_pct*100}%`
                          : typeof cpObj.minimum_floor==="number" ? `${cpObj.minimum_floor*100}% margin floor`
                          : cpObj.stop_on_stale_cost ? "Stop on stale costs" : "Review required"],
                        ["Lifecycle","Draft · not active"],
                      ].map(([label,value])=>(
                        <div key={label} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:9, padding:"9px 10px" }}>
                          <div style={{ fontSize:10, color:"var(--muted)", textTransform:"uppercase" }}>{label}</div>
                          <div style={{ marginTop:3, fontSize:12.5, fontWeight:700, textTransform:"capitalize" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {Array.isArray(cpObj.warnings) && cpObj.warnings.length > 0 && (
                      <div style={{ color:"#B45309", background:"color-mix(in srgb,#F59E0B 10%,var(--surface))",
                        border:"1px solid color-mix(in srgb,#F59E0B 30%,var(--border))", borderRadius:9, padding:"9px 11px", fontSize:12 }}>
                        {cpObj.warnings.map(String).join(" ")}
                      </div>
                    )}
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
                    <button onClick={applyConfig} disabled={Array.isArray(cpObj.warnings) && cpObj.warnings.length>0}
                      style={{ cursor:Array.isArray(cpObj.warnings)&&cpObj.warnings.length>0?"not-allowed":"pointer", marginTop:4, border:"none",
                      borderRadius:11, padding:"14px 18px", fontSize:15.5, fontWeight:800, fontFamily:"inherit",
                      color:"#fff", background:Array.isArray(cpObj.warnings)&&cpObj.warnings.length>0?"#6B7280":applied ? GN : OG,
                      transition:"background .3s" }}>
                      {Array.isArray(cpObj.warnings)&&cpObj.warnings.length>0 ? "Complete the missing policy details" : applied ? "Draft added to Rule Book" : "Add to Rule Book as draft"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Rule hierarchy and lifecycle */}
            <div data-tour="guardrails" style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16,
                boxShadow:"var(--shadow)", padding:"20px 22px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:19.5 }}>Policy hierarchy</h2>
                    <p style={{ margin:"5px 0 0", color:"var(--muted)", fontSize:13.5 }}>Higher-priority protections win when rules overlap.</p>
                  </div>
                  <span style={{ fontSize:12, color:GN, fontWeight:800, padding:"7px 11px",
                    border:`1px solid color-mix(in srgb,${GN} 28%,transparent)`, borderRadius:999 }}>
                    {rules.filter(rule=>rule.status==="active").length} genuinely active
                  </span>
                </div>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:16 }}>
                  {["Legal price limits","Product rules","Category rules","Channel rules","Global margin floor","Promotions","Rounding"].map((label,index)=>(
                    <span key={label} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5,
                      padding:"8px 10px", border:"1px solid var(--border)", borderRadius:9, background:"var(--surface2)" }}>
                      <strong style={{ color:OG }}>{index+1}</strong>{label}{index<6&&<span style={{color:"var(--muted)"}}>→</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                <div>
                  <h2 style={{ margin:0, fontSize:19.5 }}>Policy rules</h2>
                  <div style={{ marginTop:4, fontSize:13, color:"var(--muted)" }}>
                    Live floor: {persistedGlobalFloor}% · Draft edits never change live pricing.
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <input value={ruleSearch} onChange={event=>setRuleSearch(event.target.value)} placeholder="Search rules…"
                    style={{ border:"1px solid var(--border)", borderRadius:9, padding:"9px 11px",
                      background:"var(--surface)", color:"var(--text)", fontFamily:"inherit" }} />
                  <select value={ruleStatusFilter} onChange={event=>setRuleStatusFilter(event.target.value as typeof ruleStatusFilter)}
                    style={{ border:"1px solid var(--border)", borderRadius:9, padding:"9px 11px",
                      background:"var(--surface)", color:"var(--text)", fontFamily:"inherit" }}>
                    <option value="all">All states</option>
                    {(["draft","testing","scheduled","active","paused","failed"] as RuleStatus[]).map(status=><option key={status} value={status}>{status[0].toUpperCase()+status.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {rules.map((rule,index)=>({rule,index}))
                .filter(({rule})=>(ruleStatusFilter==="all"||rule.status===ruleStatusFilter)
                  && `${rule.name} ${rule.desc}`.toLowerCase().includes(ruleSearch.toLowerCase()))
                .map(({rule,index}) => {
                  const statusColor:Record<RuleStatus,string>={draft:"#6B7280",testing:"#2563EB",scheduled:"#7C3AED",active:GN,paused:"#B45309",failed:"#DC2626"};
                  const completeProducts=importedProducts.filter(product=>product.net_margin_pct!=null);
                  const incompleteCount=importedProducts.length-completeProducts.length;
                  const increases=completeProducts.filter(product=>product.net_margin_pct!*100<rule.floor);
                  const largest=increases.reduce((max,product)=>Math.max(max,product.current_price?((product.recommended_price-product.current_price)/product.current_price)*100:0),0);
                  return (
                    <div key={rule.name} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                      borderRadius:16, boxShadow:"var(--shadow)", overflow:"hidden" }}>
                      <div style={{ padding:"20px 22px", display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                        <div style={{ minWidth:220 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
                            <h3 style={{ margin:0, fontSize:17 }}>{rule.name}</h3>
                            <span style={{ color:statusColor[rule.status], fontSize:11, fontWeight:800, textTransform:"uppercase",
                              padding:"4px 8px", border:`1px solid color-mix(in srgb,${statusColor[rule.status]} 35%,transparent)`,
                              borderRadius:999 }}>{rule.status}</span>
                          </div>
                          <div style={{ marginTop:6, color:"var(--muted)", fontSize:13 }}>{rule.desc}</div>
                          {rule.scope!=="global"&&<div style={{ marginTop:7, fontSize:12, color:"#B45309" }}>Not connected to live enforcement yet.</div>}
                        </div>
                        <div style={{ minWidth:"min(100%,330px)", flex:"1 1 330px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <input type="range" min={5} max={60} value={rule.floor}
                              onChange={event=>editRule(index,{floor:Number(event.target.value)})} style={{flex:1}} />
                            <strong style={{ color:OG, fontSize:20, minWidth:54, textAlign:"right" }}>{rule.floor}%</strong>
                          </div>
                          <div style={{ marginTop:7, fontSize:11.5, color:"var(--muted)" }}>Net contribution margin after VAT, cost and channel fees.</div>
                        </div>
                      </div>

                      <details style={{ borderTop:"1px solid var(--border)", padding:"14px 22px" }}>
                        <summary style={{ cursor:"pointer", fontWeight:800, fontSize:13.5 }}>Safety limits and exceptions</summary>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginTop:14 }}>
                          {[
                            ["Max increase / update","maxChangePct",rule.maxChangePct,"%"],
                            ["Max daily change","dailyChangePct",rule.dailyChangePct,"%"],
                            ["Manual approval above","approvalAbovePct",rule.approvalAbovePct,"%"],
                            ["Cooldown","cooldownHours",rule.cooldownHours," hours"],
                          ].map(([label,key,value,suffix])=>(
                            <label key={String(key)} style={{fontSize:11.5,color:"var(--muted)"}}>{label}
                              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5}}>
                                <input type="number" min={0} value={Number(value)}
                                  onChange={event=>editRule(index,{[String(key)]:Number(event.target.value)} as Partial<Rule>)}
                                  style={{width:"100%",border:"1px solid var(--border)",borderRadius:8,padding:"8px",background:"var(--surface2)",color:"var(--text)"}} />
                                <span>{suffix}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:14,fontSize:12.5}}>
                          <label><input type="checkbox" checked={rule.rollbackOnReject} onChange={event=>editRule(index,{rollbackOnReject:event.target.checked})}/> Roll back if channel rejects update</label>
                          <label><input type="checkbox" checked={rule.stopOnStaleCost} onChange={event=>editRule(index,{stopOnStaleCost:event.target.checked})}/> Stop when cost data is stale</label>
                        </div>
                      </details>

                      {rulePreviewIndex===index&&(
                        <div style={{ padding:"18px 22px", borderTop:"1px solid var(--border)", background:"var(--surface2)" }}>
                          <h4 style={{margin:"0 0 12px"}}>Impact preview</h4>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
                            {[
                              ["Products evaluated",completeProducts.length],
                              ["Require increases",increases.length],
                              ["Largest increase",`${Math.max(0,largest).toFixed(1)}%`],
                              ["Excluded: incomplete cost",incompleteCount],
                            ].map(([label,value])=><div key={String(label)} style={{border:"1px solid var(--border)",borderRadius:9,padding:"11px",background:"var(--surface)"}}>
                              <div style={{fontSize:10.5,color:"var(--muted)",textTransform:"uppercase"}}>{label}</div>
                              <strong style={{display:"block",fontSize:20,marginTop:4}}>{value}</strong>
                            </div>)}
                          </div>
                          <div style={{marginTop:12,fontSize:12.5,color:"var(--muted)"}}>
                            Estimated revenue impact is withheld until order-volume and cost provenance are complete. No prices changed during this preview.
                          </div>
                        </div>
                      )}

                      {ruleConfirmIndex===index&&(
                        <div style={{padding:"13px 22px",borderTop:"1px solid var(--border)",background:"color-mix(in srgb,#F59E0B 9%,var(--surface))",color:"#92400E",fontSize:12.5}}>
                          Confirm activation of the {rule.floor}% global floor. This creates a live pricing-policy change; the previous and new values will be recorded in the session audit below.
                        </div>
                      )}
                      <div style={{padding:"14px 22px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"flex-end",gap:8,flexWrap:"wrap"}}>
                        <button onClick={()=>saveRuleDraft(index)} style={{border:"1px solid var(--border)",background:"var(--surface)",borderRadius:8,padding:"9px 12px",fontWeight:700,cursor:"pointer"}}>Save draft</button>
                        <button onClick={()=>previewRule(index)} style={{border:"1px solid var(--border)",background:"var(--surface)",borderRadius:8,padding:"9px 12px",fontWeight:700,cursor:"pointer"}}>Preview impact</button>
                        <button disabled={ruleSaving||rulePreviewIndex!==index} onClick={()=>activateRule(index)}
                          style={{border:"none",background:rulePreviewIndex===index?OG:"#CBD5E1",color:"#fff",borderRadius:8,padding:"9px 13px",fontWeight:800,cursor:rulePreviewIndex===index?"pointer":"not-allowed"}}>
                          {ruleSaving&&ruleConfirmIndex===index?"Activating…":ruleConfirmIndex===index?"Confirm activation":"Activate rule"}
                        </button>
                      </div>
                    </div>
                  );
                })}

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"20px 22px"}}>
                  <h3 style={{margin:0,fontSize:17}}>Margin calculation</h3>
                  <div style={{marginTop:13,fontFamily:MONO,fontSize:12.5,lineHeight:2,color:"var(--muted)"}}>
                    Selling price<br/>− VAT<br/>− product cost<br/>− channel commission<br/>− payment fee<br/>− fulfilment cost<br/>− promotional contribution<br/>
                    <strong style={{color:"var(--text)"}}>= net contribution and net margin</strong>
                  </div>
                  <div style={{marginTop:10,fontSize:12,color:"#B45309"}}>Products missing any required cost input are excluded from automatic activation.</div>
                </div>
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"20px 22px"}}>
                  <h3 style={{margin:0,fontSize:17}}>Policy audit trail</h3>
                  {ruleAudit.length===0?<p style={{color:"var(--muted)",fontSize:13}}>No policy changes in this session.</p>:
                    <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10}}>{ruleAudit.map((entry,i)=>
                      <div key={`${entry.at}-${i}`} style={{fontSize:12.5,borderBottom:"1px solid var(--border)",paddingBottom:9}}>
                        <strong>{entry.action}</strong> · {entry.rule}<div style={{color:"var(--muted)",marginTop:3}}>{new Date(entry.at).toLocaleString()}</div>
                      </div>)}</div>}
                </div>
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

            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button type="button" onClick={handleDownloadHistoryPdf} disabled={downloadingHistoryPdf}
                style={{ cursor: downloadingHistoryPdf ? "not-allowed" : "pointer", fontFamily:"inherit", fontSize:13.5,
                  fontWeight:600, color:"var(--text)", background:"var(--surface)",
                  border:"1px solid var(--border)", borderRadius:10, padding:"9px 15px",
                  opacity: downloadingHistoryPdf ? 0.6 : 1, display:"flex", alignItems:"center", gap:7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloadingHistoryPdf ? t.payoutDownloadingPdf : t.payoutDownloadFullReport}
              </button>
            </div>

            {/* Payout Check History */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:16, boxShadow:"var(--shadow)", padding:"22px 24px",
              display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.historyPayoutTitle}</h3>
                <div style={{ fontSize:13.5, color:"var(--muted)", marginTop:4 }}>{t.historyPayoutDesc}</div>
              </div>

              {(() => {
                // A single statement can only say "commission was 19.62%" —
                // it can't say "that's higher than your usual." This is the
                // one thing History has that no single Talabat statement can:
                // a pattern across multiple months. Needs 2+ real Talabat
                // statement checks (effective_commission_pct is only ever
                // set by that parser) to be meaningful.
                const rows = historyPayoutChecks.filter(r => r.effective_commission_pct != null && r.commission_rate_pct != null);
                if (rows.length < 2) return null;
                const avgAgreed = rows.reduce((s,r) => s + r.commission_rate_pct, 0) / rows.length;
                const avgEffective = rows.reduce((s,r) => s + (r.effective_commission_pct as number), 0) / rows.length;
                const excessTotal = rows.reduce((s,r) => s + r.sub_total_sum * ((r.effective_commission_pct as number) - r.commission_rate_pct) / 100, 0);
                const unexplainedRows = rows.filter(r => r.unexplained_charge != null);
                const unexplainedTotal = unexplainedRows.reduce((s,r) => s + (r.unexplained_charge?.amount ?? 0), 0);
                return (
                  <div style={{ background:`color-mix(in srgb,${OG} 6%,var(--surface))`,
                    border:`1px solid color-mix(in srgb,${OG} 25%,transparent)`,
                    borderRadius:12, padding:"16px 18px", display:"flex", flexDirection:"column", gap:7,
                    animation:"pk-in .3s ease" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"var(--text)", textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
                      {t.commissionTrendTitle}
                    </span>
                    <div style={{ fontSize:13.5, color:"var(--muted)" }}>
                      {t.commissionTrendRateLabel} ({t.commissionTrendAcross} {rows.length} {t.commissionTrendStatements}):{" "}
                      <strong style={{ color:"var(--text)" }}>{avgAgreed.toFixed(1)}%</strong>{" → "}
                      <strong style={{ color:OG }}>{avgEffective.toFixed(2)}%</strong>
                    </div>
                    {Math.abs(excessTotal) > 0.01 && (
                      <div style={{ fontSize:13.5, color:"var(--muted)" }}>
                        {t.commissionTrendExcessLabel}:{" "}
                        <strong style={{ color: excessTotal > 0 ? "#DC2626" : GN }}>
                          {excessTotal < 0 ? "−" : ""}{currency} {fmtMoney(Math.abs(excessTotal), currency)}
                        </strong>
                      </div>
                    )}
                    {unexplainedRows.length > 0 && (
                      <div style={{ fontSize:13.5, color:"var(--muted)" }}>
                        {t.commissionTrendUnexplainedLabel}:{" "}
                        <strong style={{ color:"#B45309" }}>{unexplainedRows.length}/{rows.length} · {currency} {fmtMoney(unexplainedTotal, currency)}</strong>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                    const rowHasRates = row.commission_rate_pct != null && row.effective_commission_pct != null;
                    const rowExpectedAtAgreed = rowHasRates
                      ? row.expected_payout + ((row.commission_amount ?? 0) - row.sub_total_sum * (row.commission_rate_pct ?? 0) / 100)
                      : row.expected_payout;
                    const rowShowDelta = rowHasRates && Math.abs(rowExpectedAtAgreed - row.expected_payout) > 0.01;
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
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ fontFamily:DISPLAY, fontSize:18, fontWeight:700, color:GN, fontVariantNumeric:"tabular-nums" }}>
                            {currency} {fmtMoney(rowShowDelta ? rowExpectedAtAgreed : row.expected_payout, currency)}
                          </div>
                          {confirmDeletePayoutId === row.id ? (
                            <div onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:12, color:"var(--muted)" }}>{t.historyDeleteConfirm}</span>
                              <button type="button" onClick={()=>handleDeletePayoutCheck(row.id)}
                                disabled={deletingPayoutId===row.id}
                                style={{ cursor:"pointer", fontSize:12, fontWeight:700, color:"#fff",
                                  background:"#DC2626", border:"none", borderRadius:7, padding:"5px 10px", fontFamily:"inherit" }}>
                                {deletingPayoutId===row.id ? "…" : t.historyDeleteYes}
                              </button>
                              <button type="button" onClick={()=>setConfirmDeletePayoutId(null)}
                                style={{ cursor:"pointer", fontSize:12, fontWeight:600, color:"var(--text)",
                                  background:"transparent", border:"1px solid var(--border)", borderRadius:7, padding:"5px 10px", fontFamily:"inherit" }}>
                                {t.historyDeleteCancel}
                              </button>
                            </div>
                          ) : (
                            <button type="button" aria-label="Delete"
                              onClick={e=>{ e.stopPropagation(); setConfirmDeletePayoutId(row.id); }}
                              style={{ cursor:"pointer", background:"transparent", border:"none", padding:4, display:"flex",
                                color:"var(--muted)", flexShrink:0 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div style={{ padding:"0 16px 18px 16px", animation:"pk-in .2s ease",
                          display:"flex", flexDirection:"column", gap:14, borderTop:"1px solid var(--border)", marginTop:2, paddingTop:16 }}>
                          {(row.period_start || row.period_end) && (
                            <div style={{ fontSize:13, color:"var(--muted)" }}>
                              {t.historyDetailPeriod}: <span style={{ color:"var(--text)", fontWeight:600 }}>{row.period_start}{row.period_end && row.period_end !== row.period_start ? ` – ${row.period_end}` : ""}</span>
                            </div>
                          )}
                          <PayoutResultDetail data={row} currency={currency} t={t} />
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
                    const open = expandedRepricingId === row.id;
                    const snap = row.audit_snapshot ?? {};
                    const itemName = typeof snap.item_name === "string" ? snap.item_name : null;
                    const rule = typeof snap.rule === "string" ? snap.rule : null;
                    const marginBefore = typeof snap.margin_before_pct === "number" ? snap.margin_before_pct : null;
                    const marginAfter = typeof snap.margin_after_pct === "number" ? snap.margin_after_pct : null;
                    return (
                      <div key={row.id} style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, overflow:"hidden" }}>
                        <div onClick={()=>setExpandedRepricingId(open ? null : row.id)}
                          style={{ cursor:"pointer", padding:"13px 16px", display:"flex", flexWrap:"wrap",
                            gap:12, alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round"
                              style={{ flexShrink:0, color:"var(--muted)", transition:"transform .18s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
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
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                            <span style={{ fontSize:11.5, fontWeight:700, color: statusColor,
                              background:`color-mix(in srgb,${statusColor} 10%,var(--surface))`,
                              border:`1px solid color-mix(in srgb,${statusColor} 28%,transparent)`,
                              borderRadius:999, padding:"4px 10px", textTransform:"uppercase" as const, letterSpacing:"0.03em" }}>
                              {row.status.replace(/_/g," ")}
                            </span>
                            {confirmDeleteRepricingId === row.id ? (
                              <div onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ fontSize:12, color:"var(--muted)" }}>{t.historyDeleteConfirm}</span>
                                <button type="button" onClick={()=>handleDeleteRepricing(row.id)}
                                  disabled={deletingRepricingId===row.id}
                                  style={{ cursor:"pointer", fontSize:12, fontWeight:700, color:"#fff",
                                    background:"#DC2626", border:"none", borderRadius:7, padding:"5px 10px", fontFamily:"inherit" }}>
                                  {deletingRepricingId===row.id ? "…" : t.historyDeleteYes}
                                </button>
                                <button type="button" onClick={()=>setConfirmDeleteRepricingId(null)}
                                  style={{ cursor:"pointer", fontSize:12, fontWeight:600, color:"var(--text)",
                                    background:"transparent", border:"1px solid var(--border)", borderRadius:7, padding:"5px 10px", fontFamily:"inherit" }}>
                                  {t.historyDeleteCancel}
                                </button>
                              </div>
                            ) : (
                              <button type="button" aria-label="Delete"
                                onClick={e=>{ e.stopPropagation(); setConfirmDeleteRepricingId(row.id); }}
                                style={{ cursor:"pointer", background:"transparent", border:"none", padding:4, display:"flex",
                                  color:"var(--muted)", flexShrink:0 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {open && (
                          <div style={{ padding:"16px 16px 18px 38px", animation:"pk-in .2s ease",
                            borderTop:"1px solid var(--border)", marginTop:2 }}>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10 }}>
                              {[
                                ...(itemName ? [{ label: t.historyDetailItem, value: itemName }] : []),
                                ...(rule ? [{ label: t.historyDetailRule, value: rule }] : []),
                                ...(marginBefore != null && marginAfter != null
                                  ? [{ label: t.historyDetailMargin, value: `${marginBefore.toFixed(1)}% → ${marginAfter.toFixed(1)}%` }]
                                  : []),
                                ...(row.duration_ms != null ? [{ label: t.historyDetailDuration, value: `${row.duration_ms} ms` }] : []),
                                ...(row.completed_at ? [{ label: t.historyDetailCompleted, value: new Date(row.completed_at).toLocaleString() }] : []),
                              ].map(f => (
                                <div key={f.label} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                                  borderRadius:10, padding:"11px 13px", display:"flex", flexDirection:"column", gap:4 }}>
                                  <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>{f.label}</span>
                                  <span style={{ fontSize:14, color:"var(--text)", fontWeight:700 }}>{f.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Commission Audit History */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:16, boxShadow:"var(--shadow)", padding:"22px 24px",
              display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"-0.2px" }}>{t.historyPayoutAuditTitle}</h3>
                <div style={{ fontSize:13.5, color:"var(--muted)", marginTop:4 }}>{t.historyPayoutAuditDesc}</div>
              </div>
              {historyLoading ? (
                <div style={{ fontSize:14, color:"var(--muted)" }}>{t.historyLoading}</div>
              ) : historyPayoutAudits.length === 0 ? (
                <div style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                  borderRadius:12, padding:"24px 20px", display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ width:9, height:9, borderRadius:"50%", background:"var(--muted)", flexShrink:0 }} />
                  <span style={{ fontSize:15, color:"var(--muted)" }}>{t.historyPayoutAuditEmpty}</span>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {historyPayoutAudits.map(row => {
                    const open = expandedPayoutAuditId === row.id;
                    const criticalCount = row.findings.filter(f => f.severity === "critical").length;
                    return (
                      <div key={row.id} style={{ border:"1px solid var(--border)", background:"var(--surface2)",
                        borderRadius:12, overflow:"hidden" }}>
                        <div onClick={()=>setExpandedPayoutAuditId(open ? null : row.id)}
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
                                {row.document_count} documents
                                {criticalCount > 0 && (
                                  <span style={{ fontSize:11.5, fontWeight:700, color:"#DC2626",
                                    background:"color-mix(in srgb,#DC2626 10%,var(--surface))",
                                    border:"1px solid color-mix(in srgb,#DC2626 28%,transparent)",
                                    borderRadius:999, padding:"3px 9px" }}>
                                    {criticalCount} critical
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize:13, color:"var(--muted)" }}>
                                {new Date(row.created_at).toLocaleString()}
                                {row.period_start && ` · ${row.period_start}${row.period_end && row.period_end !== row.period_start ? ` – ${row.period_end}` : ""}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ fontSize:13, color:"var(--muted)" }}>
                              {row.findings.length} findings
                            </div>
                            {confirmDeletePayoutAuditId === row.id ? (
                              <div onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ fontSize:12, color:"var(--muted)" }}>{t.historyDeleteConfirm}</span>
                                <button type="button" onClick={()=>handleDeletePayoutAudit(row.id)}
                                  disabled={deletingPayoutAuditId===row.id}
                                  style={{ cursor:"pointer", fontSize:12, fontWeight:700, color:"#fff",
                                    background:"#DC2626", border:"none", borderRadius:7, padding:"5px 10px", fontFamily:"inherit" }}>
                                  {deletingPayoutAuditId===row.id ? "…" : t.historyDeleteYes}
                                </button>
                                <button type="button" onClick={()=>setConfirmDeletePayoutAuditId(null)}
                                  style={{ cursor:"pointer", fontSize:12, fontWeight:600, color:"var(--text)",
                                    background:"transparent", border:"1px solid var(--border)", borderRadius:7, padding:"5px 10px", fontFamily:"inherit" }}>
                                  {t.historyDeleteCancel}
                                </button>
                              </div>
                            ) : (
                              <button type="button" aria-label="Delete"
                                onClick={e=>{ e.stopPropagation(); setConfirmDeletePayoutAuditId(row.id); }}
                                style={{ cursor:"pointer", background:"transparent", border:"none", padding:4, display:"flex",
                                  color:"var(--muted)", flexShrink:0 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {open && (
                          <div style={{ padding:"0 16px 18px 16px", animation:"pk-in .2s ease",
                            borderTop:"1px solid var(--border)", marginTop:2, paddingTop:16 }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                              {row.documents.map(d => (
                                <span key={d.file_name} style={{ fontSize:12, fontWeight:600, color:"var(--text)",
                                  background:"var(--surface)", border:"1px solid var(--border)",
                                  borderRadius:999, padding:"5px 12px", display:"flex", alignItems:"center", gap:6 }}
                                  title={d.description ?? undefined}>
                                  {d.file_name}
                                  <span style={{ fontSize:10, fontWeight:700, color:"var(--muted)", textTransform:"uppercase" as const, letterSpacing:"0.03em" }}>
                                    {d.document_type === "daily_log" ? "Daily Log" : d.document_type === "platform_transaction" ? "Platform Transactions" : d.document_type === "statement" ? "Statement"
                                      : d.document_type === "merchant_received" ? "What I Received" : "Report"}
                                  </span>
                                </span>
                              ))}
                            </div>
                            <CommissionAuditPanel
                              result={{ ledger: row.ledger ?? [], ledgerTotals: row.ledger_totals, findings: row.findings, coverage: row.period_start ? { start: row.period_start, end: row.period_end ?? row.period_start } : null }}
                              currency={currency}
                              documentCount={row.document_count}
                            />
                          </div>
                        )}
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
              <div role="status" onClick={()=>setTab("vault")} title={defendHealth ? `Checked ${new Date(defendHealth.checked_at).toLocaleTimeString()}` : "Checking live operational signals"}
                style={{ border:`1px solid color-mix(in srgb,${defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B"} 30%,transparent)`,
                background:`color-mix(in srgb,${defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B"} 7%,var(--surface))`,
                borderRadius:12, padding:"13px 14px", display:"flex", gap:11, alignItems:"flex-start", cursor:"pointer" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B", marginTop:5, animation:defendHealth?.state==="active"?"pk-pulse 2s infinite":"none" }} />
                <span style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:defendHealth?.state==="active"?GN:defendHealth?.state==="degraded"?"#DC2626":defendHealth?.state==="idle"?"#B45309":"#64748B" }}>{defendHealth?.label ?? "Checking Defend Loop"}</span>
                  <span style={{ fontSize:11.5, lineHeight:1.45, color:"var(--muted)" }}>{defendHealth?.detail ?? "Reading live channel and dispatch signals…"}</span>
                </span>
              </div>
              {/* Account */}
              <div style={{ display:"flex", alignItems:"center", gap:11, paddingInline:4, paddingTop:4 }}>
                <span style={{ width:34, height:34, borderRadius:"50%", background:"var(--surface)",
                  border:"1px solid var(--border)", display:"grid", placeItems:"center",
                  fontSize:13, fontWeight:700, fontFamily:MONO }}>{(storeName || "M").charAt(0).toUpperCase()}</span>
                <span style={{ fontSize:15.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{storeName || t.myAccount}</span>
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
