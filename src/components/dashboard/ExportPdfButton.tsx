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
  onExportWord?: () => Promise<void>;
};

export function ExportPdfButton({
  onExport,
  label = "Export PDF report",
  loadingLabel = "Generating PDF...",
  onExportWord,
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (format:"pdf"|"word"="pdf") => {
    if (busy) return;
    setBusy(true);
    try {
      await (format==="word"&&onExportWord?onExportWord():onExport());
    } catch (err) {
      console.error("Report export failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{display:"inline-flex",borderRadius:8,overflow:"hidden",backgroundColor:"#1A1A18"}}><button
      type="button"
      onClick={()=>handleClick("pdf")}
      disabled={busy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        backgroundColor: "#1A1A18",
        color: "#FFFFFF",
        border: "none",
        borderRadius: 0,
        fontSize: 12,
        fontWeight: 500,
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.7 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {busy ? loadingLabel : label}
    </button>{onExportWord&&<button type="button" onClick={()=>handleClick("word")} disabled={busy} style={{border:0,borderInlineStart:"1px solid #ffffff44",background:"#1A1A18",color:"white",padding:"8px 11px",fontSize:12,fontWeight:700,cursor:busy?"default":"pointer"}}>Word</button>}</div>
  );
}
