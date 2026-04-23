import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FieldIntelMetrics } from "@/components/dashboard/field-intel/FieldIntelMetrics";
import { SubmitObservation } from "@/components/dashboard/field-intel/SubmitObservation";
import { RecentObservations } from "@/components/dashboard/field-intel/RecentObservations";
import { PriceGaps } from "@/components/dashboard/field-intel/PriceGaps";
import { FieldTeamActivity } from "@/components/dashboard/field-intel/FieldTeamActivity";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { exportFieldIntelPdf } from "@/components/dashboard/field-intel/exportFieldIntelPdf";
import { FieldIntelPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import type {
  FieldIntelData,
  FieldIntelMetric,
  FieldTeamActivityRow,
  PriceGapRow,
  RecentObservationRow,
} from "@/lib/field-intel-data";

async function loadFieldIntel(): Promise<FieldIntelData> {
  if (typeof window === "undefined") {
    return pendingOnSSR<FieldIntelData>({
      metrics: [],
      observations: [],
      gaps: [],
      activity: [],
    });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/field-intel" } });
  }

  const [metricsRes, obsRes, gapsRes, activityRes] = await Promise.all([
    supabase.from("field_intel_metrics").select("*").order("position", { ascending: true }),
    supabase.from("recent_observations").select("*").order("position", { ascending: true }),
    supabase.from("price_gaps").select("*").order("position", { ascending: true }),
    supabase.from("field_team_activity").select("*").order("position", { ascending: true }),
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (obsRes.error) throw obsRes.error;
  if (gapsRes.error) throw gapsRes.error;
  if (activityRes.error) throw activityRes.error;

  return {
    metrics: (metricsRes.data ?? []) as FieldIntelMetric[],
    observations: (obsRes.data ?? []) as unknown as RecentObservationRow[],
    gaps: (gapsRes.data ?? []) as unknown as PriceGapRow[],
    activity: (activityRes.data ?? []) as unknown as FieldTeamActivityRow[],
  };
}

export const Route = createFileRoute("/dashboard/field-intel")({
  head: () => ({ meta: [{ title: "Field Intel | PrizeSkout" }] }),
  loader: () => loadFieldIntel(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: FieldIntelPendingPage,
  component: FieldIntelPage,
});

function FieldIntelPage() {
  const data = Route.useLoaderData() as FieldIntelData;

  return (
    <DashboardLayout
      title="Field Intel"
      subtitle="In-store observations and price gaps from your field team, synced against your online prices."
      helpItems={[
        "Submit a new observation right here when an agent spots a price, promo, or stock change.",
        "Price gaps highlight where shelf prices and online prices disagree. Usually a quick win.",
        "Recent observations are tagged with agent + store so you can validate fast.",
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ExportPdfButton
            onExport={() =>
              exportFieldIntelPdf({
                observations: data.observations.map((o) => ({
                  product: o.product,
                  store: o.store,
                  price: Number(o.price),
                  condition: o.condition,
                  promoDetail: o.promo_detail ?? undefined,
                  status: o.status,
                  agent: o.agent,
                  time: o.time_label,
                })),
                gaps: data.gaps.map((g) => ({
                  product: g.product,
                  competitor: g.competitor,
                  online: Number(g.online_price),
                  inStore: Number(g.in_store_price),
                  gap: g.gap,
                  direction: g.direction,
                  observed: g.observed,
                })),
              })
            }
          />
        </div>
        <FieldIntelMetrics metrics={data.metrics} />
        <div className="field-intel-two-col">
          <div className="field-intel-left">
            <SubmitObservation />
          </div>
          <div className="field-intel-right">
            <RecentObservations observations={data.observations} />
          </div>
        </div>
        <PriceGaps gaps={data.gaps} />
        <FieldTeamActivity activity={data.activity} />
      </div>
      <style>{`
        .field-intel-two-col {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .field-intel-left { flex: 0 0 calc(55% - 7px); min-width: 0; }
        .field-intel-right { flex: 0 0 calc(45% - 7px); min-width: 0; }
        @media (max-width: 768px) {
          .field-intel-two-col { flex-direction: column; }
          .field-intel-left, .field-intel-right { flex: 1 1 auto; width: 100%; }
        }
      `}</style>
    </DashboardLayout>
  );
}
