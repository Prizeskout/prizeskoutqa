import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Copy, Check, Trash2, Ban, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  createApiKey,
  revokeApiKey,
  deleteApiKey,
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
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"test" | "live">("test");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [newKeyMeta, setNewKeyMeta] = useState<{ name: string; mode: "test" | "live" } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [ackStored, setAckStored] = useState(false);

  const createFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);
  const deleteFn = useServerFn(deleteApiKey);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("id,name,mode,key_prefix,last_four,created_at,last_used_at,revoked_at")
      .order("created_at", { ascending: false });
    setKeys((data ?? []) as ApiKeyRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await createFn({ data: { name: name.trim(), mode } });
      setNewSecret(res.secret);
      setName("");
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

  const copySecret = () => {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DashboardLayout
      title="API Keys"
      subtitle="Create and manage keys for calling PrizeSkout APIs. Test keys work in sandbox; live keys require approval."
      helpItems={[
        "Use test keys (sk_test_…) while you integrate. They return simulated data and never hit live pricing engines.",
        "Keys are shown once at creation — store them in your secret manager before leaving this page.",
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
      {newSecret && (
        <div
          style={{
            border: "1px solid #FBBF24",
            backgroundColor: "#FFFBEB",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E", marginBottom: 4 }}>
            Save this secret now
          </div>
          <div style={{ fontSize: 12, color: "#78350F", marginBottom: 10 }}>
            This is the only time you'll see the full key. Store it in your secret manager.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code
              style={{
                flex: 1,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 12.5,
                backgroundColor: "#fff",
                border: "1px solid #FDE68A",
                borderRadius: 6,
                padding: "8px 10px",
                overflow: "auto",
                whiteSpace: "nowrap",
              }}
            >
              {newSecret}
            </code>
            <button
              type="button"
              onClick={copySecret}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                backgroundColor: "#fff",
                border: "1px solid #FDE68A",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                color: "#92400E",
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setNewSecret(null)}
              style={{
                padding: "8px 12px",
                backgroundColor: "transparent",
                border: "1px solid #FDE68A",
                borderRadius: 6,
                fontSize: 12.5,
                cursor: "pointer",
                color: "#92400E",
              }}
            >
              Done
            </button>
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
              {(["test", "live"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${mode === m ? "#EA580C" : "#E5E2DB"}`,
                    backgroundColor: mode === m ? "#FFF7ED" : "#fff",
                    color: mode === m ? "#EA580C" : "#6B6B6B",
                    cursor: "pointer",
                  }}
                >
                  {m === "test" ? "Test mode" : "Live mode"}
                </button>
              ))}
            </div>
            {mode === "live" && (
              <div style={{ fontSize: 12, color: "#B45309" }}>
                Live keys require account approval. We'll create the key as pending until approved.
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
            color: "#8A8A8A",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
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
