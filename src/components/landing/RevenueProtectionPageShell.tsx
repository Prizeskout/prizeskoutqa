import type { ReactNode } from "react";
import logo from "@/assets/logo-light.svg";

const ORANGE = "#F36A21";

export function RevenueProtectionPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="rps-shell">
      <style>{css}</style>
      <nav className="rps-nav" aria-label="Main navigation">
        <a className="rps-logo" href="/" aria-label="PrizeSkout home">
          <img src={logo} alt="PrizeSkout" />
        </a>
        <div className="rps-links">
          <a href="/#product">Product</a>
          <a href="/#platform">Platform</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#integrations">Integrations</a>
        </div>
        <div className="rps-actions">
          <a className="rps-market" href="/" aria-label="Return home to change country">🇶🇦 <span>Qatar</span></a>
          <a className="rps-language" href="/" aria-label="Return home to change language">English</a>
          <a className="rps-demo" href="/contact">Book a demo</a>
          <a className="rps-login" href="/access">Login</a>
        </div>
      </nav>
      {children}
      <footer className="rps-footer">
        <a href="/" aria-label="PrizeSkout home"><img src={logo} alt="PrizeSkout" /></a>
        <div>
          <a href="/#product">Product</a>
          <a href="/#platform">Platform</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#integrations">Integrations</a>
          <a href="/access">Login</a>
          <a aria-current="page" href="/legal">Privacy &amp; Terms</a>
        </div>
        <span>© 2026 PrizeSkout</span>
      </footer>
    </main>
  );
}

const css = `
.rps-shell{min-height:100vh;background:#fff;color:#10182D;font-family:'Chillax',system-ui,sans-serif}.rps-shell *{box-sizing:border-box}.rps-shell a{color:inherit;text-decoration:none}.rps-nav{position:relative;z-index:20;min-height:76px;max-width:1240px;margin:auto;padding:10px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid #E8ECF2}.rps-logo img,.rps-footer img{display:block;width:142px}.rps-links{display:flex;align-items:center;gap:34px;font-size:14px;font-weight:600}.rps-actions{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:650}.rps-market{display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:999px;background:#10182D;color:#fff!important}.rps-language{padding:9px}.rps-demo{padding:12px 18px;border-radius:9px;background:${ORANGE};color:#fff!important;font-weight:750}.rps-login{padding:11px 15px;border:1px solid #DDE2EA;border-radius:9px;font-weight:750}.rps-footer{border-top:1px solid #E5E9EF;padding:30px max(28px,calc((100vw - 1184px)/2));display:flex;align-items:center;justify-content:space-between;gap:24px}.rps-footer div{display:flex;flex-wrap:wrap;justify-content:center;gap:24px;color:#657086;font-size:13px}.rps-footer>span{color:#657086;font-size:12px}.rps-footer a[aria-current=page]{color:${ORANGE};font-weight:700}
@media(max-width:980px){.rps-links{display:none}.rps-market span,.rps-language{display:none}}
@media(max-width:680px){.rps-nav{min-height:68px;padding:10px 18px}.rps-logo img{width:126px}.rps-market{padding:8px}.rps-demo{display:none}.rps-login{padding:9px 11px;font-size:11px}.rps-footer{flex-direction:column;text-align:center}}
`;
