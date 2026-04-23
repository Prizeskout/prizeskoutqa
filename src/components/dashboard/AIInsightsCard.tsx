import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateInsight,
  getInsight,
  type AIInsight,
  type Citation,
  type InsightWindow,
} from "@/server/ai-insights.functions";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

async function safeMessage(err: unknown, fallback: string): Promise<string> {
  if (err instanceof Response) {
    try {
      const text = await err.text();
      return text || `${fallback} (${err.status})`;
    } catch {
      return `${fallback} (${err.status})`;
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

type Page = "overview" | "pricing" | "competitors" | "market";

const WINDOWS: { value: InsightWindow; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const KIND_LABEL: Record<Citation["kind"], string> = {
  recommendation: "Pricing rec",
  rule: "Pricing rule",
  metric: "Metric",
  competitor_price: "Competitor price",
  behavior_pattern: "Behavior pattern",
  alert: "Alert",
  channel: "Channel",
  category: "Category",
  assortment_gap: "Assortment gap",
  cross_border: "Cross-border",
  trending: "Trending product",
};

const KIND_COLOR: Record<Citation["kind"], string> = {
  recommendation: "#7C3AED",
  rule: "#0EA5E9",
  metric: "#6B6B6B",
  competitor_price: "#EA580C",
  behavior_pattern: "#7C3AED",
  alert: "#EF4444",
  channel: "#3B82F6",
  category: "#22C55E",
  assortment_gap: "#F59E0B",
  cross_border: "#EF4444",
  trending: "#22C55E",
};

function formatGeneratedAt(iso: string | null): string {
  if (!iso) return "Not generated yet";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function CiteChips({ cites }: { cites: number[] }) {
  if (!cites.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: 4, marginLeft: 6 }}>
      {cites.map((n) => (
        <a
          key={n}
          href={`#ai-cite-${n}`}
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById(`ai-cite-${n}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "nearest" });
              el.style.transition = "background-color 0.4s";
              const prev = el.style.backgroundColor;
              el.style.backgroundColor = "#FEF3C7";
              window.setTimeout(() => {
                el.style.backgroundColor = prev;
              }, 1200);
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 4,
            backgroundColor: "#F1ECDF",
            color: "#7C3AED",
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1,
            textDecoration: "none",
            verticalAlign: "middle",
          }}
        >
          {n}
        </a>
      ))}
    </span>
  );
}

export function AIInsightsCard({
  page,
  initial,
}: {
  page: Page;
  initial: AIInsight | null;
}) {
  const { session, loading: authLoading } = useAuth();
  const [window, setWindow] = useState<InsightWindow>("24h");
  // Cache per window so switching is instant after first generation/load.
  const cacheRef = useRef<Record<InsightWindow, AIInsight | null>>({
    "24h": initial && initial.window === "24h" ? initial : null,
    "7d": initial && initial.window === "7d" ? initial : null,
    "30d": initial && initial.window === "30d" ? initial : null,
  });
  const [insight, setInsight] = useState<AIInsight | null>(cacheRef.current[window]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const generate = useServerFn(generateInsight);
  const fetchOne = useServerFn(getInsight);

  // When window changes, hydrate from cache, else fetch from server.
  // Wait for auth to resolve and a session to exist before calling protected server fns.
  useEffect(() => {
    const cached = cacheRef.current[window];
    setInsight(cached);
    if (cached) return;
    if (authLoading || !session) return;
    let cancelled = false;
    setFetching(true);
    fetchOne({ data: { page, window } })
      .then(({ insight: row }) => {
        if (cancelled) return;
        cacheRef.current[window] = row;
        setInsight(row);
      })
      .catch((err) => {
        // Swallow — UI shows empty state. Log for debugging.
        console.warn("[AIInsights] fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window, page, fetchOne, authLoading, session]);

  const refresh = useCallback(async () => {
    if (!session) {
      toast.error("Please sign in to generate insights");
      return;
    }
    setLoading(true);
    try {
      const { insight: fresh } = await generate({ data: { page, window } });
      cacheRef.current[window] = fresh;
      setInsight(fresh);
      toast.success("Insights refreshed");
    } catch (err) {
      const msg = await safeMessage(err, "Failed to generate insights");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [generate, page, window, session]);

  const isEmpty = !insight;
  const citations = useMemo(() => insight?.citations ?? [], [insight]);
  const showSkeleton = fetching && !insight;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #EA580C 0%, #7C3AED 60%, #3B82F6 100%)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #EA580C 0%, #7C3AED 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", lineHeight: 1.2 }}>
              AI Insights
            </div>
            <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
              {isEmpty
                ? "Automated summaries from your latest data"
                : `Updated ${formatGeneratedAt(insight!.generated_at)} · ${citations.length} source${citations.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <WindowSelector value={window} onChange={setWindow} disabled={loading} />
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #E5E2DB",
              backgroundColor: loading ? "#F5F2EC" : "#FFFFFF",
              color: "#1A1A18",
              fontSize: 12,
              fontWeight: 500,
              cursor: loading ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <RefreshCw
              size={12}
              strokeWidth={2}
              style={{
                animation: loading ? "ai-spin 1s linear infinite" : undefined,
              }}
            />
            {loading ? "Generating…" : isEmpty ? "Generate insights" : "Refresh"}
          </button>
        </div>
      </div>

      <style>{`@keyframes ai-spin { to { transform: rotate(360deg); } }`}</style>

      {showSkeleton ? (
        <div
          style={{
            padding: "20px 16px",
            textAlign: "center",
            backgroundColor: "#FAF8F3",
            borderRadius: 10,
            border: "1px dashed #E5E2DB",
            fontSize: 12,
            color: "#9A9A9A",
          }}
        >
          Loading {window} insights…
        </div>
      ) : isEmpty ? (
        <div
          style={{
            padding: "20px 16px",
            textAlign: "center",
            backgroundColor: "#FAF8F3",
            borderRadius: 10,
            border: "1px dashed #E5E2DB",
          }}
        >
          <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
            No {window} insights yet. Press &ldquo;Generate insights&rdquo; to summarize this
            page&rsquo;s data for the {windowLabel(window)} - headline read, top observations,
            recommended actions, plus the specific records each insight is based on.
          </p>
        </div>
      ) : (
        <>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1A1A18",
              lineHeight: 1.45,
              margin: "0 0 14px",
            }}
          >
            {insight!.headline}
          </p>

          {insight!.bullets.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {insight!.bullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 13,
                    color: "#3A3A38",
                    lineHeight: 1.55,
                    padding: "6px 0",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "#EA580C",
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {b.text}
                    <CiteChips cites={b.cites} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {insight!.actions.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
                marginBottom: citations.length > 0 ? 16 : 0,
              }}
            >
              {insight!.actions.map((a, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#FAF8F3",
                    border: "1px solid #EFEAE0",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#7C3AED",
                      marginBottom: 4,
                    }}
                  >
                    <ArrowRight size={12} strokeWidth={2.5} />
                    <span>
                      {a.title}
                      <CiteChips cites={a.cites} />
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>
                    {a.detail}
                  </div>
                </div>
              ))}
            </div>
          )}

          {citations.length > 0 && (
            <div
              style={{
                borderTop: "1px solid #EFEAE0",
                paddingTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#9A9A9A",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Sources
              </div>
              <ol
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {citations.map((c, i) => {
                  const idx = i + 1;
                  return (
                    <li
                      key={idx}
                      id={`ai-cite-${idx}`}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "baseline",
                        fontSize: 12,
                        color: "#3A3A38",
                        lineHeight: 1.5,
                        padding: "4px 6px",
                        borderRadius: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 18,
                          height: 18,
                          padding: "0 5px",
                          borderRadius: 4,
                          backgroundColor: "#F1ECDF",
                          color: "#7C3AED",
                          fontSize: 10,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {idx}
                      </span>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#FFFFFF",
                          backgroundColor: KIND_COLOR[c.kind] ?? "#6B6B6B",
                          flexShrink: 0,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {KIND_LABEL[c.kind] ?? c.kind}
                      </span>
                      <span style={{ fontWeight: 500, color: "#1A1A18" }}>{c.label}</span>
                      {c.ref && (
                        <span style={{ color: "#6B6B6B" }}>- {c.ref}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function windowLabel(w: InsightWindow): string {
  if (w === "24h") return "last 24 hours";
  if (w === "7d") return "last 7 days";
  return "last 30 days";
}

function WindowSelector({
  value,
  onChange,
  disabled,
}: {
  value: InsightWindow;
  onChange: (w: InsightWindow) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Time window"
      style={{
        display: "inline-flex",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        padding: 2,
        backgroundColor: "#FFFFFF",
      }}
    >
      {WINDOWS.map((w) => {
        const active = value === w.value;
        return (
          <button
            key={w.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(w.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              backgroundColor: active ? "#1A1A18" : "transparent",
              color: active ? "#FFFFFF" : "#6B6B6B",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: disabled ? "wait" : "pointer",
              transition: "background-color 120ms ease, color 120ms ease",
            }}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}
