import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardSubtitle, CardTitle, PrimaryButton } from "./primitives";
import type { RoiModelCategory } from "@/lib/roi-model";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEFAULTS: Record<string, Omit<RoiModelCategory, "id" | "category" | "position">> = {
  Electronics: { elasticity: 1.8, baseline_daily_orders: 220, avg_order_value: 480, base_margin: 0.18, cannibalization_base: 0.12 },
  Grocery:     { elasticity: 0.9, baseline_daily_orders: 1800, avg_order_value: 65,  base_margin: 0.14, cannibalization_base: 0.22 },
  Fashion:     { elasticity: 2.1, baseline_daily_orders: 340, avg_order_value: 180, base_margin: 0.42, cannibalization_base: 0.18 },
  Home:        { elasticity: 1.4, baseline_daily_orders: 160, avg_order_value: 240, base_margin: 0.28, cannibalization_base: 0.15 },
  Beauty:      { elasticity: 1.6, baseline_daily_orders: 410, avg_order_value: 120, base_margin: 0.38, cannibalization_base: 0.20 },
};

const NEW_CATEGORY_DEFAULTS = {
  elasticity: 1.5,
  baseline_daily_orders: 200,
  avg_order_value: 200,
  base_margin: 0.25,
  cannibalization_base: 0.18,
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

// Rows that exist only on the client until first save get a temporary "new-..." id.
type Row = RoiModelCategory & { _isNew?: boolean; _dirty?: boolean };

export function RoiModelTab() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("roi_model_categories")
        .select("*")
        .order("position", { ascending: true });
      if (!cancelled && !error && data) setRows(data as unknown as Row[]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  function update(id: string, key: keyof RoiModelCategory, value: number | string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value, _dirty: true } : r)));
  }

  function resetRow(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id && DEFAULTS[r.category] ? { ...r, ...DEFAULTS[r.category], _dirty: true } : r,
      ),
    );
  }

  function addCategory() {
    setError(null);
    const tempId = `new-${Date.now()}`;
    const maxPos = rows.reduce((m, r) => Math.max(m, r.position ?? 0), -1);
    const newRow: Row = {
      id: tempId,
      category: "",
      position: maxPos + 1,
      ...NEW_CATEGORY_DEFAULTS,
      _isNew: true,
      _dirty: true,
    };
    setRows((prev) => [...prev, newRow]);
    // Focus the new row's name input on next paint.
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`input[data-roi-name="${tempId}"]`);
      el?.focus();
    }, 0);
  }

  async function deleteRow(row: Row) {
    if (row._isNew) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setConfirmDelete(null);
      return;
    }
    const { error } = await supabase.from("roi_model_categories").delete().eq("id", row.id);
    if (error) {
      setError(`Failed to delete: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setConfirmDelete(null);
    router.invalidate();
  }

  async function saveAll() {
    setError(null);
    // Validate new rows have a category name.
    const invalidNew = rows.find((r) => r._isNew && !r.category.trim());
    if (invalidNew) {
      setError("New categories need a name before saving.");
      return;
    }
    // Detect duplicate names client-side.
    const names = rows.map((r) => r.category.trim().toLowerCase());
    const dupe = names.find((n, i) => n && names.indexOf(n) !== i);
    if (dupe) {
      setError(`Duplicate category name: "${dupe}".`);
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        setError("Not authenticated.");
        return;
      }

      const newRows = rows.filter((r) => r._isNew);
      const existingDirty = rows.filter((r) => !r._isNew && r._dirty);

      // Insert new rows
      let insertedRows: RoiModelCategory[] = [];
      if (newRows.length > 0) {
        const { data, error: insertErr } = await supabase
          .from("roi_model_categories")
          .insert(
            newRows.map((r) => ({
              user_id: userId,
              category: r.category.trim(),
              elasticity: r.elasticity,
              baseline_daily_orders: r.baseline_daily_orders,
              avg_order_value: r.avg_order_value,
              base_margin: r.base_margin,
              cannibalization_base: r.cannibalization_base,
              position: r.position,
            })),
          )
          .select();
        if (insertErr) {
          setError(insertErr.message.includes("duplicate")
            ? "A category with that name already exists."
            : `Failed to add category: ${insertErr.message}`);
          return;
        }
        insertedRows = (data ?? []) as unknown as RoiModelCategory[];
      }

      // Update existing dirty rows
      if (existingDirty.length > 0) {
        const updateResults = await Promise.all(
          existingDirty.map((r) =>
            supabase
              .from("roi_model_categories")
              .update({
                category: r.category.trim(),
                elasticity: r.elasticity,
                baseline_daily_orders: r.baseline_daily_orders,
                avg_order_value: r.avg_order_value,
                base_margin: r.base_margin,
                cannibalization_base: r.cannibalization_base,
              })
              .eq("id", r.id),
          ),
        );
        const updateErr = updateResults.find((res) => res.error)?.error;
        if (updateErr) {
          setError(`Failed to update: ${updateErr.message}`);
          return;
        }
      }

      // Reconcile state: replace temp ids with real ones, clear dirty flags.
      setRows((prev) =>
        prev
          .map((r) => {
            if (r._isNew) {
              const match = insertedRows.find((ins) => ins.category === r.category.trim());
              return match
                ? ({ ...match, _isNew: false, _dirty: false } as Row)
                : r;
            }
            return { ...r, _dirty: false };
          })
          .filter((r) => !r._isNew || insertedRows.some((ins) => ins.category === r.category.trim())),
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {savedAt && (
            <span style={{ fontSize: 11, color: "#22C55E" }}>Saved</span>
          )}
          <button
            type="button"
            onClick={addCategory}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E2DB",
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 12,
              color: "#1A1A18",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <Plus size={13} />
            Add category
          </button>
          <PrimaryButton onClick={saveAll}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Save size={13} />
              {saving ? "Saving…" : "Save changes"}
            </span>
          </PrimaryButton>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 10px",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 6,
            fontSize: 12,
            color: "#B91C1C",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 20, fontSize: 12, color: "#9A9A9A" }}>Loading model…</div>
      ) : (
        <div style={{ marginTop: 18, overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.9fr 1.1fr 1fr 1fr 1.1fr 0.9fr",
              gap: 10,
              fontSize: 10,
              color: "#9A9A9A",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "0 4px 8px",
              minWidth: 820,
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
          {rows.map((r) => {
            const isSeeded = !r._isNew && Boolean(DEFAULTS[r.category]);
            return (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.9fr 1.1fr 1fr 1fr 1.1fr 0.9fr",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 4px",
                  borderTop: "1px solid #F1EEE7",
                  minWidth: 820,
                }}
              >
                {r._isNew ? (
                  <input
                    type="text"
                    placeholder="Category name"
                    data-roi-name={r.id}
                    value={r.category}
                    onChange={(e) => update(r.id, "category", e.target.value)}
                    style={{ ...inputStyle, fontWeight: 600 }}
                  />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18" }}>{r.category}</span>
                )}
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
                <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                  {isSeeded && (
                    <button
                      type="button"
                      onClick={() => resetRow(r.id)}
                      title="Reset to defaults"
                      style={{
                        background: "transparent",
                        border: "1px solid #E5E2DB",
                        borderRadius: 6,
                        padding: "6px 8px",
                        fontSize: 11,
                        color: "#6B6B6B",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: "inherit",
                      }}
                    >
                      <RotateCcw size={11} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(r)}
                    title="Delete category"
                    aria-label={`Delete ${r.category || "new category"}`}
                    style={{
                      background: "transparent",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 11,
                      color: "#B91C1C",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "inherit",
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ padding: 24, fontSize: 12, color: "#9A9A9A", textAlign: "center" }}>
              No categories yet. Click "Add category" to create one.
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?._isNew
                ? "This unsaved row will be removed."
                : `"${confirmDelete?.category}" will be removed from the ROI model. Existing simulation history is unaffected, but new simulations can no longer use this category.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteRow(confirmDelete)}
              style={{ backgroundColor: "#B91C1C" }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
