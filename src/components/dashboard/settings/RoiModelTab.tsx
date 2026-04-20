import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardSubtitle, CardTitle, PrimaryButton } from "./primitives";
import type { RoiModelCategory } from "@/lib/roi-model";

const DEFAULTS: Record<string, Omit<RoiModelCategory, "id" | "category" | "position">> = {
  Electronics: { elasticity: 1.8, baseline_daily_orders: 220, avg_order_value: 480, base_margin: 0.18, cannibalization_base: 0.12 },
  Grocery:     { elasticity: 0.9, baseline_daily_orders: 1800, avg_order_value: 65,  base_margin: 0.14, cannibalization_base: 0.22 },
  Fashion:     { elasticity: 2.1, baseline_daily_orders: 340, avg_order_value: 180, base_margin: 0.42, cannibalization_base: 0.18 },
  Home:        { elasticity: 1.4, baseline_daily_orders: 160, avg_order_value: 240, base_margin: 0.28, cannibalization_base: 0.15 },
  Beauty:      { elasticity: 1.6, baseline_daily_orders: 410, avg_order_value: 120, base_margin: 0.38, cannibalization_base: 0.20 },
};

const inputStyle = {
  width: "100%",
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E2DB",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 12,
  color: "#1A1A18",
  outline: "none",
  fontFamily: "inherit" as const,
};

export function RoiModelTab() {
  const router = useRouter();
  const [rows, setRows] = useState<RoiModelCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("roi_model_categories")
        .select("*")
        .order("position", { ascending: true });
      if (!cancelled && !error && data) setRows(data as unknown as RoiModelCategory[]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  function update(id: string, key: keyof RoiModelCategory, value: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function resetRow(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id && DEFAULTS[r.category] ? { ...r, ...DEFAULTS[r.category] } : r)),
    );
  }

  async function saveAll() {
    setSaving(true);
    try {
      await Promise.all(
        rows.map((r) =>
          supabase
            .from("roi_model_categories")
            .update({
              elasticity: r.elasticity,
              baseline_daily_orders: r.baseline_daily_orders,
              avg_order_value: r.avg_order_value,
              base_margin: r.base_margin,
              cannibalization_base: r.cannibalization_base,
            })
            .eq("id", r.id),
        ),
      );
      setSavedAt(Date.now());
      router.invalidate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <CardTitle>ROI model parameters</CardTitle>
          <CardSubtitle>
            Tune the per-category benchmarks the Campaign ROI Simulator uses. Changes apply on the next Simulate run.
          </CardSubtitle>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {savedAt && (
            <span style={{ fontSize: 11, color: "#22C55E" }}>Saved</span>
          )}
          <PrimaryButton onClick={saveAll}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Save size={13} />
              {saving ? "Saving…" : "Save changes"}
            </span>
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 20, fontSize: 12, color: "#9A9A9A" }}>Loading model…</div>
      ) : (
        <div style={{ marginTop: 18, overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.9fr 1.1fr 1fr 1fr 1.1fr 0.6fr",
              gap: 10,
              fontSize: 10,
              color: "#9A9A9A",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "0 4px 8px",
              minWidth: 760,
            }}
          >
            <span>Category</span>
            <span>Elasticity</span>
            <span>Baseline daily orders</span>
            <span>Avg order value (QAR)</span>
            <span>Base margin (0-1)</span>
            <span>Cannibalization base (0-1)</span>
            <span></span>
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.9fr 1.1fr 1fr 1fr 1.1fr 0.6fr",
                gap: 10,
                alignItems: "center",
                padding: "8px 4px",
                borderTop: "1px solid #F1EEE7",
                minWidth: 760,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{r.category}</span>
              <input
                type="number"
                step="0.1"
                value={r.elasticity}
                onChange={(e) => update(r.id, "elasticity", Number(e.target.value))}
                style={inputStyle}
              />
              <input
                type="number"
                step="10"
                value={r.baseline_daily_orders}
                onChange={(e) => update(r.id, "baseline_daily_orders", Number(e.target.value))}
                style={inputStyle}
              />
              <input
                type="number"
                step="5"
                value={r.avg_order_value}
                onChange={(e) => update(r.id, "avg_order_value", Number(e.target.value))}
                style={inputStyle}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={r.base_margin}
                onChange={(e) => update(r.id, "base_margin", Number(e.target.value))}
                style={inputStyle}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={r.cannibalization_base}
                onChange={(e) => update(r.id, "cannibalization_base", Number(e.target.value))}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => resetRow(r.id)}
                title="Reset to defaults"
                style={{
                  background: "transparent",
                  border: "1px solid #E5E2DB",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 11,
                  color: "#6B6B6B",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
