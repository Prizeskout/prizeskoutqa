import writeXlsxFile, { type Cell, type Row, type Sheet } from "write-excel-file/browser";
import { summarizeAudit } from "@/lib/commission-audit";
import type { CommissionAuditPdfData, CommissionAuditPdfOptions } from "./exportAuditReportPdf";

const NAVY = "14213D";
const WHITE = "FFFFFF";
const header = (value: string): Cell => ({ value, fontWeight: "bold", textColor: WHITE, backgroundColor: NAVY });
const money = (value: number): Cell => ({ value, type: Number, format: "#,##0.00;[Red](#,##0.00)" });

function sheet(name: string, data: Row[], widths: number[]): Sheet<Blob> {
  return {
    sheet: name,
    data,
    columns: widths.map(width => ({ width })),
    stickyRowsCount: 1,
    showGridLines: false,
  };
}

export async function exportCommissionAuditExcel(
  data: CommissionAuditPdfData,
  currency: string,
  documentCount: number,
  options: CommissionAuditPdfOptions = {},
) {
  const summary = summarizeAudit(data, documentCount);
  const generatedAt = new Date();
  const summaryRows: Row[] = [
    [header("Metric"), header("Value"), header("Basis")],
    ["Report status", options.reviewStatus ?? "Unreviewed draft", "Workflow status at export"],
    ["Prepared by", options.preparedBy ?? "PrizeSkout Revenue Assurance Engine", "Report metadata"],
    ["Generated", generatedAt, "Local export time"],
    ["Audit period", data.coverage ? `${data.coverage.start} to ${data.coverage.end}` : "Not established", "Evidence coverage"],
    ["Currency", currency, "Merchant reporting currency"],
    ["Documents reviewed", documentCount, "Retained evidence"],
    ["Orders", data.ledgerTotals?.orders ?? 0, "Normalized order ledger"],
    ["Sales", money(data.ledgerTotals?.sales ?? 0), "Normalized order ledger"],
    ["Expected payout", money(data.ledgerTotals?.expected_net ?? 0), "Deterministic calculation"],
    ["Findings", data.findings.length, "Rule-based audit tests"],
    ["Evidence score", summary.evidenceScore ?? 0, "Audit assurance"],
    ["Claims-ready amount", money(data.assurance?.claimsReadyAmount ?? 0), "Corroborated findings"],
    ["Estimated exposure", money(data.assurance?.estimatedExposure ?? 0), "All quantified findings"],
  ];

  const findingsRows: Row[] = [
    ["Severity", "Finding", "Detail", `Amount (${currency})`, "Evidence level", "Recoverability", "Assertion"].map(header),
    ...data.findings.map(finding => [
      finding.severity,
      finding.title,
      finding.detail,
      money(finding.amount ?? 0),
      finding.evidence_level ?? "not classified",
      finding.recoverability ?? "not classified",
      finding.assertion ?? "not assigned",
    ]),
  ];

  const ledgerRows: Row[] = [
    ["Date", "Orders", `Sales (${currency})`, `Commission (${currency})`, `Expected net (${currency})`].map(header),
    ...data.ledger.map(row => [row.date, row.orders, money(row.sales), money(row.commission_at_agreed_rate), money(row.expected_net)]),
  ];

  const reconciliationRows: Row[] = [
    ["From", "To", "Status", `Variance (${currency})`, "Explanation"].map(header),
    ...(data.fourWay?.links ?? []).map(link => [link.from, link.to, link.status, link.variance == null ? "Not testable" : money(link.variance), link.explanation]),
  ];

  const evidenceRows: Row[] = [
    ["File", "Document type", "Platform", "Period start", "Period end", "Evidence item ID"].map(header),
    ...(options.documents ?? []).map(document => [
      document.file_name,
      document.document_type,
      document.result.platform ?? document.platform_guess ?? "Not established",
      document.result.period_start ?? "",
      document.result.period_end ?? "",
      document.evidence_item_id ?? "Legacy / not retained",
    ]),
  ];

  const workbook = await writeXlsxFile([
    sheet("Summary", summaryRows, [28, 24, 42]),
    sheet("Findings", findingsRows, [14, 30, 72, 18, 18, 18, 18]),
    sheet("Daily ledger", ledgerRows, [16, 12, 18, 18, 18]),
    sheet("Reconciliation", reconciliationRows, [24, 24, 16, 18, 72]),
    sheet("Evidence", evidenceRows, [38, 20, 18, 16, 16, 34]),
  ]);
  await workbook.toFile(`PrizeSkout-commission-audit-${generatedAt.toISOString().slice(0, 10)}.xlsx`);
}
