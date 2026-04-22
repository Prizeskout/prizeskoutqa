// Page-header button that builds a combined PDF of Pricing + Competitors
// AI insights for a chosen time window. Loads the cached insight for each
// page from the server before rendering.

import { useState } from "react";
import { Download, FileText, Loader2, ChevronDown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getInsight,
  type InsightWindow,
} from "@/server/ai-insights.functions";
import { exportInsightsPdf } from "./exportInsightsPdf";

const WINDOWS: { value: InsightWindow; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
];

export function ExportInsightsButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fetchOne = useServerFn(getInsight);

  const handleExport = async (w: InsightWindow) => {
    setOpen(false);
    setBusy(true);
    try {
      const [pricing, competitors] = await Promise.all([
        fetchOne({ data: { page: "pricing", window: w } }),
        fetchOne({ data: { page: "competitors", window: w } }),
      ]);
      await exportInsightsPdf([
        { title: "Pricing", window: w, insight: pricing.insight },
        { title: "Competitors", window: w, insight: competitors.insight },
      ]);
      toast.success("AI insights PDF generated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to export PDF";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          backgroundColor: "#1A1A18",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileText size={14} />
        )}
        {busy ? "Generating PDF…" : "Export insights"}
        {!busy && <ChevronDown size={12} />}
      </button>

      {open && !busy && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 41,
              minWidth: 180,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              padding: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#9A9A9A",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "6px 10px 4px",
              }}
            >
              Window
            </div>
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => handleExport(w.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: "transparent",
                  color: "#1A1A18",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FAF8F3";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                }}
              >
                <Download size={12} color="#6B6B6B" />
                {w.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
