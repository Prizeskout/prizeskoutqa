import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Webhook,
  Plus,
  Trash2,
  Power,
  X,
  RefreshCw,
  ShieldCheck,
  Settings2,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  createWebhookEndpoint,
  toggleWebhookEndpoint,
  deleteWebhookEndpoint,
  retryWebhookDelivery,
  updateWebhookRetryConfig,
  testWebhookSignature,
  rotateWebhookSecret,
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
  secret_last_rotated_at: string | null;
  last_delivery_at: string | null;
  last_delivery_success: boolean | null;
  max_attempts: number;
  backoff_seconds: number;
};

type Delivery = {
  id: string;
  endpoint_id: string;
  event_type: string;
  status_code: number | null;
  success: boolean;
  delivered_at: string;
  error: string | null;
  attempt: number;
  max_attempts: number | null;
  payload: unknown;
  response_body: string | null;
  duration_ms: number | null;
  next_retry_at: string | null;
  payload_preview: string | null;
};

const AVAILABLE_EVENTS = [
  "catalog.synced",
  "recommendation.ready",
  "price.changed",
  "competitor.scraped",
  "promotion.detected",
  "alert.triggered",
  "enrich.price_changed",
  "enrich.promo_detected",
  "enrich.new_competitor",
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

  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  const [configEndpoint, setConfigEndpoint] = useState<Endpoint | null>(null);
  const [testerEndpoint, setTesterEndpoint] = useState<Endpoint | null>(null);

  // Copy-once secret reveal: shown after create/rotate, never again.
  const [revealedSecret, setRevealedSecret] = useState<{
    secret: string;
    url: string;
    rotated: boolean;
  } | null>(null);

  const createFn = useServerFn(createWebhookEndpoint);
  const toggleFn = useServerFn(toggleWebhookEndpoint);
  const deleteFn = useServerFn(deleteWebhookEndpoint);
  const retryFn = useServerFn(retryWebhookDelivery);
  const updateRetryFn = useServerFn(updateWebhookRetryConfig);
  const rotateFn = useServerFn(rotateWebhookSecret);

  const load = async () => {
    setLoading(true);
    const [ep, del] = await Promise.all([
      supabase
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("webhook_deliveries")
        .select(
          "id,endpoint_id,event_type,status_code,success,delivered_at,error,attempt,max_attempts,payload,payload_preview,response_body,duration_ms,next_retry_at",
        )
        .order("delivered_at", { ascending: false })
        .limit(100),
    ]);
    setEndpoints((ep.data ?? []) as Endpoint[]);
    setDeliveries((del.data ?? []) as Delivery[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const endpointById = useMemo(() => {
    const m = new Map<string, Endpoint>();
    for (const e of endpoints) m.set(e.id, e);
    return m;
  }, [endpoints]);

  const handleCreate = async () => {
    if (!url.trim() || creating) return;
    setCreating(true);
    try {
      const res = await createFn({
        data: { url: url.trim(), description: description.trim(), events },
      });
      const created = res?.endpoint as { url?: string } | undefined;
      const plaintext = (res as { plaintextSecret?: string })?.plaintextSecret;
      setUrl("");
      setDescription("");
      setEvents([]);
      setShowCreate(false);
      await load();
      if (plaintext) {
        setRevealedSecret({ secret: plaintext, url: created?.url ?? "", rotated: false });
      }
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

  const handleRotate = async (ep: Endpoint) => {
    const ok = confirm(
      `Rotate signing secret for ${ep.url}?\n\nThe old secret stops working immediately. Update your verification code with the new secret before the next webhook fires.`,
    );
    if (!ok) return;
    try {
      const res = await rotateFn({ data: { id: ep.id } });
      const plaintext = (res as { plaintextSecret?: string })?.plaintextSecret;
      await load();
      if (plaintext) {
        setRevealedSecret({ secret: plaintext, url: ep.url, rotated: true });
      }
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleRetry = async (delivery: Delivery) => {
    setRetrying(true);
    setRetryResult(null);
    try {
      const res = await retryFn({ data: { deliveryId: delivery.id } });
      setRetryResult(res.ok ? `Delivered (HTTP ${res.statusCode ?? "?"})` : `Failed: ${res.error ?? "error"}`);
      await load();
      // Update selected in drawer with fresh delivery row.
      const { data: fresh } = await supabase
        .from("webhook_deliveries")
        .select(
          "id,endpoint_id,event_type,status_code,success,delivered_at,error,attempt,max_attempts,payload,payload_preview,response_body,duration_ms,next_retry_at",
        )
        .eq("id", delivery.id)
        .maybeSingle();
      if (fresh) setSelectedDelivery(fresh as Delivery);
    } catch (e) {
      setRetryResult(`Error: ${(e as Error).message}`);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <DashboardLayout
      title="Webhooks"
      subtitle="Receive real-time events from PrizeSkout — price changes, competitor scrapes, and ready recommendations."
      helpItems={[
        "Register an HTTPS endpoint and subscribe to the events you care about.",
        "Verify every delivery using the signing secret before trusting the payload.",
        "Failed deliveries retry with exponential backoff — configure attempts per endpoint.",
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
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
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
                    <div style={{ fontSize: 11, color: "#8A8A8A", display: "flex", flexWrap: "wrap", gap: 12 }}>
                      <span>
                        Signing secret:{" "}
                        <code style={{ fontFamily: "ui-monospace, monospace" }}>
                          whsec_••••{ep.signing_secret.slice(-4)}
                        </code>
                      </span>
                      {ep.secret_last_rotated_at && (
                        <span>Rotated {new Date(ep.secret_last_rotated_at).toLocaleDateString()}</span>
                      )}
                      <span>
                        Retry: up to {ep.max_attempts} attempts, {ep.backoff_seconds}s base backoff
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setTesterEndpoint(ep)}
                      title="Signature tester"
                      style={iconBtn("#3B82F6")}
                    >
                      <ShieldCheck size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigEndpoint(ep)}
                      title="Retry settings"
                      style={iconBtn("#6B6B6B")}
                    >
                      <Settings2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotate(ep)}
                      title="Rotate signing secret"
                      style={iconBtn("#7C3AED")}
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(ep.id, ep.enabled)}
                      title={ep.enabled ? "Disable" : "Enable"}
                      style={iconBtn(ep.enabled ? "#22C55E" : "#9A9A9A")}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ep.id)}
                      title="Delete"
                      style={iconBtn("#DC2626")}
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
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
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
              <button
                type="button"
                key={d.id}
                onClick={() => {
                  setRetryResult(null);
                  setSelectedDelivery(d);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 70px 80px 70px",
                  alignItems: "center",
                  padding: "10px 16px",
                  fontSize: 12.5,
                  borderBottom: "1px solid #F1EDE4",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  borderBottomColor: "#F1EDE4",
                  backgroundColor: selectedDelivery?.id === d.id ? "#FFF7ED" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                  {new Date(d.delivered_at).toLocaleString()}
                </span>
                <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{d.event_type}</code>
                <span style={{ fontSize: 11, fontWeight: 600, color: d.success ? "#166534" : "#DC2626" }}>
                  {d.status_code ?? "—"}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: d.success ? "#166534" : "#DC2626" }}>
                  {d.success ? "Delivered" : "Failed"}
                </span>
                <span style={{ fontSize: 11, color: "#6B6B6B" }}>
                  #{d.attempt}
                  {d.max_attempts ? `/${d.max_attempts}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Delivery detail drawer */}
      {selectedDelivery && (
        <Drawer title="Delivery detail" onClose={() => setSelectedDelivery(null)}>
          <DetailRow label="Event" value={selectedDelivery.event_type} mono />
          <DetailRow label="Delivered" value={new Date(selectedDelivery.delivered_at).toLocaleString()} />
          <DetailRow
            label="Status"
            value={`${selectedDelivery.status_code ?? "—"} ${selectedDelivery.success ? "OK" : "Failed"}`}
            color={selectedDelivery.success ? "#166534" : "#DC2626"}
            mono
          />
          <DetailRow
            label="Attempt"
            value={`${selectedDelivery.attempt}${selectedDelivery.max_attempts ? ` / ${selectedDelivery.max_attempts}` : ""}`}
            mono
          />
          <DetailRow
            label="Duration"
            value={selectedDelivery.duration_ms != null ? `${selectedDelivery.duration_ms} ms` : "—"}
          />
          {selectedDelivery.next_retry_at && (
            <DetailRow
              label="Next auto retry"
              value={new Date(selectedDelivery.next_retry_at).toLocaleString()}
            />
          )}

          <div style={{ marginTop: 14 }}>
            <SectionLabel>Payload</SectionLabel>
            <CodeBlock
              content={formatJson(selectedDelivery.payload) || selectedDelivery.payload_preview || "—"}
            />
          </div>

          {selectedDelivery.response_body && (
            <div style={{ marginTop: 14 }}>
              <SectionLabel>Response body</SectionLabel>
              <CodeBlock content={selectedDelivery.response_body} />
            </div>
          )}

          {selectedDelivery.error && (
            <div style={{ marginTop: 14 }}>
              <SectionLabel>Error</SectionLabel>
              <pre style={errorBoxStyle}>{selectedDelivery.error}</pre>
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => handleRetry(selectedDelivery)}
              disabled={retrying}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                backgroundColor: "#EA580C",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: retrying ? "wait" : "pointer",
                opacity: retrying ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} className={retrying ? "spin" : ""} />
              {retrying ? "Retrying…" : "Retry delivery"}
            </button>
            {retryResult && (
              <span style={{ fontSize: 12, color: "#6B6B6B" }}>{retryResult}</span>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#8A8A8A" }}>
            Manual retry runs immediately and counts as attempt{" "}
            #{selectedDelivery.attempt + 1}. Automatic retries use exponential backoff on the
            endpoint's base delay.
          </div>
        </Drawer>
      )}

      {/* Retry config drawer */}
      {configEndpoint && (
        <RetryConfigDrawer
          endpoint={configEndpoint}
          onClose={() => setConfigEndpoint(null)}
          onSave={async (maxAttempts, backoffSeconds) => {
            await updateRetryFn({ data: { id: configEndpoint.id, maxAttempts, backoffSeconds } });
            setConfigEndpoint(null);
            await load();
          }}
        />
      )}

      {/* Signature tester drawer */}
      {testerEndpoint && (
        <SignatureTesterDrawer endpoint={testerEndpoint} onClose={() => setTesterEndpoint(null)} />
      )}

      {/* Copy-once secret reveal */}
      {revealedSecret && (
        <SecretRevealDialog
          secret={revealedSecret.secret}
          url={revealedSecret.url}
          rotated={revealedSecret.rotated}
          onClose={() => setRevealedSecret(null)}
        />
      )}

      <style>{`.spin { animation: spin 0.9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

// ---------- Copy-once secret reveal ----------

function SecretRevealDialog({
  secret,
  url,
  rotated,
  onClose,
}: {
  secret: string;
  url: string;
  rotated: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,18,25,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "#fff",
          border: "1px solid #E5E2DB",
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 24px 60px rgba(15,18,25,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={18} color="#EA580C" />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A18" }}>
            {rotated ? "New signing secret" : "Save your signing secret"}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "#6B6B6B", lineHeight: 1.55, marginBottom: 14 }}>
          {rotated ? (
            <>
              The previous secret stops working immediately. Update your verification code with this
              new value before the next webhook fires.
            </>
          ) : (
            <>
              This is the only time we will show this secret in full. Copy it now and store it
              somewhere safe — you will only see a masked version afterwards.
            </>
          )}
          {url && (
            <>
              {" "}
              Endpoint:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace", color: "#1A1A18" }}>{url}</code>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            backgroundColor: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: 8,
            marginBottom: 14,
          }}
        >
          <code
            style={{
              flex: 1,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12.5,
              color: "#1A1A18",
              wordBreak: "break-all",
            }}
          >
            {show ? secret : `whsec_${"•".repeat(Math.max(8, secret.length - 10))}${secret.slice(-4)}`}
          </code>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            title={show ? "Hide" : "Reveal"}
            style={iconBtn("#6B6B6B")}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={copy}
            title="Copy to clipboard"
            style={iconBtn(copied ? "#22C55E" : "#EA580C")}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#1A1A18", marginBottom: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I have copied the secret and stored it securely.
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={!confirmed}
            style={{
              padding: "9px 16px",
              backgroundColor: confirmed ? "#EA580C" : "#E5E2DB",
              color: confirmed ? "#fff" : "#9A9A9A",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: confirmed ? "pointer" : "not-allowed",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Retry config drawer ----------

function RetryConfigDrawer({
  endpoint,
  onClose,
  onSave,
}: {
  endpoint: Endpoint;
  onClose: () => void;
  onSave: (maxAttempts: number, backoffSeconds: number) => Promise<void>;
}) {
  const [maxAttempts, setMaxAttempts] = useState<number>(endpoint.max_attempts);
  const [backoff, setBackoff] = useState<number>(endpoint.backoff_seconds);
  const [saving, setSaving] = useState(false);

  const schedule = useMemo(() => {
    const out: string[] = [];
    for (let i = 1; i < Math.min(maxAttempts, 6); i++) {
      const delay = backoff * Math.pow(2, i - 1);
      out.push(`Retry ${i}: +${formatDuration(delay)}`);
    }
    if (maxAttempts > 6) out.push(`…up to ${maxAttempts} attempts`);
    return out;
  }, [maxAttempts, backoff]);

  return (
    <Drawer title="Retry configuration" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "#6B6B6B", marginBottom: 14 }}>
        Control how aggressively we retry failed deliveries to{" "}
        <code style={{ fontFamily: "ui-monospace, monospace" }}>{endpoint.url}</code>.
      </div>

      <label style={{ fontSize: 12, color: "#6B6B6B", display: "block", marginBottom: 12 }}>
        Max attempts (including the first)
        <input
          type="number"
          min={1}
          max={10}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          style={inputStyle}
        />
      </label>

      <label style={{ fontSize: 12, color: "#6B6B6B", display: "block", marginBottom: 12 }}>
        Base backoff (seconds)
        <input
          type="number"
          min={5}
          max={3600}
          value={backoff}
          onChange={(e) => setBackoff(Math.max(5, Math.min(3600, Number(e.target.value) || 5)))}
          style={inputStyle}
        />
        <span style={{ fontSize: 11, color: "#8A8A8A" }}>
          Doubles each attempt (exponential backoff). 5–3600 seconds.
        </span>
      </label>

      <div style={{ marginTop: 8, padding: 12, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
          Retry schedule preview
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 12.5 }}>
          {schedule.length === 0 ? (
            <li>No retries — one attempt only.</li>
          ) : (
            schedule.map((s) => <li key={s}>{s}</li>)
          )}
        </ul>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(maxAttempts, backoff);
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          style={{
            padding: "9px 16px",
            backgroundColor: "#EA580C",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "9px 16px",
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
    </Drawer>
  );
}

// ---------- Signature tester drawer ----------

function SignatureTesterDrawer({ endpoint, onClose }: { endpoint: Endpoint; onClose: () => void }) {
  const testFn = useServerFn(testWebhookSignature);
  const [payload, setPayload] = useState<string>(
    JSON.stringify({ event: "test.ping", ts: Math.floor(Date.now() / 1000) }, null, 2),
  );
  const [providedSignature, setProvidedSignature] = useState<string>("");
  const [result, setResult] = useState<{
    body: string;
    expectedSignature: string;
    expectedHex: string;
    timestamp: number;
    userMatch: boolean | null;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const run = async () => {
    setRunning(true);
    try {
      const res = await testFn({
        data: {
          endpointId: endpoint.id,
          payload,
          signature: providedSignature.trim() || undefined,
        },
      });
      setResult({
        body: res.body,
        expectedSignature: res.expectedSignature,
        expectedHex: res.expectedHex,
        timestamp: res.timestamp,
        userMatch: res.userMatch,
      });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Drawer title="Signature tester" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "#6B6B6B", marginBottom: 14 }}>
        Compute the HMAC-SHA256 signature this endpoint would receive for a given payload, and
        verify that a signature produced by your server matches.
      </div>

      <SectionLabel>Signing secret</SectionLabel>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <code style={{ flex: 1, fontSize: 12, fontFamily: "ui-monospace, monospace", padding: "8px 10px", backgroundColor: "#FAFAF9", border: "1px solid #E5E2DB", borderRadius: 6, wordBreak: "break-all" }}>
          {revealSecret
            ? endpoint.signing_secret
            : `${endpoint.signing_secret.slice(0, 10)}${"•".repeat(12)}${endpoint.signing_secret.slice(-4)}`}
        </code>
        <button type="button" onClick={() => setRevealSecret((v) => !v)} style={iconBtn("#6B6B6B")}>
          {revealSecret ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button type="button" onClick={() => copy(endpoint.signing_secret)} style={iconBtn("#6B6B6B")}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <SectionLabel>Payload (JSON)</SectionLabel>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={6}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <SectionLabel>Signature to verify (optional)</SectionLabel>
        <input
          type="text"
          value={providedSignature}
          onChange={(e) => setProvidedSignature(e.target.value)}
          placeholder="Paste t=…,v1=… or raw hex from your server"
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
          }}
        />
        <div style={{ fontSize: 11, color: "#8A8A8A", marginTop: 4 }}>
          Leave blank to just compute the expected signature.
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={run}
          disabled={running}
          style={{
            padding: "9px 16px",
            backgroundColor: "#EA580C",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: running ? "wait" : "pointer",
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? "Computing…" : "Compute signature"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 18 }}>
          {result.userMatch !== null && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${result.userMatch ? "#BBF7D0" : "#FECACA"}`,
                backgroundColor: result.userMatch ? "#F0FDF4" : "#FEF2F2",
                color: result.userMatch ? "#166534" : "#991B1B",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ShieldCheck size={16} />
              {result.userMatch ? "Signatures match" : "Signatures do NOT match"}
            </div>
          )}
          <DetailRow label="Timestamp" value={String(result.timestamp)} mono />
          <SectionLabel>Expected signature header</SectionLabel>
          <CodeBlock content={result.expectedSignature} />
          <SectionLabel>Expected HMAC hex</SectionLabel>
          <CodeBlock content={result.expectedHex} />
          <SectionLabel>Signed payload string</SectionLabel>
          <CodeBlock content={`${result.timestamp}.${result.body}`} />
        </div>
      )}
    </Drawer>
  );
}

// ---------- primitives ----------

function Drawer({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(17,24,39,0.4)" }} />
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 100%)",
          backgroundColor: "#fff",
          boxShadow: "-12px 0 30px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E2DB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B6B6B" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
      </aside>
    </div>
  );
}

function DetailRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #F1EDE4" }}>
      <span style={{ fontSize: 12, color: "#8A8A8A" }}>{label}</span>
      <span
        style={{
          fontSize: 12.5,
          color: color ?? "#1A1A18",
          fontFamily: mono ? "ui-monospace, monospace" : undefined,
          fontWeight: mono ? 600 : 400,
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 4 }}>
      {children}
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 10,
        backgroundColor: "#FAFAF9",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "ui-monospace, monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        color: "#1A1A18",
        maxHeight: 260,
        overflow: "auto",
      }}
    >
      {content}
    </pre>
  );
}

const errorBoxStyle: React.CSSProperties = {
  margin: 0,
  padding: 10,
  backgroundColor: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
  whiteSpace: "pre-wrap",
  color: "#991B1B",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  border: "1px solid #E5E2DB",
  borderRadius: 6,
  fontSize: 13,
};

function iconBtn(color: string): React.CSSProperties {
  return {
    padding: 8,
    background: "transparent",
    border: "1px solid #E5E2DB",
    borderRadius: 6,
    cursor: "pointer",
    color,
  };
}

function formatJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
