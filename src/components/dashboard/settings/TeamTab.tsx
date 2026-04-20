import { Pencil, UserPlus } from "lucide-react";
import {
  Card,
  CardSubtitle,
  CardTitle,
  IconAction,
  OutlineAddButton,
} from "./primitives";

type Role = "Admin" | "Category Manager" | "Field Agent" | "Viewer";

type Member = {
  name: string;
  email: string;
  role: Role;
  avatarBg: string;
  initials: string;
  lastActive: string;
};

const MEMBERS: Member[] = [
  { name: "Saeed M.", email: "saeed@snoonu.com", role: "Admin", avatarBg: "#EA580C", initials: "SM", lastActive: "Just now" },
  { name: "Layla K.", email: "layla@snoonu.com", role: "Category Manager", avatarBg: "#3B82F6", initials: "LK", lastActive: "2 hrs ago" },
  { name: "Ahmad K.", email: "ahmad@snoonu.com", role: "Field Agent", avatarBg: "#7C3AED", initials: "AK", lastActive: "3 hrs ago" },
  { name: "Sara M.", email: "sara@snoonu.com", role: "Field Agent", avatarBg: "#7C3AED", initials: "SM", lastActive: "5 hrs ago" },
  { name: "Fatima R.", email: "fatima@snoonu.com", role: "Field Agent", avatarBg: "#7C3AED", initials: "FR", lastActive: "6 hrs ago" },
  { name: "Omar H.", email: "omar@snoonu.com", role: "Viewer", avatarBg: "#9A9A9A", initials: "OH", lastActive: "1 day ago" },
];

const ROLE_STYLES: Record<Role, { bg: string; color: string }> = {
  Admin: { bg: "rgba(234, 88, 12, 0.08)", color: "#EA580C" },
  "Category Manager": { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6" },
  "Field Agent": { bg: "rgba(168, 85, 247, 0.08)", color: "#7C3AED" },
  Viewer: { bg: "#F5F4F1", color: "#6B6B6B" },
};

function RoleBadge({ role }: { role: Role }) {
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
      {role}
    </span>
  );
}

export function TeamTab() {
  return (
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
          <CardTitle>Team members</CardTitle>
          <CardSubtitle>Manage who has access to PrizeSkout</CardSubtitle>
        </div>
        <OutlineAddButton icon={<UserPlus size={14} strokeWidth={2} />}>
          Invite member
        </OutlineAddButton>
      </div>

      <div style={{ marginTop: 8 }}>
        {MEMBERS.map((m, i) => {
          const isLast = i === MEMBERS.length - 1;
          return (
            <div
              key={m.email}
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
                    backgroundColor: m.avatarBg,
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{m.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B6B6B",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {m.email}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <RoleBadge role={m.role} />
                <div style={{ fontSize: 11, color: "#9A9A9A", minWidth: 70, textAlign: "right" }}>
                  {m.lastActive}
                </div>
                <IconAction ariaLabel={`Edit ${m.name}`} icon={<Pencil size={14} color="#6B6B6B" />} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
