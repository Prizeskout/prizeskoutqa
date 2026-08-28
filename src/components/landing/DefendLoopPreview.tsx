import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, ShieldCheck } from "lucide-react";
import "./DefendLoopPreview.css";

const steps = ["Set protection floor", "Preview affected products", "Review and activate", "Monitor outcomes"];

export function DefendLoopPreview() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) { setPlaying(false); setStage(3); return; }
    if (!playing || !inView) return;
    const timer = window.setTimeout(() => setStage((value) => (value + 1) % steps.length), 2200);
    return () => window.clearTimeout(timer);
  }, [inView, playing, stage]);

  return (
    <div ref={previewRef} className="dlp" data-stage={stage} data-reveal>
      <header className="dlp-bar">
        <div><span>PrizeSkout</span><b>Margin Policy Engine</b></div>
        <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause product preview" : "Play product preview"}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {playing ? "Pause" : "Play"}
        </button>
      </header>
      <div className="dlp-app">
        <aside className="dlp-nav" aria-hidden="true">
          <strong>Prize<span>skout</span></strong>
          {["Overview", "Catalog", "Margin Intelligence", "Alerts", "Payout Recovery", "Promotion Simulator", "Defend Loop", "AI Store Manager", "CFO Copilot", "Integrations", "Evidence & History", "Settings"].map((item) => <i className={item === "Defend Loop" ? "active" : ""} key={item}>{item}</i>)}
        </aside>
        <main className="dlp-workspace">
          <div className="dlp-title"><div><span>Defend Loop</span><h3>Protect margin with merchant-controlled rules</h3><p>Set the floor PrizeSkout must defend, preview the impact, and keep every proposed store change behind your approval.</p></div><ShieldCheck aria-hidden="true" /></div>
          <div className="dlp-metrics">
            <article><span>Protection status</span><b>{stage < 2 ? "Review" : "Active"}</b><small>{stage < 2 ? "Complete a supported channel to begin monitoring" : "Policy monitoring is active"}</small></article>
            <article className={stage === 0 ? "focus" : ""}><span>Margin floor</span><b>18%</b><small>Minimum contribution to keep</small></article>
            <article><span>Policy version</span><b>{stage < 2 ? "1" : "2"}</b><small>Current auditable rule set</small></article>
            <article><span>Costs confirmed</span><b>{stage < 1 ? "0" : "24"}</b><small>Products eligible for calculation</small></article>
          </div>
          <div className="dlp-panels">
            <article className={stage === 1 ? "focus" : ""}><span>Protection coverage</span><div className="dlp-ring"><b>{stage < 1 ? "0" : "24"}</b><small>products</small></div><p>Eligible products with confirmed costs</p></article>
            <article className="dlp-policy"><span>Policy workflow</span><div>{steps.map((step, index) => <i className={index <= stage ? "done" : ""} key={step}><b>{index < stage ? <Check /> : ""}</b><small>{step}</small></i>)}</div></article>
            <article className={stage === 2 ? "focus" : ""}><span>Channel protection</span><p><b>Zid</b><em>{stage >= 2 ? "Protected" : "Review required"}</em></p><p><b>Salla</b><em>{stage >= 2 ? "Protected" : "Review required"}</em></p><button type="button">{stage >= 2 ? "Policy active" : "Review channel targets"}</button></article>
          </div>
          <div className={`dlp-outcome ${stage === 3 ? "show" : ""}`}><Check aria-hidden="true" /><div><b>Margin policy active</b><span>Every proposed change remains behind merchant approval.</span></div></div>
        </main>
      </div>
    </div>
  );
}
