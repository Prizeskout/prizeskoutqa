import { useEffect, useRef } from "react";

const ACC = "#ff7a18";

export function DemoPlayer({ currency = "QAR", dark = true }: { currency?: string; dark?: boolean }) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function fit() {
      const iframe = iframeRef.current;
      const wrap   = wrapRef.current;
      if (!iframe || !wrap) return;
      const ow = 1264;
      const oh = 711;
      const sc = Math.min(wrap.offsetWidth / ow, 1);
      iframe.style.transform       = `scale3d(${sc},${sc},1)`;
      iframe.style.transformOrigin = "top center";
      wrap.style.height            = oh * sc + "px";
    }

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(fit, 120); };
    fit();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function send() {
      iframe?.contentWindow?.postMessage({ type: "PS_SET_CURRENCY", currency }, "*");
    }
    iframe.addEventListener("load", send);
    send();
    return () => iframe.removeEventListener("load", send);
  }, [currency]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function send() {
      iframe?.contentWindow?.postMessage({ type: "PS_SET_THEME", theme: dark ? "dark" : "light" }, "*");
    }
    iframe.addEventListener("load", send);
    send();
    return () => iframe.removeEventListener("load", send);
  }, [dark]);

  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ paddingTop: 0, marginBottom: 40 }}>
        <div style={{ fontFamily: "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace", fontSize: 11, letterSpacing: "0.1em", color: ACC, marginBottom: 12 }}>PRODUCT WALKTHROUGH</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Watch PrizeSkout defend a margin in real time</h2>
      </div>

      <div ref={wrapRef} style={{ position: "relative", width: "100%", margin: "0 auto", display: "flex", justifyContent: "center" }}>
        <iframe
          ref={iframeRef}
          src="/demo-embed.html"
          style={{ width: 1264, height: 711, flexShrink: 0, border: "none", display: "block", borderRadius: 16 }}
          scrolling="no"
          title="PrizeSkout Product Walkthrough"
        />
      </div>
    </section>
  );
}
