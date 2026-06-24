import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardSubtitle,
  CardTitle,
  Field,
  FieldRow,
  IconAction,
  OutlineAddButton,
  PrimaryButton,
  StatusDot,
  TextField,
} from "./primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Channel = "Online" | "In-Store";
type Status = "Active" | "Partial";

type Competitor = {
  name: string;
  channels: Channel[];
  products: number;
  status: Status;
};

function ChannelPill({ channel }: { channel: Channel }) {
  const isOnline = channel === "Online";
  return (
    <span
      style={{
        backgroundColor: isOnline ? "rgba(59, 130, 246, 0.08)" : "rgba(168, 85, 247, 0.08)",
        color: isOnline ? "#3B82F6" : "#7C3AED",
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 12,
      }}
    >
      {channel}
    </span>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 15, 14, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          border: "1px solid #E5E2DB",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #E5E2DB",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{title}</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function AddCompetitorModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [competitorName, setCompetitorName] = useState("");
  const [product, setProduct] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = competitorName.trim() && product.trim() && url.trim();

  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("competitor_product_urls").insert({
        user_id: user.id,
        competitor: competitorName.trim(),
        product: product.trim(),
        url: url.trim(),
        category: category.trim() || null,
      });
      if (error) throw error;
      toast.success(`${competitorName.trim()} added to tracking`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add competitor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add competitor" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FieldRow>
          <Field label="Competitor name">
            <TextField value={competitorName} onChange={setCompetitorName} placeholder="e.g. Carrefour Qatar" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Product to track">
            <TextField value={product} onChange={setProduct} placeholder="e.g. Sony WH-1000XM5" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Product URL">
            <TextField value={url} onChange={setUrl} placeholder="https://..." />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Category (optional)">
            <TextField value={category} onChange={setCategory} placeholder="e.g. Electronics" />
          </Field>
        </FieldRow>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              color: "#1A1A18",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 18px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
            <PrimaryButton onClick={handleSave}>
              {saving ? "Adding…" : "Add competitor"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteModal({
  name,
  onCancel,
  onConfirm,
  deleting,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <ModalShell title="Remove competitor" onClose={onCancel}>
      <div style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.5 }}>
        Remove <strong>{name}</strong> and stop tracking all their products? This cannot be undone.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            color: "#1A1A18",
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          style={{
            backgroundColor: "#EF4444",
            border: "none",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </div>
    </ModalShell>
  );
}

export function CompetitorsTab() {
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("competitor_product_urls")
      .select("competitor, product")
      .eq("user_id", user.id);

    if (data) {
      const grouped = new Map<string, Set<string>>();
      for (const row of data) {
        if (!grouped.has(row.competitor)) grouped.set(row.competitor, new Set());
        grouped.get(row.competitor)!.add(row.product);
      }
      setCompetitors(
        Array.from(grouped.entries()).map(([name, products]) => ({
          name,
          channels: ["Online" as const],
          products: products.size,
          status: "Active" as const,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleDelete = async () => {
    if (!confirmDelete || !user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("competitor_product_urls")
        .delete()
        .eq("user_id", user.id)
        .eq("competitor", confirmDelete);
      if (error) throw error;
      toast.success(`${confirmDelete} removed`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove competitor");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <CardTitle>Tracked competitors</CardTitle>
            <CardSubtitle>
              Manage the competitors you monitor across online and physical channels
            </CardSubtitle>
          </div>
          <OutlineAddButton
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={() => setAddOpen(true)}
          >
            Add competitor
          </OutlineAddButton>
        </div>

        <div style={{ marginTop: 8 }}>
          {loading && (
            <div style={{ padding: "24px 0", fontSize: 12, color: "#9A9A9A" }}>Loading…</div>
          )}
          {!loading && competitors.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "#9A9A9A" }}>
              No competitors tracked yet. Add one to start monitoring prices.
            </div>
          )}
          {competitors.map((c, i) => {
            const isLast = i === competitors.length - 1;
            const statusColor = c.status === "Active" ? "#22C55E" : "#F59E0B";
            return (
              <div
                key={c.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 0",
                  borderBottom: isLast ? "none" : "1px solid #E5E2DB",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{c.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {c.channels.map((ch) => (
                      <ChannelPill key={ch} channel={ch} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 6 }}>
                    {c.products} {c.products === 1 ? "product" : "products"} tracked
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A18" }}>
                      {c.products.toLocaleString()}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <StatusDot color={statusColor} />
                      <span style={{ fontSize: 11, color: statusColor }}>{c.status}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <IconAction
                      ariaLabel={`Edit ${c.name}`}
                      icon={<Pencil size={14} color="#6B6B6B" />}
                      onClick={() => toast.info("Manage individual product URLs from the Competitors page")}
                    />
                    <IconAction
                      ariaLabel={`Remove ${c.name}`}
                      hoverColor="#EF4444"
                      icon={<Trash2 size={14} color="#9A9A9A" />}
                      onClick={() => setConfirmDelete(c.name)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {addOpen && (
        <AddCompetitorModal
          onClose={() => setAddOpen(false)}
          onAdded={load}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          name={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </>
  );
}
