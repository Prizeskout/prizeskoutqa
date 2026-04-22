import { useState, useCallback } from "react";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateInsight, type AIInsight } from "@/server/ai-insights.functions";
import { toast } from "sonner";

type Page = "overview" | "pricing" | "competitors" | "market";

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
      {/* subtle gradient accent strip */}
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
              {isEmpty ? "Powered by Lovable AI" : `Updated ${formatGeneratedAt(insight!.generated_at)}`}
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
            and recommended actions.
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
                  <span>{b}</span>
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
                    {a.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>
                    {a.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
