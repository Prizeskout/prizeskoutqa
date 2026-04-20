type Agent = { name: string; role: string; count: number };

const AGENTS: Agent[] = [
  { name: "Ahmad K.", role: "Field agent, Doha", count: 16 },
  { name: "Sara M.", role: "Field agent, Lusail", count: 13 },
  { name: "Fatima R.", role: "Field agent, Al Gharafa", count: 9 },
  { name: "Omar H.", role: "Field agent, Doha", count: 7 },
  { name: "Yusuf A.", role: "Field agent, Al Wakrah", count: 2 },
];

const MAX = 16;

export function FieldTeamActivity() {
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
      <div style={{ marginTop: 8 }}>
        {AGENTS.map((a, i) => (
          <div
            key={a.name}
            style={{
              padding: "10px 0",
              borderBottom: i === AGENTS.length - 1 ? "none" : "1px solid #F5F4F1",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>{a.name}</div>
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
                  width: `${(a.count / MAX) * 100}%`,
                  height: "100%",
                  backgroundColor: "#EA580C",
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", minWidth: 30, textAlign: "right" }}>
              {a.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
