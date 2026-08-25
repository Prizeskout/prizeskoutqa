import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function MarketingHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section
      style={{
        background: "#050505",
        paddingTop: 48,
        paddingBottom: 56,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "#8A8A8A",
            textDecoration: "none",
            transition: "color 0.15s",
            marginBottom: 24,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8A8A8A")}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to home
        </a>
        <div style={{ textAlign: "center" }}>
          {eyebrow && (
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#EA580C",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: 0,
              }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="ps-section-title"
            style={{
              color: "#FAFAF9",
              marginTop: eyebrow ? 12 : 0,
              maxWidth: 720,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 16,
                color: "#8A8A8A",
                lineHeight: 1.65,
                marginTop: 16,
                maxWidth: 640,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function MarketingBody({ children }: { children: ReactNode }) {
  return (
    <section
      style={{ background: "#FAFAF9", padding: "72px 0", borderTop: "1px solid #1A1A1A" }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

export function MarketingProse({ children }: { children: ReactNode }) {
  return (
    <div className="ps-prose" style={{ color: "#3A3A38", fontSize: 15, lineHeight: 1.75 }}>
      <style>{`
        .ps-prose h2 { font-size: 22px; font-weight: 700; color: #1A1A18; margin: 36px 0 12px; }
        .ps-prose h2:first-child { margin-top: 0; }
        .ps-prose h3 { font-size: 17px; font-weight: 600; color: #1A1A18; margin: 28px 0 8px; }
        .ps-prose p { margin: 0 0 16px; }
        .ps-prose ul { margin: 0 0 16px; padding-left: 20px; }
        .ps-prose li { margin-bottom: 6px; }
        .ps-prose strong { color: #1A1A18; font-weight: 600; }
        .ps-prose a { color: #EA580C; text-decoration: none; }
        .ps-prose a:hover { text-decoration: underline; }
        .ps-prose .ps-meta { color: #6B6B6B; font-size: 13px; margin-bottom: 28px; }
        .ps-prose hr { border: none; border-top: 1px solid #E5E2DB; margin: 32px 0; }
      `}</style>
      {children}
    </div>
  );
}
