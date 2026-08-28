import { useEffect, useState } from "react";
import { Check, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import "./LiveDashboardDemo.css";

const scenes = [
  { title: "True Margin Intelligence", nav: "Margin Intelligence" },
  { title: "Payout Recovery", nav: "Payout Recovery" },
  { title: "Promotion Simulator", nav: "Promotion Simulator" },
  { title: "Defend Loop", nav: "Defend Loop" },
  { title: "AI Store Manager", nav: "AI Store Manager" },
  { title: "CFO Copilot", nav: "CFO Copilot" },
] as const;

const navItems = ["Overview", "Catalog", "Margin Intelligence", "Payout Recovery", "Promotion Simulator", "Defend Loop", "AI Store Manager", "CFO Copilot", "Evidence & History"];

export function LiveDashboardDemo({ workflow }: { workflow: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(4);
      return;
    }
    const timers = [900, 2200, 3700, 5300].map((delay, index) =>
      window.setTimeout(() => setStep(index + 1), delay),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [workflow]);

  const scene = scenes[workflow];
  return (
    <div className="ldd" data-scene={workflow} data-step={step}>
      <header className="ldd-topbar">
        <strong>Prize<span>skout</span></strong>
        <div><b>{scene.title}</b></div>
      </header>
      <div className="ldd-app">
        <aside aria-hidden="true">
          {navItems.map((item) => <span className={item === scene.nav ? "active" : ""} key={item}>{item}</span>)}
        </aside>
        <main aria-live="polite">
          {workflow === 0 && <MarginScene step={step} />}
          {workflow === 1 && <RecoveryScene step={step} />}
          {workflow === 2 && <PromotionScene step={step} />}
          {workflow === 3 && <DefendScene step={step} />}
          {workflow === 4 && <ManagerScene step={step} />}
          {workflow === 5 && <CopilotScene step={step} />}
        </main>
      </div>
    </div>
  );
}

function SceneHead({ eyebrow, title, status }: { eyebrow: string; title: string; status: string }) {
  return <div className="ldd-head"><div><span>{eyebrow}</span><h3>{title}</h3></div><b>{status}</b></div>;
}

function Metric({ label, value, note, changed }: { label: string; value: string; note: string; changed?: boolean }) {
  return <article className={`ldd-metric${changed ? " changed" : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function MarginScene({ step }: { step: number }) {
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const orders = [
    ["#TK-10428", "Talabat", "QAR 86.00", "QAR 18.42"],
    ["#SN-88319", "Snoonu", "QAR 64.50", "QAR 15.08"],
    ["#JZ-55107", "Jahez", "QAR 112.00", "QAR 9.16"],
  ];
  return <>
    <SceneHead eyebrow="True margin intelligence" title="Today’s order economics" status={step < 4 ? "Calculating" : "3 orders need attention"} />
    <div className="ldd-metrics">
      <Metric label="Orders received" value={step < 1 ? "0" : step < 2 ? "18" : "238"} note="Across connected channels" changed={step === 1} />
      <Metric label="Revenue reconstructed" value={step < 2 ? "QAR 0" : "QAR 18,420"} note="Order by order" changed={step === 2} />
      <Metric label="True margin" value={step < 3 ? "—" : "21.4%"} note="After every known cost" changed={step === 3} />
      <Metric label="Margin at risk" value={step < 4 ? "—" : "QAR 1,284"} note="Evidence ready" changed={step === 4} />
    </div>
    <section className="ldd-table"><header><span>Order</span><span>Channel</span><span>Collected</span><span>True earnings</span></header>{orders.map((row, index)=><button type="button" onClick={() => setSelectedOrder(index)} className={`${step >= index + 1 ? "show" : ""}${selectedOrder === index ? " selected" : ""}`} key={row[0]}>{row.map((cell, cellIndex)=><span className={cellIndex === 3 && index === 2 ? "risk" : ""} key={cell}>{cell}</span>)}</button>)}</section>
    <div className={`ldd-order-detail ${selectedOrder !== null ? "show" : ""}`}><div><small>{selectedOrder === null ? "Order detail" : orders[selectedOrder][0]}</small><b>{selectedOrder === 2 ? "Commission above contracted rate" : "Order economics verified"}</b></div><span>Food cost <b>{selectedOrder === 2 ? "QAR 47.20" : "QAR 28.40"}</b></span><span>Channel fees <b>{selectedOrder === 2 ? "QAR 18.44" : "QAR 12.60"}</b></span><button type="button" onClick={() => setSelectedOrder(null)}>Close</button></div>
    <div className={`ldd-notice ${step === 4 ? "show" : ""}`}><ShieldCheck /><div><b>Margin leak isolated</b><span>Commission exceeded the contracted rate on 3 orders.</span></div></div>
  </>;
}

function RecoveryScene({ step }: { step: number }) {
  const [manualRun, setManualRun] = useState(false);
  const complete = step >= 4 || manualRun;
  return <>
    <SceneHead eyebrow="Payout recovery" title="Settlement reconciliation" status={!complete ? "Reviewing statement" : "Recovery case ready"} />
    <div className="ldd-upload"><FileCheck2 /><div><b>talabat-settlement-aug-24.csv</b><span>{step < 1 ? "Statement received" : step < 2 ? "Matching 238 orders" : "238 orders matched"}</span></div><em className={step >= 2 ? "done" : ""}>{step >= 2 ? <Check /> : "···"}</em></div>
    <div className="ldd-reconcile">
      <article><span>Expected payout</span><b>{step < 2 ? "—" : "QAR 15,908.40"}</b></article>
      <i className={step >= 3 ? "resolved" : ""} />
      <article><span>Reported payout</span><b>{step < 2 ? "—" : "QAR 15,641.20"}</b></article>
      <article className={step >= 3 ? "difference" : ""}><span>Difference</span><b>{step < 3 ? "—" : "QAR 267.20"}</b></article>
    </div>
    <section className={`ldd-evidence ${step >= 3 || manualRun ? "show" : ""}`}><div><small>Recovery evidence</small><b>{complete ? "6 affected orders · 4 retained records" : "Ready to compare expected and reported payouts"}</b></div><button type="button" onClick={() => setManualRun(true)}>{complete ? "Reconciliation complete" : "Run reconciliation"}</button></section>
  </>;
}

function PromotionScene({ step }: { step: number }) {
  const [discount, setDiscount] = useState(20);
  const margin = Math.max(8, 32.1 - discount * 0.67);
  const revenue = Math.round(42600 * (1 + discount * 0.0074));
  const safe = margin >= 18;
  return <>
    <SceneHead eyebrow="Promotion simulator" title="Compare the economics before publishing" status={step < 4 ? "Scenario running" : "Recommendation ready"} />
    <div className="ldd-fields"><label>Campaign type<b>{step < 1 ? "Select" : "Percentage discount"}</b></label><label className="ldd-range">Discount<b>{discount}%</b><input aria-label="Promotion discount" type="range" min="5" max="25" step="1" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label><label>Duration<b>{step < 2 ? "—" : "14 days"}</b></label><label>Protected margin floor<b>{step < 2 ? "—" : "18%"}</b></label></div>
    <div className="ldd-scenarios"><article><span>Baseline</span><strong>QAR 42,600</strong><small>Projected revenue</small><b>24.1% margin</b></article><article className={step >= 3 ? safe ? "safe" : "unsafe" : ""}><span>Requested · {discount}%</span><strong>{step < 3 ? "Calculating" : `QAR ${revenue.toLocaleString()}`}</strong><small>Projected revenue</small><b>{step < 3 ? "—" : `${margin.toFixed(1)}% margin`}</b></article><article className={step >= 4 ? "safe" : ""}><span>Protected plan · 15%</span><strong>{step < 4 ? "Waiting" : "QAR 47,180"}</strong><small>Projected revenue</small><b>{step < 4 ? "—" : "18.7% margin"}</b></article></div>
    <div className={`ldd-notice ${step >= 3 ? "show" : ""}`}><Sparkles /><div><b>{safe ? "This scenario protects the margin floor" : "Use the 15% scenario"}</b><span>{safe ? "The requested discount remains within the merchant’s policy." : "It protects the merchant’s margin floor while preserving projected growth."}</span></div></div>
  </>;
}

function DefendScene({ step }: { step: number }) {
  const [floor, setFloor] = useState(18);
  const [approved, setApproved] = useState(false);
  const finished = step >= 4 || approved;
  return <>
    <SceneHead eyebrow="Defend loop" title="Protect margin with merchant-controlled rules" status={!finished ? "Draft policy" : "Policy active"} />
    <div className="ldd-fields"><label className="ldd-range">Margin floor<b>{floor}%</b><input aria-label="Protected margin floor" type="range" min="12" max="28" value={floor} onChange={(event) => { setFloor(Number(event.target.value)); setApproved(false); }} /></label><label>Channels<b>{step < 2 ? "—" : "Zid · Salla · Talabat"}</b></label><label>Affected products<b>{step < 2 ? "—" : String(12 + floor - 6)}</b></label></div>
    <div className="ldd-policy-flow">{["Set protection floor","Preview affected products","Review and activate","Monitor outcomes"].map((label,index)=><div className={step > index ? "done" : step === index ? "active" : ""} key={label}><i>{step > index ? <Check /> : index + 1}</i><span>{label}</span></div>)}</div>
    <section className={`ldd-approval ${step >= 3 ? "show" : ""}`}><div><small>Merchant approval</small><b>{!finished ? `${12 + floor - 6} products are ready for protection` : "Approved by account owner"}</b></div><button onClick={() => setApproved(true)} className={finished ? "approved" : ""} type="button">{finished ? "Policy active" : "Approve policy"}</button></section>
  </>;
}

function ManagerScene({ step }: { step: number }) {
  const [approved, setApproved] = useState(false);
  const complete = step >= 4 || approved;
  const tasks = [["Review payout discrepancy","QAR 267.20 at risk"],["Approve margin policy","24 products affected"],["Update catalog costs","6 products need evidence"]];
  return <>
    <SceneHead eyebrow="AI Store Manager" title="Merchant-controlled operations" status={!complete ? "Preparing work" : "Action completed"} />
    <div className="ldd-manager"><section><span>Attention queue</span>{tasks.map((task,index)=><article className={step >= index ? "show" : ""} key={task[0]}><i>{index+1}</i><div><b>{task[0]}</b><small>{task[1]}</small></div><em>{step > index ? "Ready" : "Review"}</em></article>)}</section><section className={`ldd-action-card ${step >= 2 ? "show" : ""}`}><small>Proposed action</small><h4>Prepare payout recovery case</h4><p>Compile the affected orders, agreement terms, and settlement evidence.</p><div><button type="button" onClick={() => setApproved(false)}>Keep for review</button><button onClick={() => setApproved(true)} className={complete ? "approved" : ""} type="button">{complete ? "Approved" : "Approve"}</button></div></section></div>
    <div className={`ldd-notice ${complete ? "show" : ""}`}><Check /><div><b>Recovery case prepared</b><span>The action and approval are retained in Evidence & History.</span></div></div>
  </>;
}

function CopilotScene({ step }: { step: number }) {
  const questions = ["Why did margin fall on Talabat this week?", "Which payouts need recovery review?", "Can we safely run a 20% promotion?"];
  const [question, setQuestion] = useState(questions[0]);
  const [manualQuestion, setManualQuestion] = useState(false);
  const [answerReady, setAnswerReady] = useState(false);
  useEffect(() => {
    if (!manualQuestion) return;
    setAnswerReady(false);
    const timer = window.setTimeout(() => setAnswerReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [manualQuestion, question]);
  const complete = step >= 4 || (manualQuestion && answerReady);
  return <>
    <SceneHead eyebrow="CFO Copilot" title="Investigate the numbers with retained evidence" status={!complete ? "Investigating" : "Answer ready"} />
    <div className="ldd-question"><span>{step < 1 && !answerReady ? "" : question}</span><i className={!complete ? "typing" : ""} /></div>
    <div className="ldd-question-options">{questions.map((item) => <button type="button" className={item === question ? "active" : ""} onClick={() => { setManualQuestion(true); setQuestion(item); }} key={item}>{item}</button>)}</div>
    <div className={`ldd-thinking ${step >= 2 && !complete ? "show" : ""}`}><i /><span>{step === 2 ? "Reading 238 orders and 3 agreements" : "Checking fees against retained terms"}</span></div>
    <section className={`ldd-answer ${complete ? "show" : ""}`}><small>Finding</small><h4>{question.includes("payouts") ? "Six payout discrepancies are ready for recovery review." : question.includes("promotion") ? "A 20% promotion would breach the protected margin floor." : "Margin fell 3.8 points after excess commission on 18 orders."}</h4><p>{question.includes("promotion") ? "A 15% discount preserves an 18.7% projected margin and keeps the campaign within policy." : "Talabat reported QAR 421.60 more in commission than the retained agreement permits. Six orders are ready for recovery review."}</p><div><span><FileCheck2 /> Agreement v3</span><span><FileCheck2 /> 18 order records</span><span><FileCheck2 /> Settlement statement</span></div></section>
  </>;
}
