import { useRef, useState } from "react";
import type { ClassifiedDocument, DocumentType } from "@/lib/commission-audit";

const OG = "#EF681A";
const GN = "#10B981";

// Mirrors src/server/core/upload-classifier.ts's UploadRole — redefined
// here (not imported) since that module pulls in the Anthropic SDK and
// server-only env access, which must never end up in the client bundle.
export type UploadRole = "platform_statement" | "daily_log" | "merchant_received" | "unknown";

export type PayoutCheckClassification =
  | { ok: true; classification: { role: UploadRole; platform: string | null; confidence: number; restated: string } }
  | { ok: false; error: string };

export type StagedKind = "file" | "manual";

export type StagedItem = {
  id: string;
  kind: StagedKind;
  label: string;
  description: string;
  platform: string;
  status: "uploading" | "done" | "error";
  error?: string;
  classifiedDoc?: ClassifiedDocument;
  classification?: PayoutCheckClassification;
};

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  daily_log: "Daily Log",
  statement: "Statement",
  summary_pdf: "Report",
  merchant_received: "Bank Settlement",
};

// A file's type can only ever be corrected among these three — "merchant
//_received" is deliberately excluded here. That role means "the amount the
// merchant says landed in their bank," a number only Manual Entry actually
// collects; a parsed file has no such field, so setting a file to this type
// would silently produce a doc with no amount and no visible effect on the
// audit at all. See commission-audit.ts's header comment on why "merchant_
// received" is manual-entry-only, never a file-parsing target.
const FILE_CORRECTABLE_TYPES: DocumentType[] = ["daily_log", "statement", "summary_pdf"];

const inputStyle = {
  height: 38, border: "1px solid var(--border)", borderRadius: 9,
  background: "var(--surface)", color: "var(--text)", padding: "0 11px",
  fontSize: 13, fontFamily: "inherit", outline: "none",
};

export function PayoutUploadStaging({
  items, platforms, rate, onRateChange, onAddFile, onAddManual, onCorrectType, onToggleNetSales, onRemove, onRunAudit,
}: {
  items: StagedItem[];
  platforms: { value: string; label: string }[];
  rate: string;
  onRateChange: (v: string) => void;
  onAddFile: (files: FileList, description: string, platform: string) => void;
  onAddManual: (description: string, amount: string, periodStart: string, periodEnd: string, platform: string, evidence: {
    transactionDate: string; bankReference: string; depositType: string; currency: string; fileName?: string; sha256?: string;
  }) => void;
  onCorrectType: (id: string, newType: DocumentType) => void;
  onToggleNetSales: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onRunAudit: () => void;
}) {
  const [mode, setMode] = useState<StagedKind>("file");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState(platforms[0]?.value ?? "talabat");
  const [manualAmount, setManualAmount] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [depositType, setDepositType] = useState("regular_payout");
  const [manualCurrency, setManualCurrency] = useState("QAR");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddFile = platform === "snoonu"
    ? ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf"
    : ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

  const handleAddFile = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) onAddFile(files, description, platform);
    e.target.value = "";
    setDescription("");
  };
  const handleAddManual = async () => {
    let sha256: string | undefined;
    if (evidenceFile) {
      const digest = await crypto.subtle.digest("SHA-256", await evidenceFile.arrayBuffer());
      sha256 = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    onAddManual(description, manualAmount, manualStart, manualEnd, platform, {
      transactionDate, bankReference, depositType, currency: manualCurrency, fileName: evidenceFile?.name, sha256,
    });
    setDescription(""); setManualAmount(""); setManualStart(""); setManualEnd("");
    setTransactionDate(""); setBankReference(""); setEvidenceFile(null);
  };

  const doneCount = items.filter(it => it.status === "done").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 3, gap: 2, alignSelf: "flex-start" }}>
        {([["file", "Platform Statements"], ["manual", "Bank Settlement Evidence"]] as [StagedKind, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)}
            style={{ cursor: "pointer", border: "none", borderRadius: 8, padding: "9px 15px",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background: mode === id ? OG : "transparent", color: mode === id ? "#fff" : "var(--muted)" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={mode === "file"
            ? 'Describe this file, e.g. "what Talabat paid me" or "what they compiled" (optional)'
            : "Optional note about this deposit or adjustment"}
          rows={2}
          style={{ resize: "vertical", border: "1px solid var(--border)", borderRadius: 9,
            background: "var(--surface)", color: "var(--text)", padding: "9px 11px",
            fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={platform} onChange={e => setPlatform(e.target.value)}
            aria-label="Platform" style={inputStyle}>
            {platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {mode === "file" ? (
            <>
              <input type="number" min="0" max="99" step="0.1" value={rate} onChange={e => onRateChange(e.target.value)}
                placeholder="Commission rate %" style={{ ...inputStyle, width: 150 }} />
              <input ref={fileInputRef} type="file" multiple accept={canAddFile} style={{ display: "none" }} onChange={handleFileChange} />
              <button type="button" onClick={handleAddFile}
                style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", background: OG,
                  border: "none", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit" }}>
                + Add File
              </button>
            </>
          ) : (
            <>
              <input type="number" min="0" step="0.01" value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                placeholder="Amount received" style={{ ...inputStyle, width: 140 }} />
              <select value={manualCurrency} onChange={e => setManualCurrency(e.target.value)} aria-label="Currency" style={{ ...inputStyle, width: 90 }}>
                <option>QAR</option><option>SAR</option><option>AED</option>
              </select>
              <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)}
                aria-label="Bank transaction date" title="Bank transaction date" style={{ ...inputStyle, width: 155 }} />
              <input value={bankReference} onChange={e => setBankReference(e.target.value)}
                placeholder="Bank reference" style={{ ...inputStyle, width: 150 }} />
              <select value={depositType} onChange={e => setDepositType(e.target.value)} aria-label="Deposit type" style={{ ...inputStyle, width: 165 }}>
                <option value="regular_payout">Regular payout</option>
                <option value="adjustment">Adjustment</option>
                <option value="refund">Refund / reversal</option>
                <option value="recovery">Recovery payment</option>
                <option value="combined_payout">Combined payout</option>
              </select>
              <input type="date" value={manualStart} onChange={e => setManualStart(e.target.value)}
                aria-label="Settlement period start" title="Settlement period start" style={{ ...inputStyle, width: 155 }} />
              <input type="date" value={manualEnd} onChange={e => setManualEnd(e.target.value)}
                aria-label="Settlement period end" title="Settlement period end" style={{ ...inputStyle, width: 155 }} />
              <label style={{ ...inputStyle, height:"auto", minHeight:38, display:"flex", alignItems:"center", cursor:"pointer", maxWidth:230 }}>
                <input type="file" accept=".pdf,.csv,.xlsx,.xls,image/*" onChange={e=>setEvidenceFile(e.target.files?.[0] ?? null)} style={{ display:"none" }} />
                {evidenceFile ? `${evidenceFile.name} · fingerprint locally` : "Select evidence to fingerprint"}
              </label>
              <button type="button" onClick={handleAddManual}
                style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", background: OG,
                  border: "none", borderRadius: 9, padding: "10px 16px", fontFamily: "inherit" }}>
                + Add Bank Deposit
              </button>
            </>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
          {mode === "file"
            ? "CSV, XLSX, or PDF (Snoonu only). Add each document one at a time — describe it if you like, then Run Audit when you're done."
            : "No bank connection is requested or supported. A selected evidence file stays on this device; PrizeSkout records only its SHA-256 fingerprint. Without one, the deposit remains manually asserted."}
        </span>
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(it => {
            const cls = it.classification;
            const structuralType = it.classifiedDoc?.document_type;
            return (
              <div key={it.id} style={{ border: "1px solid var(--border)", background: "var(--surface2)",
                borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{it.label}</span>
                  {it.status === "uploading" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Uploading…</span>}
                  {it.status === "done" && structuralType && it.kind === "file" && (
                    <select value={structuralType} onChange={e => onCorrectType(it.id, e.target.value as DocumentType)}
                      style={{ height: 26, fontSize: 11.5, fontWeight: 700, color: "var(--text)",
                        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6,
                        padding: "0 6px", fontFamily: "inherit" }}>
                      {FILE_CORRECTABLE_TYPES.map(dt => (
                        <option key={dt} value={dt}>{DOCUMENT_TYPE_LABEL[dt]}</option>
                      ))}
                    </select>
                  )}
                  {it.status === "done" && it.kind === "manual" && (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.03em",
                        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>
                        {DOCUMENT_TYPE_LABEL.merchant_received}
                      </span>
                      <span style={{ fontSize:11, fontWeight:700, color:it.classifiedDoc?.result.evidence_level === "document_supported" ? "#B45309" : "#DC2626",
                        background:"var(--surface)", border:"1px solid currentColor", borderRadius:6, padding:"3px 8px" }}>
                        {it.classifiedDoc?.result.evidence_level === "document_supported" ? "Evidence fingerprint recorded · review required" : "Manually asserted · unverified"}
                      </span>
                    </>
                  )}
                  <button type="button" aria-label="Remove" onClick={() => onRemove(it.id)}
                    style={{ cursor: "pointer", background: "transparent", border: "none", padding: 2,
                      color: "var(--muted)", marginInlineStart: "auto", fontSize: 16, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
                {it.description && (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>"{it.description}"</span>
                )}
                {cls?.ok && cls.classification.restated && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>You said: {cls.classification.restated}</span>
                )}
                {cls && !cls.ok && (
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>(Description not interpreted: {cls.error})</span>
                )}
                {it.status === "done" && structuralType === "daily_log" && (
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!it.classifiedDoc?.treat_sales_as_net}
                      onChange={e => onToggleNetSales(it.id, e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      Sales here already reflect the platform's deductions — don't recompute commission on top.
                      {it.classifiedDoc?.treat_sales_as_net && (
                        <strong style={{ color: "#B45309" }}> This overrides the audit's own cross-check (see Findings after you run the audit) — the report will disclose this clearly.</strong>
                      )}
                    </span>
                  </label>
                )}
                {it.status === "error" && (
                  <span style={{ fontSize: 12, color: "#DC2626" }}>{it.error}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <button type="button" onClick={onRunAudit} disabled={doneCount === 0}
          style={{ cursor: doneCount === 0 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700,
            color: "#fff", background: doneCount === 0 ? "#9A9A9A" : GN,
            border: "none", borderRadius: 10, padding: "11px 20px", fontFamily: "inherit",
            opacity: doneCount === 0 ? 0.7 : 1 }}>
          Run Audit{doneCount > 0 ? ` (${doneCount})` : ""}
        </button>
      </div>
    </div>
  );
}
