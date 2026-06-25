import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileText, CheckCircle2, AlertCircle, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { MarginLayout } from "@/components/margin/MarginLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/margin-dashboard/upload")({
  component: MarginUploadPage,
});

const BRAND = "#10B981";

type Platform = "talabat" | "snoonu" | "noon" | "amazon_ae" | "deliveroo" | "careem" | "other";

const PLATFORMS: { value: Platform; label: string; hint: string }[] = [
  { value: "talabat",   label: "Talabat",    hint: "Download from Talabat Partner → Reports → Payout Summary" },
  { value: "snoonu",    label: "Snoonu",     hint: "Download from Snoonu Restaurant Portal → Finance → Statements" },
  { value: "noon",      label: "Noon",       hint: "Download from Noon Seller → Payments & Fees → Export → Statement Detail" },
  { value: "amazon_ae", label: "Amazon.ae",  hint: "Download from Amazon Seller Central → Reports → Payments → All Statements" },
  { value: "deliveroo", label: "Deliveroo",  hint: "Download from Deliveroo Partner Hub → Finance → Payment History" },
  { value: "careem",    label: "Careem",     hint: "Download from Careem Partner Portal → Earnings → Statement" },
  { value: "other",     label: "Other",      hint: "CSV with columns: order_id, date, gross_amount, commission, net_payout" },
];

type UploadState =
  | { status: "idle" }
  | { status: "selected"; file: File }
  | { status: "uploading"; progress: number }
  | { status: "done"; uploadId: string }
  | { status: "error"; message: string };

function PlatformSelect({
  value,
  onChange,
}: {
  value: Platform | "";
  onChange: (v: Platform) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = PLATFORMS.find((p) => p.value === value);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "11px 14px",
          background: "#FFFFFF",
          border: "1px solid #D0E0D8",
          borderRadius: 8,
          fontSize: 14,
          color: value ? "#0F1A15" : "#8AAF98",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span>{selected?.label ?? "Select platform…"}</span>
        <ChevronDown size={14} color="#5A7A68" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #D0E0D8",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => { onChange(p.value); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: p.value === value ? "rgba(16,185,129,0.07)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: p.value === value ? 600 : 400,
                color: "#0F1A15",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { if (p.value !== value) e.currentTarget.style.background = "#F7FAF8"; }}
              onMouseLeave={(e) => { if (p.value !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DropZone({
  file,
  onFile,
  onClear,
}: {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) onFile(f);
    else toast.error("Please drop a CSV file");
  };

  if (file) {
    return (
      <div
        style={{
          border: `2px solid ${BRAND}`,
          borderRadius: 10,
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "rgba(16,185,129,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={18} color={BRAND} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15" }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "#5A7A68" }}>
              {(file.size / 1024).toFixed(0)} KB
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8AAF98", padding: 4, display: "flex" }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${over ? BRAND : "#B2CFBE"}`,
        borderRadius: 10,
        padding: "40px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: over ? "rgba(16,185,129,0.04)" : "#FAFAF9",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <Upload size={24} color={over ? BRAND : "#8AAF98"} style={{ margin: "0 auto 10px" }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15", marginBottom: 4 }}>
        Drop your CSV here, or click to browse
      </div>
      <div style={{ fontSize: 12, color: "#8AAF98" }}>CSV files only · Max 10 MB</div>
      <input
        ref={ref}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function MarginUploadPage() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<Platform | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const selectedPlatformMeta = PLATFORMS.find((p) => p.value === platform);
  const canUpload = platform !== "" && file !== null && state.status !== "uploading";

  const handleUpload = async () => {
    if (!user || !file || !platform) return;
    setState({ status: "uploading", progress: 0 });

    try {
      // Store metadata in margin_uploads; actual CSV parsing is Phase 2
      const { data, error } = await supabase
        .from("margin_uploads")
        .insert({
          user_id: user.id,
          platform: platform as string,
          filename: file.name,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      setState({ status: "done", uploadId: data.id });
      toast.success("Upload received — processing will begin shortly");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setState({ status: "error", message: msg });
      toast.error(msg);
    }
  };

  return (
    <MarginLayout
      title="Upload payout CSV"
      subtitle="Import your aggregator payout statement to start seeing real margin"
    >
      <div style={{ maxWidth: 600 }}>

        {/* Instructions banner */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2EDE8",
            borderRadius: 10,
            padding: "18px 20px",
            marginBottom: 24,
            fontSize: 13,
            color: "#5A7A68",
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: "#0F1A15" }}>How to get your payout CSV:</strong> log in to
          your aggregator's partner or seller portal, navigate to Finance → Statements (or
          Payments), and export the date range you want to analyse. Then upload it below.
        </div>

        {/* Step 1 — Platform */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#0F1A15",
              marginBottom: 8,
            }}
          >
            1 · Select your platform
          </label>
          <PlatformSelect value={platform} onChange={setPlatform} />
          {selectedPlatformMeta && (
            <div style={{ fontSize: 12, color: "#8AAF98", marginTop: 6 }}>
              {selectedPlatformMeta.hint}
            </div>
          )}
        </div>

        {/* Step 2 — File */}
        <div style={{ marginBottom: 28 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#0F1A15",
              marginBottom: 8,
            }}
          >
            2 · Upload your CSV file
          </label>
          <DropZone
            file={file}
            onFile={(f) => { setFile(f); setState({ status: "idle" }); }}
            onClear={() => { setFile(null); setState({ status: "idle" }); }}
          />
        </div>

        {/* Upload button / status */}
        {state.status === "done" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(16,185,129,0.08)",
              border: `1px solid ${BRAND}33`,
              borderRadius: 10,
              padding: "16px 18px",
            }}
          >
            <CheckCircle2 size={18} color={BRAND} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15" }}>
                File received
              </div>
              <div style={{ fontSize: 12, color: "#5A7A68" }}>
                Processing is underway. Your margin breakdown will appear in Overview shortly.
              </div>
            </div>
          </div>
        ) : state.status === "error" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "16px 18px",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={18} color="#EF4444" />
            <div style={{ fontSize: 13, color: "#B91C1C" }}>{state.message}</div>
          </div>
        ) : null}

        {state.status !== "done" && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: canUpload
                ? `linear-gradient(135deg, ${BRAND}, #059669)`
                : "#D0E0D8",
              color: canUpload ? "#FFFFFF" : "#8AAF98",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 22px",
              borderRadius: 8,
              border: "none",
              cursor: canUpload ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
          >
            <Upload size={15} />
            {state.status === "uploading" ? "Uploading…" : "Upload and process"}
          </button>
        )}
      </div>
    </MarginLayout>
  );
}
