import { Users } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { FieldTeamActivityRow } from "@/lib/field-intel-data";

export function FieldTeamActivity({ activity }: { activity: FieldTeamActivityRow[] }) {
  const max = activity.reduce((m, a) => Math.max(m, a.observation_count), 1);
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Field team activity</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Observation volume by team member this week
      </div>
      {activity.length === 0 ? (
        <EmptyState
          compact
          icon={<Users size={20} strokeWidth={1.75} />}
          title="No field activity this week"
          description="Once your team submits in-store observations, you'll see who's contributing here."
        />
      ) : (
      <div style={{ marginTop: 8 }}>
        {activity.map((a, i) => (
          <div
            key={a.id}
            style={{
              padding: "10px 0",
              borderBottom: i === activity.length - 1 ? "none" : "1px solid #F5F4F1",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>{a.agent_name}</div>
              <div style={{ fontSize: 11, color: "#9A9A9A" }}>{a.role}</div>
            </div>
            <div
              style={{
                flex: 1,
                margin: "0 16px",
                height: 8,
                backgroundColor: "#F5F4F1",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(a.observation_count / max) * 100}%`,
                  height: "100%",
                  backgroundColor: "#EA580C",
                  borderRadius: 4,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1A1A18",
                minWidth: 30,
                textAlign: "right",
              }}
            >
              {a.observation_count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
