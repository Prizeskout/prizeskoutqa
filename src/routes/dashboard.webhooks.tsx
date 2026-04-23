import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Webhook, Plus, Trash2, Power } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  createWebhookEndpoint,
  toggleWebhookEndpoint,
  deleteWebhookEndpoint,
} from "@/server/developer-console.functions";

export const Route = createFileRoute("/dashboard/webhooks")({
  head: () => ({ meta: [{ title: "Webhooks | PrizeSkout" }] }),
  component: WebhooksPage,
});

type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  enabled: boolean;
  signing_secret: string;
  last_delivery_at: string | null;
  last_delivery_success: boolean | null;
};

type Delivery = {
  id: string;
  endpoint_id: string;
  event_type: string;
  status_code: number | null;
  success: boolean;
  delivered_at: string;
  error: string | null;
};

const AVAILABLE_EVENTS = [
  "price.changed",
  "competitor.scraped",
  "recommendation.ready",
  "promotion.detected",
  "alert.triggered",
];

function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const createFn = useServerFn(createWebhookEndpoint);
  const toggleFn = useServerFn(toggleWebhookEndpoint);
  const deleteFn = useServerFn(deleteWebhookEndpoint);

  const load = async () => {
    setLoading(true);
    const [ep, del] = await Promise.all([
      supabase
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("webhook_deliveries")
        .select("id,endpoint_id,event_type,status_code,success,delivered_at,error")
        .order("delivered_at", { ascending: false })
        .limit(50),
    ]);
    setEndpoints((ep.data ?? []) as Endpoint[]);
    setDeliveries((del.data ?? []) as Delivery[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!url.trim() || creating) return;
    setCreating(true);
    try {
      await createFn({ data: { url: url.trim(), description: description.trim(), events } });
      setUrl("");
      setDescription("");
      setEvents([]);
      setShowCreate(false);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleFn({ data: { id, enabled: !enabled } });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this endpoint? Deliveries will also be removed.")) return;
    await deleteFn({ data: { id } });
    await load();
  };

  return (
    <DashboardLayout
      title="Webhooks"
      subtitle="Receive real-time events from PrizeSkout — price changes, competitor scrapes, and ready recommendations."
      helpItems={[
        "Register an HTTPS endpoint and subscribe to the events you care about.",
        "Verify every delivery using the signing secret before trusting the payload.",
        "Failed deliveries retry with backoff — check the deliveries log below.",
      ]}
      primaryAction={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#EA580C",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add endpoint
        </button>
      }
    >
      {showCreate && (
        <div
          style={{
            border: "1px solid #E5E2DB",
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>New webhook endpoint</div>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#6B6B6B" }}>
              URL
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/prizeskout"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  border: "1px solid #E5E2DB",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#6B6B6B" }}>
              Description (optional)
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Production pricing handler"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  border: "1px solid #E5E2DB",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </label>
            <div>
              <div style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 6 }}>Events to send</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {AVAILABLE_EVENTS.map((ev) => {
                  const active = events.includes(ev);
                  return (
                    <button
                      key={ev}
                      type="button"
                      onClick={() =>
                        setEvents((cur) => (active ? cur.filter((e) => e !== ev) : [...cur, ev]))
                      }
                      style={{
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        fontFamily: "ui-monospace, monospace",
                        border: `1px solid ${active ? "#EA580C" : "#E5E2DB"}`,
                        backgroundColor: active ? "#FFF7ED" : "#fff",
                        color: active ? "#EA580C" : "#6B6B6B",
                        cursor: "pointer",
                      }}
                    >
                      {ev}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !url.trim()}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#EA580C",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: creating ? "wait" : "pointer",
                  opacity: creating || !url.trim() ? 0.6 : 1,
                }}
              >
                {creating ? "Creating…" : "Add endpoint"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "transparent",
                  border: "1px solid #E5E2DB",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#6B6B6B",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#8A8A8A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Endpoints
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: "#8A8A8A" }}>Loading…</div>
        ) : endpoints.length === 0 ? (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px dashed #E5E2DB",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
            }}
          >
            <Webhook size={24} color="#9A9A9A" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, color: "#6B6B6B" }}>
              No endpoints yet. Add one to start receiving events.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #E5E2DB",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: ep.enabled ? "#22C55E" : "#9A9A9A",
                        }}
                      />
                      <code style={{ fontSize: 13, color: "#1A1A18", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ep.url}
                      </code>
                    </div>
                    {ep.description && (
                      <div style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 6 }}>{ep.description}</div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {ep.events.length === 0 ? (
                        <span style={{ fontSize: 11, color: "#9A9A9A" }}>No events subscribed</span>
                      ) : (
                        ep.events.map((e) => (
                          <span
                            key={e}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10.5,
                              fontFamily: "ui-monospace, monospace",
                              backgroundColor: "#F1EDE4",
                              color: "#6B6B6B",
                            }}
                          >
                            {e}
                          </span>
                        ))
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#8A8A8A" }}>
                      Signing secret:{" "}
                      <code style={{ fontFamily: "ui-monospace, monospace" }}>
                        {ep.signing_secret.slice(0, 12)}…{ep.signing_secret.slice(-4)}
                      </code>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleToggle(ep.id, ep.enabled)}
                      title={ep.enabled ? "Disable" : "Enable"}
                      style={{
                        padding: 8,
                        background: "transparent",
                        border: "1px solid #E5E2DB",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: ep.enabled ? "#22C55E" : "#9A9A9A",
                      }}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ep.id)}
                      title="Delete"
                      style={{
                        padding: 8,
                        background: "transparent",
                        border: "1px solid #E5E2DB",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: "#DC2626",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#8A8A8A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Recent deliveries
        </div>
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #E5E2DB",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {deliveries.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: "#8A8A8A", textAlign: "center" }}>
              No deliveries yet.
            </div>
          ) : (
            deliveries.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 80px 80px",
                  alignItems: "center",
                  padding: "10px 16px",
                  fontSize: 12.5,
                  borderBottom: "1px solid #F1EDE4",
                }}
              >
                <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                  {new Date(d.delivered_at).toLocaleString()}
                </span>
                <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{d.event_type}</code>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: d.success ? "#166534" : "#DC2626",
                  }}
                >
                  {d.status_code ?? "—"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: d.success ? "#166534" : "#DC2626",
                  }}
                >
                  {d.success ? "Delivered" : "Failed"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
