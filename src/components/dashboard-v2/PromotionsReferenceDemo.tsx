// @ts-nocheck -- mechanically translated, isolated reference-only presentation model.
// Source: Promotions and Discounts.dc.html; SHA256 b0f1f8a5adf88a8b5b13f452b537a609b5531f97b738558fe05a7f5849883284
// Only mounted behind the authenticated server demo gate. No connector or write API calls.
import React, { Fragment } from "react";
import { toast } from "sonner";
import "./reference-demo.css";

const F = (n) => Math.round(n).toLocaleString("en-US");
const PL = {
  Talabat: { comm: 0.224, aov: 79.5, opd: 60 },
  Snoonu: { comm: 0.182, aov: 83.2, opd: 48 },
  Keeta: { comm: 0.165, aov: 81.0, opd: 40 },
  Jahez: { comm: 0.178, aov: 84.6, opd: 28 },
};
const COGS = 0.28,
  FEES = 0.023,
  OTHER = 0.04;
const ITEMS = [
  ["Chicken Shawarma", 22, true],
  ["Mixed Grill", 18, false],
  ["Falafel Wrap", 12, true],
  ["Family Meal", 20, false],
  ["Fattoush", 8, false],
  ["Kunafa", 10, false],
  ["Fresh Juice", 10, true],
];
const C = [
  {
    name: "Weekend 25% Off",
    dates: "Thu–Sat · since 12 Sep",
    platform: "Talabat",
    branch: "4 branches",
    discount: "25%",
    m: 60,
    orders: 842,
    revenue: 56400,
    contrib: 7280,
    before: 18.7,
    after: 12.9,
    health: 62,
    status: "Margin risk",
    reasons: [
      ["Order volume +28%", 1],
      ["Revenue +19%", 1],
      ["Contribution margin −5.8 pts", 0],
      ["Merchant funding 60% — above 50% guardrail", 0],
      ["6 low-margin SKUs included", 0],
    ],
    recs: [
      [
        "Reduce merchant contribution from 60% to 40%",
        "Requires Talabat co-funding renegotiation",
        "+QAR 5,420",
      ],
      ["Exclude 6 low-margin items", "Shawarma, Falafel Wrap & 4 beverages", "+QAR 3,980"],
    ],
    ev: "EV-84302 · Talabat orders · settlements · Odoo COGS",
    api: "Talabat API: funding & SKU changes supported · manager approval",
  },
  {
    name: "Free delivery over QAR 80",
    dates: "Always on · since 1 Aug",
    platform: "Snoonu",
    branch: "All 12",
    discount: "Delivery",
    m: 30,
    orders: 1120,
    revenue: 61200,
    contrib: 14180,
    before: 22.1,
    after: 23.2,
    health: 86,
    status: "Healthy",
    reasons: [
      ["AOV +QAR 14 vs non-promo orders", 1],
      ["Contribution margin +1.1 pts", 1],
      ["Platform funds 70%", 1],
      ["Repeat rate 41%", 1],
    ],
    recs: [
      ["Extend to Keeta with the same threshold", "Keeta AOV profile is similar", "+QAR 2,100"],
      ["Keep as-is", "No change needed", "—"],
    ],
    ev: "EV-84355 · Snoonu orders · settlements",
    api: "Snoonu API: read-only · changes via merchant portal",
  },
  {
    name: "Lunch Combo 20%",
    dates: "Sun–Thu 11–15 · since 3 Sep",
    platform: "Keeta",
    branch: "6 branches",
    discount: "20%",
    m: 50,
    orders: 634,
    revenue: 28900,
    contrib: 4920,
    before: 19.4,
    after: 17.0,
    health: 74,
    status: "Watch",
    reasons: [
      ["Order volume +22%", 1],
      ["Contribution margin −2.4 pts", 0],
      ["Funding split 50/50", 1],
      ["Fresh Juice margin −3% after discount", 0],
    ],
    recs: [
      ["Exclude Fresh Juice", "1 SKU drives 38% of margin loss", "+QAR 1,240"],
      ["Reduce discount to 15%", "Est. −6% orders", "+QAR 1,580"],
    ],
    ev: "EV-84361 · Keeta orders · Foodics COGS",
    api: "Keeta API: SKU exclusions supported · manager approval",
  },
  {
    name: "BOGO Shawarma",
    dates: "Daily · since 20 Sep",
    platform: "Talabat",
    branch: "Al Sadd, Lusail",
    discount: "BOGO",
    m: 100,
    orders: 418,
    revenue: 14600,
    contrib: -1260,
    before: 12.1,
    after: -8.6,
    health: 31,
    status: "Loss-making",
    reasons: [
      ["100% merchant-funded", 0],
      ["Shawarma margin 12.1% before discount", 0],
      ["61% of redeemers were existing weekly buyers", 0],
      ["Order volume +34%", 1],
    ],
    recs: [
      ["Pause campaign", "Stops loss immediately", "+QAR 1,260"],
      ["Switch to 15% with 40% platform funding", "Within all guardrails", "+QAR 2,050"],
    ],
    ev: "EV-84371 · Talabat orders · Odoo POS · COGS",
    api: "Talabat API: pause supported · manager approval",
  },
  {
    name: "New customer 30%",
    dates: "Ongoing · since 15 Aug",
    platform: "Jahez",
    branch: "All 12",
    discount: "30%",
    m: 40,
    orders: 296,
    revenue: 16800,
    contrib: 2950,
    before: 20.2,
    after: 17.6,
    health: 71,
    status: "Watch",
    reasons: [
      ["First-order acquisition cost QAR 9.80", 1],
      ["30-day repeat rate 23%", 0],
      ["Contribution margin −2.6 pts", 0],
    ],
    recs: [
      ["Cap first-order discount at QAR 25", "Limits high-AOV subsidy", "+QAR 860"],
      ["Keep as-is", "Acquisition cost within target", "—"],
    ],
    ev: "EV-84380 · Jahez orders",
    api: "Jahez API: read-only",
  },
  {
    name: "Family Bundle 15%",
    dates: "Weekends · since 6 Sep",
    platform: "Snoonu",
    branch: "5 branches",
    discount: "15%",
    m: 50,
    orders: 388,
    revenue: 31400,
    contrib: 6840,
    before: 22.9,
    after: 21.8,
    health: 88,
    status: "Healthy",
    reasons: [
      ["AOV QAR 81 · +34% vs baseline", 1],
      ["Contribution margin −1.1 pts only", 1],
      ["Bundle excludes low-margin SKUs", 1],
    ],
    recs: [
      ["Roll out to remaining 7 branches", "Similar demand profile", "+QAR 3,300"],
      ["Keep as-is", "No change needed", "—"],
    ],
    ev: "EV-84384 · Snoonu orders · Odoo COGS",
    api: "Snoonu API: read-only · changes via merchant portal",
  },
  {
    name: "Late night 20%",
    dates: "Daily 22–02 · since 28 Sep",
    platform: "Keeta",
    branch: "3 branches",
    discount: "20%",
    m: 70,
    orders: 212,
    revenue: 8700,
    contrib: 640,
    before: 16.8,
    after: 7.4,
    health: 44,
    status: "Margin risk",
    reasons: [
      ["Margin 7.4% — below 12% guardrail", 0],
      ["Merchant funding 70%", 0],
      ["Order volume +12% only", 0],
    ],
    recs: [
      ["Reduce merchant share to 40%", "Brings margin to 13.6%", "+QAR 1,840"],
      ["End campaign", "Volume uplift too low", "+QAR 640"],
    ],
    ev: "EV-84388 · Keeta orders · settlements",
    api: "Keeta API: funding changes supported · manager approval",
  },
];
const STATUS = {
  Healthy: ["var(--pos-bg)", "var(--pos)"],
  Watch: ["var(--warn-bg)", "var(--warn-ink)"],
  "Margin risk": ["var(--neg-bg)", "var(--neg)"],
  "Loss-making": ["var(--neg)", "#fff"],
};
const GR = [
  [
    "Minimum contribution margin",
    "Campaign margin below 12%",
    "Require approval",
    4,
    "Late night 20% · Keeta · 2h ago",
  ],
  [
    "Merchant-funded share",
    "Merchant funding above 50%",
    "Warn finance team",
    3,
    "Weekend 25% Off · today",
  ],
  [
    "SKU already below target",
    "Selected SKU margin below 18%",
    "Block promotion",
    2,
    "BOGO Shawarma · 3 days ago",
  ],
  [
    "Discount stacking",
    "2+ discounts on one order",
    "Alert ops & finance",
    61,
    "61 orders · Talabat, Keeta · 1h ago",
  ],
  [
    "Promotion cost cap",
    "Monthly cost above QAR 5,000",
    "Alert, pause at 120%",
    1,
    "Weekend 25% Off · 4 days ago",
  ],
  ["Deep discount approval", "Discount above 30%", "Require manager approval", 0, "No violations"],
];
const QA = [
  {
    q: "Which promotion is losing the most money?",
    headline: "BOGO Shawarma on Talabat lost QAR 1,260 in contribution this month.",
    drivers: [
      ["100%", "Merchant-funded — Talabat contributes nothing"],
      ["12.1%", "Shawarma margin before any discount"],
      ["61%", "Redeemers were existing weekly customers"],
    ],
    impact: "−QAR 1,260 / month",
    ev: "EV-84371 · Talabat orders · Odoo POS · COGS model",
  },
  {
    q: "What if Weekend 25% Off drops to 15%?",
    headline: "Contribution rises QAR 3,960/month; orders fall an estimated 9%.",
    drivers: [
      ["12.9→19.4%", "Campaign contribution margin"],
      ["−QAR 4,100", "Revenue (−7%)"],
      ["−QAR 8,060", "Merchant-funded promotion cost"],
    ],
    impact: "+QAR 3,960 / month",
    ev: "EV-84390 · modelled on 11 comparable Talabat campaigns",
  },
  {
    q: "Which SKUs should be excluded from the current campaign?",
    headline: "Exclude 6 SKUs from Weekend 25% Off.",
    drivers: [
      ["4.2%", "Chicken Shawarma margin after discount"],
      ["6.8%", "Falafel Wrap margin after discount"],
      ["−2.1%", "Average margin on 4 beverages"],
    ],
    impact: "+QAR 3,980 / month",
    ev: "EV-84302 · SKU-level COGS from Odoo",
  },
  {
    q: "Which promotion grows revenue but destroys margin?",
    headline: "Weekend 25% Off: revenue +19%, contribution margin −5.8 pts.",
    drivers: [
      ["+28%", "Order volume"],
      ["60%", "Merchant funding vs 50% guardrail"],
      ["6", "SKUs below 18% target margin included"],
    ],
    impact: "QAR 5,420 / month recoverable",
    ev: "EV-84302 · Talabat orders · settlements · COGS",
  },
];

export class PromotionsReferenceDemo extends React.Component {
  state = {
    filter: "All",
    sel: 0,
    rec: 0,
    approved: {},
    plat: "Talabat",
    items: [true, true, true, false, true, true, false],
    discount: 25,
    merchant: 60,
    days: 14,
    uplift: 20,
    gOn: GR.map(() => true),
    q: 0,
  };
  componentDidMount() {
    this.applyTheme();
  }
  componentDidUpdate() {
    this.applyTheme();
  }
  applyTheme() {}
  seg(a) {
    return a
      ? {
          bg: "var(--surface)",
          fg: "var(--ink)",
          sh: "0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px var(--line)",
        }
      : { bg: "transparent", fg: "var(--muted)", sh: "none" };
  }
  renderVals() {
    const s = this.state;
    const hc = (v) => (v >= 80 ? "var(--pos)" : v >= 65 ? "var(--warn-ink)" : "var(--neg)");
    const filters = ["All", "At risk", "Watch", "Healthy"].map((f) => ({
      label: f,
      ...this.seg(s.filter === f),
      pick: () => this.setState({ filter: f }),
    }));
    const match = (c) =>
      s.filter === "All" ||
      (s.filter === "At risk"
        ? c.status === "Margin risk" || c.status === "Loss-making"
        : c.status === s.filter);
    const campaigns = C.map((c, i) => ({ c, i }))
      .filter((x) => match(x.c))
      .map(({ c, i }) => {
        const active = s.sel === i;
        return {
          name: c.name,
          dates: c.dates,
          platform: c.platform,
          branch: c.branch,
          discount: c.discount,
          m: c.m,
          mBar: c.m > 50 ? "var(--neg-bar)" : "var(--brand)",
          funding: c.m + "% / " + (100 - c.m) + "%",
          orders: F(c.orders),
          revenue: F(c.revenue),
          contrib: (c.contrib < 0 ? "−" : "") + F(Math.abs(c.contrib)),
          contribC: c.contrib < 0 ? "var(--neg)" : "var(--ink)",
          before: c.before.toFixed(1) + "%",
          after: c.after.toFixed(1) + "%",
          marginC: c.after < 12 ? "var(--neg)" : c.after < 18 ? "var(--warn-ink)" : "var(--ink)",
          health: c.health,
          hC: hc(c.health),
          status: c.status,
          sBg: STATUS[c.status][0],
          sFg: STATUS[c.status][1],
          rowBg: active ? "var(--brand-bg)" : "transparent",
          rowSh: active ? "inset 3px 0 0 var(--brand)" : "none",
          select: () => this.setState({ sel: i, rec: 0 }),
        };
      });
    const c = C[s.sel];
    const h = {
      name: c.name,
      platform: c.platform,
      score: c.health,
      c: hc(c.health),
      ev: c.ev,
      api: c.api,
      segs: Array.from({ length: 10 }, (_, k) => ({
        c: k < Math.round(c.health / 10) ? hc(c.health) : "var(--surface-3)",
      })),
      reasons: c.reasons.map(([t, good]) => ({
        t,
        icon: good ? "↑" : "↓",
        bg: good ? "var(--pos-bg)" : "var(--neg-bg)",
        fg: good ? "var(--pos)" : "var(--neg)",
      })),
      recs: c.recs.map(([title, note, impact], k) => ({
        title,
        note,
        impact,
        ring: s.rec === k ? 4 : 0,
        sh: s.rec === k ? "0 0 0 1.5px var(--brand)" : "0 0 0 1px var(--line)",
        pick: () => this.setState({ rec: k }),
      })),
    };
    const key = s.sel + "-" + s.rec;
    // simulator
    const P = PL[s.plat];
    const share = ITEMS.reduce((a, it, k) => a + (s.items[k] ? it[1] : 0), 0) / 100;
    const d = s.discount / 100,
      m = s.merchant / 100,
      u = s.uplift / 100;
    const baseRate = 1 - COGS - P.comm - FEES - OTHER;
    const O0 = P.opd * s.days,
      O1 = O0 * (1 + u);
    const R0 = O0 * P.aov,
      R1 = O1 * P.aov;
    const promo = R1 * share * d * m;
    const C0 = R0 * baseRate,
      C1 = R1 * baseRate - promo;
    const M0 = C0 / R0,
      M1 = C1 / R1;
    const denom = baseRate - share * d * m;
    const be = denom > 0 ? baseRate / denom - 1 : null;
    const pct = (a, b) => {
      const v = ((b - a) / Math.abs(a)) * 100;
      return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%";
    };
    const row = (label, a, b, good, opt = {}) => ({
      label,
      base: opt.fmt ? opt.fmt(a) : F(a),
      proj: opt.fmt ? opt.fmt(b) : F(b),
      delta: opt.dl ? opt.dl(a, b) : a === 0 ? "—" : pct(a, b),
      dC: good === null ? "var(--muted)" : b >= a === good ? "var(--pos)" : "var(--neg)",
      w: opt.bold ? 600 : 400,
      bg: "transparent",
    });
    const profitOk = C1 >= C0;
    const lowSkus = ITEMS.filter((it, k) => s.items[k] && it[2]).length;
    const checks = [
      {
        t: "Contribution margin ≥ 12%",
        ok: M1 >= 0.12,
        s: M1 >= 0.12 ? "Pass" : "Requires approval",
      },
      { t: "Merchant funding ≤ 50%", ok: m <= 0.5, s: m <= 0.5 ? "Pass" : "Finance notified" },
      {
        t: "No SKUs below 18% target margin",
        ok: lowSkus === 0,
        s: lowSkus === 0 ? "Pass" : lowSkus + " SKU" + (lowSkus > 1 ? "s" : "") + " blocked",
      },
      { t: "Discount ≤ 30%", ok: d <= 0.3, s: d <= 0.3 ? "Pass" : "Manager approval" },
    ].map((g) => ({
      ...g,
      c: g.ok ? "var(--pos)" : "var(--neg)",
      c2: g.ok ? "var(--muted)" : "var(--neg)",
    }));
    const out = {
      days: s.days,
      breakeven: be === null ? "unreachable" : Math.round(be * 100) + "%",
      verdict: profitOk
        ? "Profit positive at expected uplift"
        : R1 > R0
          ? "Revenue positive. Profit negative."
          : "Revenue and profit negative",
      vBg: profitOk ? "var(--pos-bg)" : "var(--neg-bg)",
      vC: profitOk ? "var(--pos)" : "var(--neg)",
      verdictNote: profitOk
        ? `Expected uplift of ${s.uplift}% clears break-even. Projected contribution +QAR ${F(C1 - C0)}.`
        : `Expected uplift of ${s.uplift}% falls short. Projected contribution −QAR ${F(C0 - C1)} over ${s.days} days.`,
      rows: [
        row("Orders", O0, O1, true),
        row("Gross revenue", R0, R1, true),
        row("COGS", R0 * COGS, R1 * COGS, false),
        row("Platform commission & fees", R0 * (P.comm + FEES), R1 * (P.comm + FEES), false),
        row("Merchant promotion cost", 0, promo, false),
        { ...row("Contribution profit", C0, C1, true, { bold: true }), bg: "var(--surface-2)" },
        row("Contribution margin", M0, M1, true, {
          fmt: (v) => (v * 100).toFixed(1) + "%",
          dl: (a, b) =>
            ((b - a) * 100 >= 0 ? "+" : "−") + Math.abs((b - a) * 100).toFixed(1) + " pts",
          bold: true,
        }),
      ],
      checks,
    };
    const mk = (label, k, min, max, step, fmt) => ({
      label,
      min,
      max,
      step,
      value: s[k],
      display: fmt(s[k]),
      set: (e) => this.setState({ [k]: Number(e.target.value) }),
    });
    const sliders = [
      mk("Discount", "discount", 5, 50, 1, (v) => v + "%"),
      mk(
        "Merchant-funded share",
        "merchant",
        0,
        100,
        5,
        (v) => v + "% merchant · " + (100 - v) + "% platform",
      ),
      mk("Expected order uplift", "uplift", 0, 80, 1, (v) => "+" + v + "%"),
      mk("Duration", "days", 7, 60, 1, (v) => v + " days"),
    ];
    const items = ITEMS.map(([name, sh, low], k) => {
      const on = s.items[k];
      return {
        label: (low ? "⚠ " : "") + name,
        bg: on ? "var(--ink)" : "transparent",
        fg: on ? "var(--surface)" : "var(--muted)",
        sh: on ? "none" : "inset 0 0 0 1px var(--line)",
        toggle: () =>
          this.setState((st) => {
            const a = st.items.slice();
            a[k] = !a[k];
            return { items: a };
          }),
      };
    });
    const guardrails = GR.map(([name, cond, action, hits, last], k) => ({
      name,
      cond,
      action,
      hits: String(hits),
      last,
      hC: hits ? "var(--ink)" : "var(--faint)",
      tBg: s.gOn[k] ? "var(--pos)" : "var(--surface-3)",
      tX: s.gOn[k] ? 14 : 2,
      toggle: () =>
        this.setState((st) => {
          const a = st.gOn.slice();
          a[k] = !a[k];
          return { gOn: a };
        }),
    }));
    const qa = QA[s.q];
    return {
      filters,
      campaigns,
      h,
      guardrails,
      sliders,
      items,
      out,
      itemShare: Math.round(share * 100) + "%",
      platOpts: Object.keys(PL).map((p) => ({
        label: p,
        ...this.seg(s.plat === p),
        pick: () => this.setState({ plat: p }),
      })),
      approvalLabel: "Request approval",
      requestApproval: () => toast.info("Preview only — no approval request was sent."),
      simulateSel: () => {
        const dm = parseInt(c.discount);
        this.setState({ plat: c.platform, merchant: c.m, discount: isNaN(dm) ? s.discount : dm });
      },
      questions: QA.map((x, i) => ({
        q: x.q,
        bg: s.q === i ? "var(--panel-ink)" : "transparent",
        fg: s.q === i ? "var(--panel)" : "var(--panel-ink)",
        pick: () => this.setState({ q: i }),
      })),
      answer: {
        headline: qa.headline,
        impact: qa.impact,
        ev: qa.ev,
        drivers: qa.drivers.map(([v, label]) => ({ v, label })),
      },
    };
  }
  render() {
    const {
      filters,
      campaigns,
      h,
      guardrails,
      sliders,
      items,
      out,
      itemShare,
      platOpts,
      approvalLabel,
      requestApproval,
      simulateSel,
      questions,
      answer,
    } = this.renderVals();
    return (
      <div className={"ps-reference-demo"}>
        {"\n    "}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "24px",
          }}
        >
          {"\n      "}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {"\n        "}
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              {"Commercial · Promotions & Discounts · Last 30 days"}
            </div>
            {"\n        "}
            <h1
              style={{
                margin: "0",
                fontSize: "26px",
                fontWeight: "400",
                letterSpacing: "-0.025em",
                lineHeight: "1.25",
                textWrap: "pretty",
              }}
            >
              {"14 campaigns generated QAR 231K in revenue. "}
              <span style={{ color: "var(--muted)" }}>
                {"3 are growing revenue while shrinking contribution."}
              </span>
            </h1>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{ display: "flex", gap: "8px" }}>
            {"\n        "}
            <a
              href={"#guardrails"}
              style={{
                whiteSpace: "nowrap",
                padding: "8px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                background: "var(--surface)",
                color: "var(--ink)",
                boxShadow: "inset 0 0 0 1px var(--line)",
                textDecoration: "none",
              }}
            >
              {"Guardrails"}
            </a>
            {"\n        "}
            <a
              href={"#simulator"}
              style={{
                whiteSpace: "nowrap",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "500",
                background: "var(--ink)",
                color: "var(--surface)",
                textDecoration: "none",
              }}
            >
              {"Simulate campaign"}
            </a>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n\n    "}
        <section
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr)",
            overflow: "hidden",
            boxShadow: "var(--card-sh)",
          }}
        >
          {"\n      "}
          <div
            style={{
              padding: "26px 30px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              borderRight: "1px solid var(--line)",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {"\n          "}
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--muted)",
                }}
              >
                {"Incremental contribution from promotions"}
              </span>
              {"\n          "}
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"vs no-promotion baseline"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "20px", color: "var(--muted)" }}>{"QAR"}</span>
              <span
                style={{
                  fontSize: "72px",
                  lineHeight: "0.95",
                  fontWeight: "400",
                  letterSpacing: "-0.045em",
                }}
              >
                {"28,600"}
              </span>
            </div>
            {"\n        "}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
              {"\n          "}
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  flexShrink: "0",
                  background: "var(--neg-bg)",
                  color: "var(--neg)",
                  fontWeight: "600",
                }}
              >
                {"↓ 12.4%"}
              </span>
              {"\n          "}
              <span style={{ color: "var(--muted)" }}>
                {"Each QAR 1 of merchant spend returned "}
                <b style={{ color: "var(--ink-2)", fontWeight: "600" }}>{"QAR 0.67"}</b>
                {" in contribution"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {"\n          "}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--muted)",
                }}
              >
                <span>{"Who funds the discounts · QAR 74,100"}</span>
                <span>{"Guardrail: merchant ≤ 50%"}</span>
              </div>
              {"\n          "}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  height: "10px",
                  borderRadius: "5px",
                  overflow: "hidden",
                  gap: "2px",
                }}
              >
                {"\n            "}
                <div style={{ width: "57.8%", background: "var(--brand)" }}></div>
                <div style={{ width: "42.2%", background: "var(--surface-3)" }}></div>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{ position: "relative", height: "0" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "-16px",
                    width: "1px",
                    height: "12px",
                    background: "var(--ink)",
                  }}
                ></div>
              </div>
              {"\n          "}
              <div
                style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--muted)" }}
              >
                {"\n            "}
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: "var(--brand)",
                    }}
                  ></span>
                  {"Merchant-funded QAR 42,840 · 57.8%"}
                </span>
                {"\n            "}
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: "var(--surface-3)",
                    }}
                  ></span>
                  {"Platform-funded QAR 31,260"}
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gridTemplateRows: "repeat(2,1fr)",
            }}
          >
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--line)",
                borderRight: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--muted)",
                }}
              >
                {"Active promotions"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"14"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"4 platforms · 3 scheduled"}
              </span>
            </div>
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--line)",
                borderRight: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--muted)",
                }}
              >
                {"Revenue generated"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"231.4K"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"12.6% of gross sales"}
              </span>
            </div>
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--muted)",
                }}
              >
                {"Avg promotion margin"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"17.2%"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"vs 43.2% overall · target 18%"}
              </span>
            </div>
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                borderRight: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--muted)",
                }}
              >
                {"Merchant-funded spend"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"42,840"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"Feeds Profit bridge · Promotions"}
              </span>
            </div>
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                borderRight: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--muted)",
                }}
              >
                {"Platform-funded spend"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"31,260"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"Talabat co-funds 40% max"}
              </span>
            </div>
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                background: "var(--neg-bg)",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--neg)",
                }}
              >
                {"Campaigns at risk"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"3"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--ink-2)" }}>
                {"QAR 9,420 margin at risk / month"}
              </span>
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </section>
        {"\n\n    "}
        <section
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            boxShadow: "var(--card-sh)",
            padding: "22px 0 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {"\n      "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "0 24px 14px",
              gap: "24px",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {"\n          "}
              <h2
                style={{
                  margin: "0",
                  fontSize: "16px",
                  fontWeight: "500",
                  letterSpacing: "-0.01em",
                }}
              >
                {"Campaigns"}
              </h2>
              {"\n          "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                {
                  "Synced from Snoonu, Talabat, Keeta & Jahez · select a campaign for its health score"
                }
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                display: "flex",
                background: "var(--surface-2)",
                borderRadius: "8px",
                padding: "2px",
                gap: "2px",
              }}
            >
              {"\n          "}
              {filters.map((f, index12) => (
                <Fragment key={index12}>
                  {"\n            "}
                  <button
                    onClick={f.pick}
                    style={{
                      border: "0",
                      cursor: "pointer",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: f.bg,
                      color: f.fg,
                      boxShadow: f.sh,
                    }}
                  >
                    {f.label}
                  </button>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0,1.9fr) 64px minmax(0,0.9fr) 64px minmax(0,1.1fr) 56px 72px 76px minmax(0,1fr) 48px 96px",
              gap: "12px",
              padding: "8px 24px",
              fontSize: "10.5px",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--faint)",
              borderTop: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
              background: "transparent",
            }}
          >
            {"\n        "}
            <span>{"Campaign"}</span>
            <span>{"Platform"}</span>
            <span>{"Branch"}</span>
            <span>{"Discount"}</span>
            <span>{"Funding · merchant / platform"}</span>
            <span style={{ textAlign: "right" }}>{"Orders"}</span>
            <span style={{ textAlign: "right" }}>{"Revenue"}</span>
            <span style={{ textAlign: "right" }}>{"Contribution"}</span>
            <span>{"Margin · before → after"}</span>
            <span style={{ textAlign: "right" }}>{"Health"}</span>
            <span style={{ textAlign: "right" }}>{"Status"}</span>
            {"\n      "}
          </div>
          {"\n      "}
          {campaigns.map((c, index13) => (
            <Fragment key={index13}>
              {"\n        "}
              <div
                onClick={c.select}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1.9fr) 64px minmax(0,0.9fr) 64px minmax(0,1.1fr) 56px 72px 76px minmax(0,1fr) 48px 96px",
                  gap: "12px",
                  padding: "var(--rp) 24px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--line)",
                  cursor: "pointer",
                  background: c.rowBg,
                  boxShadow: c.rowSh,
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    c.select(e);
                  }
                }}
              >
                {"\n          "}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: "0" }}
                >
                  <span style={{ fontWeight: "500" }}>{c.name}</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>{c.dates}</span>
                </div>
                {"\n          "}
                <span style={{ color: "var(--ink-2)" }}>{c.platform}</span>
                {"\n          "}
                <span style={{ color: "var(--ink-2)", fontSize: "12px" }}>{c.branch}</span>
                {"\n          "}
                <span style={{ fontWeight: "500" }}>{c.discount}</span>
                {"\n          "}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div
                    style={{
                      display: "flex",
                      height: "5px",
                      borderRadius: "3px",
                      overflow: "hidden",
                      gap: "1px",
                      maxWidth: "110px",
                    }}
                  >
                    <div style={{ width: c.m + "%", background: c.mBar }}></div>
                    <div style={{ flex: "1", background: "var(--surface-3)" }}></div>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>{c.funding}</span>
                </div>
                {"\n          "}
                <span style={{ textAlign: "right", color: "var(--ink-2)" }}>{c.orders}</span>
                {"\n          "}
                <span style={{ textAlign: "right", color: "var(--ink-2)" }}>{c.revenue}</span>
                {"\n          "}
                <span style={{ textAlign: "right", fontWeight: "600", color: c.contribC }}>
                  {c.contrib}
                </span>
                {"\n          "}
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {c.before}
                  {" → "}
                  <b style={{ color: c.marginC, fontWeight: "600" }}>{c.after}</b>
                </span>
                {"\n          "}
                <span style={{ textAlign: "right", fontWeight: "600", color: c.hC }}>
                  {c.health}
                </span>
                {"\n          "}
                <span
                  style={{
                    justifySelf: "end",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "500",
                    background: c.sBg,
                    color: c.sFg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.status}
                </span>
                {"\n        "}
              </div>
              {"\n      "}
            </Fragment>
          ))}
          {"\n\n      "}
          <div
            style={{
              background: "var(--surface-2)",
              padding: "22px 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)",
              gap: "28px",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {"\n          "}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                {"\n            "}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {"Promotion health score"}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: "600", letterSpacing: "-0.01em" }}>
                    {h.name}
                    {" · "}
                    {h.platform}
                  </span>
                </div>
                {"\n            "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span
                    style={{
                      fontSize: "40px",
                      lineHeight: "1",
                      fontWeight: "500",
                      letterSpacing: "-0.03em",
                      color: h.c,
                    }}
                  >
                    {h.score}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{"/ 100"}</span>
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{ display: "flex", gap: "3px" }}>
                {"\n            "}
                {h.segs.map((g, index14) => (
                  <Fragment key={index14}>
                    <div
                      style={{ flex: "1", height: "6px", borderRadius: "2px", background: g.c }}
                    ></div>
                  </Fragment>
                ))}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {"\n            "}
                {h.reasons.map((r, index15) => (
                  <Fragment key={index15}>
                    {"\n              "}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "7px 0",
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "4px",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: r.bg,
                          color: r.fg,
                        }}
                      >
                        {r.icon}
                      </span>
                      <span style={{ color: "var(--ink-2)" }}>{r.t}</span>
                    </div>
                    {"\n            "}
                  </Fragment>
                ))}
                {"\n          "}
              </div>
              {"\n          "}
              <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--muted)" }}>
                {h.ev}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {"\n          "}
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"Recommended actions · pick one"}
              </span>
              {"\n          "}
              {h.recs.map((r, index16) => (
                <Fragment key={index16}>
                  {"\n            "}
                  <div
                    onClick={r.pick}
                    style={{
                      background: "var(--surface)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      alignItems: "center",
                      cursor: "pointer",
                      boxShadow: r.sh,
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        r.pick(e);
                      }
                    }}
                  >
                    {"\n              "}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          boxShadow:
                            "inset 0 0 0 " +
                            r.ring +
                            "px var(--brand), inset 0 0 0 1px var(--faint)",
                          flexShrink: "0",
                        }}
                      ></span>
                      {"\n                "}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: "500" }}>{r.title}</span>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{r.note}</span>
                      </div>
                    </div>
                    {"\n              "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ fontWeight: "600", color: "var(--pos)" }}>{r.impact}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                        {"contribution / month"}
                      </span>
                    </div>
                    {"\n            "}
                  </div>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n          "}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                {"\n            "}
                <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "auto" }}>
                  {h.api}
                </span>
                {"\n            "}
                <a
                  href={"#simulator"}
                  onClick={simulateSel}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    boxShadow: "inset 0 0 0 1px var(--line)",
                    textDecoration: "none",
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      simulateSel(e);
                    }
                  }}
                >
                  {"Simulate"}
                </a>
                {"\n            "}
                <button
                  onClick={requestApproval}
                  style={{
                    border: "0",
                    cursor: "pointer",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: "var(--ink)",
                    color: "var(--surface)",
                  }}
                >
                  {approvalLabel}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </section>
        {"\n\n    "}
        <section
          id={"simulator"}
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            boxShadow: "var(--card-sh)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr)",
            overflow: "hidden",
          }}
        >
          {"\n      "}
          <div
            style={{
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              borderRight: "1px solid var(--line)",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {"\n          "}
              <h2
                style={{
                  margin: "0",
                  fontSize: "16px",
                  fontWeight: "500",
                  letterSpacing: "-0.01em",
                }}
              >
                {"Promotion simulator"}
              </h2>
              {"\n          "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                {"Uses your actual commission, COGS and fee rates per platform"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {"\n          "}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{"Platform"}</span>
                {"\n            "}
                <div
                  style={{
                    display: "flex",
                    background: "var(--surface-2)",
                    borderRadius: "8px",
                    padding: "2px",
                    gap: "2px",
                  }}
                >
                  {"\n              "}
                  {platOpts.map((p, index17) => (
                    <Fragment key={index17}>
                      <button
                        onClick={p.pick}
                        style={{
                          flex: "1",
                          border: "0",
                          cursor: "pointer",
                          padding: "5px 6px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: p.bg,
                          color: p.fg,
                          boxShadow: p.sh,
                        }}
                      >
                        {p.label}
                      </button>
                    </Fragment>
                  ))}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{"Branch"}</span>
                {"\n            "}
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    boxShadow: "inset 0 0 0 1px var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  {"West Bay, Pearl, Lusail, Msheireb "}
                  <span style={{ color: "var(--faint)" }}>{"▾"}</span>
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {"\n          "}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--muted)",
                }}
              >
                <span>
                  {"Menu items · "}
                  {itemShare}
                  {" of basket value"}
                </span>
                <span>{"Below 18% target margin marked"}</span>
              </div>
              {"\n          "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {"\n            "}
                {items.map((it, index18) => (
                  <Fragment key={index18}>
                    <button
                      onClick={it.toggle}
                      style={{
                        border: "0",
                        cursor: "pointer",
                        padding: "5px 9px",
                        borderRadius: "7px",
                        fontSize: "12px",
                        background: it.bg,
                        color: it.fg,
                        boxShadow: it.sh,
                      }}
                      aria-label={"Toggle " + it.label}
                    >
                      {it.label}
                    </button>
                  </Fragment>
                ))}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            {sliders.map((s, index19) => (
              <Fragment key={index19}>
                {"\n          "}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {"\n            "}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", color: "var(--ink-2)" }}>{s.label}</span>
                    <span style={{ fontWeight: "600" }}>{s.display}</span>
                  </div>
                  {"\n            "}
                  <input
                    type={"range"}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.value}
                    onChange={s.set}
                    aria-label={s.label}
                  />
                  {"\n          "}
                </div>
                {"\n        "}
              </Fragment>
            ))}
            {"\n      "}
          </div>
          {"\n      "}
          <div
            style={{
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              background: "var(--surface)",
            }}
          >
            {"\n        "}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: "12px",
                background: out.vBg,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {"\n          "}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: out.vC,
                }}
              >
                {out.verdict}
              </span>
              {"\n          "}
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: "500",
                  letterSpacing: "-0.01em",
                  textWrap: "pretty",
                }}
              >
                {"This promotion requires a "}
                <b style={{ fontWeight: "600" }}>{out.breakeven}</b>
                {" increase in order volume to maintain current contribution profit."}
              </span>
              {"\n          "}
              <span style={{ fontSize: "12px", color: "var(--ink-2)" }}>{out.verdictNote}</span>
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.4fr) 1fr 1fr 70px",
                gap: "10px",
                fontSize: "11px",
                color: "var(--muted)",
                paddingBottom: "2px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span>
                {out.days}
                {"-day projection"}
              </span>
              <span style={{ textAlign: "right" }}>{"Baseline"}</span>
              <span style={{ textAlign: "right" }}>{"With promotion"}</span>
              <span style={{ textAlign: "right" }}>{"Change"}</span>
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "-10px" }}>
              {"\n          "}
              {out.rows.map((r, index20) => (
                <Fragment key={index20}>
                  {"\n            "}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1.4fr) 1fr 1fr 70px",
                      gap: "10px",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line)",
                      alignItems: "center",
                      fontWeight: r.w,
                      background: r.bg,
                    }}
                  >
                    {"\n              "}
                    <span style={{ color: "var(--ink-2)" }}>{r.label}</span>
                    <span style={{ textAlign: "right", color: "var(--muted)" }}>{r.base}</span>
                    <span style={{ textAlign: "right" }}>{r.proj}</span>
                    <span style={{ textAlign: "right", fontSize: "12px", color: r.dC }}>
                      {r.delta}
                    </span>
                    {"\n            "}
                  </div>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {"\n          "}
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{"Guardrail check"}</span>
              {"\n          "}
              {out.checks.map((g, index21) => (
                <Fragment key={index21}>
                  {"\n            "}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}
                  >
                    <span
                      style={{ width: "7px", height: "7px", borderRadius: "50%", background: g.c }}
                    ></span>
                    <span style={{ color: "var(--ink-2)" }}>{g.t}</span>
                    <span style={{ marginLeft: "auto", color: g.c2, fontWeight: "600" }}>
                      {g.s}
                    </span>
                  </div>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </section>
        {"\n\n    "}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,7fr) minmax(0,5fr)",
            gap: "20px",
          }}
        >
          {"\n      "}
          <section
            id={"guardrails"}
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              boxShadow: "var(--card-sh)",
              padding: "22px 0 6px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {"\n        "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "0 24px 14px",
              }}
            >
              {"\n          "}
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {"\n            "}
                <h2
                  style={{
                    margin: "0",
                    fontSize: "16px",
                    fontWeight: "500",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {"Margin guardrails"}
                </h2>
                {"\n            "}
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {
                    "Checked on every new or changed campaign · violations feed Priority Centre & Margin Leakage"
                  }
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <button
                style={{
                  border: "0",
                  cursor: "pointer",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "500",
                  background: "var(--ink)",
                  color: "var(--surface)",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toast.info("Preview only — no live changes are sent.")}
              >
                {"+ Guardrail"}
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1.1fr) 60px 44px",
                gap: "12px",
                padding: "8px 24px",
                fontSize: "10.5px",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--faint)",
                borderTop: "1px solid var(--line)",
                borderBottom: "1px solid var(--line)",
                background: "transparent",
              }}
            >
              {"\n          "}
              <span>{"Guardrail"}</span>
              <span>{"Condition"}</span>
              <span>{"Action"}</span>
              <span style={{ textAlign: "right" }}>{"Hits 30d"}</span>
              <span style={{ textAlign: "right" }}>{"Status"}</span>
              {"\n        "}
            </div>
            {"\n        "}
            {guardrails.map((g, index22) => (
              <Fragment key={index22}>
                {"\n          "}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1.1fr) 60px 44px",
                    gap: "12px",
                    padding: "var(--rp) 24px",
                    alignItems: "center",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {"\n            "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    <span style={{ fontWeight: "500" }}>{g.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{g.last}</span>
                  </div>
                  {"\n            "}
                  <span style={{ fontSize: "12px", color: "var(--ink-2)" }}>{g.cond}</span>
                  {"\n            "}
                  <span style={{ fontSize: "12px", fontWeight: "500" }}>{g.action}</span>
                  {"\n            "}
                  <span style={{ textAlign: "right", color: g.hC, fontWeight: "600" }}>
                    {g.hits}
                  </span>
                  {"\n            "}
                  <button
                    onClick={g.toggle}
                    style={{
                      justifySelf: "end",
                      border: "0",
                      cursor: "pointer",
                      width: "30px",
                      height: "18px",
                      borderRadius: "9px",
                      background: g.tBg,
                      position: "relative",
                      padding: "0",
                    }}
                    aria-label={"Toggle " + g.name}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: g.tX + "px",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        transition: "left .15s",
                      }}
                    ></span>
                  </button>
                  {"\n          "}
                </div>
                {"\n        "}
              </Fragment>
            ))}
            {"\n      "}
          </section>
          {"\n      "}
          <section
            style={{
              background: "var(--panel)",
              backgroundImage:
                "radial-gradient(120% 70% at 100% 0%,rgba(244,115,32,0.18),transparent 60%)",
              color: "var(--panel-ink)",
              borderRadius: "16px",
              boxShadow: "0 14px 36px -18px rgba(0,0,0,0.45)",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {"\n          "}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    background: "var(--brand)",
                    transform: "rotate(45deg)",
                  }}
                ></div>
                <h2
                  style={{
                    margin: "0",
                    fontSize: "16px",
                    fontWeight: "500",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {"Ask Copilot"}
                </h2>
              </div>
              {"\n          "}
              <span
                style={{ fontSize: "11px", color: "var(--panel-muted)", fontFamily: "var(--mono)" }}
              >
                {"Campaign + SKU + settlement data"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {"\n          "}
              {questions.map((q, index23) => (
                <Fragment key={index23}>
                  {"\n            "}
                  <button
                    onClick={q.pick}
                    style={{
                      border: "0",
                      cursor: "pointer",
                      padding: "6px 10px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      textAlign: "left",
                      background: q.bg,
                      color: q.fg,
                      boxShadow: "inset 0 0 0 1px var(--panel-line)",
                    }}
                  >
                    {q.q}
                  </button>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                borderTop: "1px solid var(--panel-line)",
                paddingTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {"\n          "}
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  letterSpacing: "-0.01em",
                  textWrap: "pretty",
                }}
              >
                {answer.headline}
              </span>
              {"\n          "}
              <span style={{ fontSize: "11px", color: "var(--panel-muted)" }}>
                {"Supporting evidence"}
              </span>
              {"\n          "}
              {answer.drivers.map((d, index24) => (
                <Fragment key={index24}>
                  {"\n            "}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "72px minmax(0,1fr)",
                      gap: "10px",
                      fontSize: "12px",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--panel-line)",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#F7963F" }}>{d.v}</span>
                    <span>{d.label}</span>
                  </div>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n          "}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--panel-muted)" }}>{"Estimated impact"}</span>
                <b style={{ fontWeight: "600" }}>{answer.impact}</b>
              </div>
              {"\n          "}
              <span
                style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--panel-muted)" }}
              >
                {answer.ev}
              </span>
              {"\n          "}
              <div style={{ display: "flex", gap: "6px" }}>
                {"\n            "}
                <button
                  style={{
                    border: "0",
                    cursor: "pointer",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background: "transparent",
                    color: "var(--panel-ink)",
                    boxShadow: "inset 0 0 0 1px var(--panel-line)",
                  }}
                  onClick={() => toast.info("Preview only — no live changes are sent.")}
                >
                  {"View evidence"}
                </button>
                {"\n            "}
                <button
                  style={{
                    border: "0",
                    cursor: "pointer",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background: "transparent",
                    color: "var(--panel-ink)",
                    boxShadow: "inset 0 0 0 1px var(--panel-line)",
                  }}
                  onClick={() => toast.info("Preview only — no live changes are sent.")}
                >
                  {"Create action"}
                </button>
                {"\n            "}
                <a
                  href={"#simulator"}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: "var(--panel-ink)",
                    color: "var(--panel)",
                    textDecoration: "none",
                  }}
                >
                  {"Simulate"}
                </a>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </section>
          {"\n    "}
        </div>
        {"\n  "}
      </div>
    );
  }
}
