import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  LineChart,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
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
  Toggle,
} from "./primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────────────────────

type ApiKeyRow = {
  id: string;
  key_prefix: string;
  last_four: string;
  mode: string;
  name: string;
  created_at: string;
};

type WebhookRow = {
  id: string;
  url: string;
  events: unknown;
  enabled: boolean;
  description: string | null;
  last_delivery_at: string | null;
  last_delivery_success: boolean | null;
};

// ── Small helpers ──────────────────────────────────────────────────────────────

function SmallButton({
  icon,
  children,
  onClick,
  as,
  href,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  as?: "link";
  href?: string;
}) {
  const [hover, setHover] = useState(false);
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    border: `1px solid ${hover ? "#EA580C" : "#E5E2DB"}`,
    color: "#6B6B6B",
    fontSize: 12,
    fontWeight: 500,
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "border-color 0.15s",
    whiteSpace: "nowrap" as const,
    textDecoration: "none",
  };
  if (as === "link" && href) {
    return (
      <Link
        to={href as "/dashboard/api-keys"}
        style={style}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Add webhook modal ──────────────────────────────────────────────────────────

const AVAILABLE_EVENTS = [
  { id: "price.changed", labelKey: "settingsTabs.integrations.events.priceChanged" },
  { id: "stock.alert", labelKey: "settingsTabs.integrations.events.stockAlert" },
  { id: "competitor.update", labelKey: "settingsTabs.integrations.events.competitorUpdate" },
  { id: "promotion.detected", labelKey: "settingsTabs.integrations.events.promotionDetected" },
];

function AddWebhookModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["price.changed"]);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (id: string) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const canSave = url.trim().length > 0 && selectedEvents.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("webhook_endpoints").insert({
        user_id: userId,
        url: url.trim(),
        description: desc.trim() || null,
        events: selectedEvents,
        enabled: true,
        signing_secret: crypto.randomUUID().replace(/-/g, ""),
      });
      if (error) throw error;
      toast.success(t("settingsTabs.integrations.webhooks.toasts.added"));
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.integrations.webhooks.toasts.addFailed"));
    } finally {
      setSaving(false);
    }
  };

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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.integrations.addModal.title")}</div>
          <button
            type="button"
            aria-label={t("settingsTabs.integrations.addModal.close")}
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldRow>
            <Field label={t("settingsTabs.integrations.addModal.endpointUrl")}>
              <TextField value={url} onChange={setUrl} placeholder={t("settingsTabs.integrations.addModal.endpointUrlPlaceholder")} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t("settingsTabs.integrations.addModal.description")}>
              <TextField value={desc} onChange={setDesc} placeholder={t("settingsTabs.integrations.addModal.descriptionPlaceholder")} />
            </Field>
          </FieldRow>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B6B6B", marginBottom: 8 }}>{t("settingsTabs.integrations.addModal.eventsToSubscribe")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AVAILABLE_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#1A1A18",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                    style={{ accentColor: "#EA580C", width: 14, height: 14 }}
                  />
                  {t(ev.labelKey)}
                  <span style={{ fontSize: 11, color: "#9A9A9A", fontFamily: "ui-monospace, monospace" }}>
                    {ev.id}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
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
              {t("settingsTabs.integrations.addModal.cancel")}
            </button>
            <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
              <PrimaryButton onClick={handleSave}>
                {saving ? t("settingsTabs.integrations.addModal.adding") : t("settingsTabs.integrations.addModal.addEndpoint")}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit webhook modal ─────────────────────────────────────────────────────────

function EditWebhookModal({
  hook,
  onClose,
  onSaved,
}: {
  hook: WebhookRow;
  onClose: () => void;
  onSaved: (updated: WebhookRow) => void;
}) {
  const { t } = useTranslation();
  const initialEvents = Array.isArray(hook.events) ? (hook.events as string[]) : [];
  const [url, setUrl] = useState(hook.url);
  const [desc, setDesc] = useState(hook.description ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(initialEvents);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (id: string) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const canSave = url.trim().length > 0 && selectedEvents.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("webhook_endpoints")
        .update({
          url: url.trim(),
          description: desc.trim() || null,
          events: selectedEvents,
        })
        .eq("id", hook.id);
      if (error) throw error;
      toast.success(t("settingsTabs.integrations.webhooks.toasts.updated"));
      onSaved({ ...hook, url: url.trim(), description: desc.trim() || null, events: selectedEvents });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.integrations.webhooks.toasts.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.integrations.editModal.title")}</div>
          <button
            type="button"
            aria-label={t("settingsTabs.integrations.editModal.close")}
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldRow>
            <Field label={t("settingsTabs.integrations.editModal.endpointUrl")}>
              <TextField value={url} onChange={setUrl} placeholder={t("settingsTabs.integrations.editModal.endpointUrlPlaceholder")} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t("settingsTabs.integrations.editModal.description")}>
              <TextField value={desc} onChange={setDesc} placeholder={t("settingsTabs.integrations.editModal.descriptionPlaceholder")} />
            </Field>
          </FieldRow>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B6B6B", marginBottom: 8 }}>{t("settingsTabs.integrations.editModal.events")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AVAILABLE_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#1A1A18" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                    style={{ accentColor: "#EA580C", width: 14, height: 14 }}
                  />
                  {t(ev.labelKey)}
                  <span style={{ fontSize: 11, color: "#9A9A9A", fontFamily: "ui-monospace, monospace" }}>{ev.id}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
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
              {t("settingsTabs.integrations.editModal.cancel")}
            </button>
            <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
              <PrimaryButton onClick={handleSave}>
                {saving ? t("settingsTabs.integrations.editModal.saving") : t("settingsTabs.integrations.editModal.saveChanges")}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data connection tiles (static, for context) ────────────────────────────────

type DataConnectionCard = {
  icon: React.ReactNode;
  title: string;
  description: string;
  options?: string[];
  status: { label: string; color: string };
  cta: string;
};

function getDataConnections(t: (key: string) => string): DataConnectionCard[] {
  const base = "settingsTabs.integrations.dataConnections";
  return [
    {
      icon: <Package size={20} color="#EA580C" strokeWidth={1.75} />,
      title: t(`${base}.productCatalog.title`),
      description: t(`${base}.productCatalog.description`),
      options: [
        t(`${base}.options.csvUpload`),
        t(`${base}.options.apiSync`),
        "Shopify",
        "WooCommerce",
      ],
      status: { label: t(`${base}.productCatalog.status`), color: "#22C55E" },
      cta: t(`${base}.productCatalog.cta`),
    },
    {
      icon: <LineChart size={20} color="#EA580C" strokeWidth={1.75} />,
      title: t(`${base}.salesMargin.title`),
      description: t(`${base}.salesMargin.description`),
      options: [
        t(`${base}.options.csvUpload`),
        t(`${base}.options.erpSync`),
        t(`${base}.options.manualEntry`),
      ],
      status: { label: t(`${base}.salesMargin.status`), color: "#9A9A9A" },
      cta: t(`${base}.salesMargin.cta`),
    },
    {
      icon: <MapPin size={20} color="#EA580C" strokeWidth={1.75} />,
      title: t(`${base}.storeLocations.title`),
      description: t(`${base}.storeLocations.description`),
      status: { label: t(`${base}.storeLocations.status`), color: "#22C55E" },
      cta: t(`${base}.storeLocations.cta`),
    },
  ];
}

function DataConnectionTile({ card }: { card: DataConnectionCard }) {
  return (
    <div
      style={{
        backgroundColor: "#FAFAF9",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {card.icon}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{card.title}</div>
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>{card.description}</div>
      {card.options && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
          {card.options.map((opt) => (
            <span
              key={opt}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#6B6B6B",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E2DB",
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              {opt}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        <StatusDot color={card.status.color} />
        <span style={{ fontSize: 11, color: card.status.color, fontWeight: 500 }}>{card.status.label}</span>
      </div>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        style={{ fontSize: 12, fontWeight: 500, color: "#EA580C", textDecoration: "none", marginTop: 2 }}
      >
        {card.cta}
      </a>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<ApiKeyRow | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loadingKey, setLoadingKey] = useState(true);
  const [loadingHooks, setLoadingHooks] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addHookOpen, setAddHookOpen] = useState(false);
  const [editHook, setEditHook] = useState<WebhookRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadKey = async () => {
    if (!user) return;
    setLoadingKey(true);
    const { data } = await supabase
      .from("api_keys")
      .select("id, key_prefix, last_four, mode, name, created_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setApiKey(data as ApiKeyRow | null);
    setLoadingKey(false);
  };

  const loadWebhooks = async () => {
    if (!user) return;
    setLoadingHooks(true);
    const { data } = await supabase
      .from("webhook_endpoints")
      .select("id, url, events, enabled, description, last_delivery_at, last_delivery_success")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWebhooks((data ?? []) as WebhookRow[]);
    setLoadingHooks(false);
  };

  useEffect(() => {
    loadKey();
    loadWebhooks();
  }, [user?.id]);

  const handleCopy = async () => {
    if (!apiKey) return;
    const masked = `${apiKey.key_prefix}${"•".repeat(16)}${apiKey.last_four}`;
    try {
      await navigator.clipboard.writeText(masked);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("settingsTabs.integrations.apiKey.copyFailed"));
    }
  };

  const handleToggleWebhook = async (hook: WebhookRow) => {
    setTogglingId(hook.id);
    try {
      const { error } = await supabase
        .from("webhook_endpoints")
        .update({ enabled: !hook.enabled })
        .eq("id", hook.id);
      if (error) throw error;
      setWebhooks((prev) =>
        prev.map((w) => (w.id === hook.id ? { ...w, enabled: !hook.enabled } : w))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.integrations.webhooks.toasts.toggleFailed"));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
      if (error) throw error;
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success(t("settingsTabs.integrations.webhooks.toasts.removed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.integrations.webhooks.toasts.removeFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const maskedKey = apiKey
    ? `${apiKey.key_prefix}${"•".repeat(16)}${apiKey.last_four}`
    : "";

  const eventsLabel = (events: unknown): string => {
    if (!Array.isArray(events)) return t("settingsTabs.integrations.webhooks.allEvents");
    return events.join(", ");
  };

  const dataConnections = getDataConnections(t);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <CardTitle>{t("settingsTabs.integrations.heading")}</CardTitle>
        <CardSubtitle>{t("settingsTabs.integrations.description")}</CardSubtitle>

        {/* API key */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.integrations.apiKey.heading")}</div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
            {t("settingsTabs.integrations.apiKey.description")}
          </div>
          {loadingKey ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9A9A9A" }}>{t("settingsTabs.integrations.loading")}</div>
          ) : apiKey ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  flex: "1 1 240px",
                  minWidth: 0,
                  fontSize: 13,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  backgroundColor: "#FAFAF9",
                  border: "1px solid #E5E2DB",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#1A1A18",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {maskedKey}
              </div>
              <SmallButton icon={copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />} onClick={handleCopy}>
                {copied ? t("settingsTabs.integrations.apiKey.copied") : t("settingsTabs.integrations.apiKey.copy")}
              </SmallButton>
              <SmallButton icon={<ExternalLink size={14} />} as="link" href="/dashboard/api-keys">
                {t("settingsTabs.integrations.apiKey.manageKeys")}
              </SmallButton>
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9A9A9A" }}>
              {t("settingsTabs.integrations.apiKey.noKey")}{" "}
              <Link to="/dashboard/api-keys" style={{ color: "#EA580C", textDecoration: "none" }}>
                {t("settingsTabs.integrations.apiKey.createOne")}
              </Link>
            </div>
          )}
        </div>

        {/* Webhooks */}
        <div style={{ marginTop: 24 }}>
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
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.integrations.webhooks.heading")}</div>
              <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
                {t("settingsTabs.integrations.webhooks.description")}
              </div>
            </div>
            <OutlineAddButton
              icon={<Plus size={14} strokeWidth={2} />}
              onClick={() => setAddHookOpen(true)}
            >
              {t("settingsTabs.integrations.webhooks.addWebhook")}
            </OutlineAddButton>
          </div>

          {loadingHooks ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9A9A9A" }}>{t("settingsTabs.integrations.loading")}</div>
          ) : webhooks.length === 0 ? (
            <div
              style={{
                marginTop: 14,
                padding: "20px 0",
                textAlign: "center",
                fontSize: 13,
                color: "#9A9A9A",
                borderTop: "1px solid #E5E2DB",
              }}
            >
              {t("settingsTabs.integrations.webhooks.empty")}
            </div>
          ) : (
            webhooks.map((hook, i) => {
              const isLast = i === webhooks.length - 1;
              const statusColor = hook.last_delivery_success === false
                ? "#EF4444"
                : hook.enabled
                ? "#22C55E"
                : "#9A9A9A";
              const statusLabel = !hook.enabled
                ? t("settingsTabs.integrations.webhooks.status.disabled")
                : hook.last_delivery_success === false
                ? t("settingsTabs.integrations.webhooks.status.deliveryFailed")
                : t("settingsTabs.integrations.webhooks.status.active");
              return (
                <div
                  key={hook.id}
                  style={{
                    marginTop: 14,
                    padding: "14px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                    borderTop: "1px solid #E5E2DB",
                    borderBottom: isLast ? "none" : undefined,
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        color: "#6B6B6B",
                        wordBreak: "break-all",
                      }}
                    >
                      {hook.url}
                    </div>
                    {hook.description && (
                      <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>{hook.description}</div>
                    )}
                    <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 4 }}>
                      {t("settingsTabs.integrations.webhooks.eventsLabel", { events: eventsLabel(hook.events) })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <StatusDot color={statusColor} />
                      <span style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>
                    </div>
                    <Toggle
                      on={hook.enabled}
                      onChange={() => handleToggleWebhook(hook)}
                      size="sm"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <IconAction
                        ariaLabel={t("settingsTabs.integrations.webhooks.editAria")}
                        icon={<Pencil size={14} color="#6B6B6B" />}
                        onClick={() => setEditHook(hook)}
                      />
                      <IconAction
                        ariaLabel={t("settingsTabs.integrations.webhooks.removeAria")}
                        hoverColor="#EF4444"
                        icon={
                          <Trash2
                            size={14}
                            color={deletingId === hook.id ? "#EF4444" : "#9A9A9A"}
                          />
                        }
                        onClick={() => handleDeleteWebhook(hook.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ERP integrations */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.integrations.erp.heading")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
            {[
              { name: t("settingsTabs.integrations.erp.cards.erp.name"), desc: t("settingsTabs.integrations.erp.cards.erp.desc"), connected: false },
              { name: t("settingsTabs.integrations.erp.cards.pos.name"), desc: t("settingsTabs.integrations.erp.cards.pos.desc"), connected: false },
              { name: t("settingsTabs.integrations.erp.cards.ecommerce.name"), desc: t("settingsTabs.integrations.erp.cards.ecommerce.desc"), connected: true },
            ].map((card) => {
              const dot = card.connected ? "#22C55E" : "#9A9A9A";
              const label = card.connected ? t("settingsTabs.integrations.erp.connected") : t("settingsTabs.integrations.erp.notConnected");
              return (
                <div
                  key={card.name}
                  style={{
                    backgroundColor: "#FAFAF9",
                    border: "1px solid #E5E2DB",
                    borderRadius: 10,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{card.name}</div>
                  <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>{card.desc}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <StatusDot color={dot} />
                    <span style={{ fontSize: 11, color: dot, fontWeight: 500 }}>{label}</span>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={{ fontSize: 12, fontWeight: 500, color: "#EA580C", textDecoration: "none", marginTop: 4 }}
                  >
                    {t("settingsTabs.integrations.erp.configure")}
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data connections */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.integrations.dataConnections.heading")}</div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4, lineHeight: 1.5 }}>
            {t("settingsTabs.integrations.dataConnections.description")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
            {dataConnections.map((card) => (
              <DataConnectionTile key={card.title} card={card} />
            ))}
          </div>
        </div>
      </Card>

      {addHookOpen && user && (
        <AddWebhookModal
          userId={user.id}
          onClose={() => setAddHookOpen(false)}
          onAdded={loadWebhooks}
        />
      )}

      {editHook && (
        <EditWebhookModal
          hook={editHook}
          onClose={() => setEditHook(null)}
          onSaved={(updated) => {
            setWebhooks((prev) => prev.map((w) => w.id === updated.id ? updated : w));
            setEditHook(null);
          }}
        />
      )}
    </div>
  );
}
