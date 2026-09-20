import { useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Calculator,
  FileCheck2,
  RotateCcw,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import logoLight from "@/assets/logo-light.svg";

export const Route = createFileRoute("/snoonu-pilot-demo")({
  head: () => ({ meta: [{ title: "Snoonu Pilot Contract Simulation | PrizeSkout" }] }),
  component: SnoonuPilotDemo,
});

const INK = "#0A1734";
const TEXT = "#0F1F3D";
const MUTED = "#657492";
const BORDER = "#E2E7EF";
const CANVAS = "#F3F5F9";
const ORANGE = "#F36A21";
const GREEN = "#0D9F6E";
const AMBER = "#C98212";
const RED = "#C43D32";

const stages = [
  {
    eyebrow: "01 · Source",
    title: "Signed partner event received",
    summary: "PrizeSkout verifies the proposed Snoonu webhook contract before accepting the payload.",
    icon: Webhook,
    status: "HTTP 202 · signature accepted",
    detail: "HMAC-SHA256 verified · timestamp inside 5-minute tolerance · event ID not previously processed",
  },
  {
    eyebrow: "02 · Normalize",
    title: "Order converted into the Economic Twin",
    summary: "The fixture becomes a channel-neutral order record with branch and settlement economics.",
    icon: FileCheck2,
    status: "Normalized",
    detail: "Order SN-DEMO-1042 · Branch DOHA-FIXTURE-01 · currency QAR · 2 line items",
  },
  {
    eyebrow: "03 · Calculate",
    title: "Expected payout calculated",
    summary: "PrizeSkout applies only the values carried by the deterministic fixture.",
    icon: Calculator,
    status: "Expected payout · QAR 75.00",
    detail: "QAR 100.00 gross − QAR 20.00 commission − QAR 5.00 merchant-funded discount",
  },
  {
    eyebrow: "04 · Detect",
    title: "Settlement exception identified",
    summary: "The simulated settlement reports less than the expected payout for the same reference.",
    icon: ShieldCheck,
    status: "QAR 3.50 shortfall",
    detail: "Expected QAR 75.00 · reported QAR 71.50 · exact reference match · claims-ready simulation",
  },
  {
    eyebrow: "05 · Decide",
    title: "Copilot prepares a governed next step",
    summary: "The assistant explains the variance and prepares evidence without claiming external submission.",
    icon: Bot,
    status: "Read-only action prepared",
    detail: "Prepare recovery evidence pack · merchant review required · Snoonu submission remains manual",
  },
  {
    eyebrow: "06 · Retain",
    title: "Decision record is ready for audit",
    summary: "The source, calculation, finding, boundary and proposed action remain linked.",
    icon: BadgeCheck,
    status: "Evidence chain complete",
    detail: "No payout recovered and no Snoonu action submitted in this simulation",
  },
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR" }).format(value);
}

function SnoonuPilotDemo() {
  const [active, setActive] = useState(0);
  const stage = stages[active];
  const Icon = stage.icon;
  const complete = active === stages.length - 1;

  return (
    <div className="snoonu-pilot" style={{ minHeight: "100vh", background: CANVAS, color: TEXT }}>
      <style>{`
        .snoonu-pilot * { box-sizing: border-box; }
        .snoonu-pilot { font-family: "Plus Jakarta Sans", Inter, system-ui, sans-serif; }
        .pilot-shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
        .pilot-chain { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
        .pilot-main { display: grid; grid-template-columns: minmax(250px, .72fr) minmax(0, 1.7fr); gap: 20px; }
        .pilot-economics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .pilot-proof { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(260px, .7fr); gap: 14px; }
        .pilot-stage-button:hover { background: #F7F8FB !important; }
        .pilot-stage-button:focus-visible, .pilot-button:focus-visible, .pilot-link:focus-visible { outline: 3px solid rgba(243,106,33,.28); outline-offset: 2px; }
        @media (max-width: 860px) {
          .pilot-chain { grid-template-columns: repeat(3, 1fr); }
          .pilot-main, .pilot-proof { grid-template-columns: 1fr; }
          .pilot-economics { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .pilot-shell { width: min(100% - 24px, 1180px); }
          .pilot-chain { grid-template-columns: repeat(2, 1fr); }
          .pilot-economics { grid-template-columns: 1fr; }
          .pilot-actions { flex-direction: column; align-items: stretch !important; }
          .pilot-actions .pilot-button, .pilot-actions .pilot-link { justify-content: center; width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) { .snoonu-pilot * { scroll-behavior: auto !important; transition: none !important; } }
      `}</style>

      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}` }}>
        <div className="pilot-shell" style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="/" aria-label="PrizeSkout home" style={{ display: "inline-flex" }}>
            <img src={logoLight} alt="PrizeSkout" style={{ height: 30, width: "auto" }} />
          </a>
          <div style={{ textAlign: "right" }}>
            <strong style={{ display: "block", fontSize: 13 }}>Snoonu pilot contract simulation</strong>
            <span style={{ display: "block", marginTop: 2, color: MUTED, fontSize: 11.5 }}>Deterministic fixture · no external writes</span>
          </div>
        </div>
      </header>

      <main className="pilot-shell" style={{ paddingBlock: 24 }}>
        <section role="status" style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "13px 15px", border: "1px solid #F3D39C", borderRadius: 11, background: "#FFF8E9", color: "#7A4C08" }}>
          <ShieldCheck size={19} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 1 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            <strong>This is simulated partner-contract data.</strong> PrizeSkout does not have a live Snoonu merchant connection. The workflow demonstrates the signed event contract, calculation and approval boundary using a fixed test fixture.
          </div>
        </section>

        <section style={{ padding: "34px 0 24px" }}>
          <div style={{ color: ORANGE, fontSize: 11, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" }}>Pilot proof · contract-ready</div>
          <h1 style={{ maxWidth: 850, margin: "8px 0 10px", color: INK, fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.08, letterSpacing: "-.04em" }}>
            From a signed Snoonu fixture to a governed financial decision
          </h1>
          <p style={{ maxWidth: 780, margin: 0, color: MUTED, fontSize: 15, lineHeight: 1.65 }}>
            Walk through the exact boundary PrizeSkout is prepared to operate once Snoonu authorizes merchant data access. Nothing on this page calls Snoonu or changes a merchant account.
          </p>
        </section>

        <section aria-label="Evidence chain" className="pilot-chain" style={{ overflow: "hidden", border: `1px solid ${BORDER}`, borderRadius: 12, background: "#FFFFFF", marginBottom: 20 }}>
          {stages.map((item, index) => {
            const reached = index <= active;
            return (
              <button
                key={item.title}
                type="button"
                className="pilot-stage-button"
                aria-current={index === active ? "step" : undefined}
                onClick={() => setActive(index)}
                style={{ minHeight: 76, padding: "12px 10px", border: 0, borderInlineEnd: index < stages.length - 1 ? `1px solid ${BORDER}` : 0, background: index === active ? "#FFF7F1" : "#FFFFFF", color: reached ? TEXT : MUTED, cursor: "pointer", font: "inherit", textAlign: "left" }}
              >
                <span style={{ display: "grid", width: 23, height: 23, placeItems: "center", borderRadius: 999, background: reached ? ORANGE : "#EEF1F6", color: reached ? "#FFFFFF" : MUTED, fontSize: 10, fontWeight: 800 }}>{index + 1}</span>
                <span style={{ display: "block", marginTop: 7, fontSize: 10.5, fontWeight: 750, lineHeight: 1.3 }}>{item.eyebrow.split(" · ")[1]}</span>
              </button>
            );
          })}
        </section>

        <div className="pilot-main">
          <aside aria-label="Simulation stages" style={cardStyle}>
            <div style={{ padding: "17px 18px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={labelStyle}>Evidence chain</div>
              <strong style={{ display: "block", marginTop: 5, color: INK }}>Six bounded steps</strong>
            </div>
            <div style={{ padding: 8 }}>
              {stages.map((item, index) => (
                <button key={item.title} type="button" className="pilot-stage-button" onClick={() => setActive(index)} style={{ width: "100%", minHeight: 54, display: "flex", gap: 10, alignItems: "center", padding: "9px 10px", border: 0, borderRadius: 8, background: index === active ? "#FFF3EA" : "transparent", color: TEXT, cursor: "pointer", font: "inherit", textAlign: "left" }}>
                  <span style={{ width: 27, height: 27, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: 999, background: index <= active ? ORANGE : "#EEF1F6", color: index <= active ? "#FFFFFF" : MUTED, fontSize: 10, fontWeight: 800 }}>{index + 1}</span>
                  <span><strong style={{ display: "block", fontSize: 11.5 }}>{item.title}</strong><small style={{ display: "block", marginTop: 2, color: MUTED, fontSize: 9.5 }}>{index < active ? "Evidence retained" : index === active ? "Current step" : "Not reached"}</small></span>
                </button>
              ))}
            </div>
          </aside>

          <section aria-live="polite" style={{ ...cardStyle, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: 11, background: "#FFF1E7", color: ORANGE }}><Icon size={21} aria-hidden="true" /></span>
                <div>
                  <div style={labelStyle}>{stage.eyebrow}</div>
                  <h2 style={{ margin: "6px 0 5px", color: INK, fontSize: 22, letterSpacing: "-.025em" }}>{stage.title}</h2>
                  <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.55 }}>{stage.summary}</p>
                </div>
              </div>
              <span style={{ padding: "6px 9px", borderRadius: 999, border: `1px solid ${active === 3 ? "#EDB8B3" : "#A9DFCB"}`, background: active === 3 ? "#FFF2F0" : "#EFFAF6", color: active === 3 ? RED : GREEN, fontSize: 10.5, fontWeight: 800 }}>{stage.status}</span>
            </div>

            <div className="pilot-economics" style={{ overflow: "hidden", marginTop: 20, border: `1px solid ${BORDER}`, borderRadius: 11 }}>
              {[
                ["Gross order", money(100), TEXT],
                ["Commission", `− ${money(20)}`, RED],
                ["Merchant discount", `− ${money(5)}`, RED],
                ["Expected payout", money(75), GREEN],
              ].map(([label, value, color], index) => (
                <div key={label} style={{ padding: "13px 14px", borderInlineEnd: index < 3 ? `1px solid ${BORDER}` : 0, background: index === 3 ? "#F2FBF7" : "#FFFFFF" }}>
                  <span style={{ display: "block", color: MUTED, fontSize: 9.5, fontWeight: 750, textTransform: "uppercase" }}>{label}</span>
                  <strong style={{ display: "block", marginTop: 5, color, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{value}</strong>
                </div>
              ))}
            </div>

            <div className="pilot-proof" style={{ marginTop: 14 }}>
              <div style={{ padding: "15px 16px", borderRadius: 11, background: "#F7F8FB", border: `1px solid ${BORDER}` }}>
                <div style={labelStyle}>Retained proof</div>
                <p style={{ margin: "7px 0 0", color: TEXT, fontSize: 13, lineHeight: 1.6 }}>{stage.detail}</p>
              </div>
              <div style={{ padding: "15px 16px", borderRadius: 11, background: active >= 3 ? "#FFF4F1" : "#F7F8FB", border: `1px solid ${active >= 3 ? "#F2C4BC" : BORDER}` }}>
                <div style={labelStyle}>Control boundary</div>
                <p style={{ margin: "7px 0 0", color: active >= 3 ? "#8B3028" : MUTED, fontSize: 12, lineHeight: 1.55 }}>
                  {active < 4 ? "Read-only processing. No merchant or Snoonu state can change." : "Evidence preparation only. Claim submission needs an authorized Snoonu workflow or manual partner handoff."}
                </p>
              </div>
            </div>

            {active >= 4 && (
              <div style={{ marginTop: 14, padding: "15px 16px", borderRadius: 11, background: "#0E1C38", color: "#FFFFFF" }}>
                <div style={{ color: "#FF9A58", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>CFO Copilot · evidence-backed answer</div>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.65, color: "#E6EBF5" }}>
                  The simulated settlement is QAR 3.50 below the QAR 75.00 expected payout for the exact order reference. PrizeSkout can prepare the signed event, calculation and settlement comparison as a recovery pack. It cannot submit a Snoonu claim without partner-authorized access.
                </p>
              </div>
            )}

            <div className="pilot-actions" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 20 }}>
              <button type="button" className="pilot-button" onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0} style={{ ...secondaryButton, opacity: active === 0 ? .45 : 1, cursor: active === 0 ? "not-allowed" : "pointer" }}><ArrowLeft size={15} aria-hidden="true" /> Previous proof</button>
              {!complete ? (
                <button type="button" className="pilot-button" onClick={() => setActive(active + 1)} style={primaryButton}>Advance proof <ArrowRight size={15} aria-hidden="true" /></button>
              ) : (
                <button type="button" className="pilot-button" onClick={() => setActive(0)} style={primaryButton}><RotateCcw size={15} aria-hidden="true" /> Replay simulation</button>
              )}
            </div>
          </section>
        </div>

        <footer style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "24px 0 8px", color: MUTED, fontSize: 11.5 }}>
          <span>Fixture schema: 2026-09-09 · Event types and signature checks match the implemented pilot contract.</span>
          <a className="pilot-link" href="/dashboard/revenue-hub?workspace=vault" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, color: TEXT, fontWeight: 750, textDecoration: "none" }}>Return to Integration Vault <ArrowRight size={14} aria-hidden="true" /></a>
        </footer>
      </main>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${BORDER}`,
  borderRadius: 13,
  boxShadow: "0 1px 2px rgba(15,31,61,.04), 0 8px 24px rgba(15,31,61,.04)",
  overflow: "hidden",
};

const labelStyle: CSSProperties = {
  color: MUTED,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".07em",
  textTransform: "uppercase",
};

const secondaryButton: CSSProperties = {
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "10px 14px",
  borderRadius: 9,
  border: `1px solid ${BORDER}`,
  background: "#FFFFFF",
  color: TEXT,
  font: "700 12px inherit",
};

const primaryButton: CSSProperties = {
  ...secondaryButton,
  borderColor: ORANGE,
  background: ORANGE,
  color: "#FFFFFF",
  cursor: "pointer",
};
