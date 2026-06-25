import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { MarginLayout } from "@/components/margin/MarginLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/margin-dashboard/settings")({
  component: MarginSettingsPage,
});

const BRAND = "#10B981";

type CostRow = {
  id?: string;
  item_name: string;
  cogs: string;
  packaging_cost: string;
  prep_time_minutes: string;
  hourly_labor_cost: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5A7A68", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "9px 12px",
        background: "#FFFFFF",
        border: "1px solid #D0E0D8",
        borderRadius: 7,
        fontSize: 13,
        color: "#0F1A15",
        fontFamily: "inherit",
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = BRAND; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#D0E0D8"; }}
    />
  );
}

function MarginSettingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("margin_cost_profiles")
      .select("id, item_name, cogs, packaging_cost, prep_time_minutes, hourly_labor_cost")
      .eq("user_id", user.id)
      .order("item_name")
      .then(({ data }) => {
        setRows(
          (data ?? []).map((r) => ({
            id: r.id,
            item_name: r.item_name,
            cogs: r.cogs != null ? String(r.cogs) : "",
            packaging_cost: r.packaging_cost != null ? String(r.packaging_cost) : "",
            prep_time_minutes: r.prep_time_minutes != null ? String(r.prep_time_minutes) : "",
            hourly_labor_cost: r.hourly_labor_cost != null ? String(r.hourly_labor_cost) : "",
          }))
        );
        setLoading(false);
      });
  }, [user?.id]);

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { item_name: "", cogs: "", packaging_cost: "", prep_time_minutes: "", hourly_labor_cost: "" },
    ]);

  const updateRow = (i: number, field: keyof CostRow, val: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  const removeRow = async (i: number) => {
    const row = rows[i];
    if (row.id) {
      await supabase.from("margin_cost_profiles").delete().eq("id", row.id);
    }
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const row of rows) {
        if (!row.item_name.trim()) continue;
        const payload = {
          user_id: user.id,
          item_name: row.item_name.trim(),
          cogs: row.cogs ? parseFloat(row.cogs) : null,
          packaging_cost: row.packaging_cost ? parseFloat(row.packaging_cost) : null,
          prep_time_minutes: row.prep_time_minutes ? parseInt(row.prep_time_minutes) : null,
          hourly_labor_cost: row.hourly_labor_cost ? parseFloat(row.hourly_labor_cost) : null,
        };
        if (row.id) {
          await supabase.from("margin_cost_profiles").update(payload).eq("id", row.id);
        } else {
          await supabase.from("margin_cost_profiles").upsert(payload, { onConflict: "user_id,item_name" });
        }
      }
      toast.success("Cost profiles saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MarginLayout
      title="Cost profiles"
      subtitle="Enter your per-item costs so Margin can compute true net margin"
      action={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: `linear-gradient(135deg, ${BRAND}, #059669)`,
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 700,
            padding: "9px 16px",
            borderRadius: 8,
            border: "none",
            cursor: saving ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <Save size={13} /> {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      {/* Explainer */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2EDE8",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 24,
          fontSize: 13,
          color: "#5A7A68",
          lineHeight: 1.65,
        }}
      >
        <strong style={{ color: "#0F1A15" }}>Why this matters:</strong> aggregator commissions
        are only part of the margin story. Packaging costs, cost of goods, and labor prep time
        must be netted out to see which items and channels actually make money.
        Add a row for each item you sell. You can leave fields blank and fill them in over time.
      </div>

      {loading ? (
        <div style={{ padding: "32px 0", fontSize: 13, color: "#8AAF98" }}>Loading…</div>
      ) : (
        <>
          {/* Column headers */}
          {rows.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 110px 110px 120px 36px",
                gap: 10,
                padding: "0 4px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "#8AAF98",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <span>Item name</span>
              <span>COGS (QAR)</span>
              <span>Packaging (QAR)</span>
              <span>Prep (min)</span>
              <span>Labor/hr (QAR)</span>
              <span />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2EDE8",
                  borderRadius: 9,
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 110px 110px 120px 36px",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Field label="">
                  <TextInput
                    value={row.item_name}
                    onChange={(v) => updateRow(i, "item_name", v)}
                    placeholder="e.g. Chicken Shawarma"
                  />
                </Field>
                <Field label="">
                  <TextInput
                    value={row.cogs}
                    onChange={(v) => updateRow(i, "cogs", v)}
                    placeholder="0.00"
                    type="number"
                  />
                </Field>
                <Field label="">
                  <TextInput
                    value={row.packaging_cost}
                    onChange={(v) => updateRow(i, "packaging_cost", v)}
                    placeholder="0.00"
                    type="number"
                  />
                </Field>
                <Field label="">
                  <TextInput
                    value={row.prep_time_minutes}
                    onChange={(v) => updateRow(i, "prep_time_minutes", v)}
                    placeholder="0"
                    type="number"
                  />
                </Field>
                <Field label="">
                  <TextInput
                    value={row.hourly_labor_cost}
                    onChange={(v) => updateRow(i, "hourly_labor_cost", v)}
                    placeholder="0.00"
                    type="number"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#B2CFBE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                    borderRadius: 6,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#B2CFBE"; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "transparent",
              border: `1px dashed #B2CFBE`,
              color: "#5A7A68",
              fontSize: 13,
              fontWeight: 600,
              padding: "9px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.color = BRAND; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#B2CFBE"; e.currentTarget.style.color = "#5A7A68"; }}
          >
            <Plus size={13} /> Add item
          </button>
        </>
      )}
    </MarginLayout>
  );
}
