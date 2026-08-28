import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import "./HeroCardSystem.css";

const cards = [
  ["Your commerce data", "See the whole order", "Orders, fees and payouts together", "input", "Order #PS-84217", [["Order value", "QAR 186.00"], ["Channel fees", "QAR 42.18"], ["Payout", "QAR 143.82"]]],
  ["What should have happened", "Know what you should earn", "Every cost rebuilt order by order", "twin", "Expected economics", [["Expected net", "QAR 38.64"], ["Margin", "20.8%"], ["Costs rebuilt", "6 of 6"]]],
  ["What actually happened", "Catch what is missing", "Fees, discounts and payout gaps explained", "policy", "Discrepancy found", [["Margin gap", "QAR 6.24"], ["Charged", "22.4%"], ["Contract rate", "19.0%"]]],
  ["You stay in control", "Choose what happens next", "Review first. Approve every action.", "action", "Policy ready", [["Margin floor", "18.0%"], ["Affected SKUs", "12"], ["Status", "Awaiting approval"]]],
  ["Nothing gets lost", "Keep the proof", "A clear record for every decision", "evidence", "Evidence retained", [["Evidence ID", "EV-84217"], ["Sources matched", "5"], ["Decision", "Recorded"]]],
] as const;

export function HeroCardSystem() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<number | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || hovered !== null || flipped !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActive((value) => (value + 1) % cards.length), 2350);
    return () => window.clearTimeout(timer);
  }, [active, flipped, hovered, inView]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--hero-x", `${x * 12}px`);
    event.currentTarget.style.setProperty("--hero-y", `${y * 8}px`);
    event.currentTarget.style.setProperty("--hero-rx", `${y * -1.4}deg`);
    event.currentTarget.style.setProperty("--hero-ry", `${x * 1.8}deg`);
  };

  const resetPointer = () => {
    rootRef.current?.style.setProperty("--hero-x", "0px");
    rootRef.current?.style.setProperty("--hero-y", "0px");
    rootRef.current?.style.setProperty("--hero-rx", "0deg");
    rootRef.current?.style.setProperty("--hero-ry", "0deg");
    setHovered(null);
  };

  return (
    <div
      ref={rootRef}
      className="nlp-hero-system nlp-card-story"
      data-hovered={hovered ?? ""}
      aria-label="How PrizeSkout protects the margin on every order"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      data-active={active}
    >
      <p className="nlp-visually-hidden">
        PrizeSkout brings together commerce data, reconstructs what each order should earn,
        finds missing margin, lets the merchant decide what happens next, and keeps the proof.
      </p>
      <div className="nlp-system-track">
        {cards.map(([eyebrow, title, detail, name, resultTitle, resultRows], index) => (
          <button
            type="button"
            aria-pressed={active === index}
            aria-expanded={flipped === index}
            aria-label={`${title}. ${detail}. ${flipped === index ? "Hide" : "Show"} operational detail.`}
            className={`nlp-system-card nlp-system-${name}${active === index ? " is-active" : ""}${index < active ? " is-complete" : ""}${active < cards.length - 1 && index === active + 1 ? " is-next" : ""}${flipped === index ? " is-flipped" : ""}`}
            key={title}
            style={{ "--story-index": index } as React.CSSProperties}
            onPointerEnter={() => {
              setHovered(index);
              setActive(index);
            }}
            onFocus={() => {
              setHovered(index);
              setActive(index);
            }}
            onBlur={(event) => {
              if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setHovered(null);
            }}
            onClick={() => {
              setHovered(index);
              setActive(index);
              setFlipped((current) => current === index ? null : index);
            }}
          >
            <i className="nlp-story-state" aria-hidden="true">{index < active ? <Check /> : String(index + 1).padStart(2, "0")}</i>
            <div className="nlp-card-flip">
              <div className="nlp-card-face nlp-card-front">
                <span>{eyebrow}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
              <div className="nlp-card-face nlp-card-back" aria-hidden={flipped !== index}>
                <span>{String(index + 1).padStart(2, "0")} · PrizeSkout</span>
                <strong>{resultTitle}</strong>
                <div className="nlp-card-result">
                  {resultRows.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}
                </div>
                <em><Check /> Verified</em>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="nlp-system-caption" aria-hidden="true">
        <span className={active < 2 ? "is-active" : ""}>See the full picture</span>
        <i />
        <span className={active >= 2 && active < 4 ? "is-active" : ""}>Find the difference</span>
        <i />
        <span className={active === 4 ? "is-active" : ""}>Decide with proof</span>
      </div>
    </div>
  );
}
