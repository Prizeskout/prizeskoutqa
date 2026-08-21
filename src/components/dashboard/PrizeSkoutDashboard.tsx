import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import {
  BadgePercent,
  Bell,
  Bot,
  ChartNoAxesCombined,
  CircleDollarSign,
  MessageSquareText,
  PackageSearch,
  PlugZap,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  History as HistoryIcon,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {supabase} from "@/integrations/supabase/client";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { ContactSupportModal } from "@/components/ContactSupportModal";
import { ProductTour, type TourStep } from "@/components/dashboard/ProductTour";
import { DemoModeOverlay } from "@/components/dashboard/DemoModeOverlay";
import {
  CommissionAuditPanel,
  type CommissionAuditResult,
} from "@/components/dashboard/payout/CommissionAuditPanel";
import {
  PayoutUploadStaging,
  type StagedItem,
  type PayoutCheckClassification,
} from "@/components/dashboard/payout/PayoutUploadStaging";
import {
  ContractIntelligenceVault,
  type ContractTerm,
} from "@/components/dashboard/payout/ContractIntelligenceVault";
import { SettlementForecastPanel } from "@/components/dashboard/payout/SettlementForecastPanel";
import { PromotionProfitabilityWorkspace } from "@/components/dashboard/promotions/PromotionProfitabilityWorkspace";
import { ChannelPriceArchitecture } from "@/components/dashboard/pricing/ChannelPriceArchitecture";
import { GroupControlWorkspace } from "@/components/dashboard/group/GroupControlWorkspace";
import { ZidProfitBrief } from "@/components/dashboard/ZidProfitBrief";
import { MerchantOperatingLoop } from "@/components/dashboard/MerchantOperatingLoop";
import { StoreManagerCommandBar } from "@/components/dashboard/StoreManagerCommandBar";
import { MarginIntelligenceSummary, RecoveryDashboardSummary } from "@/components/dashboard/FocusedIntelligenceSummary";
import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";
import { EvidenceReviewWorkspace } from "@/components/dashboard/evidence/EvidenceReviewWorkspace";
import { EvidenceSourceCoverage } from "@/components/dashboard/evidence/EvidenceSourceCoverage";
import {
  classifyResult,
  reconcile,
  type ClassifiedDocument,
  type DocumentType,
  type Finding,
  type LedgerRow,
} from "@/lib/commission-audit";
import {
  planChannelPrices,
  type ChannelEconomics,
  type ChannelPriceProduct,
  type PriceChannel,
} from "@/lib/channel-price-planner";
import { compactConversation, resolveProductReferences } from "@/lib/copilot-understanding";
import { workflowStepLabel } from "@/lib/merchant-language";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { simulatePromotion } from "@/lib/promotion-profitability";

type Tab =
  | "today"
  | "catalog"
  | "analytics"
  | "manager"
  | "promotions"
  | "rules"
  | "vault"
  | "history"
  | "settings";
type SidebarNavId =
  | "overview"
  | "catalog"
  | "margin"
  | "alerts"
  | "recovery"
  | "promotions"
  | "defend"
  | "manager"
  | "copilot"
  | "integrations"
  | "evidence"
  | "settings";

const SIDEBAR_NAV_TABS: Record<SidebarNavId, Tab> = {
  overview: "analytics",
  catalog: "catalog",
  margin: "analytics",
  alerts: "today",
  recovery: "analytics",
  promotions: "promotions",
  defend: "rules",
  manager: "manager",
  copilot: "rules",
  integrations: "vault",
  evidence:"history",
  settings: "settings",
};

function sidebarNavFromTab(tab: Tab): SidebarNavId {
  if (tab === "catalog") return "catalog";
  if (tab === "vault") return "integrations";
  if (tab === "analytics") return "overview";
  if (tab === "today") return "alerts";
  if (tab === "promotions") return "promotions";
  if (tab === "rules") return "defend";
  if (tab === "manager") return "manager";
  if (tab === "settings") return "settings";
  if(tab==="history")return "evidence";
  return "alerts";
}
const DASHBOARD_TABS: readonly Tab[] = [
  "today",
  "catalog",
  "analytics",
  "manager",
  "promotions",
  "rules",
  "vault",
  "history",
  "settings",
];

function dashboardTabFromUrl(): Tab {
  if (typeof window === "undefined") return "analytics";
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  return DASHBOARD_TABS.includes(workspace as Tab) ? (workspace as Tab) : "analytics";
}
type Theme = "light" | "dark";
type Lang = "en" | "ar" | "fr";

interface FeedRow {
  tag: string;
  tagColor: string;
  text: string;
  time: string;
}
type RuleStatus = "draft" | "testing" | "scheduled" | "active" | "paused" | "failed";
type ApprovalMode = "recommend_only" | "auto_within_limit" | "approval_every_change";
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
  approvalMode: ApprovalMode;
  minimumContribution: number;
}
type ChannelPolicyDraft={channel:string;servicePath:string;floor:number;minimumContribution:number;maxChangePct:number;approvalMode:ApprovalMode};
interface ImportedProduct {
  ingest_event_id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  source_platform: string;
  item_id: string;
  current_price: number;
  recommended_price: number;
  net_margin_pct: number | null;
  floor_breached: boolean;
  decision_action: string;
  currency: string;
  status: string;
  inventory_status?: string;
  inventory_quantity?: number | null;
  inventory_is_infinite?: boolean;
  margin_floor_pct?: number;
  commission_rate?: number;
  cost_confidence?: "verified" | "estimated" | "unknown";
  base_cost?: number | null;
  preview?: {
    required_price: number | null;
    allowed_price: number | null;
    current_margin_pct: number;
    projected_margin_at_required: number | null;
    projected_margin_at_allowed: number | null;
    floor_breached: boolean;
    required_increase_pct: number;
    allowed_increase_pct: number;
    maximum_increase_pct: number;
    margin_floor_pct: number;
    minimum_contribution_amount: number;
    policy_scope: "global"|"channel";
    policy_version: number;
    approval_mode: ApprovalMode;
    evidence_blockers: string[];
    outcome:
      | "safe"
      | "blocked_missing_cost"
      | "blocked_missing_economics"
      | "blocked_stale_evidence"
      | "within_limit"
      | "over_limit"
      | "cannot_reach_target_within_limit";
  };
}

const OG = "#EF681A";
const GN = "#10B981";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const DISPLAY = "Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

const CSS = `

  @keyframes pk-pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes pk-ring{0%,100%{opacity:1}50%{opacity:.35}}
  @keyframes pk-glow{from{}to{}}
  @keyframes pk-spin{to{transform:rotate(360deg)}}
  @keyframes pk-in{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pk-toast{from{transform:translateY(14px) scale(.97)}to{transform:none}}
  .ps-db{
    font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
    /* Slate neutrals on a white page, matching the marketing site. The previous
       ramp mixed warm surfaces (#F6F6F4/#FBFBFA) with cool grey text and borders,
       which is what made light mode read muddy. */
    --bg:#F8FAFC;--surface:#FFFFFF;--surface2:#F6F8FB;--border:#E2E8F0;
    --text:#071633;--muted:#526078;--accent:#EF681A;--green:#10B981;--navy:#061B49;
    /* Brand orange is only 2.9:1 on light surfaces, so small text uses a darker
       step. Fills and borders keep --accent. */
    --accent-text:#C2410C;
    --term:#0D1117;--term-border:#222B38;--term-text:#C9D1D9;
    --shadow:0 1px 2px rgba(15,23,42,.04),0 10px 28px -16px rgba(15,23,42,.18);
    --shadow-lg:0 24px 64px rgba(15,23,42,.18);
    --px:30px;
  }
  .ps-db[data-theme="dark"]{
    --bg:#0B0E13;--surface:#141924;--surface2:#101520;--border:#232B38;
    --text:#F2F4F8;--muted:#8B93A3;--accent-text:#EF681A;
    --term:#0A0E15;--term-border:#1D2532;--term-text:#C9D1D9;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35);
    --shadow-lg:0 24px 64px rgba(0,0,0,.6);
  }
  .ps-db-header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(18px)}
  .ps-db-section{width:100%;max-width:1540px;margin-inline:auto;box-sizing:border-box}
  .ps-db section[id],.ps-db [data-workspace-card]{scroll-margin-top:104px}
  .ps-dashboard-sidebar{background:linear-gradient(180deg,#061B49 0%,#031337 100%)!important;border-inline-end:0!important;color:#fff!important;box-shadow:12px 0 34px rgba(6,27,73,.10)}
  .ps-dashboard-sidebar nav button{color:rgba(255,255,255,.72)!important}
  .ps-dashboard-sidebar nav button[aria-current="page"]{background:rgba(255,255,255,.12)!important;color:#fff!important;box-shadow:inset 3px 0 0 #EF681A}
  .ps-dashboard-sidebar nav button:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}
  .ps-dashboard-sidebar-footer{border-top:1px solid rgba(255,255,255,.10);padding-top:14px}
  .ps-db .table-scroll{border-radius:12px}
  .ps-db .table-scroll table thead{position:sticky;top:0;z-index:1}
  .ps-evidence-workspace{display:grid;gap:16px;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}
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
    [data-tour="copilot-command"]{margin:12px var(--px) 0!important;padding:14px!important}
    [data-tour="copilot-command"] input{min-width:0!important}
    .ps-db [role="dialog"]{max-width:calc(100vw - 16px)!important;max-height:calc(100dvh - 16px)!important}
  }
  @media(max-width:560px){
    .ps-db{--px:12px}
    .ps-db-header{padding:14px var(--px) 12px!important}
    .ps-db-section{padding:14px var(--px) 32px!important;gap:14px!important}
    [data-tour="copilot-command"]{margin:10px var(--px) 0!important;padding:12px!important}
    [data-tour="copilot-command"]>div:nth-of-type(3){flex-wrap:wrap!important}
    [data-tour="copilot-command"]>div:nth-of-type(3)>button{width:100%!important}
    .ps-db input,.ps-db select,.ps-db textarea{font-size:16px!important}
    .ps-db table{font-size:12px}
    .ps-db h1,.ps-db h2,.ps-db h3{overflow-wrap:anywhere}
  }
  @keyframes pk-drawer-ltr{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pk-drawer-rtl{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
`;

type Dispute = {
  partner: string;
  title: string;
  order: string;
  place: string;
  contract: string;
  charged: string;
  leak: string;
  hash: string;
  en: string;
  ar: string;
};

type DashboardRecoveryCase = {
  id: string;
  platform: string;
  exception_key: string;
  title: string;
  status: string;
  exception_amount: number | null;
  claims_ready_amount: number;
  contract_clause: string | null;
  explanation_en: string;
  explanation_ar: string;
  owner: string | null;
  recovered_amount: number;
  submitted_at?: string | null;
  submission_evidence_hash?: string | null;
};

const INBOUND_INTEGRATIONS = [
  {
    name: "Foodics POS",
    glyph: "F",
    kind: "POS Terminal",
    platform: "foodics",
    oauthPath: null as string | null,
  },
  {
    name: "Zid",
    glyph: "Z",
    kind: "E-Commerce",
    platform: "zid",
    oauthPath: "/api/auth/zid" as string | null,
  },
  {
    name: "Salla",
    glyph: "S",
    kind: "E-Commerce",
    platform: "salla",
    oauthPath: "/api/auth/salla" as string | null,
  },
] as const;

const OUTBOUND_INTEGRATIONS = [
  {
    name: "Talabat",
    platform: "talabat",
    region: "QA · KSA · UAE",
    byok: true,
    oauthPath: null as string | null,
  },
  {
    name: "Snoonu",
    platform: "snoonu",
    region: "QA",
    byok: false,
    oauthPath: null as string | null,
  },
  {
    name: "Keeta",
    platform: "keeta",
    region: "QA · KSA",
    byok: false,
    oauthPath: "/api/channels/connect?oauth=keeta" as string | null,
  },
  {
    name: "Jahez",
    platform: "jahez",
    region: "KSA · hyperlocal",
    byok: true,
    oauthPath: null as string | null,
  },
  {
    name: "Deliveroo",
    platform: "deliveroo",
    region: "UAE · QA",
    byok: false,
    oauthPath: null as string | null,
  },
];

// Platforms selectable for a manual payout-check upload — only Talabat has
// a live API pull built (see expected-payout.ts); the others here rely on
// the CSV parser's flexible column matching, not a verified export format.
const PAYOUT_UPLOAD_PLATFORMS = [
  { value: "talabat", label: "Talabat" },
  { value: "jahez", label: "Jahez" },
  { value: "snoonu", label: "Snoonu" },
  { value: "deliveroo", label: "Deliveroo" },
];

type ByokField = { key: string; label: string; hint?: string; type?: "password" | "text" };
const BYOK_CONFIG: Record<string, { fields: ByokField[]; portalHint?: string }> = {
  talabat: {
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        hint: "Talabat Partner Portal → Settings → API Credentials",
      },
      { key: "client_secret", label: "Client Secret" },
      {
        key: "vendor_id",
        label: "Vendor ID",
        hint: "Your store's vendor ID from the Talabat portal",
      },
      {
        key: "chain_id",
        label: "Chain ID",
        hint: "UUID format, e.g. 12345678-1234-1234-1234-123456789012 — from partner.talabat.com",
      },
      {
        key: "commission_rate_pct",
        label: "Commission Rate (%)",
        type: "text",
        hint: "The rate in your Talabat contract, commonly around 19% but specific to your agreement",
      },
      {
        key: "vat_on_fees_pct",
        label: "VAT on Talabat Fees (%)",
        type: "text",
        hint: "VAT charged on Talabat's fees. Enter 0 if none.",
      },
      {
        key: "payment_fee_pct",
        label: "Payment Fee (%)",
        type: "text",
        hint: "Payment processing percentage in your commercial terms. Enter 0 if none.",
      },
      {
        key: "fixed_order_fee",
        label: "Fixed Fee per Order",
        type: "text",
        hint: "Fixed deduction per order in your store currency. Enter 0 if none.",
      },
      {
        key: "delivery_contribution",
        label: "Delivery Contribution per Order",
        type: "text",
        hint: "Restaurant-funded delivery amount per order. Enter 0 if none.",
      },
    ],
    portalHint: "Find your credentials at partner.talabat.com",
  },
  jahez: {
    fields: [
      { key: "api_key", label: "API Key", hint: "Request from integration@jahez.net" },
      { key: "secret_code", label: "Secret Code" },
      {
        key: "branch_id",
        label: "Branch ID",
        hint: "Your branch ID from the Jahez partner dashboard",
      },
    ],
    portalHint: "Contact integration@jahez.net to receive your API credentials",
  },
  keeta_shop_id: {
    fields: [
      {
        key: "shop_id",
        label: "Keeta Shop ID",
        type: "text",
        hint: "Appears in any inbound Keeta order webhook payload, or ask your Keeta account manager.",
      },
    ],
  },
};

const T = {
  en: {
    cp: "CONTROL PLANE",
    live: "LIVE",
    defend: "Defend Loop status",
    defendS: "Live health is loading",
    navA: "Revenue Protection Hub",
    navAs: "Analytics",
    navR: "Margin Policy Engine",
    navRs: "Rule Book",
    navV: "Integration Vault",
    navVs: "Connections",
    navH: "Activity & Evidence",
    navHs: "History",
    subA: "See where money needs attention and take the next action",
    subR: "Choose how much to keep from each sale and how prices may change",
    subV: "Connect the systems PrizeSkout reads from and updates",
    subH: "See what was checked, what changed, and what needs attention",
    historyViewLink: "View history →",
    historyPayoutTitle: "Payout Checks",
    historyPayoutDesc:
      "What you should have received, what the platform reported, and what is still missing.",
    historyPayoutEmpty: "No payout checks here yet. Run one from Revenue Protection Hub.",
    historyRepricingTitle: "Price Changes",
    historyRepricingDesc: "Every requested price change and whether it was confirmed in the store.",
    historyRepricingEmpty: "No prices have been changed yet.",
    historyLoading: "Loading…",
    historyColDate: "Date",
    historyColSource: "Source",
    historyColPlatform: "Platform",
    historyColOrders: "Orders",
    historyColExpected: "Expected Payout",
    historyColChannel: "Channel",
    historyColSku: "SKU",
    historyColPrice: "Price Change",
    historyColStatus: "Status",
    historyDetailPeriod: "Period",
    historyDetailSales: "Sales checked",
    historyDetailRows: "Records checked",
    historyDetailItem: "Product",
    historyDetailRule: "Why it changed",
    historyDetailMargin: "Amount kept (before → after)",
    historyDetailDuration: "Duration",
    historyDetailCompleted: "Completed",
    historyDeleteConfirm: "Delete this record?",
    historyDeleteYes: "Delete",
    historyDeleteCancel: "Cancel",
    stream: "Recent Activity",
    streamS: "What PrizeSkout is checking and changing",
    profLabel: "Money protected this month",
    profNoActivity: "Nothing to show yet · connect a store to start",
    profDefensesLabel: "safe price updates this month",
    profTrackedFoot: "from connected stores",
    profMarginFoot: "more kept per sale",
    copilotTitle: "CFO Copilot",
    copilotSub: "Natural Language Rule Engine",
    copilotDesc:
      "Ask anything about pricing strategy, or describe a rule to compile it into a live engine config.",
    copilotLive: "🟢 Copilot Live",
    compile: "Send ↗",
    try: "Try:",
    guardrails: "Active Guardrails",
    agentTitle: "Autonomous Dispute Audit Agent",
    agentActive: "Manual fallback active",
    discLog: "Discrepancy Log · POS Payouts vs Contracts",
    genVoucher: "Generate Dispute Voucher",
    downloadCsv: "Download Audit Log (CSV)",
    exportProofs: "Export Dispute Proofs",
    fileBtn0: "Download Claim Evidence",
    fileBtn1: "Preparing evidence…",
    fileBtn3: "✓ Evidence Downloaded",
    fileMsg1: "Compiling the reviewed claim and proof references…",
    fileMsg2: "Generating the evidence document…",
    fileMsg3:
      "✓ Evidence downloaded. Submit it through the partner portal, then record the response in Claims and Recovery.",
    claimEn: "CLAIM DRAFT · ENGLISH",
    claimAr: "مسودة المطالبة · العربية",
    bilingualTitle: "Bilingual Dispute Package ·",
    verified: "SHA-256",
    verifiedS: "· VERIFIED ✓",
    autoCompiled: "auto-compiled by dispute agent",
    close: "✕",
    intentLabel: "What you asked for",
    intent: "intent:",
    confidence: "confidence:",
    ambiguity: "ambiguity:",
    intentResolved: "resolved ✓",
    applyLabel0: "Save as a draft rule",
    applyLabel1: "✓ Draft saved",
    rulesEnforced: "rules currently protecting prices",
    activeLabel: "✓ protecting prices now",
    pausedLabel: "Paused · this rule is not protecting prices",
    previewLabel: "Preview only · no prices will change",
    floorWarn: "This target is too low to protect product costs. Choose at least 15%.",
    settingsLabel: "Settings",
    backToSite: "Back to site",
    myAccount: "My Account",
    settingsSub: "Store access, channels, margin rules, outlets and notifications.",
    supportLabel: "Support",
    inboundTitle: "Inbound Connections",
    inboundDesc: "Connect the stores and systems PrizeSkout should read products and orders from.",
    outboundTitle: "Outbound Connections",
    outboundDesc: "Connect the channels where PrizeSkout may update approved prices.",
    inboundConnectedMsg: "connected · information is up to date",
    inboundAuthorizeMsg: "not connected · connect now",
    inboundComingSoonMsg: "integration coming soon",
    connectPrefix: "Connect",
    setupBadge: "SETUP",
    soonBadge: "SOON",
    storeConnectedSyncing: "Store connected · products are updating",
    tapSetupMsg: "Tap SETUP to connect your store",
    awaitingBuildMsg: "Awaiting integration build",
    newDiscrepancy: "New Discrepancy",
    partnerLabel: "Partner",
    orderIdLabel: "Order ID",
    branchLocationLabel: "Branch / Location",
    contractedRateLabel: "Contracted rate (%)",
    orderValueLabel: "Order value",
    chargedByPartnerLabel: "Charged by partner",
    additionalNotesLabel: "Additional notes (optional)",
    logDiscrepancyBtn: "+ Log Discrepancy",
    cancelBtn: "− Cancel",
    finishSetupBadge: "Finish Setup",
    keetaConnectedMsg: "Keeta connected · finish setup by entering your Shop ID",
    keetaShopIdPrompt:
      "Enter the Shop ID for your Keeta store to finish connecting. PrizeSkout needs this to push margin-safe prices to your Keeta menu.",
    keetaShopIdSaved: "Keeta Shop ID saved · prices syncing",
    keetaShopIdPending: "Shop ID needed to sync prices",
    tourReplayLabel: "Take a tour",
    tourStartBtn: "Start tour",
    tourNextBtn: "Next",
    tourBackBtn: "Back",
    tourFinishBtn: "Got it — let's connect",
    tourSkipLabel: "Skip tour",
    tourWelcomeTitle: "Welcome to your control plane",
    tourWelcomeBody:
      "A two-minute walkthrough of where PrizeSkout tracks margin, compiles pricing rules, and pushes protected prices to your delivery apps.",
    tourHeroTitle: "Revenue Protection Hub",
    tourHeroBody:
      "Profits protected, price updates, and margin saved — tracked here in real time, alongside a live feed of every price change PrizeSkout makes on your behalf.",
    tourCopilotTitle: "Describe a rule, get an engine config",
    tourCopilotBody:
      'Type a pricing rule in plain English — "Lock bakery margins at 25%" — and Copilot compiles it into a guardrail enforced at the edge in under 2ms.',
    tourGuardrailsTitle: "Your margin floors, always enforced",
    tourGuardrailsBody:
      "Every rule you apply lives here. Adjust a floor and it takes effect immediately — no redeploy, no waiting on engineering.",
    tourSupportTitle: "Stuck on anything? We're one click away",
    tourSupportBody:
      "Integration issues, dispute questions, or anything else — reach the PrizeSkout team directly from here.",
    tourInboundTitle: "Feed PrizeSkout your real data",
    tourInboundBody:
      "Connect your POS or e-commerce platform so PrizeSkout can see real orders, costs, and catalog — the foundation everything else runs on.",
    tourOutboundTitle: "This is where the defense happens",
    tourOutboundBody:
      "Connect Talabat, Jahez, or any delivery aggregator and PrizeSkout starts pushing margin-safe prices automatically — no more silent margin leaks.",
    payoutCheckTitle: "Check Your Platform Payout",
    payoutCheckDesc:
      "Find missing or incorrect platform payments by comparing sales, contracted charges, settlement statements, and merchant receipt confirmations.",
    payoutCheckBtn: "Check Expected Payout",
    payoutCheckBtnLoading: "Checking your orders…",
    payoutCheckLiveOnlyNote:
      "Uses connected Talabat order data. Add a settlement statement and optionally confirm whether the payout arrived.",
    payoutCheckOrders: "Orders Checked",
    payoutCheckSubtotal: "Food Sales (excl. delivery fee)",
    payoutCheckRate: "Your Commission Rate",
    payoutCheckCommissionLabel: "Platform Commission",
    payoutBreakdownTitle: "Payout Breakdown",
    payoutBreakdownCommission: "Commission Charge",
    payoutBreakdownCharges: "Additional Charges",
    payoutBreakdownIncome: "Additional Income & Vouchers",
    payoutBreakdownTotal: "Total Payout (Talabat's statement)",
    payoutCheckAgreedVsEffective: "Agreed rate → actual effective rate",
    payoutShortfallSuffix: "less than you should have received",
    payoutSurplusSuffix: "more than your agreed rate alone would have produced",
    payoutCorrectedForAgreedRate1: "Corrected for your agreed rate — Talabat's own statement said",
    payoutCheckStatementNote:
      "This is Talabat's own stated payout for this period, read directly from your payout statement — not an estimate. The breakdown above shows exactly what moved between your gross sales and this number.",
    payoutCheckExpectedLabel: "You Should Have Received",
    payoutCheckHint: "Compare this to your bank deposit for the same period.",
    payoutCheckNotConnected: "Connect Talabat first to run this check.",
    payoutCheckUploadBtn: "Upload a Statement",
    payoutCheckUploadRateLabel: "Commission rate for this file (%)",
    payoutCheckSalesLabel: "Total Sales (from file)",
    payoutCheckUploadNote:
      "This estimate uses the file's daily sales total, which may include delivery fees. A live check reads each order separately and is more precise.",
    payoutCheckPdfNote:
      "This estimate covers one calendar month from Snoonu's report (GMV), not a custom date range. It won't match exactly if Snoonu's payout math differs from a flat GMV × (1 − commission) calculation.",
    payoutCheckPdfPreviewTitle: "Parsed from your PDF — check this against the report",
    payoutCheckPdfCancelled: "Cancelled GMV",
    payoutCheckCsvOrPdfSnoonu: "CSV, or Snoonu's monthly Brand Performance Report PDF.",
    payoutCheckTalabatHint:
      "Upload Talabat's Payout Statement CSV (Finance → Payouts → Download report), not a general sales export.",
    payoutCheckLiveEstimateNote:
      "This is an estimate from your order history and commission rate — it doesn't include additional charges or platform-funded vouchers Talabat's own payout statement would show. For the exact number, upload your Payout Statement CSV instead.",
    payoutUnexplainedCharge1: "There's",
    payoutUnexplainedCharge2: "in",
    payoutUnexplainedCharge3:
      "with no itemized breakdown anywhere in this statement — worth asking the platform to explain it.",
    payoutUnexplainedChargeRateNote:
      "per order — worth asking the platform whether this matches a flat per-order fee.",
    payoutUnexplainedChargeChecked: "Checked",
    payoutUnexplainedChargeAllZero: "all read zero.",
    payoutManualEntryLabel: "Manual entry",
    commissionTrendTitle: "Commission Pattern",
    commissionTrendRateLabel: "Avg. agreed → effective rate",
    commissionTrendAcross: "across",
    commissionTrendStatements: "statements",
    commissionTrendExcessLabel: "Extra commission paid beyond agreed rate",
    commissionTrendUnexplainedLabel: "Unexplained Additional Charges",
    payoutDownloadPdf: "Download Report",
    payoutDownloadingPdf: "Generating…",
    payoutDownloadFullReport: "Download Full Report",
    payoutCheckLiveTab: "Connected Platform",
    payoutCheckUploadTab: "Upload Statements",
    payoutCheckUploadPlatformLabel: "Platform",
    payoutCheckCsvOnly: "CSV files only for now.",
    payoutCheckSourceLive: "Live check",
    payoutCheckSourceUpload: "Uploaded file",
    payoutCheckShowing: "Showing",
    payoutCheckRowsSkipped:
      "rows skipped — date or number format didn't match, so they weren't counted.",
    payoutCheckMultiFileHint:
      "You can also select multiple files at once — CSV, XLSX, or PDF (Snoonu only). Upload a daily order log and a payout statement together for a full commission audit.",
    payoutUploadingProgress: "of the files you selected have uploaded so far…",
    payoutSaveAudit: "Save to History",
    payoutAuditSaved: "Saved",
    historyPayoutAuditTitle: "Payout Investigations",
    historyPayoutAuditDesc: "Saved evidence reviews, possible differences, and next actions.",
    historyPayoutAuditEmpty: "No saved audits yet.",
  },
  ar: {
    cp: "لوحة التحكم",
    live: "مباشر",
    defend: "حالة حلقة الدفاع",
    defendS: "جارٍ تحميل الحالة المباشرة",
    navA: "مركز حماية الإيرادات",
    navAs: "التحليلات",
    navR: "محرك سياسة الهوامش",
    navRs: "دفتر القواعد",
    navV: "خزنة التكاملات",
    navVs: "الاتصالات",
    navH: "سجل المدفوعات وإعادة التسعير",
    navHs: "السجل",
    subA: "تحسين الأسعار الفعال ومنع الخسائر",
    subR: "قواعد تسعير بلغة طبيعية وحدود حماية الهوامش",
    subV: "اتصالات نقاط البيع والمجمعات والذاكرة المؤقتة",
    subH: "كل فحص مدفوعات وكل تغيير سعر تلقائي، في مكان واحد",
    historyViewLink: "عرض السجل ←",
    historyPayoutTitle: "سجل فحوصات المدفوعات",
    historyPayoutDesc: "كل فحص مدفوعات متوقع قمت بتشغيله — مباشر أو مرفوع.",
    historyPayoutEmpty: "لا توجد فحوصات مدفوعات بعد. شغّل واحداً من مركز الإيرادات.",
    historyRepricingTitle: "سجل إعادة التسعير",
    historyRepricingDesc: "تغييرات الأسعار التلقائية التي أجرتها Prizeskout نيابة عنك.",
    historyRepricingEmpty: "لا توجد تغييرات أسعار تلقائية بعد.",
    historyLoading: "جارٍ التحميل…",
    historyColDate: "التاريخ",
    historyColSource: "المصدر",
    historyColPlatform: "المنصة",
    historyColOrders: "الطلبات",
    historyColExpected: "المدفوعات المتوقعة",
    historyColChannel: "القناة",
    historyColSku: "رمز المنتج",
    historyColPrice: "تغيير السعر",
    historyColStatus: "الحالة",
    historyDetailPeriod: "الفترة",
    historyDetailSales: "المبيعات المستخدمة",
    historyDetailRows: "الصفوف المستخدمة",
    historyDetailItem: "الصنف",
    historyDetailRule: "سبب التفعيل",
    historyDetailMargin: "الهامش (قبل ← بعد)",
    historyDetailDuration: "المدة",
    historyDetailCompleted: "اكتمل في",
    historyDeleteConfirm: "هل تريد حذف هذا السجل؟",
    historyDeleteYes: "حذف",
    historyDeleteCancel: "إلغاء",
    stream: "بث التنفيذ المباشر",
    streamS: "بث الأحداث في الوقت الفعلي",
    profLabel: "الأرباح المحمية · هذا الشهر",
    profNoActivity: "لا يوجد نشاط بعد · اربط متجراً لبدء التتبع",
    profDefensesLabel: "دفاعات سعرية هذا الشهر",
    profTrackedFoot: "عبر قنواتك",
    profMarginFoot: "مقابل حد الهامش",
    copilotTitle: "مساعد المدير المالي",
    copilotSub: "محرك القواعد باللغة الطبيعية",
    copilotDesc: "اسأل عن أي شيء يخص التسعير، أو صف قاعدة لتحويلها إلى تهيئة محرك مباشرة.",
    copilotLive: "🟢 المساعد نشط",
    compile: "إرسال ↗",
    try: "جرب:",
    guardrails: "الحواجز النشطة",
    agentTitle: "وكيل تدقيق النزاعات المستقل",
    agentActive: "الوضع اليدوي الاحتياطي نشط",
    discLog: "سجل التناقضات · مدفوعات نقاط البيع مقابل العقود",
    genVoucher: "إنشاء قسيمة نزاع",
    downloadCsv: "تنزيل سجل التدقيق (CSV)",
    exportProofs: "تصدير أدلة النزاعات",
    fileBtn0: "تنزيل أدلة المطالبة",
    fileBtn1: "جارٍ إعداد الأدلة…",
    fileBtn3: "✓ تم تنزيل الأدلة",
    fileMsg1: "جارٍ تجميع المطالبة ومراجع الأدلة…",
    fileMsg2: "جارٍ إنشاء مستند الأدلة…",
    fileMsg3:
      "✓ تم تنزيل الأدلة. قدّمها عبر بوابة الشريك ثم سجّل الرد في مساحة المطالبات والاسترداد.",
    claimEn: "CLAIM DRAFT · ENGLISH",
    claimAr: "مسودة المطالبة · العربية",
    bilingualTitle: "حزمة نزاع ثنائية اللغة ·",
    verified: "SHA-256",
    verifiedS: "· موثق ✓",
    autoCompiled: "مُجمَّعة تلقائياً بواسطة وكيل النزاعات",
    close: "✕",
    intentLabel: "نية العمل · المصدر",
    intent: "النية:",
    confidence: "الثقة:",
    ambiguity: "الغموض:",
    intentResolved: "محلول ✓",
    applyLabel0: "تطبيق الإعداد على حلقة الأساس",
    applyLabel1: "✓ تم الرفع إلى Redis · 340ms",
    rulesEnforced: "قواعد · مفعّلة على الحافة",
    activeLabel: "✓ مفعّل · تقييم <2ms",
    pausedLabel: "متوقف. غير مفعّل حالياً.",
    previewLabel: "معاينة فقط · قواعد الفئات غير مفعّلة بعد",
    floorWarn: "⚠ الحد أقل من 15% تكلفة أساسية. سيرفض الحارس جميع التنفيذات عند هذا المستوى.",
    settingsLabel: "الإعدادات",
    backToSite: "العودة إلى الموقع",
    myAccount: "حسابي",
    settingsSub: "الوصول إلى المتجر، القنوات، قواعد الهامش، الفروع، والإشعارات.",
    supportLabel: "الدعم",
    inboundTitle: "الاتصالات الواردة",
    inboundDesc:
      "أنظمة نقاط البيع والتجارة الإلكترونية التي تغذي برايز سكاوت بالطلبات وبيانات الكتالوج.",
    outboundTitle: "الاتصالات الصادرة",
    outboundDesc: "منصات التوصيل التي يرسل إليها برايز سكاوت الأسعار الآمنة للهامش لحظياً.",
    inboundConnectedMsg: "متصل · جارٍ مزامنة البيانات",
    inboundAuthorizeMsg: "غير متصل · انقر للتفويض",
    inboundComingSoonMsg: "التكامل قريباً",
    connectPrefix: "اتصال",
    setupBadge: "الإعداد",
    soonBadge: "قريباً",
    storeConnectedSyncing: "المتجر متصل · جارٍ مزامنة الأسعار",
    tapSetupMsg: "اضغط على الإعداد لربط متجرك",
    awaitingBuildMsg: "التكامل قيد الإنشاء",
    newDiscrepancy: "تناقض جديد",
    partnerLabel: "الشريك",
    orderIdLabel: "رقم الطلب",
    branchLocationLabel: "الفرع / الموقع",
    contractedRateLabel: "النسبة المتعاقد عليها (%)",
    orderValueLabel: "قيمة الطلب",
    chargedByPartnerLabel: "المبلغ المحصل من الشريك",
    additionalNotesLabel: "ملاحظات إضافية (اختياري)",
    logDiscrepancyBtn: "+ تسجيل تناقض",
    cancelBtn: "− إلغاء",
    finishSetupBadge: "أكمل الإعداد",
    keetaConnectedMsg: "تم ربط كيتا · أكمل الإعداد بإدخال رقم المتجر",
    keetaShopIdPrompt:
      "أدخل رقم متجر كيتا (Shop ID) لإكمال الربط. يحتاج برايز سكاوت إلى هذا الرقم لإرسال الأسعار الآمنة للهامش إلى قائمة كيتا الخاصة بك.",
    keetaShopIdSaved: "تم حفظ رقم متجر كيتا · جارٍ مزامنة الأسعار",
    keetaShopIdPending: "رقم المتجر مطلوب لمزامنة الأسعار",
    tourReplayLabel: "جولة تعريفية",
    tourStartBtn: "بدء الجولة",
    tourNextBtn: "التالي",
    tourBackBtn: "رجوع",
    tourFinishBtn: "فهمت — لنربط المتجر",
    tourSkipLabel: "تخطي الجولة",
    tourWelcomeTitle: "مرحباً بك في لوحة التحكم الخاصة بك",
    tourWelcomeBody:
      "جولة سريعة مدتها دقيقتان توضح أين يتتبع PrizeSkout الهامش، ويحوّل قواعد التسعير، ويرسل الأسعار الآمنة إلى تطبيقات التوصيل الخاصة بك.",
    tourHeroTitle: "مركز حماية الإيرادات",
    tourHeroBody:
      "الأرباح المحمية، وتحديثات الأسعار، والهامش الموفر — كلها تُعرض هنا لحظياً، إلى جانب بث مباشر لكل تغيير سعر ينفذه PrizeSkout نيابة عنك.",
    tourCopilotTitle: "صِف قاعدة، واحصل على تهيئة جاهزة",
    tourCopilotBody:
      'اكتب قاعدة تسعير بلغة طبيعية — مثل "ثبّت هامش المخبوزات عند 25%" — ليقوم Copilot بتحويلها إلى حارس مفعّل عند الحافة في أقل من 2 مللي ثانية.',
    tourGuardrailsTitle: "حدود الهامش، مفعّلة دائماً",
    tourGuardrailsBody:
      "كل قاعدة تطبّقها تظهر هنا. عدّل الحد الأدنى وسيُطبَّق فوراً — دون إعادة نشر أو انتظار فريق التطوير.",
    tourSupportTitle: "عالق في شيء؟ نحن على بُعد نقرة واحدة",
    tourSupportBody:
      "مشاكل الربط، استفسارات النزاعات، أو أي شيء آخر — تواصل مع فريق PrizeSkout مباشرة من هنا.",
    tourInboundTitle: "زوّد PrizeSkout ببياناتك الحقيقية",
    tourInboundBody:
      "اربط نظام نقطة البيع أو منصة التجارة الإلكترونية الخاصة بك ليتمكن PrizeSkout من رؤية الطلبات والتكاليف والكتالوج الفعلي — الأساس الذي يقوم عليه كل شيء آخر.",
    tourOutboundTitle: "هنا يحدث الدفاع الفعلي",
    tourOutboundBody:
      "اربط طلبات، جاهز، أو أي مجمّع توصيل آخر، وسيبدأ PrizeSkout بإرسال أسعار آمنة للهامش تلقائياً — لا مزيد من تسرب الهامش الصامت.",
    payoutCheckTitle: "فحص المدفوعات المتوقعة",
    payoutCheckDesc:
      "نحسب ما كان يجب أن تحصل عليه، بناءً على نسبة العمولة التي اتفقت عليها. قارن هذا بما وصل فعلياً إلى حسابك البنكي.",
    payoutCheckBtn: "فحص آخر 30 يوماً",
    payoutCheckBtnLoading: "جارٍ سحب طلباتك…",
    payoutCheckLiveOnlyNote: "طلبات فقط حالياً — منصات أخرى قريباً.",
    payoutCheckOrders: "الطلبات المفحوصة",
    payoutCheckSubtotal: "مبيعات الطعام (بدون رسوم التوصيل)",
    payoutCheckRate: "نسبة عمولتك",
    payoutCheckCommissionLabel: "عمولة المنصة",
    payoutBreakdownTitle: "تفصيل المدفوعات",
    payoutBreakdownCommission: "رسوم العمولة",
    payoutBreakdownCharges: "رسوم إضافية",
    payoutBreakdownIncome: "دخل إضافي وقسائم",
    payoutBreakdownTotal: "إجمالي المدفوعات (بيان طلبات)",
    payoutCheckAgreedVsEffective: "النسبة المتفق عليها ← النسبة الفعلية",
    payoutShortfallSuffix: "أقل مما كان يجب أن تحصل عليه",
    payoutSurplusSuffix: "أكثر مما كانت ستنتجه نسبتك المتفق عليها وحدها",
    payoutCorrectedForAgreedRate1: "مصحّح وفق نسبتك المتفق عليها — بيان طلبات نفسه ذكر",
    payoutCheckStatementNote:
      "هذا هو المبلغ الذي أعلنته طلبات فعلياً لهذه الفترة، مأخوذ مباشرة من بيان المدفوعات الخاص بك — وليس تقديراً. يوضح التفصيل أعلاه بالضبط ما تغيّر بين إجمالي مبيعاتك وهذا الرقم.",
    payoutCheckExpectedLabel: "المفترض أن تحصل عليه",
    payoutCheckHint: "قارن هذا بإيداعك البنكي لنفس الفترة.",
    payoutCheckNotConnected: "اربط طلبات أولاً لتشغيل هذا الفحص.",
    payoutCheckUploadBtn: "رفع كشف حساب",
    payoutCheckUploadRateLabel: "نسبة العمولة لهذا الملف (%)",
    payoutCheckSalesLabel: "إجمالي المبيعات (من الملف)",
    payoutCheckUploadNote:
      "يستخدم هذا التقدير إجمالي المبيعات اليومية من الملف، والذي قد يشمل رسوم التوصيل. الفحص المباشر يقرأ كل طلب على حدة وهو أكثر دقة.",
    payoutCheckPdfNote:
      "يغطي هذا التقدير شهراً تقويمياً واحداً من تقرير سنونو (GMV)، وليس نطاق تاريخ مخصص. قد لا يتطابق تماماً إذا اختلفت طريقة سنونو في حساب المدفوعات عن حساب GMV × (1 − العمولة) البسيط.",
    payoutCheckPdfPreviewTitle: "تم استخراجه من ملف PDF — تحقق منه مقابل التقرير",
    payoutCheckPdfCancelled: "المبيعات الملغاة (GMV)",
    payoutCheckCsvOrPdfSnoonu: "CSV، أو تقرير أداء العلامة الشهري من سنونو بصيغة PDF.",
    payoutCheckTalabatHint:
      "ارفع ملف CSV الخاص ببيان مدفوعات طلبات (المالية ← المدفوعات ← تنزيل التقرير)، وليس تصدير مبيعات عام.",
    payoutCheckLiveEstimateNote:
      "هذا تقدير مبني على سجل طلباتك ونسبة عمولتك — ولا يشمل الرسوم الإضافية أو القسائم الممولة من المنصة التي قد يظهرها بيان مدفوعات طلبات نفسه. للحصول على الرقم الدقيق، ارفع ملف CSV الخاص ببيان المدفوعات بدلاً من ذلك.",
    payoutUnexplainedCharge1: "هناك",
    payoutUnexplainedCharge2: "ضمن",
    payoutUnexplainedCharge3: "بدون أي تفصيل في هذا البيان — يستحق سؤال المنصة لتوضيحه.",
    payoutUnexplainedChargeRateNote:
      "لكل طلب — يستحق سؤال المنصة عمّا إذا كان هذا يطابق رسماً ثابتاً لكل طلب.",
    payoutUnexplainedChargeChecked: "تم فحص",
    payoutUnexplainedChargeAllZero: "وكلها بقيمة صفر.",
    payoutManualEntryLabel: "إدخال يدوي",
    commissionTrendTitle: "نمط العمولة",
    commissionTrendRateLabel: "متوسط النسبة المتفق عليها ← الفعلية",
    commissionTrendAcross: "عبر",
    commissionTrendStatements: "بيانات",
    commissionTrendExcessLabel: "عمولة إضافية مدفوعة فوق النسبة المتفق عليها",
    commissionTrendUnexplainedLabel: "رسوم إضافية غير مفسّرة",
    payoutDownloadPdf: "تنزيل التقرير",
    payoutDownloadingPdf: "جارٍ الإنشاء…",
    payoutDownloadFullReport: "تنزيل التقرير الكامل",
    payoutCheckLiveTab: "فحص مباشر",
    payoutCheckUploadTab: "رفع ملف",
    payoutCheckUploadPlatformLabel: "المنصة",
    payoutCheckCsvOnly: "ملفات CSV فقط حالياً.",
    payoutCheckSourceLive: "فحص مباشر",
    payoutCheckSourceUpload: "ملف مرفوع",
    payoutCheckShowing: "يعرض",
    payoutCheckRowsSkipped: "صفوف تم تجاهلها — لم تتطابق صيغة التاريخ أو الرقم، لذا لم تُحتسب.",
    payoutCheckMultiFileHint:
      "يمكنك أيضاً اختيار عدة ملفات دفعة واحدة — CSV أو XLSX أو PDF (سنونو فقط). ارفع سجل الطلبات اليومي وبيان المدفوعات معاً للحصول على تدقيق عمولة كامل.",
    payoutUploadingProgress: "من الملفات التي اخترتها تم رفعها حتى الآن…",
    payoutSaveAudit: "حفظ في السجل",
    payoutAuditSaved: "تم الحفظ",
    historyPayoutAuditTitle: "سجل تدقيق العمولات",
    historyPayoutAuditDesc: "كل تدقيق عمولة متعدد المستندات قمت بتشغيله وحفظه.",
    historyPayoutAuditEmpty: "لا توجد عمليات تدقيق محفوظة بعد.",
  },
  fr: {
    cp: "CENTRE DE CONTRÔLE",
    live: "EN DIRECT",
    defend: "État de la boucle de défense",
    defendS: "Chargement de l’état en direct",
    navA: "Centre de protection des revenus",
    navAs: "Analytique",
    navR: "Moteur de politique de marge",
    navRs: "Livre des règles",
    navV: "Coffre d'intégrations",
    navVs: "Connexions",
    navH: "Historique des paiements et prix",
    navHs: "Historique",
    subA: "Optimisation active des prix et prévention des pertes",
    subR: "Règles de tarification en langage naturel et garde-fous de marge",
    subV: "Connexions caisse, agrégateurs et cache",
    subH: "Chaque vérification de paiement et chaque changement de prix automatique, au même endroit",
    historyViewLink: "Voir l'historique →",
    historyPayoutTitle: "Historique des vérifications de paiement",
    historyPayoutDesc:
      "Chaque vérification de paiement attendu que vous avez lancée — en direct ou importée.",
    historyPayoutEmpty:
      "Aucune vérification de paiement pour l'instant. Lancez-en une depuis le centre des revenus.",
    historyRepricingTitle: "Historique de réajustement des prix",
    historyRepricingDesc: "Changements de prix automatiques effectués par PrizeSkout en votre nom.",
    historyRepricingEmpty: "Aucun changement de prix automatique pour l'instant.",
    historyLoading: "Chargement…",
    historyColDate: "Date",
    historyColSource: "Source",
    historyColPlatform: "Plateforme",
    historyColOrders: "Commandes",
    historyColExpected: "Paiement attendu",
    historyColChannel: "Canal",
    historyColSku: "SKU",
    historyColPrice: "Changement de prix",
    historyColStatus: "Statut",
    historyDetailPeriod: "Période",
    historyDetailSales: "Ventes utilisées",
    historyDetailRows: "Lignes utilisées",
    historyDetailItem: "Article",
    historyDetailRule: "Déclencheur",
    historyDetailMargin: "Marge (avant → après)",
    historyDetailDuration: "Durée",
    historyDetailCompleted: "Terminé le",
    historyDeleteConfirm: "Supprimer cet enregistrement ?",
    historyDeleteYes: "Supprimer",
    historyDeleteCancel: "Annuler",
    stream: "Flux d'exécution en direct",
    streamS: "Flux d'événements en temps réel",
    profLabel: "Profits protégés · Ce mois-ci",
    profNoActivity:
      "Aucune activité pour l'instant · connectez une boutique pour commencer le suivi",
    profDefensesLabel: "défenses de prix ce mois-ci",
    profTrackedFoot: "sur vos canaux",
    profMarginFoot: "vs. seuil de marge",
    copilotTitle: "Copilote CFO",
    copilotSub: "Moteur de règles en langage naturel",
    copilotDesc:
      "Posez une question sur la stratégie de prix, ou décrivez une règle pour la compiler dans une configuration moteur active.",
    copilotLive: "🟢 Copilote actif",
    compile: "Envoyer ↗",
    try: "Essayez :",
    guardrails: "Garde-fous actifs",
    agentTitle: "Agent autonome d'audit des litiges",
    agentActive: "Mode manuel de secours actif",
    discLog: "Journal des écarts · Versements caisse vs contrats",
    genVoucher: "Générer un bon de litige",
    downloadCsv: "Télécharger le journal d'audit (CSV)",
    exportProofs: "Exporter les preuves de litige",
    fileBtn0: "Télécharger les preuves de la réclamation",
    fileBtn1: "Préparation des preuves…",
    fileBtn3: "✓ Preuves téléchargées",
    fileMsg1: "Compilation de la réclamation et des références de preuve…",
    fileMsg2: "Génération du document de preuve…",
    fileMsg3:
      "✓ Preuves téléchargées. Envoyez-les via le portail partenaire, puis consignez la réponse dans Réclamations et recouvrement.",
    claimEn: "CLAIM DRAFT · ENGLISH",
    claimAr: "مسودة المطالبة · العربية",
    bilingualTitle: "Dossier de litige bilingue ·",
    verified: "SHA-256",
    verifiedS: "· VÉRIFIÉ ✓",
    autoCompiled: "compilé automatiquement par l'agent de litiges",
    close: "✕",
    intentLabel: "Intention métier · Source",
    intent: "intention :",
    confidence: "confiance :",
    ambiguity: "ambiguïté :",
    intentResolved: "résolue ✓",
    applyLabel0: "Appliquer la configuration à la boucle principale",
    applyLabel1: "✓ Déployé vers la boucle principale · Redis 340ms",
    rulesEnforced: "règles · appliquées en périphérie",
    activeLabel: "✓ appliquée · éval <2ms",
    pausedLabel: "En pause. Non appliquée actuellement.",
    previewLabel: "Aperçu uniquement · règles par catégorie pas encore appliquées",
    floorWarn:
      "⚠ Le seuil est inférieur à 15 % du coût de revient. Le garde-fou rejettera toutes les exécutions à ce niveau.",
    settingsLabel: "Paramètres",
    backToSite: "Retour au site",
    myAccount: "Mon compte",
    settingsSub: "Accès à la boutique, canaux, règles de marge, points de vente et notifications.",
    supportLabel: "Support",
    inboundTitle: "Connexions entrantes",
    inboundDesc:
      "Plateformes de caisse et e-commerce qui alimentent PrizeSkout en commandes et données catalogue.",
    outboundTitle: "Connexions sortantes",
    outboundDesc:
      "Agrégateurs de livraison vers lesquels PrizeSkout pousse des prix protégeant la marge en temps réel.",
    inboundConnectedMsg: "connecté · synchronisation des données",
    inboundAuthorizeMsg: "non connecté · cliquez pour autoriser",
    inboundComingSoonMsg: "intégration à venir",
    connectPrefix: "Connecter",
    setupBadge: "CONFIG",
    soonBadge: "BIENTÔT",
    storeConnectedSyncing: "Boutique connectée · synchronisation des prix",
    tapSetupMsg: "Appuyez sur CONFIG pour connecter votre boutique",
    awaitingBuildMsg: "Intégration en cours de développement",
    newDiscrepancy: "Nouvel écart",
    partnerLabel: "Partenaire",
    orderIdLabel: "N° de commande",
    branchLocationLabel: "Filiale / Emplacement",
    contractedRateLabel: "Taux contractuel (%)",
    orderValueLabel: "Valeur de la commande",
    chargedByPartnerLabel: "Facturé par le partenaire",
    additionalNotesLabel: "Notes complémentaires (facultatif)",
    logDiscrepancyBtn: "+ Signaler un écart",
    cancelBtn: "− Annuler",
    finishSetupBadge: "Terminer la configuration",
    keetaConnectedMsg: "Keeta connecté · terminez la configuration en saisissant votre Shop ID",
    keetaShopIdPrompt:
      "Saisissez le Shop ID de votre boutique Keeta pour terminer la connexion. PrizeSkout en a besoin pour envoyer les prix protégeant la marge à votre menu Keeta.",
    keetaShopIdSaved: "Shop ID Keeta enregistré · synchronisation des prix",
    keetaShopIdPending: "Shop ID requis pour synchroniser les prix",
    tourReplayLabel: "Visite guidée",
    tourStartBtn: "Commencer la visite",
    tourNextBtn: "Suivant",
    tourBackBtn: "Retour",
    tourFinishBtn: "Compris — connectons ma boutique",
    tourSkipLabel: "Ignorer la visite",
    tourWelcomeTitle: "Bienvenue dans votre centre de contrôle",
    tourWelcomeBody:
      "Une visite de deux minutes : où PrizeSkout suit votre marge, compile vos règles de tarification, et transmet les prix protégés à vos applications de livraison.",
    tourHeroTitle: "Centre de protection des revenus",
    tourHeroBody:
      "Profits protégés, mises à jour de prix et marge économisée — suivis ici en temps réel, avec un flux en direct de chaque changement de prix effectué par PrizeSkout en votre nom.",
    tourCopilotTitle: "Décrivez une règle, obtenez une configuration",
    tourCopilotBody:
      "Tapez une règle de tarification en langage naturel — « Verrouiller la marge boulangerie à 25 % » — et Copilote la compile en un garde-fou appliqué en périphérie en moins de 2 ms.",
    tourGuardrailsTitle: "Vos seuils de marge, toujours appliqués",
    tourGuardrailsBody:
      "Chaque règle appliquée apparaît ici. Ajustez un seuil et il prend effet immédiatement — sans redéploiement, sans attendre l'équipe technique.",
    tourSupportTitle: "Un problème ? Nous sommes à un clic",
    tourSupportBody:
      "Problèmes d'intégration, questions sur un litige, ou autre chose — contactez l'équipe PrizeSkout directement depuis ici.",
    tourInboundTitle: "Alimentez PrizeSkout avec vos données réelles",
    tourInboundBody:
      "Connectez votre caisse ou votre plateforme e-commerce pour que PrizeSkout puisse voir vos commandes, coûts et catalogue réels — la base sur laquelle tout le reste fonctionne.",
    tourOutboundTitle: "C'est ici que la défense entre en jeu",
    tourOutboundBody:
      "Connectez Talabat, Jahez, ou tout autre agrégateur de livraison, et PrizeSkout commence à transmettre automatiquement des prix qui protègent votre marge — plus de fuite silencieuse de marge.",
    payoutCheckTitle: "Vérification du paiement attendu",
    payoutCheckDesc:
      "Nous calculons ce que vous auriez dû recevoir, selon le taux de commission convenu. Comparez ce montant à votre dépôt bancaire.",
    payoutCheckBtn: "Vérifier les 30 derniers jours",
    payoutCheckBtnLoading: "Récupération de vos commandes…",
    payoutCheckLiveOnlyNote: "Talabat uniquement pour l'instant — autres plateformes à venir.",
    payoutCheckOrders: "Commandes vérifiées",
    payoutCheckSubtotal: "Ventes nourriture (hors frais de livraison)",
    payoutCheckRate: "Votre taux de commission",
    payoutCheckCommissionLabel: "Commission de la plateforme",
    payoutBreakdownTitle: "Détail du paiement",
    payoutBreakdownCommission: "Frais de commission",
    payoutBreakdownCharges: "Frais supplémentaires",
    payoutBreakdownIncome: "Revenus supplémentaires et bons",
    payoutBreakdownTotal: "Paiement total (relevé Talabat)",
    payoutCheckAgreedVsEffective: "Taux convenu → taux effectif réel",
    payoutShortfallSuffix: "de moins que ce que vous auriez dû recevoir",
    payoutSurplusSuffix: "de plus que ce que votre taux convenu seul aurait produit",
    payoutCorrectedForAgreedRate1: "Corrigé selon votre taux convenu — le relevé Talabat indiquait",
    payoutCheckStatementNote:
      "Il s'agit du paiement réellement déclaré par Talabat pour cette période, lu directement depuis votre relevé de paiement — pas une estimation. Le détail ci-dessus montre exactement ce qui a évolué entre vos ventes brutes et ce montant.",
    payoutCheckExpectedLabel: "Vous auriez dû recevoir",
    payoutCheckHint: "Comparez ce montant à votre dépôt bancaire pour la même période.",
    payoutCheckNotConnected: "Connectez d'abord Talabat pour lancer cette vérification.",
    payoutCheckUploadBtn: "Importer un relevé",
    payoutCheckUploadRateLabel: "Taux de commission pour ce fichier (%)",
    payoutCheckSalesLabel: "Ventes totales (depuis le fichier)",
    payoutCheckUploadNote:
      "Cette estimation utilise le total des ventes quotidiennes du fichier, qui peut inclure les frais de livraison. Une vérification en direct lit chaque commande séparément et est plus précise.",
    payoutCheckPdfNote:
      "Cette estimation couvre un mois calendaire du rapport Snoonu (GMV), pas une plage de dates personnalisée. Elle peut différer si le calcul réel de Snoonu n'est pas un simple GMV × (1 − commission).",
    payoutCheckPdfPreviewTitle: "Extrait de votre PDF — à vérifier avec le rapport",
    payoutCheckPdfCancelled: "GMV annulé",
    payoutCheckCsvOrPdfSnoonu: "CSV, ou le rapport de performance de marque mensuel PDF de Snoonu.",
    payoutCheckTalabatHint:
      "Importez le CSV du relevé de paiement Talabat (Finance → Paiements → Télécharger le rapport), pas un export de ventes général.",
    payoutCheckLiveEstimateNote:
      "Il s'agit d'une estimation basée sur votre historique de commandes et votre taux de commission — elle n'inclut pas les frais supplémentaires ni les bons financés par la plateforme que le relevé de paiement Talabat afficherait. Pour le montant exact, importez plutôt votre relevé de paiement CSV.",
    payoutUnexplainedCharge1: "Il y a",
    payoutUnexplainedCharge2: "dans",
    payoutUnexplainedCharge3:
      "sans aucun détail dans ce relevé — vaut la peine de demander à la plateforme de l'expliquer.",
    payoutUnexplainedChargeRateNote:
      "par commande — vaut la peine de demander à la plateforme si cela correspond à des frais fixes par commande.",
    payoutUnexplainedChargeChecked: "Vérifié",
    payoutUnexplainedChargeAllZero: "tous à zéro.",
    payoutManualEntryLabel: "Saisie manuelle",
    commissionTrendTitle: "Tendance de commission",
    commissionTrendRateLabel: "Taux moyen convenu → effectif",
    commissionTrendAcross: "sur",
    commissionTrendStatements: "relevés",
    commissionTrendExcessLabel: "Commission supplémentaire payée au-delà du taux convenu",
    commissionTrendUnexplainedLabel: "Frais supplémentaires inexpliqués",
    payoutDownloadPdf: "Télécharger le rapport",
    payoutDownloadingPdf: "Génération…",
    payoutDownloadFullReport: "Télécharger le rapport complet",
    payoutCheckLiveTab: "Vérification en direct",
    payoutCheckUploadTab: "Importer un fichier",
    payoutCheckUploadPlatformLabel: "Plateforme",
    payoutCheckCsvOnly: "Fichiers CSV uniquement pour le moment.",
    payoutCheckSourceLive: "Vérification en direct",
    payoutCheckSourceUpload: "Fichier importé",
    payoutCheckShowing: "Affichage",
    payoutCheckRowsSkipped:
      "lignes ignorées — le format de date ou de nombre ne correspondait pas, donc elles n'ont pas été comptées.",
    payoutCheckMultiFileHint:
      "Vous pouvez aussi sélectionner plusieurs fichiers à la fois — CSV, XLSX, ou PDF (Snoonu uniquement). Importez un journal de commandes quotidien et un relevé de paiement ensemble pour un audit de commission complet.",
    payoutUploadingProgress: "des fichiers sélectionnés ont été importés jusqu'à présent…",
    payoutSaveAudit: "Enregistrer dans l'historique",
    payoutAuditSaved: "Enregistré",
    historyPayoutAuditTitle: "Historique d'audit des commissions",
    historyPayoutAuditDesc:
      "Chaque audit de commission multi-documents que vous avez exécuté et enregistré.",
    historyPayoutAuditEmpty: "Aucun audit enregistré pour le moment.",
  },
};

const DASHBOARD_UI = {
  en: {
    groups: {
      start: "Start",
      understand: "Understand",
      plan: "Plan & automate",
      records: "Records",
    },
    today: "Today",
    startHere: "Start here",
    overview: "Business Overview",
    moneyProducts: "Money & products",
    manager: "Store Manager",
    delegateApprove: "Delegate & approve",
    todaySub: "Your priorities, store health, and next best actions",
    managerSub:
      "Delegate store operations, approve protected actions, and review verified outcomes",
    promoSub: "Model discount economics and margin risk before approving a campaign",
    useAssistants: "Use CFO Copilot or Store Manager.",
    delegateAsk: "Delegate or ask →",
    assistant: {
      today: [
        "Need an explanation or want PrizeSkout to handle store work?",
        "What needs my attention today?",
        "What did I actually keep from orders this month?",
        "Prepare my highest-priority store tasks",
      ],
      analytics: [
        "Want to understand a risk or make a catalogue change?",
        "Show products losing money",
        "What did I actually keep from orders this month?",
      ],
      manager: [
        "Delegate store operations or review the work already in progress.",
        "What needs my attention today?",
        "Find products with incomplete information",
        "Prepare my highest-priority store tasks",
      ],
      promotions: [
        "Want help testing a campaign or understanding its margin risk?",
        "Check whether my active coupon is safe",
        "What discount can I afford without breaching margin?",
      ],
      rules: [
        "Want help choosing or applying safe protection rules?",
        "Explain my active margin protection",
        "Protect a 20% margin on all products",
      ],
      vault: [
        "Need to sync or inspect a connected store?",
        "Pull my latest catalogue",
        "Show products that need inventory attention",
      ],
      history: [
        "Want a recent action or payout result explained?",
        "What did you just change?",
        "Summarize my latest payout check",
      ],
      settings: [
        "Want help understanding your protection settings?",
        "Explain my active margin protection",
        "Check whether my active coupon is safe",
      ],
    },
  },
  ar: {
    groups: { start: "ابدأ", understand: "افهم أعمالك", plan: "خطط وأتمت", records: "السجلات" },
    today: "اليوم",
    startHere: "ابدأ من هنا",
    overview: "نظرة عامة على الأعمال",
    moneyProducts: "الأموال والمنتجات",
    manager: "مدير المتجر",
    delegateApprove: "فوّض ووافق",
    todaySub: "أولوياتك وصحة متجرك وأفضل الخطوات التالية",
    managerSub: "فوّض عمليات المتجر ووافق على الإجراءات المحمية وراجع النتائج المؤكدة",
    promoSub: "اختبر أثر الخصومات على الربح والهامش قبل الموافقة على الحملة",
    useAssistants: "استخدم المساعد المالي أو مدير المتجر.",
    delegateAsk: "فوّض أو اسأل ←",
    assistant: {
      today: [
        "هل تريد شرحاً أو تريد من PrizeSkout تنفيذ أعمال المتجر؟",
        "ما الذي يحتاج إلى انتباهي اليوم؟",
        "كم احتفظت فعلياً من الطلبات هذا الشهر؟",
        "جهّز أهم مهام المتجر",
      ],
      analytics: [
        "هل تريد فهم مخاطرة أو إجراء تعديل في الكتالوج؟",
        "اعرض المنتجات التي تخسر المال",
        "كم احتفظت فعلياً من الطلبات هذا الشهر؟",
      ],
      manager: [
        "فوّض عمليات المتجر أو راجع العمل الجاري.",
        "ما الذي يحتاج إلى انتباهي اليوم؟",
        "ابحث عن المنتجات ذات المعلومات الناقصة",
        "جهّز أهم مهام المتجر",
      ],
      promotions: [
        "هل تريد مساعدة في اختبار حملة أو فهم مخاطرها على الهامش؟",
        "تحقق إن كان كوبوني الحالي آمناً",
        "ما الخصم الذي أستطيع تقديمه دون تجاوز حد الهامش؟",
      ],
      rules: [
        "هل تريد مساعدة في اختيار قواعد حماية آمنة؟",
        "اشرح حماية الهامش الحالية",
        "احمِ هامشاً بنسبة 20% لكل المنتجات",
      ],
      vault: [
        "هل تريد مزامنة متجر متصل أو فحصه؟",
        "اسحب أحدث كتالوج لدي",
        "اعرض المنتجات التي تحتاج إلى مراجعة المخزون",
      ],
      history: [
        "هل تريد شرح إجراء أو نتيجة مدفوعات حديثة؟",
        "ما الذي غيّرته للتو؟",
        "لخّص أحدث فحص للمدفوعات",
      ],
      settings: [
        "هل تريد فهم إعدادات الحماية؟",
        "اشرح حماية الهامش الحالية",
        "تحقق إن كان كوبوني الحالي آمناً",
      ],
    },
  },
  fr: {
    groups: {
      start: "Commencer",
      understand: "Comprendre",
      plan: "Planifier et automatiser",
      records: "Historique",
    },
    today: "Aujourd’hui",
    startHere: "Commencer ici",
    overview: "Vue d’ensemble",
    moneyProducts: "Finances et produits",
    manager: "Gestionnaire de boutique",
    delegateApprove: "Déléguer et valider",
    todaySub: "Vos priorités, la santé de votre boutique et les prochaines actions",
    managerSub: "Déléguez les opérations, validez les actions protégées et contrôlez les résultats",
    promoSub: "Mesurez la rentabilité et le risque de marge avant de valider une campagne",
    useAssistants: "Utilisez le copilote financier ou le gestionnaire de boutique.",
    delegateAsk: "Déléguer ou demander →",
    assistant: {
      today: [
        "Besoin d’une explication ou envie de confier une tâche à PrizeSkout ?",
        "Qu’est-ce qui demande mon attention aujourd’hui ?",
        "Combien ai-je réellement conservé sur les commandes ce mois-ci ?",
        "Préparer mes tâches prioritaires",
      ],
      analytics: [
        "Vous voulez comprendre un risque ou modifier le catalogue ?",
        "Afficher les produits qui perdent de l’argent",
        "Combien ai-je réellement conservé ce mois-ci ?",
      ],
      manager: [
        "Déléguez les opérations ou examinez le travail en cours.",
        "Qu’est-ce qui demande mon attention aujourd’hui ?",
        "Trouver les produits aux informations incomplètes",
        "Préparer mes tâches prioritaires",
      ],
      promotions: [
        "Besoin d’aide pour tester une campagne ou son risque de marge ?",
        "Vérifier si mon coupon actif est rentable",
        "Quelle remise puis-je offrir sans passer sous ma marge minimale ?",
      ],
      rules: [
        "Besoin d’aide pour choisir des règles de protection sûres ?",
        "Expliquer ma protection de marge active",
        "Protéger une marge de 20 % sur tous les produits",
      ],
      vault: [
        "Besoin de synchroniser ou d’examiner une boutique connectée ?",
        "Importer mon dernier catalogue",
        "Afficher les produits dont le stock demande une vérification",
      ],
      history: [
        "Besoin d’expliquer une action ou un versement récent ?",
        "Qu’avez-vous modifié à l’instant ?",
        "Résumer mon dernier contrôle de versement",
      ],
      settings: [
        "Besoin de comprendre vos réglages de protection ?",
        "Expliquer ma protection de marge active",
        "Vérifier si mon coupon actif est rentable",
      ],
    },
  },
} as const;

function parseIntent(text: string): Record<string, unknown> {
  const t = text.toLowerCase();
  const pm = t.match(/(\d+(?:\.\d+)?)\s*%/);
  const floor = pm ? Number(pm[1]) / 100 : null;
  const cat = t.includes("sourdough")
    ? "sourdough"
    : t.includes("bakery")
      ? "bakery"
      : t.includes("hot drink") || t.includes("coffee") || t.includes("latte")
        ? "hot_drinks"
        : t.includes("dairy")
          ? "dairy"
          : t.includes("beverage")
            ? "beverages"
            : t.includes("produce")
              ? "produce"
              : null;
  if (
    t.includes("jahez") ||
    t.includes("talabat") ||
    (t.includes("competitor") && t.includes("match"))
  ) {
    return {
      engine_rule: "competitor_price_match",
      competitor: t.includes("talabat") ? "talabat" : "jahez",
      target_sku_class: cat ?? "all",
      match_direction: t.includes("raise") || t.includes(" up") ? "up" : "down",
      minimum_floor: floor ?? 0.18,
      regional_override_allowed: false,
      latency_budget_ms: 1850,
    };
  }
  if (t.includes("rain") || t.includes("storm") || t.includes("weather")) {
    return {
      engine_rule: "conditional_floor_raise",
      target_category: cat ?? "hot_drinks",
      minimum_floor: floor ?? 0.35,
      trigger: "weather.rain_storm",
      revert_after_hours: 6,
      latency_budget_ms: 1850,
    };
  }
  return {
    engine_rule: "active_margin_defense",
    target_category: cat ?? "all_categories",
    minimum_floor: floor ?? 0.25,
    regional_override_allowed: false,
    latency_budget_ms: 1850,
  };
}

function tokenizeJson(obj: unknown): { t: string; c: string }[] {
  const str = JSON.stringify(obj, null, 2);
  const out: { t: string; c: string }[] = [];
  const re =
    /("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}\[\],])|(\s+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    if (m[1] !== undefined) {
      out.push({ t: m[1], c: "#79C0FF" });
      out.push({ t: m[2] + " ", c: "#8B949E" });
    } else if (m[3] !== undefined) out.push({ t: m[3], c: "#7EE2A8" });
    else if (m[4] !== undefined) out.push({ t: m[4], c: "#F2A971" });
    else if (m[5] !== undefined) out.push({ t: m[5], c: "#D2A8FF" });
    else if (m[6] !== undefined) out.push({ t: m[6], c: "#8B949E" });
    else out.push({ t: m[7] ?? "", c: "#8B949E" });
  }
  return out;
}

const DISPLAY_CURRENCIES = ["QAR", "SAR", "AED"] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
const QAR_RATES: Record<DisplayCurrency, number> = { QAR: 1, SAR: 1.03, AED: 1.0 };

function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return DISPLAY_CURRENCIES.includes(value as DisplayCurrency);
}

function convertMoney(n: number, from: string, to: DisplayCurrency): number {
  const sourceRate = isDisplayCurrency(from) ? QAR_RATES[from] : 1;
  return (n / sourceRate) * QAR_RATES[to];
}

function fmtMoney(n: number, currency: string): string {
  const target = isDisplayCurrency(currency) ? currency : "QAR";
  return Math.round(n * QAR_RATES[target]).toLocaleString("en-US");
}

function fmtConvertedMoney(n: number, from: string, to: DisplayCurrency): string {
  return convertMoney(n, from, to).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Shared between the live "just ran a check" result and a History tab row's
// expanded detail — same comprehensive breakdown either way, not an
// abridged summary in one place and the full picture in the other.
type PayoutResultLike = {
  order_count: number;
  sub_total_sum: number;
  commission_rate_pct?: number | null;
  expected_payout: number;
  estimated_payout?: number | null;
  claims_ready_payout?: number | null;
  claims_ready_order_count?: number | null;
  payout_confidence?: "claims_ready" | "estimated" | "insufficient_evidence" | null;
  accounting_blockers?: string[] | null;
  excluded_cancelled_orders?: number | null;
  excluded_pending_orders?: number | null;
  unknown_status_orders?: number | null;
  duplicate_order_ids?: string[] | null;
  refund_total?: number | null;
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
  extra_line_items?: { label: string; value: number }[] | null;
  unexplained_charge?: { label: string; amount: number } | null;
  charge_explainers?: { label: string; value: number }[] | null;
  deduction_breakdown?: {
    gross_sales: number;
    commission: number;
    vat_on_fees: number;
    payment_fees: number;
    fixed_order_fees: number;
    delivery_contribution: number;
    expected_net: number;
  } | null;
  commercial_terms?: {
    commission_rate_pct: number;
    vat_on_fees_pct: number;
    payment_fee_pct: number;
    fixed_order_fee: number;
    delivery_contribution: number;
    source: string;
  } | null;
  sale_lines?:
    | {
        order_id: string;
        product_name: string;
        sku: string | null;
        quantity: number;
        gross_sale: number;
        commission: number;
        vat_on_fees: number;
        payment_fee: number;
        fixed_order_fee: number;
        delivery_contribution: number;
        expected_net: number;
        lifecycle_status?: string;
        eligibility?: "eligible" | "cancelled" | "refunded" | "pending" | "unknown";
        refund_amount?: number;
        claims_ready?: boolean;
        order_date: string | null;
        expected_settlement_date: string | null;
      }[]
    | null;
  settlement_forecast?: {
    as_of: string;
    confidence: "verified_contract" | "incomplete_contract" | "estimated_schedule";
    blockers: string[];
    expected_today: number;
    expected_next_settlement: { date: string; amount: number } | null;
    by_settlement_date: { date: string; amount: number; orders: number }[];
    by_product: { product_name: string; sku: string | null; amount: number; quantity: number }[];
    by_platform: { platform: string; amount: number; orders: number }[];
    transaction_count: number;
  } | null;
};

function PayoutResultDetail({
  data,
  currency,
  t,
}: {
  data: PayoutResultLike;
  currency: string;
  t: (typeof T)["en"];
}) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async (format: "pdf" | "word" = "pdf") => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (format === "word") {
        const { exportPayoutCheckWord } =
          await import("@/components/dashboard/payout/exportReportsWord");
        await exportPayoutCheckWord(data, currency);
      } else {
        const { exportPayoutCheckPdf } =
          await import("@/components/dashboard/payout/exportPayoutReportPdf");
        await exportPayoutCheckPdf(data, currency);
      }
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
    ? data.expected_payout +
      ((data.commission_amount ?? 0) - (data.sub_total_sum * (data.commission_rate_pct ?? 0)) / 100)
    : data.expected_payout;
  const agreedDelta = expectedAtAgreed - data.expected_payout;
  const showAgreedDelta = hasRates && Math.abs(agreedDelta) > 0.01;
  const headlineAmount = showAgreedDelta ? expectedAtAgreed : data.expected_payout;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => handleDownload("pdf")}
          disabled={downloading}
          style={{
            cursor: downloading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "7px 12px",
            opacity: downloading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? t.payoutDownloadingPdf : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("word")}
          disabled={downloading}
          style={{
            cursor: downloading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--text)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "7px 12px",
          }}
        >
          Download Word
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          animation: "pk-in .3s ease",
        }}
      >
        {[
          { value: String(data.order_count), label: t.payoutCheckOrders },
          {
            value: `${currency} ${fmtMoney(data.sub_total_sum, currency)}`,
            label: data.source === "upload" ? t.payoutCheckSalesLabel : t.payoutCheckSubtotal,
          },
          { value: `${data.commission_rate_pct}%`, label: t.payoutCheckRate },
          {
            value: `${currency} ${fmtMoney(data.commission_amount ?? data.sub_total_sum - data.expected_payout, currency)}`,
            label: t.payoutCheckCommissionLabel,
            accent: true,
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 23,
                fontWeight: 700,
                color: m.accent ? OG : "var(--text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.value}
            </span>
            <span
              style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.3 }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {data.source === "live" && data.payout_confidence && (
        <div style={{ background: data.payout_confidence === "claims_ready" ? "rgba(16,185,129,.08)" : "rgba(245,158,11,.08)", border: `1px solid ${data.payout_confidence === "claims_ready" ? "rgba(16,185,129,.35)" : "rgba(245,158,11,.4)"}`, borderRadius: 12, padding: "14px 16px", fontSize: 12.5 }}>
          <div style={{ fontWeight: 900 }}>{data.payout_confidence === "claims_ready" ? "Claims-ready expected payout" : "Estimated payout — accounting evidence remains open"}</div>
          <div style={{ marginTop: 5, color: "var(--muted)" }}>Claims-ready subset: {currency} {fmtMoney(data.claims_ready_payout ?? 0, currency)} across {data.claims_ready_order_count ?? 0} order(s). Estimated complete payout: {currency} {fmtMoney(data.estimated_payout ?? data.expected_payout, currency)}.</div>
          {!!data.accounting_blockers?.length && <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, color: "var(--muted)" }}>{data.accounting_blockers.map(item => <li key={item}>{item}</li>)}</ul>}
        </div>
      )}

      {data.source === "live" && data.deduction_breakdown && (
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            Automated contractual payout waterfall
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>
            Live Talabat sales × your saved commercial terms. These expectations update whenever you
            run the live check.
          </div>
          {[
            ["Gross product sales", data.deduction_breakdown.gross_sales, false],
            [
              `Talabat commission (${data.commercial_terms?.commission_rate_pct ?? data.commission_rate_pct}%)`,
              data.deduction_breakdown.commission,
              true,
            ],
            [
              `VAT on platform fees (${data.commercial_terms?.vat_on_fees_pct ?? 0}%)`,
              data.deduction_breakdown.vat_on_fees,
              true,
            ],
            [
              `Payment fees (${data.commercial_terms?.payment_fee_pct ?? 0}%)`,
              data.deduction_breakdown.payment_fees,
              true,
            ],
            ["Fixed order fees", data.deduction_breakdown.fixed_order_fees, true],
            [
              "Restaurant delivery contribution",
              data.deduction_breakdown.delivery_contribution,
              true,
            ],
          ].map(([label, value, deduction]) => (
            <div
              key={String(label)}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}
            >
              <span style={{ color: "var(--muted)" }}>{label}</span>
              <span
                style={{
                  fontWeight: 700,
                  color: deduction && Number(value) > 0 ? "#DC2626" : "var(--text)",
                }}
              >
                {deduction && Number(value) > 0 ? "−" : ""}
                {currency} {fmtMoney(Number(value), currency)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border)",
              paddingTop: 10,
              fontSize: 15,
              fontWeight: 900,
            }}
          >
            <span>Expected restaurant payout</span>
            <span style={{ color: GN }}>
              {currency} {fmtMoney(data.deduction_breakdown.expected_net, currency)}
            </span>
          </div>
        </div>
      )}

      {data.source === "live" && !!data.sale_lines?.length && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>Expected payout by product sale</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 12px" }}>
            Order deductions are allocated proportionally to each product. If Talabat omits item
            details, the row is truthfully labelled “Order total.”
          </div>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  {[
                    "Product / order",
                    "Qty",
                    "Gross",
                    "Commission",
                    "VAT + payment",
                    "Other",
                    "Expected net",
                  ].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px",
                        textAlign: i ? "end" : "start",
                        fontSize: 10.5,
                        color: "var(--muted)",
                        borderBottom: "1px solid var(--border)",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sale_lines.map((line, i) => (
                  <tr key={`${line.order_id}-${line.sku ?? line.product_name}-${i}`}>
                    <td style={{ padding: "10px 9px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{line.product_name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                        {line.sku ? `${line.sku} · ` : ""}
                        {line.order_id} · {line.lifecycle_status ?? "status not evidenced"}
                        {(line.refund_amount ?? 0) > 0 ? ` · refund ${currency} ${fmtMoney(line.refund_amount ?? 0, currency)}` : ""}
                        {` · ${line.claims_ready ? "claims-ready" : "estimated"}`}
                      </div>
                    </td>
                    {[
                      line.quantity,
                      line.gross_sale,
                      line.commission,
                      line.vat_on_fees + line.payment_fee,
                      line.fixed_order_fee + line.delivery_contribution,
                      line.expected_net,
                    ].map((v, j) => (
                      <td
                        key={j}
                        style={{
                          padding: "10px 9px",
                          textAlign: "end",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 12.5,
                          fontWeight: j === 5 ? 800 : 500,
                          color: j === 5 ? GN : "var(--text)",
                        }}
                      >
                        {j === 0 ? v : `${currency} ${fmtMoney(v, currency)}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.source === "upload" && !!data.rows_skipped && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#B45309" }}>
          {data.rows_skipped} / {data.rows_total} {t.payoutCheckRowsSkipped}
        </span>
      )}

      {data.brand && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.6,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            animation: "pk-in .3s ease",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--text)" }}>
            {t.payoutCheckPdfPreviewTitle}
          </span>
          <span>
            {data.brand} · {data.period_start}
          </span>
          {data.cancelled_orders != null && (
            <span>
              {t.payoutCheckPdfCancelled}: {currency} {fmtMoney(data.cancelled_gmv ?? 0, currency)}{" "}
              ({data.cancelled_orders})
            </span>
          )}
        </div>
      )}

      {data.effective_commission_pct != null && (
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 9,
            animation: "pk-in .3s ease",
            maxWidth: 480,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.04em",
            }}
          >
            {t.payoutBreakdownTitle}
          </span>
          {[
            { label: t.payoutCheckSubtotal, value: data.sub_total_sum },
            { label: t.payoutBreakdownCommission, value: -(data.commission_amount ?? 0) },
            { label: t.payoutBreakdownCharges, value: -(data.additional_charges ?? 0) },
            { label: t.payoutBreakdownIncome, value: data.additional_income ?? 0 },
            ...(data.extra_line_items ?? []),
          ].map((li) => (
            <div
              key={li.label}
              style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5 }}
            >
              <span style={{ color: "var(--muted)" }}>{li.label}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: li.value < 0 ? "#DC2626" : "var(--text)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {li.value < 0 ? "−" : ""}
                {currency} {fmtMoney(Math.abs(li.value), currency)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 14,
              fontWeight: 800,
              borderTop: "1px solid var(--border)",
              paddingTop: 9,
            }}
          >
            <span>{t.payoutBreakdownTotal}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {currency} {fmtMoney(data.expected_payout, currency)}
            </span>
          </div>
          {data.commission_rate_pct != null && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", paddingTop: 2 }}>
              {t.payoutCheckAgreedVsEffective}:{" "}
              <span style={{ fontWeight: 700, color: "var(--text)" }}>
                {data.commission_rate_pct}%
              </span>
              {" → "}
              <span style={{ fontWeight: 700, color: OG }}>{data.effective_commission_pct}%</span>
            </div>
          )}
        </div>
      )}

      {data.unexplained_charge && (
        <div
          style={{
            fontSize: 12.5,
            color: "#B45309",
            lineHeight: 1.6,
            background: "color-mix(in srgb,#B45309 8%,var(--surface))",
            border: "1px solid color-mix(in srgb,#B45309 28%,transparent)",
            borderRadius: 9,
            padding: "10px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            animation: "pk-in .3s ease",
            maxWidth: 480,
          }}
        >
          <span>⚠</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span>
              {t.payoutUnexplainedCharge1}{" "}
              <strong>
                {currency} {fmtMoney(data.unexplained_charge.amount, currency)}
              </strong>{" "}
              {t.payoutUnexplainedCharge2} <strong>{data.unexplained_charge.label}</strong>{" "}
              {t.payoutUnexplainedCharge3}
            </span>
            {!!data.order_count && (
              <span style={{ fontSize: 11.5, opacity: 0.85 }}>
                ≈ {currency} {(data.unexplained_charge.amount / data.order_count).toFixed(2)}{" "}
                {t.payoutUnexplainedChargeRateNote}
              </span>
            )}
            {!!data.charge_explainers?.length && (
              <span style={{ fontSize: 11.5, opacity: 0.85 }}>
                {t.payoutUnexplainedChargeChecked}:{" "}
                {data.charge_explainers
                  .map((c) => `${c.label} (${currency} ${fmtMoney(c.value, currency)})`)
                  .join(", ")}{" "}
                — {t.payoutUnexplainedChargeAllZero}
              </span>
            )}
          </span>
        </div>
      )}

      <div
        style={{
          background: `color-mix(in srgb,${GN} 7%,var(--surface))`,
          border: `1px solid color-mix(in srgb,${GN} 26%,transparent)`,
          borderRadius: 14,
          padding: "22px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          animation: "pk-in .3s ease",
          maxWidth: 480,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          {t.payoutCheckExpectedLabel}
        </span>
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: 38,
            fontWeight: 700,
            color: GN,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {currency} {fmtMoney(headlineAmount, currency)}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t.payoutCheckHint}</span>
        {showAgreedDelta && (
          <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, paddingTop: 2 }}>
            {t.payoutCorrectedForAgreedRate1} {currency} {fmtMoney(data.expected_payout, currency)}
            {" — "}
            {currency} {fmtMoney(Math.abs(agreedDelta), currency)}{" "}
            {agreedDelta > 0 ? t.payoutShortfallSuffix : t.payoutSurplusSuffix}
          </span>
        )}
      </div>

      {data.source === "upload" && (
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.6,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: "10px 14px",
          }}
        >
          {data.brand
            ? t.payoutCheckPdfNote
            : data.effective_commission_pct != null
              ? t.payoutCheckStatementNote
              : t.payoutCheckUploadNote}
        </div>
      )}

      {data.source === "live" && (
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.6,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: "10px 14px",
          }}
        >
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

const FIRST_VALUE_EN = {
  welcomeTitle: "Reach your first useful result",
  welcomeBody:
    "In about two minutes, you will confirm your live data, find the work that matters, and see where to set your first protection rule.",
  dataTitle: "Confirm what PrizeSkout can see",
  dataBody:
    "These figures come from your connected channels. Check the products, activity, and channel status before acting on any recommendation.",
  copilotTitle: "Ask about your own numbers",
  copilotBody:
    "CFO Copilot starts with your store context. Try a suggested question, then review the records behind its answer before making a decision.",
  priorityTitle: "Work from priorities, not noise",
  priorityBody:
    "Your daily brief groups money risks, missing information, and approvals into a clear queue. Start with the highest priority item.",
  protectionTitle: "Choose your first protection rule",
  protectionBody:
    "Set the minimum margin your store should protect. PrizeSkout keeps proposed actions inside your controls and asks for approval where required.",
  sourceTitle: "Know the source of every result",
  sourceBody:
    "Connected stores, platform credentials, and imported reports determine what PrizeSkout can verify. Missing data is shown instead of being guessed.",
  completeTitle: "Your workspace is ready",
  completeBody:
    "You now know where to verify data, ask questions, review priorities, and set protection. Continue with the first item that needs your attention.",
};
const tourAccountKey = (kind: "done" | "step") => {
  const merchant = localStorage.getItem("ps_merchant_id") || "browser";
  return `ps_first_value_${kind}_v1:${merchant}`;
};

function buildTourSteps(t: (typeof T)["en"]): TourStepDef[] {
  const en = t === T.en;
  return [
    {
      id: "welcome",
      title: en ? FIRST_VALUE_EN.welcomeTitle : t.tourWelcomeTitle,
      body: en ? FIRST_VALUE_EN.welcomeBody : t.tourWelcomeBody,
    },
    {
      id: "copilot",
      tab: "today",
      target: '[data-tour="copilot-command"]',
      title: en ? FIRST_VALUE_EN.copilotTitle : t.tourCopilotTitle,
      body: en ? FIRST_VALUE_EN.copilotBody : t.tourCopilotBody,
    },
    {
      id: "priorities",
      tab: "today",
      target: '[data-tour="merchant-operating-loop"]',
      title: en ? FIRST_VALUE_EN.priorityTitle : t.tourSupportTitle,
      body: en ? FIRST_VALUE_EN.priorityBody : t.tourSupportBody,
    },
    {
      id: "hero",
      tab: "analytics",
      target: '[data-tour="hero"]',
      title: en ? FIRST_VALUE_EN.dataTitle : t.tourHeroTitle,
      body: en ? FIRST_VALUE_EN.dataBody : t.tourHeroBody,
    },
    {
      id: "guardrails",
      tab: "rules",
      target: '[data-tour="guardrails"]',
      title: en ? FIRST_VALUE_EN.protectionTitle : t.tourGuardrailsTitle,
      body: en ? FIRST_VALUE_EN.protectionBody : t.tourGuardrailsBody,
    },
    {
      id: "inbound",
      tab: "vault",
      target: '[data-tour="inbound"]',
      title: en ? FIRST_VALUE_EN.sourceTitle : t.tourInboundTitle,
      body: en ? FIRST_VALUE_EN.sourceBody : t.tourInboundBody,
    },
    {
      id: "complete",
      title: en ? FIRST_VALUE_EN.completeTitle : t.tourOutboundTitle,
      body: en ? FIRST_VALUE_EN.completeBody : t.tourOutboundBody,
    },
  ];
}

export function PrizeSkoutDashboard() {
  const priceActionKeysRef = useRef(new Map<string,string>());
  const priceActionKey = (eventId:string,targetPrice:number,purpose="publish") => {
    const signature=`${purpose}:${eventId}:${targetPrice}`;
    const existing=priceActionKeysRef.current.get(signature);
    if(existing)return existing;
    const created=`price:${crypto.randomUUID()}`;
    priceActionKeysRef.current.set(signature,created);
    return created;
  };
  const clearPriceActionKey = (eventId:string,targetPrice:number,purpose="publish") => {
    priceActionKeysRef.current.delete(`${purpose}:${eventId}:${targetPrice}`);
  };
  const [tab, setTab] = useState<Tab>(dashboardTabFromUrl);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"Store Access" | "Channels">("Store Access");
  const [sidebarNav, setSidebarNav] = useState<SidebarNavId>(() =>
    sidebarNavFromTab(dashboardTabFromUrl()),
  );
  useEffect(()=>{
    if(tab!=="rules"||window.location.hash!=="#channel-margin-overrides")return;
    window.requestAnimationFrame(()=>document.getElementById("channel-margin-overrides")?.scrollIntoView({behavior:"smooth",block:"start"}));
  },[tab]);
  const tabHistoryReadyRef = useRef(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [demoMode, setDemoMode] = useState(false);
  const [currency, setCurrency] = useState<DisplayCurrency>(() => {
    if (typeof window === "undefined") return "QAR";
    const saved = localStorage.getItem("ps_display_currency");
    return isDisplayCurrency(saved) ? saved : "QAR";
  });
  const [storeName, setStoreName] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [isDesktop, setIsDesktop] = useState(true);
  const [feed, setFeed] = useState<FeedRow[]>([]);

  useEffect(() => {
    const syncFromHistory = () => setTab(dashboardTabFromUrl());
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  useEffect(() => {
    if (SIDEBAR_NAV_TABS[sidebarNav] !== tab) setSidebarNav(sidebarNavFromTab(tab));
  }, [sidebarNav, tab]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("workspace") === tab) {
      tabHistoryReadyRef.current = true;
      return;
    }
    url.searchParams.set("workspace", tab);
    const method = tabHistoryReadyRef.current ? "pushState" : "replaceState";
    window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
    tabHistoryReadyRef.current = true;
  }, [tab]);
  type HeroStats = {
    has_activity: boolean;
    profits_protected_this_month: number;
    price_updates_this_month: number;
    price_updates_today: number;
    avg_margin_saved_pct: number | null;
    tracked_products: number;
    daily_series: number[];
  };
  const [heroStats, setHeroStats] = useState<HeroStats | null>(null);
  type DefendHealth = {
    state: "active" | "degraded" | "idle" | "not_monitored";
    label: string;
    detail: string;
    connected_channels: number;
    recently_verified_channels: number;
    last_activity_at: string | null;
    last_success_at: string | null;
    recent_failures: number;
    checked_at: string;
  };
  const [defendHealth, setDefendHealth] = useState<DefendHealth | null>(null);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<
    "all" | "risk" | "verified" | "verified_risk" | "missing_cost" | "out_of_stock" | "healthy" | "repriced"
  >("all");
  const [productSort, setProductSort] = useState<"risk" | "name" | "price">("risk");
  const [productPage, setProductPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ImportedProduct | null>(null);
  const [productPriceDraft, setProductPriceDraft] = useState("");
  const [productCostDraft, setProductCostDraft] = useState("");
  const [productPushStatus, setProductPushStatus] = useState<
    "idle" | "confirm" | "pushing" | "success" | "reverting" | "failed"
  >("idle");
  const [productPushStage, setProductPushStage] = useState<"sending" | "verifying">("sending");
  const [productPushError, setProductPushError] = useState<string | null>(null);
  const [productOriginalPrice, setProductOriginalPrice] = useState<number | null>(null);
  const [cpPhase, setCpPhase] = useState<"idle" | "loading" | "result">("idle");
  const [cpInput, setCpInput] = useState("");
  const [cpImageAttachments, setCpImageAttachments] = useState<File[]>([]);
  const [cpDocumentAttachments, setCpDocumentAttachments] = useState<File[]>([]);
  const cpImagePreviews = useMemo(() => cpImageAttachments.map(file => ({ file, url: URL.createObjectURL(file) })), [cpImageAttachments]);
  useEffect(() => () => cpImagePreviews.forEach(item => URL.revokeObjectURL(item.url)), [cpImagePreviews]);
  type CopilotThreadMessage = {
    role: "user" | "assistant";
    text: string;
    messageType?: "text" | "task" | "approval" | "execution" | "evidence" | "error";
    metadata?: Record<string, unknown>;
  };
  const [cpThread, setCpThread] = useState<CopilotThreadMessage[]>([]);
  const [cpConversations, setCpConversations] = useState<Array<{ id: string; title: string; last_message_at: string }>>([]);
  const [cpConversationTitle, setCpConversationTitle] = useState("Current conversation");
  const [cpPersistenceAvailable, setCpPersistenceAvailable] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [assistantDrawerInput, setAssistantDrawerInput] = useState("");
  const [cpPrompt, setCpPrompt] = useState("");
  const [cpObj, setCpObj] = useState<Record<string, unknown> | null>(null);
  const [cpChatMessage, setCpChatMessage] = useState<string | null>(null);
  const cpConversationRef = useRef<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const cpConversationIdRef = useRef<string | null>(null);
  const cpPersistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const cpConversationRestoredRef = useRef(false);
  const cpPendingDraftRef = useRef<Record<string, unknown> | null>(null);
  const [cpOperationProducts, setCpOperationProducts] = useState<ImportedProduct[]>([]);
  const [cpOperationStatus, setCpOperationStatus] = useState<
    "idle" | "running" | "ready" | "publishing" | "complete" | "failed"
  >("idle");
  const [cpOperationMessage, setCpOperationMessage] = useState<string | null>(null);
  const [cpActionResults, setCpActionResults] = useState<
    Array<{
      name: string;
      sku: string;
      before: number;
      target: number;
      live: number | null;
      confirmed: boolean;
      rolledBack: boolean;
      actionId: string;
      message: string;
    }>
  >([]);
  const [cpOrders, setCpOrders] = useState<
    Array<{
      id: string;
      code: string;
      status: string;
      total: number;
      currency: string;
      created_at: string;
    }>
  >([]);
  const [cpStoreActionResult, setCpStoreActionResult] = useState<{
    confirmed: boolean;
    action_id: string;
    message: string;
    products?: Array<{
      id: string;
      sku: string;
      source_sku?: string;
      status: string;
      storefront_visible?: boolean;
      after?: {
        id: string;
        sku: string;
        name: string;
        price: number | null;
        cost: number | null;
        quantity: number | null;
        is_infinite: boolean;
        is_published: boolean;
        is_draft: boolean;
        storefront_visible?: boolean;
      };
    }>;
  } | null>(null);
  const [applied, setApplied] = useState(false);
  const [rules, setRules] = useState<Rule[]>([
    {
      name: "Store contribution-margin policy",
      desc: "all products · verified costs only",
      floor: 18,
      active: true,
      status: "active",
      scope: "global",
      maxChangePct: 15,
      dailyChangePct: 0,
      approvalAbovePct: 0,
      cooldownHours: 0,
      rollbackOnReject: true,
      stopOnStaleCost: true,
      approvalMode: "recommend_only",
      minimumContribution: 0,
    },
  ]);
  const [persistedGlobalFloor, setPersistedGlobalFloor] = useState(18);
  const [persistedMaxIncrease, setPersistedMaxIncrease] = useState(15);
  const [persistedMinimumContribution,setPersistedMinimumContribution]=useState(0);
  const [channelPolicyDrafts,setChannelPolicyDrafts]=useState<ChannelPolicyDraft[]>([]);
  const [persistedChannelPolicies,setPersistedChannelPolicies]=useState<ChannelPolicyDraft[]>([]);
  const [persistedApprovalMode, setPersistedApprovalMode] =
    useState<ApprovalMode>("recommend_only");
  const [policyVersion, setPolicyVersion] = useState(1);
  const [policyVersions, setPolicyVersions] = useState<
    Array<{
      id: string;
      version: number;
      contribution_margin_floor_pct: number;
      max_price_increase_pct: number;
      approval_mode: ApprovalMode;
      status: string;
      activated_by: string;
      activated_at: string;
    }>
  >([]);
  const [rulePreviewIndex, setRulePreviewIndex] = useState<number | null>(null);
  const [ruleConfirmIndex, setRuleConfirmIndex] = useState<number | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleStatusFilter, setRuleStatusFilter] = useState<"all" | RuleStatus>("all");
  const [ruleAudit, setRuleAudit] = useState<{ action: string; rule: string; at: string }[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [recoveryCases, setRecoveryCases] = useState<DashboardRecoveryCase[]>([]);
  const [modal, setModal] = useState<number | null>(null);
  const [fileStep, setFileStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [byokPlatform, setByokPlatform] = useState<string | null>(null);
  const [byokFields, setByokFields] = useState<Record<string, string>>({});
  const [byokStatus, setByokStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [byokError, setByokError] = useState<string | null>(null);
  const [channelStatuses, setChannelStatuses] = useState<Record<string, string>>({});
  const [keetaNeedsShopId, setKeetaNeedsShopId] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputePartner, setDisputePartner] = useState("Talabat");
  const [disputeOrderId, setDisputeOrderId] = useState("");
  const [disputePlace, setDisputePlace] = useState("");
  const [disputeRate, setDisputeRate] = useState("18");
  const [disputeCharged, setDisputeCharged] = useState("");
  const [disputeOurPrice, setDisputeOurPrice] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(true);
  const [cpError, setCpError] = useState<string | null>(null);
  // Expected Payout Check — pulls real Talabat orders, computes what the
  // merchant should have received (see expected-payout.ts). Never fetches
  // their actual payout; the merchant compares it against their own bank
  // deposit themselves.
  type PayoutCheckData = PayoutResultLike & {
    period_start: string;
    period_end: string;
    classification?: PayoutCheckClassification;
  };
  const [payoutTab, setPayoutTab] = useState<"live" | "upload">("live");
  const [payoutWindowDays, setPayoutWindowDays] = useState<7 | 30>(30);
  // Policy Center sub-tab — defaults to "contract" so ContractIntelligenceVault
  // still mounts on page load and calls onApproved() automatically, same as
  // when all four workspaces were always-mounted before this was tabbed.
  const [policyTab, setPolicyTab] = useState<"contract" | "promotions" | "pricing" | "group">(
    "contract",
  );
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutData, setPayoutData] = useState<PayoutCheckData | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutUploadRate, setPayoutUploadRate] = useState("");
  const [payoutUploadPlatform, setPayoutUploadPlatform] = useState("talabat");
  // First-run welcome check — auto-runs the Talabat payout check the moment
  // a merchant with Talabat connected has never had one recorded, so there's
  // something concrete to show in the first minute instead of an empty card
  // waiting for someone to find the "Check Last 30 Days" button.
  const autoPayoutCheckAttempted = useRef(false);
  const [welcomeAuditBanner, setWelcomeAuditBanner] = useState(false);
  const [approvedContract, setApprovedContract] = useState<ContractTerm | null>(null);
  const [approvedContracts, setApprovedContracts] = useState<ContractTerm[]>([]);

  // Commission Audit — populated whenever an upload batch includes at least
  // one daily-log document (even a batch of one, see commission-audit.ts).
  // payoutDocuments/auditResult are separate from payoutData: payoutData
  // still drives the single-document PayoutResultDetail view unchanged,
  // auditResult drives the new ledger/findings/chart panel underneath it.
  const [payoutDocuments, setPayoutDocuments] = useState<ClassifiedDocument[]>([]);
  const [auditResult, setAuditResult] = useState<ReturnType<typeof reconcile> | null>(null);
  const [savingAudit, setSavingAudit] = useState(false);
  const [auditSaved, setAuditSaved] = useState(false);
  const [settlementRun,setSettlementRun]=useState<{status:string;summary:{counts?:Record<string,number>;claims_ready_amount?:number;exceptions?:number}}|null>(null);

  // Staged items — the incremental "add one at a time, describe it, then
  // Run Audit" flow. Each item is added (uploaded/entered) independently;
  // reconcile() only ever runs when the merchant explicitly hits Run Audit.
  // See PayoutUploadStaging.tsx for the StagedItem type definition.
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);

  // History tab — read-only lists pulled from payout-history.ts /
  // dispatch-history.ts via the same /api/channels/connect multiplex point
  // (see connect.ts's "history" branch). Fetched once per tab visit.
  type PayoutCheckHistoryRow = {
    id: string;
    source: "live" | "upload";
    platform: string;
    order_count: number;
    sub_total_sum: number;
    commission_rate_pct: number;
    expected_payout: number;
    period_start: string | null;
    period_end: string | null;
    rows_skipped: number | null;
    rows_total: number | null;
    commission_amount: number | null;
    additional_charges: number | null;
    additional_income: number | null;
    effective_commission_pct: number | null;
    brand: string | null;
    cancelled_gmv: number | null;
    cancelled_orders: number | null;
    extra_line_items: { label: string; value: number }[] | null;
    unexplained_charge: { label: string; amount: number } | null;
    created_at: string;
  };
  type RepricingHistoryRow = {
    id: string;
    sku: string | null;
    target_channel: string | null;
    old_price: number | null;
    new_price: number;
    currency: string;
    status: string;
    upstream_message: string | null;
    http_status: number | null;
    retry_count: number | null;
    duration_ms: number | null;
    audit_snapshot: Record<string, unknown> | null;
    created_at: string;
    completed_at: string | null;
  };
  // `documents`/`assurance`/`four_way`/etc. are the full shape only for
  // audits saved after 2026-07-27 (see payout-audit-history.ts); older rows
  // have assurance/four_way as null and documents in the pre-fix summarized
  // shape, which is why the render below gates on `assurance != null`
  // before trusting `documents` as full ClassifiedDocument[] detail.
  type PayoutAuditHistoryRow = {
    id: string;
    commission_rate_pct: number;
    document_count: number;
    documents: (
      | ClassifiedDocument
      | {
          file_name: string;
          document_type: string;
          order_count: number | null;
          sub_total_sum: number | null;
          description?: string | null;
          received_amount?: number | null;
        }
    )[];
    findings: Finding[];
    ledger: LedgerRow[] | null;
    ledger_totals: LedgerRow | null;
    period_start: string | null;
    period_end: string | null;
    assurance: CommissionAuditResult["assurance"] | null;
    four_way: CommissionAuditResult["fourWay"] | null;
    cross_check_windows: CommissionAuditResult["crossCheckWindows"] | null;
    net_sales_override_docs: string[] | null;
    created_at: string;
  };
  const [historyPayoutChecks, setHistoryPayoutChecks] = useState<PayoutCheckHistoryRow[]>([]);
  const [historyRepricings, setHistoryRepricings] = useState<RepricingHistoryRow[]>([]);
  const [historyPayoutAudits, setHistoryPayoutAudits] = useState<PayoutAuditHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyView, setHistoryView] = useState<"all" | "payout" | "repricing" | "investigations">(
    "all",
  );
  const [historySearch, setHistorySearch] = useState("");
  const [historyPlatform, setHistoryPlatform] = useState("all");
  const [historyNeedsAttention, setHistoryNeedsAttention] = useState(false);
  const [showHistoryExport, setShowHistoryExport] = useState(false);
  const [expandedPayoutCheckId, setExpandedPayoutCheckId] = useState<string | null>(null);
  const [expandedRepricingId, setExpandedRepricingId] = useState<string | null>(null);
  const [expandedPayoutAuditId, setExpandedPayoutAuditId] = useState<string | null>(null);
  const [confirmDeletePayoutId, setConfirmDeletePayoutId] = useState<string | null>(null);
  const [deletingPayoutId, setDeletingPayoutId] = useState<string | null>(null);
  const [confirmDeleteRepricingId, setConfirmDeleteRepricingId] = useState<string | null>(null);
  const [deletingRepricingId, setDeletingRepricingId] = useState<string | null>(null);
  const [confirmDeletePayoutAuditId, setConfirmDeletePayoutAuditId] = useState<string | null>(null);
  const [deletingPayoutAuditId, setDeletingPayoutAuditId] = useState<string | null>(null);

  const deleteHistoryRecord = async (
    action: "delete_payout_check" | "delete_repricing" | "delete_payout_audit",
    id: string,
  ): Promise<boolean> => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return false;
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid,
          access_code: ac,
          platform: "history",
          action,
          id,
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      return res.ok && !!data.ok;
    } catch {
      return false;
    }
  };

  const handleDeletePayoutCheck = async (id: string) => {
    setConfirmDeletePayoutId(null);
    setDeletingPayoutId(id);
    const ok = await deleteHistoryRecord("delete_payout_check", id);
    if (ok) setHistoryPayoutChecks((prev) => prev.filter((r) => r.id !== id));
    else showToast("Could not delete that record. Please try again.");
    setDeletingPayoutId(null);
  };

  const handleDeleteRepricing = async (id: string) => {
    setConfirmDeleteRepricingId(null);
    setDeletingRepricingId(id);
    const ok = await deleteHistoryRecord("delete_repricing", id);
    if (ok) setHistoryRepricings((prev) => prev.filter((r) => r.id !== id));
    else showToast("Could not delete that record. Please try again.");
    setDeletingRepricingId(null);
  };

  const handleDeletePayoutAudit = async (id: string) => {
    setConfirmDeletePayoutAuditId(null);
    setDeletingPayoutAuditId(id);
    const ok = await deleteHistoryRecord("delete_payout_audit", id);
    if (ok) setHistoryPayoutAudits((prev) => prev.filter((r) => r.id !== id));
    else showToast("Could not delete that record. Please try again.");
    setDeletingPayoutAuditId(null);
  };

  const [downloadingHistoryPdf, setDownloadingHistoryPdf] = useState(false);
  const handleDownloadHistoryPdf = async (format: "pdf" | "word" = "pdf") => {
    if (downloadingHistoryPdf) return;
    setDownloadingHistoryPdf(true);
    try {
      if (format === "word") {
        const { exportPayoutHistoryWord } =
          await import("@/components/dashboard/payout/exportReportsWord");
        await exportPayoutHistoryWord(historyPayoutChecks, historyRepricings, currency);
      } else {
        const { exportPayoutHistoryPdf } =
          await import("@/components/dashboard/payout/exportPayoutReportPdf");
        await exportPayoutHistoryPdf(historyPayoutChecks, historyRepricings, currency);
      }
    } catch (err) {
      console.error("Payout history report export failed:", err);
    } finally {
      setDownloadingHistoryPdf(false);
    }
  };

  // Light is the default on every visit; only an explicit toggle opts into dark.
  // Read storage in an effect, not the useState initialiser, so the server and
  // first client render agree.
  useEffect(() => {
    const stored = localStorage.getItem("ps-db-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const toggleTheme = () =>
    setTheme((v) => {
      const next = v === "light" ? "dark" : "light";
      localStorage.setItem("ps-db-theme", next);
      return next;
    });

  useEffect(() => {
    if (tab !== "history") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setHistoryLoading(true);
    const call = (action: string) =>
      fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid,
          access_code: ac,
          platform: "history",
          action,
          limit: 30,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    Promise.all([call("payout_checks"), call("repricings"), call("payout_audits")])
      .then(([payoutRes, repriceRes, auditRes]) => {
        setHistoryPayoutChecks((payoutRes?.items ?? []) as PayoutCheckHistoryRow[]);
        setHistoryRepricings((repriceRes?.items ?? []) as RepricingHistoryRow[]);
        setHistoryPayoutAudits((auditRes?.items ?? []) as PayoutAuditHistoryRow[]);
      })
      .finally(() => setHistoryLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "today" && tab !== "catalog" && tab !== "analytics" && tab !== "rules") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setCatalogLoading(true);
    if (tab === "today" || tab === "analytics") {
      fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "dashboard_stats" }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.ok) setHeroStats(d as HeroStats);
        })
        .catch(() => {});
    }
    const params = new URLSearchParams({ merchant_id: mid, access_code: ac });
    fetch(`/api/repricing/catalog?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setImportedProducts((d?.products ?? []) as ImportedProduct[]))
      .catch(() => setImportedProducts([]))
      .finally(() => setCatalogLoading(false));
  }, [tab]);

  // OAuth returns before the background Zid catalogue import necessarily
  // finishes. Keep the first-run screen alive until the initial value report
  // is ready instead of leaving reviewers on a permanently empty dashboard.
  useEffect(() => {
    if (
      (tab !== "today" && tab !== "catalog" && tab !== "analytics") ||
      channelStatuses.zid !== "connected" ||
      importedProducts.length > 0
    )
      return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      const mid = localStorage.getItem("ps_merchant_id") ?? "";
      const ac = localStorage.getItem("ps_access_code") ?? "";
      if (!mid || !ac || cancelled) return;
      attempts++;
      setCatalogLoading(true);
      try {
        const params = new URLSearchParams({ merchant_id: mid, access_code: ac });
        const response = await fetch(`/api/repricing/catalog?${params}`);
        const data = response.ok
          ? ((await response.json()) as { products?: ImportedProduct[] })
          : null;
        if (!cancelled && data?.products?.length) {
          setImportedProducts(data.products);
          setCatalogLoading(false);
        }
      } finally {
        if (!cancelled && attempts >= 15) setCatalogLoading(false);
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      if (attempts >= 15 || cancelled) return window.clearInterval(timer);
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tab, channelStatuses.zid, importedProducts.length]);

  useEffect(() => {
    let cancelled = false;
    const loadHealth = () => {
      const mid = localStorage.getItem("ps_merchant_id") ?? "";
      const ac = localStorage.getItem("ps_access_code") ?? "";
      if (!mid || !ac) {
        if (!cancelled)
          setDefendHealth({
            state: "not_monitored",
            label: "Defend Loop not monitored",
            detail: "Connect a supported channel to begin monitoring",
            connected_channels: 0,
            recently_verified_channels: 0,
            last_activity_at: null,
            last_success_at: null,
            recent_failures: 0,
            checked_at: new Date().toISOString(),
          });
        return;
      }
      fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: ac, platform: "defend_loop_health" }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data?.ok) setDefendHealth(data as DefendHealth);
        })
        .catch(() => {
          if (!cancelled) setDefendHealth(null);
        });
    };
    loadHealth();
    const timer = window.setInterval(loadHealth, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const laterRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    laterRefs.current.push(t);
    return t;
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width:980px)");
    const h = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", h);
    h();
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("salla_connected") === "1") {
      setChannelStatuses((prev) => ({ ...prev, salla: "connected" }));
      window.history.replaceState({}, "", window.location.pathname);
      showToast("Salla connected · product catalog syncing");
    }
    if (params.get("keeta_connected") === "1") {
      setChannelStatuses((prev) => ({ ...prev, keeta: "connected" }));
      setKeetaNeedsShopId(true);
      window.history.replaceState({}, "", window.location.pathname);
      showToast(t.keetaConnectedMsg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      laterRefs.current.forEach(clearTimeout);
    },
    [],
  );

  // First-time product tour — browser-local, not account-level: a merchant
  // on a new device sees it once more, which is the right tradeoff for a
  // lightweight client-side check over a backend "is this account new" flag.
  useEffect(() => {
    const doneKey = tourAccountKey("done");
    if (localStorage.getItem(doneKey)) return;
    // Migrate the original browser wide flag once for the current merchant.
    if (localStorage.getItem("ps_tour_v1_done")) {
      localStorage.setItem(doneKey, "1");
      localStorage.removeItem("ps_tour_v1_done");
      return;
    }
    // Mark the tour as seen when it is presented. If the user refreshes,
    // navigates away, or logs out mid-tour, it should not auto-open again.
    // The manual tour launcher can still open it at any time.
    const timer = setTimeout(() => {
      localStorage.setItem(doneKey, "1");
      const savedStep = Number(localStorage.getItem(tourAccountKey("step")));
      if (Number.isInteger(savedStep) && savedStep > 0) setTourStep(savedStep);
      setTourActive(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Global margin floor is the one rule actually enforced by the real
  // decide engine (see merchant-pricing-config.ts) — load the merchant's
  // real persisted value on mount, defaulting to the 18% seed if they've
  // never set one.
  const marginFloorLoadedRef = useRef(false);

  useEffect(() => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) {
      marginFloorLoadedRef.current = true;
      return;
    }
    fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: mid,
        access_code: ac,
        platform: "margin_floor",
        action: "get",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            policy?: {
              marginFloorPct: number;
              maxPriceIncreasePct: number;
              approvalMode: ApprovalMode;
              minimumContributionAmount:number;
              overrides:Array<{channel:string;servicePath:string;marginFloorPct:number;minimumContributionAmount:number;maxPriceIncreasePct:number;approvalMode:ApprovalMode}>;
              version: number;
            };
            versions?: typeof policyVersions;
          } | null,
        ) => {
          if (!d?.policy) return;
          const pct = Math.round(d.policy.marginFloorPct * 100);
          const maxIncrease = Math.round(d.policy.maxPriceIncreasePct * 100);
          setPersistedGlobalFloor(pct);
          setPersistedMaxIncrease(maxIncrease);
          setPersistedApprovalMode(d.policy.approvalMode);
          setPersistedMinimumContribution(d.policy.minimumContributionAmount??0);
          const overrides=(d.policy.overrides??[]).map(item=>({channel:item.channel,servicePath:item.servicePath,floor:Math.round(item.marginFloorPct*100),minimumContribution:item.minimumContributionAmount,maxChangePct:Math.round(item.maxPriceIncreasePct*100),approvalMode:item.approvalMode}));
          setChannelPolicyDrafts(overrides);setPersistedChannelPolicies(overrides);
          setPolicyVersion(d.policy.version);
          setPolicyVersions(d.versions ?? []);
          setRules((prev) =>
            prev.map((r) => ({
              ...r,
              floor: pct,
              maxChangePct: maxIncrease,
              approvalMode: d.policy!.approvalMode,
              minimumContribution:d.policy!.minimumContributionAmount??0,
              status: "active",
              active: true,
            })),
          );
        },
      )
      .catch(() => {})
      .finally(() => {
        marginFloorLoadedRef.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slider edits remain drafts. A live floor is changed only through the
  // preview → confirm → activate workflow below.

  useEffect(() => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    if (!mid) return;
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(mid)}`, {
      headers: { "X-PrizeSkout-Access-Code": localStorage.getItem("ps_access_code") ?? "" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { store_name?: string | null } | null) => {
        if (d?.store_name) setStoreName(d.store_name);
      })
      .catch(() => {});
  }, []);

  // Live Execution Stream terminal — same repricing-dispatch history the
  // History tab shows, reformatted as a scrolling feed. Runs once on mount
  // (the terminal lives on the default "analytics" tab, not gated behind
  // a tab switch like the fuller History table is).
  useEffect(() => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: mid,
        access_code: ac,
        platform: "history",
        action: "repricings",
        limit: 14,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            items?: {
              sku: string | null;
              target_channel: string | null;
              old_price: number | null;
              new_price: number;
              currency: string;
              status: string;
              created_at: string;
            }[];
          } | null,
        ) => {
          const items = d?.items ?? [];
          if (!items.length) return;
          setFeed(
            items.map((row) => {
              const ok = row.status === "success" || row.status === "completed";
              const time = new Date(row.created_at).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const priceMove =
                row.old_price != null
                  ? `${row.currency} ${row.old_price.toFixed(2)} → ${row.new_price.toFixed(2)}`
                  : `${row.currency} ${row.new_price.toFixed(2)}`;
              return {
                tag: ok ? "REPRICE" : "FAILED",
                tagColor: ok ? GN : "#EF4444",
                text: `${row.sku ?? "sku"} · ${row.target_channel ?? "channel"} · ${priceMove}`,
                time,
              };
            }),
          );
        },
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Also loaded on "analytics" (Revenue Hub), not just "vault" (Integration
    // Vault) — the Imported Products empty state needs to know whether a
    // sync-capable store is connected before the merchant has ever visited
    // the Vault tab.
    if (tab !== "vault" && tab !== "catalog" && tab !== "today" && tab !== "analytics") return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    if (!mid) return;
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(mid)}`, {
      headers: { "X-PrizeSkout-Access-Code": localStorage.getItem("ps_access_code") ?? "" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: { channels?: { platform: string; status: string; needs_shop_id?: boolean }[] } | null,
        ) => {
          if (!d?.channels) return;
          const m: Record<string, string> = {};
          for (const ch of d.channels) m[ch.platform] = ch.status;
          setChannelStatuses(m);
          setKeetaNeedsShopId(
            d.channels.find((c) => c.platform === "keeta")?.needs_shop_id ?? false,
          );
        },
      )
      .catch(() => {});
  }, [tab]);

  // Sync-capable channels only (Zid, Salla, Foodics — the platforms
  // syncPlatformCatalog actually supports). Used by the direct "Sync
  // Catalogue" button so a merchant never has to go through the Copilot
  // just to pull their products in.
  // Salla Easy Mode completes in a separate tab. Refresh as soon as the
  // merchant returns to PrizeSkout, without requiring a manual page reload.
  useEffect(() => {
    const refreshConnections = () => {
      const mid = localStorage.getItem("ps_merchant_id") ?? "";
      if (!mid) return;
      fetch(`/api/channels/status?merchant_id=${encodeURIComponent(mid)}`, {
        headers: { "X-PrizeSkout-Access-Code": localStorage.getItem("ps_access_code") ?? "" },
      })
        .then(response => response.ok ? response.json() : null)
        .then((data: { channels?: { platform: string; status: string; needs_shop_id?: boolean }[] } | null) => {
          if (!data?.channels) return;
          const statuses: Record<string, string> = {};
          for (const channel of data.channels) statuses[channel.platform] = channel.status;
          setChannelStatuses(statuses);
          setKeetaNeedsShopId(data.channels.find(channel => channel.platform === "keeta")?.needs_shop_id ?? false);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", refreshConnections);
    return () => window.removeEventListener("focus", refreshConnections);
  }, []);

  const SYNC_CAPABLE_PLATFORMS = ["zid", "salla", "foodics"] as const;
  type SyncCapablePlatform = (typeof SYNC_CAPABLE_PLATFORMS)[number];
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const syncCatalogs = async (
    platforms: readonly SyncCapablePlatform[] = SYNC_CAPABLE_PLATFORMS,
  ) => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac || syncingCatalog) return;
    setSyncingCatalog(true);
    try {
      const results = await Promise.all(
        platforms.map(async (platform) => {
          try {
            const res = await fetch("/api/channels/connect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                merchant_id: mid,
                access_code: ac,
                platform: "copilot_operation",
                action: "sync_catalog",
                source_platform: platform,
              }),
            });
            const data = (await res.json()) as {
              ok?: boolean;
              error?: string;
              result?: {
                items_found: number;
                items_stored: number;
                items_below_floor: number;
                items_requiring_cost?: number;
                errors: number;
              };
            };
            return { platform, ...data };
          } catch {
            return { platform, ok: false as const, error: "Network error" };
          }
        }),
      );
      const succeeded = results.filter((r) => r.ok);
      if (succeeded.length === 0) {
        showToast("No connected store could be synced — connect one in Settings → Channels first.");
      } else {
        const totalStored = succeeded.reduce((sum, r) => sum + (r.result?.items_stored ?? 0), 0);
        const costRequired = succeeded.reduce(
          (sum, r) => sum + (r.result?.items_requiring_cost ?? 0),
          0,
        );
        showToast(
          `Catalogue synced — ${totalStored} product${totalStored === 1 ? "" : "s"} from ${succeeded.map((r) => r.platform).join(", ")}.${costRequired ? ` ${costRequired} require${costRequired === 1 ? "s" : ""} verified cost before margin recommendations.` : ""}`,
        );
        const params = new URLSearchParams({ merchant_id: mid, access_code: ac });
        fetch(`/api/repricing/catalog?${params}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { products?: ImportedProduct[] } | null) => {
            if (d?.products) setImportedProducts(d.products);
          })
          .catch(() => {});
      }
    } finally {
      setSyncingCatalog(false);
    }
  };
  const syncAllCatalogs = () => syncCatalogs();

  const showToast = (msg: string) => {
    if (toastT.current) clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(null), 4000);
  };

  const editRule = (index: number, patch: Partial<Rule>) => {
    setRules((current) =>
      current.map((rule, i) =>
        i === index ? { ...rule, ...patch, active: false, status: "draft" } : rule,
      ),
    );
    setRulePreviewIndex(null);
    setRuleConfirmIndex(null);
  };

  const saveRuleDraft = (index: number) => {
    const rule = rules[index];
    if (!rule) return;
    const drafts = JSON.parse(localStorage.getItem("ps_margin_rule_drafts") ?? "[]") as Rule[];
    const next = [
      ...drafts.filter((item) => item.name !== rule.name),
      { ...rule, status: "draft" as RuleStatus, active: false },
    ];
    localStorage.setItem("ps_margin_rule_drafts", JSON.stringify(next));
    setRules((current) =>
      current.map((item, i) => (i === index ? { ...item, status: "draft", active: false } : item)),
    );
    setRuleAudit((current) =>
      [{ action: "Draft saved", rule: rule.name, at: new Date().toISOString() }, ...current].slice(
        0,
        12,
      ),
    );
    showToast("Draft saved. No live pricing behavior changed.");
  };

  const previewRule = async (index: number) => {
    setRulePreviewIndex(index);
    setRuleConfirmIndex(null);
    setRules((current) =>
      current.map((item, i) =>
        i === index ? { ...item, status: "testing", active: false } : item,
      ),
    );
    const rule = rules[index];
    if (rule)
      setRuleAudit((current) =>
        [
          { action: "Impact preview run", rule: rule.name, at: new Date().toISOString() },
          ...current,
        ].slice(0, 12),
      );
    if (!rule) return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "",
      ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({
        merchant_id: mid,
        access_code: ac,
        preview_floor: String(rule.floor / 100),
        preview_max_increase: String(rule.maxChangePct / 100),
        preview_minimum_contribution:String(rule.minimumContribution),
        preview_channel_overrides:JSON.stringify(channelPolicyDrafts.map(item=>({channel:item.channel,marginFloorPct:item.floor/100,minimumContributionAmount:item.minimumContribution,maxPriceIncreasePct:item.maxChangePct/100}))),
      });
      const response = await fetch(`/api/repricing/catalog?${params}`),
        data = response.ok ? ((await response.json()) as { products?: ImportedProduct[] }) : null;
      if (data?.products) setImportedProducts(data.products);
    } finally {
      setCatalogLoading(false);
    }
  };

  const activateRule = async (index: number) => {
    const rule = rules[index];
    if (!rule) return;
    if (rule.scope !== "global") {
      showToast("This rule remains in Testing until category and event enforcement is connected.");
      return;
    }
    if (!marginPolicyDirty) {
      showToast("These settings are already the active policy.");
      return;
    }
    if (rulePreviewIndex !== index) {
      await previewRule(index);
      showToast("Review the catalog impact, then continue to activation.");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid,
          access_code: ac,
          platform: "margin_floor",
          action: "set",
          margin_floor_pct: rule.floor / 100,
          minimum_contribution_amount:rule.minimumContribution,
          max_price_increase_pct: rule.maxChangePct / 100,
          approval_mode: rule.approvalMode,
          activated_by: storeName || "merchant",
          channel_overrides:channelPolicyDrafts.map(item=>({channel:item.channel,service_path:item.servicePath,margin_floor_pct:item.floor/100,minimum_contribution_amount:item.minimumContribution,max_price_increase_pct:item.maxChangePct/100,approval_mode:item.approvalMode})),
        }),
      });
      const data = (await response.json()) as { policy?: { version: number }; error?: string };
      if (!response.ok) throw new Error(data.error || "Activation failed");
      setPersistedGlobalFloor(rule.floor);
      setPersistedMaxIncrease(rule.maxChangePct);
      setPersistedMinimumContribution(rule.minimumContribution);
      setPersistedChannelPolicies(channelPolicyDrafts);
      setPersistedApprovalMode(rule.approvalMode);
      setPolicyVersion(data.policy?.version ?? policyVersion + 1);
      setRules((current) =>
        current.map((item, i) =>
          i === index ? { ...item, status: "active", active: true } : item,
        ),
      );
      setRuleConfirmIndex(null);
      setRulePreviewIndex(null);
      setRuleAudit((current) =>
        [
          {
            action: `Activated from ${persistedGlobalFloor}% to ${rule.floor}%`,
            rule: rule.name,
            at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 12),
      );
      const catalogResponse = await fetch(
        `/api/repricing/catalog?${new URLSearchParams({ merchant_id: mid, access_code: ac })}`,
      );
      if (catalogResponse.ok) {
        const catalogData = (await catalogResponse.json()) as { products?: ImportedProduct[] };
        if (catalogData.products) setImportedProducts(catalogData.products);
      }
      showToast(`Policy v${data.policy?.version ?? policyVersion + 1} activated.`);
    } catch {
      setRules((current) =>
        current.map((item, i) =>
          i === index ? { ...item, status: "failed", active: false } : item,
        ),
      );
      showToast("Activation failed. The previous live policy remains unchanged.");
    } finally {
      setRuleSaving(false);
    }
  };

  const productPageSize = 8;
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return importedProducts
      .filter((product) => {
        if (
          query &&
          !`${product.name_en} ${product.name_ar} ${product.sku} ${product.source_platform}`
            .toLowerCase()
            .includes(query)
        )
          return false;
        if (productFilter === "risk")
          return product.floor_breached && product.inventory_status !== "out_of_stock";
        if (productFilter === "verified_risk")
          return (
            product.floor_breached &&
            product.cost_confidence === "verified" &&
            product.inventory_status !== "out_of_stock"
          );
        if (productFilter === "missing_cost") return product.cost_confidence !== "verified";
        if (productFilter === "verified") return product.cost_confidence === "verified";
        if (productFilter === "out_of_stock") return product.inventory_status === "out_of_stock";
        if (productFilter === "healthy") return !product.floor_breached;
        if (productFilter === "repriced") return product.status === "repriced";
        return true;
      })
      .sort((a, b) => {
        if (productSort === "name") return (a.name_en || a.sku).localeCompare(b.name_en || b.sku);
        if (productSort === "price") return b.current_price - a.current_price;
        return (
          Number(b.floor_breached) - Number(a.floor_breached) ||
          Math.abs(b.recommended_price - b.current_price) -
            Math.abs(a.recommended_price - a.current_price)
        );
      });
  }, [importedProducts, productFilter, productSearch, productSort]);

  // "Fix these first" — the products bleeding the most margin, ranked and
  // capped to a handful so it reads as a punch list rather than a re-run of
  // the full catalogue table below it.
  const fixTheseFirst = useMemo(
    () =>
      importedProducts
        .filter((p) => p.floor_breached && p.inventory_status !== "out_of_stock")
        .sort(
          (a, b) =>
            Math.abs(b.recommended_price - b.current_price) -
            Math.abs(a.recommended_price - a.current_price),
        )
        .slice(0, 5),
    [importedProducts],
  );

  // First value moment: quantify what the initial catalogue scan found before
  // asking a merchant or partner reviewer to explore the rest of the product.
  // This is deliberately a per-catalog-sale opportunity, not a monthly claim:
  // PrizeSkout does not know sales volume until order data is connected.
  const storeOpportunity = useMemo(() => {
    const atRisk = importedProducts.filter(
      (p) =>
        p.floor_breached &&
        p.inventory_status !== "out_of_stock" &&
        p.recommended_price > p.current_price,
    );
    const correctionPerCatalogSale = atRisk.reduce((sum, p) => {
      const sourceRate = isDisplayCurrency(p.currency) ? QAR_RATES[p.currency] : 1;
      return sum + Math.max(0, p.recommended_price - p.current_price) / sourceRate;
    }, 0);
    const verified = importedProducts.filter((p) => p.cost_confidence === "verified").length;
    const estimated = importedProducts.filter((p) => p.cost_confidence === "estimated").length;
    const unknown = importedProducts.length - verified - estimated;
    return { atRisk, correctionPerCatalogSale, verified, estimated, unknown };
  }, [importedProducts]);
  const copilotAlerts = useMemo(() => {
    const missingCost = importedProducts.filter(
      (product) => product.cost_confidence !== "verified",
    ).length;
    const marginRisk = importedProducts.filter(
      (product) =>
        product.floor_breached &&
        product.cost_confidence === "verified" &&
        product.inventory_status !== "out_of_stock",
    ).length;
    const stockRisk = importedProducts.filter(
      (product) => product.inventory_status === "out_of_stock",
    ).length;
    return [
      missingCost
        ? {
            label: `${missingCost} product${missingCost === 1 ? " has" : "s have"} unverified cost data`,
            command: "Show products with missing or unverified costs",
          }
        : null,
      marginRisk
        ? {
            label: `${marginRisk} verified-cost product${marginRisk === 1 ? " is" : "s are"} below the active margin floor`,
            command: null,
          }
        : null,
      stockRisk
        ? {
            label: `${stockRisk} product${stockRisk === 1 ? " needs" : "s need"} inventory attention`,
            command: "Show products that need inventory attention",
          }
        : null,
    ].filter((item): item is { label: string; command: string | null } => Boolean(item));
  }, [importedProducts]);
  const opportunityCurrency = currency;

  const reviewVerifiedMarginRisks = () => {
    setTab("catalog");
    setProductSearch("");
    setProductSort("risk");
    setProductFilter("verified_risk");
    setProductPage(1);
    window.setTimeout(
      () =>
        document
          .getElementById("imported-products")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  };

  const reviewProductsMissingCosts = () => {
    setTab("catalog");
    setProductSearch("");
    setProductSort("risk");
    const hasMissingCosts = importedProducts.some(
      (product) => product.cost_confidence !== "verified",
    );
    setProductFilter(hasMissingCosts ? "missing_cost" : "all");
    setProductPage(1);
    if (!hasMissingCosts) {
      showToast(
        "Refreshing product costs. The daily brief may be based on an earlier catalogue check.",
      );
      void syncAllCatalogs();
    }
    window.setTimeout(
      () =>
        document
          .getElementById("imported-products")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  };

  const openCatalogFilter = (filter: typeof productFilter) => {
    setTab("catalog");
    setProductSearch("");
    setProductFilter(filter);
    setProductPage(1);
    window.setTimeout(() => document.getElementById("imported-products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const openSettingsChannels = () => {
    setSettingsInitialTab("Channels");
    setTab("settings");
  };
  const revealTodaySection = (id: string) => {
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  // Channel pricing gap — a headline number for what Channel Price
  // Architecture would find, computed with the same default economics it
  // uses, so a merchant sees the opportunity before ever opening that tab.
  // Deliberately restricted to channels this merchant actually has (their
  // own storefront platform plus Talabat if connected) so the number
  // reflects their real channel mix, not an arbitrary default set.
  const channelPricingGap = useMemo(() => {
    if (!importedProducts.length) return { gap: 0, count: 0 };
    const relevantChannels: PriceChannel[] = ["in_store"];
    for (const p of ["zid", "salla", "foodics"] as const) {
      if (channelStatuses[p] === "connected" && approvedContracts.some(term => term.platform === p) && !relevantChannels.includes(p))
        relevantChannels.push(p);
    }
    if (channelStatuses.talabat === "connected" && approvedContracts.some(term => term.platform === "talabat")) relevantChannels.push("talabat");
    if (relevantChannels.length < 2) return { gap: 0, count: 0 }; // nothing beyond in_store to compare against

    const economicsFor = (channel: PriceChannel): ChannelEconomics => {
      const contract = approvedContracts.find(term => term.platform === channel);
      return {
        channel,
        commission_pct: channel === "in_store" ? 0 : contract?.commission_rate_pct ?? 0,
        vat_on_fees_pct: contract?.vat_on_fees_pct ?? 0,
        payment_fee_pct: contract?.payment_fee_pct ?? 0,
        fixed_fee: contract?.fixed_order_fee ?? 0,
        minimum_margin_pct: 18,
      };
    };
    const products: ChannelPriceProduct[] = importedProducts.map((p) => ({
      sku: p.sku,
      name: p.name_en || p.name_ar || p.sku,
      current_price: p.current_price,
      net_margin_pct: p.net_margin_pct,
      source_platform: p.source_platform,
      ingest_event_id: p.ingest_event_id,
    }));
    const rows = planChannelPrices(products, relevantChannels.map(economicsFor), 8, 15);
    const underpriced = rows.filter(
      (r) => r.status !== "excluded" && r.consumer_difference != null && r.consumer_difference > 0,
    );
    return {
      gap: underpriced.reduce((sum, r) => sum + (r.consumer_difference ?? 0), 0),
      count: new Set(underpriced.map((r) => r.sku)).size,
    };
  }, [importedProducts, channelStatuses, approvedContracts]);

  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const visibleProducts = filteredProducts.slice(
    (productPage - 1) * productPageSize,
    productPage * productPageSize,
  );

  useEffect(() => setProductPage(1), [productFilter, productSearch, productSort]);
  useEffect(() => {
    if (productPage > productPageCount) setProductPage(productPageCount);
  }, [productPage, productPageCount]);

  const openProduct = (product: ImportedProduct) => {
    setSelectedProduct(product);
    setProductPriceDraft(String(product.preview?.allowed_price ?? product.current_price));
    setProductCostDraft(product.base_cost == null ? "" : String(product.base_cost));
    setProductPushStatus("idle");
    setProductPushError(null);
    setProductOriginalPrice(product.current_price);
  };

  const pushSelectedProductPrice = async () => {
    if (!selectedProduct) return;
    const targetPrice = Number(productPriceDraft);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      showToast("Enter a valid price greater than zero.");
      return;
    }
    const maximumAllowed =
      selectedProduct.preview?.maximum_increase_pct == null
        ? null
        : selectedProduct.current_price * (1 + selectedProduct.preview.maximum_increase_pct);
    if (maximumAllowed != null && targetPrice > maximumAllowed + 0.005) {
      const message = `This price is ${(((targetPrice - selectedProduct.current_price) / selectedProduct.current_price) * 100).toFixed(1)}% above the current price. Active policy v${selectedProduct.preview?.policy_version} allows ${((selectedProduct.preview?.maximum_increase_pct ?? 0) * 100).toFixed(1)}%, up to ${selectedProduct.currency} ${fmtMoney(maximumAllowed, selectedProduct.currency)}.`;
      setProductPushError(message);
      setProductPushStatus("failed");
      showToast(message);
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
    setProductPushStage("sending");
    setProductPushError(null);
    showToast(`Sending the approved price to ${selectedProduct.source_platform}.`);
    const verificationTimer = window.setTimeout(() => setProductPushStage("verifying"), 1200);
    try {
      const response = await fetchWithTimeout(
        "/api/repricing/apply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            ingest_event_id: selectedProduct.ingest_event_id,
            target_price: targetPrice,
            idempotency_key: priceActionKey(selectedProduct.ingest_event_id,targetPrice),
            approval_confirmed: true,
          }),
        },
        30_000,
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        downstream?: { channel: string; status: string; message: string } | null;
      };
      clearPriceActionKey(selectedProduct.ingest_event_id,targetPrice);
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? result.message ?? "Price update failed");
      setImportedProducts((products) =>
        products.map((product) =>
          product.ingest_event_id === selectedProduct.ingest_event_id
            ? { ...product, current_price: targetPrice, status: "repriced" }
            : product,
        ),
      );
      setSelectedProduct((product) =>
        product ? { ...product, current_price: targetPrice, status: "repriced" } : product,
      );
      setProductPushStatus("success");
      showToast(
        result.downstream
          ? `Price confirmed in Zid. ${result.downstream.message}`
          : `Price updated successfully in ${selectedProduct.source_platform}.`,
      );
    } catch (error) {
      setProductPushStatus("failed");
      const message = error instanceof Error ? error.message : "Price update failed.";
      setProductPushError(message);
      showToast(message);
    } finally {
      window.clearTimeout(verificationTimer);
    }
  };

  const revertSelectedProductPrice = async () => {
    if (!selectedProduct || productOriginalPrice == null) return;
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode)
      return showToast("Reopen PrizeSkout from Zid to restore your merchant session.");
    setProductPushStatus("reverting");
    try {
      const response = await fetchWithTimeout(
        "/api/repricing/apply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            ingest_event_id: selectedProduct.ingest_event_id,
            target_price: productOriginalPrice,
            idempotency_key: priceActionKey(selectedProduct.ingest_event_id,productOriginalPrice,"restore"),
            approval_confirmed: true,
          }),
        },
        30_000,
      );
      const result = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      clearPriceActionKey(selectedProduct.ingest_event_id,productOriginalPrice,"restore");
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? result.message ?? "Revert failed");
      setImportedProducts((products) =>
        products.map((product) =>
          product.ingest_event_id === selectedProduct.ingest_event_id
            ? { ...product, current_price: productOriginalPrice, status: "repriced" }
            : product,
        ),
      );
      setSelectedProduct((product) =>
        product ? { ...product, current_price: productOriginalPrice, status: "repriced" } : product,
      );
      setProductPriceDraft(String(productOriginalPrice));
      setProductPushStatus("idle");
      showToast(`Original price restored in ${selectedProduct.source_platform}.`);
    } catch (error) {
      setProductPushStatus("failed");
      showToast(error instanceof Error ? error.message : "Revert failed.");
    }
  };

  function copilotPersistenceRequest(payload: Record<string, unknown>) {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) return Promise.resolve(null);
    return fetch("/api/channels/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: merchantId, access_code: accessCode, platform: "copilot_threads", ...payload }) }).then(async response => ({ response, data: await response.json() as Record<string, any> }));
  }

  function queueCopilotMessage(role: "user" | "assistant", text: string, messageType = "text", metadata: Record<string, unknown> = {}) {
    cpPersistenceQueueRef.current = cpPersistenceQueueRef.current.then(async () => {
      let conversationId = cpConversationIdRef.current;
      if (!conversationId) {
        const created = await copilotPersistenceRequest({ action: "create", title: role === "user" ? text.slice(0, 100) : cpConversationTitle, context: { page: tab, language: lang } });
        if (!created?.response.ok || created.data.available === false || !created.data.conversation?.id) { setCpPersistenceAvailable(false); return; }
        conversationId = String(created.data.conversation.id);
        cpConversationIdRef.current = conversationId;
        setCpConversationTitle(String(created.data.conversation.title ?? "Current conversation"));
        setCpConversations(current => [{ id: conversationId!, title: String(created.data.conversation.title ?? "Current conversation"), last_message_at: new Date().toISOString() }, ...current.filter(item => item.id !== conversationId)].slice(0, 30));
        setCpPersistenceAvailable(true);
      }
      const saved = await copilotPersistenceRequest({ action: "message", id: conversationId, role, content: text, message_type: messageType, metadata });
      if (!saved?.response.ok || saved.data.available === false) setCpPersistenceAvailable(false);
      else setCpPersistenceAvailable(true);
    }).catch(() => setCpPersistenceAvailable(false));
  }

  const appendCpThread = (role: "user" | "assistant", text: string, messageType: CopilotThreadMessage["messageType"] = "text", metadata: Record<string, unknown> = {}) => {
    setCpThread((current) => [...current, { role, text, messageType, metadata }].slice(-40));
    queueCopilotMessage(role, text, messageType, metadata);
  };

  const openCopilotConversation = async (id: string) => {
    const result = await copilotPersistenceRequest({ action: "get", id });
    if (!result?.response.ok || result.data.available === false || !result.data.conversation) return;
    const messages = (Array.isArray(result.data.messages) ? result.data.messages : []).filter((item: Record<string, unknown>) => item.role === "user" || item.role === "assistant").map((item: Record<string, unknown>) => ({ role: item.role as "user" | "assistant", text: String(item.content ?? ""), messageType: String(item.message_type ?? "text") as CopilotThreadMessage["messageType"], metadata: item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : {} })).filter((item: { text: string }) => item.text).slice(-40);
    cpConversationIdRef.current = id;
    setCpConversationTitle(String(result.data.conversation.title ?? "Current conversation"));
    setCpThread(messages);
    cpConversationRef.current = compactConversation(messages);
    setCpPhase(messages.length ? "result" : "idle");
    const latestAction = [...messages].reverse().find(item => ["task", "approval", "execution", "evidence", "error"].includes(item.messageType ?? ""));
    const latestTask = latestAction && ["task", "approval", "error"].includes(latestAction.messageType ?? "") ? [...messages].reverse().find(item => item.metadata?.operation && typeof item.metadata.operation === "object") : undefined;
    const restoredOperation = latestTask?.metadata?.operation as Record<string, unknown> | undefined;
    if (restoredOperation) {
      cpPendingDraftRef.current = restoredOperation;
      setCpObj(restoredOperation);
      setCpPrompt(latestTask?.text ?? String(restoredOperation.summary ?? "Restored task"));
      setCpOperationStatus("idle");
      setCpOperationMessage("This task was restored from the conversation. Open it below to refresh its live details before approving.");
    } else {
      setCpObj(null);
      cpPendingDraftRef.current = null;
      setCpOperationMessage(null);
    }
    if (latestAction?.messageType === "evidence" && latestAction.metadata?.kind === "payout_reconciliation" && latestAction.metadata.result && typeof latestAction.metadata.result === "object") setAuditResult(latestAction.metadata.result as ReturnType<typeof reconcile>);
    setCpChatMessage(null); setCpError(null);
  };

  useEffect(() => {
    if (cpConversationRestoredRef.current) return;
    cpConversationRestoredRef.current = true;
    void (async () => {
      const result = await copilotPersistenceRequest({ action: "list" });
      if (!result?.response.ok || result.data.available === false) return;
      const conversations = (Array.isArray(result.data.conversations) ? result.data.conversations : []) as Array<{ id: string; title: string; last_message_at: string }>;
      setCpPersistenceAvailable(true);
      setCpConversations(conversations);
      if (conversations[0]?.id) await openCopilotConversation(conversations[0].id);
    })().catch(() => setCpPersistenceAvailable(false));
  }, []);

  const runCopilot = async (text: string, requestedRole: "cfo" | "manager" | "auto" = "auto") => {
    const prompt = text.trim();
    if (!prompt || cpPhase === "loading") return false;
    const previousOperation = cpObj && (cpObj._type === "operation" || cpObj._type === "manager_workflow") ? cpObj : cpPendingDraftRef.current;
    const previousProducts = cpOperationProducts.map((product) => ({
      name: product.name_en || product.name_ar,
      sku: product.sku,
      platform: product.source_platform,
    }));
    if (cpStoreActionResult?.products)
      for (const product of cpStoreActionResult.products) {
        if (product.after)
          previousProducts.push({
            name: product.after.name,
            sku: product.after.sku,
            platform: "zid",
          });
      }
    const conversation = compactConversation([
      ...cpConversationRef.current,
      { role: "user", text: prompt },
    ]);
    const catalogContext = importedProducts.slice(0, 100).map((product) => ({
      name: product.name_en || product.name_ar,
      sku: product.sku,
      platform: product.source_platform,
    }));
    setCpPhase("loading");
    appendCpThread("user", prompt);
    setCpPrompt(prompt);
    setApplied(false);
    setCpError(null);
    setCpObj(null);
    setCpChatMessage(null);
    setCpOperationProducts([]);
    setCpOperationStatus("idle");
    setCpOperationMessage(null);
    setCpActionResults([]);
    setCpOrders([]);
    setCpStoreActionResult(null);
    setCpInput("");
    try {
      if (cpDocumentAttachments.length) {
        const platform = ["talabat", "snoonu", "jahez", "keeta", "salla", "zid"].find(value => prompt.toLowerCase().includes(value)) ?? payoutUploadPlatform;
        const contract = approvedContracts.find(term => term.status === "approved" && term.platform === platform) ?? null;
        const rate = Number(contract?.commission_rate_pct ?? payoutUploadRate);
        if (!(rate > 0 && rate < 100)) throw new Error(`I need the approved ${platform.toUpperCase()} commission rate before auditing these documents.`);
        const documents: ClassifiedDocument[] = [];
        for (const file of cpDocumentAttachments) {
          const outcome = await uploadOneFile(file, localStorage.getItem("ps_merchant_id") ?? "", localStorage.getItem("ps_access_code") ?? "", rate, platform, prompt);
          if (!outcome.ok) throw new Error(`${file.name}: ${outcome.error}`);
          documents.push({ id: `${Date.now()}-${documents.length}`, file_name: file.name, document_type: classifyResult(outcome.result), result: outcome.result, description: prompt, platform_guess: outcome.result.classification?.ok ? outcome.result.classification.classification.platform : platform });
        }
        const normalized = documents.map(document => ({ ...document, result: { ...document.result, platform, commission_rate_pct: rate } }));
        const audit = reconcile(normalized, rate, contract ? { source: "approved_contract", platform, contractId: contract.id, contractName: contract.contract_name, reviewedBy: contract.reviewed_by, effectiveFrom: contract.effective_from, effectiveTo: contract.effective_to } : { source: "merchant_entered", platform });
        setPayoutDocuments(normalized); setAuditResult(audit); setPayoutData(normalized.length === 1 ? normalized[0].result as PayoutCheckData : null); setAuditSaved(false);
        const metrics = { documents: normalized.length, platform: platform.toUpperCase(), expected_payout: audit.ledgerTotals?.expected_net ?? null, actual_received: audit.fourWay.stages.find(stage => stage.id === "merchant_receipt")?.amount ?? null, variance: audit.fourWay.unresolvedVariance, findings: audit.findings.length, assurance: audit.assurance?.opinion ?? "review_required" };
        const reply = `I audited ${normalized.length} ${platform.toUpperCase()} payout document${normalized.length === 1 ? "" : "s"}. Review the reconciliation result below before saving it to history or opening recovery work.`;
        const operation: Record<string, unknown> = { _type: "operation", operation: "payout_document_audit", platform, summary: reply, requires_confirmation: false, risk_level: "read", metrics };
        setCpObj(operation); setCpPhase("result"); setCpOperationStatus("complete"); setCpOperationMessage(reply); setCpDocumentAttachments([]);
        appendCpThread("assistant", reply, "evidence", { kind: "payout_reconciliation", operation, metrics, result: audit });
        cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: reply }]);
        return true;
      }
      if (cpImageAttachments.length) {
        const haystack = prompt.toLowerCase();
        const directMatches = importedProducts.filter(product => product.source_platform === "zid" && [product.sku, product.name_en, product.name_ar].filter(Boolean).some(value => haystack.includes(String(value).toLowerCase())));
        const contextualSku = directMatches.length === 1 ? directMatches[0].sku : directMatches.length === 0 && previousProducts.length === 1 ? previousProducts[0].sku : "";
        if (!contextualSku) throw new Error(directMatches.length > 1 ? "More than one product matches this instruction. Include the exact SKU with the image." : "Tell me the exact Zid product name or SKU that should receive this image.");
        const form = new FormData();
        form.set("merchant_id", localStorage.getItem("ps_merchant_id") ?? "");
        form.set("access_code", localStorage.getItem("ps_access_code") ?? "");
        form.set("product_query", contextualSku);
        form.set("alt_text", prompt);
        cpImageAttachments.forEach(file => form.append("images", file));
        const uploadedResponse = await fetchWithTimeout("/api/copilot/images", { method: "POST", body: form }, 30_000);
        const uploaded = await uploadedResponse.json() as { ok?: boolean; job?: { id: string; title: string; status: string; items?: Array<Record<string, unknown>> }; error?: string };
        if (!uploadedResponse.ok || !uploaded.ok || !uploaded.job) throw new Error(uploaded.error ?? "The image could not be prepared.");
        if (uploaded.job.status !== "matched") throw new Error("The image was stored privately, but its product match needs attention in Settings → Product Images.");
        const previewResponse = await fetchWithTimeout("/api/copilot/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: localStorage.getItem("ps_merchant_id") ?? "", access_code: localStorage.getItem("ps_access_code") ?? "", action: "preview", job_id: uploaded.job.id }) }, 30_000);
        const preview = await previewResponse.json() as { ok?: boolean; preview?: { approval_token: string; expires_at: string; job: Record<string, unknown> }; error?: string };
        if (!previewResponse.ok || !preview.ok || !preview.preview) throw new Error(preview.error ?? "The image approval preview could not be prepared.");
        const operation: Record<string, unknown> = { _type: "operation", operation: "image_job", platform: "zid", query: contextualSku, requires_confirmation: true, risk_level: "reversible_write", summary: `Add ${cpImageAttachments.length} approved image${cpImageAttachments.length === 1 ? "" : "s"} to ${contextualSku}.`, image_job_id: uploaded.job.id, image_approval_token: preview.preview.approval_token, image_approval_expires_at: preview.preview.expires_at };
        setCpObj(operation); cpPendingDraftRef.current = operation; setCpPhase("result"); setCpOperationStatus("ready");
        setCpOperationMessage("The image is stored privately, matched to the exact product, and ready for your approval. Existing gallery images will be preserved.");
        setCpImageAttachments([]);
        const reply = String(operation.summary);
        appendCpThread("assistant", reply, "approval", { kind: "operation", operation, files: cpImageAttachments.map(file => ({ name: file.name, size: file.size, type: file.type })) });
        cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: reply }]);
        return true;
      }
      if (/\b(?:run|check|pull|calculate|show)\b[\s\S]{0,40}\b(?:payout|settlement)\b|\b(?:payout|settlement)\b[\s\S]{0,40}\b(?:check|calculation|expected)\b/i.test(prompt)) {
        const days = /\b7\s*days?\b|\bweek\b/i.test(prompt) ? 7 : 30;
        const response = await fetchWithTimeout("/api/channels/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: localStorage.getItem("ps_merchant_id") ?? "", access_code: localStorage.getItem("ps_access_code") ?? "", platform: "talabat_expected_payout", window_days: days }) }, 30_000);
        const result = await response.json() as PayoutCheckData & { ok?: boolean; error?: string };
        if (!response.ok || !result.ok) throw new Error(result.error ?? "The automatic payout check could not run.");
        setPayoutData(result); setPayoutDocuments([]); setAuditResult(null);
        const metrics = { period: `${days} days`, platform: "TALABAT", orders: result.order_count, sales: result.sub_total_sum, expected_payout: result.expected_payout, claims_ready_payout: result.claims_ready_payout ?? null, confidence: result.payout_confidence ?? "estimate" };
        const reply = `I completed the ${days}-day Talabat payout check. This is the expected payout from connected order evidence; add the platform statement here to compare it, and optionally confirm whether the payout arrived.`;
        const operation: Record<string, unknown> = { _type: "operation", operation: "automatic_payout_check", platform: "talabat", summary: reply, requires_confirmation: false, risk_level: "read", metrics };
        setCpObj(operation); setCpPhase("result"); setCpOperationStatus("complete"); setCpOperationMessage(reply);
        appendCpThread("assistant", reply, "evidence", { kind: "payout_check", operation, metrics, result });
        cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: reply }]);
        return true;
      }
      if (/\b(?:simulate|model|test|calculate)\b[\s\S]{0,40}\b(?:promotion|campaign|discount)\b/i.test(prompt)) {
        const discountMatch = prompt.match(/(?:discount|promotion|campaign)[^\d]{0,20}(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%[^.]{0,25}(?:discount|promotion|campaign)/i);
        const liftMatch = prompt.match(/(?:lift|increase in orders|more orders)[^\d-]{0,20}(-?\d+(?:\.\d+)?)\s*%/i);
        const ordersMatch = prompt.match(/(?:baseline|normally|usual(?:ly)?)\D{0,20}(\d+)\s*orders?|(?:baseline orders?)\D{0,10}(\d+)/i);
        const daysMatch = prompt.match(/(?:for|over|duration)\s+(\d+)\s*days?/i);
        if (!discountMatch || !liftMatch || !ordersMatch || !daysMatch) {
          const reply = "I can run that promotion simulation here. Tell me the discount percentage, expected order lift, normal baseline orders for the same period, and campaign duration in days. I will use the approved channel agreement, verified product costs, and your active margin floor.";
          setCpChatMessage(reply); setCpPhase("result"); appendCpThread("assistant", reply); cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: reply }]); return false;
        }
        const platform = ["talabat", "snoonu", "jahez", "keeta", "salla", "zid"].find(value => prompt.toLowerCase().includes(value)) ?? importedProducts[0]?.source_platform ?? "zid";
        const contract = approvedContracts.find(term => term.status === "approved" && term.platform === platform);
        if (!contract || [contract.commission_rate_pct, contract.promotion_funding_platform_pct, contract.vat_on_fees_pct, contract.payment_fee_pct, contract.fixed_order_fee].some(value => value == null) || !["gross_before_discount", "net_after_discount"].includes(String(contract.commission_base))) throw new Error(`Complete and approve the ${platform.toUpperCase()} commercial terms before simulating this campaign.`);
        const scoped = importedProducts.filter(product => product.source_platform === platform && (prompt.toLowerCase().includes("all") || [product.sku, product.name_en, product.name_ar].some(value => value && prompt.toLowerCase().includes(String(value).toLowerCase()))));
        if (!scoped.length) throw new Error(`Name a ${platform.toUpperCase()} product or say “all ${platform.toUpperCase()} products.”`);
        const simulation = simulatePromotion(scoped.map(product => ({ sku: product.sku, name: product.name_en || product.name_ar, current_price: product.current_price, net_margin_pct: product.net_margin_pct, source_platform: product.source_platform, unit_cost: product.base_cost, cost_confidence: product.cost_confidence })), { discount_pct: Number(discountMatch[1] ?? discountMatch[2]), platform_funding_pct: Number(contract.promotion_funding_platform_pct), commission_pct: Number(contract.commission_rate_pct), vat_on_fees_pct: Number(contract.vat_on_fees_pct), payment_fee_pct: Number(contract.payment_fee_pct), fixed_order_fee: Number(contract.fixed_order_fee), commission_base: contract.commission_base as "gross_before_discount" | "net_after_discount", expected_conversion_lift_pct: Number(liftMatch[1]), baseline_orders: Number(ordersMatch[1] ?? ordersMatch[2]), duration_days: Number(daysMatch[1]), minimum_margin_pct: persistedGlobalFloor });
        const metrics = { products: simulation.products.length, eligible: simulation.eligible_products, expected_orders: simulation.expected_orders, baseline_contribution: simulation.baseline_contribution, campaign_contribution: simulation.campaign_contribution, incremental_contribution: simulation.incremental_contribution, margin_floor: `${persistedGlobalFloor}%`, decision: simulation.profitable ? "safe for review" : "not approval ready" };
        const reply = simulation.profitable ? "The promotion beats the baseline, every included product meets the active margin floor, and the evidence is ready for review." : "The promotion is not ready for approval. Review the result below: it either misses the baseline, breaches a product margin floor, or lacks verified cost evidence.";
        const operation: Record<string, unknown> = { _type: "operation", operation: "promotion_simulation", platform, summary: reply, requires_confirmation: false, risk_level: "read", metrics };
        setCpObj(operation); setCpPhase("result"); setCpOperationStatus("complete"); setCpOperationMessage(reply); appendCpThread("assistant", reply, "evidence", { kind: "promotion_simulation", operation, metrics, result: simulation }); cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: reply }]); return true;
      }
      const res = await fetchWithTimeout(
        "/api/copilot/compile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            requested_role: requestedRole,
            merchant_id:localStorage.getItem("ps_merchant_id")??undefined,
            access_code:localStorage.getItem("ps_access_code")??undefined,
            context: {
              previous_operation: previousOperation ?? undefined,
              products: previousProducts.length ? previousProducts : catalogContext,
              conversation,
              current_page: tab,
              language: lang,
              currency: "SAR",
              connected_channels: [
                ...new Set(
                  importedProducts.map((product) => product.source_platform).filter(Boolean),
                ),
              ],
              pending_approval:
                previousOperation && previousOperation.requires_confirmation
                  ? previousOperation
                  : null,
            },
          }),
        },
        25_000,
      );
      let data: {
        type?: string;
        rule?: Record<string, unknown>;
        operation?: Record<string, unknown>;
        workflow?: Record<string, unknown>;
        draft_operation?: Record<string, unknown>;
        draft_workflow?: Record<string, unknown>;
        message?: string;
        error?: string;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* non-JSON body */
      }
      if (!res.ok) {
        const failureMessage = data.error ?? `Server error (${res.status}) — the route may still be deploying. Try again in a moment.`;
        setCpError(
          failureMessage,
        );
        appendCpThread("assistant", failureMessage);
        setCpPhase("idle");
        return false;
      }
      cpConversationRef.current = conversation;
      if (data.type === "workflow" && data.workflow) {
        cpPendingDraftRef.current = null;
        const workflow: Record<string, unknown> = { ...data.workflow, _type: "manager_workflow" };
        setCpObj(workflow);
        setCpChatMessage(null);
        setCpPhase("result");
        const workflowReply = `Prepared task: ${String(workflow.title ?? "Store management workflow")}. ${String(workflow.summary ?? "Review the steps and approvals below.")}`;
        appendCpThread("assistant", workflowReply, "task", { kind: "workflow", workflow });
        cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: workflowReply }]);
        return await prepareManagerWorkflow(workflow);
      } else if (data.type === "operation" && data.operation) {
        cpPendingDraftRef.current = null;
        const operation: Record<string, unknown> = { ...data.operation, _type: "operation" };
        setCpObj(operation);
        setCpChatMessage(null);
        setCpPhase("result");
        const operationReply = String(operation.summary ?? "I prepared the requested store operation for review.");
        appendCpThread("assistant", operationReply, operation.requires_confirmation ? "approval" : "task", { kind: "operation", operation });
        cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: operationReply }]);
        return await prepareCopilotOperation(operation);
      } else if (data.type === "clarification" && data.message) {
        cpPendingDraftRef.current =
          data.draft_workflow ?? data.draft_operation ?? previousOperation;
        setCpChatMessage(data.message);
        setCpObj(null);
        setCpPhase("result");
        cpConversationRef.current = compactConversation([
          ...conversation,
          { role: "assistant", text: data.message },
        ]);
        appendCpThread("assistant", data.message);
        return false;
      } else if (data.type === "chat" && data.message) {
        setCpChatMessage(data.message);
        setCpObj(null);
        setCpPhase("result");
        cpConversationRef.current = compactConversation([
          ...conversation,
          { role: "assistant", text: data.message },
        ]);
        appendCpThread("assistant", data.message);
        return true;
      } else if (data.rule) {
        setCpObj(data.rule);
        setCpChatMessage(null);
        setCpPhase("result");
        const ruleReply = String(data.rule.summary ?? "I compiled the requested rule as a draft for review.");
        appendCpThread("assistant", ruleReply);
        cpConversationRef.current = compactConversation([...conversation, { role: "assistant", text: ruleReply }]);
        return true;
      } else {
        setCpError(data.error ?? "Unexpected response — try rephrasing your request.");
        setCpPhase("idle");
        return false;
      }
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : "Request failed. Check your connection and try again.";
      setCpError(failureMessage);
        appendCpThread("assistant", failureMessage, "error");
      setCpPhase("idle");
      return false;
    }
  };

  const startNewCopilotConversation = () => {
    cpConversationRef.current = [];
    cpConversationIdRef.current = null;
    cpPendingDraftRef.current = null;
    setCpConversationTitle("Current conversation");
    setCpThread([]);
    setCpInput("");
    setCpImageAttachments([]);
    setCpDocumentAttachments([]);
    setCpPrompt("");
    setCpObj(null);
    setCpChatMessage(null);
    setCpOperationProducts([]);
    setCpOperationMessage(null);
    setCpOperationStatus("idle");
    setCpActionResults([]);
    setCpOrders([]);
    setCpStoreActionResult(null);
    setCpError(null);
    setCpPhase("idle");
  };

  const prepareManagerWorkflow = async (workflow: Record<string, unknown>) => {
    setCpOperationStatus("running");
    try {
      const steps = Array.isArray(workflow.steps)
        ? (workflow.steps as Array<Record<string, unknown>>)
        : [];
      const response = await fetchWithTimeout(
        "/api/channels/connect",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: localStorage.getItem("ps_merchant_id") ?? "",
            access_code: localStorage.getItem("ps_access_code") ?? "",
            platform: "merchant_experience",
            action: "manager_task_create",
            title: String(workflow.title ?? "Store management workflow"),
            detail: String(workflow.summary ?? "Prepared by the Store Manager."),
            task_type: "manager_workflow",
            priority: String(workflow.priority ?? "medium"),
            approval_required: String(steps.some((step) => step.approval_required === true)),
            risk_level: String(workflow.risk_level ?? "read_only"),
            workflow,
          }),
        },
        12_000,
      );
      const data = (await response.json()) as {
        ok?: boolean;
        task?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.ok || !data.task)
        throw new Error(data.error ?? "The workflow could not be added to the Management desk.");
      setCpObj((current) => (current ? { ...current, manager_task_id: data.task!.id } : current));
      if (cpConversationIdRef.current) void copilotPersistenceRequest({ action: "link_task", id: cpConversationIdRef.current, task_id: data.task.id });
      window.dispatchEvent(new CustomEvent("prizeskout:manager-task-created"));
      const manual = steps.filter((step) => step.execution === "manual_fallback").length;
      const approvals = steps.filter((step) => step.approval_required === true).length;
      setCpOperationMessage(
        `I prepared and saved a ${steps.length}-step plan in the Management desk. ${approvals} step${approvals === 1 ? " needs" : "s need"} your approval.${manual ? ` ${manual} step${manual === 1 ? " needs" : "s need"} someone to complete it because the partner does not let PrizeSkout do it directly.` : ""} Nothing has changed in your store.`,
      );
      setCpOperationStatus("ready");
      return true;
    } catch (error) {
      setCpOperationStatus("failed");
      setCpOperationMessage(
        error instanceof Error ? error.message : "The workflow could not be prepared.",
      );
      return false;
    }
  };

  const matchCopilotProducts = (
    operation: Record<string, unknown>,
    products = importedProducts,
  ) => {
    const query = String(operation.query ?? operation.sku ?? "")
      .trim()
      .toLowerCase();
    const platform = String(operation.platform ?? "all").toLowerCase();
    const category = String(operation.category ?? "")
      .trim()
      .toLowerCase();
    const filtered = products.filter((product) => {
      const platformMatch =
        platform === "all" || product.source_platform.toLowerCase() === platform;
      const haystack =
        `${product.name_en} ${product.name_ar} ${product.sku} ${product.item_id}`.toLowerCase();
      const categoryMatch = !category || haystack.includes(category);
      return platformMatch && categoryMatch;
    });
    if (!query) return filtered;
    const references = filtered.map((product) => ({
      product,
      name: product.name_en || product.name_ar,
      sku: product.sku,
      platform: product.source_platform,
    }));
    const resolved = resolveProductReferences(references, query, platform);
    return resolved.matches.map((match) => match.product);
  };

  const fetchCopilotCatalog = async (preview?: {
    floor: number;
    cap: number;
  }): Promise<ImportedProduct[]> => {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode)
      throw new Error("Reopen PrizeSkout from Zid to restore your merchant session.");
    const params = new URLSearchParams({ merchant_id: merchantId, access_code: accessCode });
    if (preview) {
      params.set("preview_floor", String(preview.floor));
      params.set("preview_max_increase", String(preview.cap));
    }
    const response = await fetchWithTimeout(`/api/repricing/catalog?${params}`);
    const data = (await response.json()) as { products?: ImportedProduct[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load the catalogue.");
    const products = data.products ?? [];
    setImportedProducts(products);
    return products;
  };

  const prepareCopilotOperation = async (operation: Record<string, unknown>) => {
    const op = String(operation.operation ?? "");
    setCpOperationStatus("running");
    try {
      let products = importedProducts;
      if (["change_order_status", "create_product_draft"].includes(op)) {
        const missing =
          op === "change_order_status"
            ? !operation.order_id || !operation.order_status
            : !operation.product_name || !(Number(operation.product_price) > 0);
        if (missing)
          throw new Error(
            op === "change_order_status"
              ? "Specify the Zid order reference and target status."
              : "Specify the product name and a positive selling price.",
          );
        const skuNote = operation.product_sku
          ? ` with SKU ${String(operation.product_sku)}`
          : " with a clean SKU generated from its name";
        setCpOperationMessage(
          op === "change_order_status"
            ? `Ready to move order ${String(operation.order_id)} to ${String(operation.order_status)}. No change has been made.`
            : `I’ll create ${String(operation.product_name)}${skuNote} at SAR ${Number(operation.product_price).toLocaleString()} and ${operation.publish_product === true ? "publish it to your Zid storefront" : "save it as an unpublished draft"}. Review the details, then continue.`,
        );
      } else if (op === "customer_search") {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
          accessCode = localStorage.getItem("ps_access_code") ?? "";
        const response = await fetchWithTimeout("/api/copilot/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            action: "customer_search",
            customer_query: operation.customer_query,
          }),
        });
        const data = (await response.json()) as {
          message?: string;
          customer?: {
            name: string;
            mobile: string;
            email: string;
            points: number;
            orders: number;
            last_order_date: string;
          };
          error?: string;
        };
        if (!response.ok || !data.customer)
          throw new Error(data.error ?? "Could not search Zid customers.");
        setCpOperationMessage(
          `${data.message} Mobile ${data.customer.mobile || "not supplied"}; email ${data.customer.email || "not supplied"}; ${data.customer.points} loyalty points; ${data.customer.orders} orders${data.customer.last_order_date ? `; last order ${new Date(data.customer.last_order_date).toLocaleDateString()}` : ""}. Personal details are masked.`,
        );
      } else if (op === "image_job") {
        const response = await fetchWithTimeout("/api/copilot/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: localStorage.getItem("ps_merchant_id") ?? "", access_code: localStorage.getItem("ps_access_code") ?? "", action: "preview", job_id: operation.image_job_id }) }, 30_000);
        const data = await response.json() as { ok?: boolean; preview?: { approval_token: string; expires_at: string }; error?: string };
        if (!response.ok || !data.ok || !data.preview) throw new Error(data.error ?? "The image approval could not be refreshed.");
        setCpObj(current => current ? { ...current, image_approval_token: data.preview!.approval_token, image_approval_expires_at: data.preview!.expires_at } : current);
        setCpOperationMessage("The exact image and current gallery were refreshed. Existing images will be preserved. Approve when ready.");
      } else if (
        [
          "product_image_upload",
          "variant_create",
          "schedule_product_action",
          "coupon_change",
          "category_assign",
          "loyalty_adjust",
          "reverse_refund",
        ].includes(op)
      ) {
        if (op === "product_image_upload")
          setCpOperationMessage(
            `Ready to attach the supplied image to ${String(operation.query)}. Nothing has changed yet.`,
          );
        if (op === "variant_create")
          setCpOperationMessage(
            `Ready to create ${Array.isArray(operation.variant_values) ? operation.variant_values.length : 0} ${String(operation.variant_option)} variants for ${String(operation.query)}. Nothing has changed yet.`,
          );
        if (op === "schedule_product_action")
          setCpOperationMessage(
            `Ready to schedule ${String(operation.scheduled_action).replaceAll("_", " ")} for ${String(operation.query)} at ${String(operation.execute_at)}. Nothing has changed yet.`,
          );
        if (op === "coupon_change")
          setCpOperationMessage(
            `Ready to ${String(operation.coupon_mode)} coupon ${String(operation.coupon_name ?? operation.coupon_code)}${operation.coupon_discount_pct ? ` at ${Number(operation.coupon_discount_pct)}%` : ""}${operation.coupon_start_date ? ` starting ${String(operation.coupon_start_date)}` : ""}. Nothing has changed yet.`,
          );
        if (op === "category_assign")
          setCpOperationMessage(
            `Ready to assign ${String(operation.query)} to the ${String(operation.category)} category. PrizeSkout will require one exact product and category match.`,
          );
        if (op === "loyalty_adjust")
          setCpOperationMessage(
            `Ready to ${operation.loyalty_direction === "-" ? "remove" : "add"} ${Number(operation.loyalty_points)} loyalty points ${operation.loyalty_direction === "-" ? "from" : "to"} the one customer matching ${String(operation.customer_query)}. Personal details will remain masked.`,
          );
        if (op === "reverse_refund")
          setCpOperationMessage(
            `Ready to request a SAR ${Number(operation.refund_amount).toLocaleString()} refund for reverse order ${String(operation.refund_reverse_id)} using ${String(operation.refund_method)}. Before sending it, PrizeSkout will verify Zid's refundable balance and allowed methods.`,
          );
      } else if (["seed_test_store", "cleanup_test_store"].includes(op)) {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
          accessCode = localStorage.getItem("ps_access_code") ?? "";
        const response = await fetchWithTimeout("/api/copilot/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            action: "seed_test_store_preview",
          }),
        });
        const data = (await response.json()) as {
          preview?: {
            store: { id: string; title: string; test_store_confirmed: boolean };
            source_product: { name: string; sku: string } | null;
            products: Array<{
              sku: string;
              name: string;
              price: number;
              cost: number | null;
              quantity: number;
              note: string;
            }>;
            coupons: Array<{ code: string; discount: number; note: string }>;
            existing: { products: string[]; coupons: string[] };
            ready: boolean;
            blockers: string[];
            warnings: string[];
          };
          error?: string;
          candidates?: Array<{
            id: string;
            name: string;
            sku: string;
            is_published: boolean;
          }>;
        };
        if (data.candidates?.length) {
          setCpObj((current) =>
            current ? { ...current, product_candidates: data.candidates } : current,
          );
          setCpOperationStatus("failed");
          setCpOperationMessage(
            data.error ?? "Choose the intended product below before I change anything.",
          );
          return true;
        }
        if (!response.ok || !data.preview)
          throw new Error(data.error ?? "Could not inspect the Zid test store.");
        const p = data.preview;
        if (!p.ready) throw new Error(p.blockers.join(" "));
        setCpObj((current) =>
          current
            ? {
                ...current,
                test_store_id: p.store.id,
                test_store_title: p.store.title,
                confirm_test_store: true,
              }
            : current,
        );
        const confirmation = p.store.test_store_confirmed
          ? "Zid identifies it as a test store."
          : "Zid does not label it as a test store; approving explicitly confirms this exact store is disposable test data.";
        setCpOperationMessage(
          op === "cleanup_test_store"
            ? `Ready to clean only PrizeSkout fixtures from Zid store “${p.store.title}” (ID ${p.store.id}): unpublish ${p.existing.products.length} PS-ZID products and remove ${p.existing.coupons.length} test coupons. Genuine orders will remain. ${confirmation}`
            : `Ready to prepare Zid store “${p.store.title}” (ID ${p.store.id}) from ${p.source_product?.name ?? "the existing product"}. Plan: ${p.products.length} products (${p.products.filter((item) => p.existing.products.includes(item.sku)).length} already exist), ${p.coupons.length} coupons (${p.coupons.filter((item) => p.existing.coupons.includes(item.code)).length} already exist), realistic SAR 55–120 prices, eight verified costs, two below-floor products, one out-of-stock product, one missing-cost product, one loss-order product and one unpublished draft. No write has happened. ${confirmation}`,
        );
      } else if (op === "product_change") {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
          accessCode = localStorage.getItem("ps_access_code") ?? "";
        const request = {
          mode: String(operation.product_mode ?? "edit"),
          sku: operation.sku ? String(operation.sku) : undefined,
          query: operation.query ? String(operation.query) : undefined,
          scope: String(operation.scope ?? "single"),
          inventory_filter: operation.inventory_filter
            ? String(operation.inventory_filter)
            : undefined,
          changes: {
            ...(operation.new_product_name
              ? { name: String(operation.new_product_name).replace(/[,;:\s]+$/, "") }
              : {}),
            ...(operation.new_product_sku ? { sku: String(operation.new_product_sku) } : {}),
            ...(operation.product_price != null &&
            Number.isFinite(Number(operation.product_price)) &&
            Number(operation.product_price) > 0
              ? { price: Number(operation.product_price) }
              : {}),
            ...(operation.product_cost != null &&
            Number.isFinite(Number(operation.product_cost)) &&
            Number(operation.product_cost) >= 0
              ? { cost: Number(operation.product_cost) }
              : {}),
            ...(operation.product_quantity != null &&
            Number.isInteger(Number(operation.product_quantity)) &&
            Number(operation.product_quantity) >= 0
              ? { quantity: Number(operation.product_quantity) }
              : {}),
            ...(typeof operation.product_infinite === "boolean"
              ? { is_infinite: operation.product_infinite }
              : {}),
            ...(operation.product_mode === "duplicate"
              ? { is_published: operation.publish_duplicate === true }
              : {}),
          },
        };
        const response = await fetchWithTimeout("/api/copilot/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            action: "preview_product_change",
            product_request: request,
          }),
        });
        const data = (await response.json()) as {
          preview?: {
            store: { id: string; title: string };
            mode: string;
            count: number;
            products: Array<{
              sku: string;
              name: string;
              changes: Array<{ field: string; before: unknown; after: unknown }>;
            }>;
            approval_token: string;
            expires_at: string;
            risk: string;
            warning: string;
          };
          error?: string;
        };
        if (!response.ok || !data.preview)
          throw new Error(data.error ?? "Could not preview the Zid product change.");
        const preview = data.preview;
        setCpObj((current) =>
          current
            ? {
                ...current,
                approval_token: preview.approval_token,
                product_change_preview: preview,
              }
            : current,
        );
        const first = preview.products[0],
          newProduct = first?.changes.find((change) => change.field === "new product")?.after;
        setCpOperationMessage(
          String(operation.product_mode) === "duplicate"
            ? `I found ${first?.name ?? "the product"}. I’ll create ${String(newProduct ?? operation.new_product_name ?? "the new product")} in ${preview.store.title}. The original will stay unchanged.`
            : `I found ${preview.count} matching product${preview.count === 1 ? "" : "s"} in ${preview.store.title}. Review the change below, then approve when it looks right.`,
        );
      } else if (op === "list_orders") {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
          accessCode = localStorage.getItem("ps_access_code") ?? "";
        const response = await fetchWithTimeout("/api/copilot/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            action: "list_orders",
          }),
        });
        const data = (await response.json()) as {
          orders?: Array<{
            id: string;
            code: string;
            status: string;
            total: number;
            currency: string;
            created_at: string;
          }>;
          summary?: { count: number; total: number; by_status: Record<string, number> };
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Could not load Zid orders.");
        setCpOrders(data.orders ?? []);
        const statuses = Object.entries(data.summary?.by_status ?? {})
          .map(([status, count]) => `${count} ${status}`)
          .join(", ");
        setCpOperationMessage(
          `${data.summary?.count ?? 0} orders retrieved from Zid for today${statuses ? ` (${statuses})` : ""}. Total recorded order value: SAR ${(data.summary?.total ?? 0).toLocaleString()}. No order state was changed.`,
        );
      } else if (["profit_brief", "tax_summary", "returns_impact", "coupon_risk"].includes(op)) {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
          accessCode = localStorage.getItem("ps_access_code") ?? "";
        const response = await fetchWithTimeout("/api/copilot/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            action: "profit_brief",
            days: 30,
          }),
        });
        const data = (await response.json()) as {
          brief?: {
            currency: string;
            order_count: number;
            gross_revenue: number;
            revenue: number;
            contribution: number;
            loss_order_count: number;
            loss_amount: number;
            verified_cost_coverage_pct: number;
            vat: {
              available: boolean;
              active: boolean;
              included_in_prices: boolean;
              rate: number | null;
              amount: number;
              message: string;
            };
            returns: { orders: number; amount: number; message: string };
            stock: { available: number; out_of_stock: number; low_stock: number };
            orders: Array<{
              id: string;
              code: string;
              status: string;
              revenue: number;
              vat_amount: number;
              return_amount: number;
              attention: string | null;
            }>;
            coupons: Array<{
              code: string;
              discount_label: string;
              products_below_floor: number;
              risk: string;
            }>;
          };
          error?: string;
        };
        if (!response.ok || !data.brief)
          throw new Error(data.error ?? "Could not build the Zid profit brief.");
        const b = data.brief;
        if (op === "profit_brief") {
          setCpOrders(
            b.orders
              .filter((order) => order.attention)
              .slice(0, 20)
              .map((order) => ({
                id: order.id,
                code: order.code,
                status: order.attention ?? order.status,
                total: order.revenue,
                currency: b.currency,
                created_at: "",
              })),
          );
          setCpOperationMessage(
            `Across ${b.order_count} Zid orders, sales were ${b.currency} ${b.gross_revenue.toLocaleString()}. After confirmed VAT and recorded returns, usable revenue was ${b.currency} ${b.revenue.toLocaleString()}. Orders with complete verified costs kept ${b.currency} ${b.contribution.toLocaleString()}. ${b.loss_order_count} verified order${b.loss_order_count === 1 ? "" : "s"} lost ${b.currency} ${b.loss_amount.toLocaleString()}. Cost evidence covers ${Math.round(b.verified_cost_coverage_pct)}% of ordered units; incomplete orders were not guessed.`,
          );
        } else if (op === "tax_summary") {
          setCpOrders(
            b.orders
              .filter((order) => order.vat_amount > 0)
              .slice(0, 20)
              .map((order) => ({
                id: order.id,
                code: order.code,
                status: `VAT removed: ${b.currency} ${order.vat_amount.toLocaleString()}`,
                total: order.revenue,
                currency: b.currency,
                created_at: "",
              })),
          );
          setCpOperationMessage(
            `${b.vat.message} PrizeSkout removed ${b.currency} ${b.vat.amount.toLocaleString()} of confirmed VAT from ${b.currency} ${b.gross_revenue.toLocaleString()} in recent Zid sales before calculating what you kept.`,
          );
        } else if (op === "returns_impact") {
          setCpOrders(
            b.orders
              .filter((order) => order.return_amount > 0)
              .slice(0, 20)
              .map((order) => ({
                id: order.id,
                code: order.code,
                status: `Return removed: ${b.currency} ${order.return_amount.toLocaleString()}`,
                total: order.revenue,
                currency: b.currency,
                created_at: "",
              })),
          );
          setCpOperationMessage(
            `${b.returns.message} Across ${b.returns.orders} affected order${b.returns.orders === 1 ? "" : "s"}, returns reduced usable revenue by ${b.currency} ${b.returns.amount.toLocaleString()}. No refund or return was initiated.`,
          );
        } else {
          const risky = b.coupons.filter((coupon) => coupon.risk === "review");
          setCpObj((current) =>
            current
              ? {
                  ...current,
                  coupon_candidates: risky,
                }
              : current,
          );
          setCpOperationMessage(
            risky.length
              ? `${risky.length} coupon${risky.length === 1 ? "" : "s"} need review: ${risky.map((coupon) => `${coupon.code} (${coupon.discount_label}) puts ${coupon.products_below_floor} verified products below your active floor`).join("; ")}. This is a read-only safety check; no coupon was changed.`
              : "No coupon returned by Zid was proven to push a verified-cost product below your active protection floor. Coupons with incomplete evidence remain marked unknown.",
          );
        }
      } else if (op === "sync_catalog") {
        const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
        const accessCode = localStorage.getItem("ps_access_code") ?? "";
        const platform = String(operation.platform ?? "zid").toLowerCase();
        const response = await fetchWithTimeout("/api/channels/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            platform: "copilot_operation",
            action: "sync_catalog",
            source_platform: platform === "all" ? "zid" : platform,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          result?: {
            items_found: number;
            items_stored: number;
            items_below_floor: number;
            errors: number;
          };
        };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "Catalogue sync failed.");
        products = await fetchCopilotCatalog();
        const r = data.result;
        setCpOperationMessage(
          `Catalogue synchronized: ${r?.items_found ?? products.length} found, ${r?.items_stored ?? products.length} stored, ${r?.items_below_floor ?? 0} below the margin floor${r?.errors ? `, ${r.errors} errors` : ""}.`,
        );
      } else {
        const floor = Number(operation.minimum_margin_pct);
        const cap = Number(operation.maximum_increase_pct);
        products = await fetchCopilotCatalog(
          (op === "protect_margin" || op === "publish_prices") && floor > 0 && floor < 1
            ? { floor, cap: cap > 0 && cap <= 1 ? cap : 0.1 }
            : undefined,
        );
        const requestedQuery = String(operation.query ?? operation.sku ?? "").trim();
        if (requestedQuery && String(operation.scope ?? "single") === "single") {
          const candidates = products.map((product) => ({
            product,
            name: product.name_en || product.name_ar,
            sku: product.sku,
            platform: product.source_platform,
          }));
          const grounded = resolveProductReferences(
            candidates,
            requestedQuery,
            String(operation.platform ?? "all"),
          );
          if (grounded.status === "ambiguous") {
            const choices = grounded.matches
              .map((match) => `${match.name} (${match.sku})`)
              .join(", ");
            throw new Error(
              `I found several close matches: ${choices}. Tell me the exact product name or SKU, and I’ll continue with the same request.`,
            );
          }
        }
        let matches = matchCopilotProducts(operation, products);
        if (op === "protect_margin")
          matches = matches.filter(
            (product) =>
              product.cost_confidence === "verified" &&
              product.inventory_status !== "out_of_stock" &&
              Boolean(product.preview?.floor_breached),
          );
        if (op === "publish_prices" && operation.verified_costs_only)
          matches = matches.filter(
            (product) =>
              product.cost_confidence === "verified" &&
              (!operation.exclude_out_of_stock || product.inventory_status !== "out_of_stock"),
          );
        if (op === "low_stock")
          matches = matches.filter(
            (product) =>
              product.inventory_status === "out_of_stock" ||
              (!product.inventory_is_infinite &&
                product.inventory_quantity != null &&
                product.inventory_quantity > 0 &&
                product.inventory_quantity <= 5),
          );
        if (op === "cost_attention")
          matches = matches.filter((product) => product.cost_confidence !== "verified");
        setCpOperationProducts(matches);
        const excludedUnverified =
          op === "protect_margin"
            ? products.filter(
                (product) => product.floor_breached && product.cost_confidence !== "verified",
              ).length
            : 0;
        setCpOperationMessage(
          matches.length
            ? op === "protect_margin"
              ? `${matches.length} product${matches.length === 1 ? "" : "s"} can be safely reviewed against the requested floor. ${excludedUnverified} at-risk product${excludedUnverified === 1 ? " was" : "s were"} excluded because cost evidence is not verified.`
              : op === "low_stock"
                ? `${matches.length} product${matches.length === 1 ? " needs" : "s need"} stock attention. Out-of-stock products are excluded from pricing actions. This is a read-only result.`
                : op === "cost_attention"
                  ? `${matches.length} product${matches.length === 1 ? " does" : "s do"} not have a verified platform cost and cannot be safely auto-repriced.`
                  : op === "list_products"
                    ? `${matches.length} ${String(operation.platform ?? "connected")} product${matches.length === 1 ? " is" : "s are"} currently available to PrizeSkout. This is a read-only result.`
                  : `${matches.length} product${matches.length === 1 ? "" : "s"} matched. Review the details below.`
            : op === "cost_attention"
              ? "Every product currently has verified cost information. There is nothing to review."
              : op === "low_stock"
                ? "No products currently need stock attention."
                : op === "list_products"
                  ? `No ${String(operation.platform ?? "connected")} products are currently available to PrizeSkout. Check that the channel is connected, run a catalogue sync, and try again.`
                : "No matching products were found. Try a product name, SKU, or a broader request.",
        );
      }
      if (op === "sync_catalog") setCpOperationProducts(matchCopilotProducts(operation, products));
      setCpOperationStatus(op === "customer_search" ? "complete" : "ready");
      return true;
    } catch (error) {
      setCpOperationStatus("failed");
      setCpOperationMessage(
        error instanceof Error ? error.message : "The operation could not be completed.",
      );
      return false;
    }
  };

  const executeCopilotStoreWrite = async () => {
    if (!cpObj || cpOperationStatus === "publishing") return;
    const operation = String(cpObj.operation ?? "");
    if (operation === "image_job") {
      setCpOperationStatus("publishing");
      try {
        const response = await fetchWithTimeout("/api/copilot/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: localStorage.getItem("ps_merchant_id") ?? "", access_code: localStorage.getItem("ps_access_code") ?? "", action: "apply", approval_token: cpObj.image_approval_token }) }, 30_000);
        const result = await response.json() as { ok?: boolean; confirmed?: boolean; message?: string; error?: string; results?: Array<Record<string, unknown>> };
        if (!response.ok || !result.ok) throw new Error(result.error ?? result.message ?? "The image upload could not be verified.");
        setCpStoreActionResult({ confirmed: Boolean(result.confirmed), action_id: String(cpObj.image_job_id ?? ""), message: result.message ?? "Image upload completed." });
        setCpOperationStatus("complete"); setCpOperationMessage(result.message ?? "The image was uploaded and verified in Zid.");
        appendCpThread("assistant", result.message ?? "Done. The image was uploaded and verified in Zid.", "execution", { kind: "execution", operation, status: result.confirmed ? "confirmed" : "completed_with_warning", action_id: cpObj.image_job_id ?? null, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "The image upload failed.";
        setCpOperationStatus("failed"); setCpOperationMessage(message); appendCpThread("assistant", message, "error", { kind: "execution", operation, status: "failed" });
      }
      return;
    }
    if (
      ![
        "change_order_status",
        "create_product_draft",
        "product_change",
        "product_image_upload",
        "variant_create",
        "schedule_product_action",
        "coupon_change",
        "category_assign",
        "loyalty_adjust",
        "reverse_refund",
        "seed_test_store",
        "cleanup_test_store",
      ].includes(operation)
    )
      return;
    if (operation === "product_change" && !String(cpObj.approval_token ?? "").trim()) {
      setCpOperationMessage(
        "I need to reload the exact product and proposed change before you can approve it.",
      );
      await prepareCopilotOperation(cpObj);
      return;
    }
    setCpOperationStatus("publishing");
    try {
      const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
        accessCode = localStorage.getItem("ps_access_code") ?? "";
      const response = await fetchWithTimeout("/api/copilot/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          access_code: accessCode,
          action: operation === "product_change" ? "apply_product_change" : operation,
          order_id: cpObj.order_id,
          order_status: cpObj.order_status,
          product_name: cpObj.product_name,
          product_sku: cpObj.product_sku,
          product_price: cpObj.product_price,
          product_cost: cpObj.product_cost,
          product_quantity: cpObj.product_quantity,
          product_infinite: cpObj.product_infinite,
          publish_product: cpObj.publish_product,
          image_url: cpObj.image_url,
          image_alt: cpObj.image_alt,
          variant_option: cpObj.variant_option,
          variant_values: cpObj.variant_values,
          variant_price: cpObj.variant_price,
          variant_quantity: cpObj.variant_quantity,
          scheduled_action: cpObj.scheduled_action,
          scheduled_value: cpObj.scheduled_value,
          execute_at: cpObj.execute_at,
          coupon_mode: cpObj.coupon_mode,
          coupon_code: cpObj.coupon_code,
          coupon_name: cpObj.coupon_name,
          coupon_discount_pct: cpObj.coupon_discount_pct,
          coupon_start_date: cpObj.coupon_start_date,
          query: cpObj.query,
          category: cpObj.category,
          customer_query: cpObj.customer_query,
          loyalty_points: cpObj.loyalty_points,
          loyalty_direction: cpObj.loyalty_direction,
          loyalty_reason: cpObj.loyalty_reason,
          refund_reverse_id: cpObj.refund_reverse_id,
          refund_amount: cpObj.refund_amount,
          refund_method: cpObj.refund_method,
          test_store_id: cpObj.test_store_id,
          confirm_test_store: cpObj.confirm_test_store,
          approval_token: cpObj.approval_token,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        confirmed?: boolean;
        action_id?: string;
        message?: string;
        results?: Array<{
          id: string;
          sku: string;
          source_sku?: string;
          status: string;
          storefront_visible?: boolean;
          after?: {
            id: string;
            sku: string;
            name: string;
            price: number | null;
            sale_price: number | null;
            cost: number | null;
            quantity: number | null;
            is_infinite: boolean;
            is_published: boolean;
            is_draft: boolean;
            storefront_visible?: boolean;
          };
        }>;
        error?: string;
        candidates?: Array<{ id: string; name: string; sku: string; is_published: boolean }>;
      };
      if (result.candidates?.length) {
        setCpObj((current) =>
          current ? { ...current, product_candidates: result.candidates } : current,
        );
        setCpOperationStatus("failed");
        setCpOperationMessage(result.error ?? "Choose the intended product before continuing.");
        return;
      }
      if ((!response.ok || !result.ok) && !result.results?.length)
        throw new Error(result.error ?? "Zid did not complete the requested action.");
      setCpStoreActionResult({
        confirmed: Boolean(result.confirmed ?? result.ok),
        action_id:
          result.action_id ?? (operation === "seed_test_store" ? "PS-ZID-SEED" : "PS-ZID-CLEANUP"),
        message: result.message ?? "Completed",
        products: result.results,
      });
      if (operation === "create_product_draft" && result.results?.[0]?.after)
        setCpObj((current) =>
          current
            ? {
                ...current,
                created_product_sku: result.results![0].after!.sku,
                sku: result.results![0].after!.sku,
                query: result.results![0].after!.sku,
              }
            : current,
        );
      setCpObj((current) =>
        current
          ? { ...current, last_execution_complete: true, last_action_id: result.action_id ?? null }
          : current,
      );
      setCpOperationMessage(
        ["product_change", "create_product_draft"].includes(operation)
          ? "Done. I checked the result directly in Zid and the product details are shown below."
          : (result.message ?? "The Zid action completed."),
      );
      setCpOperationStatus("complete");
      appendCpThread(
        "assistant",
        ["product_change", "create_product_draft"].includes(operation)
          ? "Done. I completed the approved change and checked the result in Zid."
          : (result.message ?? "Done. The approved action completed."),
        "execution",
        {
          kind: "execution",
          operation,
          status: result.confirmed ?? result.ok ? "confirmed" : "completed_with_warning",
          action_id: result.action_id ?? null,
          result,
        },
      );
    } catch (error) {
      setCpOperationStatus("failed");
      const message = error instanceof Error ? error.message : "The Zid action failed.";
      setCpOperationMessage(message);
      appendCpThread("assistant", message, "error", { kind: "execution", operation, status: "failed" });
    }
  };

  const updateCreateProductDraft = (field: string, value: unknown) => {
    if (!cpObj || String(cpObj.operation) !== "create_product_draft") return;
    const next = { ...cpObj, [field]: value };
    const ready = Boolean(String(next.product_name ?? "").trim()) && Number(next.product_price) > 0;
    setCpObj(next);
    setCpOperationStatus(ready ? "ready" : "failed");
    setCpOperationMessage(
      ready
        ? "Product details are ready. Review them and confirm when everything looks right."
        : "Add a product name and a selling price greater than zero to continue.",
    );
  };

  const prepareCreatedProductPublish = async (sku: string) => {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "",
      accessCode = localStorage.getItem("ps_access_code") ?? "";
    setCpOperationStatus("running");
    try {
      const response = await fetchWithTimeout("/api/copilot/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          access_code: accessCode,
          action: "preview_product_change",
          product_request: { mode: "publish", sku, scope: "single", changes: {} },
        }),
      });
      const data = (await response.json()) as {
        preview?: {
          approval_token: string;
          store: { title: string };
          products: Array<{
            name: string;
            sku: string;
            changes: Array<{ field: string; before: unknown; after: unknown }>;
          }>;
        };
        error?: string;
      };
      if (!response.ok || !data.preview)
        throw new Error(data.error ?? "Could not prepare publication.");
      setCpObj((current) =>
        current
          ? {
              ...current,
              operation: "product_change",
              product_mode: "publish",
              approval_token: data.preview!.approval_token,
              product_change_preview: data.preview,
              summary: `Publish ${data.preview!.products[0]?.name ?? sku}`,
            }
          : current,
      );
      setCpStoreActionResult(null);
      setCpOperationMessage(
        `I found ${data.preview.products[0]?.name ?? sku}. It is ready to be published to your Zid storefront.`,
      );
      setCpOperationStatus("ready");
    } catch (error) {
      setCpOperationStatus("failed");
      setCpOperationMessage(
        error instanceof Error ? error.message : "Could not prepare publication.",
      );
    }
  };

  const publishCopilotPrices = async () => {
    if (!cpObj || cpOperationProducts.length === 0 || cpOperationStatus === "publishing") return;
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    setCpOperationStatus("publishing");
    let succeeded = 0;
    const failures: string[] = [];
    const actionResults: Array<{
      name: string;
      sku: string;
      before: number;
      target: number;
      live: number | null;
      confirmed: boolean;
      rolledBack: boolean;
      actionId: string;
      message: string;
    }> = [];
    for (const product of cpOperationProducts) {
      const mode = String(cpObj.price_mode ?? "recommended");
      const fixed = Number(cpObj.target_price);
      const pct = Number(cpObj.percentage_change);
      const targetPrice =
        mode === "fixed" && fixed > 0
          ? fixed
          : mode === "percentage_change" && Number.isFinite(pct)
            ? product.current_price * (1 + pct / 100)
            : (product.preview?.allowed_price ?? product.current_price);
      try {
        const response = await fetch("/api/repricing/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            access_code: accessCode,
            ingest_event_id: product.ingest_event_id,
            target_price: Math.round(targetPrice * 100) / 100,
            idempotency_key: priceActionKey(product.ingest_event_id,Math.round(targetPrice*100)/100,"copilot"),
            approval_confirmed: true,
          }),
        });
        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          live_price?: number | null;
          confirmed?: boolean;
          rolled_back?: boolean;
          action_id?: string;
        };
        clearPriceActionKey(product.ingest_event_id,Math.round(targetPrice*100)/100,"copilot");
        if (!response.ok || !result.ok) {
          const message = result.error ?? result.message ?? "Rejected";
          failures.push(`${product.name_en || product.sku}: ${message}`);
          actionResults.push({
            name: product.name_en || product.sku,
            sku: product.sku,
            before: product.current_price,
            target: Math.round(targetPrice * 100) / 100,
            live: result.live_price ?? null,
            confirmed: false,
            rolledBack: Boolean(result.rolled_back),
            actionId: result.action_id ?? "Not issued",
            message,
          });
          continue;
        }
        succeeded++;
        actionResults.push({
          name: product.name_en || product.sku,
          sku: product.sku,
          before: product.current_price,
          target: Math.round(targetPrice * 100) / 100,
          live: result.live_price ?? null,
          confirmed: Boolean(result.confirmed),
          rolledBack: Boolean(result.rolled_back),
          actionId: result.action_id ?? "Not available",
          message: result.message ?? "Completed",
        });
      } catch (error) {
        failures.push(
          `${product.name_en || product.sku}: ${error instanceof Error ? error.message : "failed"}`,
        );
        actionResults.push({
          name: product.name_en || product.sku,
          sku: product.sku,
          before: product.current_price,
          target: Math.round(targetPrice * 100) / 100,
          live: null,
          confirmed: false,
          rolledBack: false,
          actionId: "Not issued",
          message: error instanceof Error ? error.message : "Failed",
        });
      }
    }
    setCpActionResults(actionResults);
    await fetchCopilotCatalog().catch(() => {});
    setCpOperationStatus(failures.length ? "failed" : "complete");
    setCpOperationMessage(
      `${succeeded} of ${cpOperationProducts.length} price update${cpOperationProducts.length === 1 ? "" : "s"} completed and confirmed live.${failures.length ? ` ${failures.length} did not complete: ${failures.slice(0, 2).join("; ")}` : ""}`,
    );
  };

  const applyConfig = () => {
    if (applied || !cpObj) return;
    const policyType = String(cpObj.policy_type ?? cpObj.engine_rule ?? "policy_draft");
    const policyNames: Record<string, string> = {
      margin_floor: "Margin floor",
      approval_threshold: "Manual approval threshold",
      stale_cost_guard: "Stale cost protection",
      maximum_price_change: "Maximum price change",
      competitor_match: "Competitor price match",
      conditional_floor: "Conditional margin floor",
      legal_ceiling: "Legal price ceiling",
      channel_parity: "Channel price parity",
    };
    const name =
      policyNames[policyType] ??
      policyType
        .split("_")
        .map((w: string) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    const channels = Array.isArray(cpObj.channels) ? cpObj.channels.map(String) : [];
    const desc = String(
      cpObj.summary ??
        `${cpObj.target_category || cpObj.target_sku_class || "all products"}${channels.length ? ` · ${channels.join(", ")}` : " · all channels"}`,
    );
    setApplied(true);
    const compiledFloor = typeof cpObj.minimum_floor === "number" ? cpObj.minimum_floor : null;
    const approvalThreshold =
      typeof cpObj.approval_threshold_pct === "number" ? cpObj.approval_threshold_pct : null;
    const maximumChange =
      typeof cpObj.maximum_change_pct === "number" ? cpObj.maximum_change_pct : null;
    setRules((prev) => [
      ...prev,
      {
        name,
        desc,
        floor:
          compiledFloor != null && Number.isFinite(compiledFloor)
            ? Math.round(compiledFloor * 100)
            : persistedGlobalFloor,
        active: false,
        status: "draft",
        scope: channels.length
          ? "channel"
          : cpObj.target_category && cpObj.target_category !== "all"
            ? "category"
            : "global",
        maxChangePct:
          maximumChange != null && Number.isFinite(maximumChange)
            ? Math.round(maximumChange * 100)
            : 15,
        dailyChangePct: 20,
        approvalAbovePct:
          approvalThreshold != null && Number.isFinite(approvalThreshold)
            ? Math.round(approvalThreshold * 100)
            : 10,
        cooldownHours: 24,
        rollbackOnReject: true,
        stopOnStaleCost: Boolean(cpObj.stop_on_stale_cost),
        approvalMode: "recommend_only",
        minimumContribution: 0,
      },
    ]);
    showToast("Rule draft created. Preview its impact before activation.");
  };

  const fileClaim = async () => {
    if (fileStep > 0 || modal == null || !disputes[modal]) return;
    setFileStep(1);
    try {
      const { exportDisputeProofPdf } =
        await import("@/components/dashboard/payout/exportDisputeProofPdf");
      await exportDisputeProofPdf({
        merchantName: storeName,
        claims: [disputes[modal]],
        executions: [],
      });
      setFileStep(3);
      showToast("Claim evidence downloaded. No platform submission was made.");
    } catch (error) {
      setFileStep(0);
      showToast(
        error instanceof Error
          ? `Evidence export failed: ${error.message}`
          : "Evidence export failed.",
      );
    }
  };

  const downloadCsv = () => {
    const rows = [["time", "event", "detail"], ...feed.map((f) => [f.time, f.tag, f.text])];
    const csv = rows
      .map((r) => r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "prizeskout-audit-log.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast(`🟢 Audit log exported (${feed.length} events)`);
  };

  const exportDisputeProofs = async () => {
    try {
      const { exportDisputeProofPdf } =
        await import("@/components/dashboard/payout/exportDisputeProofPdf");
      await exportDisputeProofPdf({
        merchantName: storeName,
        claims: disputes,
        executions: feed.map((item) => ({ time: item.time, tag: item.tag, detail: item.text })),
      });
      showToast(
        `Report downloaded · ${disputes.length} claim draft${disputes.length === 1 ? "" : "s"} · ${feed.length} recorded action${feed.length === 1 ? "" : "s"}`,
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? `Evidence export failed: ${error.message}`
          : "Evidence export failed.",
      );
    }
  };

  const runPayoutCheck = async () => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) {
      showToast("Please connect your store first.");
      return;
    }
    setPayoutLoading(true);
    setPayoutError(null);
    setPayoutDocuments([]);
    setAuditResult(null);
    setStagedItems([]);
    setAuditSaved(false);
    setSettlementRun(null);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid,
          access_code: ac,
          platform: "talabat_expected_payout",
          window_days: payoutWindowDays,
        }),
      });
      const data = (await res.json()) as PayoutCheckData & { ok?: boolean; error?: string };
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

  const loadRecoveryRegister = async () => {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) {
      setRecoveryLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          access_code: accessCode,
          platform: "recovery_cases",
          action: "list",
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        cases?: DashboardRecoveryCase[];
        error?: string;
      };
      if (!response.ok || !payload.ok)
        throw new Error(payload.error ?? "Could not load recovery cases.");
      const cases = payload.cases ?? [];
      setRecoveryCases(cases);
      setDisputes(
        cases.map((item) => ({
          partner: item.platform,
          title: item.title,
          order: item.exception_key,
          place: item.owner ?? "Merchant account",
          contract: item.contract_clause ?? "Contract evidence not yet attached",
          charged:
            item.exception_amount == null
              ? "Not quantified"
              : `${currency} ${Number(item.exception_amount).toFixed(2)}`,
          leak: `${currency} ${Number(item.claims_ready_amount).toFixed(2)}`,
          hash: item.submission_evidence_hash ?? item.id,
          en: item.explanation_en,
          ar: item.explanation_ar,
        })),
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load recovery cases.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  useEffect(() => {
    void loadRecoveryRegister();
  }, []);

  // First-run welcome check: the instant Talabat is connected and this
  // merchant has never had a payout check recorded, run one automatically
  // instead of waiting for someone to find the button. Fires at most once
  // per mount; a real result already exists in history for every later
  // visit, so the empty-history condition naturally never re-triggers it.
  useEffect(() => {
    if (tab !== "analytics") return;
    if (channelStatuses.talabat !== "connected") return;
    if (autoPayoutCheckAttempted.current) return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    autoPayoutCheckAttempted.current = true;
    fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: mid,
        access_code: ac,
        platform: "history",
        action: "payout_checks",
        limit: 1,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: unknown[] } | null) => {
        if (d?.items && d.items.length > 0) return; // already has at least one — not a first run
        setWelcomeAuditBanner(true);
        runPayoutCheck();
      })
      .catch(() => {});
  }, [tab, channelStatuses]);

  // Parses one uploaded file into a PayoutCheckData without touching any
  // component state — a pure fetch, so addFileItems can call it in a
  // sequential loop (not Promise.all, so per-item status is possible and
  // the server never gets a burst of concurrent uploads). `description`,
  // when non-empty, is interpreted server-side by upload-classifier.ts.
  const uploadOneFile = async (
    file: File,
    mid: string,
    ac: string,
    rate: number,
    platform: string,
    description: string,
  ): Promise<{ ok: true; result: PayoutCheckData } | { ok: false; error: string }> => {
    try {
      const original=new FormData();
      original.set("merchant_id",mid);original.set("access_code",ac);original.set("source_provider",platform);original.set("file",file);
      const retained=await fetch("/api/evidence/intake",{method:"POST",body:original});
      const retainedResult=await retained.json() as {ok?:boolean;error?:string};
      if(!retained.ok||!retainedResult.ok)return {ok:false,error:retainedResult.error??"Could not retain the original evidence file."};
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
      const isXlsx =
        lowerName.endsWith(".xlsx") ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const body: Record<string, unknown> = {
        merchant_id: mid,
        access_code: ac,
        platform: "talabat_expected_payout",
        action: "upload",
        commission_rate_pct: rate,
        upload_platform: platform,
      };
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
      const data = (await res.json()) as PayoutCheckData & { ok?: boolean; error?: string };
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
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) {
      showToast("Please connect your store first.");
      return;
    }
    const rate = Number(payoutUploadRate);
    if (!(rate > 0 && rate < 100)) {
      setPayoutError("Enter a valid commission rate (e.g. 19) before adding a file.");
      return;
    }
    setPayoutError(null);

    for (const file of Array.from(files)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setStagedItems((prev) => [
        ...prev,
        { id, kind: "file", label: file.name, description, platform, status: "uploading" },
      ]);
      const outcome = await uploadOneFile(file, mid, ac, rate, platform, description);
      setStagedItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          if (!outcome.ok) return { ...it, status: "error", error: outcome.error };
          const documentType = classifyResult(outcome.result);
          return {
            ...it,
            status: "done",
            classification: outcome.result.classification,
            classifiedDoc: {
              id,
              file_name: file.name,
              document_type: documentType,
              result: outcome.result,
              description: description || undefined,
              platform_guess: outcome.result.classification?.ok
                ? outcome.result.classification.classification.platform
                : null,
            },
          };
        }),
      );
    }
  };

  // Adds a manual "what I actually received" entry — never a parsed file
  // (see commission-audit.ts header comment for why). document_type is
  // always "merchant_received" here, set directly — never LLM-driven.
  const addManualItem = async (
    description: string,
    amount: string,
    periodStart: string,
    periodEnd: string,
    platform: string,
    evidence: {
      settlementReference:string;
      depositType: string;
      currency: string;
    },
  ) => {
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) {
      showToast("Please connect your store first.");
      return;
    }
    if (!(Number(amount) > 0)) {
      setPayoutError("Enter a valid amount for the manual entry.");
      return;
    }
    if (!periodStart || !periodEnd) {
      setPayoutError("Enter a start and end date for the manual entry.");
      return;
    }
    setPayoutError(null);

    const id = `${Date.now()}-manual`;
    setStagedItems((prev) => [
      ...prev,
      {
        id,
        kind: "manual",
        label: `${t.payoutManualEntryLabel} — ${periodStart} to ${periodEnd}`,
        description,
        platform,
        status: "uploading",
      },
    ]);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid,
          access_code: ac,
          platform: "talabat_expected_payout",
          action: "manual_entry",
          description,
          amount,
          period_start: periodStart,
          period_end: periodEnd,
          upload_platform: platform,
          confirmation_date: periodEnd,
          settlement_reference:evidence.settlementReference,
          deposit_type: evidence.depositType,
          currency: evidence.currency,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        received_amount?: number;
        period_start?: string;
        period_end?: string;
        platform?: string | null;
        classification?: PayoutCheckClassification;
        confirmation_date?: string;
        settlement_reference?:string|null;
        deposit_type?: string;
        currency?: string;
        evidence_file_name?: string;
        evidence_sha256?: string;
        evidence_level?: "manual_assertion" | "document_supported";
      };
      if (!res.ok || !data.ok) {
        setStagedItems((prev) =>
          prev.map((it) =>
            it.id !== id
              ? it
              : { ...it, status: "error", error: data.error ?? "Could not save that entry." },
          ),
        );
        return;
      }
      setStagedItems((prev) =>
        prev.map((it) =>
          it.id !== id
            ? it
            : {
                ...it,
                status: "done",
                classification: data.classification,
                classifiedDoc: {
                  id,
                  file_name: it.label,
                  document_type: "merchant_received",
                  description: description || undefined,
                  platform_guess: data.platform ?? null,
                  result: {
                    received_amount: data.received_amount,
                    period_start: data.period_start,
                    period_end: data.period_end,
                    confirmation_date: data.confirmation_date,
                    settlement_reference:data.settlement_reference,
                    deposit_type: data.deposit_type,
                    currency: data.currency,
                    evidence_file_name: data.evidence_file_name,
                    evidence_sha256: data.evidence_sha256,
                    evidence_level: data.evidence_level,
                  },
                },
              },
        ),
      );
    } catch {
      setStagedItems((prev) =>
        prev.map((it) =>
          it.id !== id ? it : { ...it, status: "error", error: "Network error — try again." },
        ),
      );
    }
  };

  // Lets the merchant correct a misdetected type before running the audit —
  // the safety net for whenever the structural/LLM classification disagrees
  // with what the merchant actually meant.
  const correctStagedDocumentType = (id: string, newType: DocumentType) =>
    setStagedItems((prev) =>
      prev.map((it) =>
        it.id !== id || !it.classifiedDoc
          ? it
          : { ...it, classifiedDoc: { ...it.classifiedDoc, document_type: newType } },
      ),
    );

  // Explicit, disclosed override: the merchant asserts a daily log's Sales
  // is already net of commission, so the ledger should not deduct it again.
  // See commission-audit.ts's reconcile() for how this is applied and
  // surfaced — never silently, always with a visible disclosure.
  const toggleNetSalesOverride = (id: string, value: boolean) =>
    setStagedItems((prev) =>
      prev.map((it) =>
        it.id !== id || !it.classifiedDoc
          ? it
          : { ...it, classifiedDoc: { ...it.classifiedDoc, treat_sales_as_net: value } },
      ),
    );

  const removeStagedItem = (id: string) =>
    setStagedItems((prev) => prev.filter((it) => it.id !== id));

  // The only place reconcile() is now invoked — replaces the old
  // auto-run-on-upload behavior. Preserves the existing single-item fast
  // path (PayoutResultDetail only, unchanged) when exactly one non-
  // merchant_received item is staged.
  const runStagedAudit = () => {
    const classified = stagedItems
      .filter(
        (it): it is StagedItem & { classifiedDoc: ClassifiedDocument } =>
          it.status === "done" && !!it.classifiedDoc,
      )
      .map((it) => it.classifiedDoc);
    if (classified.length === 0) return;
    const platforms = new Set(classified.map(doc => (doc.platform_guess || doc.result.platform || payoutUploadPlatform).toLowerCase()));
    if (platforms.size > 1) {
      setPayoutError("Run separate payout checks for each platform so the correct agreement and fee rules are applied.");
      return;
    }
    const auditPlatform = [...platforms][0] ?? payoutUploadPlatform;
    const contract = approvedContracts.find(term => term.status === "approved" && term.platform === auditPlatform) ?? null;
    const rate = contract?.commission_rate_pct ?? (Number(payoutUploadRate) || 0);
    const normalized = classified.map(doc => ({
      ...doc,
      result: { ...doc.result, platform:auditPlatform, commission_rate_pct:rate },
    }));
    setPayoutDocuments(normalized);
    setAuditSaved(false);
    setSettlementRun(null);
    if (classified.length === 1 && classified[0].document_type !== "merchant_received") {
      setPayoutData(classified[0].result as PayoutCheckData);
    } else {
      setPayoutData(null);
    }
    setAuditResult(reconcile(normalized, rate, contract ? {
      source:"approved_contract", platform:auditPlatform, contractId:contract.id,
      contractName:contract.contract_name, reviewedBy:contract.reviewed_by,
      effectiveFrom:contract.effective_from, effectiveTo:contract.effective_to,
    } : { source:"merchant_entered", platform:auditPlatform }));
  };

  const handleSaveAudit = async () => {
    if (!auditResult || savingAudit || auditSaved) return;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) return;
    setSavingAudit(true);
    try {
      // Persist the full documents (with per-document result/evidence, not
      // just a stripped summary) plus the assurance opinion, four-way
      // reconciliation, cross-check windows and net-sales-override
      // disclosure — everything the freshly-run report shows — so reopening
      // this audit from History renders identically instead of a summarized
      // fallback. See payout-audit-history.ts.
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid,
          access_code: ac,
          platform: "history",
          action: "save_payout_audit",
          commission_rate_pct: Number(payoutUploadRate) || 0,
          documents: payoutDocuments,
          findings: auditResult.findings,
          ledger: auditResult.ledger,
          ledger_totals: auditResult.ledgerTotals,
          period_start: auditResult.coverage?.start ?? null,
          period_end: auditResult.coverage?.end ?? null,
          assurance: auditResult.assurance ?? null,
          four_way: auditResult.fourWay ?? null,
          cross_check_windows: auditResult.crossCheckWindows ?? null,
          net_sales_override_docs: auditResult.netSalesOverrideDocs ?? null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean;reconciliation?:{status:string;summary:{counts?:Record<string,number>;claims_ready_amount?:number;exceptions?:number}}|null };
      if (res.ok && data.ok) {setAuditSaved(true);setSettlementRun(data.reconciliation??null);}
      else showToast("Could not save that audit. Please try again.");
    } catch {
      showToast("Could not save that audit. Please try again.");
    } finally {
      setSavingAudit(false);
    }
  };

  const t = T[lang];
  const ui = DASHBOARD_UI[lang];
  const tr = (en: string, ar: string, fr: string) => (lang === "ar" ? ar : lang === "fr" ? fr : en);
  const selectCurrency = (next: DisplayCurrency) => {
    setCurrency(next);
    localStorage.setItem("ps_display_currency", next);
  };
  const dir = lang === "ar" ? "rtl" : "ltr";

  const tourSteps = buildTourSteps(t);
  const goToTourStep = (i: number) => {
    const step = tourSteps[i];
    if (step?.tab && step.tab !== tab) setTab(step.tab);
    setTourStep(i);
    localStorage.setItem(tourAccountKey("step"), String(i));
  };
  const closeTour = () => {
    setTourActive(false);
    localStorage.setItem(tourAccountKey("done"), "1");
    localStorage.setItem(tourAccountKey("step"), String(tourStep));
  };
  const finishTour = () => {
    setTourActive(false);
    localStorage.setItem(tourAccountKey("done"), "1");
    localStorage.removeItem(tourAccountKey("step"));
    setTourStep(0);
  };

  const historyQuery = historySearch.trim().toLowerCase();
  const filteredHistoryPayouts = historyPayoutChecks.filter(
    (row) =>
      (historyPlatform === "all" || row.platform === historyPlatform) &&
      (!historyQuery ||
        `${row.platform} ${row.brand ?? ""}`.toLowerCase().includes(historyQuery)) &&
      (!historyNeedsAttention ||
        !!row.unexplained_charge ||
        (row.effective_commission_pct != null &&
          row.effective_commission_pct > row.commission_rate_pct)),
  );
  const filteredHistoryRepricings = historyRepricings.filter(
    (row) =>
      (historyPlatform === "all" || row.target_channel === historyPlatform) &&
      (!historyQuery ||
        `${row.target_channel ?? ""} ${row.sku ?? ""} ${String(row.audit_snapshot?.item_name ?? "")}`
          .toLowerCase()
          .includes(historyQuery)) &&
      (!historyNeedsAttention || !["success", "confirmed"].includes(row.status)),
  );
  const filteredHistoryAudits = historyPayoutAudits.filter(
    (row) =>
      (!historyQuery ||
        row.documents.some((document) =>
          document.file_name.toLowerCase().includes(historyQuery),
        )) &&
      (!historyNeedsAttention || row.findings.some((finding) => finding.severity === "critical")),
  );
  const historyAttentionCount =
    historyRepricings.filter((row) => !["success", "confirmed"].includes(row.status)).length +
    historyPayoutAudits.filter((row) =>
      row.findings.some((finding) => finding.severity === "critical"),
    ).length +
    historyPayoutChecks.filter((row) => !!row.unexplained_charge).length;
  const historyConfirmedCount = historyRepricings.filter(
    (row) => row.status === "success" || row.status === "confirmed",
  ).length;
  const overviewChannels = ["zid", "salla", "talabat", "jahez", "keeta", "snoonu"].map(
    (platform) => ({
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      connected: channelStatuses[platform] === "connected",
      termsReady: approvedContracts.some(
        (term) => term.platform === platform && term.status === "approved",
      ),
    }),
  );
  const overviewRisks = fixTheseFirst.slice(0, 5).map((product) => ({
    name: product.name_en || product.name_ar || product.sku,
    channel: product.source_platform,
    gap: `${product.currency} ${fmtMoney(Math.max(0, product.recommended_price - product.current_price), product.currency)}`,
  }));
  const marginPolicyDirty =
    rules[0].floor !== persistedGlobalFloor ||
    rules[0].maxChangePct !== persistedMaxIncrease ||
    rules[0].approvalMode !== persistedApprovalMode ||
    rules[0].minimumContribution !== persistedMinimumContribution ||
    JSON.stringify(channelPolicyDrafts)!==JSON.stringify(persistedChannelPolicies);

  const navDefs: Array<{
    id: SidebarNavId;
    tab: Tab;
    label: string;
    icon: LucideIcon;
    tip: string;
    targetId?:string;
    badge?: number;
  }> = [
    {
      id: "overview",
      tab: "analytics",
      label: "Overview",
      icon: ChartNoAxesCombined,
      tip: "See true profit, payout risk, alerts, and channel performance in one place.",
    },
    {
      id: "catalog",
      tab: "catalog",
      label: "Catalog",
      icon: PackageSearch,
      tip: "Review products, costs, prices, and catalogue evidence.",
    },
    {
      id: "margin",
      tab: "analytics",
      label: "Margin Intelligence",
      icon: ChartNoAxesCombined,
      tip: "Review true profit and margin performance across channels.",
      targetId:"margin-intelligence-section",
    },
    {
      id: "alerts",
      tab: "today",
      label: "Alerts",
      icon: Bell,
      tip: "See the work and risks that need attention now.",
      badge: historyAttentionCount,
    },
    {
      id: "recovery",
      tab: "analytics",
      label: "Payout Recovery",
      icon: WalletCards,
      tip: "Check payouts, investigate discrepancies, and manage recovery evidence.",
      targetId:"ps-payout-assurance-card",
    },
    {
      id: "promotions",
      tab: "promotions",
      label: "Promotion Simulator",
      icon: BadgePercent,
      tip: "Test promotion economics before approving a campaign.",
    },
    {
      id: "defend",
      tab: "rules",
      label: "Defend Loop",
      icon: ShieldCheck,
      tip: "Set and review the guardrails that protect merchant margins.",
    },
    {
      id: "manager",
      tab: "manager",
      label: "AI Store Manager",
      icon: Bot,
      tip: "Delegate store work and review protected actions.",
    },
    {
      id: "copilot",
      tab: "rules",
      label: "CFO Copilot",
      icon: CircleDollarSign,
      tip: "Ask questions about profit, fees, payouts, and risk.",
    },
    {
      id: "integrations",
      tab: "vault",
      label: "Integrations",
      icon: PlugZap,
      tip: "Connect and inspect commerce and delivery channels.",
    },
    {id:"evidence",tab:"history",label:"Evidence & History",icon:HistoryIcon,tip:"Review payout checks, price actions, investigations, and retained evidence."},
    {
      id: "settings",
      tab: "settings",
      label: "Settings",
      icon: SettingsIcon,
      tip: "Manage business, policy, and connection settings.",
    },
  ];

  const headerSub =
    tab === "today"
      ? ui.todaySub
      : tab === "catalog"
        ? "Products, costs, availability, and synchronization from connected stores"
      : tab === "analytics"
        ? sidebarNav === "recovery"
          ? "Verify expected payouts, investigate discrepancies, and prepare merchant-approved recovery evidence."
          : sidebarNav === "margin"
            ? "True profit, fees, costs, and payout performance across every connected channel."
            : "Your financial command center for margin, payouts, risk, and next actions."
        : tab === "manager"
          ? lang === "ar"
            ? "العمل الذي يتولاه PrizeSkout والقرارات التي تحتاج موافقتك"
            : lang === "fr"
              ? "Travail pris en charge par PrizeSkout et décisions à valider"
              : "Work PrizeSkout is handling and decisions that need your approval"
          : tab === "promotions"
            ? ui.promoSub
            : tab === "rules"
              ? t.subR
              : tab === "settings"
                ? t.settingsSub
                : tab === "history"
                  ? t.subH
                  : t.subV;
  const headerTitle =
    tab === "today"
      ? ui.today
      : tab === "catalog"
        ? "Catalog"
      : tab === "analytics"
        ? sidebarNav === "recovery"
          ? "Payout Recovery"
          : sidebarNav === "margin"
            ? "True Margin Intelligence"
            : "Overview"
        : tab === "manager"
          ? lang === "ar"
            ? "المهام"
            : lang === "fr"
              ? "Tâches"
              : "Tasks"
          : tab === "promotions"
            ? lang === "ar"
              ? "محاكي العروض"
              : lang === "fr"
                ? "Simulateur de promotions"
                : "Promo Simulator"
            : tab === "rules"
              ? t.navR
              : tab === "settings"
                ? t.settingsLabel
                : tab === "history"
                  ? t.navH
                  : t.navV;

  const md = modal != null ? disputes[modal] : null;

  const assistantContext = Object.fromEntries(
    Object.entries(ui.assistant).map(([key, values]) => [
      key,
      { nudge: values[0], prompt: values[1], examples: values.slice(1) },
    ]),
  ) as Record<Tab, { nudge: string; prompt: string; examples: string[] }>;
  const activeAssistantContext = assistantContext[tab] ?? assistantContext.analytics;
  const openAssistantDrawer = (prompt = "") => {
    setAssistantDrawerInput(prompt);
    setAssistantDrawerOpen(true);
  };
  const openSidebarDestination = (item: (typeof navDefs)[number]) => {
    setSidebarNav(item.id);
    setTab(item.tab);
    if (item.id === "copilot") openAssistantDrawer();
    if(item.targetId)window.setTimeout(()=>document.getElementById(item.targetId!)?.scrollIntoView({behavior:"smooth",block:"start"}),50);
  };
  const handleSignOut=async()=>{
    setSidebarOpen(false);
    await supabase.auth.signOut();
    localStorage.removeItem("ps_access_code");
    localStorage.removeItem("ps_merchant_id");
    window.location.assign("/login");
  };
  const submitAssistantDrawer = () => {
    const prompt = assistantDrawerInput.trim();
    if (!prompt || cpPhase === "loading") return;
    setCpInput(prompt);
    void runCopilot(prompt);
  };
  const submitManagerCommand = (prompt: string, requestedRole: "cfo" | "manager" = "cfo") => {
    if (!prompt.trim() || cpPhase === "loading") return;
    setAssistantDrawerInput(prompt.trim());
    setCpInput(prompt.trim());
    if (requestedRole === "manager") {
      setAssistantDrawerOpen(false);
      setTab("manager");
      showToast("Shop Manager is preparing and assigning the work.");
    } else {
      setAssistantDrawerOpen(true);
    }
    void runCopilot(prompt.trim(), requestedRole);
  };
  const runPrizeSkoutAssistant = async (prompt: string): Promise<boolean> => {
    if (!prompt.trim() || cpPhase === "loading") return false;
    setAssistantDrawerOpen(false);
    setCpInput(prompt.trim());
    const managementIntent =
      /\b(?:prepare|delegate|assign|handle|manage|organize|organise|follow up|highest priority|store tasks?|workflow)\b/i.test(
        prompt,
      );
    setTab(managementIntent ? "manager" : "rules");
    if (managementIntent) showToast("PrizeSkout is preparing and assigning the work.");
    const result = runCopilot(prompt.trim(), managementIntent ? "manager" : "auto");
    window.setTimeout(
      () =>
        document
          .querySelector('[data-tour="copilot"]')
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
    return await result;
  };
  const runPreparedManagerTask = (prompt: string) => runPrizeSkoutAssistant(prompt);
  const startOauthConnection = async (path: string) => {
    const merchantId = localStorage.getItem("ps_merchant_id") ?? "";
    const accessCode = localStorage.getItem("ps_access_code") ?? "";
    if (!merchantId || !accessCode) {
      showToast("Please complete onboarding first.");
      return;
    }
    const sallaWindow = path === "/api/auth/salla" ? window.open("about:blank", "_blank") : null;
    if (path === "/api/auth/salla" && !sallaWindow) {
      showToast("Please allow pop-ups so Salla can open in a separate tab.");
      return;
    }
    if (sallaWindow) sallaWindow.opener = null;
    try {
      const response = await fetch("/api/onboarding/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, access_code: accessCode }),
      });
      const session = (await response.json()) as { token?: string };
      if (!response.ok || !session.token) throw new Error();
      const separator = path.includes("?") ? "&" : "?";
      const destination = `${path}${separator}merchant_id=${encodeURIComponent(merchantId)}&onboarding_token=${encodeURIComponent(session.token)}`;
      if (sallaWindow) sallaWindow.location.href = destination;
      else window.location.href = destination;
    } catch {
      sallaWindow?.close();
      showToast("PrizeSkout could not verify this connection request.");
    }
  };
  const assistantNudge = (targetTab: Tab) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        border: "1px solid color-mix(in srgb,var(--border) 82%,transparent)",
        borderRadius: 12,
        padding: "11px 14px",
        background: "var(--surface2)",
      }}
    >
      <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
        {assistantContext[targetTab].nudge}{" "}
        <strong style={{ color: "var(--text)" }}>{ui.useAssistants}</strong>
      </span>
      <button
        type="button"
        onClick={() => openAssistantDrawer(assistantContext[targetTab].prompt)}
        style={{
          border: 0,
          background: "transparent",
          color: OG,
          fontFamily: "inherit",
          fontWeight: 800,
          cursor: "pointer",
          padding: 4,
        }}
      >
        {ui.delegateAsk}
      </button>
    </div>
  );

  return (
    <div
      className="ps-db"
      data-theme={theme}
      dir={dir}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        alignItems: "stretch",
        overflowX: "hidden",
      }}
    >
      <style>{CSS}</style>
      <DemoModeOverlay active={demoMode} />

      {/* SIDEBAR */}
      {isDesktop && (
        <aside
          className="ps-dashboard-sidebar"
          style={{
            width: 264,
            flex: "0 0 264px",
            borderInlineEnd: "1px solid var(--border)",
            background: "var(--surface2)",
            display: "flex",
            flexDirection: "column",
            padding: "28px 20px",
            boxSizing: "border-box",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{ fontSize: 28.5, fontWeight: 800, letterSpacing: "-0.6px", paddingInline: 6 }}
          >
            Prize<span style={{ color: OG }}>skout</span>
          </div>
          <nav
            aria-label="PrizeSkout workspaces"
            style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 30 }}
          >
            {navDefs.map((item) => {
              const active = sidebarNav === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => openSidebarDestination(item)}
                  data-demo-tip={item.tip}
                  style={{
                    cursor: "pointer",
                    width: "100%",
                    minHeight: 39,
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: 0,
                    background: active
                      ? `color-mix(in srgb,${OG} 9%,var(--surface))`
                      : "transparent",
                    color: active ? "var(--text)" : "var(--muted)",
                    fontFamily: "inherit",
                    textAlign: "start",
                    transition: "background .15s,color .15s",
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} color={active ? OG : "currentColor"} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 750 : 600 }}>
                    {item.label}
                  </span>
                  {!!item.badge && (
                    <span
                      aria-label={`${item.badge} items need attention`}
                      style={{
                        minWidth: 20,
                        height: 20,
                        paddingInline: 5,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: OG,
                        color: "#fff",
                        fontSize: 10.5,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="ps-dashboard-sidebar-footer" style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              style={{
                border: 0,
                background: "transparent",
                color: "var(--muted)",
                borderRadius: 9,
                padding: "9px 10px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <MessageSquareText size={15} strokeWidth={1.8} />
              Give Feedback
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 11, paddingInline: 4 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: MONO,
                }}
              >
                {(storeName || "M").charAt(0).toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 15.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {storeName || t.myAccount}
              </span>
            </div>
            <button type="button" onClick={()=>void handleSignOut()} style={{border:0,background:"transparent",color:"var(--muted)",borderRadius:9,padding:"9px 10px",display:"flex",alignItems:"center",gap:10,fontFamily:"inherit",fontSize:12.5,fontWeight:650,cursor:"pointer",textAlign:"start"}}>
              <LogOut size={15} strokeWidth={1.8}/>Log out
            </button>
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        {!isDesktop && (
          <div
            style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation"
                  style={{
                    cursor: "pointer",
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      borderRadius: 1,
                      background: "var(--text)",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      borderRadius: 1,
                      background: "var(--text)",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      width: 12,
                      height: 2,
                      borderRadius: 1,
                      background: "var(--text)",
                      display: "block",
                      marginInlineEnd: 6,
                    }}
                  />
                </button>
                <div style={{ fontSize: 23.5, fontWeight: 800, letterSpacing: "-0.5px" }}>
                  Prize<span style={{ color: OG }}>skout</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 13.5,
                    color: GN,
                    fontWeight: 700,
                    fontFamily: MONO,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: GN,
                      animation: "pk-pulse 2s infinite",
                    }}
                  />
                  LIVE
                </span>
                <button
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  style={{
                    cursor: "pointer",
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    fontSize: 17.5,
                  }}
                >
                  {theme === "dark" ? "☾" : "☀"}
                </button>
                <button
                  onClick={() => setDemoMode((v) => !v)}
                  aria-label="Toggle demo mode"
                  title={
                    demoMode
                      ? "Demo mode on — click anything to see what it does. Click to turn off."
                      : "Turn on demo mode — click anything to see what it does"
                  }
                  style={{
                    cursor: "pointer",
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    border: demoMode ? `1px solid ${OG}` : "1px solid var(--border)",
                    background: demoMode
                      ? `color-mix(in srgb,${OG} 14%,var(--surface))`
                      : "var(--surface)",
                    color: demoMode ? OG : "var(--text)",
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    fontSize: 17,
                  }}
                >
                  💬
                </button>
              </div>
            </div>
            {/* Short-label pill nav */}
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
                WebkitOverflowScrolling: "touch" as never,
              }}
            >
              {navDefs.map((n) => {
                const on = sidebarNav === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => openSidebarDestination(n)}
                    style={{
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      padding: "10px 14px",
                      borderRadius: 999,
                      border: `1px solid ${on ? `color-mix(in srgb,${OG} 40%,transparent)` : "var(--border)"}`,
                      background: on ? `color-mix(in srgb,${OG} 8%,var(--surface))` : "transparent",
                      color: on ? "var(--text)" : "var(--muted)",
                      fontSize: 14.5,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global header */}
        <header
          className="ps-db-header"
          style={{
            padding: "26px 30px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1
                className="ps-db-h1"
                style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}
              >
                {headerTitle}
              </h1>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: ".8px",
                  color: GN,
                  background: `color-mix(in srgb,${GN} 12%,var(--surface))`,
                  border: `1px solid color-mix(in srgb,${GN} 28%,transparent)`,
                  borderRadius: 7,
                  padding: "3px 9px",
                  fontFamily: MONO,
                }}
              >
                {t.live}
              </span>
            </div>
            <div style={{ fontSize: 15.5, color: "var(--muted)" }}>{headerSub}</div>
          </div>
          {/* Desktop-only controls — hidden on mobile via .ps-db-controls CSS class */}
          <div
            className="ps-db-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              style={{
                cursor: "pointer",
                width: 56,
                height: 44,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                position: "relative",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 11,
                  insetInlineStart: theme === "dark" ? 29 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: theme === "dark" ? "#232B38" : "#fff",
                  border: "1px solid var(--border)",
                  transition: "inset-inline-start .25s,background .25s",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12.5,
                }}
              >
                {theme === "dark" ? "☾" : "☀"}
              </span>
            </button>
            {/* Demo mode — click-to-explain callouts for screen recordings, off by default */}
            <button
              onClick={() => setDemoMode((v) => !v)}
              aria-label="Toggle demo mode"
              title={
                demoMode
                  ? "Demo mode on — click anything to see what it does. Click to turn off."
                  : "Turn on demo mode — click anything to see what it does"
              }
              style={{
                cursor: "pointer",
                width: 44,
                height: 44,
                borderRadius: 10,
                border: demoMode ? `1px solid ${OG}` : "1px solid var(--border)",
                background: demoMode
                  ? `color-mix(in srgb,${OG} 14%,var(--surface))`
                  : "var(--surface)",
                display: "grid",
                placeItems: "center",
                padding: 0,
                fontSize: 17,
              }}
            >
              💬
            </button>
            {/* Currency */}
            <div
              data-demo-tip="Display currency — converts dashboard totals and summaries. Live channel prices remain in their original currency for safe editing."
              style={{
                display: "flex",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              {DISPLAY_CURRENCIES.map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={currency === code}
                  onClick={() => selectCurrency(code)}
                  style={{
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 13px",
                    fontSize: 14.5,
                    fontWeight: 700,
                    fontFamily: MONO,
                    background: currency === code ? OG : "transparent",
                    color: currency === code ? "#fff" : "var(--muted)",
                  }}
                >
                  {code}
                </button>
              ))}
            </div>
            {/* Lang */}
            <div
              data-demo-tip="Full trilingual support (English, Arabic, French) — including right-to-left layout for Arabic, not just translated labels."
              style={{
                display: "flex",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              {(
                [
                  ["en", "EN"],
                  ["ar", "عربية"],
                  ["fr", "FR"],
                ] as [Lang, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setLang(id)}
                  style={{
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 13px",
                    fontSize: 14.5,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    background: lang === id ? "var(--text)" : "transparent",
                    color: lang === id ? "var(--bg)" : "var(--muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Support + tour replay — kept outside .ps-db-controls so they stay visible on mobile too */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                const savedStep = Number(localStorage.getItem(tourAccountKey("step")));
                setTourStep(
                  Number.isInteger(savedStep) && savedStep >= 0 && savedStep < tourSteps.length
                    ? savedStep
                    : 0,
                );
                setTourActive(true);
              }}
              title={t.tourReplayLabel}
              aria-label={t.tourReplayLabel}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                cursor: "pointer",
                flexShrink: 0,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--muted)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </button>
            <button
              type="button"
              data-tour="support"
              onClick={() => setSupportOpen(true)}
              title="Contact support"
              aria-label="Contact support"
              style={{
                display: "none",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
                height: 40,
                padding: "0 14px",
                borderRadius: 10,
                cursor: "pointer",
                flexShrink: 0,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--muted)",
                fontSize: 14.5,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
                <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
                <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
                <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
              </svg>
              {t.supportLabel}
            </button>
          </div>
        </header>
        {sidebarNav === "manager" && <StoreManagerCommandBar
          context={headerTitle}
          examples={activeAssistantContext.examples}
          lang={lang}
          busy={cpPhase === "loading"}
          onSubmit={runPrizeSkoutAssistant}
          onOpenAssistant={() => {
            setTab("rules");
            window.setTimeout(
              () =>
                document
                  .querySelector('[data-tour="copilot"]')
                  ?.scrollIntoView({ behavior: "smooth", block: "center" }),
              50,
            );
          }}
        />}
        {(["manager", "promotions", "rules"] as Tab[]).includes(tab) && (
          <nav
            aria-label="Automation workspaces"
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 30px 0",
              overflowX: "auto",
            }}
          >
            {[
              ["manager", lang === "ar" ? "المهام" : lang === "fr" ? "Tâches" : "Tasks"],
              [
                "promotions",
                lang === "ar"
                  ? "محاكي العروض"
                  : lang === "fr"
                    ? "Simulateur de promotions"
                    : "Promo Simulator",
              ],
              [
                "rules",
                lang === "ar"
                  ? "قواعد الحماية"
                  : lang === "fr"
                    ? "Règles de protection"
                    : "Protection Rules",
              ],
            ].map(([destination, label]) => {
              const active = tab === destination;
              return (
                <button
                  key={destination}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setTab(destination as Tab)}
                  style={{
                    border: `1px solid ${active ? OG : "var(--border)"}`,
                    borderRadius: 999,
                    padding: "9px 14px",
                    background: active ? OG : "var(--surface)",
                    color: active ? "white" : "var(--text)",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        )}
        <ContactSupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
        {selectedProduct && (
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedProduct(null);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background: "rgba(15,23,42,.48)",
              backdropFilter: "blur(3px)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label={`Product details for ${selectedProduct.name_en || selectedProduct.sku}`}
              style={{
                width: "min(560px,100%)",
                height: "100%",
                overflowY: "auto",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "-18px 0 60px rgba(15,23,42,.22)",
                padding: "26px",
                animation: "pk-in .2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      color: OG,
                      fontSize: 11.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    {selectedProduct.source_platform} product
                  </div>
                  <h2 style={{ margin: "8px 0 4px", fontSize: 27, lineHeight: 1.2 }}>
                    {lang === "ar" && selectedProduct.name_ar
                      ? selectedProduct.name_ar
                      : selectedProduct.name_en || selectedProduct.sku}
                  </h2>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--muted)" }}>
                    SKU {selectedProduct.sku}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close product details"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: 21,
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  marginTop: 24,
                  padding: "16px",
                  borderRadius: 12,
                  border: `1px solid ${selectedProduct.floor_breached ? "color-mix(in srgb,#DC2626 35%,var(--border))" : "var(--border)"}`,
                  background: selectedProduct.floor_breached
                    ? "color-mix(in srgb,#DC2626 5%,var(--surface))"
                    : "var(--surface2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      color:
                        selectedProduct.cost_confidence !== "verified"
                          ? "#B45309"
                          : selectedProduct.floor_breached
                            ? "#DC2626"
                            : GN,
                      fontWeight: 800,
                    }}
                  >
                    {selectedProduct.cost_confidence !== "verified"
                      ? "Cost needed before margin can be checked"
                      : selectedProduct.floor_breached
                        ? "Price review needed"
                        : "No pricing action needed"}
                  </span>
                  <span
                    style={{ color: "var(--muted)", fontSize: 12, textTransform: "capitalize" }}
                  >
                    {selectedProduct.cost_confidence !== "verified"
                      ? "Action needed"
                      : selectedProduct.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                {(selectedProduct.cost_confidence !== "verified"
                  ? [
                      [
                        "Current price",
                        `${selectedProduct.current_price.toLocaleString()} ${selectedProduct.currency}`,
                      ],
                      ["Cost status", "Not verified"],
                      [
                        "Inventory",
                        selectedProduct.inventory_is_infinite
                          ? "Always available"
                          : selectedProduct.inventory_quantity == null
                            ? "Quantity unavailable"
                            : `${selectedProduct.inventory_quantity.toLocaleString()} in stock`,
                      ],
                    ]
                  : [
                      [
                        "Current price",
                        `${selectedProduct.current_price.toLocaleString()} ${selectedProduct.currency}`,
                      ],
                      [
                        "Current contribution margin",
                        selectedProduct.preview
                          ? `${(selectedProduct.preview.current_margin_pct * 100).toFixed(1)}%`
                          : selectedProduct.net_margin_pct == null
                            ? "—"
                            : `${(selectedProduct.net_margin_pct * 100).toFixed(1)}%`,
                      ],
                      [
                        `Price required for ${((selectedProduct.preview?.margin_floor_pct ?? selectedProduct.margin_floor_pct ?? 0.18) * 100).toFixed(0)}% target`,
                        selectedProduct.preview?.required_price == null
                          ? "Unavailable"
                          : `${selectedProduct.currency} ${fmtMoney(selectedProduct.preview.required_price, selectedProduct.currency)}`,
                      ],
                      [
                        "Required increase",
                        selectedProduct.preview?.required_price == null
                          ? "—"
                          : `${(selectedProduct.preview.required_increase_pct * 100).toFixed(1)}%`,
                      ],
                      [
                        "Highest price allowed now",
                        selectedProduct.preview?.allowed_price == null
                          ? "Unavailable"
                          : `${selectedProduct.currency} ${fmtMoney(selectedProduct.preview.allowed_price, selectedProduct.currency)}`,
                      ],
                      [
                        "Margin at allowed price",
                        selectedProduct.preview?.projected_margin_at_allowed == null
                          ? "—"
                          : `${(selectedProduct.preview.projected_margin_at_allowed * 100).toFixed(1)}%`,
                      ],
                    ]
                ).map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 11,
                      padding: "14px",
                      background: "var(--surface2)",
                    }}
                  >
                    <div
                      style={{ fontSize: 10.5, textTransform: "uppercase", color: "var(--muted)" }}
                    >
                      {label}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 19, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>

              {["over_limit","cannot_reach_target_within_limit"].includes(selectedProduct.preview?.outcome??"") && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    border: "1px solid color-mix(in srgb,#B45309 35%,var(--border))",
                    borderRadius: 10,
                    background: "color-mix(in srgb,#B45309 7%,var(--surface))",
                    color: "#92400E",
                    fontSize: 12.5,
                    lineHeight: 1.6,
                  }}
                >
                  <strong>The target price is not approved for publishing.</strong> Reaching the
                  margin target would require a{" "}
                  {((selectedProduct.preview?.required_increase_pct??0) * 100).toFixed(1)}% increase,
                  while active policy v{selectedProduct.preview?.policy_version} allows{" "}
                  {((selectedProduct.preview?.maximum_increase_pct??0) * 100).toFixed(1)}%. PrizeSkout has
                  stopped this recommendation instead of presenting a partial correction as protected.{" "}
                  <strong>Market acceptance has not been established.</strong> This target is based
                  on costs and charges, so review demand and comparable prices before approving a
                  large increase.
                </div>
              )}

              {selectedProduct.cost_confidence !== "verified" && (
                <div
                  style={{
                    marginTop: 22,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 20,
                  }}
                >
                  <h3 style={{ margin: "0 0 5px", fontSize: 17 }}>Add the product cost</h3>
                  <p
                    style={{
                      margin: "0 0 14px",
                      color: "var(--muted)",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                    }}
                  >
                    PrizeSkout needs a verified cost before it can calculate margin or recommend a
                    safe price. Adding the cost will prepare a reviewable change. Nothing is sent to{" "}
                    {selectedProduct.source_platform} without your confirmation.
                  </p>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Product cost ({selectedProduct.currency})
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={productCostDraft}
                    onChange={(event) => setProductCostDraft(event.target.value)}
                    placeholder="Enter the cost"
                    style={{
                      width: "100%",
                      marginTop: 7,
                      boxSizing: "border-box",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 13px",
                      background: "var(--surface2)",
                      color: "var(--text)",
                      fontFamily: MONO,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  />
                  <button
                    type="button"
                    disabled={
                      !Number.isFinite(Number(productCostDraft)) || Number(productCostDraft) <= 0
                    }
                    onClick={() => {
                      const cost = Number(productCostDraft);
                      if (!Number.isFinite(cost) || cost <= 0) return;
                      const prompt = `Change the cost of product SKU ${selectedProduct.sku} to ${selectedProduct.currency} ${cost}`;
                      setSelectedProduct(null);
                      setTab("rules");
                      void runCopilot(prompt);
                    }}
                    style={{
                      width: "100%",
                      marginTop: 14,
                      border: 0,
                      borderRadius: 9,
                      padding: "12px 16px",
                      background: Number(productCostDraft) > 0 ? OG : "var(--muted)",
                      color: "white",
                      fontFamily: "inherit",
                      fontWeight: 800,
                      cursor: Number(productCostDraft) > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    Review cost change
                  </button>
                </div>
              )}

              <div
                style={{
                  display: selectedProduct.cost_confidence === "verified" ? "block" : "none",
                  marginTop: 22,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 20,
                }}
              >
                <h3 style={{ margin: "0 0 5px", fontSize: 17 }}>Review price update</h3>
                <p
                  style={{
                    margin: "0 0 14px",
                    color: "var(--muted)",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}
                >
                  {["over_limit","cannot_reach_target_within_limit"].includes(selectedProduct.preview?.outcome??"")
                    ? `This product cannot reach the full target within the active increase limit. Change and preview the policy or leave the price unchanged.`
                    : `The price that reaches your active margin target is prefilled. Review it before sending it to ${selectedProduct.source_platform}.`}
                </p>
                <label
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  New price ({selectedProduct.currency})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={productPriceDraft}
                  onChange={(event) => {
                    setProductPriceDraft(event.target.value);
                    setProductPushStatus("idle");
                    setProductPushError(null);
                  }}
                  style={{
                    width: "100%",
                    marginTop: 7,
                    boxSizing: "border-box",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 13px",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                />
                {productPushStatus === "confirm" && (
                  <div
                    style={{
                      marginTop: 12,
                      color: "#B45309",
                      background: "color-mix(in srgb,#F59E0B 10%,var(--surface))",
                      border: "1px solid color-mix(in srgb,#F59E0B 30%,var(--border))",
                      borderRadius: 9,
                      padding: "10px 12px",
                      fontSize: 12.5,
                    }}
                  >
                    Confirm this live price change. Clicking the button again will update the
                    product in {selectedProduct.source_platform}.
                  </div>
                )}
                {productPushStatus === "failed" && (
                  <div style={{ marginTop: 12, color: "#DC2626", fontSize: 12.5 }}>
                    {productPushError ??
                      "The update was not applied. Review the price and try again."}
                  </div>
                )}
                {productPushStatus === "pushing" && (
                  <div
                    aria-live="polite"
                    style={{
                      marginTop: 12,
                      padding: "11px 13px",
                      border: "1px solid color-mix(in srgb,var(--accent) 28%,var(--border))",
                      borderRadius: 9,
                      background: "color-mix(in srgb,var(--accent) 6%,var(--surface))",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>
                      {productPushStage === "sending"
                        ? `Sending the price to ${selectedProduct.source_platform}`
                        : `Verifying the live price in ${selectedProduct.source_platform}`}
                    </strong>
                    <div style={{ color: "var(--muted)", marginTop: 2 }}>
                      {productPushStage === "sending"
                        ? "The approved update is being submitted now."
                        : "The channel accepted the request. PrizeSkout is reading the product back before calling it complete."}
                    </div>
                  </div>
                )}
                {productPushStatus === "success" && (
                  <div
                    style={{
                      marginTop: 12,
                      color: GN,
                      background: `color-mix(in srgb,${GN} 9%,var(--surface))`,
                      border: `1px solid color-mix(in srgb,${GN} 30%,var(--border))`,
                      borderRadius: 9,
                      padding: "12px 14px",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                    }}
                  >
                    <strong>Price update accepted by {selectedProduct.source_platform}.</strong>
                    <br />
                    The catalogue now shows {selectedProduct.currency}{" "}
                    {fmtMoney(selectedProduct.current_price, selectedProduct.currency)}. You can
                    safely restore the original price below.
                  </div>
                )}
                <div
                  style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      borderRadius: 9,
                      padding: "11px 15px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                    }}
                  >
                    Cancel
                  </button>
                  {productPushStatus === "success" && productOriginalPrice != null ? (
                    <button
                      type="button"
                      onClick={revertSelectedProductPrice}
                      style={{
                        border: "none",
                        background: "#B45309",
                        color: "#fff",
                        borderRadius: 9,
                        padding: "11px 16px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 800,
                      }}
                    >
                      {`Restore original ${selectedProduct.currency} ${fmtMoney(productOriginalPrice, selectedProduct.currency)}`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        productPushStatus === "pushing" || productPushStatus === "reverting" || selectedProduct.preview?.approval_mode === "recommend_only" || ["over_limit","cannot_reach_target_within_limit","blocked_stale_evidence"].includes(selectedProduct.preview?.outcome??"")
                      }
                      onClick={pushSelectedProductPrice}
                      style={{
                        border: "none",
                        background: productPushStatus === "confirm" ? "#B45309" : OG,
                        color: "#fff",
                        borderRadius: 9,
                        padding: "11px 16px",
                        cursor: productPushStatus === "pushing" ? "wait" : selectedProduct.preview?.approval_mode === "recommend_only" || ["over_limit","cannot_reach_target_within_limit","blocked_stale_evidence"].includes(selectedProduct.preview?.outcome??"") ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        fontWeight: 800,
                      }}
                    >
                      {selectedProduct.preview?.approval_mode === "recommend_only" ? "Suggestion only — update in platform" : selectedProduct.preview?.outcome === "blocked_stale_evidence" ? "Refresh evidence before publishing" : ["over_limit","cannot_reach_target_within_limit"].includes(selectedProduct.preview?.outcome??"") ? "Blocked by active increase limit" : productPushStatus === "pushing"
                        ? productPushStage === "sending"
                          ? "Sending"
                          : "Verifying"
                        : productPushStatus === "confirm"
                          ? `Confirm update in ${selectedProduct.source_platform}`
                          : "Review price update"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===== TAB: CATALOG ===== */}
        {tab === "catalog" && (
          <section
            className="ps-db-section"
            style={{ padding: "28px 30px 48px", display: "flex", flexDirection: "column", gap: 20, animation: "pk-in .3s ease" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
              {[
                { label: "Catalog items", value: importedProducts.length, note: "Products received", action: () => openCatalogFilter("all") },
                { label: "Costs confirmed", value: storeOpportunity.verified, note: "Safe for calculation", action: () => openCatalogFilter("verified") },
                { label: "Costs missing", value: storeOpportunity.estimated + storeOpportunity.unknown, note: "Merchant input required", action: () => openCatalogFilter("missing_cost") },
                { label: "Out of stock", value: importedProducts.filter(product => product.inventory_status === "out_of_stock").length, note: "Unavailable products", action: () => openCatalogFilter("out_of_stock") },
                { label: "Connected sources", value: SYNC_CAPABLE_PLATFORMS.filter(platform => channelStatuses[platform] === "connected").length, note: "Stores feeding this catalog", action: () => setTab("vault") },
              ].map(({ label, value, note, action }) => (
                <button type="button" key={label} onClick={action} aria-label={`${label}: ${value}. ${note}`} style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", textAlign: "left", fontFamily: "inherit", cursor: "pointer", transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease" }} onMouseEnter={event => { event.currentTarget.style.transform = "translateY(-2px)"; event.currentTarget.style.borderColor = OG; event.currentTarget.style.boxShadow = "var(--shadow)"; }} onMouseLeave={event => { event.currentTarget.style.transform = "none"; event.currentTarget.style.borderColor = "var(--border)"; event.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>{note}</div>
                </button>
              ))}
            </div>

            <div id="imported-products" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow)", overflow: "hidden" }}>
              <div style={{ padding: "20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Product catalog</h2>
                  <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>Products, prices, costs, stock and source channels.</div>
                </div>
                <button type="button" onClick={syncAllCatalogs} disabled={syncingCatalog} style={{ border: "none", borderRadius: 9, background: OG, color: "#fff", padding: "10px 15px", fontFamily: "inherit", fontWeight: 800, cursor: syncingCatalog ? "wait" : "pointer", opacity: syncingCatalog ? .7 : 1 }}>
                  {syncingCatalog ? "Syncing…" : "Sync catalog"}
                </button>
              </div>

              <div style={{ padding: "13px 16px", display: "flex", gap: 10, flexWrap: "wrap", background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <input value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Search product, SKU, or channel…" aria-label="Search catalog" style={{ flex: "1 1 260px", minWidth: 0, border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)", color: "var(--text)", padding: "10px 12px", fontFamily: "inherit" }} />
                <select value={productFilter} onChange={event => setProductFilter(event.target.value as typeof productFilter)} aria-label="Filter catalog" style={{ border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)", color: "var(--text)", padding: "10px 12px", fontFamily: "inherit" }}>
                  <option value="all">All products</option>
                  <option value="verified">Costs confirmed</option>
                  <option value="missing_cost">Cost missing</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="risk">Needs attention</option>
                  <option value="healthy">Ready</option>
                  <option value="repriced">Price changed</option>
                </select>
                <select value={productSort} onChange={event => setProductSort(event.target.value as typeof productSort)} aria-label="Sort catalog" style={{ border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)", color: "var(--text)", padding: "10px 12px", fontFamily: "inherit" }}>
                  <option value="risk">Priority first</option>
                  <option value="name">Name A–Z</option>
                  <option value="price">Highest price</option>
                </select>
              </div>

              {catalogLoading ? (
                <div style={{ padding: 28, color: "var(--muted)" }}>Loading catalog…</div>
              ) : importedProducts.length === 0 ? (
                <div style={{ padding: 34, textAlign: "center" }}>
                  <strong>{SYNC_CAPABLE_PLATFORMS.some(platform => channelStatuses[platform] === "connected") ? "Your store is connected, but no products have been loaded yet." : "Connect a store to import its products."}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 7 }}>PrizeSkout will never display invented catalog figures.</div>
                  <button type="button" onClick={() => SYNC_CAPABLE_PLATFORMS.some(platform => channelStatuses[platform] === "connected") ? void syncAllCatalogs() : setTab("vault")} style={{ marginTop: 16, border: "none", borderRadius: 9, background: OG, color: "#fff", padding: "10px 15px", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>
                    {SYNC_CAPABLE_PLATFORMS.some(platform => channelStatuses[platform] === "connected") ? "Load products" : "Open integrations"}
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: 28, color: "var(--muted)" }}>No products match this search or filter.</div>
              ) : (
                <>
                  <div className="table-scroll">
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                      <thead><tr style={{ background: "var(--surface2)", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>
                        {['Product','Channel','Selling price','Product cost','Availability','Data status'].map(label => <th key={label} style={{ padding: "11px 14px", textAlign: "left" }}>{label}</th>)}
                      </tr></thead>
                      <tbody>
                        {visibleProducts.map(product => (
                          <tr key={product.ingest_event_id} onClick={() => openProduct(product)} style={{ borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 13 }}>
                            <td style={{ padding: "13px 14px" }}><strong>{product.name_en || product.name_ar || product.sku}</strong><div style={{ color: "var(--muted)", fontFamily: MONO, fontSize: 11, marginTop: 3 }}>{product.sku}</div></td>
                            <td style={{ padding: "13px 14px", textTransform: "capitalize" }}>{product.source_platform}</td>
                            <td style={{ padding: "13px 14px" }}>{product.currency} {fmtMoney(product.current_price, product.currency)}</td>
                            <td style={{ padding: "13px 14px", color: product.cost_confidence === "verified" ? "var(--text)" : "#B45309" }}>{product.cost_confidence === "verified" && product.base_cost != null ? `${product.currency} ${fmtMoney(product.base_cost, product.currency)}` : "Cost required"}</td>
                            <td style={{ padding: "13px 14px" }}>{product.inventory_status === "out_of_stock" ? "Out of stock" : product.inventory_quantity != null ? `${product.inventory_quantity} available` : "Available"}</td>
                            <td style={{ padding: "13px 14px", color: product.cost_confidence === "verified" ? GN : "#B45309" }}>{product.cost_confidence === "verified" ? "Ready" : "Needs cost"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {productPageCount > 1 && <div style={{ padding: "13px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span style={{ color: "var(--muted)", fontSize: 12 }}>Page {productPage} of {productPageCount}</span><div style={{ display: "flex", gap: 8 }}><button type="button" disabled={productPage === 1} onClick={() => setProductPage(page => Math.max(1, page - 1))}>Previous</button><button type="button" disabled={productPage === productPageCount} onClick={() => setProductPage(page => Math.min(productPageCount, page + 1))}>Next</button></div></div>}
                </>
              )}
            </div>
          </section>
        )}

        {/* ===== TAB: TODAY ===== */}
        {tab === "today" && (
          <section
            className="ps-db-section"
            style={{
              padding: "20px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              animation: "pk-in .3s ease",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))",
                gap: 10,
              }}
            >
              {([
                [
                  "Connected channels",
                  String(defendHealth?.connected_channels ?? 0),
                  defendHealth?.connected_channels
                    ? "Sharing live store data"
                    : "Connect your first sales channel",
                  openSettingsChannels,
                ],
                [
                  "Tracked products",
                  catalogLoading
                    ? "Checking…"
                    : String(heroStats?.tracked_products ?? importedProducts.length),
                  "Products PrizeSkout can review",
                  () => openCatalogFilter("all"),
                ],
                [
                  "Price updates this month",
                  heroStats?.has_activity ? String(heroStats.price_updates_this_month) : "0",
                  "Only confirmed store changes",
                  () => setTab("history"),
                ],
                [
                  "Store status",
                  defendHealth?.state === "active"
                    ? "Protected"
                    : defendHealth?.state === "degraded"
                      ? "Needs attention"
                      : "Monitoring",
                  defendHealth?.detail ?? "Checking connected sales channels",
                  () => revealTodaySection("attention-inbox"),
                ],
              ] as Array<[string, string, string, () => void]>).map(([label, value, note, action]) => (
                <button
                  type="button"
                  key={label}
                  onClick={action}
                  aria-label={`${label}: ${value}. ${note}`}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px 15px",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    textAlign: "start",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ marginTop: 5, fontSize: 22, fontWeight: 850 }}>{value}</div>
                  <div
                    style={{ marginTop: 3, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}
                  >
                    {note}
                  </div>
                </button>
              ))}
            </div>

            <MerchantOperatingLoop
              lang={lang}
              onAskCopilot={runPrizeSkoutAssistant}
              onRunTask={runPreparedManagerTask}
              onContinueSetup={reviewProductsMissingCosts}
            />

            <button
              type="button"
              onClick={() => setTab("analytics")}
              style={{
                alignSelf: "center",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "10px 16px",
                background: "var(--surface)",
                color: "var(--text)",
                fontFamily: "inherit",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Open the complete Business Overview →
            </button>
          </section>
        )}

        {/* ===== TAB: STORE MANAGER ===== */}
        {tab === "manager" && (
          <section
            className="ps-db-section"
            style={{
              padding: "20px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              animation: "pk-in .3s ease",
            }}
          >
            <MerchantOperatingLoop
              lang={lang}
              onAskCopilot={runPrizeSkoutAssistant}
              onRunTask={runPreparedManagerTask}
              onContinueSetup={reviewProductsMissingCosts}
            />
          </section>
        )}

        {/* ===== TAB: REVENUE PROTECTION HUB ===== */}
        {tab === "analytics" && (
          <section
            className="ps-db-section"
            style={{
              padding: "14px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 30,
              animation: "pk-in .3s ease",
            }}
          >
            {sidebarNav === "overview" ? (
              <ExecutiveOverview
                currency={currency}
                trackedProducts={importedProducts.length}
                verifiedCosts={storeOpportunity.verified}
                missingCosts={storeOpportunity.estimated + storeOpportunity.unknown}
                atRiskProducts={storeOpportunity.atRisk.length}
                activeRules={rules.filter((rule) => rule.active).length}
                attentionCount={historyAttentionCount}
                confirmedActions={historyConfirmedCount}
                expectedPayout={payoutData?.expected_payout ?? null}
                channels={overviewChannels}
                risks={overviewRisks}
                onCatalog={() => openCatalogFilter("all")}
                onMargin={() => { setSidebarNav("margin"); setTab("analytics"); }}
                onRecovery={() => { setSidebarNav("recovery"); setTab("analytics"); }}
                onAlerts={() => setTab("today")}
                onIntegrations={() => setTab("vault")}
              />
            ) : (<>
            {sidebarNav === "margin" && <>
            <div id="margin-intelligence-section" style={{scrollMarginTop:24}}>
              <MarginIntelligenceSummary currency={currency} products={importedProducts.length} verified={storeOpportunity.verified} risks={storeOpportunity.atRisk.length} opportunity={storeOpportunity.correctionPerCatalogSale} channels={overviewChannels} riskRows={overviewRisks} />
            </div>

            {/* First-run welcome: we auto-ran a Talabat payout check the
                moment Talabat was connected, since this merchant has never
                had one — surface it here instead of leaving it for someone
                to discover the button buried in the Payout Assurance card. */}
            {welcomeAuditBanner && payoutData && !payoutError && (
              <div
                style={{
                  background: `color-mix(in srgb,${GN} 8%,var(--surface))`,
                  border: `1px solid color-mix(in srgb,${GN} 30%,transparent)`,
                  borderRadius: 14,
                  padding: "18px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: GN }}>
                    We checked your Talabat payouts automatically
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Last 30 days · {payoutData.order_count} orders · expected payout ≈ {currency}{" "}
                    {fmtMoney(payoutData.expected_payout, currency)}. Compare this against what
                    actually landed in your bank to catch any shortfall.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setWelcomeAuditBanner(false);
                      document
                        .getElementById("ps-payout-assurance-card")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    style={{
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 14px",
                      background: GN,
                      color: "#fff",
                      fontFamily: "inherit",
                      fontWeight: 800,
                      fontSize: 12.5,
                    }}
                  >
                    View full report
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => setWelcomeAuditBanner(false)}
                    style={{
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      fontSize: 18,
                      lineHeight: 1,
                      padding: "4px 6px",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* The first screen after a store connection must explain the
                commercial outcome, not merely that a catalogue synchronized. */}
            {channelStatuses.zid === "connected" && importedProducts.length === 0 && (
              <div
                style={{
                  padding: "22px 24px",
                  borderRadius: 16,
                  border: "1px solid color-mix(in srgb,#EF681A 30%,var(--border))",
                  background: "color-mix(in srgb,#EF681A 7%,var(--surface))",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: OG,
                    boxShadow: `0 0 0 6px color-mix(in srgb,${OG} 15%,transparent)`,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 850 }}>
                    Zid connected. PrizeSkout is scanning the store now.
                  </div>
                  <div style={{ marginTop: 3, color: "var(--muted)", fontSize: 13 }}>
                    We are checking what each product earns after its cost and channel charges. Your
                    first results will appear here automatically.
                  </div>
                </div>
              </div>
            )}
            {importedProducts.length > 0 && (
              <div
                data-tour="value-center"
                style={{
                  background:
                    "linear-gradient(135deg,color-mix(in srgb,#EF681A 10%,var(--surface)),var(--surface))",
                  border: "1px solid color-mix(in srgb,#EF681A 34%,var(--border))",
                  borderRadius: 18,
                  boxShadow: "var(--shadow)",
                  padding: "26px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 18,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ maxWidth: 720 }}>
                    <div
                      style={{
                        color: OG,
                        fontSize: 11.5,
                        fontWeight: 900,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Your first PrizeSkout result
                    </div>
                    <h2
                      style={{
                        margin: "7px 0 7px",
                        fontFamily: DISPLAY,
                        fontSize: 30,
                        lineHeight: 1.16,
                      }}
                    >
                      We found {storeOpportunity.atRisk.length} product
                      {storeOpportunity.atRisk.length === 1 ? "" : "s"} that need attention
                    </h2>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
                      PrizeSkout checked {importedProducts.length} product
                      {importedProducts.length === 1 ? "" : "s"} and found which ones leave you less
                      than your {persistedGlobalFloor}% target after product cost and channel
                      charges.
                    </p>
                  </div>
                  <div
                    style={{
                      minWidth: 230,
                      padding: "16px 18px",
                      borderRadius: 13,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: 10.5,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      More you could keep
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: DISPLAY,
                        fontSize: 31,
                        fontWeight: 800,
                        color: storeOpportunity.correctionPerCatalogSale > 0 ? OG : GN,
                      }}
                    >
                      {opportunityCurrency}{" "}
                      {fmtMoney(storeOpportunity.correctionPerCatalogSale, opportunityCurrency)}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "var(--muted)",
                        fontSize: 11.5,
                        lineHeight: 1.45,
                      }}
                    >
                      if one of each affected product sells. Connect orders to see the monthly
                      amount.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    [
                      "Products checked",
                      String(importedProducts.length),
                      "From your connected store",
                    ],
                    [
                      "Earning below target",
                      String(storeOpportunity.atRisk.length),
                      "Review these first",
                    ],
                    [
                      "Costs confirmed by store",
                      String(storeOpportunity.verified),
                      "Safe to calculate",
                    ],
                    [
                      "Costs to confirm",
                      String(storeOpportunity.estimated + storeOpportunity.unknown),
                      "No automatic changes",
                    ],
                  ].map(([label, value, foot], index) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => {
                        if (index === 0) openCatalogFilter("verified_risk");
                        else if (index === 1) openCatalogFilter("verified");
                        else openCatalogFilter("missing_cost");
                      }}
                      style={{
                        padding: "14px 15px",
                        borderRadius: 11,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "inherit",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "start",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          fontWeight: 800,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{ fontFamily: DISPLAY, fontSize: 27, fontWeight: 800, marginTop: 5 }}
                      >
                        {value}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        {foot}
                      </div>
                    </button>
                  ))}
                </div>

                {storeOpportunity.atRisk.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      <strong style={{ color: "var(--text)" }}>
                        {storeOpportunity.atRisk[0].name_en || storeOpportunity.atRisk[0].sku}
                      </strong>{" "}
                      needs attention first. You can review one change, confirm it in Zid, and
                      restore the original price.
                    </div>
                    <button
                      type="button"
                      onClick={() => openProduct(storeOpportunity.atRisk[0])}
                      style={{
                        border: "none",
                        borderRadius: 9,
                        padding: "11px 16px",
                        background: OG,
                        color: "white",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 850,
                      }}
                    >
                      Review the first price →
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "13px 15px",
                      borderRadius: 10,
                      background: `color-mix(in srgb,${GN} 8%,var(--surface))`,
                      color: GN,
                      fontWeight: 750,
                    }}
                  >
                    Every product with a confirmed cost is currently meeting your target. PrizeSkout
                    will keep checking new changes.
                  </div>
                )}

                {(storeOpportunity.estimated > 0 || storeOpportunity.unknown > 0) && (
                  <div
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.55,
                      color: "#92400E",
                      background: "color-mix(in srgb,#F59E0B 9%,var(--surface))",
                      border: "1px solid color-mix(in srgb,#F59E0B 28%,var(--border))",
                      borderRadius: 9,
                      padding: "10px 13px",
                    }}
                  >
                    <strong>Some product costs need confirmation.</strong>{" "}
                    {storeOpportunity.estimated} cost
                    {storeOpportunity.estimated === 1 ? " is" : "s are"} estimated and{" "}
                    {storeOpportunity.unknown} {storeOpportunity.unknown === 1 ? "is" : "are"}{" "}
                    missing. PrizeSkout will show suggestions but will not change these products
                    automatically.
                  </div>
                )}
              </div>
            )}

            {/* Hero + stat grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
                gap: 18,
              }}
            >
              <div
                data-tour="hero"
                data-demo-tip="Profits protected this month — real QAR value from every price PrizeSkout defended, not a projection."
                style={{
                  gridColumn: "span 2",
                  minWidth: "min(100%,560px)",
                  position: "relative",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  boxShadow: "var(--shadow)",
                  padding: "26px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    fontSize: 12.5,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    color: "var(--muted)",
                    textTransform: "uppercase" as const,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: GN }} />
                  {t.profLabel}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: DISPLAY,
                        fontSize: 18.5,
                        fontWeight: 500,
                        color: heroStats?.has_activity ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      {currency}
                    </span>
                    <span
                      style={{
                        fontFamily: DISPLAY,
                        fontSize: 62,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: heroStats?.has_activity ? GN : "var(--muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {heroStats?.has_activity
                        ? fmtMoney(heroStats.profits_protected_this_month, currency)
                        : "—"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 15, color: "var(--muted)" }}>
                  {heroStats?.has_activity
                    ? `${heroStats.price_updates_this_month} ${t.profDefensesLabel}`
                    : t.profNoActivity}
                </div>
                {/* Sparkline: real daily-bucketed profit-protected totals when
                    available, a flat dim placeholder otherwise. */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    height: 70,
                    marginTop: 6,
                    opacity: heroStats?.has_activity ? 1 : 0.18,
                  }}
                >
                  {(heroStats?.daily_series ?? Array.from({ length: 33 }).map(() => 0)).map(
                    (v, i) => {
                      const max = Math.max(1, ...(heroStats?.daily_series ?? [1]));
                      return (
                        <span
                          key={i}
                          style={{
                            flex: 1,
                            borderRadius: "3px 3px 0 0",
                            height: Math.max(4, (v / max) * 70),
                            background: `color-mix(in srgb,${OG} ${v > 0 ? 85 : 40}%,var(--surface))`,
                          }}
                        />
                      );
                    },
                  )}
                </div>
              </div>

              {/* Stat cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                  gap: 18,
                  gridColumn: "span 2",
                  minWidth: "min(100%,420px)",
                  alignContent: "stretch",
                }}
              >
                {[
                  {
                    label: "Tracked Products",
                    value: heroStats?.has_activity ? String(heroStats.tracked_products) : "—",
                    foot: heroStats?.has_activity ? t.profTrackedFoot : "connect a store",
                    footColor: "var(--muted)",
                    tip: "Every product PrizeSkout has pulled in from your connected stores and is actively pricing.",
                    action: () => openCatalogFilter("all"),
                  },
                  {
                    label: "Price Updates Today",
                    value: String(heroStats?.price_updates_today ?? 0),
                    foot: "avg latency <2s",
                    footColor: "var(--muted)",
                    tip: "Automatic price changes pushed live today — under 2 seconds from decision to the price actually updating on the channel.",
                    action: () => setTab("history"),
                  },
                  {
                    label: "Avg. Margin Saved",
                    value:
                      heroStats?.avg_margin_saved_pct != null
                        ? `+${heroStats.avg_margin_saved_pct.toFixed(1)}pp`
                        : "—",
                    foot:
                      heroStats?.avg_margin_saved_pct != null ? t.profMarginFoot : "no data yet",
                    footColor: "var(--muted)",
                    tip: "Percentage points of margin recovered versus what you'd have made without PrizeSkout's price defenses.",
                    action: () => setTab("analytics"),
                  },
                  {
                    label: "Active Rules",
                    value: String(rules.filter((r) => r.active).length),
                    foot: "price guardrails",
                    footColor: "var(--muted)",
                    tip: "Margin policies currently enforced automatically — see Margin Policy Engine for the full rule book.",
                    action: () => setTab("rules"),
                  },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.label}
                    data-demo-tip={s.tip}
                    onClick={s.action}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      boxShadow: "var(--shadow)",
                      padding: "20px 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      justifyContent: "space-between",
                      color: "inherit",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "start",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        color: "var(--muted)",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: DISPLAY,
                        fontSize: 36.5,
                        fontWeight: 700,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 14, color: s.footColor }}>{s.foot}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instant-value strip: a forward-looking channel pricing
                opportunity (computed from data already loaded, same math as
                Channel Price Architecture) plus a ranked worst-offenders
                list — both readable without opening any other tab. */}
            {importedProducts.length > 0 &&
              (channelPricingGap.count > 0 || fixTheseFirst.length > 0) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
                    gap: 18,
                  }}
                >
                  {channelPricingGap.count > 0 && (
                    <div
                      data-demo-tip="A snapshot of what Channel Price Architecture would find right now — the same math, surfaced here so you see it before opening that tab."
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        boxShadow: "var(--shadow)",
                        padding: "22px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          color: "var(--muted)",
                          textTransform: "uppercase" as const,
                        }}
                      >
                        Channel pricing gap
                      </div>
                      <div
                        style={{
                          fontFamily: DISPLAY,
                          fontSize: 32,
                          fontWeight: 700,
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span style={{ fontSize: 18, fontWeight: 500, marginRight: 6 }}>
                          {currency}
                        </span>
                        {fmtMoney(channelPricingGap.gap, currency)}
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
                        {channelPricingGap.count} product{channelPricingGap.count === 1 ? "" : "s"}{" "}
                        priced below their target margin on at least one of your channels — this is
                        what publishing corrected prices would add.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPolicyTab("pricing");
                          document
                            .getElementById("ps-policy-center-card")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        style={{
                          alignSelf: "flex-start",
                          cursor: "pointer",
                          border: "none",
                          borderRadius: 8,
                          padding: "9px 14px",
                          background: OG,
                          color: "#fff",
                          fontFamily: "inherit",
                          fontWeight: 800,
                          fontSize: 12.5,
                          marginTop: 4,
                        }}
                      >
                        Review channel pricing →
                      </button>
                    </div>
                  )}
                  {fixTheseFirst.length > 0 && (
                    <div
                      data-demo-tip="Your worst-margin products, ranked — click any row to review and apply its recommended price."
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        boxShadow: "var(--shadow)",
                        padding: "22px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            color: "var(--muted)",
                            textTransform: "uppercase" as const,
                          }}
                        >
                          Fix these first
                        </div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
                          Ranked by how far below your margin floor they've fallen.
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {fixTheseFirst.map((product) => {
                          const displayName =
                            lang === "ar" && product.name_ar
                              ? product.name_ar
                              : product.name_en || product.sku;
                          return (
                            <div
                              key={product.ingest_event_id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Review ${displayName}`}
                              onClick={() => openProduct(product)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openProduct(product);
                                }
                              }}
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 6px",
                                borderRadius: 8,
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 13.5,
                                    fontWeight: 700,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {displayName}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                                  {product.currency}{" "}
                                  {fmtMoney(product.current_price, product.currency)} →{" "}
                                  {fmtMoney(product.recommended_price, product.currency)}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "#B42318",
                                  flexShrink: 0,
                                }}
                              >
                                {product.decision_action === "reprice_up" ? "↑" : "↓"}{" "}
                                {product.net_margin_pct != null
                                  ? `${(product.net_margin_pct * 100).toFixed(1)}%`
                                  : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {false && (<>
            <div
              id="legacy-imported-products"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                boxShadow: "var(--shadow)",
                overflow: "hidden",
              }}
            >
              <div
                data-demo-tip="These are real products pulled live from your connected store's API — not a mock catalogue. Each one gets a margin-floor price recommendation automatically."
                style={{
                  padding: "22px 26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Imported Products</h3>
                  <div style={{ marginTop: 5, fontSize: 13.5, color: "var(--muted)" }}>
                    Products from your connected stores, with the next safe action for each one.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={syncAllCatalogs}
                  disabled={syncingCatalog}
                  data-demo-tip="Pulls your catalogue straight from every connected store — no need to ask the Copilot for something this routine."
                  style={{
                    cursor: syncingCatalog ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    color: GN,
                    background: `color-mix(in srgb,${GN} 10%,var(--surface))`,
                    border: `1px solid color-mix(in srgb,${GN} 28%,transparent)`,
                    borderRadius: 999,
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    opacity: syncingCatalog ? 0.7 : 1,
                  }}
                >
                  {syncingCatalog ? (
                    "Syncing…"
                  ) : (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      Refresh products
                    </>
                  )}
                </button>
              </div>
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface2)",
                }}
              >
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search product name, SKU, or channel…"
                  aria-label="Search imported products"
                  style={{
                    flex: "1 1 260px",
                    minWidth: 0,
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    background: "var(--surface)",
                    color: "var(--text)",
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                  }}
                />
                <select
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value as typeof productFilter)}
                  aria-label="Filter imported products"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    background: "var(--surface)",
                    color: "var(--text)",
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All products ({importedProducts.length})</option>
                  <option value="risk">Earning below target</option>
                  <option value="missing_cost">Cost needs confirmation</option>
                  {productFilter === "verified_risk" && (
                    <option value="verified_risk">Below target · cost confirmed</option>
                  )}
                  <option value="healthy">Meeting target</option>
                  <option value="repriced">Price changed</option>
                </select>
                <select
                  value={productSort}
                  onChange={(event) => setProductSort(event.target.value as typeof productSort)}
                  aria-label="Sort imported products"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    background: "var(--surface)",
                    color: "var(--text)",
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                >
                  <option value="risk">Priority first</option>
                  <option value="name">Name A–Z</option>
                  <option value="price">Highest price</option>
                </select>
              </div>
              {catalogLoading ? (
                <div style={{ padding: 28, color: "var(--muted)", fontSize: 14 }}>
                  Loading catalogue…
                </div>
              ) : filteredProducts.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    textAlign: "center",
                  }}
                >
                  {importedProducts.length > 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>
                      No products match this search or filter.
                    </div>
                  ) : SYNC_CAPABLE_PLATFORMS.some((p) => channelStatuses[p] === "connected") ? (
                    <>
                      <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>
                        Your store is connected, but its products have not been loaded yet
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 13.5, maxWidth: 420 }}>
                        Load your products to see what each sale leaves after cost and channel
                        charges.
                      </div>
                      <button
                        type="button"
                        onClick={syncAllCatalogs}
                        disabled={syncingCatalog}
                        style={{
                          cursor: syncingCatalog ? "wait" : "pointer",
                          border: "none",
                          borderRadius: 10,
                          background: OG,
                          color: "#fff",
                          fontSize: 13.5,
                          fontWeight: 700,
                          padding: "11px 20px",
                          fontFamily: "inherit",
                          opacity: syncingCatalog ? 0.7 : 1,
                        }}
                      >
                        {syncingCatalog ? "Loading products…" : "Load my products"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>
                        No store connected yet
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 13.5, maxWidth: 420 }}>
                        Connect Zid, Salla, or Foodics to check product earnings and review safe
                        price changes.
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab("vault")}
                        style={{
                          cursor: "pointer",
                          border: "none",
                          borderRadius: 10,
                          background: OG,
                          color: "#fff",
                          fontSize: 13.5,
                          fontWeight: 700,
                          padding: "11px 20px",
                          fontFamily: "inherit",
                        }}
                      >
                        Go to Integration Vault
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))",
                      gap: 14,
                      padding: 18,
                    }}
                  >
                    {visibleProducts.map((product) => {
                      const margin =
                        product.net_margin_pct == null ? null : product.net_margin_pct * 100;
                      const displayName =
                        lang === "ar" && product.name_ar
                          ? product.name_ar
                          : product.name_en || product.sku;
                      return (
                        <div
                          key={product.ingest_event_id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open details for ${displayName}`}
                          onClick={() => openProduct(product)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openProduct(product);
                            }
                          }}
                          style={{
                            cursor: "pointer",
                            border: "1px solid var(--border)",
                            borderRadius: 13,
                            padding: "18px 19px",
                            background: "var(--surface2)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            transition:
                              "transform .18s ease,border-color .18s ease,box-shadow .18s ease",
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.transform = "translateY(-2px)";
                            event.currentTarget.style.borderColor = OG;
                            event.currentTarget.style.boxShadow = "var(--shadow)";
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.transform = "none";
                            event.currentTarget.style.borderColor = "var(--border)";
                            event.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{ fontSize: 17, fontWeight: 800, overflowWrap: "anywhere" }}
                              >
                                {displayName}
                              </div>
                              <div
                                style={{
                                  fontFamily: MONO,
                                  fontSize: 11.5,
                                  color: "var(--muted)",
                                  marginTop: 5,
                                }}
                              >
                                SKU {product.sku}
                              </div>
                            </div>
                            <span
                              style={{
                                flexShrink: 0,
                                textTransform: "uppercase",
                                fontSize: 10.5,
                                fontWeight: 800,
                                color: OG,
                                border: `1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                                borderRadius: 999,
                                padding: "4px 8px",
                              }}
                            >
                              {product.source_platform}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  textTransform: "uppercase",
                                  color: "var(--muted)",
                                }}
                              >
                                Current price
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 3 }}>
                                {product.current_price.toLocaleString()}{" "}
                                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                  {product.currency}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  textTransform: "uppercase",
                                  color: "var(--muted)",
                                }}
                              >
                                Recommended price
                              </div>
                              <div
                                style={{
                                  fontSize: 20,
                                  fontWeight: 800,
                                  marginTop: 3,
                                  color: product.cost_confidence === "verified" ? GN : "#B45309",
                                }}
                              >
                                {product.cost_confidence === "verified" ? (
                                  <>
                                    {product.recommended_price.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                      {product.currency}
                                    </span>
                                  </>
                                ) : (
                                  "Cost needed"
                                )}
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  textTransform: "uppercase",
                                  color: "var(--muted)",
                                }}
                              >
                                Net margin
                              </div>
                              <div
                                style={{
                                  fontSize: 20,
                                  fontWeight: 800,
                                  marginTop: 3,
                                  color: product.floor_breached ? "#DC2626" : GN,
                                }}
                              >
                                {product.cost_confidence !== "verified" || margin == null
                                  ? "Not available"
                                  : `${margin.toFixed(1)}%`}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              paddingTop: 12,
                              borderTop: "1px solid var(--border)",
                              fontSize: 12,
                            }}
                          >
                            <span
                              style={{
                                color:
                                  product.cost_confidence !== "verified"
                                    ? "#B45309"
                                    : product.floor_breached
                                      ? "#DC2626"
                                      : GN,
                                fontWeight: 700,
                              }}
                            >
                              {product.cost_confidence !== "verified"
                                ? "Cost needed"
                                : product.floor_breached
                                  ? "Below margin floor"
                                  : "Margin healthy"}
                            </span>
                            <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>
                              {product.cost_confidence !== "verified"
                                ? "Add cost to unlock a safe recommendation"
                                : `Recommendation: ${product.decision_action.replace(/_/g, " ")} · ${product.status.replace(/_/g, " ")}`}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              color: OG,
                              fontSize: 12.5,
                              fontWeight: 800,
                            }}
                          >
                            Open product details →
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {productPageCount > 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "14px 18px",
                        borderTop: "1px solid var(--border)",
                        fontSize: 12.5,
                        color: "var(--muted)",
                      }}
                    >
                      <span>
                        Showing {(productPage - 1) * productPageSize + 1}–
                        {Math.min(productPage * productPageSize, filteredProducts.length)} of{" "}
                        {filteredProducts.length}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          disabled={productPage === 1}
                          onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "var(--surface)",
                            color: "var(--text)",
                            padding: "8px 11px",
                            cursor: productPage === 1 ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Previous
                        </button>
                        <span>
                          Page {productPage} of {productPageCount}
                        </span>
                        <button
                          type="button"
                          disabled={productPage === productPageCount}
                          onClick={() =>
                            setProductPage((page) => Math.min(productPageCount, page + 1))
                          }
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "var(--surface)",
                            color: "var(--text)",
                            padding: "8px 11px",
                            cursor: productPage === productPageCount ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Payout Assurance — the flagship audit tool, kept focused on
                just the payout check and its results. Contract, promotion,
                channel-pricing, and group-control configuration used to be
                stacked in front of this (four unrelated workspaces a
                merchant had to scroll past to reach the thing this page
                exists for); they now live in their own Policy Center below. */}
            </>)}
            </>}
            {sidebarNav === "recovery" && <>
            <RecoveryDashboardSummary
              currency={currency}
              expectedPayout={payoutData?.expected_payout ?? null}
              checks={historyPayoutChecks.length}
              investigations={historyPayoutAudits.length}
              recovered={recoveryCases.reduce((sum, item) => sum + Number(item.recovered_amount || 0), 0)}
              submitted={recoveryCases.filter((item) => Boolean(item.submitted_at)).length}
              openCases={recoveryCases.filter((item) => !["recovered", "closed", "rejected"].includes(item.status)).length}
              channels={overviewChannels}
            />
            <div
              id="ps-payout-assurance-card"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                boxShadow: "var(--shadow)",
                padding: "26px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.2px" }}>
                    {t.payoutCheckTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setTab("history")}
                    style={{
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: OG,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      fontFamily: "inherit",
                    }}
                  >
                    {lang === "en" ? "Past payout checks →" : t.historyViewLink}
                  </button>
                </div>
                {payoutData && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: payoutData.source === "upload" ? "#B45309" : GN,
                      background:
                        payoutData.source === "upload"
                          ? "color-mix(in srgb,#B45309 10%,var(--surface))"
                          : `color-mix(in srgb,${GN} 10%,var(--surface))`,
                      border: `1px solid ${payoutData.source === "upload" ? "color-mix(in srgb,#B45309 28%,transparent)" : `color-mix(in srgb,${GN} 28%,transparent)`}`,
                      borderRadius: 999,
                      padding: "5px 12px",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: payoutData.source === "upload" ? "#B45309" : GN,
                      }}
                    />
                    {payoutData.source === "upload"
                      ? t.payoutCheckSourceUpload
                      : t.payoutCheckSourceLive}
                    {" · "}
                    {PAYOUT_UPLOAD_PLATFORMS.find((p) => p.value === payoutData.platform)?.label ??
                      "Talabat"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
                {t.payoutCheckDesc}
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 3,
                  gap: 2,
                  alignSelf: "flex-start",
                }}
              >
                {(
                  [
                    ["live", t.payoutCheckLiveTab],
                    ["upload", t.payoutCheckUploadTab],
                  ] as [typeof payoutTab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPayoutTab(id);
                      setPayoutError(null);
                    }}
                    style={{
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 15px",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      background: payoutTab === id ? OG : "transparent",
                      color: payoutTab === id ? "#fff" : "var(--muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {payoutTab === "live" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    alignItems: "flex-start",
                    width: "100%",
                    maxWidth: 720,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px 18px",
                      background: "var(--surface2)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>Check Talabat payout</div>
                        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                          Compare connected orders with your agreed commission and expected
                          settlement.
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: GN,
                          border: `1px solid color-mix(in srgb,${GN} 35%,transparent)`,
                          borderRadius: 999,
                          padding: "5px 9px",
                        }}
                      >
                        CONNECTED PLATFORM
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
                      {([7, 30] as const).map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setPayoutWindowDays(days)}
                          style={{
                            cursor: "pointer",
                            border: `1px solid ${payoutWindowDays === days ? OG : "var(--border)"}`,
                            borderRadius: 8,
                            padding: "8px 11px",
                            background:
                              payoutWindowDays === days
                                ? "color-mix(in srgb,#EF681A 9%,var(--surface))"
                                : "var(--surface)",
                            color: payoutWindowDays === days ? OG : "var(--text)",
                            fontFamily: "inherit",
                            fontWeight: 700,
                          }}
                        >
                          Last {days} days
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={runPayoutCheck}
                    disabled={payoutLoading}
                    style={{
                      cursor: payoutLoading ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      background: payoutLoading ? "#94A3B8" : OG,
                      border: "none",
                      borderRadius: 10,
                      padding: "11px 20px",
                      fontFamily: "inherit",
                      opacity: payoutLoading ? 0.7 : 1,
                      transition: "background .2s,opacity .2s",
                    }}
                  >
                    {payoutLoading ? t.payoutCheckBtnLoading : t.payoutCheckBtn}
                  </button>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {t.payoutCheckLiveOnlyNote}
                  </span>
                </div>
              ) : (
                <PayoutUploadStaging
                  items={stagedItems}
                  platforms={PAYOUT_UPLOAD_PLATFORMS}
                  rate={payoutUploadRate}
                  rateAuthorityLabel={approvedContracts.find(term => term.status === "approved" && term.platform === payoutUploadPlatform)
                    ? `Approved contract · ${approvedContracts.find(term => term.status === "approved" && term.platform === payoutUploadPlatform)?.contract_name}` : null}
                  onRateChange={setPayoutUploadRate}
                  onPlatformChange={(platform) => {
                    setPayoutUploadPlatform(platform);
                    const contract = approvedContracts.find(term => term.status === "approved" && term.platform === platform);
                    setPayoutUploadRate(contract ? String(contract.commission_rate_pct) : "");
                  }}
                  onAddFile={addFileItems}
                  onAddManual={addManualItem}
                  onCorrectType={correctStagedDocumentType}
                  onToggleNetSales={toggleNetSalesOverride}
                  onRemove={removeStagedItem}
                  onRunAudit={runStagedAudit}
                />
              )}

              {payoutError && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#DC2626",
                    background: "color-mix(in srgb,#DC2626 8%,var(--surface))",
                    border: "1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                    borderRadius: 9,
                    padding: "10px 14px",
                  }}
                >
                  {payoutError}
                </div>
              )}

              {payoutData?.source === "live" &&
                payoutData.settlement_forecast &&
                payoutData.sale_lines && (
                  <SettlementForecastPanel
                    forecast={payoutData.settlement_forecast}
                    lines={payoutData.sale_lines}
                    currency={currency}
                  />
                )}
              {payoutData && <PayoutResultDetail data={payoutData} currency={currency} t={t} />}

              {auditResult &&
                (auditResult.ledger.length > 0 || auditResult.findings.length > 0) && (
                  <>
                    <CommissionAuditPanel
                      result={auditResult}
                      currency={currency}
                      documentCount={payoutDocuments.length}
                      documents={payoutDocuments}
                      approvedContract={approvedContracts.find(term => term.status === "approved" && term.platform === payoutUploadPlatform) ?? null}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={handleSaveAudit}
                        disabled={savingAudit || auditSaved}
                        style={{
                          cursor: savingAudit || auditSaved ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: auditSaved ? GN : "#fff",
                          background: auditSaved ? "transparent" : OG,
                          border: auditSaved ? `1px solid ${GN}` : "none",
                          borderRadius: 9,
                          padding: "9px 16px",
                          opacity: savingAudit ? 0.7 : 1,
                        }}
                      >
                        {auditSaved
                          ? t.payoutAuditSaved
                          : savingAudit
                            ? t.payoutDownloadingPdf
                            : t.payoutSaveAudit}
                      </button>
                      {auditSaved&&settlementRun&&<div style={{marginTop:9,padding:"9px 12px",border:"1px solid var(--border)",borderRadius:9,fontSize:12,color:"var(--muted)",background:"var(--surface2)"}}>
                        Settlement ledger: <strong style={{color:"var(--text)"}}>{settlementRun.status.replaceAll("_"," ")}</strong> · {settlementRun.summary.exceptions??0} exception(s) · claim-ready {currency} {(settlementRun.summary.claims_ready_amount??0).toFixed(2)}. Aggregate or unreferenced evidence remains quarantined.
                      </div>}
                    </div>
                  </>
                )}
            </div>

            {/* Policy Center — contract terms, promotions, channel pricing,
                and group controls all feed the audit above but are
                configured far less often than a payout check is run, so
                they live in their own tabbed area instead of stacking in
                front of it. */}
            <div
              id="ps-policy-center-card"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                boxShadow: "var(--shadow)",
                padding: "26px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.2px" }}>
                  Policy Center
                </h3>
                <div
                  style={{ marginTop: 5, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  Set the business rules PrizeSkout should use when it checks payouts and recommends
                  prices.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 3,
                  gap: 2,
                  flexWrap: "wrap",
                  alignSelf: "flex-start",
                }}
              >
                {(
                  [
                    [
                      "contract",
                      "Contracts",
                      "Contract Intelligence Vault — add your marketplace agreement, check the terms PrizeSkout finds, then approve them for payout checks.",
                    ],
                    [
                      "promotions",
                      "Promotions",
                      "Promotion Profitability Control — simulate a discount campaign before running it, so you know if it actually makes money after commission and platform funding.",
                    ],
                    [
                      "pricing",
                      "Channel Pricing",
                      "Channel Price Architecture — set different prices per channel (in-store, Talabat, Zid...) on purpose, without losing track of which price is live where.",
                    ],
                    [
                      "group",
                      "Group Controls",
                      "Group Control Centre — for multi-branch operators: track every legal entity, brand, and branch under one roof, with finance and operations sign-off before changes go live.",
                    ],
                  ] as [typeof policyTab, string, string][]
                ).map(([id, label, tip]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPolicyTab(id)}
                    data-demo-tip={tip}
                    style={{
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 15px",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      background: policyTab === id ? OG : "transparent",
                      color: policyTab === id ? "#fff" : "var(--muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {policyTab === "contract" && (
                <ContractIntelligenceVault
                  connectedPlatforms={Object.entries(channelStatuses).filter(([,status]) => status === "connected").map(([platform]) => platform)}
                  onTermsChanged={(terms) => setApprovedContracts(terms.filter(term => term.status === "approved"))}
                  onApproved={(term) => {
                    setApprovedContract(term);
                    setApprovedContracts(current => [term, ...current.filter(item => item.platform !== term.platform)]);
                    setPayoutUploadRate(String(term.commission_rate_pct));
                  }}
                />
              )}

              {policyTab === "promotions" && (
                <PromotionProfitabilityWorkspace
                  products={importedProducts.map((product) => ({
                    sku: product.sku,
                    name: product.name_en || product.name_ar || product.sku,
                    current_price: product.current_price,
                    net_margin_pct: product.net_margin_pct,
                    source_platform: product.source_platform,
                    unit_cost: product.base_cost ?? null,
                    cost_confidence: product.cost_confidence ?? "unknown",
                  }))}
                  contract={approvedContract}
                  currency={currency}
                />
              )}

              {policyTab === "pricing" && (
                <ChannelPriceArchitecture
                  products={importedProducts.map((product) => ({
                    sku: product.sku,
                    name: product.name_en || product.name_ar || product.sku,
                    current_price: product.current_price,
                    net_margin_pct: product.net_margin_pct,
                    source_platform: product.source_platform,
                    ingest_event_id: product.ingest_event_id,
                  }))}
                  contract={approvedContract}
                  currency={currency}
                />
              )}

              {policyTab === "group" && (
                <GroupControlWorkspace
                  contract={approvedContract}
                  currency={currency}
                  productCount={importedProducts.length}
                />
              )}
            </div>

            {/* Stream + Dispute agent */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <h2
                    style={{ margin: 0, fontSize: 19.5, fontWeight: 800, letterSpacing: "-0.2px" }}
                  >
                    {t.stream}
                  </h2>
                  <span style={{ fontSize: 14, color: "var(--muted)" }}>{t.streamS}</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={downloadCsv}
                    style={{
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: "var(--text)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 16px",
                    }}
                  >
                    {t.downloadCsv}
                  </button>
                  <button
                    onClick={exportDisputeProofs}
                    disabled={!disputes.length && !feed.length}
                    style={{
                      cursor: !disputes.length && !feed.length ? "not-allowed" : "pointer",
                      opacity: !disputes.length && !feed.length ? 0.55 : 1,
                      fontFamily: "inherit",
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: OG,
                      background: `color-mix(in srgb,${OG} 7%,var(--surface))`,
                      border: `1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                      borderRadius: 10,
                      padding: "11px 16px",
                    }}
                  >
                    {t.exportProofs}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))",
                  gap: 18,
                  alignItems: "stretch",
                }}
              >
                {/* Terminal */}
                <div
                  dir="ltr"
                  data-demo-tip="Every price PrizeSkout has pushed live, in real time — a raw audit trail you can hand to anyone who asks 'why did this price change?'"
                  style={{
                    background: "var(--term)",
                    border: "1px solid var(--term-border)",
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minHeight: 340,
                    maxHeight: 420,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      marginBottom: 12,
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#FF5F57",
                        }}
                      />
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#FEBC2E",
                        }}
                      />
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#28C840",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 13,
                          color: "#5A6472",
                          marginInlineStart: 8,
                        }}
                      >
                        defend-loop · edge-doha-01
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("history")}
                      style={{
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#5A6472",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        fontFamily: MONO,
                      }}
                    >
                      {t.historyViewLink}
                    </button>
                  </div>
                  {feed.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        color: "#5A6472",
                        fontFamily: MONO,
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      <span style={{ fontSize: 23.5, opacity: 0.4 }}>◉</span>
                      <span>No events yet · connect a store to start</span>
                    </div>
                  ) : (
                    feed.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "baseline",
                          fontFamily: MONO,
                          fontSize: 14,
                          lineHeight: 1.9,
                          animation: "pk-in .3s ease",
                        }}
                      >
                        <span style={{ color: "#5A6472", flex: "0 0 auto" }}>{f.time}</span>
                        <span style={{ color: f.tagColor, fontWeight: 700, flex: "0 0 auto" }}>
                          {f.tag}
                        </span>
                        <span
                          style={{
                            color: "var(--term-text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {f.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Dispute Audit Agent */}
                <div
                  data-demo-tip="Detects and tracks payout discrepancies through the recovery register. Manual controls remain available for testing and as a fallback when a partner cannot accept automated submissions."
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    boxShadow: "var(--shadow)",
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.2px" }}
                    >
                      {t.agentTitle}
                    </h3>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: GN,
                        background: `color-mix(in srgb,${GN} 10%,var(--surface))`,
                        border: `1px solid color-mix(in srgb,${GN} 26%,transparent)`,
                        borderRadius: 999,
                        padding: "5px 12px",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: GN,
                          animation: "pk-ring 1.8s infinite",
                        }}
                      />
                      {t.agentActive}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        value: `${currency} ${recoveryCases.reduce((sum, item) => sum + Number(item.recovered_amount || 0), 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
                        label: "Money Recovered",
                        color: "var(--muted)",
                      },
                      {
                        value: String(
                          recoveryCases.filter((item) => Boolean(item.submitted_at)).length,
                        ),
                        label: "Claims Submitted",
                        color: "var(--text)",
                      },
                      {
                        value: String(
                          recoveryCases.filter(
                            (item) => !["recovered", "closed", "rejected"].includes(item.status),
                          ).length,
                        ),
                        label: "Open Recovery Cases",
                        color: "var(--muted)",
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "13px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: DISPLAY,
                            fontSize: 20.5,
                            fontWeight: 700,
                            color: m.color,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {m.value}
                        </span>
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "var(--muted)",
                            fontWeight: 600,
                            lineHeight: 1.35,
                          }}
                        >
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        color: "var(--muted)",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {t.discLog}
                    </div>
                    {recoveryLoading ? (
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--surface2)",
                          borderRadius: 12,
                          padding: "24px 20px",
                          fontSize: 15,
                          color: "var(--muted)",
                        }}
                      >
                        Loading recovery register…
                      </div>
                    ) : disputes.length === 0 ? (
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--surface2)",
                          borderRadius: 12,
                          padding: "24px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: GN,
                            flexShrink: 0,
                            animation: "pk-pulse 2.4s infinite",
                          }}
                        />
                        <span style={{ fontSize: 15, color: "var(--muted)" }}>
                          No recovery cases yet · run a payout audit or log a discrepancy
                        </span>
                      </div>
                    ) : (
                      disputes.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--surface2)",
                            borderRadius: 12,
                            padding: "14px 16px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 12,
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 15.5,
                                fontWeight: 700,
                              }}
                            >
                              ⚠ {d.title}
                              <span
                                style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 400 }}
                              >
                                (Order {d.order})
                              </span>
                            </div>
                            <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                              {d.place} · Contract: {d.contract} · Charged:{" "}
                              <span style={{ color: OG, fontWeight: 700 }}>{d.charged}</span> ·
                              Leak: <span style={{ color: OG, fontWeight: 700 }}>{d.leak}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setModal(i);
                              setFileStep(0);
                            }}
                            className="ps-ig-btn"
                            style={{
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--text)",
                              background: "transparent",
                              border: "1.5px solid var(--border)",
                              borderRadius: 10,
                              padding: "10px 15px",
                              fontFamily: "inherit",
                              transition: "border-color .2s,color .2s",
                            }}
                          >
                            {t.genVoucher}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Log Discrepancy button + form */}
                  <button
                    onClick={() => setShowDisputeForm((v) => !v)}
                    style={{
                      cursor: "pointer",
                      alignSelf: "flex-start",
                      fontSize: 14,
                      fontWeight: 700,
                      color: showDisputeForm ? OG : "var(--text)",
                      background: "transparent",
                      border: `1.5px solid ${showDisputeForm ? OG : "var(--border)"}`,
                      borderRadius: 10,
                      padding: "10px 15px",
                      fontFamily: "inherit",
                      transition: "border-color .2s,color .2s",
                    }}
                  >
                    {showDisputeForm ? t.cancelBtn : t.logDiscrepancyBtn}
                  </button>

                  {showDisputeForm && (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                        borderRadius: 14,
                        padding: "20px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        animation: "pk-in .2s ease",
                      }}
                    >
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
                        {t.newDiscrepancy}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
                          gap: 10,
                        }}
                      >
                        {/* Partner */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--muted)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t.partnerLabel}
                          </label>
                          <select
                            value={disputePartner}
                            onChange={(e) => setDisputePartner(e.target.value)}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: 14.5,
                              fontFamily: "inherit",
                            }}
                          >
                            {["Talabat", "Jahez", "Noon", "Amazon", "Careem"].map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        {/* Order ID */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--muted)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t.orderIdLabel}
                          </label>
                          <input
                            value={disputeOrderId}
                            onChange={(e) => setDisputeOrderId(e.target.value)}
                            placeholder="e.g. #84201-A"
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: 14.5,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </div>
                        {/* Location */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--muted)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t.branchLocationLabel}
                          </label>
                          <input
                            value={disputePlace}
                            onChange={(e) => setDisputePlace(e.target.value)}
                            placeholder="e.g. Doha Mall branch"
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: 14.5,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </div>
                        {/* Contracted rate */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--muted)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t.contractedRateLabel}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="40"
                            value={disputeRate}
                            onChange={(e) => setDisputeRate(e.target.value)}
                            placeholder="18"
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: 14.5,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </div>
                        {/* Order value */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--muted)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t.orderValueLabel} ({currency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={disputeOurPrice}
                            onChange={(e) => setDisputeOurPrice(e.target.value)}
                            placeholder="120.00"
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: 14.5,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </div>
                        {/* Charged amount */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--muted)",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t.chargedByPartnerLabel} ({currency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={disputeCharged}
                            onChange={(e) => setDisputeCharged(e.target.value)}
                            placeholder="30.00"
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: 14.5,
                              fontFamily: "inherit",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                      {/* Notes */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "var(--muted)",
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t.additionalNotesLabel}
                        </label>
                        <textarea
                          value={disputeNotes}
                          onChange={(e) => setDisputeNotes(e.target.value)}
                          rows={2}
                          placeholder="Any context about the discrepancy..."
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "8px 10px",
                            resize: "vertical",
                            background: "var(--surface)",
                            color: "var(--text)",
                            fontSize: 14.5,
                            fontFamily: "inherit",
                            outline: "none",
                          }}
                        />
                      </div>
                      <button
                        disabled={
                          disputeLoading || !disputeOrderId || !disputeCharged || !disputeOurPrice
                        }
                        onClick={async () => {
                          const mid = localStorage.getItem("ps_merchant_id") ?? "";
                          const ac = localStorage.getItem("ps_access_code") ?? "";
                          if (!mid || !ac) {
                            showToast("Please connect your store first.");
                            return;
                          }
                          setDisputeLoading(true);
                          try {
                            const res = await fetch("/api/dispute/voucher", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                merchant_id: mid,
                                access_code: ac,
                                partner: disputePartner,
                                order_id: disputeOrderId,
                                place: disputePlace || "Main branch",
                                contracted_rate: Number(disputeRate),
                                charged_amount: Number(disputeCharged),
                                our_price: Number(disputeOurPrice),
                                currency,
                                notes: disputeNotes,
                              }),
                            });
                            const data = (await res.json()) as Dispute & { error?: string };
                            if (!res.ok || data.error) {
                              showToast("⚠ " + (data.error ?? "Voucher generation failed"));
                              return;
                            }
                            const expectedCharge =
                              (Number(disputeOurPrice) * Number(disputeRate)) / 100;
                            const discrepancyAmount = Math.max(
                              0,
                              Number(disputeCharged) - expectedCharge,
                            );
                            const caseResponse = await fetch("/api/channels/connect", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                merchant_id: mid,
                                access_code: ac,
                                platform: "recovery_cases",
                                action: "create",
                                exception_key: disputeOrderId,
                                title: data.title,
                                source_platform: disputePartner.toLowerCase(),
                                case_status: "evidence_required",
                                severity:
                                  discrepancyAmount >= 1000
                                    ? "high"
                                    : discrepancyAmount >= 100
                                      ? "medium"
                                      : "low",
                                exception_amount: discrepancyAmount,
                                claims_ready_amount: 0,
                                confidence: "low",
                                affected_orders: 1,
                                contract_term_id: null,
                                contract_clause: `Merchant-entered ${disputeRate}% commission rate; reviewed contract not yet attached`,
                                evidence_sources: [
                                  "merchant_entered_discrepancy",
                                  "generated_bilingual_voucher",
                                ],
                                calculation: {
                                  order_value: Number(disputeOurPrice),
                                  contracted_rate_pct: Number(disputeRate),
                                  expected_charge: expectedCharge,
                                  actual_charge: Number(disputeCharged),
                                  discrepancy: discrepancyAmount,
                                  voucher_hash: data.hash,
                                },
                                explanation_en: data.en,
                                explanation_ar: data.ar,
                                owner: "",
                              }),
                            });
                            const savedCase = (await caseResponse.json()) as {
                              ok?: boolean;
                              error?: string;
                            };
                            if (!caseResponse.ok || !savedCase.ok) {
                              showToast(
                                "Voucher created, but the recovery case could not be saved: " +
                                  (savedCase.error ?? "Unknown error"),
                              );
                              return;
                            }
                            await loadRecoveryRegister();
                            setShowDisputeForm(false);
                            setDisputeOrderId("");
                            setDisputeCharged("");
                            setDisputeOurPrice("");
                            setDisputeNotes("");
                            setDisputePlace("");
                            showToast(
                              "Discrepancy saved to the recovery register · evidence draft ready",
                            );
                          } catch {
                            showToast("⚠ Network error — try again.");
                          } finally {
                            setDisputeLoading(false);
                          }
                        }}
                        style={{
                          cursor:
                            disputeLoading || !disputeOrderId || !disputeCharged || !disputeOurPrice
                              ? "not-allowed"
                              : "pointer",
                          alignSelf: "flex-start",
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: "#fff",
                          background: disputeLoading ? "#94A3B8" : OG,
                          border: "none",
                          borderRadius: 10,
                          padding: "11px 20px",
                          fontFamily: "inherit",
                          opacity:
                            disputeLoading || !disputeOrderId || !disputeCharged || !disputeOurPrice
                              ? 0.6
                              : 1,
                          transition: "background .2s,opacity .2s",
                        }}
                      >
                        {disputeLoading ? "Saving…" : "Save Recovery Case & Generate Evidence ↗"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>}
            </>)}
          </section>
        )}

        {/* ===== TAB: MARGIN POLICY ENGINE ===== */}
        {tab === "promotions" && (
          <section
            className="ps-db-section"
            style={{
              padding: "14px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 22,
              animation: "pk-in .3s ease",
            }}
          >
            {importedProducts.length > 0 ? (
              <PromotionProfitabilityWorkspace
                products={importedProducts.map((product) => ({
                  sku: product.sku,
                  name: product.name_en || product.name_ar || product.sku,
                  current_price: product.current_price,
                  net_margin_pct: product.net_margin_pct,
                  source_platform: product.source_platform,
                  unit_cost: product.base_cost ?? null,
                  cost_confidence: product.cost_confidence ?? "unknown",
                }))}
                contract={approvedContract}
                currency={currency}
              />
            ) : (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 24,
                  background: "var(--surface)",
                }}
              >
                <h3 style={{ margin: 0 }}>Connect or import a catalogue first</h3>
                <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                  Promo Simulator needs product prices and margin evidence before it can model a
                  safe campaign.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("vault")}
                  style={{
                    border: 0,
                    borderRadius: 8,
                    padding: "9px 13px",
                    background: OG,
                    color: "#fff",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Open Integration Vault
                </button>
              </div>
            )}
          </section>
        )}

        {tab === "rules" && (
          <section
            className="ps-db-section"
            style={{
              padding: "28px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 28,
              animation: "pk-in .3s ease",
            }}
          >
            {/* CFO Copilot and Shop Manager */}
            {sidebarNav === "copilot" && <div
              data-demo-tip="CFO Copilot and Shop Manager answer business questions, run safe checks, prepare store work, and ask once before protected changes."
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                boxShadow: "var(--shadow)",
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <h2
                    style={{ margin: 0, fontSize: 20.5, fontWeight: 800, letterSpacing: "-0.3px" }}
                  >
                    CFO Copilot and Shop Manager
                  </h2>
                  <span style={{ fontSize: 15, color: "var(--muted)" }}>
                    Ask questions about profit, margins and payouts—or tell PrizeSkout to manage
                    products, prices, stock, categories and other connected commerce operations.
                  </span>
                </div>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: OG,
                    background: `color-mix(in srgb,${OG} 9%,var(--surface))`,
                    border: `1px solid color-mix(in srgb,${OG} 32%,transparent)`,
                    borderRadius: 999,
                    padding: "6px 14px",
                  }}
                >
                  {Object.values(channelStatuses).includes("connected")
                    ? "Store connected · changes require your approval"
                    : "Connect a store to enable live actions"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                {[
                  ["Ask about my business", "Profit, margins, orders, payouts and risks"],
                  ["Manage my store", "Create, edit, publish and organise products"],
                ].map(([label, description]) => (
                  <div
                    key={label}
                    style={{
                      flex: "1 1 280px",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "11px 13px",
                      background: "var(--surface2)",
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>{label}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                      {description}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                  gap: 8,
                }}
              >
                {[
                  [
                    "Data freshness",
                    catalogLoading
                      ? "Refreshing catalogue"
                      : importedProducts.length
                        ? `${importedProducts.length} products loaded`
                        : "Sync required",
                  ],
                  [
                    "Permissions",
                    Object.values(channelStatuses).includes("connected")
                      ? "Read connected data · preview approved changes"
                      : "Unavailable until a store connects",
                  ],
                  ["Safety mode", "Your approval is required before changes"],
                  ["Verification", "Checks every change and restores the old value if needed"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "9px 11px",
                      background: "var(--surface2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 750, marginTop: 3 }}>{value}</div>
                  </div>
                ))}
              </div>
              {copilotAlerts.length > 0 && (
                <div style={{ display: "grid", gap: 7 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".07em",
                    }}
                  >
                    Needs your attention
                  </div>
                  {copilotAlerts.map((alert) => (
                    <button
                      key={alert.label}
                      onClick={() =>
                        alert.command ? runCopilot(alert.command) : reviewVerifiedMarginRisks()
                      }
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        textAlign: "left",
                        border: "1px solid color-mix(in srgb,#F59E0B 30%,var(--border))",
                        borderRadius: 9,
                        padding: "9px 11px",
                        background: "color-mix(in srgb,#F59E0B 7%,var(--surface))",
                        color: "var(--text)",
                        fontFamily: "inherit",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <span>{alert.label}</span>
                      <strong style={{ color: OG }}>Review products →</strong>
                    </button>
                  ))}
                </div>
              )}
              <div
                data-tour="copilot"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 14,
                  padding: "6px 8px 6px 18px",
                  boxShadow: "var(--shadow)",
                }}
              >
                <span style={{ fontSize: 17.5, opacity: 0.55 }}>✦</span>
                <input
                  value={cpInput}
                  onChange={(e) => setCpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runCopilot(cpInput);
                  }}
                  placeholder={
                    lang === "ar"
                      ? "اكتب المهمة التي تريد تنفيذها في متجرك..."
                      : "Ask about your business or tell PrizeSkout what to do…"
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: 16,
                    fontFamily: "inherit",
                    padding: "10px 0",
                  }}
                />
                <button
                  onClick={() => runCopilot(cpInput)}
                  style={{
                    cursor: "pointer",
                    flex: "0 0 auto",
                    border: "none",
                    borderRadius: 10,
                    background: OG,
                    color: "#fff",
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: "11px 18px",
                    fontFamily: "inherit",
                  }}
                >
                  {t.compile}
                </button>
              </div>
              {cpObj?._type === "operation" && cpOperationStatus !== "running" && (
                <div style={{ marginTop: -10, fontSize: 12.5, color: "var(--muted)" }}>
                  Follow up naturally—Copilot remembers this product scope. Try “show only this
                  product”, “reprice it”, or “push it live”.
                </div>
              )}
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>
                  {t.try}
                </span>
                {[
                  "What did I actually keep from orders this month?",
                  "Show products losing money",
                  "Change the stock of Wireless Charger to 20",
                  "Create and publish a new product",
                  "Check whether my active coupon is safe",
                ].map((label) => (
                  <button
                    key={label}
                    className="ps-pill-btn"
                    onClick={() => {
                      setCpInput(label);
                      runCopilot(label);
                    }}
                    style={{
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontFamily: "inherit",
                      transition: "border-color .2s,color .2s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {cpPhase === "loading" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "18px 6px 6px",
                    animation: "pk-in .2s ease",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: `3px solid color-mix(in srgb,${OG} 18%,transparent)`,
                      borderTopColor: OG,
                      animation: "pk-spin .75s linear infinite",
                      flex: "0 0 22px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14.5,
                      color: "var(--muted)",
                      animation: "pk-pulse 1.4s infinite",
                    }}
                  >
                    Thinking...
                  </span>
                </div>
              )}
              {cpError && cpPhase === "idle" && (
                <div
                  style={{
                    fontSize: 14,
                    color: "#DC2626",
                    padding: "8px 12px",
                    background: "color-mix(in srgb,#DC2626 8%,var(--surface))",
                    border: "1px solid color-mix(in srgb,#DC2626 25%,transparent)",
                    borderRadius: 9,
                    animation: "pk-in .2s ease",
                  }}
                >
                  {cpError}
                </div>
              )}
              {cpPhase === "result" && cpChatMessage && (
                <div
                  style={{
                    animation: "pk-in .35s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      color: OG,
                      textTransform: "uppercase" as const,
                      paddingLeft: 2,
                    }}
                  >
                    CFO Copilot and Shop Manager
                  </div>
                  <div
                    style={{
                      background: `color-mix(in srgb,${OG} 6%,var(--surface))`,
                      border: `1px solid color-mix(in srgb,${OG} 22%,transparent)`,
                      borderRadius: 14,
                      padding: "18px 20px",
                      fontSize: 16,
                      lineHeight: 1.7,
                      color: "var(--fg)",
                      whiteSpace: "pre-wrap" as const,
                    }}
                  >
                    {cpChatMessage}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--muted)", paddingLeft: 2 }}>
                    Describe a pricing rule to compile it into an engine config →
                  </div>
                </div>
              )}
              {cpPhase === "result" && cpObj?._type === "operation" && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    overflow: "hidden",
                    animation: "pk-in .35s ease",
                  }}
                >
                  <div
                    style={{
                      padding: "17px 19px",
                      background: "var(--surface2)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                        }}
                      >
                        {cpOperationStatus === "running"
                          ? "Working on it"
                          : cpOperationStatus === "failed"
                            ? "I need your help"
                            : cpOperationStatus === "complete"
                              ? "Done"
                              : [
                                    "publish_prices",
                                    "change_order_status",
                                    "create_product_draft",
                                    "product_change",
                                    "product_image_upload",
                                    "image_job",
                                    "variant_create",
                                    "schedule_product_action",
                                    "coupon_change",
                                    "category_assign",
                                    "loyalty_adjust",
                                    "reverse_refund",
                                    "seed_test_store",
                                    "cleanup_test_store",
                                  ].includes(String(cpObj.operation))
                                ? "Review before I continue"
                                : "Here’s what I found"}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>
                        {["product_change", "create_product_draft"].includes(
                          String(cpObj.operation),
                        ) && cpOperationStatus === "complete"
                          ? "Here’s the product now"
                          : cpPrompt}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "6px 11px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        color:
                          cpOperationStatus === "failed"
                            ? "#DC2626"
                            : cpOperationStatus === "complete"
                              ? GN
                              : OG,
                        border: "1px solid currentColor",
                      }}
                    >
                      {cpOperationStatus === "running"
                        ? "Working"
                        : cpOperationStatus === "publishing"
                          ? "Making change"
                          : cpOperationStatus === "complete"
                            ? "Done"
                            : cpOperationStatus === "failed"
                              ? "Needs attention"
                              : "Ready"}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "18px 19px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {cpOperationMessage && (
                      <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>{cpOperationMessage}</div>
                    )}
                    {String(cpObj.operation) === "create_product_draft" &&
                      cpOperationStatus !== "complete" && (
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "16px",
                            background: "var(--surface2)",
                          }}
                        >
                          <div style={{ marginBottom: 14 }}>
                            <strong>Complete the product details</strong>
                            <div style={{ marginTop: 3, color: "var(--muted)", fontSize: 12.5 }}>
                              Name and selling price are required. Leave stock blank to use
                              unlimited stock.
                            </div>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                              gap: 12,
                            }}
                          >
                            {[
                              [
                                "Product name",
                                "product_name",
                                "text",
                                "Example: Wireless charger",
                                true,
                              ],
                              ["SKU", "product_sku", "text", "Generated if left blank", false],
                              ["Selling price", "product_price", "number", "0.00", true],
                              ["Cost", "product_cost", "number", "Optional", false],
                              ["Stock", "product_quantity", "number", "Unlimited if blank", false],
                            ].map(([label, field, type, placeholder, required]) => (
                              <label
                                key={String(field)}
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  fontSize: 12.5,
                                  color: "var(--muted)",
                                }}
                              >
                                <span>
                                  {label}
                                  {required ? " *" : ""}
                                </span>
                                <input
                                  type={String(type)}
                                  min={type === "number" ? "0" : undefined}
                                  step={
                                    field === "product_quantity"
                                      ? "1"
                                      : type === "number"
                                        ? "0.01"
                                        : undefined
                                  }
                                  value={String(cpObj[String(field)] ?? "")}
                                  placeholder={String(placeholder)}
                                  onChange={(event) =>
                                    updateCreateProductDraft(
                                      String(field),
                                      type === "number"
                                        ? event.target.value === ""
                                          ? null
                                          : Number(event.target.value)
                                        : event.target.value,
                                    )
                                  }
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 9,
                                    padding: "10px 11px",
                                    background: "var(--surface)",
                                    color: "var(--text)",
                                    fontFamily: "inherit",
                                    fontSize: 14,
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              marginTop: 14,
                              fontSize: 13.5,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={cpObj.publish_product === true}
                              onChange={(event) =>
                                updateCreateProductDraft("publish_product", event.target.checked)
                              }
                            />
                            Publish to the storefront after approval
                          </label>
                        </div>
                      )}
                    {String(cpObj.operation) === "product_change" &&
                      cpOperationStatus !== "complete" &&
                      Boolean(cpObj.product_change_preview) &&
                      (() => {
                        const preview = cpObj.product_change_preview as {
                          products: Array<{
                            name: string;
                            sku: string;
                            changes: Array<{ field: string; before: unknown; after: unknown }>;
                          }>;
                        };
                        return (
                          <div style={{ display: "grid", gap: 10 }}>
                            {preview.products.map((product) => (
                              <div
                                key={product.sku}
                                style={{
                                  border: "1px solid var(--border)",
                                  borderRadius: 12,
                                  padding: "14px 15px",
                                  background: "var(--surface2)",
                                }}
                              >
                                <div style={{ fontWeight: 800 }}>{product.name}</div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                                  Source SKU {product.sku}
                                </div>
                                <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
                                  {product.changes
                                    .filter((change) => !["source"].includes(change.field))
                                    .map((change) => (
                                      <div
                                        key={change.field}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          gap: 14,
                                          fontSize: 12.5,
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: "var(--muted)",
                                            textTransform: "capitalize",
                                          }}
                                        >
                                          {change.field}
                                        </span>
                                        <strong style={{ textAlign: "right" }}>
                                          {String(change.after)}
                                        </strong>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    {Array.isArray(cpObj.product_candidates) &&
                      cpObj.product_candidates.length > 0 && (
                        <div style={{ display: "grid", gap: 9 }}>
                          {(
                            cpObj.product_candidates as Array<{
                              id: string;
                              name: string;
                              sku: string;
                              is_published: boolean;
                            }>
                          ).map((candidate) => (
                            <button
                              key={candidate.id || candidate.sku}
                              onClick={() => {
                                const selectedOperation = {
                                  ...cpObj,
                                  query: candidate.sku,
                                  sku: candidate.sku,
                                  product_candidates: null,
                                  approval_token: null,
                                };
                                setCpObj(selectedOperation);
                                setCpOperationStatus("running");
                                setCpOperationMessage(
                                  `Selected ${candidate.name} — SKU ${candidate.sku}. Review it, then continue.`,
                                );
                                void prepareCopilotOperation(selectedOperation);
                              }}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 11,
                                padding: "12px 14px",
                                background: "var(--surface)",
                                color: "var(--text)",
                                fontFamily: "inherit",
                                cursor: "pointer",
                                textAlign: "left",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                              }}
                            >
                              <span>
                                <strong>{candidate.name}</strong>
                                <br />
                                <small style={{ color: "var(--muted)" }}>SKU {candidate.sku}</small>
                              </span>
                              <strong style={{ color: OG }}>Choose</strong>
                            </button>
                          ))}
                        </div>
                      )}
                    {String(cpObj.operation) === "coupon_risk" &&
                      Array.isArray(cpObj.coupon_candidates) &&
                      cpObj.coupon_candidates.length > 0 && (
                        <div style={{ display: "grid", gap: 10 }}>
                          {(
                            cpObj.coupon_candidates as Array<{
                              code: string;
                              discount_label: string;
                              products_below_floor: number;
                            }>
                          ).map((coupon) => (
                            <div
                              key={coupon.code}
                              style={{
                                border: "1px solid color-mix(in srgb,#DC2626 28%,var(--border))",
                                borderRadius: 12,
                                padding: "14px 15px",
                                background: "color-mix(in srgb,#DC2626 5%,var(--surface))",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 14,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <strong>{coupon.code}</strong>
                                <div
                                  style={{ marginTop: 4, fontSize: 12.5, color: "var(--muted)" }}
                                >
                                  {coupon.discount_label} discount puts{" "}
                                  {coupon.products_below_floor} verified product
                                  {coupon.products_below_floor === 1 ? "" : "s"} below your
                                  protection floor.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCpObj((current) =>
                                    current
                                      ? {
                                          ...current,
                                          operation: "coupon_change",
                                          coupon_mode: "disable",
                                          coupon_code: coupon.code,
                                          coupon_name: coupon.code,
                                          requires_confirmation: true,
                                          risk_level: "sensitive_write",
                                          coupon_candidates: null,
                                        }
                                      : current,
                                  );
                                  setCpOperationStatus("ready");
                                  setCpOperationMessage(
                                    `Ready to disable ${coupon.code}. The coupon is still active. Confirm below to apply the change in Zid.`,
                                  );
                                }}
                                style={{
                                  border: 0,
                                  borderRadius: 9,
                                  padding: "10px 14px",
                                  background: OG,
                                  color: "white",
                                  fontFamily: "inherit",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                Disable safely
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    {[
                      "change_order_status",
                      "create_product_draft",
                      "product_change",
                      "product_image_upload",
                      "image_job",
                      "variant_create",
                      "schedule_product_action",
                      "coupon_change",
                      "category_assign",
                      "loyalty_adjust",
                      "reverse_refund",
                      "seed_test_store",
                      "cleanup_test_store",
                    ].includes(String(cpObj.operation)) && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 14,
                          flexWrap: "wrap",
                          border: "1px solid color-mix(in srgb,#F59E0B 35%,var(--border))",
                          borderRadius: 11,
                          padding: "13px 14px",
                          background: "color-mix(in srgb,#F59E0B 8%,var(--surface))",
                        }}
                      >
                        <div style={{ fontSize: 13.5, maxWidth: 720 }}>
                          {[
                            "product_change",
                            "create_product_draft",
                            "product_image_upload",
                            "image_job",
                            "variant_create",
                            "schedule_product_action",
                          ].includes(String(cpObj.operation)) ? (
                            String(cpObj.product_mode) === "delete" ? (
                              "This will permanently remove the product. Please check it carefully before continuing."
                            ) : cpOperationStatus === "complete" ? (
                              "The change was checked against Zid."
                            ) : String(cpObj.operation) === "create_product_draft" &&
                              (!String(cpObj.product_name ?? "").trim() ||
                                Number(cpObj.product_price) <= 0) ? (
                              "Complete the required fields above. Nothing will be sent to Zid until the product is ready and you confirm."
                            ) : (
                              "Nothing has changed yet. Continue when the product and details look right."
                            )
                          ) : (
                            <>
                              <strong>Confirmation needed.</strong> Nothing happens until you
                              approve.
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (
                              String(cpObj.operation) === "product_change" &&
                              !String(cpObj.approval_token ?? "").trim()
                            ) {
                              void prepareCopilotOperation(cpObj);
                              return;
                            }
                            void executeCopilotStoreWrite();
                          }}
                          disabled={
                            cpOperationStatus === "publishing" ||
                            cpOperationStatus === "running" ||
                            cpOperationStatus === "complete" ||
                            (String(cpObj.operation) === "create_product_draft" &&
                              (!String(cpObj.product_name ?? "").trim() ||
                                Number(cpObj.product_price) <= 0)) ||
                            (cpOperationStatus === "failed" &&
                              Array.isArray(cpObj.product_candidates) &&
                              cpObj.product_candidates.length > 0)
                          }
                          style={{
                            border: 0,
                            borderRadius: 9,
                            padding: "10px 14px",
                            background:
                              String(cpObj.operation) === "create_product_draft" &&
                              (!String(cpObj.product_name ?? "").trim() ||
                                Number(cpObj.product_price) <= 0)
                                ? "var(--muted)"
                                : cpOperationStatus === "complete"
                                  ? GN
                                  : OG,
                            color: "white",
                            fontFamily: "inherit",
                            fontWeight: 800,
                            cursor:
                              cpOperationStatus === "publishing" || cpOperationStatus === "running"
                                ? "wait"
                                : String(cpObj.operation) === "create_product_draft" &&
                                    (!String(cpObj.product_name ?? "").trim() ||
                                      Number(cpObj.product_price) <= 0)
                                  ? "not-allowed"
                                  : cpOperationStatus === "complete"
                                    ? "default"
                                    : "pointer",
                          }}
                        >
                          {cpOperationStatus === "publishing"
                            ? "Working..."
                            : cpOperationStatus === "running"
                              ? "Loading preview..."
                              : cpOperationStatus === "complete"
                                ? "Checked in Zid"
                                : String(cpObj.operation) === "product_change" &&
                                    !String(cpObj.approval_token ?? "").trim()
                                  ? Array.isArray(cpObj.product_candidates) &&
                                    cpObj.product_candidates.length > 0
                                    ? "Choose a product above"
                                    : "Retry product preview"
                                  : String(cpObj.operation) === "image_job"
                                    ? "Approve image upload"
                                  : String(cpObj.operation) === "reverse_refund"
                                    ? "Confirm refund"
                                    : String(cpObj.operation) === "loyalty_adjust"
                                      ? "Confirm points change"
                                      : String(cpObj.operation) === "coupon_change"
                                        ? `Confirm ${String(cpObj.coupon_mode)}`
                                        : String(cpObj.operation) === "category_assign"
                                          ? "Assign category"
                                          : String(cpObj.operation) === "create_product_draft"
                                            ? !String(cpObj.product_name ?? "").trim() ||
                                              Number(cpObj.product_price) <= 0
                                              ? "Add required details"
                                              : cpObj.publish_product === true
                                                ? "Create and publish"
                                                : "Create draft"
                                            : String(cpObj.product_mode) === "duplicate"
                                              ? cpObj.publish_duplicate === true
                                                ? "Create and publish"
                                                : "Create product"
                                              : String(cpObj.product_mode) === "publish"
                                                ? "Publish product"
                                                : "Save change"}
                        </button>
                      </div>
                    )}
                    {cpStoreActionResult && (
                      <div style={{ display: "grid", gap: 10 }}>
                        {cpStoreActionResult.products?.map((product) => {
                          const item = product.after;
                          return (
                            <div
                              key={product.id}
                              style={{
                                border: `1px solid ${cpStoreActionResult.confirmed ? GN : "#DC2626"}`,
                                borderRadius: 12,
                                padding: "15px 16px",
                                background: "var(--surface)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "start",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 17, fontWeight: 800 }}>
                                    {item?.name ?? product.sku}
                                  </div>
                                  <div
                                    style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}
                                  >
                                    SKU {item?.sku ?? product.sku}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: item?.storefront_visible ? GN : "#B45309",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {item?.storefront_visible
                                    ? "Live in storefront"
                                    : item?.is_published
                                      ? "Published; storefront pending"
                                      : "Not published"}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                                  gap: 10,
                                  marginTop: 14,
                                }}
                              >
                                <div>
                                  <small style={{ color: "var(--muted)" }}>Regular price</small>
                                  <div style={{ fontWeight: 750 }}>
                                    SAR {item?.price?.toLocaleString() ?? "—"}
                                  </div>
                                </div>
                                <div>
                                  <small style={{ color: "var(--muted)" }}>Stock</small>
                                  <div style={{ fontWeight: 750 }}>
                                    {item?.is_infinite
                                      ? "Always available"
                                      : (item?.quantity ?? "Unknown")}
                                  </div>
                                </div>
                                <div>
                                  <small style={{ color: "var(--muted)" }}>
                                    Zid catalogue check
                                  </small>
                                  <div
                                    style={{
                                      fontWeight: 750,
                                      color: product.status === "confirmed" ? GN : "#B45309",
                                    }}
                                  >
                                    {item?.storefront_visible
                                      ? "Visible to customers"
                                      : item?.is_published
                                        ? "Not visible yet"
                                        : product.status === "confirmed"
                                          ? "Confirmed"
                                          : "Needs review"}
                                  </div>
                                </div>
                              </div>
                              {item && !item.storefront_visible && (
                                <button
                                  onClick={() => prepareCreatedProductPublish(item.sku)}
                                  style={{
                                    marginTop: 14,
                                    border: 0,
                                    borderRadius: 9,
                                    padding: "10px 14px",
                                    background: OG,
                                    color: "white",
                                    fontFamily: "inherit",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                  }}
                                >
                                  {item.is_published
                                    ? "Retry storefront publication"
                                    : "Publish this product"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <details style={{ fontSize: 11.5, color: "var(--muted)" }}>
                          <summary style={{ cursor: "pointer" }}>See change details</summary>
                          <div style={{ marginTop: 5 }}>
                            Action ID: {cpStoreActionResult.action_id}
                          </div>
                        </details>
                      </div>
                    )}
                    {cpOperationProducts.length > 0 && (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
                            gap: 10,
                          }}
                        >
                          {cpOperationProducts.slice(0, 12).map((product) => (
                            <button
                              key={product.ingest_event_id}
                              onClick={() => openProduct(product)}
                              style={{
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                color: "var(--text)",
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: 11,
                                padding: "12px 13px",
                              }}
                            >
                              <div
                                style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
                              >
                                <strong>{product.name_en || product.sku}</strong>
                                <span
                                  style={{ fontSize: 10.5, color: OG, textTransform: "uppercase" }}
                                >
                                  {product.source_platform}
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                                SKU {product.sku}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  marginTop: 10,
                                  fontSize: 12.5,
                                }}
                              >
                                <span>
                                  {product.currency} {product.current_price.toLocaleString()}
                                </span>
                                <strong
                                  style={{
                                    color:
                                      product.cost_confidence !== "verified"
                                        ? "#B45309"
                                        : (product.preview?.floor_breached ??
                                            product.floor_breached)
                                          ? "#DC2626"
                                          : GN,
                                  }}
                                >
                                  {product.cost_confidence === "verified"
                                    ? `→ ${product.currency} ${(product.preview?.allowed_price ?? product.current_price).toLocaleString()}`
                                    : "Add cost"}
                                </strong>
                              </div>
                              <div style={{ fontSize: 11, marginTop: 6, color: "var(--muted)" }}>
                                {product.cost_confidence === "verified"
                                  ? "Verified platform cost"
                                  : "Cost not verified"}{" "}
                                ·{" "}
                                {product.inventory_is_infinite
                                  ? "always available"
                                  : product.inventory_quantity != null
                                    ? `${product.inventory_quantity} in stock`
                                    : (product.inventory_status?.replaceAll("_", " ") ??
                                      "inventory unknown")}
                              </div>
                            </button>
                          ))}
                        </div>
                        {cpOperationProducts.length > 12 && (
                          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                            Showing 12 of {cpOperationProducts.length} matched products. All matched
                            products are included.
                          </div>
                        )}
                        {String(cpObj.operation) !== "publish_prices" &&
                          !["low_stock", "cost_attention"].includes(String(cpObj.operation)) && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {String(cpObj.operation) !== "preview_reprice" && (
                                <button
                                  onClick={() => runCopilot("Preview repricing for these products")}
                                  style={{
                                    cursor: "pointer",
                                    border: "1px solid var(--border)",
                                    borderRadius: 9,
                                    padding: "9px 12px",
                                    background: "var(--surface)",
                                    color: "var(--text)",
                                    fontFamily: "inherit",
                                    fontWeight: 700,
                                  }}
                                >
                                  Preview repricing
                                </button>
                              )}
                              <button
                                onClick={() => runCopilot("Push these recommended prices live")}
                                style={{
                                  cursor: "pointer",
                                  border: `1px solid color-mix(in srgb,${OG} 45%,var(--border))`,
                                  borderRadius: 9,
                                  padding: "9px 12px",
                                  background: `color-mix(in srgb,${OG} 7%,var(--surface))`,
                                  color: OG,
                                  fontFamily: "inherit",
                                  fontWeight: 800,
                                }}
                              >
                                Prepare live update
                              </button>
                            </div>
                          )}
                      </>
                    )}
                    {cpOrders.length > 0 && (
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 11,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                            gap: 10,
                            padding: "9px 11px",
                            background: "var(--surface2)",
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            color: "var(--muted)",
                          }}
                        >
                          <span>Order</span>
                          <span>Status</span>
                          <span>Total</span>
                          <span>Created</span>
                        </div>
                        {cpOrders.slice(0, 12).map((order) => (
                          <div
                            key={order.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                              gap: 10,
                              padding: "10px 11px",
                              borderTop: "1px solid var(--border)",
                              fontSize: 12,
                            }}
                          >
                            <strong>{order.code}</strong>
                            <span>{order.status}</span>
                            <span>
                              {order.currency} {order.total.toLocaleString()}
                            </span>
                            <span>
                              {order.created_at
                                ? new Date(order.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Not supplied"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {String(cpObj.operation) === "publish_prices" &&
                      cpOperationProducts.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                            flexWrap: "wrap",
                            background: "color-mix(in srgb,#F59E0B 9%,var(--surface))",
                            border: "1px solid color-mix(in srgb,#F59E0B 35%,var(--border))",
                            borderRadius: 11,
                            padding: "13px 14px",
                          }}
                        >
                          <div style={{ maxWidth: 720, fontSize: 13.5 }}>
                            <strong>Live change confirmation required.</strong> This will publish
                            the displayed prices to {cpOperationProducts.length} connected-store
                            product{cpOperationProducts.length === 1 ? "" : "s"}. Each result is
                            recorded separately.
                          </div>
                          <button
                            onClick={publishCopilotPrices}
                            disabled={
                              cpOperationStatus === "publishing" || cpOperationStatus === "complete"
                            }
                            style={{
                              border: "none",
                              borderRadius: 9,
                              padding: "11px 15px",
                              fontFamily: "inherit",
                              fontWeight: 800,
                              color: "#fff",
                              background: cpOperationStatus === "complete" ? GN : OG,
                              cursor: cpOperationStatus === "publishing" ? "wait" : "pointer",
                            }}
                          >
                            {cpOperationStatus === "publishing"
                              ? "Publishing…"
                              : cpOperationStatus === "complete"
                                ? "Prices published"
                                : "Confirm and publish live"}
                          </button>
                        </div>
                      )}
                    {cpActionResults.length > 0 && (
                      <div style={{ display: "grid", gap: 8 }}>
                        <strong style={{ fontSize: 13 }}>Verified action results</strong>
                        {cpActionResults.map((result) => (
                          <div
                            key={`${result.sku}-${result.actionId}`}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              padding: "11px 12px",
                              display: "grid",
                              gridTemplateColumns: "minmax(150px,1fr) repeat(3,auto)",
                              gap: 12,
                              alignItems: "center",
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <strong>{result.name}</strong>
                              <div style={{ color: "var(--muted)" }}>
                                SKU {result.sku} · {result.actionId}
                              </div>
                            </div>
                            <span>
                              {result.before.toLocaleString()} → {result.target.toLocaleString()}
                            </span>
                            <span
                              style={{ color: result.confirmed ? GN : "#DC2626", fontWeight: 800 }}
                            >
                              {result.confirmed
                                ? `CONFIRMED ${result.live?.toLocaleString()}`
                                : result.rolledBack
                                  ? "ROLLED BACK"
                                  : "NOT CONFIRMED"}
                            </span>
                            <span style={{ color: "var(--muted)" }}>{result.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {cpPhase === "result" && cpObj?._type === "manager_workflow" && (
                <div
                  style={{
                    border: "1px solid color-mix(in srgb,#EF681A 28%,var(--border))",
                    borderRadius: 14,
                    padding: 20,
                    background: "var(--surface)",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: OG,
                        textTransform: "uppercase",
                      }}
                    >
                      PrizeSkout task
                    </div>
                    <h3 style={{ margin: "5px 0" }}>
                      {String(cpObj.title ?? "Prepared workflow")}
                    </h3>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      {String(cpObj.summary ?? "")}
                    </div>
                  </div>
                  {cpOperationMessage && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 9,
                        background: "var(--surface2)",
                        fontSize: 12.5,
                      }}
                    >
                      {cpOperationMessage}
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 8 }}>
                    {(Array.isArray(cpObj.steps) ? cpObj.steps : []).map((raw, index) => {
                      const step = raw as Record<string, unknown>;
                      return (
                        <div
                          key={index}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "11px 12px",
                            display: "grid",
                            gridTemplateColumns: "28px minmax(0,1fr) auto",
                            gap: 9,
                            alignItems: "start",
                          }}
                        >
                          <strong style={{ color: OG }}>{index + 1}</strong>
                          <div>
                            <strong>{String(step.title ?? step.capability)}</strong>
                            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                              {String(step.success_condition ?? "")}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 850,
                              color: step.execution === "manual_fallback" ? "#A16207" : "#087F5B",
                              textTransform: "uppercase",
                            }}
                          >
                            {workflowStepLabel(step)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    Task ID {String(cpObj.manager_task_id ?? "being prepared")} · No external action
                    is treated as complete until its success condition is verified.
                  </div>
                </div>
              )}
              {cpPhase === "result" &&
                cpObj &&
                cpObj._type !== "operation" &&
                cpObj._type !== "manager_workflow" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))",
                      gap: 16,
                      animation: "pk-in .35s ease",
                    }}
                  >
                    <div
                      style={{
                        background: `color-mix(in srgb,${OG} 6%,var(--surface))`,
                        border: `1px solid color-mix(in srgb,${OG} 24%,transparent)`,
                        borderRadius: 14,
                        padding: "20px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          color: OG,
                          textTransform: "uppercase" as const,
                        }}
                      >
                        {t.intentLabel}
                      </div>
                      <div style={{ fontSize: 18, lineHeight: 1.55, fontWeight: 600 }}>
                        "{cpPrompt}"
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                          gap: 9,
                          marginTop: 4,
                        }}
                      >
                        {[
                          [
                            "Policy",
                            String(cpObj.policy_type ?? cpObj.engine_rule ?? "Draft").replace(
                              /_/g,
                              " ",
                            ),
                          ],
                          [
                            "Scope",
                            Array.isArray(cpObj.channels) && cpObj.channels.length
                              ? cpObj.channels.join(", ")
                              : String(cpObj.target_category ?? "All products"),
                          ],
                          [
                            "Control",
                            typeof cpObj.approval_threshold_pct === "number"
                              ? `Approval above ${cpObj.approval_threshold_pct * 100}%`
                              : typeof cpObj.minimum_floor === "number"
                                ? `${cpObj.minimum_floor * 100}% margin floor`
                                : cpObj.stop_on_stale_cost
                                  ? "Stop on stale costs"
                                  : "Review required",
                          ],
                          ["Lifecycle", "Draft · not active"],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: 9,
                              padding: "9px 10px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--muted)",
                                textTransform: "uppercase",
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 12.5,
                                fontWeight: 700,
                                textTransform: "capitalize",
                              }}
                            >
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {Array.isArray(cpObj.warnings) && cpObj.warnings.length > 0 && (
                        <div
                          style={{
                            color: "#B45309",
                            background: "color-mix(in srgb,#F59E0B 10%,var(--surface))",
                            border: "1px solid color-mix(in srgb,#F59E0B 30%,var(--border))",
                            borderRadius: 9,
                            padding: "9px 11px",
                            fontSize: 12,
                          }}
                        >
                          {cpObj.warnings.map(String).join(" ")}
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          gap: 14,
                          fontSize: 13,
                          color: "var(--muted)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          {t.intent} <span style={{ color: GN }}>{t.intentResolved}</span>
                        </span>
                        <span>
                          {t.confidence} <span style={{ color: GN }}>0.97</span>
                        </span>
                        <span>{t.ambiguity} none</span>
                      </div>
                    </div>
                    <div
                      dir="ltr"
                      style={{
                        background: "var(--term)",
                        border: "1px solid var(--term-border)",
                        borderRadius: 14,
                        padding: "18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontFamily: MONO, fontSize: 13, color: "#5A6472" }}>
                          compiled.rule.json
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 12.5, color: GN }}>
                          ✓ schema v3 · 1.2s
                        </span>
                      </div>
                      <div
                        style={{
                          whiteSpace: "pre",
                          overflowX: "auto",
                          fontFamily: MONO,
                          fontSize: 14.5,
                          lineHeight: 1.7,
                        }}
                      >
                        {tokenizeJson(cpObj).map((tk, i) => (
                          <span key={i} style={{ color: tk.c }}>
                            {tk.t}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={applyConfig}
                        disabled={Array.isArray(cpObj.warnings) && cpObj.warnings.length > 0}
                        style={{
                          cursor:
                            Array.isArray(cpObj.warnings) && cpObj.warnings.length > 0
                              ? "not-allowed"
                              : "pointer",
                          marginTop: 4,
                          border: "none",
                          borderRadius: 11,
                          padding: "14px 18px",
                          fontSize: 15.5,
                          fontWeight: 800,
                          fontFamily: "inherit",
                          color: "#fff",
                          background:
                            Array.isArray(cpObj.warnings) && cpObj.warnings.length > 0
                              ? "#6B7280"
                              : applied
                                ? GN
                                : OG,
                          transition: "background .3s",
                        }}
                      >
                        {Array.isArray(cpObj.warnings) && cpObj.warnings.length > 0
                          ? "Complete the missing policy details"
                          : applied
                            ? "Draft added to Rule Book"
                            : "Add to Rule Book as draft"}
                      </button>
                    </div>
                  </div>
                )}
              {cpThread.length > 0 && cpPhase !== "idle" && (
                <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}><strong style={{ fontSize: 13.5 }}>Continue this chat</strong><span style={{ fontSize: 10, color: cpPersistenceAvailable ? GN : "var(--muted)", fontWeight: 800 }}>{cpPersistenceAvailable ? "SAVED" : "THIS SESSION"}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{cpConversations.length > 1 && <select aria-label="Open saved conversation" value={cpConversationIdRef.current ?? ""} onChange={event => void openCopilotConversation(event.target.value)} disabled={cpPhase === "loading"} style={{ maxWidth: 220, border: "1px solid var(--border)", borderRadius: 7, padding: "6px 8px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontSize: 11.5 }}><option value="">{cpConversationTitle}</option>{cpConversations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}<button type="button" onClick={startNewCopilotConversation} disabled={cpPhase === "loading"} style={{ border: 0, background: "transparent", color: "var(--muted)", fontFamily: "inherit", fontSize: 12, fontWeight: 750, cursor: cpPhase === "loading" ? "not-allowed" : "pointer" }}>New chat</button></div>
                    </div>
                    <div aria-label="Conversation history" style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 8, padding: "2px 2px 10px" }}>
                      {cpThread.map((message, index) => {
                        const structured = message.role === "assistant" && ["task", "approval", "execution", "evidence", "error"].includes(message.messageType ?? "");
                        const savedOperation = message.metadata?.operation && typeof message.metadata.operation === "object" ? message.metadata.operation as Record<string, unknown> : null;
                        const isCurrentOperation = Boolean(savedOperation && cpObj && String(savedOperation.operation ?? "") === String(cpObj.operation ?? "") && String(savedOperation.summary ?? "") === String(cpObj.summary ?? ""));
                        const isApproval = message.messageType === "approval";
                        const isExecution = message.messageType === "execution";
                        const isEvidence = message.messageType === "evidence";
                        const metrics = message.metadata?.metrics && typeof message.metadata.metrics === "object" ? message.metadata.metrics as Record<string, unknown> : null;
                        const taskCanOpen = Boolean(savedOperation && !isEvidence);
                        const status = String(message.metadata?.status ?? (isApproval ? "Waiting for your approval" : isExecution ? "Completed" : "Prepared"));
                        return (
                          <div key={`${message.role}-${index}`} style={{ justifySelf: message.role === "user" ? "end" : "start", width: structured ? "min(100%,720px)" : "auto", maxWidth: structured ? "96%" : "86%", padding: structured ? 0 : "9px 12px", borderRadius: 11, background: message.role === "user" ? OG : "var(--surface2)", color: message.role === "user" ? "#fff" : "var(--text)", border: message.role === "assistant" ? `1px solid ${isApproval ? "color-mix(in srgb,#F59E0B 45%,var(--border))" : isExecution ? "color-mix(in srgb,#10B981 40%,var(--border))" : "var(--border)"}` : "none", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflow: "hidden" }}>
                            {!structured ? message.text : <>
                              <div style={{ padding: "12px 14px", background: isApproval ? "color-mix(in srgb,#F59E0B 8%,var(--surface))" : isExecution ? "color-mix(in srgb,#10B981 7%,var(--surface))" : "var(--surface2)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                  <strong>{isApproval ? "Approval required" : isExecution ? "Task completed" : isEvidence ? "Payout reconciliation result" : message.messageType === "error" ? "Task needs attention" : "Task prepared"}</strong>
                                  <span style={{ fontSize: 10.5, fontWeight: 850, color: isExecution ? GN : isApproval ? "#A16207" : "var(--muted)", textTransform: "uppercase" }}>{status.replaceAll("_", " ")}</span>
                                </div>
                                <div style={{ marginTop: 7, color: "var(--text)" }}>{message.text}</div>
                                {savedOperation && <div style={{ marginTop: 7, fontSize: 11.5, color: "var(--muted)" }}>{String(savedOperation.platform ?? "connected store").toUpperCase()} · {String(savedOperation.operation ?? "task").replaceAll("_", " ")}</div>}
                                {metrics && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 7, marginTop: 10 }}>{Object.entries(metrics).map(([label, value]) => <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 9px", background: "var(--surface)" }}><div style={{ fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase" }}>{label.replaceAll("_", " ")}</div><strong style={{ display: "block", marginTop: 3 }}>{value == null ? "Not evidenced" : typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(value).replaceAll("_", " ")}</strong></div>)}</div>}
                              </div>
                              {(savedOperation || isExecution) && <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "var(--surface)", flexWrap: "wrap" }}>
                                {taskCanOpen && <button type="button" onClick={() => { setCpObj(savedOperation!); setCpPrompt(message.text); setCpPhase("result"); setCpOperationStatus("running"); void prepareCopilotOperation(savedOperation!); }} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>{isCurrentOperation ? "Refresh details" : "Open task"}</button>}
                                {isApproval && isCurrentOperation && cpOperationStatus === "ready" && <button type="button" onClick={() => void executeCopilotStoreWrite()} style={{ border: 0, borderRadius: 8, padding: "8px 11px", background: OG, color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: "pointer" }}>Approve and run</button>}
                                {isApproval && <button type="button" onClick={() => { setCpInput(`Change this task: `); }} style={{ border: 0, background: "transparent", color: OG, fontFamily: "inherit", fontWeight: 800, cursor: "pointer", padding: "7px 8px" }}>Request changes</button>}
                                {isExecution && <button type="button" onClick={() => setCpInput("Using the completed task above, ")} style={{ border: 0, background: "transparent", color: OG, fontFamily: "inherit", fontWeight: 800, cursor: "pointer", padding: "7px 8px" }}>Continue from this result</button>}
                                {isEvidence && message.metadata?.kind === "payout_reconciliation" && <button type="button" disabled={savingAudit || auditSaved} onClick={() => void handleSaveAudit()} style={{ border: 0, borderRadius: 8, padding: "8px 11px", background: auditSaved ? GN : OG, color: "#fff", fontFamily: "inherit", fontWeight: 850, cursor: savingAudit || auditSaved ? "default" : "pointer" }}>{auditSaved ? "Saved to history" : savingAudit ? "Saving…" : "Save audit to history"}</button>}
                                {isEvidence && <button type="button" onClick={() => setCpInput(message.metadata?.kind === "promotion_simulation" ? "Change this promotion simulation: " : "Explain this result and tell me what needs attention: ")} style={{ border: 0, background: "transparent", color: OG, fontFamily: "inherit", fontWeight: 800, cursor: "pointer", padding: "7px 8px" }}>{message.metadata?.kind === "promotion_simulation" ? "Adjust simulation" : "Explain result"}</button>}
                              </div>}
                            </>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {cpImagePreviews.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{cpImagePreviews.map(({ file, url }) => <div key={`${file.name}-${file.lastModified}`} style={{ width: 92, border: "1px solid var(--border)", borderRadius: 9, padding: 6, background: "var(--surface)" }}><img src={url} alt="Attached product preview" style={{ width: "100%", height: 66, objectFit: "cover", borderRadius: 6 }} /><div title={file.name} style={{ fontSize: 9.5, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div><button type="button" onClick={() => setCpImageAttachments(current => current.filter(item => item !== file))} style={{ border: 0, background: "transparent", color: "#B42318", fontSize: 9.5, padding: "3px 0", cursor: "pointer" }}>Remove</button></div>)}</div>}
                  {cpDocumentAttachments.length > 0 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{cpDocumentAttachments.map(file => <div key={`${file.name}-${file.lastModified}`} style={{ display: "flex", gap: 7, alignItems: "center", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 9px", background: "var(--surface)", fontSize: 11 }}><span>📄 {file.name}</span><button type="button" onClick={() => setCpDocumentAttachments(current => current.filter(item => item !== file))} style={{ border: 0, background: "transparent", color: "#B42318", cursor: "pointer" }}>×</button></div>)}</div>}
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-end", padding: 8, border: `1.5px solid color-mix(in srgb,${OG} 30%,var(--border))`, borderRadius: 13, background: "var(--surface)" }}>
                    <label title="Attach product images" style={{ flex: "0 0 auto", width: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid var(--border)", borderRadius: 9, cursor: cpPhase === "loading" ? "not-allowed" : "pointer", color: OG, fontWeight: 900, fontSize: 20 }}>+<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={cpPhase === "loading"} onChange={event => { const files = Array.from(event.target.files ?? []).filter(file => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024).slice(0, 20); setCpImageAttachments(files); event.target.value = ""; }} style={{ display: "none" }} /></label>
                    <label title="Attach payout documents" style={{ flex: "0 0 auto", width: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid var(--border)", borderRadius: 9, cursor: cpPhase === "loading" ? "not-allowed" : "pointer", color: "var(--text)", fontSize: 16 }}>📄<input type="file" multiple accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={cpPhase === "loading"} onChange={event => { setCpDocumentAttachments(Array.from(event.target.files ?? []).slice(0, 12)); event.target.value = ""; }} style={{ display: "none" }} /></label>
                    <textarea value={cpInput} onChange={(event) => setCpInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void runCopilot(cpInput); } }} rows={2} disabled={cpPhase === "loading"} placeholder="Ask a follow-up, add another instruction, or ask what was completed…" aria-label="Continue this chat" style={{ flex: 1, minWidth: 0, resize: "vertical", border: 0, outline: 0, padding: "8px 9px", background: "transparent", color: "var(--text)", fontFamily: "inherit", fontSize: 14, lineHeight: 1.45 }} />
                    <button type="button" onClick={() => void runCopilot(cpInput)} disabled={cpPhase === "loading" || !cpInput.trim()} style={{ flex: "0 0 auto", border: 0, borderRadius: 9, padding: "10px 15px", background: OG, color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: cpPhase === "loading" || !cpInput.trim() ? "not-allowed" : "pointer", opacity: cpPhase === "loading" || !cpInput.trim() ? .55 : 1 }}>{cpPhase === "loading" ? "Working…" : "Send"}</button>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Enter sends. Shift + Enter adds a new line. Attach JPG, PNG or WebP product images up to 10 MB each, and name the exact product or SKU in your message.</div>
                </div>
              )}
            </div>}

            {/* Margin Policy v1: one understandable, enforceable store policy. */}
            {sidebarNav === "defend" && <div
              data-tour="guardrails"
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>
                      Protect what you keep from every sale
                    </h2>
                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "var(--muted)",
                        fontSize: 13.5,
                        maxWidth: 720,
                      }}
                    >
                      Choose the minimum percentage you want left after product cost and channel
                      charges. This does not include rent, salaries or other business expenses.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: GN }}>
                    ACTIVE · VERSION {policyVersion}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
                    gap: 16,
                    marginTop: 22,
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 800 }}>
                    Minimum to keep from each sale
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <input
                        aria-label="Minimum to keep from each sale"
                        type="range"
                        min={5}
                        max={60}
                        value={rules[0].floor}
                        onChange={(e) => editRule(0, { floor: Number(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <strong style={{ fontSize: 20, color: OG }}>{rules[0].floor}%</strong>
                    </div>
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 800 }}>
                    Largest price increase allowed
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <input
                        aria-label="Maximum price increase"
                        type="number"
                        min={0}
                        max={100}
                        value={rules[0].maxChangePct}
                        onChange={(e) => editRule(0, { maxChangePct: Number(e.target.value) })}
                        style={{
                          width: "100%",
                          padding: 10,
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          background: "var(--surface2)",
                          color: "var(--text)",
                        }}
                      />
                      <strong>%</strong>
                    </div>
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 800 }}>
                    What should PrizeSkout do?
                    <select
                      aria-label="Approval mode"
                      value={rules[0].approvalMode}
                      onChange={(e) =>
                        editRule(0, { approvalMode: e.target.value as ApprovalMode })
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 8,
                        padding: 10,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: "var(--surface2)",
                        color: "var(--text)",
                      }}
                    >
                      <option value="recommend_only">Show suggestions — I update prices</option>
                      <option value="approval_every_change">
                        Ask me before every price change
                      </option>
                      <option value="auto_within_limit">
                        Update automatically within my limit
                      </option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 800 }}>
                    Minimum cash contribution per sale
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <input aria-label="Minimum cash contribution" type="number" min={0} step={0.5} value={rules[0].minimumContribution}
                        onChange={(e)=>editRule(0,{minimumContribution:Math.max(0,Number(e.target.value))})}
                        style={{width:"100%",padding:10,border:"1px solid var(--border)",borderRadius:8,background:"var(--surface2)",color:"var(--text)"}}/>
                      <strong>{currency}</strong>
                    </div>
                    <span style={{display:"block",fontSize:10.5,fontWeight:500,color:"var(--muted)",marginTop:4}}>Both the cash amount and percentage target must be met.</span>
                  </label>
                </div>
                <div id="channel-margin-overrides" style={{marginTop:18,borderTop:"1px solid var(--border)",paddingTop:16,scrollMarginTop:24}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                    <div><strong style={{fontSize:13.5}}>Channel-specific targets</strong><div style={{fontSize:11.5,color:"var(--muted)",marginTop:3}}>Channels without an override inherit the global policy.</div></div>
                    <select aria-label="Add channel policy" defaultValue="" onChange={e=>{const channel=e.target.value;if(!channel)return;setChannelPolicyDrafts(current=>current.some(item=>item.channel===channel)?current:[...current,{channel,servicePath:"default",floor:rules[0].floor,minimumContribution:rules[0].minimumContribution,maxChangePct:rules[0].maxChangePct,approvalMode:rules[0].approvalMode}]);e.target.value="";}}
                      style={{padding:"8px 10px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface2)",color:"var(--text)"}}>
                      <option value="">Add channel override…</option>
                      {["salla","zid","talabat","jahez","keeta","snoonu","deliveroo"].filter(channel=>!channelPolicyDrafts.some(item=>item.channel===channel)).map(channel=><option key={channel} value={channel}>{channel.toUpperCase()}</option>)}
                    </select>
                  </div>
                  {channelPolicyDrafts.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:10,marginTop:12}}>{channelPolicyDrafts.map((item,index)=><div key={`${item.channel}:${item.servicePath}`} style={{border:"1px solid var(--border)",borderRadius:10,padding:12,background:"var(--surface2)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><strong>{item.channel.toUpperCase()}</strong><button type="button" onClick={()=>setChannelPolicyDrafts(current=>current.filter((_,i)=>i!==index))} style={{border:0,background:"transparent",color:"#B42318",cursor:"pointer",fontWeight:800}}>Remove</button></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:9}}>
                      <label style={{fontSize:10.5,fontWeight:800}}>Target %<input type="number" min={1} max={99} value={item.floor} onChange={e=>setChannelPolicyDrafts(current=>current.map((row,i)=>i===index?{...row,floor:Number(e.target.value)}:row))} style={{width:"100%",boxSizing:"border-box",padding:8,border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)"}}/></label>
                      <label style={{fontSize:10.5,fontWeight:800}}>Minimum {currency}<input type="number" min={0} step={0.5} value={item.minimumContribution} onChange={e=>setChannelPolicyDrafts(current=>current.map((row,i)=>i===index?{...row,minimumContribution:Number(e.target.value)}:row))} style={{width:"100%",boxSizing:"border-box",padding:8,border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)"}}/></label>
                      <label style={{fontSize:10.5,fontWeight:800}}>Max increase %<input type="number" min={0} max={100} value={item.maxChangePct} onChange={e=>setChannelPolicyDrafts(current=>current.map((row,i)=>i===index?{...row,maxChangePct:Number(e.target.value)}:row))} style={{width:"100%",boxSizing:"border-box",padding:8,border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)"}}/></label>
                      <label style={{fontSize:10.5,fontWeight:800}}>Handling<select value={item.approvalMode} onChange={e=>setChannelPolicyDrafts(current=>current.map((row,i)=>i===index?{...row,approvalMode:e.target.value as ApprovalMode}:row))} style={{width:"100%",boxSizing:"border-box",padding:8,border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)"}}><option value="recommend_only">Suggestions only</option><option value="approval_every_change">Approval every time</option><option value="auto_within_limit">Automatic within limit</option></select></label>
                    </div>
                  </div>)}</div>}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 9,
                    background: "var(--surface2)",
                    fontSize: 12.5,
                    color: "var(--muted)",
                  }}
                >
                  Protection now: keep at least{" "}
                  <strong style={{ color: "var(--text)" }}>{persistedGlobalFloor}%</strong> from
                  each sale, keep at least <strong style={{color:"var(--text)"}}>{currency} {persistedMinimumContribution.toFixed(2)}</strong>, and never increase a price by more than{" "}
                  <strong style={{ color: "var(--text)" }}>{persistedMaxIncrease}%</strong>. Changes
                  you make here do nothing until you start the new settings.
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 9,
                    marginTop: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => void previewRule(0)}
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--surface)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    See affected products
                  </button>
                  <button
                    disabled={ruleSaving || !marginPolicyDirty}
                    onClick={() => void activateRule(0)}
                    style={{
                      padding: "10px 14px",
                      border: 0,
                      borderRadius: 8,
                      background: marginPolicyDirty ? OG : "#CBD5E1",
                      color: "white",
                      fontWeight: 800,
                      cursor: marginPolicyDirty && !ruleSaving ? "pointer" : "not-allowed",
                    }}
                  >
                    {!marginPolicyDirty
                      ? "These settings are already protecting you"
                      : ruleConfirmIndex === 0
                        ? ruleSaving
                          ? "Starting protection…"
                          : "Confirm and start protection"
                        : rulePreviewIndex === 0
                          ? "Start protecting my margin"
                          : "Review affected products"}
                  </button>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 11.5,
                    color: "var(--muted)",
                    marginTop: 7,
                  }}
                >
                  {marginPolicyDirty
                    ? rulePreviewIndex === 0
                      ? "Review complete. Continue when the changes look right."
                      : "We’ll show every affected product before asking you to confirm."
                    : "Change a setting to prepare new protection rules."}
                </div>
                {ruleConfirmIndex === 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 8,
                      background: "#FEF3C7",
                      color: "#92400E",
                      fontSize: 12.5,
                    }}
                  >
                    These settings will become active immediately. Automatic price updates happen
                    only if you selected “Update automatically within my limit.”
                  </div>
                )}
              </div>

              {rulePreviewIndex === 0 &&
                (() => {
                  const unavailable = importedProducts.filter(
                      (p) => p.inventory_status === "out_of_stock",
                    ),
                    previews = importedProducts
                      .filter((p) => p.inventory_status !== "out_of_stock")
                      .map((p) => ({ p, v: p.preview }));
                  const affected = previews.filter((x) => x.v?.floor_breached),
                    blocked = previews.filter((x) => x.v?.outcome === "blocked_missing_cost"),
                    termsRequired = previews.filter(
                      (x) => x.v?.outcome === "blocked_missing_economics",
                    ),
                    over = previews.filter((x) => ["over_limit","cannot_reach_target_within_limit"].includes(x.v?.outcome??""));
                  return (
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        padding: 22,
                      }}
                    >
                      <h3 style={{ margin: 0 }}>Products affected — nothing has changed</h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                          gap: 10,
                          marginTop: 14,
                        }}
                      >
                        {[
                          ["Products checked", previews.length - blocked.length],
                          ["Earning below target", affected.length],
                          ["Need a larger increase", over.length],
                          ["Cost needs confirmation", blocked.length],
                          ["Channel terms needed", termsRequired.length],
                          ["Unavailable excluded", unavailable.length],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              padding: 12,
                              border: "1px solid var(--border)",
                              borderRadius: 9,
                            }}
                          >
                            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{label}</div>
                            <strong style={{ fontSize: 21 }}>{value}</strong>
                          </div>
                        ))}
                      </div>
                      <div style={{ overflowX: "auto", marginTop: 16 }}>
                        <table
                          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}
                        >
                          <thead>
                            <tr>
                              {[
                                "Product",
                                "Price now",
                                "Kept now",
                                "Required for target",
                                "Allowed now",
                                "What this means",
                              ].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    textAlign: "left",
                                    padding: 9,
                                    borderBottom: "1px solid var(--border)",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previews
                              .filter(
                                (x) =>
                                  x.v?.floor_breached ||
                                  x.v?.outcome === "blocked_missing_cost" ||
                                  x.v?.outcome === "blocked_missing_economics",
                              )
                              .slice(0, 8)
                              .map(({ p, v }) => (
                                <tr key={p.sku}>
                                  <td
                                    style={{ padding: 9, borderBottom: "1px solid var(--border)" }}
                                  >
                                    <strong>{p.name_en || p.sku}</strong>
                                    <div style={{ color: "var(--muted)" }}>{p.source_platform}</div>
                                  </td>
                                  <td style={{ padding: 9 }}>
                                    {p.currency} {p.current_price.toFixed(2)}
                                  </td>
                                  <td style={{ padding: 9 }}>
                                    {(
                                      (v?.current_margin_pct ?? p.net_margin_pct ?? 0) * 100
                                    ).toFixed(1)}
                                    %
                                  </td>
                                  <td style={{ padding: 9 }}>
                                    {v?.required_price == null
                                      ? "—"
                                      : `${p.currency} ${v.required_price.toFixed(2)} (${(v.required_increase_pct * 100).toFixed(1)}%)`}
                                  </td>
                                  <td style={{ padding: 9 }}>
                                    {v?.allowed_price == null
                                      ? "—"
                                      : `${p.currency} ${v.allowed_price.toFixed(2)}`}
                                  </td>
                                  <td
                                    style={{
                                      padding: 9,
                                      color: v?.outcome === "within_limit" ? GN : "#B45309",
                                    }}
                                  >
                                    {v?.outcome === "blocked_missing_cost"
                                      ? "Confirm product cost first"
                                      : v?.outcome === "blocked_missing_economics"
                                        ? "Approve this channel's contract terms first"
                                        : ["over_limit","cannot_reach_target_within_limit"].includes(v?.outcome??"")
                                          ? "Active policy caps this increase; market acceptance is not established"
                                          : v?.outcome === "within_limit"
                                            ? "Within your active limit; review before publishing"
                                            : "No change needed"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        Required prices are calculated from confirmed product costs and channel
                        charges. They are not forecasts of what customers will pay. Products without
                        a confirmed cost or current availability are never changed automatically.
                      </p>
                    </div>
                  );
                })()}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <h3 style={{ margin: 0 }}>How we calculate it</h3>
                  <div
                    style={{
                      marginTop: 12,
                      fontFamily: MONO,
                      fontSize: 12.5,
                      lineHeight: 1.9,
                      color: "var(--muted)",
                    }}
                  >
                    Selling price
                    <br />− product cost confirmed by your store
                    <br />− channel commission and tax on fees
                    <br />− payment, delivery and promotion charges
                    <br />
                    <strong style={{ color: "var(--text)" }}>= amount kept from this sale</strong>
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Previous protection settings</h3>
                  {policyVersions.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>
                      Your first saved settings will appear here.
                    </p>
                  ) : (
                    policyVersions.slice(0, 5).map((v) => (
                      <div
                        key={v.id}
                        style={{
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 12.5,
                        }}
                      >
                        <strong>
                          Version {v.version} · keep{" "}
                          {Math.round(v.contribution_margin_floor_pct * 100)}% · increase up to{" "}
                          {Math.round(v.max_price_increase_pct * 100)}%
                        </strong>
                        <div style={{ color: "var(--muted)", marginTop: 3 }}>
                          {v.activated_by} · {new Date(v.activated_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>}

            {/* Legacy multi-rule concept retained in source for migration reference, never presented as functional. */}
            {false && (
              <div
                data-tour="guardrails"
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    boxShadow: "var(--shadow)",
                    padding: "20px 22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: 19.5 }}>Policy hierarchy</h2>
                      <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 13.5 }}>
                        Higher-priority protections win when rules overlap.
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: GN,
                        fontWeight: 800,
                        padding: "7px 11px",
                        border: `1px solid color-mix(in srgb,${GN} 28%,transparent)`,
                        borderRadius: 999,
                      }}
                    >
                      {rules.filter((rule) => rule.status === "active").length} genuinely active
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 16 }}>
                    {[
                      "Legal price limits",
                      "Product rules",
                      "Category rules",
                      "Channel rules",
                      "Global margin floor",
                      "Promotions",
                      "Rounding",
                    ].map((label, index) => (
                      <span
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          fontSize: 12.5,
                          padding: "8px 10px",
                          border: "1px solid var(--border)",
                          borderRadius: 9,
                          background: "var(--surface2)",
                        }}
                      >
                        <strong style={{ color: OG }}>{index + 1}</strong>
                        {label}
                        {index < 6 && <span style={{ color: "var(--muted)" }}>→</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 19.5 }}>Policy rules</h2>
                    <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
                      Live floor: {persistedGlobalFloor}% · Draft edits never change live pricing.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={ruleSearch}
                      onChange={(event) => setRuleSearch(event.target.value)}
                      placeholder="Search rules…"
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        padding: "9px 11px",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontFamily: "inherit",
                      }}
                    />
                    <select
                      value={ruleStatusFilter}
                      onChange={(event) =>
                        setRuleStatusFilter(event.target.value as typeof ruleStatusFilter)
                      }
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        padding: "9px 11px",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="all">All states</option>
                      {(
                        [
                          "draft",
                          "testing",
                          "scheduled",
                          "active",
                          "paused",
                          "failed",
                        ] as RuleStatus[]
                      ).map((status) => (
                        <option key={status} value={status}>
                          {status[0].toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {rules
                  .map((rule, index) => ({ rule, index }))
                  .filter(
                    ({ rule }) =>
                      (ruleStatusFilter === "all" || rule.status === ruleStatusFilter) &&
                      `${rule.name} ${rule.desc}`.toLowerCase().includes(ruleSearch.toLowerCase()),
                  )
                  .map(({ rule, index }) => {
                    const statusColor: Record<RuleStatus, string> = {
                      draft: "#6B7280",
                      testing: "#2563EB",
                      scheduled: "#7C3AED",
                      active: GN,
                      paused: "#B45309",
                      failed: "#DC2626",
                    };
                    const completeProducts = importedProducts.filter(
                      (product) => product.net_margin_pct != null,
                    );
                    const incompleteCount = importedProducts.length - completeProducts.length;
                    const increases = completeProducts.filter(
                      (product) => product.net_margin_pct! * 100 < rule.floor,
                    );
                    const largest = increases.reduce(
                      (max, product) =>
                        Math.max(
                          max,
                          product.current_price
                            ? ((product.recommended_price - product.current_price) /
                                product.current_price) *
                                100
                            : 0,
                        ),
                      0,
                    );
                    return (
                      <div
                        key={rule.name}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 16,
                          boxShadow: "var(--shadow)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "20px 22px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 16,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ minWidth: 220 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                flexWrap: "wrap",
                              }}
                            >
                              <h3 style={{ margin: 0, fontSize: 17 }}>{rule.name}</h3>
                              <span
                                style={{
                                  color: statusColor[rule.status],
                                  fontSize: 11,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  padding: "4px 8px",
                                  border: `1px solid color-mix(in srgb,${statusColor[rule.status]} 35%,transparent)`,
                                  borderRadius: 999,
                                }}
                              >
                                {rule.status}
                              </span>
                            </div>
                            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                              {rule.desc}
                            </div>
                            {rule.scope !== "global" && (
                              <div style={{ marginTop: 7, fontSize: 12, color: "#B45309" }}>
                                Not connected to live enforcement yet.
                              </div>
                            )}
                          </div>
                          <div style={{ minWidth: "min(100%,330px)", flex: "1 1 330px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <input
                                type="range"
                                min={5}
                                max={60}
                                value={rule.floor}
                                onChange={(event) =>
                                  editRule(index, { floor: Number(event.target.value) })
                                }
                                style={{ flex: 1 }}
                              />
                              <strong
                                style={{
                                  color: OG,
                                  fontSize: 20,
                                  minWidth: 54,
                                  textAlign: "right",
                                }}
                              >
                                {rule.floor}%
                              </strong>
                            </div>
                            <div style={{ marginTop: 7, fontSize: 11.5, color: "var(--muted)" }}>
                              Net contribution margin after VAT, cost and channel fees.
                            </div>
                          </div>
                        </div>

                        <details
                          style={{ borderTop: "1px solid var(--border)", padding: "14px 22px" }}
                        >
                          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 13.5 }}>
                            Safety limits and exceptions
                          </summary>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                              gap: 12,
                              marginTop: 14,
                            }}
                          >
                            {[
                              ["Max increase / update", "maxChangePct", rule.maxChangePct, "%"],
                              ["Max daily change", "dailyChangePct", rule.dailyChangePct, "%"],
                              [
                                "Manual approval above",
                                "approvalAbovePct",
                                rule.approvalAbovePct,
                                "%",
                              ],
                              ["Cooldown", "cooldownHours", rule.cooldownHours, " hours"],
                            ].map(([label, key, value, suffix]) => (
                              <label
                                key={String(key)}
                                style={{ fontSize: 11.5, color: "var(--muted)" }}
                              >
                                {label}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    marginTop: 5,
                                  }}
                                >
                                  <input
                                    type="number"
                                    min={0}
                                    value={Number(value)}
                                    onChange={(event) =>
                                      editRule(index, {
                                        [String(key)]: Number(event.target.value),
                                      } as Partial<Rule>)
                                    }
                                    style={{
                                      width: "100%",
                                      border: "1px solid var(--border)",
                                      borderRadius: 8,
                                      padding: "8px",
                                      background: "var(--surface2)",
                                      color: "var(--text)",
                                    }}
                                  />
                                  <span>{suffix}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 16,
                              flexWrap: "wrap",
                              marginTop: 14,
                              fontSize: 12.5,
                            }}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={rule.rollbackOnReject}
                                onChange={(event) =>
                                  editRule(index, { rollbackOnReject: event.target.checked })
                                }
                              />{" "}
                              Roll back if channel rejects update
                            </label>
                            <label>
                              <input
                                type="checkbox"
                                checked={rule.stopOnStaleCost}
                                onChange={(event) =>
                                  editRule(index, { stopOnStaleCost: event.target.checked })
                                }
                              />{" "}
                              Stop when cost data is stale
                            </label>
                          </div>
                        </details>

                        {rulePreviewIndex === index && (
                          <div
                            style={{
                              padding: "18px 22px",
                              borderTop: "1px solid var(--border)",
                              background: "var(--surface2)",
                            }}
                          >
                            <h4 style={{ margin: "0 0 12px" }}>Impact preview</h4>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                                gap: 10,
                              }}
                            >
                              {[
                                ["Products evaluated", completeProducts.length],
                                ["Require increases", increases.length],
                                ["Largest increase", `${Math.max(0, largest).toFixed(1)}%`],
                                ["Excluded: incomplete cost", incompleteCount],
                              ].map(([label, value]) => (
                                <div
                                  key={String(label)}
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 9,
                                    padding: "11px",
                                    background: "var(--surface)",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 10.5,
                                      color: "var(--muted)",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {label}
                                  </div>
                                  <strong style={{ display: "block", fontSize: 20, marginTop: 4 }}>
                                    {value}
                                  </strong>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
                              Estimated revenue impact is withheld until order-volume and cost
                              provenance are complete. No prices changed during this preview.
                            </div>
                          </div>
                        )}

                        {ruleConfirmIndex === index && (
                          <div
                            style={{
                              padding: "13px 22px",
                              borderTop: "1px solid var(--border)",
                              background: "color-mix(in srgb,#F59E0B 9%,var(--surface))",
                              color: "#92400E",
                              fontSize: 12.5,
                            }}
                          >
                            Confirm activation of the {rule.floor}% global floor. This creates a
                            live pricing-policy change; the previous and new values will be recorded
                            in the session audit below.
                          </div>
                        )}
                        <div
                          style={{
                            padding: "14px 22px",
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() => saveRuleDraft(index)}
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              borderRadius: 8,
                              padding: "9px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Save draft
                          </button>
                          <button
                            onClick={() => previewRule(index)}
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              borderRadius: 8,
                              padding: "9px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Preview impact
                          </button>
                          <button
                            disabled={ruleSaving || rulePreviewIndex !== index}
                            onClick={() => activateRule(index)}
                            style={{
                              border: "none",
                              background: rulePreviewIndex === index ? OG : "#CBD5E1",
                              color: "#fff",
                              borderRadius: 8,
                              padding: "9px 13px",
                              fontWeight: 800,
                              cursor: rulePreviewIndex === index ? "pointer" : "not-allowed",
                            }}
                          >
                            {ruleSaving && ruleConfirmIndex === index
                              ? "Activating…"
                              : ruleConfirmIndex === index
                                ? "Confirm activation"
                                : "Activate rule"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      padding: "20px 22px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 17 }}>Margin calculation</h3>
                    <div
                      style={{
                        marginTop: 13,
                        fontFamily: MONO,
                        fontSize: 12.5,
                        lineHeight: 2,
                        color: "var(--muted)",
                      }}
                    >
                      Selling price
                      <br />− VAT
                      <br />− product cost
                      <br />− channel commission
                      <br />− payment fee
                      <br />− fulfilment cost
                      <br />− promotional contribution
                      <br />
                      <strong style={{ color: "var(--text)" }}>
                        = net contribution and net margin
                      </strong>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: "#B45309" }}>
                      Products missing any required cost input are excluded from automatic
                      activation.
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      padding: "20px 22px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 17 }}>Policy audit trail</h3>
                    {ruleAudit.length === 0 ? (
                      <p style={{ color: "var(--muted)", fontSize: 13 }}>
                        No policy changes in this session.
                      </p>
                    ) : (
                      <div
                        style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}
                      >
                        {ruleAudit.map((entry, i) => (
                          <div
                            key={`${entry.at}-${i}`}
                            style={{
                              fontSize: 12.5,
                              borderBottom: "1px solid var(--border)",
                              paddingBottom: 9,
                            }}
                          >
                            <strong>{entry.action}</strong> · {entry.rule}
                            <div style={{ color: "var(--muted)", marginTop: 3 }}>
                              {new Date(entry.at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===== TAB: INTEGRATION VAULT ===== */}
        {tab === "vault" && (
          <section
            className="ps-db-section"
            style={{
              padding: "28px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
              animation: "pk-in .3s ease",
            }}
          >
            {/* Inbound */}
            <div data-tour="inbound" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h2 style={{ margin: 0, fontSize: 19.5, fontWeight: 800, letterSpacing: "-0.2px" }}>
                  {t.inboundTitle}
                </h2>
                <span style={{ fontSize: 15.5, color: "var(--muted)" }}>{t.inboundDesc}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
                  gap: 16,
                }}
              >
                {INBOUND_INTEGRATIONS.map((ig) => {
                  const isConnected = channelStatuses[ig.platform] === "connected";
                  const canConnect = !!ig.oauthPath;
                  return (
                    <div
                      key={ig.name}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        boxShadow: "var(--shadow)",
                        padding: "20px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: `color-mix(in srgb,${OG} 10%,var(--surface2))`,
                              border: `1px solid color-mix(in srgb,${OG} 22%,var(--border))`,
                              display: "grid",
                              placeItems: "center",
                              fontSize: 16.5,
                              fontWeight: 700,
                              color: OG,
                              flexShrink: 0,
                            }}
                          >
                            {ig.glyph}
                          </span>
                          <div>
                            <div style={{ fontSize: 16.5, fontWeight: 800 }}>{ig.name}</div>
                            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                              {ig.kind}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: isConnected ? GN : "#F59E0B",
                            animation: isConnected ? "pk-pulse 2.2s infinite" : "none",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                        {isConnected
                          ? t.inboundConnectedMsg
                          : canConnect
                            ? t.inboundAuthorizeMsg
                            : t.inboundComingSoonMsg}
                      </div>
                      {isConnected && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            dir="ltr"
                            style={{
                              fontFamily: MONO,
                              fontSize: 13.5,
                              color: GN,
                              background: `color-mix(in srgb,${GN} 8%,var(--surface2))`,
                              border: `1px solid color-mix(in srgb,${GN} 22%,transparent)`,
                              borderRadius: 9,
                              padding: "9px 12px",
                            }}
                          >
                            ✓ active
                          </div>
                          <button
                            type="button"
                            onClick={() => void syncCatalogs([ig.platform])}
                            disabled={syncingCatalog}
                            style={{
                              cursor: syncingCatalog ? "wait" : "pointer",
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "var(--text)",
                              background: "var(--surface2)",
                              border: "1px solid var(--border)",
                              borderRadius: 9,
                              padding: "9px 12px",
                              fontFamily: "inherit",
                              opacity: syncingCatalog ? 0.7 : 1,
                            }}
                          >
                            {syncingCatalog ? "Syncing…" : "Sync now"}
                          </button>
                        </div>
                      )}
                      {canConnect && !isConnected && (
                        <button
                          onClick={() => {
                            if (ig.oauthPath) void startOauthConnection(ig.oauthPath);
                          }}
                          className="ps-ig-btn"
                          style={{
                            cursor: "pointer",
                            alignSelf: "flex-start",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#fff",
                            background: OG,
                            border: `1.5px solid ${OG}`,
                            borderRadius: 10,
                            padding: "9px 14px",
                            fontFamily: "inherit",
                            transition: "border-color .2s,color .2s,background .2s",
                          }}
                        >
                          {t.connectPrefix} {ig.name}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outbound */}
            <div data-tour="outbound" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h2 style={{ margin: 0, fontSize: 19.5, fontWeight: 800, letterSpacing: "-0.2px" }}>
                  {t.outboundTitle}
                </h2>
                <span style={{ fontSize: 15.5, color: "var(--muted)" }}>{t.outboundDesc}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
                  gap: 14,
                }}
              >
                {OUTBOUND_INTEGRATIONS.map((o) => {
                  const connected = channelStatuses[o.platform] === "connected";
                  const needsShopId = connected && o.platform === "keeta" && keetaNeedsShopId;
                  return (
                    <div
                      key={o.name}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 14,
                        boxShadow: "var(--shadow)",
                        padding: "18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 16.5, fontWeight: 800 }}>{o.name}</span>
                        {needsShopId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setByokPlatform("keeta_shop_id");
                              setByokFields({});
                              setByokStatus("idle");
                              setByokError(null);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.8px",
                              background: "color-mix(in srgb,#F59E0B 12%,var(--surface))",
                              color: "#F59E0B",
                              border: "1px solid color-mix(in srgb,#F59E0B 32%,transparent)",
                              borderRadius: 6,
                              padding: "3px 8px",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {t.finishSetupBadge}
                          </button>
                        ) : connected ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.8px",
                              background: `color-mix(in srgb,${GN} 10%,var(--surface))`,
                              color: GN,
                              border: `1px solid color-mix(in srgb,${GN} 30%,transparent)`,
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            {t.live}
                          </span>
                        ) : o.byok ? (
                          <button
                            type="button"
                            onClick={() => {
                              setByokPlatform(o.platform);
                              setByokFields({});
                              setByokStatus("idle");
                              setByokError(null);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.8px",
                              background: `color-mix(in srgb,${OG} 10%,var(--surface))`,
                              color: OG,
                              border: `1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                              borderRadius: 6,
                              padding: "3px 8px",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {t.setupBadge}
                          </button>
                        ) : o.oauthPath ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (o.oauthPath) void startOauthConnection(o.oauthPath);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.8px",
                              background: `color-mix(in srgb,${OG} 10%,var(--surface))`,
                              color: OG,
                              border: `1px solid color-mix(in srgb,${OG} 30%,transparent)`,
                              borderRadius: 6,
                              padding: "3px 8px",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {t.connectPrefix}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: "0.6px",
                              color: "var(--muted)",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            {t.soonBadge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>{o.region}</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          paddingTop: 10,
                          borderTop: "1px solid var(--border)",
                          fontSize: 13,
                          color: "var(--muted)",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: needsShopId ? "#F59E0B" : connected ? GN : OG,
                            flexShrink: 0,
                            animation: connected ? "pk-pulse 2s ease infinite" : "none",
                          }}
                        />
                        {needsShopId
                          ? t.keetaShopIdPending
                          : connected
                            ? t.storeConnectedSyncing
                            : o.byok || o.oauthPath
                              ? t.tapSetupMsg
                              : t.awaitingBuildMsg}
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
          <section
            className="ps-db-section"
            style={{
              padding: "28px 30px 48px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              animation: "pk-in .3s ease",
            }}
          >
            <MerchantOperatingLoop lang={lang} mode="history" />

            <section className="ps-evidence-workspace" aria-labelledby="evidence-inbox-title">
              <div>
                <div style={{ color: OG, fontSize: 11, fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  Merchant-reviewed evidence
                </div>
                <h2 id="evidence-inbox-title" style={{ margin: "6px 0 4px", fontSize: 21, color: "var(--text)" }}>
                  Evidence Inbox
                </h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>
                  Compare extracted values with retained source documents before they enter margin, payout, or recovery calculations.
                </p>
              </div>
              <EvidenceSourceCoverage />
              <EvidenceReviewWorkspace />
            </section>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setShowHistoryExport(true)}
                disabled={downloadingHistoryPdf}
                style={{
                  cursor: downloadingHistoryPdf ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--text)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 15px",
                  opacity: downloadingHistoryPdf ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloadingHistoryPdf ? t.payoutDownloadingPdf : "Export Activity Report"}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                gap: 10,
              }}
            >
              {[
                ["Payout checks", historyPayoutChecks.length, GN],
                ["Confirmed price changes", historyConfirmedCount, GN],
                [
                  "Needs attention",
                  historyAttentionCount,
                  historyAttentionCount ? "#DC2626" : "var(--muted)",
                ],
                ["Saved investigations", historyPayoutAudits.length, OG],
              ].map(([label, value, color]) => (
                <div
                  key={String(label)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{ fontSize: 25, fontWeight: 800, color: String(color), marginTop: 5 }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(
                  [
                    ["all", "Overview"],
                    ["payout", "Payout Checks"],
                    ["repricing", "Price Changes"],
                    ["investigations", "Investigations"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHistoryView(id)}
                    style={{
                      cursor: "pointer",
                      border: `1px solid ${historyView === id ? OG : "var(--border)"}`,
                      borderRadius: 8,
                      padding: "8px 11px",
                      background:
                        historyView === id
                          ? "color-mix(in srgb,#EF681A 9%,var(--surface))"
                          : "var(--surface)",
                      color: historyView === id ? OG : "var(--text)",
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="Search product, SKU, or evidence"
                  style={{
                    flex: "1 1 250px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                  }}
                />
                <select
                  value={historyPlatform}
                  onChange={(event) => setHistoryPlatform(event.target.value)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "9px 11px",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                  }}
                >
                  <option value="all">All platforms</option>
                  <option value="zid">Zid</option>
                  <option value="talabat">Talabat</option>
                  <option value="salla">Salla</option>
                  <option value="foodics">Foodics</option>
                </select>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: "0 8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={historyNeedsAttention}
                    onChange={(event) => setHistoryNeedsAttention(event.target.checked)}
                  />
                  Needs attention only
                </label>
              </div>
            </div>

            {/* Payout Check History */}
            {(historyView === "all" || historyView === "payout") && (
              <div style={{ display: "contents" }}>
                <div
                  data-demo-tip="Every time PrizeSkout has checked what a platform actually paid against what your contract says it owed you — live-pulled or uploaded."
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    boxShadow: "var(--shadow)",
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div>
                    <h3
                      style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.2px" }}
                    >
                      {t.historyPayoutTitle}
                    </h3>
                    <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
                      {t.historyPayoutDesc}
                    </div>
                  </div>

                  {(() => {
                    // A single statement can only say "commission was 19.62%" —
                    // it can't say "that's higher than your usual." This is the
                    // one thing History has that no single Talabat statement can:
                    // a pattern across multiple months. Needs 2+ real Talabat
                    // statement checks (effective_commission_pct is only ever
                    // set by that parser) to be meaningful.
                    const rows = historyPayoutChecks.filter(
                      (r) => r.effective_commission_pct != null && r.commission_rate_pct != null,
                    );
                    if (rows.length < 2) return null;
                    const avgAgreed =
                      rows.reduce((s, r) => s + r.commission_rate_pct, 0) / rows.length;
                    const avgEffective =
                      rows.reduce((s, r) => s + (r.effective_commission_pct as number), 0) /
                      rows.length;
                    const excessTotal = rows.reduce(
                      (s, r) =>
                        s +
                        (r.sub_total_sum *
                          ((r.effective_commission_pct as number) - r.commission_rate_pct)) /
                          100,
                      0,
                    );
                    const unexplainedRows = rows.filter((r) => r.unexplained_charge != null);
                    const unexplainedTotal = unexplainedRows.reduce(
                      (s, r) => s + (r.unexplained_charge?.amount ?? 0),
                      0,
                    );
                    return (
                      <div
                        style={{
                          background: `color-mix(in srgb,${OG} 6%,var(--surface))`,
                          border: `1px solid color-mix(in srgb,${OG} 25%,transparent)`,
                          borderRadius: 12,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                          animation: "pk-in .3s ease",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--text)",
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {t.commissionTrendTitle}
                        </span>
                        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                          {t.commissionTrendRateLabel} ({t.commissionTrendAcross} {rows.length}{" "}
                          {t.commissionTrendStatements}):{" "}
                          <strong style={{ color: "var(--text)" }}>{avgAgreed.toFixed(1)}%</strong>
                          {" → "}
                          <strong style={{ color: OG }}>{avgEffective.toFixed(2)}%</strong>
                        </div>
                        {Math.abs(excessTotal) > 0.01 && (
                          <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                            {t.commissionTrendExcessLabel}:{" "}
                            <strong style={{ color: excessTotal > 0 ? "#DC2626" : GN }}>
                              {excessTotal < 0 ? "−" : ""}
                              {currency} {fmtMoney(Math.abs(excessTotal), currency)}
                            </strong>
                          </div>
                        )}
                        {unexplainedRows.length > 0 && (
                          <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                            {t.commissionTrendUnexplainedLabel}:{" "}
                            <strong style={{ color: "#B45309" }}>
                              {unexplainedRows.length}/{rows.length} · {currency}{" "}
                              {fmtMoney(unexplainedTotal, currency)}
                            </strong>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {historyLoading ? (
                    <div style={{ fontSize: 14, color: "var(--muted)" }}>{t.historyLoading}</div>
                  ) : filteredHistoryPayouts.length === 0 ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                        borderRadius: 12,
                        padding: "24px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: "var(--muted)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 15, color: "var(--muted)" }}>
                        {t.historyPayoutEmpty}
                      </span>
                      {historyPayoutChecks.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setTab("analytics")}
                          style={{
                            marginInlineStart: "auto",
                            border: 0,
                            borderRadius: 8,
                            padding: "9px 12px",
                            background: OG,
                            color: "white",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Run a Payout Check
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setHistorySearch("");
                            setHistoryPlatform("all");
                            setHistoryNeedsAttention(false);
                          }}
                          style={{
                            marginInlineStart: "auto",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "8px 11px",
                            background: "var(--surface)",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredHistoryPayouts.map((row) => {
                        const open = expandedPayoutCheckId === row.id;
                        const rowHasRates =
                          row.commission_rate_pct != null && row.effective_commission_pct != null;
                        const rowExpectedAtAgreed = rowHasRates
                          ? row.expected_payout +
                            ((row.commission_amount ?? 0) -
                              (row.sub_total_sum * (row.commission_rate_pct ?? 0)) / 100)
                          : row.expected_payout;
                        const rowShowDelta =
                          rowHasRates && Math.abs(rowExpectedAtAgreed - row.expected_payout) > 0.01;
                        return (
                          <div
                            key={row.id}
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--surface2)",
                              borderRadius: 12,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              onClick={() => setExpandedPayoutCheckId(open ? null : row.id)}
                              style={{
                                cursor: "pointer",
                                padding: "13px 16px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    flexShrink: 0,
                                    color: "var(--muted)",
                                    transition: "transform .18s",
                                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                                  }}
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      fontSize: 14.5,
                                      fontWeight: 700,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: row.source === "upload" ? "#B45309" : GN,
                                        background:
                                          row.source === "upload"
                                            ? "color-mix(in srgb,#B45309 10%,var(--surface))"
                                            : `color-mix(in srgb,${GN} 10%,var(--surface))`,
                                        border: `1px solid ${row.source === "upload" ? "color-mix(in srgb,#B45309 28%,transparent)" : `color-mix(in srgb,${GN} 28%,transparent)`}`,
                                        borderRadius: 999,
                                        padding: "3px 9px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: "50%",
                                          background: row.source === "upload" ? "#B45309" : GN,
                                        }}
                                      />
                                      {row.source === "upload"
                                        ? t.payoutCheckSourceUpload
                                        : t.payoutCheckSourceLive}
                                    </span>
                                    {PAYOUT_UPLOAD_PLATFORMS.find((p) => p.value === row.platform)
                                      ?.label ?? row.platform}
                                  </div>
                                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                    {new Date(row.created_at).toLocaleString()} · {row.order_count}{" "}
                                    {t.historyColOrders} · {row.commission_rate_pct}%
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                  style={{
                                    fontFamily: DISPLAY,
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: GN,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {currency}{" "}
                                  {fmtMoney(
                                    rowShowDelta ? rowExpectedAtAgreed : row.expected_payout,
                                    currency,
                                  )}
                                </div>
                                {confirmDeletePayoutId === row.id ? (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                                  >
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                      {t.historyDeleteConfirm}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayoutCheck(row.id)}
                                      disabled={deletingPayoutId === row.id}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#fff",
                                        background: "#DC2626",
                                        border: "none",
                                        borderRadius: 7,
                                        padding: "5px 10px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      {deletingPayoutId === row.id ? "…" : t.historyDeleteYes}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeletePayoutId(null)}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text)",
                                        background: "transparent",
                                        border: "1px solid var(--border)",
                                        borderRadius: 7,
                                        padding: "5px 10px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      {t.historyDeleteCancel}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label="Delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeletePayoutId(row.id);
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      background: "transparent",
                                      border: "none",
                                      padding: 4,
                                      display: "none",
                                      color: "var(--muted)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <svg
                                      width="15"
                                      height="15"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
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
                              <div
                                style={{
                                  padding: "0 16px 18px 16px",
                                  animation: "pk-in .2s ease",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 14,
                                  borderTop: "1px solid var(--border)",
                                  marginTop: 2,
                                  paddingTop: 16,
                                }}
                              >
                                {(row.period_start || row.period_end) && (
                                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                    {t.historyDetailPeriod}:{" "}
                                    <span style={{ color: "var(--text)", fontWeight: 600 }}>
                                      {row.period_start}
                                      {row.period_end && row.period_end !== row.period_start
                                        ? ` – ${row.period_end}`
                                        : ""}
                                    </span>
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
              </div>
            )}
            {/* Repricing History */}
            {(historyView === "all" || historyView === "repricing") && (
              <div style={{ display: "contents" }}>
                <div
                  data-demo-tip="A permanent history of price changes, including what changed, why it changed, and whether the store confirmed it."
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    boxShadow: "var(--shadow)",
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div>
                    <h3
                      style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.2px" }}
                    >
                      {t.historyRepricingTitle}
                    </h3>
                    <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
                      {t.historyRepricingDesc}
                    </div>
                  </div>
                  {historyLoading ? (
                    <div style={{ fontSize: 14, color: "var(--muted)" }}>{t.historyLoading}</div>
                  ) : filteredHistoryRepricings.length === 0 ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                        borderRadius: 12,
                        padding: "24px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: "var(--muted)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 15, color: "var(--muted)" }}>
                        {t.historyRepricingEmpty}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredHistoryRepricings.map((row) => {
                        const statusColor =
                          row.status === "confirmed"
                            ? GN
                            : row.status === "success"
                              ? "#2563EB"
                              : row.status === "failed" ||
                                  row.status === "schema_mismatch" ||
                                  row.status === "circuit_open"
                                ? "#DC2626"
                                : row.status === "rate_limited" || row.status === "timeout"
                                  ? "#B45309"
                                  : "var(--muted)";
                        const open = expandedRepricingId === row.id;
                        const snap = row.audit_snapshot ?? {};
                        const itemName = typeof snap.item_name === "string" ? snap.item_name : null;
                        const rule = typeof snap.rule === "string" ? snap.rule : null;
                        const marginBefore =
                          typeof snap.margin_before_pct === "number"
                            ? snap.margin_before_pct
                            : null;
                        const marginAfter =
                          typeof snap.margin_after_pct === "number" ? snap.margin_after_pct : null;
                        const changeAmount =
                          row.old_price == null ? null : row.new_price - row.old_price;
                        const changePct = row.old_price
                          ? (changeAmount! / row.old_price) * 100
                          : null;
                        const statusLabel: Record<string, string> = {
                          success: "Sent to platform",
                          confirmed: "Confirmed live",
                          queued: "Queued",
                          confirming: "Awaiting live confirmation",
                          rate_limited: "Failed — retrying",
                          timeout: "Failed — retrying",
                          failed: "Failed — action required",
                          schema_mismatch: "Failed — action required",
                          circuit_open: "Failed — action required",
                          rolled_back: "Rolled back",
                        };
                        return (
                          <div
                            key={row.id}
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--surface2)",
                              borderRadius: 12,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              onClick={() => setExpandedRepricingId(open ? null : row.id)}
                              style={{
                                cursor: "pointer",
                                padding: "13px 16px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    flexShrink: 0,
                                    color: "var(--muted)",
                                    transition: "transform .18s",
                                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                                  }}
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      fontSize: 14.5,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {itemName ?? row.target_channel ?? "Price change"}
                                    {row.target_channel && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 800,
                                          textTransform: "uppercase",
                                          color: "var(--muted)",
                                        }}
                                      >
                                        {row.target_channel}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                    {row.old_price != null
                                      ? `${row.currency} ${fmtMoney(row.old_price, row.currency)} → ${row.currency} ${fmtMoney(row.new_price, row.currency)}`
                                      : `${row.currency} ${fmtMoney(row.new_price, row.currency)}`}
                                    {changePct != null
                                      ? ` · ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`
                                      : ""}
                                    {row.sku ? ` · SKU ${row.sku}` : ""}
                                    <div style={{ marginTop: 3 }}>
                                      {new Date(row.created_at).toLocaleString()}
                                      {rule ? ` · ${rule}` : ""}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: statusColor,
                                    background: `color-mix(in srgb,${statusColor} 10%,var(--surface))`,
                                    border: `1px solid color-mix(in srgb,${statusColor} 28%,transparent)`,
                                    borderRadius: 999,
                                    padding: "4px 10px",
                                    textTransform: "uppercase" as const,
                                    letterSpacing: "0.03em",
                                  }}
                                >
                                  {statusLabel[row.status] ?? row.status.replace(/_/g, " ")}
                                </span>
                                {confirmDeleteRepricingId === row.id ? (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                                  >
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                      {t.historyDeleteConfirm}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRepricing(row.id)}
                                      disabled={deletingRepricingId === row.id}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#fff",
                                        background: "#DC2626",
                                        border: "none",
                                        borderRadius: 7,
                                        padding: "5px 10px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      {deletingRepricingId === row.id ? "…" : t.historyDeleteYes}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRepricingId(null)}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text)",
                                        background: "transparent",
                                        border: "1px solid var(--border)",
                                        borderRadius: 7,
                                        padding: "5px 10px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      {t.historyDeleteCancel}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label="Delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteRepricingId(row.id);
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      background: "transparent",
                                      border: "none",
                                      padding: 4,
                                      display: "none",
                                      color: "var(--muted)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <svg
                                      width="15"
                                      height="15"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
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
                              <div
                                style={{
                                  padding: "16px 16px 18px 38px",
                                  animation: "pk-in .2s ease",
                                  borderTop: "1px solid var(--border)",
                                  marginTop: 2,
                                }}
                              >
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                                    gap: 10,
                                  }}
                                >
                                  {[
                                    ...(itemName
                                      ? [{ label: t.historyDetailItem, value: itemName }]
                                      : []),
                                    ...(rule ? [{ label: t.historyDetailRule, value: rule }] : []),
                                    ...(marginBefore != null && marginAfter != null
                                      ? [
                                          {
                                            label: t.historyDetailMargin,
                                            value: `${marginBefore.toFixed(1)}% → ${marginAfter.toFixed(1)}%`,
                                          },
                                        ]
                                      : []),
                                    ...(row.duration_ms != null
                                      ? [
                                          {
                                            label: t.historyDetailDuration,
                                            value: `${row.duration_ms} ms`,
                                          },
                                        ]
                                      : []),
                                    ...(row.completed_at
                                      ? [
                                          {
                                            label: t.historyDetailCompleted,
                                            value: new Date(row.completed_at).toLocaleString(),
                                          },
                                        ]
                                      : []),
                                  ].map((f) => (
                                    <div
                                      key={f.label}
                                      style={{
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 10,
                                        padding: "11px 13px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 4,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: "var(--muted)",
                                          fontWeight: 600,
                                          textTransform: "uppercase" as const,
                                          letterSpacing: "0.04em",
                                        }}
                                      >
                                        {f.label}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 14,
                                          color: "var(--text)",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {f.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    const { exportDisputeProofPdf } =
                                      await import("@/components/dashboard/payout/exportDisputeProofPdf");
                                    await exportDisputeProofPdf({
                                      merchantName: storeName,
                                      claims: [],
                                      executions: [
                                        {
                                          time: new Date(row.created_at).toLocaleString("en-GB"),
                                          tag: statusLabel[row.status] ?? row.status,
                                          detail: `${itemName ?? row.sku ?? "Price change"} · ${row.target_channel ?? "channel"} · ${row.currency} ${row.old_price ?? "unknown"} → ${row.new_price}${rule ? ` · ${rule}` : ""}`,
                                        },
                                      ],
                                    });
                                  }}
                                  style={{
                                    marginTop: 12,
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    padding: "8px 11px",
                                    background: "var(--surface)",
                                    color: "var(--text)",
                                    fontFamily: "inherit",
                                    fontWeight: 800,
                                    fontSize: 11.5,
                                    cursor: "pointer",
                                  }}
                                >
                                  Download this action’s proof
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Commission Audit History */}
            {(historyView === "all" || historyView === "investigations") && (
              <div style={{ display: "contents" }}>
                <div
                  data-demo-tip="Every full commission audit — the workpaper with the assertion matrix, four-way evidence chain, and exceptions. Click one open to see the whole report again, exactly as first run."
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    boxShadow: "var(--shadow)",
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div>
                    <h3
                      style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.2px" }}
                    >
                      {t.historyPayoutAuditTitle}
                    </h3>
                    <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
                      {t.historyPayoutAuditDesc}
                    </div>
                  </div>
                  {historyLoading ? (
                    <div style={{ fontSize: 14, color: "var(--muted)" }}>{t.historyLoading}</div>
                  ) : filteredHistoryAudits.length === 0 ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--surface2)",
                        borderRadius: 12,
                        padding: "24px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: "var(--muted)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 15, color: "var(--muted)" }}>
                        {t.historyPayoutAuditEmpty}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredHistoryAudits.map((row) => {
                        const open = expandedPayoutAuditId === row.id;
                        const criticalCount = row.findings.filter(
                          (f) => f.severity === "critical",
                        ).length;
                        return (
                          <div
                            key={row.id}
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--surface2)",
                              borderRadius: 12,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              onClick={() => setExpandedPayoutAuditId(open ? null : row.id)}
                              style={{
                                cursor: "pointer",
                                padding: "13px 16px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    flexShrink: 0,
                                    color: "var(--muted)",
                                    transition: "transform .18s",
                                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                                  }}
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      fontSize: 14.5,
                                      fontWeight: 700,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    Payout investigation
                                    {criticalCount > 0 && (
                                      <span
                                        style={{
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          color: "#DC2626",
                                          background:
                                            "color-mix(in srgb,#DC2626 10%,var(--surface))",
                                          border:
                                            "1px solid color-mix(in srgb,#DC2626 28%,transparent)",
                                          borderRadius: 999,
                                          padding: "3px 9px",
                                        }}
                                      >
                                        {criticalCount} critical
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                    {row.document_count} evidence document
                                    {row.document_count === 1 ? "" : "s"} ·{" "}
                                    {new Date(row.created_at).toLocaleString()}
                                    {row.period_start &&
                                      ` · ${row.period_start}${row.period_end && row.period_end !== row.period_start ? ` – ${row.period_end}` : ""}`}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                                  {criticalCount > 0
                                    ? "Review required"
                                    : `${row.findings.length} finding${row.findings.length === 1 ? "" : "s"}`}
                                </div>
                                {confirmDeletePayoutAuditId === row.id ? (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                                  >
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                      {t.historyDeleteConfirm}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayoutAudit(row.id)}
                                      disabled={deletingPayoutAuditId === row.id}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#fff",
                                        background: "#DC2626",
                                        border: "none",
                                        borderRadius: 7,
                                        padding: "5px 10px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      {deletingPayoutAuditId === row.id ? "…" : t.historyDeleteYes}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeletePayoutAuditId(null)}
                                      style={{
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text)",
                                        background: "transparent",
                                        border: "1px solid var(--border)",
                                        borderRadius: 7,
                                        padding: "5px 10px",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      {t.historyDeleteCancel}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label="Delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeletePayoutAuditId(row.id);
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      background: "transparent",
                                      border: "none",
                                      padding: 4,
                                      display: "none",
                                      color: "var(--muted)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <svg
                                      width="15"
                                      height="15"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
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
                              <div
                                style={{
                                  padding: "0 16px 18px 16px",
                                  animation: "pk-in .2s ease",
                                  borderTop: "1px solid var(--border)",
                                  marginTop: 2,
                                  paddingTop: 16,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    marginBottom: 14,
                                  }}
                                >
                                  {row.documents.map((d) => (
                                    <span
                                      key={d.file_name}
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text)",
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 999,
                                        padding: "5px 12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                      title={d.description ?? undefined}
                                    >
                                      {d.file_name}
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          color: "var(--muted)",
                                          textTransform: "uppercase" as const,
                                          letterSpacing: "0.03em",
                                        }}
                                      >
                                        {d.document_type === "daily_log"
                                          ? "Daily Log"
                                          : d.document_type === "platform_transaction"
                                            ? "Platform Transactions"
                                            : d.document_type === "statement"
                                              ? "Statement"
                                              : d.document_type === "merchant_received"
                                                ? "What I Received"
                                                : "Report"}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                                <CommissionAuditPanel
                                  result={{
                                    ledger: row.ledger ?? [],
                                    ledgerTotals: row.ledger_totals,
                                    findings: row.findings,
                                    coverage: row.period_start
                                      ? {
                                          start: row.period_start,
                                          end: row.period_end ?? row.period_start,
                                        }
                                      : null,
                                    // assurance is only ever non-null for audits saved after the
                                    // history-fidelity fix — older rows fall through to the panel's
                                    // existing "not retained for this historical audit" fallback.
                                    ...(row.assurance != null
                                      ? {
                                          assurance: row.assurance,
                                          fourWay: row.four_way ?? undefined,
                                          crossCheckWindows: row.cross_check_windows ?? undefined,
                                          netSalesOverrideDocs:
                                            row.net_sales_override_docs ?? undefined,
                                        }
                                      : {}),
                                  }}
                                  currency={currency}
                                  documentCount={row.document_count}
                                  documents={
                                    row.assurance != null
                                      ? (row.documents as ClassifiedDocument[])
                                      : []
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===== TAB: SETTINGS ===== */}
        {tab === "settings" && (
          <section
            className="ps-db-section"
            style={{ padding: "28px 30px 48px", animation: "pk-in .3s ease" }}
          >
            <SettingsTabs initialTab={settingsInitialTab} />
          </section>
        )}
      </main>

      {showHistoryExport && (
        <div
          onClick={() => setShowHistoryExport(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(9,12,18,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(500px,100%)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h3 style={{ margin: 0 }}>Export Activity Report</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Choose a print-ready PDF or an editable Word document. Both include all retained
              payout checks and price changes. Values stay in their stored currency and are not
              converted.
            </p>
            <div style={{ display: "grid", gap: 8, fontSize: 13, margin: "16px 0" }}>
              {[
                `${historyPayoutChecks.length} payout checks`,
                `${historyRepricings.length} price changes`,
                `${historyPayoutAudits.length} saved investigations (listed separately in the application)`,
              ].map((label) => (
                <div
                  key={label}
                  style={{ padding: 9, border: "1px solid var(--border)", borderRadius: 8 }}
                >
                  ✓ {label}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowHistoryExport(false)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  background: "var(--surface)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowHistoryExport(false);
                  void handleDownloadHistoryPdf("word");
                }}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  background: "var(--surface)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Download Word
              </button>
              <button
                onClick={() => {
                  setShowHistoryExport(false);
                  void handleDownloadHistoryPdf("pdf");
                }}
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 12px",
                  background: OG,
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {md != null && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(9,12,18,.45)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            animation: "pk-in .2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(880px,100%)",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              boxShadow: "var(--shadow-lg)",
              padding: "26px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 20.5, fontWeight: 800, letterSpacing: "-0.3px" }}>
                  {t.bilingualTitle} {md.partner}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: GN,
                      background: `color-mix(in srgb,${GN} 10%,var(--surface))`,
                      border: `1px solid color-mix(in srgb,${GN} 26%,transparent)`,
                      borderRadius: 7,
                      padding: "5px 10px",
                    }}
                  >
                    {t.verified} {md.hash} {t.verifiedS}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.autoCompiled}</span>
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                aria-label="Close"
                style={{
                  cursor: "pointer",
                  flex: "0 0 auto",
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                  fontSize: 16.5,
                  fontWeight: 700,
                }}
              >
                {t.close}
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
                gap: 14,
              }}
            >
              <div
                dir="ltr"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: "1.3px",
                    color: "var(--muted)",
                    fontFamily: MONO,
                  }}
                >
                  {t.claimEn}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-line" }}>{md.en}</div>
              </div>
              <div
                dir="rtl"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: "1.3px",
                    color: "var(--muted)",
                    fontFamily: MONO,
                    textAlign: "start",
                  }}
                >
                  {t.claimAr}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    lineHeight: 1.9,
                    whiteSpace: "pre-line",
                    textAlign: "start",
                  }}
                >
                  {md.ar}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[`payout_${md.order.slice(1)}.csv`, "contract_excerpt.pdf", "pos_ledger.json"].map(
                (name) => (
                  <span
                    key={name}
                    dir="ltr"
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: "var(--muted)",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "6px 12px",
                    }}
                  >
                    📄 {name}
                  </span>
                ),
              )}
            </div>
            {fileStep > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  animation: "pk-in .2s ease",
                }}
              >
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg,${OG},${GN})`,
                      width: fileStep === 1 ? "34%" : fileStep === 2 ? "72%" : "100%",
                      transition: "width .8s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    color: fileStep === 3 ? GN : "var(--muted)",
                  }}
                >
                  {fileStep === 1 ? t.fileMsg1 : fileStep === 2 ? t.fileMsg2 : t.fileMsg3}
                </div>
              </div>
            )}
            <button
              onClick={fileClaim}
              style={{
                cursor: "pointer",
                border: "none",
                borderRadius: 12,
                padding: "15px 20px",
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "inherit",
                color: "#fff",
                background:
                  fileStep === 3
                    ? GN
                    : fileStep > 0
                      ? `color-mix(in srgb,${OG} 55%,var(--muted))`
                      : OG,
                transition: "background .3s",
              }}
            >
              {fileStep === 3 ? t.fileBtn3 : fileStep > 0 ? t.fileBtn1 : t.fileBtn0}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      {!isDesktop && sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(3px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              insetInlineStart: 0,
              bottom: 0,
              width: "min(284px,85vw)",
              zIndex: 51,
              background: "var(--surface2)",
              borderInlineEnd: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              padding: "22px 18px",
              boxSizing: "border-box",
              overflowY: "auto",
              animation: `${dir === "rtl" ? "pk-drawer-rtl" : "pk-drawer-ltr"} .22s ease`,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 28,
              }}
            >
              <div style={{ fontSize: 23.5, fontWeight: 800, letterSpacing: "-0.5px" }}>
                Prize<span style={{ color: OG }}>skout</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                style={{
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: 16.5,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ✕
              </button>
            </div>
            {/* Nav items */}
            <nav
              aria-label="PrizeSkout workspaces"
              style={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              {navDefs.map((item) => {
                const active = sidebarNav === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      openSidebarDestination(item);
                      setSidebarOpen(false);
                    }}
                    style={{
                      cursor: "pointer",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "10px 11px",
                      borderRadius: 9,
                      background: active
                        ? `color-mix(in srgb,${OG} 9%,var(--surface))`
                        : "transparent",
                      border: 0,
                      color: active ? "var(--text)" : "var(--muted)",
                      fontFamily: "inherit",
                      textAlign: "start",
                    }}
                  >
                    <Icon size={16} strokeWidth={1.8} color={active ? OG : "currentColor"} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 750 : 600 }}>
                      {item.label}
                    </span>
                    {!!item.badge && (
                      <span
                        style={{
                          minWidth: 20,
                          height: 20,
                          paddingInline: 5,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: OG,
                          color: "#fff",
                          fontSize: 10.5,
                          fontWeight: 800,
                        }}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            {/* Bottom section */}
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                paddingTop: 20,
              }}
            >
              {/* Currency */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 3,
                  gap: 2,
                  marginBottom: 6,
                }}
              >
                {DISPLAY_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={currency === code}
                    onClick={() => selectCurrency(code)}
                    style={{
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 0",
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: 700,
                      fontFamily: MONO,
                      background: currency === code ? OG : "transparent",
                      color: currency === code ? "#fff" : "var(--muted)",
                    }}
                  >
                    {code}
                  </button>
                ))}
              </div>
              {/* Lang */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 3,
                  gap: 2,
                  marginBottom: 8,
                }}
              >
                {(
                  [
                    ["en", "EN"],
                    ["ar", "عربية"],
                    ["fr", "FR"],
                  ] as [Lang, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setLang(id)}
                    style={{
                      cursor: "pointer",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 0",
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      background: lang === id ? "var(--text)" : "transparent",
                      color: lang === id ? "var(--bg)" : "var(--muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Settings */}
              <div
                onClick={() => {
                  setTab("settings");
                  setSidebarOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                  color: tab === "settings" ? "var(--text)" : "var(--muted)",
                  background: tab === "settings" ? "var(--border)" : "transparent",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{t.settingsLabel}</span>
              </div>
              {/* Back to site */}
              <a
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 10px",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{t.backToSite}</span>
              </a>
              <button type="button" onClick={()=>void handleSignOut()} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 10px",borderRadius:10,border:0,background:"transparent",color:"var(--muted)",fontFamily:"inherit",fontSize:14.5,fontWeight:600,cursor:"pointer",textAlign:"start"}}>
                <LogOut size={15} strokeWidth={1.8}/>Log out
              </button>
              <div style={{ height: 1, background: "var(--border)", marginBottom: 8 }} />
              {/* Defend Loop */}
              <div
                role="status"
                onClick={() => setTab("vault")}
                title={
                  defendHealth
                    ? `Checked ${new Date(defendHealth.checked_at).toLocaleTimeString()}`
                    : "Checking live operational signals"
                }
                style={{
                  border: `1px solid color-mix(in srgb,${defendHealth?.state === "active" ? GN : defendHealth?.state === "degraded" ? "#DC2626" : defendHealth?.state === "idle" ? "#B45309" : "#64748B"} 30%,transparent)`,
                  background: `color-mix(in srgb,${defendHealth?.state === "active" ? GN : defendHealth?.state === "degraded" ? "#DC2626" : defendHealth?.state === "idle" ? "#B45309" : "#64748B"} 7%,var(--surface))`,
                  borderRadius: 12,
                  padding: "13px 14px",
                  display: "flex",
                  gap: 11,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      defendHealth?.state === "active"
                        ? GN
                        : defendHealth?.state === "degraded"
                          ? "#DC2626"
                          : defendHealth?.state === "idle"
                            ? "#B45309"
                            : "#475569",
                    marginTop: 5,
                    animation: defendHealth?.state === "active" ? "pk-pulse 2s infinite" : "none",
                  }}
                />
                <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color:
                        defendHealth?.state === "active"
                          ? GN
                          : defendHealth?.state === "degraded"
                            ? "#DC2626"
                            : defendHealth?.state === "idle"
                              ? "#B45309"
                              : "#475569",
                    }}
                  >
                    {defendHealth?.label ?? "Checking Defend Loop"}
                  </span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--muted)" }}>
                    {defendHealth?.detail ?? "Checking your connected sales channels…"}
                  </span>
                </span>
              </div>
              {/* Account */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  paddingInline: 4,
                  paddingTop: 4,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: MONO,
                  }}
                >
                  {(storeName || "M").charAt(0).toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 15.5,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {storeName || t.myAccount}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* BYOK SETUP MODAL */}
      {byokPlatform &&
        (() => {
          const p = byokPlatform as string;
          const cfg = BYOK_CONFIG[p];
          const platformName =
            p === "keeta_shop_id"
              ? "Keeta"
              : (OUTBOUND_INTEGRATIONS.find((o) => o.platform === p)?.name ?? p);
          function closeByok() {
            setByokPlatform(null);
            setByokStatus("idle");
            setByokError(null);
            setByokFields({});
          }
          async function submitByok(e: React.FormEvent) {
            e.preventDefault();
            const mid = localStorage.getItem("ps_merchant_id") ?? "";
            if (!mid) {
              setByokError("No merchant session found. Please complete onboarding first.");
              return;
            }
            setByokStatus("loading");
            setByokError(null);
            const accessCode = localStorage.getItem("ps_access_code") ?? "";
            try {
              const res = await fetch("/api/channels/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  merchant_id: mid,
                  access_code: accessCode,
                  platform: p,
                  ...byokFields,
                }),
              });
              const data = (await res.json()) as { ok?: boolean; error?: string };
              if (data.ok) {
                setByokStatus("ok");
                if (p === "keeta_shop_id") {
                  setKeetaNeedsShopId(false);
                  setTimeout(() => {
                    closeByok();
                    showToast(t.keetaShopIdSaved);
                  }, 1200);
                } else {
                  setChannelStatuses((prev) => ({ ...prev, [p]: "connected" }));
                  setTimeout(() => {
                    closeByok();
                    showToast(`${platformName} store connected · prices syncing`);
                  }, 1200);
                }
              } else {
                setByokStatus("err");
                setByokError(
                  data.error ?? "Connection failed. Check your credentials and try again.",
                );
              }
            } catch {
              setByokStatus("err");
              setByokError("Network error. Please try again.");
            }
          }
          return (
            <div
              onClick={closeByok}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 70,
                background: "rgba(9,12,18,.5)",
                backdropFilter: "blur(6px)",
                display: "grid",
                placeItems: "center",
                padding: 20,
                animation: "pk-in .2s ease",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(520px,100%)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 20,
                  boxShadow: "var(--shadow-lg)",
                  padding: "28px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 22,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 19.5,
                        fontWeight: 800,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {p === "keeta_shop_id"
                        ? `${t.finishSetupBadge} · Keeta`
                        : `${t.connectPrefix} ${platformName}`}
                    </h3>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 14.5,
                        color: "var(--muted)",
                        lineHeight: 1.6,
                      }}
                    >
                      {p === "keeta_shop_id"
                        ? t.keetaShopIdPrompt
                        : `Paste your credentials from your ${platformName} partner portal. PrizeSkout uses them to push margin-safe prices to your live menu.`}
                    </p>
                  </div>
                  <button
                    onClick={closeByok}
                    aria-label="Close"
                    style={{
                      cursor: "pointer",
                      flexShrink: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--muted)",
                      fontSize: 16.5,
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {cfg ? (
                  <form
                    onSubmit={submitByok}
                    style={{ display: "flex", flexDirection: "column", gap: 16 }}
                  >
                    {cfg.fields.map((f) => (
                      <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label
                          htmlFor={`byok-${f.key}`}
                          style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
                        >
                          {f.label}
                        </label>
                        {f.hint && (
                          <span style={{ fontSize: 13, color: "var(--muted)", marginTop: -3 }}>
                            {f.hint}
                          </span>
                        )}
                        <input
                          id={`byok-${f.key}`}
                          type={f.type ?? "password"}
                          autoComplete="off"
                          required
                          value={byokFields[f.key] ?? ""}
                          onChange={(e) =>
                            setByokFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                          }
                          style={{
                            height: 44,
                            borderRadius: 9,
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text)",
                            padding: "0 13px",
                            fontSize: 15.5,
                            fontFamily: "inherit",
                            outline: "none",
                            transition: "border-color .15s",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = OG;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                          }}
                        />
                      </div>
                    ))}

                    {cfg.portalHint && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13.5,
                          color: "var(--muted)",
                          lineHeight: 1.6,
                          padding: "10px 14px",
                          background: "var(--surface2)",
                          borderRadius: 9,
                          border: "1px solid var(--border)",
                        }}
                      >
                        {cfg.portalHint}
                      </p>
                    )}

                    {byokError && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14.5,
                          color: "#EF4444",
                          fontWeight: 500,
                          padding: "10px 14px",
                          background: "rgba(239,68,68,.07)",
                          borderRadius: 9,
                          border: "1px solid rgba(239,68,68,.2)",
                        }}
                      >
                        {byokError}
                      </p>
                    )}

                    {byokStatus === "ok" && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14.5,
                          color: GN,
                          fontWeight: 600,
                          padding: "10px 14px",
                          background: `color-mix(in srgb,${GN} 8%,var(--surface))`,
                          borderRadius: 9,
                          border: `1px solid color-mix(in srgb,${GN} 25%,transparent)`,
                        }}
                      >
                        Store connected successfully
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={byokStatus === "loading" || byokStatus === "ok"}
                      style={{
                        height: 46,
                        borderRadius: 10,
                        border: "none",
                        cursor:
                          byokStatus === "loading" || byokStatus === "ok" ? "default" : "pointer",
                        background: byokStatus === "ok" ? GN : OG,
                        color: "#fff",
                        fontSize: 15.5,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        opacity: byokStatus === "loading" ? 0.75 : 1,
                        transition: "opacity .2s,background .2s",
                      }}
                    >
                      {p === "keeta_shop_id"
                        ? byokStatus === "loading"
                          ? "Saving…"
                          : byokStatus === "ok"
                            ? "Saved"
                            : "Save Shop ID"
                        : byokStatus === "loading"
                          ? "Connecting…"
                          : byokStatus === "ok"
                            ? "Connected"
                            : `Connect ${platformName}`}
                    </button>
                  </form>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        color: "var(--text)",
                        lineHeight: 1.7,
                        padding: "16px 18px",
                        background: "var(--surface2)",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {platformName} integration is coming soon. We are working with their partner
                      team to get API access. To be notified when it is ready, email us at{" "}
                      <strong>hello@prizeskout.qa</strong>.
                    </p>
                    <button
                      onClick={closeByok}
                      style={{
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid var(--border)`,
                        background: "var(--surface)",
                        color: "var(--muted)",
                        fontSize: 15.5,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Persistent support chat launcher */}
      {!supportOpen && (
        <button
          type="button"
          data-tour="support"
          aria-label={tr("Open support", "افتح الدعم", "Ouvrir l’assistance")}
          onClick={() => setSupportOpen(true)}
          style={{
            position: "fixed",
            insetInlineEnd: 24,
            bottom: toast ? 220 : 88,
            zIndex: 310,
            border: 0,
            borderRadius: 999,
            padding: "13px 18px",
            background: OG,
            color: "#fff",
            boxShadow: "0 12px 32px rgba(0,0,0,.2)",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "bottom .2s ease",
          }}
        >
          <span aria-hidden="true">●</span> {tr("Support", "الدعم", "Assistance")}
        </button>
      )}
      {assistantDrawerOpen && (
        <div
          role="presentation"
          onClick={() => setAssistantDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(9,12,18,.34)" }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={tr(
              "CFO Copilot and Shop Manager",
              "المساعد المالي ومدير المتجر",
              "Copilote financier et gestionnaire de boutique",
            )}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              insetBlock: 0,
              insetInlineEnd: 0,
              width: "min(440px,100vw)",
              boxSizing: "border-box",
              background: "var(--surface)",
              borderInlineStart: "1px solid var(--border)",
              boxShadow: "-18px 0 50px rgba(0,0,0,.16)",
              padding: "22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflowY: "auto",
              animation: "pk-in .22s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850 }}>
                  {tr(
                    "CFO Copilot and Shop Manager",
                    "المساعد المالي ومدير المتجر",
                    "Copilote financier et gestionnaire de boutique",
                  )}
                </h2>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--muted)",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}
                >
                  {tr(
                    "Delegate store work or ask CFO Copilot about profit and payouts. PrizeSkout keeps your current page open and asks before protected changes.",
                    "فوّض أعمال المتجر أو اسأل المساعد المالي عن الأرباح والمدفوعات. يبقي PrizeSkout صفحتك الحالية مفتوحة ويطلب موافقتك قبل التغييرات المحمية.",
                    "Déléguez les tâches de la boutique ou interrogez le copilote financier sur les bénéfices et les versements. PrizeSkout conserve votre page ouverte et demande votre validation avant toute modification protégée.",
                  )}
                </p>
              </div>
              <button
                type="button"
                aria-label={tr("Close assistant", "إغلاق المساعد", "Fermer l’assistant")}
                onClick={() => setAssistantDrawerOpen(false)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  width: 34,
                  height: 34,
                  background: "var(--surface2)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 13px",
                background: "var(--surface2)",
                fontSize: 12.5,
                color: "var(--muted)",
              }}
            >
              <strong style={{ color: "var(--text)" }}>{headerTitle}</strong>{" "}
              {tr(
                "context · Store changes require your approval",
                "· تتطلب تغييرات المتجر موافقتك",
                "· Les modifications de la boutique nécessitent votre validation",
              )}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {activeAssistantContext.examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setAssistantDrawerInput(example)}
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
            <textarea
              autoFocus
              value={assistantDrawerInput}
              onChange={(event) => setAssistantDrawerInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitAssistantDrawer();
                }
              }}
              placeholder={tr(
                "What should PrizeSkout handle today?",
                "ما الذي تريد من PrizeSkout إنجازه اليوم؟",
                "Que doit prendre en charge PrizeSkout aujourd’hui ?",
              )}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                border: "1.5px solid var(--border)",
                borderRadius: 12,
                padding: "13px 14px",
                background: "var(--surface)",
                color: "var(--text)",
                fontFamily: "inherit",
                fontSize: 14.5,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
            <button
              type="button"
              disabled={!assistantDrawerInput.trim() || cpPhase === "loading"}
              onClick={submitAssistantDrawer}
              style={{
                border: 0,
                borderRadius: 11,
                padding: "12px 16px",
                background: OG,
                color: "#fff",
                fontFamily: "inherit",
                fontWeight: 800,
                cursor:
                  !assistantDrawerInput.trim() || cpPhase === "loading" ? "not-allowed" : "pointer",
                opacity: !assistantDrawerInput.trim() ? 0.55 : 1,
              }}
            >
              {cpPhase === "loading" ? "Working…" : "Ask or delegate"}
            </button>
            {(cpChatMessage || cpOperationMessage || cpPhase === "loading") && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "13px 14px",
                  background: "var(--surface2)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                }}
              >
                {cpPhase === "loading"
                  ? "PrizeSkout is working on that…"
                  : (cpChatMessage ?? cpOperationMessage)}
              </div>
            )}
            {cpObj?._type === "operation" &&
              cpObj.requires_confirmation === true &&
              cpOperationStatus !== "complete" &&
              cpOperationStatus !== "failed" && (
                <button
                  type="button"
                  onClick={() => {
                    setAssistantDrawerOpen(false);
                    setTab("rules");
                    window.setTimeout(
                      () =>
                        document
                          .querySelector('[data-tour="copilot"]')
                          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                      50,
                    );
                  }}
                  style={{
                    border: `1px solid ${OG}`,
                    borderRadius: 10,
                    padding: "11px 14px",
                    background: "transparent",
                    color: OG,
                    fontFamily: "inherit",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Review and approve this action →
                </button>
              )}
            <button
              type="button"
              onClick={() => {
                setAssistantDrawerOpen(false);
                setTab("rules");
              }}
              style={{
                marginTop: "auto",
                border: 0,
                background: "transparent",
                color: "var(--muted)",
                fontFamily: "inherit",
                fontWeight: 700,
                cursor: "pointer",
                padding: 8,
              }}
            >
              Open the full assistant
            </button>
          </aside>
        </div>
      )}

      {/* PRODUCT TOUR */}
      {tourActive && (
        <ProductTour
          steps={tourSteps}
          stepIndex={tourStep}
          onStepChange={goToTourStep}
          onClose={closeTour}
          onFinish={finishTour}
          dir={dir}
          labels={{
            back: t.tourBackBtn,
            next: lang === "en" ? "Continue" : t.tourNextBtn,
            finish: lang === "en" ? "Finish setup" : t.tourFinishBtn,
            skip:
              lang === "en"
                ? "Pause and exit"
                : lang === "ar"
                  ? "إيقاف مؤقت وخروج"
                  : "Pause et quitter",
            start: lang === "en" ? "Begin setup" : t.tourStartBtn,
            setup:
              lang === "en"
                ? "FIRST VALUE SETUP"
                : lang === "ar"
                  ? "إعداد القيمة الأولى"
                  : "PREMIÈRE VALEUR",
            complete: lang === "en" ? "complete" : lang === "ar" ? "مكتمل" : "terminé",
            remaining:
              lang === "en"
                ? "About {minutes} min left"
                : lang === "ar"
                  ? "حوالي {minutes} دقيقة متبقية"
                  : "Environ {minutes} min restantes",
          }}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            insetInlineEnd: 24,
            zIndex: 320,
            background: "var(--surface)",
            border: `1px solid color-mix(in srgb,${GN} 35%,var(--border))`,
            borderRadius: 13,
            boxShadow: "var(--shadow-lg)",
            padding: "14px 18px",
            fontSize: 15,
            fontWeight: 600,
            maxWidth: "min(420px,86vw)",
            animation: "pk-toast .3s ease",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
