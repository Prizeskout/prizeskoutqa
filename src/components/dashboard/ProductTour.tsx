// Spotlight product tour — positioning engine only. Callers own the step
// sequence, copy, and any app-state side effects (e.g. switching tabs before
// a step's target exists in the DOM); this component just finds the target,
// keeps a ring locked onto it across scroll/resize, and places the tooltip
// in whichever of the four directions actually has room.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type TourStep = {
  id: string;
  target?: string; // CSS selector; omitted => centered card, no spotlight
  title: string;
  body: string;
};

type TourLabels = { back: string; next: string; finish: string; skip: string; start: string };

type Rect = { top: number; left: number; width: number; height: number };
type Placement = "top" | "bottom" | "left" | "right";

const OG = "#EF681A";
const MONO = "'Chillax',ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const RING_PAD = 10;
const TOOLTIP_GAP = 14;
const TOOLTIP_W = 360;

const CSS = `
  @keyframes pk-tour-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pk-tour-ring{0%,100%{opacity:1}50%{opacity:.45}}
  @keyframes pk-tour-pop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
`;

function useTargetRect(selector: string | undefined, stepId: string): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledFor = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      if (scrolledFor.current !== stepId) {
        scrolledFor.current = stepId;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    measure();
    const frame = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [selector, stepId]);

  return rect;
}

export function ProductTour({
  steps, stepIndex, onStepChange, onClose, onFinish, dir, labels,
}: {
  steps: TourStep[];
  stepIndex: number;
  onStepChange: (i: number) => void;
  onClose: () => void;
  onFinish: () => void;
  dir: "ltr" | "rtl";
  labels: TourLabels;
}) {
  const step = steps[stepIndex];
  const rect = useTargetRect(step?.target, step?.id ?? "");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const centered = !rect;

  useLayoutEffect(() => {
    if (centered) { setPos(null); return; }
    const el = tooltipRef.current;
    if (!el || !rect) return;
    const tw = el.offsetWidth || TOOLTIP_W;
    const th = el.offsetHeight || 160;
    const vw = window.innerWidth, vh = window.innerHeight;
    const candidates: Record<Placement, { top: number; left: number }> = {
      bottom: { top: rect.top + rect.height + RING_PAD + TOOLTIP_GAP, left: rect.left + rect.width / 2 - tw / 2 },
      top:    { top: rect.top - RING_PAD - TOOLTIP_GAP - th,          left: rect.left + rect.width / 2 - tw / 2 },
      right:  { top: rect.top + rect.height / 2 - th / 2,             left: rect.left + rect.width + RING_PAD + TOOLTIP_GAP },
      left:   { top: rect.top + rect.height / 2 - th / 2,             left: rect.left - RING_PAD - TOOLTIP_GAP - tw },
    };
    const order: Placement[] = dir === "rtl" ? ["bottom", "top", "left", "right"] : ["bottom", "top", "right", "left"];
    const fit = order.find(p => {
      const c = candidates[p];
      return c.top >= 8 && c.top + th <= vh - 8 && c.left >= 8 && c.left + tw <= vw - 8;
    });
    const chosen = candidates[fit ?? "bottom"];
    setPos({
      top: Math.min(Math.max(chosen.top, 8), Math.max(8, vh - th - 8)),
      left: Math.min(Math.max(chosen.left, 8), Math.max(8, vw - tw - 8)),
    });
  }, [rect, centered, stepIndex, dir]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "Enter") { isLast ? onFinish() : onStepChange(stepIndex + 1); }
      if (e.key === "ArrowLeft" && !isFirst) onStepChange(stepIndex - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepIndex, isFirst, isLast, onClose, onFinish, onStepChange]);

  // The scrim blocks pointer access to the app underneath, but keyboard focus
  // can still land there via Tab (or already be there — e.g. mid-typing when
  // the tour auto-opens). Pull focus into the tooltip on every step, and pull
  // it back if it strays, so Enter/Arrow keys only ever drive the tour.
  useEffect(() => {
    tooltipRef.current?.focus();
    const trap = (e: FocusEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        tooltipRef.current.focus();
      }
    };
    document.addEventListener("focusin", trap);
    return () => document.removeEventListener("focusin", trap);
  }, [stepIndex]);

  if (!step) return null;

  return (
    <>
      <style>{CSS}</style>

      {/* Click-blocking scrim. Transparent when a spotlight ring is doing the
          dimming via its own box-shadow (avoids double-dimming); opaque for
          the centered welcome/closing card, which has no ring. */}
      <div style={{ position: "fixed", inset: 0, zIndex: 300,
        background: centered ? "rgba(8,10,14,.6)" : "transparent" }} />

      {!centered && rect && (
        <>
          {/* Backdrop dimming — static. Kept separate from the ring below so
              animating the ring's opacity doesn't make the whole page flicker. */}
          <div style={{ position: "fixed", zIndex: 301, pointerEvents: "none",
            top: rect.top - RING_PAD, left: rect.left - RING_PAD,
            width: rect.width + RING_PAD * 2, height: rect.height + RING_PAD * 2,
            borderRadius: 14, boxShadow: "0 0 0 4000px rgba(8,10,14,.66)" }} />
          {/* Accent ring — breathes */}
          <div style={{ position: "fixed", zIndex: 301, pointerEvents: "none",
            top: rect.top - RING_PAD, left: rect.left - RING_PAD,
            width: rect.width + RING_PAD * 2, height: rect.height + RING_PAD * 2,
            borderRadius: 14, border: `2px solid ${OG}`,
            boxShadow: `0 0 0 5px color-mix(in srgb,${OG} 22%,transparent)`,
            animation: "pk-tour-pop .25s ease, pk-tour-ring 2.2s ease-in-out infinite" }} />
        </>
      )}

      <div ref={tooltipRef} role="dialog" aria-modal="true" aria-label={step.title} dir={dir} tabIndex={-1}
        style={{ outline: "none",
          position: "fixed", zIndex: 302, width: TOOLTIP_W, maxWidth: "calc(100vw - 32px)",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
          boxShadow: "var(--shadow-lg)", padding: "22px 24px",
          display: "flex", flexDirection: "column", gap: 16,
          animation: "pk-tour-in .25s ease",
          ...(centered
            ? { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
            : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? "visible" : "hidden" }),
        }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "1px", color: "var(--muted)" }}>
            {String(stepIndex + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
          <button onClick={onClose} aria-label={labels.skip} title={labels.skip}
            style={{ cursor: "pointer", flexShrink: 0, width: 26, height: 26, borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)",
              fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center", padding: 0 }}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, letterSpacing: "-0.2px" }}>{step.title}</h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--muted)" }}>{step.body}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          flexDirection: dir === "rtl" ? "row-reverse" : "row" }}>
          <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} style={{ width: 16, height: 3, borderRadius: 2,
                background: i === stepIndex ? OG : i < stepIndex ? "var(--muted)" : "var(--border)",
                transition: "background .2s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexDirection: dir === "rtl" ? "row-reverse" : "row" }}>
            {!isFirst && (
              <button onClick={() => onStepChange(stepIndex - 1)}
                style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--text)",
                  background: "transparent", border: "1.5px solid var(--border)", borderRadius: 9,
                  padding: "9px 14px", fontFamily: "inherit" }}>
                {labels.back}
              </button>
            )}
            <button onClick={() => isLast ? onFinish() : onStepChange(stepIndex + 1)}
              style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff",
                background: isLast ? "#10B981" : OG, border: "none", borderRadius: 9,
                padding: "9px 16px", fontFamily: "inherit" }}>
              {isFirst ? labels.start : isLast ? labels.finish : labels.next}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
