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
  { id: "price.changed", label: "Price changed" },
  { id: "stock.alert", label: "Stock alert" },
  { id: "competitor.update", label: "Competitor update" },
  { id: "promotion.detected", label: "Promotion detected" },
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
      toast.success("Webhook endpoint added");
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add webhook");
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Add webhook endpoint</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldRow>
            <Field label="Endpoint URL">
              <TextField value={url} onChange={setUrl} placeholder="https://your-domain.com/webhooks/prizeskout" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Description (optional)">
              <TextField value={desc} onChange={setDesc} placeholder="What this endpoint receives" />
            </Field>
          </FieldRow>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B6B6B", marginBottom: 8 }}>Events to subscribe to</div>
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
                  {ev.label}
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
              Cancel
            </button>
            <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
              <PrimaryButton onClick={handleSave}>
                {saving ? "Adding…" : "Add endpoint"}
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
      toast.success("Webhook updated");
      onSaved({ ...hook, url: url.trim(), description: desc.trim() || null, events: selectedEvents });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update webhook");
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Edit webhook endpoint</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldRow>
            <Field label="Endpoint URL">
              <TextField value={url} onChange={setUrl} placeholder="https://..." />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Description (optional)">
              <TextField value={desc} onChange={setDesc} placeholder="What this endpoint receives" />
            </Field>
          </FieldRow>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#6B6B6B", marginBottom: 8 }}>Events</div>
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
                  {ev.label}
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
              Cancel
            </button>
            <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
              <PrimaryButton onClick={handleSave}>
                {saving ? "Saving…" : "Save changes"}
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

const DATA_CONNECTIONS: DataConnectionCard[] = [
  {
    icon: <Package size={20} color="#EA580C" strokeWidth={1.75} />,
    title: "Product catalog sync",
    description: "Import your product catalog so we can match your products against competitors",
    options: ["CSV upload", "API sync", "Shopify", "WooCommerce"],
    status: { label: "Connected via API", color: "#22C55E" },
    cta: "Configure",
  },
  {
    icon: <LineChart size={20} color="#EA580C" strokeWidth={1.75} />,
    title: "Sales and margin data",
    description: "Share your sales volumes and margin targets for personalized pricing recommendations",
    options: ["CSV upload", "ERP sync", "Manual entry"],
    status: { label: "Not connected", color: "#9A9A9A" },
    cta: "Configure",
  },
  {
    icon: <MapPin size={20} color="#EA580C" strokeWidth={1.75} />,
    title: "Store locations",
    description: "Add your physical store locations for in-store competitive tracking and field intel",
    status: { label: "Configured in Locations tab", color: "#22C55E" },
    cta: "Manage",
  },
];

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
      toast.error("Copy failed — please copy manually");
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
      toast.error(err instanceof Error ? err.message : "Could not update webhook");
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
      toast.success("Webhook endpoint removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete webhook");
    } finally {
      setDeletingId(null);
    }
  };

  const maskedKey = apiKey
    ? `${apiKey.key_prefix}${"•".repeat(16)}${apiKey.last_four}`
    : "";

  const eventsLabel = (events: unknown): string => {
    if (!Array.isArray(events)) return "All events";
    return events.join(", ");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <CardTitle>API and integrations</CardTitle>
        <CardSubtitle>Connect PrizeSkout to your existing systems</CardSubtitle>

        {/* API key */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Your API key</div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
            Use this key to pull PrizeSkout data into your own systems
          </div>
          {loadingKey ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9A9A9A" }}>Loading…</div>
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
                {copied ? "Copied" : "Copy"}
              </SmallButton>
              <SmallButton icon={<ExternalLink size={14} />} as="link" href="/dashboard/api-keys">
                Manage keys
              </SmallButton>
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9A9A9A" }}>
              No active API key.{" "}
              <Link to="/dashboard/api-keys" style={{ color: "#EA580C", textDecoration: "none" }}>
                Create one →
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
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Webhook endpoints</div>
              <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
                Receive real-time event notifications in your systems
              </div>
            </div>
            <OutlineAddButton
              icon={<Plus size={14} strokeWidth={2} />}
              onClick={() => setAddHookOpen(true)}
            >
              Add webhook
            </OutlineAddButton>
          </div>

          {loadingHooks ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9A9A9A" }}>Loading…</div>
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
              No webhook endpoints configured yet.
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
                ? "Disabled"
                : hook.last_delivery_success === false
                ? "Delivery failed"
                : hook.last_delivery_at
                ? "Active"
                : "Active";
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
                      Events: {eventsLabel(hook.events)}
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
                        ariaLabel="Edit webhook"
                        icon={<Pencil size={14} color="#6B6B6B" />}
                        onClick={() => setEditHook(hook)}
                      />
                      <IconAction
                        ariaLabel="Remove webhook"
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
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>ERP and system integrations</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
            {[
              { name: "ERP System", desc: "Sync product catalog, margins, and inventory", connected: false },
              { name: "POS System", desc: "Real-time in-store sales and pricing data", connected: false },
              { name: "E-commerce Platform", desc: "Sync online catalog and order data", connected: true },
            ].map((card) => {
              const dot = card.connected ? "#22C55E" : "#9A9A9A";
              const label = card.connected ? "Connected" : "Not connected";
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
                    Configure
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data connections */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Data connections</div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4, lineHeight: 1.5 }}>
            Connect your internal systems so PrizeSkout can combine your data with market intelligence
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
            {DATA_CONNECTIONS.map((card) => (
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
