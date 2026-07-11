import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  ArrowRight, Sparkles, TrendingDown, TrendingUp,
  AlertTriangle, Upload, X, Zap, Target, ChevronRight,
} from "lucide-react";
import { MarginLayout } from "@/components/margin/MarginLayout";

export const Route = createFileRoute("/margin-dashboard/demo")({
  component: DemoPage,
});

const BRAND = "#10B981";
const RED   = "#EF4444";
const AMBER = "#F59E0B";
const DARK  = "#0F1A15";

// ── Period-aware headline metrics ─────────────────────────────────────────────

type Period = "30d" | "90d" | "6mo";

const PERIOD_DATA: Record<Period, {
  label: string; payout: number; avgComm: number; netMargin: number; orders: number;
  grossRevenue: number; platformFees: number; deliveryCosts: number; paymentFees: number; refunds: number;
}> = {
  "30d": {
    label: "Last 30 days",
    payout: 28440, avgComm: 29.1, netMargin: 10.8, orders: 952,
    grossRevenue: 37930, platformFees: 11040, deliveryCosts: 2870, paymentFees: 640, refunds: 850,
  },
  "90d": {
    label: "Last 90 days",
    payout: 84320, avgComm: 28.5, netMargin: 11.2, orders: 2847,
    grossRevenue: 113830, platformFees: 32430, deliveryCosts: 8620, paymentFees: 1900, refunds: 2560,
  },
  "6mo": {
    label: "Last 6 months",
    payout: 168960, avgComm: 27.8, netMargin: 12.1, orders: 5694,
    grossRevenue: 227920, platformFees: 63410, deliveryCosts: 17280, paymentFees: 3840, refunds: 4900,
  },
};

// ── Margin trend (fixed 6-month view) ─────────────────────────────────────────

const TREND = [
  { month: "Jan", margin: 9.2,  target: 15 },
  { month: "Feb", margin: 10.1, target: 15 },
  { month: "Mar", margin: 11.8, target: 15 },
  { month: "Apr", margin: 10.4, target: 15 },
  { month: "May", margin: 12.3, target: 15 },
  { month: "Jun", margin: 11.2, target: 15 },
];

// ── Channels ──────────────────────────────────────────────────────────────────

const CHANNELS = [
  { name: "Talabat",   orders: 1082, share: 38, commission: 27.0, netMargin: 8.4,  payout: 32040, grossRevenue: 43340 },
  { name: "Snoonu",    orders:  826, share: 29, commission: 18.0, netMargin: 14.1, payout: 24450, grossRevenue: 29820 },
  { name: "Noon",      orders:  626, share: 22, commission: 30.0, netMargin:  7.2, payout: 18630, grossRevenue: 25880 },
  { name: "Amazon.ae", orders:  313, share: 11, commission: 22.0, netMargin: 12.3, payout:  9200, grossRevenue: 11640 },
];

// ── Items ─────────────────────────────────────────────────────────────────────

const ITEMS = [
  { name: "Grilled Chicken Platter",  channel: "Snoonu",    orders: 412, grossRevenue: 19040, commission: 3427, netMargin: 22.1, status: "good"   },
  { name: "Shawarma Family Box",      channel: "Talabat",   orders: 389, grossRevenue: 14580, commission: 3937, netMargin: 13.6, status: "ok"     },
  { name: "Crispy Wings (10 pc)",     channel: "Talabat",   orders: 341, grossRevenue: 10918, commission: 2948, netMargin:  9.3, status: "warn"   },
  { name: "Vegetarian Combo",         channel: "Noon",      orders: 298, grossRevenue:  9534, commission: 2860, netMargin: 14.7, status: "ok"     },
  { name: "Soft Drinks Bundle",       channel: "Talabat",   orders: 277, grossRevenue:  3877, commission: 1047, netMargin: -2.4, status: "danger" },
  { name: "Breakfast Box (2 person)", channel: "Amazon.ae", orders: 214, grossRevenue:  7490, commission: 1648, netMargin: 18.8, status: "good"   },
  { name: "Kids Meal Set",            channel: "Snoonu",    orders: 198, grossRevenue:  4356, commission:  784, netMargin:  6.2, status: "warn"   },
];

// ── Opportunities ─────────────────────────────────────────────────────────────

const OPPORTUNITIES = [
  {
    icon: AlertTriangle,
    color: RED,
    bg: "#FEF2F2",
    border: "#FECACA",
    recoveryPerMonth: 532,
    effort: "Easy",
    action: "Remove Soft Drinks Bundle from Talabat",
    detail: "277 orders in 90 days × QAR 2.40 loss = QAR 1,597 recovered. Zero revenue lost — the item still runs on Snoonu at positive margin.",
  },
  {
    icon: Target,
    color: AMBER,
    bg: "#FFFBEB",
    border: "#FDE68A",
    recoveryPerMonth: 700,
    effort: "Easy",
    action: "Set a QAR 75 minimum order on Noon",
    detail: "Current avg basket on Noon is QAR 58. Raising the floor eliminates the lowest-margin micro-orders that drag your 7.2% Noon margin further down.",
  },
  {
    icon: TrendingUp,
    color: BRAND,
    bg: "#F0FDF4",
    border: "#A7F3D0",
    recoveryPerMonth: 350,
    effort: "Medium",
    action: "Push Grilled Chicken Platter to Snoonu over Talabat",
    detail: "Same item earns 22.1% net on Snoonu vs ~14% on Talabat. Shifting 200 monthly orders to Snoonu as first-sort adds QAR 350/mo in margin.",
  },
];

const TOTAL_RECOVERY = OPPORTUNITIES.reduce((s, o) => s + o.recoveryPerMonth, 0);

// ── Insights ──────────────────────────────────────────────────────────────────

const INSIGHTS = [
  {
    icon: AlertTriangle, color: RED, bg: "#FEF2F2", border: "#FECACA",
    title: "Soft Drinks Bundle loses QAR 2.40 per order on Talabat",
    body: "Talabat's 27% cut on a low-ticket item flips it negative. The fix is a 30-second menu change: disable on Talabat, keep on Snoonu where it breaks even.",
  },
  {
    icon: TrendingDown, color: AMBER, bg: "#FFFBEB", border: "#FDE68A",
    title: "Noon's 30% commission is the highest of your four channels",
    body: "Noon delivers QAR 18,630 in payout on QAR 25,880 gross — you keep just 72 fils per riyal earned. A minimum order rule would cut the worst-margin tail.",
  },
  {
    icon: TrendingUp, color: BRAND, bg: "#F0FDF4", border: "#A7F3D0",
    title: "Snoonu is your best-margin channel at 14.1% net — it's under-used",
    body: "Snoonu is only 29% of your order volume despite 18% commission. Doubling your Snoonu catalogue and Snoonu-first sort could lift blended margin by ~2pp.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, d = 0) {
  return n.toLocaleString("en-QA", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function MarginBadge({ pct }: { pct: number }) {
  const color = pct < 0 ? RED : pct < 10 ? AMBER : BRAND;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 12, fontWeight: 700, color: "#FFFFFF", backgroundColor: color,
    }}>
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function CommBadge({ pct }: { pct: number }) {
  const color = pct >= 28 ? RED : pct >= 22 ? AMBER : BRAND;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 12,
      fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}44`,
    }}>
      {pct.toFixed(1)}%
    </span>
  );
}

function EffortBadge({ label }: { label: string }) {
  const color = label === "Easy" ? BRAND : AMBER;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
      color, background: `${color}18`, border: `1px solid ${color}33`,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "#5A7A68",
      textTransform: "uppercase", letterSpacing: "0.07em",
      marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
    }}>
      {children}
    </div>
  );
}

// ── Custom tooltip for area chart ─────────────────────────────────────────────

function MarginTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #E2EDE8",
      borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontWeight: 700, color: DARK, marginBottom: 2 }}>{label}</div>
      <div style={{ color: BRAND, fontWeight: 700 }}>{payload[0].value.toFixed(1)}% net margin</div>
      <div style={{ color: "#8AAF98", marginTop: 2 }}>Target: 15%</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function DemoPage() {
  const [period, setPeriod]           = useState<Period>("90d");
  const [bannerDismissed, setBanner]  = useState(false);
  const [activeChannel, setChannel]   = useState<string | null>(null);

  const p = PERIOD_DATA[period];
  const filteredItems = activeChannel ? ITEMS.filter(i => i.channel === activeChannel) : ITEMS;

  return (
    <MarginLayout
      title="Demo"
      subtitle="Simulated view for a Qatar F&B brand — see what your data unlocks"
      action={
        <Link
          to="/margin-dashboard/upload"
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: `linear-gradient(135deg, ${BRAND}, #059669)`,
            color: "#FFFFFF", fontSize: 13, fontWeight: 700,
            padding: "9px 16px", borderRadius: 8, textDecoration: "none",
          }}
        >
          <Upload size={13} /> Use my real data
        </Link>
      }
    >

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      {!bannerDismissed && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: "linear-gradient(135deg, #0F1A15, #1A3A28)",
          border: `1px solid ${BRAND}44`, borderRadius: 10,
          padding: "14px 18px", marginBottom: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={16} color={BRAND} style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FAFAF9" }}>Demo mode · </span>
              <span style={{ fontSize: 13, color: "#6A9A7A" }}>
                Simulated data for a fictional Qatar F&B brand. Upload your CSV to see your real numbers instead.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link
              to="/margin-dashboard/upload"
              style={{
                fontSize: 12, fontWeight: 700, color: BRAND,
                background: `${BRAND}18`, border: `1px solid ${BRAND}44`,
                padding: "6px 12px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              Upload your CSV →
            </Link>
            <button
              type="button" onClick={() => setBanner(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#4A7A5A", display: "flex", padding: 4 }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Period selector ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "#5A7A68", fontWeight: 500 }}>
          Showing data for: <strong style={{ color: DARK }}>{p.label}</strong>
        </div>
        <div style={{
          display: "inline-flex", border: "1px solid #D1E8DA",
          borderRadius: 8, padding: 3, background: "#FFFFFF",
        }}>
          {(["30d", "90d", "6mo"] as Period[]).map(opt => (
            <button
              key={opt} type="button" onClick={() => setPeriod(opt)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                fontSize: 12, fontWeight: 700,
                cursor: "pointer",
                background: period === opt ? BRAND : "transparent",
                color: period === opt ? "#FFFFFF" : "#5A7A68",
                transition: "all 0.15s",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total payout received", value: `QAR ${fmt(p.payout)}`, sub: p.label + " across all channels", color: DARK },
          { label: "Avg commission rate",    value: `${p.avgComm.toFixed(1)}%`, sub: "Industry benchmark is 25% — you're above it", color: RED },
          { label: "Net margin (blended)",   value: `${p.netMargin.toFixed(1)}%`, sub: "Below 15% target — 3 channels pulling it down", color: AMBER },
          { label: "Orders analysed",        value: fmt(p.orders), sub: "Talabat, Snoonu, Noon, Amazon.ae", color: DARK },
        ].map(m => (
          <div key={m.label} style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: m.color, lineHeight: 1 }}>
              {m.value}
            </div>
            <div style={{ fontSize: 11, color: "#8AAF98", marginTop: 6 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Revenue waterfall ──────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: "20px 22px", marginBottom: 20 }}>
        <SectionLabel>Where your gross revenue goes · {p.label}</SectionLabel>
        <div style={{ fontSize: 12, color: "#8AAF98", marginBottom: 16 }}>
          QAR {fmt(p.grossRevenue)} gross → QAR {fmt(p.payout)} net payout
        </div>
        {[
          { label: "Gross Revenue",       value: p.grossRevenue,    pct: 100,                                          color: BRAND,   kind: "base" },
          { label: "Platform Commissions",value: -p.platformFees,   pct: -(p.platformFees / p.grossRevenue * 100),     color: RED,     kind: "loss" },
          { label: "Delivery & Logistics",value: -p.deliveryCosts,  pct: -(p.deliveryCosts / p.grossRevenue * 100),    color: AMBER,   kind: "loss" },
          { label: "Payment Processing",  value: -p.paymentFees,    pct: -(p.paymentFees / p.grossRevenue * 100),      color: "#94A3B8",kind:"loss" },
          { label: "Refunds & Adjustments",value: -p.refunds,       pct: -(p.refunds / p.grossRevenue * 100),          color: "#94A3B8",kind:"loss" },
          { label: "Net Payout to You",   value: p.payout,          pct: p.payout / p.grossRevenue * 100,              color: BRAND,   kind: "net"  },
        ].map((row, i) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i === 4 ? 12 : 8 }}>
            <div style={{ width: 160, fontSize: 12, color: "#3A5A4A", fontWeight: row.kind === "net" ? 700 : 400, flexShrink: 0 }}>
              {row.label}
            </div>
            <div style={{ flex: 1, height: 22, background: "#F0F7F3", borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div style={{
                width: `${Math.abs(row.pct)}%`, height: "100%",
                background: row.color, borderRadius: 4, opacity: row.kind === "loss" ? 0.75 : 1,
              }} />
            </div>
            <div style={{ width: 90, textAlign: "right", fontSize: 12, fontWeight: 700, color: row.kind === "loss" ? RED : DARK, flexShrink: 0 }}>
              {row.kind === "loss" ? "-" : ""}QAR {fmt(Math.abs(row.value))}
            </div>
            <div style={{ width: 46, textAlign: "right", fontSize: 11, color: "#8AAF98", flexShrink: 0 }}>
              {Math.abs(row.pct).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* Margin trend */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: "20px 22px" }}>
          <SectionLabel>Net margin trend · last 6 months</SectionLabel>
          <div style={{ fontSize: 11, color: "#8AAF98", marginBottom: 12 }}>
            Dashed line = 15% target. You're consistently below it.
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={TREND} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BRAND} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BRAND} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8AAF98" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8AAF98" }} axisLine={false} tickLine={false} domain={[0, 20]} tickFormatter={v => `${v}%`} />
              <Tooltip content={<MarginTooltip />} />
              <ReferenceLine y={15} stroke="#E2EDE8" strokeDasharray="4 4" label={{ value: "Target 15%", position: "insideTopRight", fontSize: 10, fill: "#8AAF98" }} />
              <Area type="monotone" dataKey="margin" stroke={BRAND} strokeWidth={2.5} fill="url(#marginGrad)" dot={{ r: 3, fill: BRAND, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel margin bar chart */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: "20px 22px" }}>
          <SectionLabel>Net margin by channel</SectionLabel>
          <div style={{ fontSize: 11, color: "#8AAF98", marginBottom: 12 }}>
            Click a bar to filter items below by that channel.
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={CHANNELS} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={28}
              onClick={(d) => d?.activePayload && setChannel(
                activeChannel === d.activePayload[0].payload.name ? null : d.activePayload[0].payload.name
              )}
            >
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8AAF98" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8AAF98" }} axisLine={false} tickLine={false} domain={[0, 20]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Net margin"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2EDE8" }} />
              <ReferenceLine y={15} stroke="#E2EDE8" strokeDasharray="4 4" />
              <Bar dataKey="netMargin" radius={[4, 4, 0, 0]} cursor="pointer">
                {CHANNELS.map(ch => (
                  <Cell
                    key={ch.name}
                    fill={ch.netMargin < 10 ? RED : ch.netMargin < 12 ? AMBER : BRAND}
                    opacity={activeChannel && activeChannel !== ch.name ? 0.35 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {activeChannel && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#5A7A68" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND, display: "inline-block" }} />
              Filtering items by {activeChannel}
              <button type="button" onClick={() => setChannel(null)} style={{ marginLeft: 4, background: "none", border: "none", cursor: "pointer", color: RED, fontSize: 11, fontWeight: 600, padding: 0 }}>Clear ×</button>
            </div>
          )}
        </div>
      </div>

      {/* ── AI insights ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel><Sparkles size={11} color={BRAND} /> What Margin sees</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {INSIGHTS.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <div key={i} style={{
                background: ins.bg, border: `1px solid ${ins.border}`,
                borderRadius: 10, padding: "14px 16px",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <Icon size={15} color={ins.color} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 3 }}>{ins.title}</div>
                  <div style={{ fontSize: 12.5, color: "#4A5568", lineHeight: 1.55 }}>{ins.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Opportunities ──────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0F1A15, #1A3A28)",
        borderRadius: 10, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Zap size={15} color={BRAND} />
              <span style={{ fontSize: 14, fontWeight: 800, color: "#FAFAF9" }}>QAR {fmt(TOTAL_RECOVERY)}/month recoverable</span>
            </div>
            <div style={{ fontSize: 12, color: "#6A9A7A" }}>
              3 specific actions identified · all low-effort · no new spend required
            </div>
          </div>
          <div style={{
            background: `${BRAND}22`, border: `1px solid ${BRAND}44`,
            borderRadius: 8, padding: "8px 14px", textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: BRAND }}>QAR {fmt(TOTAL_RECOVERY * 12)}</div>
            <div style={{ fontSize: 10, color: "#6A9A7A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Annualised recovery</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {OPPORTUNITIES.map((op, i) => {
            const Icon = op.icon;
            return (
              <div key={i} style={{
                background: op.bg, border: `1px solid ${op.border}`,
                borderRadius: 9, padding: "14px 16px",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <Icon size={14} color={op.color} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{op.action}</span>
                    <EffortBadge label={op.effort} />
                  </div>
                  <div style={{ fontSize: 12, color: "#4A5568", lineHeight: 1.55 }}>{op.detail}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: op.color }}>+QAR {fmt(op.recoveryPerMonth)}</div>
                  <div style={{ fontSize: 10, color: "#8AAF98" }}>per month</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Channel breakdown ──────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2EDE8", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Channel breakdown</div>
          <div style={{ fontSize: 11, color: "#8AAF98", marginLeft: 4 }}>Gross revenue, commissions, and net margin per aggregator</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F6FAF8" }}>
              {["Channel", "Orders", "Gross Rev (QAR)", "Commission", "Net margin", "Payout (QAR)", "Revenue share"].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch, i) => (
              <tr
                key={ch.name}
                style={{
                  borderTop: i === 0 ? "none" : "1px solid #F0F7F3",
                  background: activeChannel === ch.name ? `${BRAND}08` : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setChannel(activeChannel === ch.name ? null : ch.name)}
              >
                <td style={{ padding: "12px 14px", fontWeight: 700, color: DARK }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {ch.name}
                    {activeChannel === ch.name && <ChevronRight size={12} color={BRAND} />}
                  </div>
                </td>
                <td style={{ padding: "12px 14px", color: "#3A5A4A" }}>{fmt(ch.orders)}</td>
                <td style={{ padding: "12px 14px", color: "#3A5A4A" }}>{fmt(ch.grossRevenue)}</td>
                <td style={{ padding: "12px 14px" }}><CommBadge pct={ch.commission} /></td>
                <td style={{ padding: "12px 14px" }}><MarginBadge pct={ch.netMargin} /></td>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: DARK }}>{fmt(ch.payout)}</td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 56, height: 5, borderRadius: 3, background: "#E2EDE8", overflow: "hidden" }}>
                      <div style={{ width: `${ch.share}%`, height: "100%", background: BRAND, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#5A7A68" }}>{ch.share}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Item profitability ─────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2EDE8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Item profitability</div>
            <div style={{ fontSize: 11, color: "#8AAF98", marginTop: 2 }}>
              {activeChannel ? `Showing items for ${activeChannel} only · ` : "All channels · "}
              {filteredItems.filter(i => i.status === "danger").length > 0
                ? <span style={{ color: RED, fontWeight: 600 }}>{filteredItems.filter(i => i.status === "danger").length} item losing money</span>
                : "No loss-making items in this view"}
            </div>
          </div>
          {activeChannel && (
            <button type="button" onClick={() => setChannel(null)} style={{
              background: "none", border: `1px solid #D1E8DA`, borderRadius: 6,
              padding: "4px 10px", fontSize: 11, color: "#5A7A68", cursor: "pointer", fontWeight: 600,
            }}>
              Show all channels
            </button>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F6FAF8" }}>
              {["Item", "Channel", "Orders", "Gross Rev (QAR)", "Commission (QAR)", "Net margin"].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, i) => (
              <tr key={item.name} style={{
                borderTop: i === 0 ? "none" : "1px solid #F0F7F3",
                background: item.status === "danger" ? "#FEF2F2" : "transparent",
              }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600, color: DARK }}>{item.name}</div>
                  {item.status === "danger" && (
                    <div style={{ fontSize: 11, color: RED, marginTop: 2, fontWeight: 600 }}>⚠ Loss-maker on this channel</div>
                  )}
                </td>
                <td style={{ padding: "12px 14px", color: "#5A7A68" }}>{item.channel}</td>
                <td style={{ padding: "12px 14px", color: "#3A5A4A" }}>{fmt(item.orders)}</td>
                <td style={{ padding: "12px 14px", color: "#3A5A4A" }}>{fmt(item.grossRevenue)}</td>
                <td style={{ padding: "12px 14px", color: RED, fontWeight: 500 }}>{fmt(item.commission)}</td>
                <td style={{ padding: "12px 14px" }}><MarginBadge pct={item.netMargin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0F1A15, #1A3A28)",
        borderRadius: 12, padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#FAFAF9", marginBottom: 6 }}>
            Ready to see your real numbers?
          </div>
          <div style={{ fontSize: 13, color: "#6A9A7A", lineHeight: 1.65, maxWidth: 480 }}>
            Download your payout statement from Talabat Partner, Snoonu, Noon Seller Central, or Amazon.ae.
            Upload it here and your actual breakdown is live in under a minute.
          </div>
        </div>
        <Link
          to="/margin-dashboard/upload"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${BRAND}, #059669)`,
            color: "#FFFFFF", fontSize: 14, fontWeight: 700,
            padding: "12px 22px", borderRadius: 9, textDecoration: "none",
            boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
          }}
        >
          Upload your payout CSV <ArrowRight size={14} />
        </Link>
      </div>

    </MarginLayout>
  );
}
