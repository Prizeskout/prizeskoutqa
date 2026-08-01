import { useEffect, useState } from "react";
import { Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Card,
  CardSubtitle,
  CardTitle,
  Field,
  FieldRow,
  IconAction,
  OutlineAddButton,
  PrimaryButton,
  SelectField,
  TextField,
} from "./primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────────────────────

type LicenseeRole = "owner" | "admin" | "developer" | "viewer";

type Member = {
  id: string;
  userId: string;
  role: LicenseeRole;
  displayName: string;
  email: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
};

// ── Role display ──────────────────────────────────────────────────────────────

function roleLabel(t: TFunction, role: LicenseeRole): string {
  return t(`settingsTabs.team.roles.${role}`);
}

const ROLE_STYLES: Record<LicenseeRole, { bg: string; color: string }> = {
  owner: { bg: "rgba(234, 88, 12, 0.08)", color: "#EA580C" },
  admin: { bg: "rgba(234, 88, 12, 0.08)", color: "#EA580C" },
  developer: { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
  viewer: { bg: "#F5F4F1", color: "#6B6B6B" },
};

function RoleBadge({ role }: { role: LicenseeRole }) {
  const { t } = useTranslation();
  const s = ROLE_STYLES[role];
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 12px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {roleLabel(t, role)}
    </span>
  );
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS: Record<LicenseeRole, string> = {
  owner: "#EA580C",
  admin: "#EA580C",
  developer: "#7C3AED",
  viewer: "#9A9A9A",
};

function timeAgo(iso: string, t: TFunction): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t("settingsTabs.team.justNow");
  if (diffMin < 60) return t("settingsTabs.team.minutesAgo", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("settingsTabs.team.hoursAgo", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t("settingsTabs.team.daysAgo", { count: diffDay });
}

// ── Invite modal ───────────────────────────────────────────────────────────────

const INVITE_ROLES = ["admin", "developer", "viewer"] as const;

function InviteModal({
  licenseeId,
  currentUserId,
  onClose,
  onInvited,
}: {
  licenseeId: string;
  currentUserId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("developer");
  const [saving, setSaving] = useState(false);

  const canSave = email.trim().includes("@");

  const inviteRoleLabels: Record<string, string> = {
    admin: roleLabel(t, "admin"),
    developer: roleLabel(t, "developer"),
    viewer: roleLabel(t, "viewer"),
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: foundUserId, error: rpcErr } = await supabase.rpc(
        "find_user_id_by_email",
        { _email: email.trim().toLowerCase() }
      );
      if (rpcErr) throw rpcErr;
      if (!foundUserId) {
        toast.error(t("settingsTabs.team.toasts.noAccount"));
        return;
      }
      const { error: insertErr } = await supabase.from("licensee_members").insert({
        licensee_id: licenseeId,
        user_id: foundUserId as string,
        role: role as LicenseeRole,
        invited_by: currentUserId,
        invited_at: new Date().toISOString(),
      });
      if (insertErr) {
        if (insertErr.message.includes("duplicate") || insertErr.code === "23505") {
          toast.error(t("settingsTabs.team.toasts.alreadyMember"));
        } else {
          throw insertErr;
        }
        return;
      }
      toast.success(t("settingsTabs.team.toasts.addedToTeam", { email: email.trim() }));
      onInvited();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.team.toasts.inviteFailed"));
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
          maxWidth: 440,
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.team.inviteModal.title")}</div>
          <button
            type="button"
            aria-label={t("settingsTabs.team.close")}
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>
            {t("settingsTabs.team.inviteModal.description")}
          </div>
          <FieldRow>
            <Field label={t("settingsTabs.team.inviteModal.email")}>
              <TextField
                value={email}
                onChange={setEmail}
                type="email"
                placeholder={t("settingsTabs.team.inviteModal.emailPlaceholder")}
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t("settingsTabs.team.inviteModal.role")}>
              <SelectField
                value={role}
                onChange={(value) => setRole(value as LicenseeRole)}
                options={INVITE_ROLES}
                labels={inviteRoleLabels}
              />
            </Field>
          </FieldRow>
          <div style={{ fontSize: 11, color: "#9A9A9A", lineHeight: 1.5 }}>
            <Trans i18nKey="settingsTabs.team.roleHelp.developer" components={{ b: <strong /> }} />
            {"  "}
            <Trans i18nKey="settingsTabs.team.roleHelp.admin" components={{ b: <strong /> }} />
            {"  "}
            <Trans i18nKey="settingsTabs.team.roleHelp.viewer" components={{ b: <strong /> }} />
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
              {t("settingsTabs.team.cancel")}
            </button>
            <div style={{ opacity: canSave ? 1 : 0.5, pointerEvents: canSave ? "auto" : "none" }}>
              <PrimaryButton onClick={handleSave}>
                {saving ? t("settingsTabs.team.inviteModal.adding") : t("settingsTabs.team.inviteModal.addToTeam")}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit role modal ────────────────────────────────────────────────────────────

const EDITABLE_ROLES = ["admin", "developer", "viewer"] as const;

function EditRoleModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member;
  onClose: () => void;
  onSaved: (updated: Member) => void;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<LicenseeRole>(member.role);
  const [saving, setSaving] = useState(false);

  const editableRoleLabels: Record<string, string> = {
    admin: roleLabel(t, "admin"),
    developer: roleLabel(t, "developer"),
    viewer: roleLabel(t, "viewer"),
  };

  const handleSave = async () => {
    if (role === member.role) { onClose(); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("licensee_members")
        .update({ role })
        .eq("id", member.id);
      if (error) throw error;
      toast.success(t("settingsTabs.team.toasts.roleUpdated", {
        name: member.displayName,
        role: roleLabel(t, role as LicenseeRole),
      }));
      onSaved({ ...member, role: role as LicenseeRole });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTabs.team.toasts.roleUpdateFailed"));
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
          maxWidth: 400,
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.team.editRoleModal.title")}</div>
          <button
            type="button"
            aria-label={t("settingsTabs.team.close")}
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
          >
            <X size={16} color="#6B6B6B" />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "#6B6B6B" }}>
            <Trans
              i18nKey="settingsTabs.team.editRoleModal.changingRoleFor"
              values={{ name: member.displayName }}
              components={{ b: <strong /> }}
            />
          </div>
          <FieldRow>
            <Field label={t("settingsTabs.team.editRoleModal.role")}>
              <SelectField
                value={role}
                onChange={(value) => setRole(value as LicenseeRole)}
                options={EDITABLE_ROLES}
                labels={editableRoleLabels}
              />
            </Field>
          </FieldRow>
          <div style={{ fontSize: 11, color: "#9A9A9A", lineHeight: 1.5 }}>
            <Trans i18nKey="settingsTabs.team.roleHelp.developer" components={{ b: <strong /> }} />
            {"  "}
            <Trans i18nKey="settingsTabs.team.roleHelp.admin" components={{ b: <strong /> }} />
            {"  "}
            <Trans i18nKey="settingsTabs.team.roleHelp.viewer" components={{ b: <strong /> }} />
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
              {t("settingsTabs.team.cancel")}
            </button>
            <PrimaryButton onClick={handleSave}>
              {saving ? t("settingsTabs.team.editRoleModal.saving") : t("settingsTabs.team.editRoleModal.save")}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TeamTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [licenseeId, setLicenseeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get current user's licensee_id
      const { data: myRow } = await supabase
        .from("licensee_members")
        .select("licensee_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!myRow?.licensee_id) {
        setLoading(false);
        return;
      }

      const lid = myRow.licensee_id;
      setLicenseeId(lid);

      // Load all members for this licensee
      const { data: memberRows } = await supabase
        .from("licensee_members")
        .select("id, user_id, role, invited_at, accepted_at")
        .eq("licensee_id", lid);

      if (!memberRows || memberRows.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = memberRows.map((m) => m.user_id);

      // Load profiles for display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profileMap = new Map<string, string>(
        (profiles ?? []).map((p) => [p.id, p.display_name ?? ""])
      );

      setMembers(
        memberRows.map((m) => ({
          id: m.id,
          userId: m.user_id,
          role: m.role as LicenseeRole,
          displayName: profileMap.get(m.user_id) || m.user_id.slice(0, 8),
          email: null,
          invitedAt: m.invited_at,
          acceptedAt: m.accepted_at,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  if (loading) {
    return (
      <Card>
        <CardTitle>{t("settingsTabs.team.heading")}</CardTitle>
        <div style={{ marginTop: 16, fontSize: 12, color: "#9A9A9A" }}>{t("settingsTabs.team.loading")}</div>
      </Card>
    );
  }

  if (!licenseeId) {
    return (
      <Card>
        <CardTitle>{t("settingsTabs.team.heading")}</CardTitle>
        <div style={{ marginTop: 16, fontSize: 13, color: "#6B6B6B" }}>
          {t("settingsTabs.team.completeSetup")}
        </div>
      </Card>
    );
  }

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
            <CardTitle>{t("settingsTabs.team.heading")}</CardTitle>
            <CardSubtitle>{t("settingsTabs.team.description")}</CardSubtitle>
          </div>
          <OutlineAddButton
            icon={<UserPlus size={14} strokeWidth={2} />}
            onClick={() => setInviteOpen(true)}
          >
            {t("settingsTabs.team.inviteMember")}
          </OutlineAddButton>
        </div>

        <div style={{ marginTop: 8 }}>
          {members.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "#9A9A9A" }}>
              {t("settingsTabs.team.empty")}
            </div>
          )}
          {members.map((m, i) => {
            const isLast = i === members.length - 1;
            const initials = getInitials(m.displayName);
            const avatarBg = AVATAR_COLORS[m.role];
            const lastSeen = m.acceptedAt
              ? timeAgo(m.acceptedAt, t)
              : m.invitedAt
              ? t("settingsTabs.team.invitedAgo", { time: timeAgo(m.invitedAt, t) })
              : t("settingsTabs.team.pending");
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: isLast ? "none" : "1px solid #E5E2DB",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                    flex: "1 1 220px",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: avatarBg,
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{m.displayName}</div>
                    {!m.acceptedAt && m.invitedAt && (
                      <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 2 }}>{t("settingsTabs.team.invitePending")}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <RoleBadge role={m.role} />
                  <div style={{ fontSize: 11, color: "#9A9A9A", minWidth: 70, textAlign: "right" }}>
                    {lastSeen}
                  </div>
                  {m.role !== "owner" && (
                    <IconAction
                      ariaLabel={t("settingsTabs.team.editAria", { name: m.displayName })}
                      icon={<Pencil size={14} color="#6B6B6B" />}
                      onClick={() => setEditMember(m)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {inviteOpen && user && licenseeId && (
        <InviteModal
          licenseeId={licenseeId}
          currentUserId={user.id}
          onClose={() => setInviteOpen(false)}
          onInvited={load}
        />
      )}

      {editMember && (
        <EditRoleModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={(updated) => {
            setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            setEditMember(null);
          }}
        />
      )}
    </>
  );
}
