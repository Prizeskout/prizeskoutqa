// Reusable "Export PDF report" button. Handles loading state and error
// surfacing so feature pages just provide the export function to call.

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = {
  /** Async function that builds and triggers the PDF download. */
  onExport: () => Promise<void>;
  /** Default: "Export PDF report" / "Generating PDF..." */
  label?: string;
  loadingLabel?: string;
};

export function ExportPdfButton({
  onExport,
  label = "Export PDF report",
  loadingLabel = "Generating PDF...",
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onExport();
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
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
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.7 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {busy ? loadingLabel : label}
    </button>
  );
}
