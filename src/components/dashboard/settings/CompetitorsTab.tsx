import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
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

// ── Types ──────────────────────────────────────────────────────────────────────

type ProductUrl = {
  id: string;
  product: string;
  url: string;
  category: string | null;
  channel: string;
};

type Channel = string;
type Status = "Active" | "Partial";

type Competitor = {
  name: string;
  channels: Channel[];
  products: number;
  status: Status;
};

function ChannelPill({ channel }: { channel: Channel }) {
  const { t } = useTranslation();
  const isOnline = channel.toLowerCase() !== "in-store";
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
  const { t } = useTranslation();
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
            aria-label={t("settingsTabs.competitors.close")}
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [competitorName, setCompetitorName] = useState("");
  const [product, setProduct] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState("zid");
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
        channel: channel.trim().toLowerCase(),
        match_status: "manual_confirmed",
        match_confidence: 1,
      });
      if (error) throw error;
      toast.success(t("settingsTabs.competitors.toasts.addedToTracking", { name: competitorName.trim() }));
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.competitors.toasts.addFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={t("settingsTabs.competitors.addModal.title")} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FieldRow>
          <Field label={t("settingsTabs.competitors.addModal.channel")}>
            <TextField value={channel} onChange={setChannel} placeholder={t("settingsTabs.competitors.addModal.channelPlaceholder")} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label={t("settingsTabs.competitors.addModal.competitorName")}>
            <TextField value={competitorName} onChange={setCompetitorName} placeholder={t("settingsTabs.competitors.addModal.competitorNamePlaceholder")} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label={t("settingsTabs.competitors.addModal.productToTrack")}>
            <TextField value={product} onChange={setProduct} placeholder={t("settingsTabs.competitors.addModal.productPlaceholder")} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label={t("settingsTabs.competitors.addModal.productUrl")}>
            <TextField value={url} onChange={setUrl} placeholder={t("settingsTabs.competitors.addModal.urlPlaceholder")} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label={t("settingsTabs.competitors.addModal.category")}>
            <TextField value={category} onChange={setCategory} placeholder={t("settingsTabs.competitors.addModal.categoryPlaceholder")} />
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
            {t("settingsTabs.competitors.cancel")}
          </button>
          <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
            <PrimaryButton onClick={handleSave}>
              {saving ? t("settingsTabs.competitors.addModal.adding") : t("settingsTabs.competitors.addModal.addCompetitor")}
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
  const { t } = useTranslation();
  return (
    <ModalShell title={t("settingsTabs.competitors.confirmDelete.title")} onClose={onCancel}>
      <div style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.5 }}>
        <Trans
          i18nKey="settingsTabs.competitors.confirmDelete.body"
          values={{ name }}
          components={{ strong: <strong /> }}
        />
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
          {t("settingsTabs.competitors.cancel")}
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
          {deleting ? t("settingsTabs.competitors.confirmDelete.removing") : t("settingsTabs.competitors.confirmDelete.remove")}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Edit competitor modal (manage individual product URLs) ─────────────────────

function EditCompetitorModal({
  competitorName,
  userId,
  onClose,
  onChanged,
}: {
  competitorName: string;
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [urls, setUrls] = useState<ProductUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newChannel, setNewChannel] = useState("zid");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("competitor_product_urls")
        .select("id, product, url, category, channel")
        .eq("user_id", userId)
        .eq("competitor", competitorName)
        .order("created_at", { ascending: true });
      setUrls((data ?? []) as ProductUrl[]);
      setLoading(false);
    })();
  }, [competitorName, userId]);

  const handleAdd = async () => {
    if (!newProduct.trim() || !newUrl.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("competitor_product_urls")
        .insert({
          user_id: userId,
          competitor: competitorName,
          product: newProduct.trim(),
          url: newUrl.trim(),
          category: newCategory.trim() || null,
          channel: newChannel.trim().toLowerCase(),
          match_status: "manual_confirmed",
          match_confidence: 1,
        })
        .select("id, product, url, category, channel")
        .single();
      if (error) throw error;
      setUrls((prev) => [...prev, data as ProductUrl]);
      setNewProduct("");
      setNewUrl("");
      setNewCategory("");
      setNewChannel("zid");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.competitors.toasts.urlAddFailed"));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUrl = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("competitor_product_urls")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setUrls((prev) => prev.filter((u) => u.id !== id));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.competitors.toasts.urlRemoveFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const canAdd = newProduct.trim() && newUrl.trim();

  return (
    <ModalShell title={t("settingsTabs.competitors.editModal.title", { name: competitorName })} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Tracked URLs list */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6B6B6B", marginBottom: 8 }}>
            {t("settingsTabs.competitors.editModal.trackedUrls")}
          </div>
          {loading ? (
            <div style={{ fontSize: 12, color: "#9A9A9A" }}>{t("settingsTabs.competitors.editModal.loading")}</div>
          ) : urls.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9A9A9A" }}>{t("settingsTabs.competitors.editModal.noUrls")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {urls.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    backgroundColor: "#FAFAF9",
                    border: "1px solid #E5E2DB",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>{u.product}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B6B6B",
                        wordBreak: "break-all",
                        marginTop: 2,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {u.url}
                    </div>
                    {u.category && (
                      <div style={{ fontSize: 10, color: "#9A9A9A", marginTop: 2 }}>{u.category}</div>
                    )}
                    <div style={{ fontSize: 10, color: "#F66B21", marginTop: 2, textTransform: "uppercase" }}>{u.channel}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={t("settingsTabs.competitors.editModal.removeUrlAria")}
                    disabled={deletingId === u.id}
                    onClick={() => handleDeleteUrl(u.id)}
                    style={{
                      flexShrink: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      opacity: deletingId === u.id ? 0.5 : 1,
                      display: "inline-flex",
                    }}
                  >
                    <Trash2 size={14} color="#9A9A9A" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new URL */}
        <div style={{ borderTop: "1px solid #E5E2DB", paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6B6B6B", marginBottom: 10 }}>
            {t("settingsTabs.competitors.editModal.addProductUrl")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FieldRow>
              <Field label={t("settingsTabs.competitors.editModal.channel")}>
                <TextField value={newChannel} onChange={setNewChannel} placeholder={t("settingsTabs.competitors.addModal.channelPlaceholder")} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label={t("settingsTabs.competitors.editModal.productName")}>
                <TextField value={newProduct} onChange={setNewProduct} placeholder={t("settingsTabs.competitors.editModal.productNamePlaceholder")} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label={t("settingsTabs.competitors.editModal.url")}>
                <TextField value={newUrl} onChange={setNewUrl} placeholder={t("settingsTabs.competitors.editModal.urlPlaceholder")} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label={t("settingsTabs.competitors.editModal.category")}>
                <TextField value={newCategory} onChange={setNewCategory} placeholder={t("settingsTabs.competitors.editModal.categoryPlaceholder")} />
              </Field>
            </FieldRow>
            <div>
              <div style={{ opacity: canAdd ? 1 : 0.5, pointerEvents: canAdd ? "auto" : "none", display: "inline-block" }}>
                <PrimaryButton onClick={handleAdd}>
                  {adding ? t("settingsTabs.competitors.editModal.adding") : t("settingsTabs.competitors.editModal.addUrl")}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #E5E2DB", paddingTop: 14 }}>
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
            {t("settingsTabs.competitors.editModal.done")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function CompetitorsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editCompetitor, setEditCompetitor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("competitor_product_urls")
      .select("competitor, product, channel")
      .eq("user_id", user.id);

    if (data) {
      const grouped = new Map<string, { products: Set<string>; channels: Set<string> }>();
      for (const row of data) {
        if (!grouped.has(row.competitor)) grouped.set(row.competitor, { products: new Set(), channels: new Set() });
        grouped.get(row.competitor)!.products.add(row.product);
        grouped.get(row.competitor)!.channels.add(row.channel);
      }
      setCompetitors(
        Array.from(grouped.entries()).map(([name, tracked]) => ({
          name,
          channels: Array.from(tracked.channels),
          products: tracked.products.size,
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
      toast.success(t("settingsTabs.competitors.toasts.removed", { name: confirmDelete }));
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.competitors.toasts.removeFailed"));
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
            <CardTitle>{t("settingsTabs.competitors.heading")}</CardTitle>
            <CardSubtitle>
              {t("settingsTabs.competitors.description")}
            </CardSubtitle>
          </div>
          <OutlineAddButton
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={() => setAddOpen(true)}
          >
            {t("settingsTabs.competitors.addCompetitor")}
          </OutlineAddButton>
        </div>

        <div style={{ marginTop: 8 }}>
          {loading && (
            <div style={{ padding: "24px 0", fontSize: 12, color: "#9A9A9A" }}>{t("settingsTabs.competitors.loading")}</div>
          )}
          {!loading && competitors.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "#9A9A9A" }}>
              {t("settingsTabs.competitors.empty")}
            </div>
          )}
          {competitors.map((c, i) => {
            const isLast = i === competitors.length - 1;
            const statusColor = c.status === "Active" ? "#22C55E" : "#F59E0B";
            const statusLabel = c.status === "Active"
              ? t("settingsTabs.competitors.status.active")
              : t("settingsTabs.competitors.status.partial");
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
                    {t("settingsTabs.competitors.productsTracked", { count: c.products })}
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
                      <span style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <IconAction
                      ariaLabel={t("settingsTabs.competitors.editAria", { name: c.name })}
                      icon={<Pencil size={14} color="#6B6B6B" />}
                      onClick={() => setEditCompetitor(c.name)}
                    />
                    <IconAction
                      ariaLabel={t("settingsTabs.competitors.removeAria", { name: c.name })}
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

      {editCompetitor && user && (
        <EditCompetitorModal
          competitorName={editCompetitor}
          userId={user.id}
          onClose={() => setEditCompetitor(null)}
          onChanged={load}
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
