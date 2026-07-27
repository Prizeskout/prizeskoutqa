// Click-to-explain overlay for screen recordings. Unlike ProductTour (a
// fixed, click-blocking sequence), this is free-form: while active, clicking
// any element carrying a data-demo-tip attribute shows a small callout near
// the click with that plain-English description, then fades out — without
// ever blocking or altering the click itself (no preventDefault/
// stopPropagation), so the real button still does its real thing. Off by
// default; toggled from the header, meant to be switched on just before
// recording and off afterward.

import { useEffect, useRef, useState } from "react";

const OG = "#EF681A";
const MONO = "'Chillax',ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const GAP = 14;
const WIDTH = 280;

const CSS = `
  @keyframes pk-demo-tip-in{from{opacity:0;transform:translateY(4px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes pk-demo-tip-out{from{opacity:1}to{opacity:0}}
`;

type Tip = { text: string; x: number; y: number; key: number; below: boolean };

export function DemoModeOverlay({ active }: { active: boolean }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const counter = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setTip(null); return; }
    const onClick = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      let text: string | undefined;
      // Walk up at most a handful of ancestors — deep enough to catch a tip
      // on a wrapping card when the click lands on an icon/span inside it,
      // shallow enough that it never crosses into an unrelated section.
      for (let depth = 0; el && depth < 14; depth++, el = el.parentElement) {
        if (el.dataset?.demoTip) { text = el.dataset.demoTip; break; }
      }
      if (!text) return;
      counter.current += 1;
      const below = e.clientY < 140; // flip below the cursor near the top of the viewport
      setTip({ text, x: e.clientX, y: e.clientY, key: counter.current, below });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!tip) return;
    hideTimer.current = setTimeout(() => setTip(null), 4200);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [tip]);

  if (!active || !tip) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const left = Math.min(Math.max(tip.x - WIDTH / 2, 12), vw - WIDTH - 12);
  const top = tip.below ? tip.y + GAP + 10 : tip.y - GAP;

  return (
    <>
      <style>{CSS}</style>
      <div
        key={tip.key}
        style={{
          position: "fixed", zIndex: 400, left, top,
          transform: tip.below ? "none" : "translateY(-100%)",
          width: WIDTH, pointerEvents: "none",
          animation: "pk-demo-tip-in .18s ease",
        }}
      >
        <div style={{
          background: "var(--text)", color: "var(--bg)", borderRadius: 10,
          padding: "9px 12px", fontSize: 12.5, lineHeight: 1.5, fontWeight: 600,
          boxShadow: "var(--shadow-lg)",
          border: `1px solid ${OG}`,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em", color: OG, display: "block", marginBottom: 3 }}>
            DEMO NOTE
          </span>
          {tip.text}
        </div>
      </div>
    </>
  );
}
