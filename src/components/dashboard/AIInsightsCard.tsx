import { useState, useCallback, useMemo } from "react";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateInsight,
  type AIInsight,
  type Citation,
} from "@/server/ai-insights.functions";
import { toast } from "sonner";

type Page = "overview" | "pricing" | "competitors" | "market";

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
  const [insight, setInsight] = useState<AIInsight | null>(initial);
  const [loading, setLoading] = useState(false);
  const generate = useServerFn(generateInsight);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { insight: fresh } = await generate({ data: { page } });
      setInsight(fresh);
      toast.success("Insights refreshed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate insights";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [generate, page]);

  const isEmpty = !insight;
  const citations = useMemo(() => insight?.citations ?? [], [insight]);

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
                ? "Powered by Lovable AI"
                : `Updated ${formatGeneratedAt(insight!.generated_at)} · ${citations.length} source${citations.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
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

      <style>{`@keyframes ai-spin { to { transform: rotate(360deg); } }`}</style>

      {isEmpty ? (
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
            Generate an AI summary of this page&rsquo;s data — headline read, top observations,
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
                        <span style={{ color: "#6B6B6B" }}>— {c.ref}</span>
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
