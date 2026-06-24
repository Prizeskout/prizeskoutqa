import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Copy, Check, Trash2, Ban, Plus, Eye, EyeOff, AlertTriangle, ShieldCheck, Clock, ShieldAlert, Lock } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import {
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  requestLiveAccess,
} from "@/server/developer-console.functions";

export const Route = createFileRoute("/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys | PrizeSkout" }] }),
  component: ApiKeysPage,
});

type ApiKeyRow = {
  id: string;
  name: string;
  mode: "test" | "live";
  key_prefix: string;
  last_four: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function ApiKeysPage() {
  const { data: account, refetch: refetchAccount } = useAccount();
  const liveStatus = account?.live_status ?? "none";
  const liveApproved = liveStatus === "approved";

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"test" | "live">("test");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [newKeyMeta, setNewKeyMeta] = useState<{ name: string; mode: "test" | "live" } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [ackStored, setAckStored] = useState(false);

  // Live-access request
  const [showRequest, setShowRequest] = useState(false);
  const [reqCompany, setReqCompany] = useState("");
  const [reqDomain, setReqDomain] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqVolume, setReqVolume] = useState("");
  const [reqUseCase, setReqUseCase] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const createFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);
  const deleteFn = useServerFn(deleteApiKey);
  const requestFn = useServerFn(requestLiveAccess);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id,name,mode,key_prefix,last_four,created_at,last_used_at,revoked_at")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
    } else {
      setKeys((data ?? []) as ApiKeyRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const currentName = name.trim();
      const currentMode = mode;
      const res = await createFn({ data: { name: currentName, mode: currentMode } });
      setShowCreate(false);
      setName("");
      setNewSecret(res.secret);
      setNewKeyMeta({ name: currentName, mode: currentMode });
      setRevealed(false);
      setAckStored(false);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? Existing integrations using it will stop working immediately.")) return;
    await revokeFn({ data: { id } });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this key permanently?")) return;
    await deleteFn({ data: { id } });
    await load();
  };

  const copySecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
    } catch {
      // Fallback for environments without clipboard permission.
      const ta = document.createElement("textarea");
      ta.value = newSecret;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const dismissSecret = () => {
    setNewSecret(null);
    setNewKeyMeta(null);
    setRevealed(false);
    setAckStored(false);
    setCopied(false);
    setShowCreate(false);
    void load();
  };

  const handleSubmitLiveRequest = async () => {
    if (submittingRequest) return;
    if (!reqCompany.trim() || !reqEmail.trim() || !reqUseCase.trim()) {
      alert("Company name, billing email, and use case are required.");
      return;
    }
    setSubmittingRequest(true);
    try {
      await requestFn({
        data: {
          companyName: reqCompany.trim(),
          companyDomain: reqDomain.trim(),
          billingEmail: reqEmail.trim(),
          expectedVolume: reqVolume.trim(),
          useCase: reqUseCase.trim(),
        },
      });
      setShowRequest(false);
      await refetchAccount();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const maskedSecret = newSecret
    ? `${newSecret.slice(0, 12)}${"•".repeat(Math.max(0, newSecret.length - 16))}${newSecret.slice(-4)}`
    : "";

  return (
    <DashboardLayout
      title="API Keys"
      subtitle="Create and manage keys for calling PrizeSkout APIs. Test keys work in sandbox; live keys require approval."
      helpItems={[
        "Use test keys (sk_test_…) while you integrate. They return simulated data and never hit live pricing engines.",
        "Keys are shown once at creation. Store them in your secret manager before leaving this page.",
        "Revoke a key the moment it leaks. Revoked keys stop working instantly.",
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
          <Plus size={14} /> Create key
        </button>
      }
    >
      <LiveAccessBanner
        status={liveStatus}
        decisionNote={account?.decision_note ?? null}
        onRequest={() => {
          setReqEmail(account?.billing_email ?? "");
          setReqCompany(account?.company_name ?? "");
          setReqDomain(account?.company_domain ?? "");
          setReqVolume(account?.expected_volume ?? "");
          setReqUseCase(account?.use_case ?? "");
          setShowRequest(true);
        }}
      />

      {showRequest && (
        <RequestLiveAccessModal
          company={reqCompany}
          domain={reqDomain}
          email={reqEmail}
          volume={reqVolume}
          useCase={reqUseCase}
          submitting={submittingRequest}
          onChange={(field, value) => {
            if (field === "company") setReqCompany(value);
            else if (field === "domain") setReqDomain(value);
            else if (field === "email") setReqEmail(value);
            else if (field === "volume") setReqVolume(value);
            else if (field === "useCase") setReqUseCase(value);
          }}
          onCancel={() => setShowRequest(false)}
          onSubmit={handleSubmitLiveRequest}
        />
      )}

      {newSecret && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17, 24, 39, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              backgroundColor: "#fff",
              borderRadius: 14,
              border: "1px solid #E5E2DB",
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "18px 20px 6px", borderBottom: "1px solid #FDE68A", backgroundColor: "#FFFBEB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <AlertTriangle size={16} color="#B45309" />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
                  Save this secret now. It will never be shown again.
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "#78350F" }}>
                {newKeyMeta ? (
                  <>
                    Key <strong>{newKeyMeta.name}</strong> ({newKeyMeta.mode} mode) was created. Copy
                    the secret into your secret manager (1Password, AWS Secrets Manager, etc.) before
                    closing this dialog. PrizeSkout only stores a one-way hash and cannot recover it.
                  </>
                ) : null}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Secret key
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code
                  style={{
                    flex: 1,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 12.5,
                    backgroundColor: "#FAFAF9",
                    border: "1px solid #E5E2DB",
                    borderRadius: 8,
                    padding: "10px 12px",
                    overflow: "auto",
                    whiteSpace: "nowrap",
                    color: revealed ? "#1A1A18" : "#6B6B6B",
                    letterSpacing: revealed ? 0 : "0.02em",
                  }}
                >
                  {revealed ? newSecret : maskedSecret}
                </code>
                <button
                  type="button"
                  onClick={() => setRevealed((v) => !v)}
                  title={revealed ? "Hide" : "Reveal"}
                  aria-pressed={revealed}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 12px",
                    backgroundColor: "#fff",
                    border: "1px solid #E5E2DB",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#6B6B6B",
                  }}
                >
                  {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  {revealed ? "Hide" : "Reveal"}
                </button>
                <button
                  type="button"
                  onClick={copySecret}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 14px",
                    backgroundColor: "#EA580C",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy secret"}
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: "#8A8A8A", marginTop: 8 }}>
                Treat this like a password. Anyone with it can call the PrizeSkout API as you.
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginTop: 18,
                  fontSize: 13,
                  color: "#1A1A18",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={ackStored}
                  onChange={(e) => setAckStored(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  I've copied this secret and stored it somewhere safe. I understand it will not be
                  shown again.
                </span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={dismissSecret}
                  disabled={!ackStored}
                  style={{
                    padding: "9px 16px",
                    backgroundColor: ackStored ? "#1A1A18" : "#E5E2DB",
                    color: ackStored ? "#fff" : "#9A9A9A",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: ackStored ? "pointer" : "not-allowed",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && !newSecret && (
        <div
          style={{
            border: "1px solid #E5E2DB",
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>New API key</div>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#6B6B6B" }}>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production server"
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
            <div style={{ display: "flex", gap: 8 }}>
              {(["test", "live"] as const).map((m) => {
                const disabled = m === "live" && !liveApproved;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => !disabled && setMode(m)}
                    disabled={disabled}
                    title={
                      disabled
                        ? "Live keys are locked until your live access request is approved."
                        : undefined
                    }
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${mode === m && !disabled ? "#EA580C" : "#E5E2DB"}`,
                      backgroundColor: disabled
                        ? "#F5F5F4"
                        : mode === m
                          ? "#FFF7ED"
                          : "#fff",
                      color: disabled ? "#A8A29E" : mode === m ? "#EA580C" : "#6B6B6B",
                      cursor: disabled ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {disabled && <Lock size={11} />}
                    {m === "test" ? "Test mode" : "Live mode"}
                  </button>
                );
              })}
            </div>
            {mode === "live" && !liveApproved && (
              <div style={{ fontSize: 12, color: "#B45309" }}>
                Live keys require account approval. Submit a request from the banner above to unlock.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#EA580C",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: creating ? "wait" : "pointer",
                  opacity: creating || !name.trim() ? 0.6 : 1,
                }}
              >
                {creating ? "Creating…" : "Create key"}
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

      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #E5E2DB",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.7fr 1.2fr 1fr 1fr 80px",
            padding: "10px 16px",
            fontSize: 11,
            fontWeight: 600,
            color: "#9A9A9A",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            borderBottom: "1px solid #E5E2DB",
            backgroundColor: "#FAFAF9",
          }}
        >
          <span>Name</span>
          <span>Mode</span>
          <span>Key</span>
          <span>Created</span>
          <span>Last used</span>
          <span></span>
        </div>
        {loading ? (
          <div style={{ padding: 24, fontSize: 13, color: "#8A8A8A" }}>Loading…</div>
        ) : loadError ? (
          <div style={{ padding: 24, fontSize: 13, color: "#DC2626" }}>
            Could not load keys: {loadError}{" "}
            <button
              type="button"
              onClick={load}
              style={{ marginLeft: 8, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 13 }}
            >
              Retry
            </button>
          </div>
        ) : keys.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <KeyRound size={24} color="#9A9A9A" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, color: "#6B6B6B", marginBottom: 12 }}>
              No API keys yet. Create one to start calling the PrizeSkout API.
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              style={{
                padding: "8px 14px",
                backgroundColor: "#EA580C",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Create your first key
            </button>
          </div>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.7fr 1.2fr 1fr 1fr 80px",
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 13,
                color: "#1A1A18",
                borderBottom: "1px solid #F1EDE4",
              }}
            >
              <span style={{ fontWeight: 600 }}>{k.name}</span>
              <span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: k.mode === "live" ? "#DCFCE7" : "#FEF3C7",
                    color: k.mode === "live" ? "#166534" : "#92400E",
                  }}
                >
                  {k.mode}
                </span>
              </span>
              <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#6B6B6B" }}>
                {k.key_prefix}_…{k.last_four}
              </code>
              <span style={{ color: "#6B6B6B", fontSize: 12 }}>
                {new Date(k.created_at).toLocaleDateString()}
              </span>
              <span style={{ color: "#6B6B6B", fontSize: 12 }}>
                {k.revoked_at
                  ? "Revoked"
                  : k.last_used_at
                    ? new Date(k.last_used_at).toLocaleDateString()
                    : "Never"}
              </span>
              <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {!k.revoked_at && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(k.id)}
                    title="Revoke"
                    style={{
                      padding: 6,
                      background: "transparent",
                      border: "1px solid #E5E2DB",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "#6B6B6B",
                    }}
                  >
                    <Ban size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(k.id)}
                  title="Delete"
                  style={{
                    padding: 6,
                    background: "transparent",
                    border: "1px solid #E5E2DB",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#DC2626",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

type LiveStatus = "none" | "pending" | "approved" | "rejected";

function LiveAccessBanner({
  status,
  decisionNote,
  onRequest,
}: {
  status: LiveStatus;
  decisionNote: string | null;
  onRequest: () => void;
}) {
  const config: Record<
    LiveStatus,
    { bg: string; border: string; fg: string; icon: typeof ShieldCheck; title: string; body: string; cta: string | null }
  > = {
    none: {
      bg: "#FFFBEB",
      border: "#FDE68A",
      fg: "#92400E",
      icon: ShieldAlert,
      title: "Live API access not yet requested",
      body: "Test keys (sk_test_…) work right away. To call live data, submit a short request and our team will approve your account.",
      cta: "Request live access",
    },
    pending: {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      fg: "#1E40AF",
      icon: Clock,
      title: "Live access request pending review",
      body: "Your request was submitted. We typically respond within one business day. You can keep building with test keys in the meantime.",
      cta: "Update request",
    },
    approved: {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      fg: "#065F46",
      icon: ShieldCheck,
      title: "Live API access approved",
      body: "You can now create live keys (sk_live_…). They will hit production data and count toward usage billing.",
      cta: null,
    },
    rejected: {
      bg: "#FEF2F2",
      border: "#FECACA",
      fg: "#991B1B",
      icon: ShieldAlert,
      title: "Live access request was rejected",
      body: decisionNote
        ? `Reviewer note: ${decisionNote}`
        : "Reach out to support@prizeskout.com or submit a new request with more detail.",
      cta: "Submit a new request",
    },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <Icon size={18} color={c.fg} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.fg, marginBottom: 2 }}>{c.title}</div>
        <div style={{ fontSize: 12.5, color: c.fg, opacity: 0.92 }}>{c.body}</div>
      </div>
      {c.cta && (
        <button
          type="button"
          onClick={onRequest}
          style={{
            padding: "7px 12px",
            backgroundColor: "#1A1A18",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {c.cta}
        </button>
      )}
    </div>
  );
}

type RequestField = "company" | "domain" | "email" | "volume" | "useCase";

function RequestLiveAccessModal({
  company,
  domain,
  email,
  volume,
  useCase,
  submitting,
  onChange,
  onCancel,
  onSubmit,
}: {
  company: string;
  domain: string;
  email: string;
  volume: string;
  useCase: string;
  submitting: boolean;
  onChange: (field: RequestField, value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 4,
    padding: "8px 10px",
    border: "1px solid #E5E2DB",
    borderRadius: 6,
    fontSize: 13,
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          backgroundColor: "#fff",
          borderRadius: 14,
          border: "1px solid #E5E2DB",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          padding: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Request live API access</div>
        <div style={{ fontSize: 12.5, color: "#6B6B6B", marginBottom: 16 }}>
          Tell us a bit about how you'll use PrizeSkout. We typically approve within one business day.
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 12, color: "#6B6B6B" }}>
            Company name *
            <input value={company} onChange={(e) => onChange("company", e.target.value)} style={inputStyle} />
          </label>
          <label style={{ fontSize: 12, color: "#6B6B6B" }}>
            Company domain
            <input
              value={domain}
              onChange={(e) => onChange("domain", e.target.value)}
              placeholder="acme.com"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 12, color: "#6B6B6B" }}>
            Billing email *
            <input
              type="email"
              value={email}
              onChange={(e) => onChange("email", e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 12, color: "#6B6B6B" }}>
            Expected monthly volume
            <input
              value={volume}
              onChange={(e) => onChange("volume", e.target.value)}
              placeholder="e.g. ~50k requests/mo"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 12, color: "#6B6B6B" }}>
            Use case *
            <textarea
              value={useCase}
              onChange={(e) => onChange("useCase", e.target.value)}
              rows={4}
              placeholder="Briefly describe what you're building and which endpoints you need."
              style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
            />
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onCancel}
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
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: "8px 14px",
              backgroundColor: "#EA580C",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

