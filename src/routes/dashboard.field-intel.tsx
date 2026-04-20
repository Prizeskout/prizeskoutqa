import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FieldIntelMetrics } from "@/components/dashboard/field-intel/FieldIntelMetrics";
import { SubmitObservation } from "@/components/dashboard/field-intel/SubmitObservation";
import { RecentObservations, OBSERVATIONS } from "@/components/dashboard/field-intel/RecentObservations";
import { PriceGaps, ROWS as PRICE_GAPS } from "@/components/dashboard/field-intel/PriceGaps";
import { FieldTeamActivity } from "@/components/dashboard/field-intel/FieldTeamActivity";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { exportFieldIntelPdf } from "@/components/dashboard/field-intel/exportFieldIntelPdf";

export const Route = createFileRoute("/dashboard/field-intel")({
  head: () => ({ meta: [{ title: "Field Intel — PrizeSkout" }] }),
  component: FieldIntelPage,
});

function FieldIntelPage() {
  return (
    <DashboardLayout title="Field Intel">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ExportPdfButton
            onExport={() =>
              exportFieldIntelPdf({ observations: OBSERVATIONS, gaps: PRICE_GAPS })
            }
          />
        </div>
        <FieldIntelMetrics />
        <div className="field-intel-two-col">
          <div className="field-intel-left">
            <SubmitObservation />
          </div>
          <div className="field-intel-right">
            <RecentObservations />
          </div>
        </div>
        <PriceGaps />
        <FieldTeamActivity />
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
