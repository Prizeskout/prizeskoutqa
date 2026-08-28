import { useEffect, useRef, useState } from "react";
import "./HeroCardSystem.css";

const cards = [
  ["Your commerce data", "See the whole order", "Orders, fees and payouts together", "input"],
  ["What should have happened", "Know what you should earn", "Every cost rebuilt order by order", "twin"],
  ["What actually happened", "Catch what is missing", "Fees, discounts and payout gaps explained", "policy"],
  ["You stay in control", "Choose what happens next", "Review first. Approve every action.", "action"],
  ["Nothing gets lost", "Keep the proof", "A clear record for every decision", "evidence"],
] as const;

export function HeroCardSystem() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
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
    if (!inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % cards.length), 1850);
    return () => window.clearInterval(timer);
  }, [inView]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--hero-x", `${x * 10}px`);
    event.currentTarget.style.setProperty("--hero-y", `${y * 7}px`);
  };

  const resetPointer = () => {
    rootRef.current?.style.setProperty("--hero-x", "0px");
    rootRef.current?.style.setProperty("--hero-y", "0px");
  };

  const bounceCard = (event: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = event.currentTarget;
    card.classList.remove("is-bouncing");
    void card.offsetWidth;
    card.classList.add("is-bouncing");
    const finishBounce = (animationEvent: AnimationEvent) => {
      if (!animationEvent.animationName.startsWith("nlp-card-bounce")) return;
      card.classList.remove("is-bouncing");
      card.removeEventListener("animationend", finishBounce);
    };
    card.addEventListener("animationend", finishBounce);
  };

  return (
    <div
      ref={rootRef}
      className="nlp-hero-system nlp-card-story"
      aria-label="How PrizeSkout protects the margin on every order"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <p className="nlp-visually-hidden">
        PrizeSkout brings together commerce data, reconstructs what each order should earn,
        finds missing margin, lets the merchant decide what happens next, and keeps the proof.
      </p>
      <div className="nlp-system-track" aria-hidden="true">
        {cards.map(([eyebrow, title, detail, name], index) => (
          <article
            className={`nlp-system-card nlp-system-${name}${active === index ? " is-active" : ""}${index < active ? " is-complete" : ""}`}
            key={title}
            style={{ "--story-index": index } as React.CSSProperties}
            onPointerDown={bounceCard}
          >
            <span>{eyebrow}</span>
            <strong>{title}</strong>
            <small>{detail}</small>
            <i className="nlp-card-progress" />
          </article>
        ))}
      </div>
      <div className="nlp-system-caption" aria-hidden="true">
        <span className={active < 2 ? "is-active" : ""}>See the full picture</span>
        <i className={active >= 1 ? "is-complete" : ""} />
        <span className={active >= 2 && active < 4 ? "is-active" : ""}>Find the difference</span>
        <i className={active >= 3 ? "is-complete" : ""} />
        <span className={active === 4 ? "is-active" : ""}>Decide with proof</span>
      </div>
    </div>
  );
}
