// @ts-nocheck -- mechanically translated, isolated reference-only presentation model.
// Source: Order Automation.dc.html; SHA256 5036ea79a99f0e09c6d1453d9f9b0a09090bc65e818891b01595b88fec6d563e
// Only mounted behind the authenticated server demo gate. No connector or write API calls.
import React, { Fragment } from "react";
import { toast } from "sonner";
import "./reference-demo.css";

const PLAT = { S: "Snoonu", T: "Talabat", K: "Keeta", J: "Jahez" };
const STAGES = [
  ["Incoming order", "1,389", "4 platforms", 0],
  ["Validation", "1,386", "3 failed · address", 1],
  ["Availability check", "1,368", "18 held · SKU unavailable", 1],
  ["Automation rule", "1,352", "68 routed to manual review", 0],
  ["Accepted", "1,352", "1,284 auto · 68 manual", 0],
  ["POS sync", "1,349", "3 retrying · Foodics", 1],
];
const BRANCHES_POOL = ["West Bay", "The Pearl", "Lusail", "Msheireb", "Al Wakra", "Al Sadd"];
const RULES = [
  {
    name: "Auto-accept standard orders",
    summary: "Branch open · all items available · under QAR 500 · kitchen load healthy",
    plats: ["S", "T", "K", "J"],
    branches: "11 of 12",
    triggers: "38,940",
    success: "99.2%",
    last: "12 sec ago",
    on: true,
    match: "ALL conditions",
    conds: [
      ["Branch status", "is", "Open", "POS"],
      ["All items", "are", "Available", "Odoo · Foodics"],
      ["Order value", "below", "QAR 500", ""],
      ["Kitchen load", "below", "90%", "KDS"],
    ],
    actions: ["Auto Accept", "Sync POS"],
    preview:
      "Last 30 days: would have matched 38,940 orders (92.1%) · 312 wrongly accepted orders: 0",
  },
  {
    name: "Pause on kitchen overload",
    summary: "Kitchen load > 90% · POS unhealthy · manual override",
    plats: ["S", "T", "K", "J"],
    branches: "All 12",
    triggers: "46",
    success: "100%",
    last: "41 min ago",
    on: true,
    match: "ANY condition",
    conds: [
      ["Kitchen load", "above", "90%", "KDS"],
      ["POS connection", "is", "Unhealthy", "Integrations"],
      ["Branch", "enters", "Manual override", ""],
    ],
    actions: ["Pause Orders", "Notify Manager", "Trigger Alert"],
    preview: "Last 30 days: 46 pauses, avg 6 min · prevented an estimated 112 late deliveries",
  },
  {
    name: "Inventory guard",
    summary: "Any item unavailable in POS inventory → manual review + sync",
    plats: ["S", "T", "K", "J"],
    branches: "All 12",
    triggers: "612",
    success: "97.8%",
    last: "3 min ago",
    on: true,
    match: "ANY condition",
    conds: [
      ["Inventory status", "is", "Unavailable", "Odoo"],
      ["SKU", "is not on", "Platform menu", "Catalog"],
    ],
    actions: ["Manual Review", "Sync POS"],
    preview: "Keeta menu last synced Thu 09:12 — 64% of Keeta rejections trace to this gap",
  },
  {
    name: "High-value review",
    summary: "Order value above QAR 500 → manual review, notify manager",
    plats: ["S", "T"],
    branches: "All 12",
    triggers: "418",
    success: "100%",
    last: "22 min ago",
    on: true,
    match: "ALL conditions",
    conds: [
      ["Order value", "above", "QAR 500", ""],
      ["Platform", "is", "Snoonu, Talabat", ""],
    ],
    actions: ["Manual Review", "Notify Manager"],
    preview: "2 SLA breaches today at West Bay · consider raising threshold to QAR 750",
  },
  {
    name: "Restricted items",
    summary: "Catering trays & pre-order items require staff confirmation",
    plats: ["S", "T", "K"],
    branches: "3 branches",
    triggers: "58",
    success: "100%",
    last: "Yesterday",
    on: true,
    match: "ANY condition",
    conds: [
      ["SKU", "contains", "Catering tray", ""],
      ["SKU", "contains", "Pre-order item", ""],
    ],
    actions: ["Manual Review"],
    preview: "Last 30 days: 58 matches · 100% confirmed by staff within SLA",
  },
  {
    name: "Late-night Al Sadd cut-off",
    summary: "Thu–Sat after 23:30 → reject and alert",
    plats: ["K", "J"],
    branches: "Al Sadd",
    triggers: "—",
    success: "—",
    last: "Never",
    on: false,
    match: "ALL conditions",
    conds: [
      ["Day", "is", "Thu – Sat", ""],
      ["Time", "after", "23:30", ""],
      ["Branch", "is", "Al Sadd", ""],
    ],
    actions: ["Reject", "Trigger Alert"],
    preview:
      "Draft · would have rejected 34 orders (QAR 2,410) last month — review before enabling",
  },
];
const ALL_ACTIONS = [
  "Auto Accept",
  "Manual Review",
  "Pause Orders",
  "Reject",
  "Notify Manager",
  "Sync POS",
  "Trigger Alert",
];
const EXC = [
  {
    id: "k",
    title: "Keeta order #K-49210",
    state: "Automation paused",
    meta: "Lusail · QAR 214 · 2m",
    reason: "SKU unavailable in Odoo — Mixed Grill Platter",
    rec: "Sync menu availability",
    cta: "Resolve",
    ev: "EV-91032",
  },
  {
    id: "t",
    title: "Talabat order #T-88310",
    state: "POS sync retrying",
    meta: "Al Sadd · QAR 96 · 4m",
    reason: "Foodics returned timeout twice",
    rec: "Retry via fallback queue",
    cta: "Retry now",
    ev: "EV-91035",
  },
  {
    id: "s",
    title: "Snoonu order #S-30577",
    state: "Manual review · SLA in 0:48",
    meta: "West Bay · QAR 742 · 1m",
    reason: "Order value above QAR 500 rule",
    rec: "Accept — customer has 14 prior orders",
    cta: "Accept",
    ev: "EV-91038",
  },
  {
    id: "j",
    title: "Jahez order #J-11902",
    state: "Validation failed",
    meta: "The Pearl · QAR 128 · 6m",
    reason: "Delivery address outside branch zone",
    rec: "Reassign to Msheireb (2.1 km)",
    cta: "Reassign",
    ev: "EV-91040",
  },
];
const BR = [
  ["West Bay", "Auto", 98.1, "3.8s", 2, "—"],
  ["The Pearl", "Auto", 97.4, "4.0s", 0, "—"],
  ["Lusail", "Auto", 95.2, "4.4s", 0, "Sync Keeta menu · 18 held today"],
  ["Al Wakra", "Hybrid", 88.6, "21s", 0, "Keep hybrid · 11% orders modified"],
  ["Msheireb", "Hybrid", 78.3, "38s", 0, "Enable auto-accept after menu sync"],
  ["Al Sadd", "Manual", 41.0, "2m 51s", 7, "Enable auto-accept · +QAR 1,920/mo"],
];
const QA = [
  {
    q: "Why are orders being rejected on Keeta?",
    headline: "Keeta rejections are 2.4× other platforms (3.1% vs 1.3%).",
    drivers: [
      ["64%", "SKU unavailable — Keeta menu not synced with Odoo since Thursday"],
      ["22%", "Branch closed — Keeta hours differ from POS at Al Sadd"],
      ["14%", "Restricted items requiring confirmation"],
    ],
    impact: "QAR 2,180 lost this week",
    ev: "EV-91044 · Keeta orders · Odoo inventory · branch hours",
  },
  {
    q: "Which branches should use auto-accept?",
    headline: "Al Sadd and Msheireb are ready for auto-accept.",
    drivers: [
      ["98%", "Al Sadd manual orders accepted unchanged · 7 SLA breaches today"],
      ["96%", "Msheireb accepted unchanged once Keeta menu is synced"],
      ["11%", "Al Wakra orders modified — keep hybrid mode"],
    ],
    impact: "+QAR 2,740 / month protected",
    ev: "EV-91051 · 30 days · 4,812 manual decisions",
  },
  {
    q: "What caused today's 9 SLA breaches?",
    headline: "All 9 breaches came from manual-review queues.",
    drivers: [
      ["7", "Al Sadd in manual mode during 12:00–14:00 lunch peak"],
      ["2", "High-value orders at West Bay waited over 3 minutes"],
      ["0", "Breaches on auto-accepted orders"],
    ],
    impact: "QAR 1,140 at risk from cancellations",
    ev: "EV-91060 · platform SLA logs · KDS",
  },
];
const POOL = [
  ["S", "#S-30", "Accepted"],
  ["T", "#T-88", "Accepted"],
  ["K", "#K-49", "Accepted"],
  ["J", "#J-11", "Accepted"],
  ["T", "#T-88", "Accepted"],
  ["S", "#S-30", "Accepted"],
];

export class OrderReferenceDemo extends React.Component {
  state = { sel: 0, on: RULES.map((r) => r.on), resolved: {}, q: 0, feed: [], seq: 0, since: 0 };
  componentDidMount() {
    this.setState({
      feed: [
        ["S", "#S-30507", "The Pearl", 129, 0, "04:35"],
        ["T", "#T-88470", "Lusail", 88, 1, "04:35"],
        ["J", "#J-11433", "Msheireb", 237, 2, "04:35"],
        ["K", "#K-49396", "Al Wakra", 196, 4, "04:34"],
        ["T", "#T-88359", "Al Sadd", 155, 4, "04:34"],
        ["S", "#S-30100", "West Bay", 58, 5, "04:33"],
        ["T", "#T-88137", "Al Sadd", 99, 5, "04:33"],
      ].map(([mono, id, branch, value, stage, time]) => ({
        mono,
        id,
        branch,
        value: "QAR " + value,
        stage,
        time,
        ex: false,
      })),
    });
  }
  renderVals() {
    const s = this.state;
    const STN = [
      "Received",
      "Validating",
      "Checking stock",
      "Applying rule",
      "Accepted",
      "Synced to POS",
    ];
    const feed = s.feed.map((o) => ({
      ...o,
      status: o.ex ? "Held · SKU unavailable" : STN[o.stage],
      dots: [0, 1, 2, 3, 4, 5].map((i) => ({
        c:
          o.ex && i === o.stage
            ? "var(--neg-bar)"
            : i <= o.stage
              ? o.stage === 5
                ? "var(--pos)"
                : "var(--brand)"
              : "var(--surface-3)",
      })),
    }));
    const stages = STAGES.map(([name, count, ex, bad], i) => ({
      n: i + 1,
      name,
      count,
      ex,
      exC: bad ? "var(--neg)" : "var(--muted)",
      exW: bad ? 600 : 400,
      lineD: i < 5 ? "block" : "none",
    }));
    const exceptions = EXC.map((e) => {
      const done = !!s.resolved[e.id];
      return {
        ...e,
        done,
        open: !done,
        bg: done ? "var(--surface-2)" : "var(--neg-bg)",
        stC: done ? "var(--muted)" : "var(--neg)",
        resolve: () => toast.info("Preview only — no order was changed."),
      };
    });
    const branches = BR.map(([name, mode, rate, time, sla, rec]) => ({
      name,
      mode,
      rate,
      rateL: rate.toFixed(1) + "%",
      time,
      sla: String(sla),
      bar: rate < 60 ? "var(--neg-bar)" : rate < 90 ? "var(--warn)" : "var(--brand)",
      slaC: sla > 3 ? "var(--neg)" : "var(--ink-2)",
      slaW: sla > 3 ? 600 : 400,
      rec,
      recC:
        rec === "—"
          ? "var(--faint)"
          : rec.startsWith("Enable")
            ? "var(--brand-text)"
            : "var(--ink-2)",
      recW: rec.startsWith("Enable") ? 600 : 400,
    }));
    const rules = RULES.map((r, i) => {
      const on = s.on[i],
        active = s.sel === i;
      return {
        ...r,
        n: i + 1,
        rowBg: active ? "var(--brand-bg)" : "transparent",
        rowSh: active ? "inset 3px 0 0 var(--brand)" : "none",
        tBg: on ? "var(--pos)" : "var(--surface-3)",
        tX: on ? 14 : 2,
        select: () => this.setState({ sel: i }),
        toggle: (e) => {
          e.stopPropagation();
          this.setState((st) => {
            const o = st.on.slice();
            o[i] = !o[i];
            return { on: o };
          });
        },
      };
    });
    const r = RULES[s.sel];
    const sel = {
      n: s.sel + 1,
      name: r.name,
      match: r.match,
      branches: r.branches === "11 of 12" ? "11 of 12 branches (Al Sadd excluded)" : r.branches,
      platsLong: r.plats.map((p) => PLAT[p]).join(", "),
      conds: r.conds.map(([f, op, v, src]) => ({ f, op, v, src })),
      preview: r.preview,
      actions: ALL_ACTIONS.map((a) => {
        const on = r.actions.includes(a);
        return {
          label: (on ? "✓ " : "") + a,
          bg: on ? "var(--ink)" : "transparent",
          fg: on ? "var(--surface)" : "var(--muted)",
          w: on ? 600 : 400,
          sh: on ? "none" : "inset 0 0 0 1px var(--line)",
        };
      }),
    };
    const qa = QA[s.q];
    return {
      feed,
      stages,
      exceptions,
      openEx: exceptions.filter((e) => e.open).length,
      branches,
      rules,
      sel,
      fields: [
        "Platform",
        "Branch",
        "Day",
        "Time",
        "Order value",
        "SKU",
        "Kitchen load",
        "Inventory",
        "POS status",
      ],
      lastEvent: "last order 2s ago",
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
      feed,
      stages,
      exceptions,
      openEx,
      branches,
      rules,
      sel,
      fields,
      lastEvent,
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
              {"Operations · Order Automation"}
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
              {"92.4% of today's orders were accepted without staff. "}
              <span style={{ color: "var(--muted)" }}>{"4 exceptions need a decision."}</span>
            </h1>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{ display: "flex", gap: "8px" }}>
            {"\n        "}
            <button
              style={{
                whiteSpace: "nowrap",
                border: "0",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                background: "var(--surface)",
                color: "var(--ink)",
                boxShadow: "inset 0 0 0 1px var(--line)",
              }}
              onClick={() => toast.info("Preview only — no live changes are sent.")}
            >
              {"Branch override"}
            </button>
            {"\n        "}
            <a
              href={"#rules"}
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
              {"New rule"}
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
                {"Automation rate · today"}
              </span>
              {"\n          "}
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"Snoonu · Talabat · Keeta · Jahez"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "72px",
                  lineHeight: "0.95",
                  fontWeight: "400",
                  letterSpacing: "-0.045em",
                }}
              >
                {"92.4"}
              </span>
              <span style={{ fontSize: "28px", color: "var(--muted)" }}>{"%"}</span>
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
                  background: "var(--pos-bg)",
                  color: "var(--pos)",
                  fontWeight: "600",
                }}
              >
                {"↑ 3.1 pts"}
              </span>
              {"\n          "}
              <span style={{ color: "var(--muted)" }}>
                {"1,284 of 1,389 orders auto-accepted · 99.2% rule success"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                display: "flex",
                height: "10px",
                borderRadius: "5px",
                overflow: "hidden",
                gap: "2px",
                marginTop: "8px",
              }}
            >
              {"\n          "}
              <div style={{ width: "92.4%", background: "var(--brand)" }}></div>
              <div style={{ width: "4.9%", background: "var(--ink-2)" }}></div>
              <div style={{ width: "1%", background: "var(--neg-bar)" }}></div>
              <div style={{ width: "1.7%", background: "var(--surface-3)" }}></div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--muted)" }}>
              {"\n          "}
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: "var(--brand)",
                  }}
                ></span>
                {"Auto 1,284"}
              </span>
              {"\n          "}
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: "var(--ink-2)",
                  }}
                ></span>
                {"Manual 68"}
              </span>
              {"\n          "}
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: "var(--neg-bar)",
                  }}
                ></span>
                {"Rejected 14"}
              </span>
              {"\n          "}
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: "var(--surface-3)",
                  }}
                ></span>
                {"In flight 23"}
              </span>
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
                {"Orders received"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"1,389"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                <span style={{ color: "var(--pos)", fontWeight: "600" }}>{"↑ 6.2%"}</span>
                {" vs last Sunday"}
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
                {"Avg acceptance time"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"4.2 sec"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"vs 2m 48s manual median"}
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
                {"Manually accepted"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"68"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"4.9% · 41 from Al Sadd"}
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
                {"Rejected"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"14"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {"9 out of stock · 5 branch closed"}
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
                background: "var(--warn-bg)",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--warn-ink)",
                }}
              >
                {"SLA breaches"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"9"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--ink-2)" }}>
                {"All in manual-review queues"}
              </span>
            </div>
            {"\n        "}
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                background: "var(--brand-bg)",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontWeight: "500",
                  color: "var(--brand-text)",
                }}
              >
                {"Revenue protected"}
              </span>
              <span style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.03em" }}>
                {"QAR 6,840"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--ink-2)" }}>
                {"37 missed orders prevented"}
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
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {"\n      "}
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
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
                {"Order flow monitor"}
              </h2>
              {"\n          "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                {"Every order, from platform to POS · today"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "12px",
                color: "var(--muted)",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "var(--pos)",
                  animation: "psPulse 1.6s ease-in-out infinite",
                }}
              ></span>
              {"Live · "}
              {lastEvent}
            </span>
            {"\n      "}
          </div>
          {"\n      "}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: "0" }}
          >
            {"\n        "}
            {stages.map((s, index0) => (
              <Fragment key={index0}>
                {"\n          "}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "0 14px 0 0",
                    position: "relative",
                  }}
                >
                  {"\n            "}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {"\n              "}
                    <span
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "var(--surface-2)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "var(--ink-2)",
                        flexShrink: "0",
                      }}
                    >
                      {s.n}
                    </span>
                    {"\n              "}
                    <div
                      style={{
                        flex: "1",
                        height: "1px",
                        background: "var(--line)",
                        display: s.lineD,
                      }}
                    ></div>
                    {"\n            "}
                  </div>
                  {"\n            "}
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>{s.name}</span>
                  {"\n            "}
                  <span style={{ fontSize: "20px", fontWeight: "500", letterSpacing: "-0.02em" }}>
                    {s.count}
                  </span>
                  {"\n            "}
                  <span style={{ fontSize: "11px", color: s.exC, fontWeight: s.exW }}>{s.ex}</span>
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
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: "20px",
              borderTop: "1px solid var(--line)",
              paddingTop: "16px",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {"\n          "}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--muted)",
                  paddingBottom: "6px",
                }}
              >
                <span>{"Live orders"}</span>
                <span>{"Validation → POS sync"}</span>
              </div>
              {"\n          "}
              {feed.map((o, index1) => (
                <Fragment key={index1}>
                  {"\n            "}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 22px minmax(0,1fr) 64px 76px",
                      gap: "10px",
                      alignItems: "center",
                      padding: "8px 0",
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    {"\n              "}
                    <span
                      style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--muted)" }}
                    >
                      {o.time}
                    </span>
                    {"\n              "}
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "5px",
                        background: "var(--surface-3)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "var(--ink-2)",
                      }}
                    >
                      {o.mono}
                    </span>
                    {"\n              "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: "1.3",
                        minWidth: "0",
                      }}
                    >
                      <span
                        style={{ fontWeight: "500", fontFamily: "var(--mono)", fontSize: "12px" }}
                      >
                        {o.id}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {o.branch}
                        {" · "}
                        {o.status}
                      </span>
                    </div>
                    {"\n              "}
                    <span style={{ textAlign: "right", fontWeight: "500" }}>{o.value}</span>
                    {"\n              "}
                    <div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
                      {"\n                "}
                      {o.dots.map((d, index2) => (
                        <Fragment key={index2}>
                          <span
                            style={{
                              width: "9px",
                              height: "9px",
                              borderRadius: "2px",
                              background: d.c,
                              transition: "background .4s",
                            }}
                          ></span>
                        </Fragment>
                      ))}
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </div>
                  {"\n          "}
                </Fragment>
              ))}
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {"\n          "}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--muted)",
                  paddingBottom: "6px",
                }}
              >
                <span>
                  {"Exceptions · "}
                  {openEx}
                  {" open"}
                </span>
                <span>{"Feeds Priority Centre"}</span>
              </div>
              {"\n          "}
              {exceptions.map((e, index3) => (
                <Fragment key={index3}>
                  {"\n            "}
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: e.bg,
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    {"\n              "}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      {"\n                "}
                      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                        <span style={{ fontWeight: "600" }}>{e.title}</span>
                        <span style={{ fontSize: "11px", color: e.stC, fontWeight: "600" }}>
                          {e.state}
                        </span>
                      </div>
                      {"\n                "}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.meta}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n              "}
                    <div style={{ fontSize: "12px", color: "var(--ink-2)" }}>
                      <span style={{ color: "var(--muted)" }}>{"Reason:"}</span> {e.reason}
                    </div>
                    {"\n              "}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {"\n                "}
                      <span
                        style={{ fontSize: "12px", color: "var(--ink-2)", marginRight: "auto" }}
                      >
                        <span style={{ color: "var(--muted)" }}>{"Recommended:"}</span> {e.rec}
                      </span>
                      {"\n                "}
                      {e.open && (
                        <>
                          {"\n                  "}
                          <button
                            onClick={e.resolve}
                            style={{
                              border: "0",
                              cursor: "pointer",
                              padding: "5px 12px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: "var(--ink)",
                              color: "var(--surface)",
                            }}
                          >
                            {e.cta}
                          </button>
                          {"\n                "}
                        </>
                      )}
                      {"\n                "}
                      {e.done && (
                        <>
                          {"\n                  "}
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--pos)",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {"✓ Resolved · "}
                            {e.ev}
                          </span>
                          {"\n                "}
                        </>
                      )}
                      {"\n              "}
                    </div>
                    {"\n            "}
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
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              boxShadow: "var(--card-sh)",
              padding: "22px 24px 10px",
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
                paddingBottom: "12px",
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
                  {"Automation by branch"}
                </h2>
                {"\n            "}
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {"Feeds Branch Performance · today"}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <a
                href={"/dashboard#branch-performance"}
                style={{ fontSize: "12px", fontWeight: "500" }}
              >
                {"Branch performance →"}
              </a>
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 64px minmax(0,1.3fr) 60px 46px minmax(0,1.5fr)",
                gap: "12px",
                fontSize: "10.5px",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--faint)",
                padding: "8px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              {"\n          "}
              <span>{"Branch"}</span>
              <span>{"Mode"}</span>
              <span>{"Automation rate"}</span>
              <span style={{ textAlign: "right" }}>{"Avg time"}</span>
              <span style={{ textAlign: "right" }}>{"SLA"}</span>
              <span>{"Recommendation"}</span>
              {"\n        "}
            </div>
            {"\n        "}
            {branches.map((b, index4) => (
              <Fragment key={index4}>
                {"\n          "}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0,1fr) 64px minmax(0,1.3fr) 60px 46px minmax(0,1.5fr)",
                    gap: "12px",
                    alignItems: "center",
                    padding: "var(--rp) 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {"\n            "}
                  <span style={{ fontWeight: "500" }}>{b.name}</span>
                  {"\n            "}
                  <span style={{ fontSize: "11px", color: "var(--ink-2)" }}>{b.mode}</span>
                  {"\n            "}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        flex: "1",
                        height: "6px",
                        background: "var(--surface-2)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ height: "100%", width: b.rate + "%", background: b.bar }}></div>
                    </div>
                    <span style={{ fontWeight: "600", width: "40px", textAlign: "right" }}>
                      {b.rateL}
                    </span>
                  </div>
                  {"\n            "}
                  <span style={{ textAlign: "right", color: "var(--ink-2)" }}>{b.time}</span>
                  {"\n            "}
                  <span style={{ textAlign: "right", color: b.slaC, fontWeight: b.slaW }}>
                    {b.sla}
                  </span>
                  {"\n            "}
                  <span style={{ fontSize: "12px", color: b.recC, fontWeight: b.recW }}>
                    {b.rec}
                  </span>
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
                {"Order + POS + inventory data"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {"\n          "}
              {questions.map((q, index5) => (
                <Fragment key={index5}>
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
                {"Primary drivers"}
              </span>
              {"\n          "}
              {answer.drivers.map((d, index6) => (
                <Fragment key={index6}>
                  {"\n            "}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "56px minmax(0,1fr)",
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
                <button
                  style={{
                    border: "0",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: "var(--panel-ink)",
                    color: "var(--panel)",
                  }}
                  onClick={() => toast.info("Preview only — no live changes are sent.")}
                >
                  {"Simulate"}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </section>
          {"\n    "}
        </div>
        {"\n\n    "}
        <section
          id={"rules"}
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            boxShadow: "var(--card-sh)",
            padding: "22px 0 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {"\n      "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "0 24px 14px",
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
                {"Order rules"}
              </h2>
              {"\n          "}
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                {"Evaluated top to bottom on every incoming order · first matching rule wins"}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
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
              }}
              onClick={() => toast.info("Preview only — no live changes are sent.")}
            >
              {"+ New rule"}
            </button>
            {"\n      "}
          </div>
          {"\n      "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "24px minmax(0,2.6fr) 56px minmax(0,0.9fr) minmax(0,0.9fr) 80px 70px 90px",
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
            <span>{"#"}</span>
            <span>{"Rule"}</span>
            <span>{"Status"}</span>
            <span>{"Platforms"}</span>
            <span>{"Branches"}</span>
            <span style={{ textAlign: "right" }}>{"Triggers 30d"}</span>
            <span style={{ textAlign: "right" }}>{"Success"}</span>
            <span style={{ textAlign: "right" }}>{"Last triggered"}</span>
            {"\n      "}
          </div>
          {"\n      "}
          {rules.map((r, index7) => (
            <Fragment key={index7}>
              {"\n        "}
              <div
                onClick={r.select}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "24px minmax(0,2.6fr) 56px minmax(0,0.9fr) minmax(0,0.9fr) 80px 70px 90px",
                  gap: "12px",
                  padding: "var(--rp) 24px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--line)",
                  cursor: "pointer",
                  background: r.rowBg,
                  boxShadow: r.rowSh,
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    r.select(e);
                  }
                }}
              >
                {"\n          "}
                <span
                  style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--muted)" }}
                >
                  {r.n}
                </span>
                {"\n          "}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" }}
                >
                  <span style={{ fontWeight: "500" }}>{r.name}</span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.summary}
                  </span>
                </div>
                {"\n          "}
                <button
                  onClick={r.toggle}
                  style={{
                    border: "0",
                    cursor: "pointer",
                    width: "30px",
                    height: "18px",
                    borderRadius: "9px",
                    background: r.tBg,
                    position: "relative",
                    padding: "0",
                  }}
                  aria-label={"Toggle " + r.name}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: r.tX + "px",
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
                <div style={{ display: "flex", gap: "3px" }}>
                  {r.plats.map((p, index8) => (
                    <Fragment key={index8}>
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "5px",
                          background: "var(--surface-3)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "10px",
                          fontWeight: "600",
                          color: "var(--ink-2)",
                        }}
                      >
                        {p}
                      </span>
                    </Fragment>
                  ))}
                </div>
                {"\n          "}
                <span style={{ color: "var(--ink-2)" }}>{r.branches}</span>
                {"\n          "}
                <span style={{ textAlign: "right", fontWeight: "500" }}>{r.triggers}</span>
                {"\n          "}
                <span style={{ textAlign: "right", color: "var(--ink-2)" }}>{r.success}</span>
                {"\n          "}
                <span style={{ textAlign: "right", fontSize: "12px", color: "var(--muted)" }}>
                  {r.last}
                </span>
                {"\n        "}
              </div>
              {"\n      "}
            </Fragment>
          ))}
          {"\n      "}
          <div
            style={{
              background: "var(--surface-2)",
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              borderRadius: "0 0 14px 14px",
            }}
          >
            {"\n        "}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {"\n          "}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {"Editing rule "}
                  {sel.n}
                </span>
                <span style={{ fontSize: "16px", fontWeight: "600", letterSpacing: "-0.01em" }}>
                  {sel.name}
                </span>
              </div>
              {"\n          "}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{
                    border: "0",
                    cursor: "pointer",
                    padding: "7px 12px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    boxShadow: "inset 0 0 0 1px var(--line)",
                  }}
                  onClick={() => toast.info("Preview only — no live changes are sent.")}
                >
                  {"Test on last 30 days"}
                </button>
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
                  }}
                  onClick={() => toast.info("Preview only — no live changes are sent.")}
                >
                  {"Save rule"}
                </button>
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,0.8fr) 20px minmax(0,1.6fr) 20px minmax(0,1.1fr)",
                alignItems: "stretch",
                gap: "0",
              }}
            >
              {"\n          "}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 0 0 1px var(--line)",
                }}
              >
                {"\n            "}
                <span
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    fontWeight: "600",
                  }}
                >
                  {"Trigger"}
                </span>
                {"\n            "}
                <span style={{ fontWeight: "500" }}>{"New order received"}</span>
                {"\n            "}
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {"On "}
                  {sel.platsLong}
                </span>
                {"\n            "}
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {"At "}
                  {sel.branches}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{ display: "grid", placeItems: "center", color: "var(--faint)" }}>
                {"→"}
              </div>
              {"\n          "}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 0 0 1px var(--line)",
                }}
              >
                {"\n            "}
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      fontWeight: "600",
                    }}
                  >
                    {"When"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 7px",
                      borderRadius: "5px",
                      background: "var(--surface-2)",
                      fontWeight: "600",
                    }}
                  >
                    {sel.match}
                  </span>
                </div>
                {"\n            "}
                {sel.conds.map((c, index9) => (
                  <Fragment key={index9}>
                    {"\n              "}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 10px",
                        borderRadius: "7px",
                        background: "var(--surface-2)",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>{c.f}</span>
                      <span style={{ color: "var(--muted)" }}>{c.op}</span>
                      <span style={{ fontWeight: "600" }}>{c.v}</span>
                      <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--faint)" }}>
                        {c.src}
                      </span>
                    </div>
                    {"\n            "}
                  </Fragment>
                ))}
                {"\n            "}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                    alignItems: "center",
                    paddingTop: "2px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "2px" }}>
                    {"+ Add"}
                  </span>
                  {"\n              "}
                  {fields.map((f, index10) => (
                    <Fragment key={index10}>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 7px",
                          borderRadius: "5px",
                          boxShadow: "inset 0 0 0 1px var(--line)",
                          color: "var(--ink-2)",
                          cursor: "pointer",
                        }}
                      >
                        {f}
                      </span>
                    </Fragment>
                  ))}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{ display: "grid", placeItems: "center", color: "var(--faint)" }}>
                {"→"}
              </div>
              {"\n          "}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 0 0 1px var(--line)",
                }}
              >
                {"\n            "}
                <span
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    fontWeight: "600",
                  }}
                >
                  {"Then"}
                </span>
                {"\n            "}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {"\n              "}
                  {sel.actions.map((a, index11) => (
                    <Fragment key={index11}>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "6px 10px",
                          borderRadius: "7px",
                          background: a.bg,
                          color: a.fg,
                          fontWeight: a.w,
                          boxShadow: a.sh,
                        }}
                      >
                        {a.label}
                      </span>
                    </Fragment>
                  ))}
                  {"\n            "}
                </div>
                {"\n            "}
                <div
                  style={{
                    marginTop: "auto",
                    fontSize: "12px",
                    color: "var(--ink-2)",
                    background: "var(--brand-bg)",
                    padding: "9px 10px",
                    borderRadius: "7px",
                  }}
                >
                  {sel.preview}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </section>
        {"\n  "}
      </div>
    );
  }
}
