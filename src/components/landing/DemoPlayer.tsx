import { useEffect, useRef } from "react";
import logoDark from "@/assets/logo-dark.svg";

const ACC = "#ff7a18";
const ACCG = "rgba(255,122,24,.55)";
const GN = "#34d399";
const DUR = 55;

const DEMO_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
@keyframes psdp-warn{0%,100%{box-shadow:0 0 0 0 rgba(255,90,90,0),0 18px 50px -18px rgba(255,60,60,.7)}50%{box-shadow:0 0 0 6px rgba(255,90,90,.10),0 18px 60px -14px rgba(255,60,60,.9)}}
@keyframes psdp-spin{to{transform:rotate(360deg)}}
@keyframes psdp-node{0%{transform:scale(.35);opacity:.65}100%{transform:scale(2.6);opacity:0}}
@keyframes psdp-rec{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes psdp-scan{0%{transform:translateY(-12%)}100%{transform:translateY(112%)}}
@keyframes psdp-stamp{0%{transform:rotate(-13deg) scale(1.6);opacity:0}55%{transform:rotate(-13deg) scale(.92);opacity:1}70%{transform:rotate(-13deg) scale(1.04)}100%{transform:rotate(-13deg) scale(1);opacity:1}}
.psdp-paused *,.psdp-paused *::before,.psdp-paused *::after{animation-play-state:paused !important}
`;

const CHAPS = [
  { t: 0,  name: "The Margin Leak" },
  { t: 12, name: "1-Click Connection" },
  { t: 25, name: "Calculated Defense" },
  { t: 38, name: "Revenue Protection Hub" },
  { t: 50, name: "System Velocity" },
];

const CK = [
  { t: 0,    x: 520, y: 250 }, { t: 8,    x: 900, y: 200 },
  { t: 11.5, x: 700, y: 248 }, { t: 16,   x: 960, y: 248 },
  { t: 17,   x: 730, y: 352 }, { t: 20,   x: 900, y: 352 },
  { t: 22.5, x: 900, y: 561 }, { t: 24,   x: 900, y: 561 },
  { t: 26.8, x: 441, y: 244 }, { t: 27.6, x: 441, y: 244 },
  { t: 31,   x: 560, y: 320 }, { t: 42.6, x: 320, y: 626 },
  { t: 45.5, x: 320, y: 626 }, { t: 47,   x: 320, y: 600 },
];
const CLICKS  = [{ t: 24, x: 900, y: 561 }, { t: 27.6, x: 441, y: 244 }, { t: 45.5, x: 320, y: 626 }];
const CURVIS: [number, number][] = [[0, 24.3], [26.4, 29.2], [42.2, 46.4]];

const TAG: Record<string, string> = { SALLA: "#ff9a4d", SNOONU: "#5cc8ff", TALABAT: "#ff6a8a", SYS: "#8b919b" };
const RAW: [number, string, string][] = [
  [38.1, "SALLA",   "order #QA-8841 · fee Δ +QAR 2.40 · reprice ↑"],
  [38.9, "TALABAT", "subsidy shift −QAR 1.10 · floor held ✓"],
  [39.7, "SALLA",   "order #QA-8842 · commission 25% · protected"],
  [40.5, "SNOONU",  "latency 31ms · Riyadh edge · ok"],
  [41.3, "SALLA",   "order #QA-8843 · fee Δ +QAR 3.05 · reprice ↑"],
  [42.1, "SYS",     "reconciliation batch #4471 sealed"],
  [42.9, "TALABAT", "dispute #D-204 · evidence bundled"],
  [43.7, "SALLA",   "order #QA-8844 · margin 32.4% · protected"],
  [44.5, "SNOONU",  "order #QA-8845 · fee Δ +QAR 1.85 · reprice ↑"],
  [45.3, "SYS",     "proof export requested · AES-256"],
  [46.1, "SYS",     "bilingual dispute proof generated ✓"],
  [47.0, "SALLA",   "order #QA-8846 · commission 25% · protected"],
  [48.0, "TALABAT", "subsidy shift −QAR 0.70 · floor held ✓"],
  [49.0, "SYS",     "edge sync · Doha 24ms · Riyadh 31ms"],
];
const LOG = (() => {
  const base = 4 * 3600 + 2 * 60 + 18;
  return RAW.map(([t, ch, msg], i) => {
    const sec = base + Math.round(t * 1.7) + i * 3;
    const hh = String(Math.floor(sec / 3600) % 24).padStart(2, "0");
    const mm = String(Math.floor((sec / 60) % 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return { t, html: `<span style="color:#5a5e66">${hh}:${mm}:${ss}</span> <span style="color:${TAG[ch]}">${ch.padEnd(8)}</span>${msg}` };
  });
})();

const MARKERS = [
  { left: "0%",      title: "00:00 · The Margin Leak" },
  { left: "21.818%", title: "00:12 · 1-Click Connection" },
  { left: "45.455%", title: "00:25 · Calculated Defense" },
  { left: "69.091%", title: "00:38 · Revenue Protection Hub" },
  { left: "90.909%", title: "00:50 · System Velocity" },
];

// -- helpers (module-level, no closure needed) ---------------------------------
function cl(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
function sm(p: number) { p = cl(p, 0, 1); return p * p * (3 - 2 * p); }
function ramp(t: number, a: number, b: number) { return sm((t - a) / (b - a)); }
function band(t: number, a: number, b: number, f = 0.3) { return cl(Math.min((t - a) / f, (b - t) / f), 0, 1); }
function lerp(a: number, b: number, p: number) { return a + (b - a) * p; }
function mmss(s: number) { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
function money(n: number, d: number) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function curPos(t: number) {
  if (t <= CK[0].t) return CK[0];
  for (let i = 0; i < CK.length - 1; i++) {
    if (t >= CK[i].t && t <= CK[i + 1].t) {
      const p = sm((t - CK[i].t) / (CK[i + 1].t - CK[i].t));
      return { x: lerp(CK[i].x, CK[i + 1].x, p), y: lerp(CK[i].y, CK[i + 1].y, p) };
    }
  }
  return CK[CK.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
export function DemoPlayer() {
  const R    = useRef<Record<string, HTMLElement>>({});
  const MK   = useRef<(HTMLElement | null)[]>([]);
  const raf  = useRef(0);
  const S    = useRef({ t: 0, playing: true, _last: null as number | null, _logN: -1, _drag: false, _wasPlaying: false });

  const r = (name: string) => (el: HTMLElement | null) => { if (el) R.current[name] = el; };
  const mk = (i: number) => (el: HTMLElement | null) => { MK.current[i] = el; };

  useEffect(() => {
    const map = R.current;
    const s   = S.current;

    function applyFrame() {
      const t = s.t; if (!map.bezel) return;
      const ended = t >= DUR - 0.001;

      // progress bar
      map.progressFill.style.width  = (t / DUR * 100) + "%";
      map.scrubHead.style.left      = (t / DUR * 100) + "%";
      map.timeCur.textContent       = mmss(t);
      map.countdown.textContent     = "-" + mmss(DUR - t);
      map.bezel.classList.toggle("psdp-paused", !(s.playing && !ended));
      const showPlay = !(s.playing && !ended);
      map.playPlay.style.display  = showPlay ? "block" : "none";
      map.playPause.style.display = showPlay ? "none"  : "flex";

      let ci = 0;
      for (let i = 0; i < CHAPS.length; i++) if (t >= CHAPS[i].t) ci = i;
      map.chapTitle.textContent = (ci + 1) + " / 5 · " + CHAPS[ci].name;
      MK.current.forEach((m, i) => {
        if (!m) return;
        m.style.background = i <= ci ? ACC : "rgba(255,255,255,.5)";
        m.style.boxShadow  = i <= ci ? "0 0 8px " + ACCG : "none";
      });

      // layers
      const landO = t < 37.4 ? 1 : 1 - ramp(t, 37.4, 38.2);
      map.landing.style.opacity = String(landO);
      const blur = t < 25 ? 0 : 6 * ramp(t, 25, 26);
      map.landing.style.filter = `blur(${blur}px) brightness(${1 - 0.45 * ramp(t, 25, 26)})`;

      map.authLayer.style.opacity = String(band(t, 24.7, 38, 0.7));
      map.authModal.style.transform = `scale(${lerp(0.92, 1, ramp(t, 24.7, 26))})`;

      map.dashLayer.style.opacity = String(band(t, 37.7, 50, 0.6));
      const endR = ramp(t, 49.7, 50.5);
      map.endLayer.style.opacity   = String(endR);
      map.endLayer.style.transform = `scale(${lerp(0.96, 1, endR)})`;

      // sandbox sliders
      const wIn = ramp(t, 2.5, 3.6);
      map.warnBox.style.opacity   = String(wIn);
      map.warnBox.style.transform = `translateY(${(1 - wIn) * 18}px)`;

      const ordV = t < 12 ? 20 : t > 16 ? 150 : lerp(20, 150, (t - 12) / 4);
      const ordF = (ordV - 20) / 200;
      map.ordFill.style.width  = (ordF * 400) + "px";
      map.ordThumb.style.left  = (ordF * 400) + "px";
      map.ordVal.textContent   = String(Math.round(ordV));

      const comV = t < 17 ? 8 : t > 20 ? 25 : lerp(8, 25, (t - 17) / 3);
      const comF = (comV - 5) / 40;
      map.comFill.style.width  = (comF * 400) + "px";
      map.comThumb.style.left  = (comF * 400) + "px";
      map.comVal.textContent   = Math.round(comV) + "%";

      map.saveVal.textContent = "QAR " + money(Math.round(ordV * comV * 3.8), 0);

      const pH = band(t, 22.6, 24.05, 0.2);
      const pP = t >= 24 && t < 24.22;
      map.protectBtn.style.transform = `scale(${pP ? 0.97 : 1 + 0.03 * pH})`;
      map.protectBtn.style.filter    = `brightness(${1 + 0.12 * pH})`;

      // auth
      const clicked = t >= 27.6;
      map.sallaTab.style.background  = clicked ? "rgba(255,122,24,.14)" : band(t, 27, 27.6, 0.2) > 0 ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)";
      map.sallaTab.style.borderColor = clicked ? "rgba(255,122,24,.6)" : "rgba(255,255,255,.10)";
      map.authPrompt.style.opacity   = t < 27.6 ? "1" : "0";
      const loading = t >= 27.6 && t < 28.9;
      map.loader.style.opacity    = loading ? "1" : "0";
      map.loaderTxt.style.opacity = loading ? "1" : "0";
      map.handshake.style.opacity = String(ramp(t, 28.9, 29.3));
      map.stepLabel.textContent   = t < 27.6 ? "Step 1 · Select platform" : t < 29.5 ? "Step 2 · Authenticating" : "Step 3 · Set margin floor";
      map.marginSec.style.opacity = String(ramp(t, 29.6, 30.1));
      const mV = t < 30.4 ? 0 : t > 33.4 ? 32.4 : lerp(0, 32.4, sm((t - 30.4) / 3));
      map.marginFill.style.width  = (mV / 100 * 474) + "px";
      map.marginThumb.style.left  = (mV / 100 * 474) + "px";
      map.marginVal.textContent   = mV.toFixed(1) + "%";

      // dashboard
      const profit = 21772.45 + Math.max(0, t - 38) * 0.34;
      map.profitVal.textContent = "QAR " + money(profit, 2);
      let n = 0;
      for (let i = 0; i < LOG.length; i++) if (t >= LOG[i].t) n = i + 1;
      if (n !== s._logN) {
        s._logN = n;
        map.logBody.innerHTML = LOG.slice(Math.max(0, n - 9), n).map(l => "<div>" + l.html + "</div>").join("");
      }
      const eH = band(t, 43.4, 45.55, 0.2);
      const eP = t >= 45.5 && t < 45.72;
      map.exportBtn.style.background  = eH > 0 ? "rgba(255,122,24,.16)" : "rgba(255,255,255,.06)";
      map.exportBtn.style.borderColor = eH > 0 ? "rgba(255,122,24,.55)" : "rgba(255,255,255,.14)";
      map.exportBtn.style.transform   = `scale(${eP ? 0.98 : 1})`;
      map.pdfOverlay.style.opacity    = String(band(t, 45.7, 49.5, 0.35));

      // cursor
      const cp = curPos(t);
      let cs = 1;
      let click = null;
      for (const c of CLICKS) if (t >= c.t - 0.08 && t < c.t + 0.7) click = c;
      if (click && t >= click.t - 0.05 && t < click.t + 0.18) cs = 0.8;
      let visO = 0;
      for (const w of CURVIS) visO = Math.max(visO, band(t, w[0], w[1], 0.25));
      map.cursor.style.opacity   = String(visO);
      map.cursor.style.transform = `translate(${cp.x}px,${cp.y}px) scale(${cs})`;
      if (click) {
        const p = cl((t - click.t) / 0.7, 0, 1);
        map.ripple.style.opacity   = String((1 - p) * 0.7);
        map.ripple.style.transform = `scale(${0.2 + p * 2.6})`;
      } else {
        map.ripple.style.opacity = "0";
      }
    }

    function fit() {
      const b    = map.bezel as HTMLDivElement;
      const wrap = map.wrap  as HTMLDivElement;
      if (!b || !wrap) return;
      b.style.transform = "none";
      const ow = b.offsetWidth, oh = b.offsetHeight;
      const cw = wrap.offsetWidth;
      const sc = Math.min(cw / ow, 1);
      b.style.transform       = `scale(${sc})`;
      b.style.transformOrigin = "top center";
      wrap.style.height       = oh * sc + "px";
    }

    function tick(now: number) {
      if (s._last == null) s._last = now;
      let dt = (now - s._last) / 1000;
      s._last = now;
      if (dt > 0.25) dt = 0.25;
      if (s.playing) { s.t += dt; if (s.t >= DUR) { s.t = DUR; s.playing = false; } }
      applyFrame();
      raf.current = requestAnimationFrame(tick);
    }

    // progress scrub
    const pb = map.progressBar;
    if (pb) {
      const seek = (cx: number) => {
        const rc = pb.getBoundingClientRect();
        s.t = cl((cx - rc.left) / rc.width, 0, 1) * DUR;
        applyFrame();
      };
      const onDown = (e: PointerEvent) => { s._drag = true; s._wasPlaying = s.playing; s.playing = false; try { pb.setPointerCapture(e.pointerId); } catch {} seek(e.clientX); };
      const onMove = (e: PointerEvent) => { if (s._drag) seek(e.clientX); };
      const onUp   = () => { if (s._drag) { s._drag = false; s.playing = s._wasPlaying; } };
      pb.addEventListener("pointerdown", onDown as EventListener);
      pb.addEventListener("pointermove", onMove as EventListener);
      pb.addEventListener("pointerup",   onUp);
      pb.addEventListener("pointercancel", onUp);
    }

    fit();
    window.addEventListener("resize", fit);
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", fit); };
  }, []);

  function togglePlay() {
    const s = S.current;
    if (s.t >= DUR - 0.001) { s.t = 0; s.playing = true; s._last = null; }
    else s.playing = !s.playing;
  }

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <style>{DEMO_CSS}</style>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 40 }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: "0.1em", color: ACC, marginBottom: 12 }}>PRODUCT WALKTHROUGH</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Watch PrizeSkout defend a margin in real time</h2>
      </div>

      {/* outer wrap — height set dynamically by fit() */}
      <div ref={r("wrap")} style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>

        {/* ── BEZEL ── */}
        <div ref={r("bezel")} style={{ transformOrigin: "top center", flexShrink: 0, width: 1300, padding: 18, borderRadius: 30, background: "linear-gradient(180deg,#1c1f25 0%,#101216 60%,#0b0c0f 100%)", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 50px 120px -30px rgba(0,0,0,.85),0 2px 0 0 rgba(255,255,255,.05) inset,0 -40px 80px -50px rgba(255,122,24,.25) inset" }}>

          {/* top chrome */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 8px 14px" }}>
            <div style={{ fontSize: 12.5, letterSpacing: ".14em", color: "#7d838d", textTransform: "uppercase", fontWeight: 600 }}>PrizeSkout · Product Walkthrough</div>
          </div>

          {/* STAGE */}
          <div style={{ position: "relative", width: 1264, height: 711, borderRadius: 18, overflow: "hidden", background: "#0c0d10", boxShadow: "0 0 0 1px rgba(255,255,255,.06) inset" }}>
            <div style={{ position: "absolute", left: 32, top: 18, width: 1200, height: 675 }}>

              {/* ── PHASE 1+2 LANDING ── */}
              <div ref={r("landing")} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(90% 70% at 78% 20%, #15181e 0%, #0c0d10 60%)" }}>
                <div style={{ position: "absolute", left: 48, top: 30, display: "flex", alignItems: "center" }}>
                  <img src={logoDark} alt="PrizeSkout" style={{ height: 25, display: "block" }} />
                </div>
                <div style={{ position: "absolute", right: 48, top: 34, display: "flex", alignItems: "center", gap: 26, fontSize: 13.5, color: "#9aa0aa" }}>
                  <span>Platform</span><span>Pricing</span><span>Docs</span>
                  <span style={{ color: "#0c0d10", background: "#eef0f3", padding: "7px 15px", borderRadius: 8, fontWeight: 600 }}>Get access</span>
                </div>
                <div style={{ position: "absolute", left: 48, top: 128, width: 520 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".22em", color: ACC, textTransform: "uppercase", marginBottom: 18 }}>Real-time pricing infrastructure</div>
                  <div style={{ fontSize: 52, lineHeight: 1.02, fontWeight: 700, color: "#f4f6f9", letterSpacing: "-.025em" }}>Your prices sit still while delivery fees move.</div>
                  <div style={{ marginTop: 20, fontSize: 17, lineHeight: 1.5, color: "#9aa0aa", maxWidth: 430 }}>PrizeSkout defends your margin on every single ticket — automatically, in real time, across every channel you sell on.</div>
                </div>
                {/* warn box */}
                <div ref={r("warnBox")} style={{ position: "absolute", left: 48, top: 380, width: 472, opacity: 0, transform: "translateY(18px)", borderRadius: 14, padding: "18px 20px", background: "linear-gradient(180deg,rgba(58,20,20,.92),rgba(40,14,14,.92))", border: "1px solid rgba(255,90,90,.45)", animation: "psdp-warn 1.8s ease-in-out infinite", backdropFilter: "blur(6px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, letterSpacing: ".18em", color: "#ff8a8a", textTransform: "uppercase", fontWeight: 600 }}><span style={{ fontSize: 14 }}>⚠</span>Unprotected margin loss</div>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 38, fontWeight: 600, color: "#ff6a6a", letterSpacing: "-.02em" }}>QAR 185.00</span>
                    <span style={{ fontSize: 15, color: "#d98a8a" }}>/ min</span>
                  </div>
                </div>
                {/* ROI card bg */}
                <div style={{ position: "absolute", left: 648, top: 96, width: 504, height: 496, borderRadius: 20, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 40px 90px -40px rgba(0,0,0,.8)" }} />
                <div style={{ position: "absolute", left: 680, top: 124, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: ".18em", textTransform: "uppercase", color: "#7d838d" }}>Interactive ROI Sandbox</div>
                <div style={{ position: "absolute", left: 680, top: 148, fontSize: 22, fontWeight: 700, color: "#f1f3f6", letterSpacing: "-.02em" }}>Model your leakage</div>
                {/* orders */}
                <div style={{ position: "absolute", left: 680, top: 208, fontSize: 13.5, color: "#9aa0aa" }}>Daily Orders</div>
                <div ref={r("ordVal")} style={{ position: "absolute", left: 980, top: 202, width: 140, textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, color: "#f1f3f6" }}>20</div>
                <div style={{ position: "absolute", left: 700, top: 244, width: 400, height: 6, borderRadius: 3, background: "rgba(255,255,255,.10)" }}>
                  <div ref={r("ordFill")}  style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 0, borderRadius: 3, background: ACC }} />
                  <div ref={r("ordThumb")} style={{ position: "absolute", left: 0, top: "50%", width: 20, height: 20, margin: "-10px 0 0 -10px", borderRadius: "50%", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.5),0 0 0 4px rgba(255,122,24,.18)" }} />
                </div>
                {/* commission */}
                <div style={{ position: "absolute", left: 680, top: 312, fontSize: 13.5, color: "#9aa0aa" }}>Avg. Delivery Commission</div>
                <div ref={r("comVal")} style={{ position: "absolute", left: 980, top: 306, width: 140, textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, color: "#f1f3f6" }}>8%</div>
                <div style={{ position: "absolute", left: 700, top: 348, width: 400, height: 6, borderRadius: 3, background: "rgba(255,255,255,.10)" }}>
                  <div ref={r("comFill")}  style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 0, borderRadius: 3, background: ACC }} />
                  <div ref={r("comThumb")} style={{ position: "absolute", left: 0, top: "50%", width: 20, height: 20, margin: "-10px 0 0 -10px", borderRadius: "50%", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.5),0 0 0 4px rgba(255,122,24,.18)" }} />
                </div>
                {/* savings */}
                <div style={{ position: "absolute", left: 680, top: 408, fontSize: 12.5, color: "#7d838d", letterSpacing: ".04em" }}>Projected Monthly Savings</div>
                <div ref={r("saveVal")} style={{ position: "absolute", left: 680, top: 430, fontFamily: "'IBM Plex Mono',monospace", fontSize: 46, fontWeight: 600, color: ACC, letterSpacing: "-.02em", textShadow: "0 0 30px " + ACCG }}>QAR 0</div>
                <div ref={r("protectBtn")} style={{ position: "absolute", left: 680, top: 534, width: 440, height: 54, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 600, fontSize: 16, color: "#1a0f04", background: ACC, boxShadow: "0 14px 40px -10px " + ACCG, cursor: "pointer" }}>
                  Protect this Profit <span style={{ fontSize: 18 }}>→</span>
                </div>
              </div>

              {/* ── PHASE 3 AUTH ── */}
              <div ref={r("authLayer")} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0, background: "rgba(6,7,9,.55)" }}>
                <div ref={r("authModal")} style={{ position: "absolute", left: 330, top: 78, width: 540, height: 520, transform: "scale(.92)", transformOrigin: "center", borderRadius: 22, background: "linear-gradient(180deg,rgba(28,31,37,.97),rgba(16,18,22,.97))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 60px 140px -40px rgba(0,0,0,.9)" }} />
                <div style={{ position: "absolute", left: 366, top: 112, display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 20, color: "#f1f3f6" }}><span style={{ color: ACC }}>⚡</span>Connect your store</div>
                <div style={{ position: "absolute", left: 366, top: 146, fontSize: 13.5, color: "#9aa0aa", width: 430 }}>No code. Authenticate, test latency, set your defense baseline.</div>
                <div ref={r("stepLabel")} style={{ position: "absolute", left: 366, top: 188, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: ".16em", color: ACC, textTransform: "uppercase" }}>Step 1 · Select platform</div>
                <div ref={r("sallaTab")} style={{ position: "absolute", left: 366, top: 212, width: 150, height: 64, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 5, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f3f6" }}>Salla</span>
                  <span style={{ fontSize: 11, color: "#8b919b" }}>Store backend</span>
                </div>
                <div style={{ position: "absolute", left: 528, top: 212, width: 150, height: 64, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 5, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", opacity: .6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#cfd3d9" }}>Foodics</span>
                  <span style={{ fontSize: 11, color: "#8b919b" }}>POS</span>
                </div>
                <div style={{ position: "absolute", left: 690, top: 212, width: 150, height: 64, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 5, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", opacity: .6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#cfd3d9" }}>Zid</span>
                  <span style={{ fontSize: 11, color: "#8b919b" }}>Storefront</span>
                </div>
                <div style={{ position: "absolute", left: 366, top: 300, width: 474, height: 1, background: "rgba(255,255,255,.09)" }} />
                <div ref={r("authPrompt")} style={{ position: "absolute", left: 366, top: 340, width: 474, textAlign: "center", fontSize: 14, color: "#8b919b" }}>Pick a platform to begin secure authentication →</div>
                <div ref={r("loader")}    style={{ position: "absolute", left: 586, top: 336, width: 64, height: 64, opacity: 0, borderRadius: "50%", border: "4px solid rgba(255,255,255,.10)", borderTopColor: ACC, animation: "psdp-spin .9s linear infinite" }} />
                <div ref={r("loaderTxt")} style={{ position: "absolute", left: 366, top: 412, width: 474, textAlign: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".06em", color: "#9aa0aa", opacity: 0 }}>Negotiating secure handshake…</div>
                <div ref={r("handshake")} style={{ position: "absolute", left: 406, top: 328, width: 394, opacity: 0, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, background: "rgba(24,52,40,.85)", border: "1px solid rgba(52,211,153,.5)" }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: GN, boxShadow: "0 0 14px " + GN, display: "inline-block", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#bff3df" }}>Handshake Granted</div>
                    <div style={{ fontSize: 12.5, color: "#7fcfb0", fontFamily: "'IBM Plex Mono',monospace" }}>Al Meera Express · token sealed</div>
                  </div>
                </div>
                <div ref={r("marginSec")} style={{ position: "absolute", left: 366, top: 404, width: 474, opacity: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13.5, color: "#cfd3d9" }}>Global Margin Floor</span>
                    <span ref={r("marginVal")} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, color: ACC }}>0.0%</span>
                  </div>
                  <div style={{ position: "relative", marginTop: 16, width: 474, height: 6, borderRadius: 3, background: "rgba(255,255,255,.10)" }}>
                    <div ref={r("marginFill")}  style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 0, borderRadius: 3, background: "linear-gradient(90deg," + ACC + ",#ffb070)" }} />
                    <div ref={r("marginThumb")} style={{ position: "absolute", left: 0, top: "50%", width: 20, height: 20, margin: "-10px 0 0 -10px", borderRadius: "50%", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.5),0 0 0 4px rgba(255,122,24,.2)" }} />
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, color: "#7d838d", fontFamily: "'IBM Plex Mono',monospace" }}>↳ optimal floor imported from ROI sandbox</div>
                </div>
              </div>

              {/* ── PHASE 4 DASHBOARD ── */}
              <div ref={r("dashLayer")} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0, background: "radial-gradient(100% 80% at 60% 0%, #14171c 0%, #0a0b0e 65%)" }}>
                <div style={{ position: "absolute", left: 40, top: 30, display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 19, color: "#f1f3f6" }}><span style={{ color: ACC }}>⚡</span>Revenue Protection Hub</div>
                <div style={{ position: "absolute", right: 40, top: 34, display: "flex", alignItems: "center", gap: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".12em", color: GN }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: GN, boxShadow: "0 0 10px " + GN, animation: "psdp-rec 1.6s infinite", display: "inline-block" }} />LIVE
                </div>
                {/* profit card */}
                <div style={{ position: "absolute", left: 40, top: 78, width: 560, height: 158, borderRadius: 18, background: "linear-gradient(150deg,rgba(36,26,14,.85),rgba(20,22,26,.85))", border: "1px solid rgba(255,122,24,.28)", boxShadow: "0 30px 70px -34px rgba(255,122,24,.35)" }}>
                  <div style={{ position: "absolute", left: 26, top: 22, fontSize: 12.5, letterSpacing: ".06em", color: "#b89a78" }}>Protected Profit · month to date</div>
                  <div ref={r("profitVal")} style={{ position: "absolute", left: 26, top: 50, fontFamily: "'IBM Plex Mono',monospace", fontSize: 50, fontWeight: 600, color: "#fff", letterSpacing: "-.02em", textShadow: "0 0 34px rgba(255,122,24,.4)" }}>QAR 21,772.45</div>
                  <div style={{ position: "absolute", left: 28, top: 120, display: "flex", alignItems: "center", gap: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: GN }}><span>▲ +QAR 0.34 / sec</span><span style={{ color: "#7d838d" }}>· recovering live</span></div>
                </div>
                {/* edge nodes */}
                <div style={{ position: "absolute", left: 620, top: 78, width: 540, height: 248, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))", border: "1px solid rgba(255,255,255,.09)", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "34px 34px" }} />
                  <div style={{ position: "absolute", left: 24, top: 20, fontSize: 12.5, letterSpacing: ".06em", color: "#9aa0aa" }}>Edge Node Cluster · Gulf region</div>
                  <div style={{ position: "absolute", left: 170, top: 150 }}>
                    <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", background: GN, boxShadow: "0 0 14px " + GN, zIndex: 2 }} />
                    <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", border: "2px solid " + GN, animation: "psdp-node 2.4s ease-out infinite" }} />
                    <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", border: "2px solid " + GN, animation: "psdp-node 2.4s ease-out infinite 1.2s" }} />
                    <div style={{ position: "absolute", left: 16, top: -9, whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#cfd3d9" }}>Doha <span style={{ color: GN }}>24ms</span></div>
                  </div>
                  <div style={{ position: "absolute", left: 380, top: 96 }}>
                    <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", background: GN, boxShadow: "0 0 14px " + GN, zIndex: 2 }} />
                    <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", border: "2px solid " + GN, animation: "psdp-node 2.4s ease-out infinite .6s" }} />
                    <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", border: "2px solid " + GN, animation: "psdp-node 2.4s ease-out infinite 1.8s" }} />
                    <div style={{ position: "absolute", left: 16, top: -9, whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#cfd3d9" }}>Riyadh <span style={{ color: GN }}>31ms</span></div>
                  </div>
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 540 248">
                    <line x1="170" y1="150" x2="380" y2="96" stroke="rgba(52,211,153,.35)" strokeWidth="1.5" strokeDasharray="4 5" />
                  </svg>
                </div>
                {/* terminal */}
                <div style={{ position: "absolute", left: 40, top: 350, width: 560, height: 300, borderRadius: 18, background: "rgba(8,10,13,.92)", border: "1px solid rgba(255,255,255,.09)", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 40, display: "flex", alignItems: "center", padding: "0 18px", gap: 8, borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#9aa0aa" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: GN, display: "inline-block" }} />Live Reconciliation Stream
                  </div>
                  <div ref={r("logBody")} style={{ position: "absolute", left: 0, right: 0, top: 40, bottom: 60, padding: "10px 16px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, lineHeight: 1.62, color: "#aeb4bd", overflow: "hidden" }} />
                  <div ref={r("exportBtn")} style={{ position: "absolute", left: 60, right: 60, bottom: 14, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "#e8eaed", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", cursor: "pointer" }}>
                    ↓ Export Dispute Proofs
                  </div>
                </div>
                {/* metrics */}
                <div style={{ position: "absolute", left: 620, top: 350, width: 540, height: 300, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))", border: "1px solid rgba(255,255,255,.09)", padding: 22 }}>
                  <div style={{ fontSize: 12.5, letterSpacing: ".06em", color: "#9aa0aa", marginBottom: 18 }}>Defense telemetry · last 24h</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {([["1,284","Tickets protected","#f1f3f6"],["96.2%","Disputes won",GN],["32.4%","Active margin floor",ACC],["27ms","Avg edge latency","#f1f3f6"]] as [string,string,string][]).map(([v,l,c]) => (
                      <div key={l} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 600, color: c }}>{v}</div>
                        <div style={{ fontSize: 12, color: "#8b919b", marginTop: 3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, height: 54, borderRadius: 10, background: "linear-gradient(180deg,rgba(255,122,24,.10),transparent)", borderBottom: "2px solid rgba(255,122,24,.5)", overflow: "hidden" }}>
                    <svg viewBox="0 0 480 54" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                      <polyline points="0,44 60,40 120,42 180,30 240,32 300,20 360,24 420,12 480,8" fill="none" stroke={ACC} strokeWidth="2" />
                    </svg>
                  </div>
                </div>
                {/* PDF overlay */}
                <div ref={r("pdfOverlay")} style={{ position: "absolute", inset: 0, opacity: 0, background: "rgba(4,5,7,.62)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: 520, height: 486, borderRadius: 10, background: "#f5f2ea", boxShadow: "0 50px 120px -30px rgba(0,0,0,.85)", padding: "32px 34px", color: "#1a1c20", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1a1c20", paddingBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>DISPUTE PROOF</div>
                        <div style={{ fontSize: 13, color: "#5a5e66", direction: "rtl", fontWeight: 600 }}>إثبات نزاع رسوم التوصيل</div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: "#5a5e66", lineHeight: 1.7 }}>CASE&nbsp;#D-204<br />2026-06-27<br />AES-256</div>
                    </div>
                    <div style={{ marginTop: 16, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#3a3d44", lineHeight: 1.9 }}>
                      {[["order #QA-8841 · SALLA","+QAR 2.40"],["order #QA-8843 · SALLA","+QAR 3.05"],["order #QA-8845 · SNOONU","+QAR 1.85"]].map(([l,v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd8cc", padding: "6px 0" }}><span>{l}</span><span>{v}</span></div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: 600 }}><span>Total over-charge reclaimed</span><span>QAR 7.30</span></div>
                    </div>
                    <div style={{ marginTop: 14, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#7a7e86", wordBreak: "break-all", background: "#ebe6d9", borderRadius: 6, padding: 10 }}>sha256: 9f2a·c41d·77be·0a93·e8d1·4452·bb70·1ce6 — bilingual · court-admissible</div>
                    <div style={{ position: "absolute", right: 30, bottom: 26, border: "3px solid #1f8a5b", color: "#1f8a5b", borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: 20, letterSpacing: ".08em", transform: "rotate(-13deg)", opacity: 0, animation: "psdp-stamp .6s ease-out .25s forwards" }}>VERIFIED</div>
                  </div>
                </div>
              </div>

              {/* ── PHASE 5 END CARD ── */}
              <div ref={r("endLayer")} style={{ position: "absolute", inset: 0, opacity: 0, transform: "scale(.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, background: "radial-gradient(70% 60% at 50% 42%, #15140f 0%, #060708 70%)" }}>
                <img src={logoDark} alt="PrizeSkout" style={{ height: 58, display: "block", filter: "drop-shadow(0 0 38px " + ACCG + ")" }} />
                <div style={{ fontSize: 30, fontWeight: 600, color: "#f4f6f9", letterSpacing: "-.02em", textAlign: "center" }}>Deploy PrizeSkout Today.</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, letterSpacing: ".06em", color: ACC }}>Own Your Pricing Velocity.</div>
                <div style={{ marginTop: 8, fontSize: 13.5, color: "#7d838d", border: "1px solid rgba(255,255,255,.14)", borderRadius: 999, padding: "9px 20px", fontFamily: "'IBM Plex Mono',monospace" }}>app.prizeskout.com</div>
              </div>

              {/* vignette + scan line */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30, boxShadow: "0 0 160px 40px rgba(0,0,0,.45) inset" }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", pointerEvents: "none", zIndex: 30, background: "linear-gradient(180deg,rgba(255,255,255,.045),transparent)", animation: "psdp-scan 7s linear infinite", opacity: .5 }} />

              {/* CURSOR */}
              <div ref={r("cursor")} style={{ position: "absolute", left: 0, top: 0, zIndex: 60, opacity: 0, willChange: "transform" }}>
                <div ref={r("ripple")}     style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: "50%", border: "2px solid " + ACC, opacity: 0 }} />
                <div ref={r("cursorRing")} style={{ position: "absolute", left: -16, top: -16, width: 32, height: 32, borderRadius: "50%", border: "2px solid " + ACC, boxShadow: "0 0 18px " + ACCG, background: "rgba(255,122,24,.06)" }} />
                <svg width="28" height="28" viewBox="0 0 24 24" style={{ position: "absolute", left: -3, top: -2, filter: "drop-shadow(0 3px 5px rgba(0,0,0,.55))" }}>
                  <path d="M5 2.5 L19 11 L12.5 12.5 L9.5 19.5 Z" fill="#ffffff" stroke="rgba(0,0,0,.45)" strokeWidth="1" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── CONTROL BAR ── */}
          <div style={{ padding: "14px 12px 4px" }}>
            <div ref={r("progressBar")} style={{ position: "relative", height: 18, display: "flex", alignItems: "center", cursor: "pointer" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 7, height: 5, borderRadius: 3, background: "rgba(255,255,255,.13)" }} />
              <div ref={r("progressFill")} style={{ position: "absolute", left: 0, top: 7, height: 5, width: 0, borderRadius: 3, background: ACC, boxShadow: "0 0 12px " + ACCG }} />
              <div ref={r("scrubHead")}    style={{ position: "absolute", left: 0, top: "50%", width: 13, height: 13, margin: "-6.5px 0 0 -6.5px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,.6)" }} />
              {MARKERS.map((m, i) => (
                <div key={i} ref={mk(i)} title={m.title} style={{ position: "absolute", left: m.left, top: 2, width: 3, height: 14, marginLeft: -1, borderRadius: 2, background: "rgba(255,255,255,.5)" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8, color: "#cfd3d9" }}>
              <div onClick={togglePlay} style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: ACC, color: "#1a0f04", cursor: "pointer", boxShadow: "0 6px 20px -6px " + ACCG, flexShrink: 0 }}>
                <span ref={r("playPlay")}  style={{ display: "none", fontSize: 14, marginLeft: 2 }}>▶</span>
                <span ref={r("playPause")} style={{ display: "flex", gap: 3 }}>
                  <span style={{ width: 3.5, height: 13, background: "#1a0f04", borderRadius: 1, display: "inline-block" }} />
                  <span style={{ width: 3.5, height: 13, background: "#1a0f04", borderRadius: 1, display: "inline-block" }} />
                </span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#9aa0aa", flexShrink: 0 }}>
                <span ref={r("timeCur")} style={{ color: "#eef0f3" }}>00:00</span> / 00:55
              </div>
              <div ref={r("chapTitle")} style={{ flex: 1, textAlign: "center", fontSize: 13, color: "#9aa0aa", letterSpacing: ".02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
              <div ref={r("countdown")} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#9aa0aa", flexShrink: 0 }}>-00:55</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
