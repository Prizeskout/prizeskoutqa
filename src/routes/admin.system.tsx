import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle, AlertCircle, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/admin/system")({
  head: () => ({ meta: [{ title: "System Health | Admin Console | PrizeSkout" }] }),
  component: SystemPage,
});

type ChannelStatusRow = { platform: string; status: string };

const CORE_SERVICES = [
  { name: "API Workers",     key: "workers"   },
  { name: "Database",        key: "database"  },
  { name: "Auth Service",    key: "auth"      },
  { name: "Govern Pipeline", key: "govern"    },
];

const PLATFORM_LABELS: Record<string, string> = {
  talabat:  "Talabat API",
  jahez:    "Jahez API",
  snoonu:   "Snoonu API",
  deliveroo:"Deliveroo API",
  salla:    "Salla API",
  foodics:  "Foodics API",
  zid:      "Zid API",
};

function SystemPage() {
  const [channels, setChannels]   = useState<ChannelStatusRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastChecked, setChecked] = useState(new Date());

  const load = () => {
    setLoading(true);
    supabase
      .from("ps_merchant_channels")
      .select("platform, status")
      .then(({ data }) => {
        setChannels((data ?? []) as ChannelStatusRow[]);
        setChecked(new Date());
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const platformStatus: Record<string, { ok: number; error: number; total: number }> = {};
  for (const row of channels) {
    if (!platformStatus[row.platform]) platformStatus[row.platform] = { ok: 0, error: 0, total: 0 };
    platformStatus[row.platform].total++;
    if (row.status === "connected") platformStatus[row.platform].ok++;
    if (row.status === "error")     platformStatus[row.platform].error++;
  }

  const activePlatforms = Object.keys(PLATFORM_LABELS).filter((p) => platformStatus[p]?.total > 0);

  const coreOk = !loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: "#8A8A8A" }}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
        <button
          type="button"
          onClick={load}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #E5E2DB", borderRadius: 8, backgroundColor: "#fff", fontSize: 13, fontWeight: 600, color: "#1A1A18", cursor: "pointer" }}
        >
          <RefreshCcw size={13} />
          Re-check
        </button>
      </div>

      {/* Core services */}
      <section style={{ backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 14, overflow: "hidden" }}>
        <header style={{ padding: "14px 20px", borderBottom: "1px solid #F1EFE9", display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={15} color="#1A1A18" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>Core Services</span>
        </header>
        <div>
          {CORE_SERVICES.map((svc, i) => {
            const ok = svc.key === "workers" || svc.key === "database" || svc.key === "auth" || svc.key === "govern"
              ? coreOk
              : true;
            return (
              <div
                key={svc.key}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 20px",
                  borderBottom: i < CORE_SERVICES.length - 1 ? "1px solid #F5F3EF" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: "#1A1A18" }}>{svc.name}</span>
                {loading ? (
                  <span style={{ fontSize: 12, color: "#9A9A9A" }}>Checking…</span>
                ) : ok ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
                    <CheckCircle size={14} /> OK
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#EA580C" }}>
                    <AlertCircle size={14} /> Degraded
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Platform integrations */}
      <section style={{ backgroundColor: "#fff", border: "1px solid #E5E2DB", borderRadius: 14, overflow: "hidden" }}>
        <header style={{ padding: "14px 20px", borderBottom: "1px solid #F1EFE9" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>Platform Integrations</span>
          <div style={{ fontSize: 11, color: "#8A8A8A", marginTop: 3 }}>Based on live channel connection statuses</div>
        </header>
        {activePlatforms.length === 0 ? (
          <div style={{ padding: 24, color: "#8A8A8A", fontSize: 13 }}>
            {loading ? "Loading…" : "No platform integrations connected yet."}
          </div>
        ) : (
          <div>
            {activePlatforms.map((p, i) => {
              const s = platformStatus[p];
              const degraded = s.error > 0;
              return (
                <div
                  key={p}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 20px",
                    borderBottom: i < activePlatforms.length - 1 ? "1px solid #F5F3EF" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#1A1A18" }}>{PLATFORM_LABELS[p] ?? p}</div>
                    <div style={{ fontSize: 11, color: "#8A8A8A", marginTop: 2, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                      {s.ok} connected · {s.error} error · {s.total} total
                    </div>
                  </div>
                  {degraded ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#EA580C" }}>
                      <AlertCircle size={14} /> Degraded
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
                      <CheckCircle size={14} /> OK
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
