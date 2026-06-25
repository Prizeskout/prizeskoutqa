import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Upload, FileText, CheckCircle2, AlertCircle, X, ChevronDown, ArrowRight } from "lucide-react";
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
  { value: "talabat",   label: "Talabat",   hint: "Talabat Partner → Reports → Payout Summary → Export CSV" },
  { value: "snoonu",    label: "Snoonu",    hint: "Snoonu Restaurant Portal → Finance → Statements → Export" },
  { value: "noon",      label: "Noon",      hint: "Noon Seller → Payments & Fees → Export → Statement Detail" },
  { value: "amazon_ae", label: "Amazon.ae", hint: "Amazon Seller Central → Reports → Payments → All Statements → Download" },
  { value: "deliveroo", label: "Deliveroo", hint: "Deliveroo Partner Hub → Finance → Payment History → Export" },
  { value: "careem",    label: "Careem",    hint: "Careem Partner Portal → Earnings → Statement → Download" },
  { value: "other",     label: "Other",     hint: "CSV with columns: order_id, date, gross_amount, commission, net_payout" },
];

// ── CSV parser ────────────────────────────────────────────────────────────────

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsText(file, "utf-8");
  });
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === sep && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const COL_HINTS: Record<string, string[]> = {
  id:    ["order_id","order id","orderid","order #","order number","order ref","reference","transaction id","transaction_id","id"],
  date:  ["date","order_date","order date","created","transaction date","payment date","order time","created at","settlement date"],
  gross: ["gross","order amount","order value","gross amount","subtotal","item total","sales","revenue","amount","total amount","order total","item amount","order subtotal"],
  comm:  ["commission amount","commission","service fee","platform fee","fee amount","fees","talabat commission","delivery commission"],
  rate:  ["commission rate","commission %","commission_rate","fee rate","rate %"],
  net:   ["net payout","net","payout","settlement","net settlement","net amount","transfer","deposit","amount payable","net revenue"],
  item:  ["item","product","item name","product name","description","menu item","item_name","product title","sku"],
};

function findCol(headers: string[], key: string): number {
  const hints = COL_HINTS[key];
  return headers.findIndex(h => hints.some(hint => h === hint || h.includes(hint)));
}

function toNum(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function toDate(s: string): string {
  const c = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(c)) return c.slice(0, 10);
  const m1 = c.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  const m2 = c.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
  try { return new Date(c).toISOString().slice(0, 10); } catch { return c; }
}

type ParsedRow = {
  external_order_id: string;
  order_date: string;
  gross_revenue: number;
  commission_amount: number | null;
  commission_rate: number | null;
  net_payout: number | null;
  items: { name: string; qty: number; unit_price: number }[];
};

function parseMarginCSV(text: string): { rows: ParsedRow[]; skipped: number; error?: string } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0, error: "CSV appears empty — make sure you exported the correct file." };

  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], sep).map(h => h.toLowerCase().replace(/['"]/g, "").trim());

  const idCol    = findCol(headers, "id");
  const dateCol  = findCol(headers, "date");
  const grossCol = findCol(headers, "gross");
  const commCol  = findCol(headers, "comm");
  const rateCol  = findCol(headers, "rate");
  const netCol   = findCol(headers, "net");
  const itemCol  = findCol(headers, "item");

  if (dateCol < 0 || grossCol < 0) {
    return {
      rows: [], skipped: 0,
      error: `Could not detect required columns (date, amount) in your CSV. Headers found: ${headers.slice(0, 8).join(", ")}. Try selecting 'Other' platform and use columns: order_id, date, gross_amount, commission, net_payout.`,
    };
  }

  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i], sep);
    const gross = toNum(vals[grossCol] ?? "");
    const date  = toDate(vals[dateCol] ?? "");
    if (!gross || gross <= 0 || !date) { skipped++; continue; }

    const orderId = idCol >= 0 ? (vals[idCol] ?? "").trim() : "";
    const comm    = commCol >= 0 ? toNum(vals[commCol] ?? "") : null;
    let   rate    = rateCol >= 0 ? toNum(vals[rateCol] ?? "") : null;
    const net     = netCol  >= 0 ? toNum(vals[netCol]  ?? "") : null;

    if (rate == null && comm != null && gross > 0) rate = comm / gross;
    if (rate != null && rate > 1) rate = rate / 100;

    const itemName = itemCol >= 0 ? (vals[itemCol] ?? "").trim() : "";
    const items = itemName ? [{ name: itemName, qty: 1, unit_price: gross }] : [];

    rows.push({
      external_order_id: orderId || `row_${i}`,
      order_date: date,
      gross_revenue: gross,
      commission_amount: comm,
      commission_rate: rate,
      net_payout: net,
      items,
    });
  }

  return { rows, skipped };
}

// ── UI components ─────────────────────────────────────────────────────────────

type UploadState =
  | { status: "idle" }
  | { status: "selected" }
  | { status: "uploading"; progress: number }
  | { status: "done"; rowCount: number }
  | { status: "error"; message: string };

function PlatformSelect({ value, onChange }: { value: Platform | ""; onChange: (v: Platform) => void }) {
  const [open, setOpen] = useState(false);
  const selected = PLATFORMS.find(p => p.value === value);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, padding: "11px 14px", background: "#FFFFFF", border: "1px solid #D0E0D8",
          borderRadius: 8, fontSize: 14, color: value ? "#0F1A15" : "#8AAF98",
          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        }}
      >
        <span>{selected?.label ?? "Select platform…"}</span>
        <ChevronDown size={14} color="#5A7A68" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "#FFFFFF", border: "1px solid #D0E0D8", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden",
          }}
        >
          {PLATFORMS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => { onChange(p.value); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "10px 14px",
                background: p.value === value ? "rgba(16,185,129,0.07)" : "transparent",
                border: "none", cursor: "pointer", fontSize: 13,
                fontWeight: p.value === value ? 600 : 400, color: "#0F1A15", fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (p.value !== value) e.currentTarget.style.background = "#F7FAF8"; }}
              onMouseLeave={e => { if (p.value !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DropZone({ file, onFile, onClear }: { file: File | null; onFile: (f: File) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  if (file) {
    return (
      <div
        style={{
          border: `2px solid ${BRAND}`, borderRadius: 10, padding: "20px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, background: "rgba(16,185,129,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={18} color={BRAND} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15" }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "#5A7A68" }}>{(file.size / 1024).toFixed(0)} KB</div>
          </div>
        </div>
        <button
          type="button" onClick={onClear}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8AAF98", padding: 4, display: "flex" }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault(); setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && f.name.endsWith(".csv")) onFile(f);
        else toast.error("Please drop a CSV file");
      }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${over ? BRAND : "#B2CFBE"}`, borderRadius: 10,
        padding: "40px 24px", textAlign: "center", cursor: "pointer",
        background: over ? "rgba(16,185,129,0.04)" : "#FAFAF9",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <Upload size={24} color={over ? BRAND : "#8AAF98"} style={{ margin: "0 auto 10px" }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15", marginBottom: 4 }}>
        Drop your CSV here, or click to browse
      </div>
      <div style={{ fontSize: 12, color: "#8AAF98" }}>CSV files only · Max 10 MB</div>
      <input ref={ref} type="file" accept=".csv" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MarginUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const selectedMeta = PLATFORMS.find(p => p.value === platform);
  const canUpload = platform !== "" && file !== null && state.status !== "uploading";

  const handleUpload = async () => {
    if (!user || !file || !platform) return;
    setState({ status: "uploading", progress: 5 });

    try {
      // 1. Create upload record (processing)
      const { data: rec, error: recErr } = await supabase
        .from("margin_uploads")
        .insert({ user_id: user.id, platform, filename: file.name, status: "processing" })
        .select("id")
        .single();
      if (recErr) throw recErr;

      setState({ status: "uploading", progress: 15 });

      // 2. Read + parse CSV in browser
      const text = await readFileAsText(file);
      const { rows, skipped, error: parseErr } = parseMarginCSV(text);

      if (parseErr) {
        await supabase.from("margin_uploads").update({ status: "error", error_message: parseErr }).eq("id", rec.id);
        throw new Error(parseErr);
      }
      if (rows.length === 0) {
        const msg = `No valid rows found in CSV (${skipped} rows skipped). Check that you exported the correct payout file.`;
        await supabase.from("margin_uploads").update({ status: "error", error_message: msg }).eq("id", rec.id);
        throw new Error(msg);
      }

      setState({ status: "uploading", progress: 40 });

      // 3. Batch-insert into margin_orders (upsert to handle re-uploads)
      const orders = rows.map(r => ({
        user_id: user.id,
        upload_id: rec.id,
        platform: platform as string,
        external_order_id: r.external_order_id,
        order_date: r.order_date,
        gross_revenue: r.gross_revenue,
        commission_amount: r.commission_amount,
        commission_rate: r.commission_rate,
        net_payout: r.net_payout,
        items: r.items,
      }));

      const CHUNK = 200;
      for (let i = 0; i < orders.length; i += CHUNK) {
        const { error: insErr } = await supabase
          .from("margin_orders")
          .upsert(orders.slice(i, i + CHUNK), { onConflict: "user_id,platform,external_order_id" });
        if (insErr) throw insErr;
        setState({ status: "uploading", progress: 40 + Math.round(((i + CHUNK) / orders.length) * 50) });
      }

      // 4. Mark upload done
      await supabase
        .from("margin_uploads")
        .update({ status: "done", row_count: rows.length, processed_at: new Date().toISOString() })
        .eq("id", rec.id);

      setState({ status: "done", rowCount: rows.length });
      toast.success(`Processed ${rows.length} orders${skipped > 0 ? ` (${skipped} rows skipped)` : ""}`);

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

        {/* Instructions */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2EDE8", borderRadius: 10, padding: "18px 20px", marginBottom: 24, fontSize: 13, color: "#5A7A68", lineHeight: 1.65 }}>
          <strong style={{ color: "#0F1A15" }}>How to get your payout CSV:</strong> log in to your
          aggregator's partner or seller portal, navigate to Finance → Statements or Payments, export
          the date range you want to analyse, then upload it below.
        </div>

        {/* Step 1 — Platform */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F1A15", marginBottom: 8 }}>
            1 · Select your platform
          </label>
          <PlatformSelect value={platform} onChange={v => { setPlatform(v); setState({ status: "idle" }); }} />
          {selectedMeta && (
            <div style={{ fontSize: 12, color: "#8AAF98", marginTop: 6 }}>{selectedMeta.hint}</div>
          )}
        </div>

        {/* Step 2 — File */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F1A15", marginBottom: 8 }}>
            2 · Upload your CSV file
          </label>
          <DropZone
            file={file}
            onFile={f => { setFile(f); setState({ status: "idle" }); }}
            onClear={() => { setFile(null); setState({ status: "idle" }); }}
          />
        </div>

        {/* Status: uploading progress */}
        {state.status === "uploading" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5A7A68", marginBottom: 6 }}>
              <span>Processing…</span>
              <span>{state.progress}%</span>
            </div>
            <div style={{ height: 4, background: "#E2EDE8", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${state.progress}%`, height: "100%", background: `linear-gradient(90deg, ${BRAND}, #059669)`, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Status: done */}
        {state.status === "done" && (
          <div style={{ background: "rgba(16,185,129,0.08)", border: `1px solid ${BRAND}33`, borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <CheckCircle2 size={18} color={BRAND} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15" }}>
                  {state.rowCount} orders processed
                </div>
                <div style={{ fontSize: 12, color: "#5A7A68" }}>
                  Your margin breakdown is ready in the Overview.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/margin-dashboard" })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: `linear-gradient(135deg, ${BRAND}, #059669)`,
                color: "#FFFFFF", fontSize: 13, fontWeight: 700,
                padding: "9px 16px", borderRadius: 8, border: "none",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              View overview <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Status: error */}
        {state.status === "error" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
            <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: "#B91C1C", lineHeight: 1.6 }}>{state.message}</div>
          </div>
        )}

        {/* Upload button */}
        {state.status !== "done" && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: canUpload ? `linear-gradient(135deg, ${BRAND}, #059669)` : "#D0E0D8",
              color: canUpload ? "#FFFFFF" : "#8AAF98",
              fontSize: 14, fontWeight: 700, padding: "12px 22px",
              borderRadius: 8, border: "none",
              cursor: canUpload ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "opacity 0.15s",
            }}
          >
            <Upload size={15} />
            {state.status === "uploading" ? "Processing…" : "Upload and process"}
          </button>
        )}
      </div>
    </MarginLayout>
  );
}
