import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

const MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

export type ProductDetailProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  endpoints: { method: "GET" | "POST"; path: string; desc: string }[];
  features: string[];
  sampleRequest: string;
  sampleResponse: string;
  useCases: { title: string; desc: string }[];
};

function MethodPill({ method }: { method: "GET" | "POST" }) {
  const styles =
    method === "GET"
      ? { fg: "#22C55E", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" }
      : { fg: "#FB923C", bg: "rgba(234,88,12,0.10)", border: "rgba(234,88,12,0.28)" };
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: MONO,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: styles.fg,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        padding: "3px 7px",
        borderRadius: 4,
        minWidth: 48,
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {method}
    </span>
  );
}

export function ProductDetailPage(props: ProductDetailProps) {
  const Icon = props.icon;
  return (
    <MarketingShell>
      {/* Hero */}
      <section
        style={{ background: "#050505", padding: "96px 0 64px", position: "relative", overflow: "hidden" }}
        className="px-5 md:px-10"
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 500,
            background:
              "radial-gradient(ellipse at center, rgba(234,88,12,0.18) 0%, rgba(5,5,5,0) 65%)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(234,88,12,0.12)",
                border: "1px solid rgba(234,88,12,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={20} color="#FB923C" strokeWidth={2} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#FB923C",
              }}
            >
              {props.eyebrow}
            </span>
          </div>
          <h1
            style={{
              marginTop: 20,
              fontSize: 42,
              fontWeight: 700,
              color: "#FAFAF9",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {props.title}
          </h1>
          <p
            style={{
              marginTop: 18,
              color: "#9A9A9A",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 680,
            }}
          >
            {props.subtitle}
          </p>
          <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              to="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                color: "#FFF",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "11px 22px",
                borderRadius: 8,
                textDecoration: "none",
                boxShadow: "0 10px 26px rgba(234,88,12,0.32)",
              }}
            >
              Get API keys <ArrowRight size={14} />
            </Link>
            <Link
              to="/api-reference"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#FAFAF9",
                fontSize: 13.5,
                fontWeight: 500,
                padding: "11px 22px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              View endpoints
            </Link>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section
        style={{ background: "#050505", padding: "48px 0", borderTop: "1px solid #141414" }}
        className="px-5 md:px-10"
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6B6B6B",
              marginBottom: 16,
            }}
          >
            Endpoints
          </div>
          <div
            style={{
              background: "#0A0A0A",
              border: "1px solid #1A1A1A",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {props.endpoints.map((e) => (
              <div
                key={e.method + e.path}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: "1px solid #141414",
                  alignItems: "start",
                }}
              >
                <MethodPill method={e.method} />
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 12.5, color: "#FAFAF9" }}>{e.path}</div>
                  <div style={{ fontSize: 12.5, color: "#8A8A8A", marginTop: 3, lineHeight: 1.5 }}>
                    {e.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code sample */}
      <section
        style={{ background: "#050505", padding: "48px 0" }}
        className="px-5 md:px-10"
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6B6B6B",
              marginBottom: 16,
            }}
          >
            Example request
          </div>
          <div
            style={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid #1F1F1F",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <pre
              style={{
                margin: 0,
                padding: "18px 20px",
                fontSize: 12.5,
                lineHeight: 1.65,
                fontFamily: MONO,
                color: "#D4D4D4",
                overflow: "auto",
              }}
            >
              <code>{props.sampleRequest}</code>
            </pre>
            <div
              style={{
                padding: "8px 16px",
                fontSize: 10.5,
                fontFamily: MONO,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#6B6B6B",
                background: "rgba(0,0,0,0.35)",
                borderTop: "1px solid #1A1A1A",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22C55E",
                  boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
                }}
              />
              200 OK · application/json
            </div>
            <pre
              style={{
                margin: 0,
                padding: "14px 20px 18px",
                fontSize: 11.5,
                lineHeight: 1.6,
                fontFamily: MONO,
                color: "#9CA3AF",
                background: "rgba(0,0,0,0.35)",
                overflow: "auto",
              }}
            >
              <code>{props.sampleResponse}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        style={{ background: "#050505", padding: "48px 0" }}
        className="px-5 md:px-10"
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6B6B6B",
              marginBottom: 16,
            }}
          >
            What you get
          </div>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr",
            }}
            className="pd-features"
          >
            <style>{`
              @media (min-width: 640px) { .pd-features { grid-template-columns: repeat(2, 1fr) !important; } }
            `}</style>
            {props.features.map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  background: "#0A0A0A",
                  border: "1px solid #1A1A1A",
                  borderRadius: 10,
                  fontSize: 13.5,
                  color: "#C4C4C4",
                  lineHeight: 1.5,
                }}
              >
                <Check size={14} color="#22C55E" style={{ marginTop: 3, flexShrink: 0 }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section
        style={{ background: "#050505", padding: "48px 0 96px" }}
        className="px-5 md:px-10"
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6B6B6B",
              marginBottom: 16,
            }}
          >
            Common integrations
          </div>
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "1fr",
            }}
            className="pd-usecases"
          >
            <style>{`
              @media (min-width: 768px) { .pd-usecases { grid-template-columns: repeat(3, 1fr) !important; } }
            `}</style>
            {props.useCases.map((u) => (
              <div
                key={u.title}
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1A1A1A",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9", marginBottom: 6 }}>
                  {u.title}
                </div>
                <div style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.55 }}>{u.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
