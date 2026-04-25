import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, Trash2, Crown, Shield, Code, Eye } from "lucide-react";
import {
  getTeamMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/server/licensee-console.functions";

export const Route = createFileRoute("/dashboard/console/team")({
  head: () => ({ meta: [{ title: "Team | Console | PrizeSkout" }] }),
  component: TeamPage,
});

type Role = "owner" | "admin" | "developer" | "viewer";
type Member = {
  id: string;
  user_id: string;
  role: Role;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null };
};

const ROLE_META: Record<Role, { icon: typeof Crown; color: string; bg: string; desc: string }> = {
  owner: { icon: Crown, color: "#92400E", bg: "#FEF3C7", desc: "Full control. Cannot be removed by admins." },
  admin: { icon: Shield, color: "#1E40AF", bg: "#DBEAFE", desc: "Manage tenants, team, and keys." },
  developer: { icon: Code, color: "#166534", bg: "#DCFCE7", desc: "Read/write data, no team or billing changes." },
  viewer: { icon: Eye, color: "#52525B", bg: "#F4F4F5", desc: "Read-only." },
};

function TeamPage() {
  const fetchMembers = useServerFn(getTeamMembers);
  const invite = useServerFn(inviteMember);
  const setRole = useServerFn(updateMemberRole);
  const remove = useServerFn(removeMember);

  const [members, setMembers] = useState<Member[]>([]);
  const [callerRole, setCallerRole] = useState<Role>("viewer");
  const [callerId, setCallerId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("developer");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await (fetchMembers as any)()) as { members: Member[]; callerRole: Role; callerId: string };
      setMembers(res.members);
      setCallerRole(res.callerRole);
      setCallerId(res.callerId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canManage = callerRole === "admin" || callerRole === "owner";

  const handleInvite = async () => {
    if (!inviteEmail.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await invite({ data: { email: inviteEmail.trim(), role: inviteRole } });
      setInviteEmail("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSetRole = async (memberId: string, role: Role) => {
    setBusy(true);
    setError(null);
    try {
      await setRole({ data: { memberId, role } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (m: Member) => {
    if (!confirm(`Remove ${m.profile.display_name ?? "this member"} from the licensee?`)) return;
    setBusy(true);
    setError(null);
    try {
      await remove({ data: { memberId: m.id } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ color: "#6B6B6B", fontSize: 13 }}>Loading…</div>;

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

      {canManage && (
        <div
          style={{
            border: "1px solid #FED7AA",
            backgroundColor: "#FFF7ED",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>
            Invite a teammate
          </div>
          <div style={{ fontSize: 12, color: "#78350F", marginBottom: 12 }}>
            They must already have a PrizeSkout account. We'll add them to this licensee with the role you pick.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              style={{
                flex: "1 1 240px",
                padding: "8px 10px",
                border: "1px solid #E5E2DB",
                borderRadius: 8,
                fontSize: 13,
                backgroundColor: "#fff",
              }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              style={{
                padding: "8px 10px",
                border: "1px solid #E5E2DB",
                borderRadius: 8,
                fontSize: 13,
                backgroundColor: "#fff",
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={handleInvite}
              disabled={busy || !inviteEmail.trim()}
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
                fontWeight: 600,
                cursor: busy || !inviteEmail.trim() ? "not-allowed" : "pointer",
                opacity: busy || !inviteEmail.trim() ? 0.6 : 1,
              }}
            >
              <UserPlus size={14} /> {busy ? "Adding…" : "Add member"}
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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#FAFAF9" }}>
              <Th>Member</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              {canManage && <Th>{""}</Th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const meta = ROLE_META[m.role];
              const Icon = meta.icon;
              const isYou = m.user_id === callerId;
              const targetIsOwner = m.role === "owner";
              const canEditRow =
                canManage && !isYou && (callerRole === "owner" || !targetIsOwner);
              return (
                <tr key={m.id} style={{ borderTop: "1px solid #F1EFE9" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#1A1A18" }}>
                      {m.profile.display_name ?? "(unnamed)"}{" "}
                      {isYou && (
                        <span style={{ color: "#9A9A9A", fontWeight: 400, fontSize: 12 }}>(you)</span>
                      )}
                    </div>
                    <div
                      style={{
                        color: "#6B6B6B",
                        fontSize: 11.5,
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      }}
                    >
                      {m.user_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canEditRow ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleSetRole(m.id, e.target.value as Role)}
                        disabled={busy}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #E5E2DB",
                          borderRadius: 6,
                          fontSize: 12,
                          backgroundColor: "#fff",
                        }}
                      >
                        {callerRole === "owner" && <option value="owner">Owner</option>}
                        <option value="admin">Admin</option>
                        <option value="developer">Developer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        title={meta.desc}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 999,
                          backgroundColor: meta.bg,
                          color: meta.color,
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        <Icon size={11} /> {m.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#6B6B6B", fontSize: 12 }}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {!isYou && (callerRole === "owner" || !targetIsOwner) && (
                        <button
                          type="button"
                          onClick={() => handleRemove(m)}
                          disabled={busy}
                          title="Remove"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid #E5E2DB",
                            backgroundColor: "#fff",
                            color: "#B91C1C",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11.5, color: "#8A8A8A", lineHeight: 1.6 }}>
        <strong>Roles:</strong> Owner has full control (only owners can transfer ownership). Admin
        can manage tenants, team, and keys. Developer can read/write data but not change team or
        billing. Viewer is read-only.
      </div>
    </div>
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
