import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Edit2, Check, X, Star } from "lucide-react";
import {
  getConsoleOverview,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/server/licensee-console.functions";

export const Route = createFileRoute("/dashboard/console/tenants")({
  head: () => ({ meta: [{ title: "Tenants | Console | PrizeSkout" }] }),
  component: TenantsPage,
});

type Account = {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  currency: string;
  is_default: boolean;
  created_at: string;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  region: string;
  currency: string;
  isDefault: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  region: "",
  currency: "QAR",
  isDefault: false,
};

function TenantsPage() {
  const fetchOverview = useServerFn(getConsoleOverview);
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const remove = useServerFn(deleteAccount);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [callerRole, setCallerRole] = useState<string>("viewer");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await (fetchOverview as any)();
      setAccounts(res.accounts as Account[]);
      setCallerRole(res.callerRole);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canEdit = callerRole === "admin" || callerRole === "owner";

  const startCreate = () => setForm({ ...EMPTY_FORM });
  const startEdit = (a: Account) =>
    setForm({
      id: a.id,
      name: a.name,
      slug: a.slug,
      region: a.region ?? "",
      currency: a.currency,
      isDefault: a.is_default,
    });

  const handleSave = async () => {
    if (!form || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        region: form.region.trim() || null,
        currency: form.currency,
        isDefault: form.isDefault,
      };
      if (form.id) await update({ data: { id: form.id, ...payload } });
      else await create({ data: payload });
      setForm(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (a: Account) => {
    if (!confirm(`Delete tenant "${a.name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await remove({ data: { id: a.id } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div style={{ color: "#6B6B6B", fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div
          style={{
            padding: 12,
            border: "1px solid #FCA5A5",
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "#6B6B6B" }}>
          {accounts.length} tenant{accounts.length === 1 ? "" : "s"} ·{" "}
          {accounts.filter((a) => a.is_default).length} default
        </div>
        {canEdit && !form && (
          <button
            type="button"
            onClick={startCreate}
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
            <Plus size={14} /> New tenant
          </button>
        )}
      </div>

      {form && (
        <div
          style={{
            border: "1px solid #FED7AA",
            backgroundColor: "#FFF7ED",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18", marginBottom: 12 }}>
            {form.id ? "Edit tenant" : "New tenant"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <Field label="Name *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Talabat Qatar"
                style={inputStyle}
              />
            </Field>
            <Field label="Slug *">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="talabat-qa"
                style={{ ...inputStyle, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
              />
            </Field>
            <Field label="Region">
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="QA"
                style={inputStyle}
              />
            </Field>
            <Field label="Currency">
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                placeholder="QAR"
                style={inputStyle}
              />
            </Field>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              fontSize: 13,
              color: "#1A1A18",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Make this the default tenant for new API keys
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !form.name.trim() || !form.slug.trim()}
              style={primaryBtn(busy || !form.name.trim() || !form.slug.trim())}
            >
              <Check size={14} /> {busy ? "Saving…" : form.id ? "Save changes" : "Create tenant"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              style={secondaryBtn}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          border: "1px solid #E5E2DB",
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        {accounts.length === 0 ? (
          <div style={{ padding: 24, color: "#6B6B6B", fontSize: 13 }}>
            No tenants yet. Click "New tenant" to add one.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAFAF9" }}>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Region</Th>
                <Th>Currency</Th>
                <Th>Default</Th>
                <Th>Created</Th>
                {canEdit && <Th>{""}</Th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #F1EFE9" }}>
                  <td style={{ padding: "12px 14px", color: "#1A1A18", fontWeight: 600 }}>
                    {a.name}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 12.5,
                      color: "#6B6B6B",
                    }}
                  >
                    {a.slug}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#1A1A18" }}>
                    {a.region ?? "—"}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#1A1A18" }}>{a.currency}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {a.is_default ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 999,
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        <Star size={11} /> Default
                      </span>
                    ) : (
                      <span style={{ color: "#9A9A9A", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#6B6B6B", fontSize: 12 }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  {canEdit && (
                    <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        style={iconBtn}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        style={{ ...iconBtn, color: "#B91C1C", marginLeft: 4 }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!canEdit && (
        <div
          style={{
            padding: 12,
            border: "1px solid #E5E2DB",
            backgroundColor: "#FAFAF9",
            color: "#6B6B6B",
            borderRadius: 10,
            fontSize: 12.5,
          }}
        >
          Read-only view. Ask a licensee admin or owner to make changes.
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  border: "1px solid #E5E2DB",
  borderRadius: 6,
  fontSize: 13,
  backgroundColor: "#fff",
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  backgroundColor: "#EA580C",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  backgroundColor: "transparent",
  border: "1px solid #E5E2DB",
  borderRadius: 8,
  fontSize: 13,
  color: "#6B6B6B",
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid #E5E2DB",
  backgroundColor: "#fff",
  color: "#6B6B6B",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 600, color: "#6B6B6B" }}>
      {label}
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "#6B6B6B",
      }}
    >
      {children}
    </th>
  );
}
