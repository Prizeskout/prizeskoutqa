import { jsPDF } from "jspdf";

export type DisputeProofClaim = {
  partner: string; title: string; order: string; place: string; contract: string;
  charged: string; leak: string; hash: string; en: string;
};
export type ExecutionProof = { time: string; tag: string; detail: string };
const clean = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f]+/g, " ").trim();

function addWrapped(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(clean(text), width) as string[];
  for (const line of lines) {
    if (y > 278) { doc.addPage(); y = 18; }
    doc.text(line, x, y); y += lineHeight;
  }
  return y;
}

export async function exportDisputeProofPdf(input: {
  merchantName: string; generatedAt?: Date; claims: DisputeProofClaim[]; executions: ExecutionProof[];
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({claims:input.claims,executions:input.executions})));
  const packageHash = Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,"0")).join("");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: "PrizeSkout evidence package", subject: "Merchant payout and repricing evidence", author: "PrizeSkout" });
  doc.setFillColor(20, 33, 61); doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("PrizeSkout evidence package", 15, 17);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`${clean(input.merchantName)} | Generated ${generatedAt.toLocaleString("en-GB")}`, 15, 24);
  let y = 42;
  doc.setTextColor(20, 33, 61); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Package summary", 15, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  y = addWrapped(doc, `${input.claims.length} dispute draft(s) and ${input.executions.length} execution record(s). This package is evidence for review; it does not prove that a claim was submitted or accepted by a platform.`, 15, y, 180);
  y += 2; doc.setFont("courier", "normal"); doc.setFontSize(7.5); y = addWrapped(doc, `Package SHA-256: ${packageHash}`, 15, y, 180, 4); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  for (const [index, claim] of input.claims.entries()) {
    y += 6; if (y > 245) { doc.addPage(); y = 18; }
    doc.setDrawColor(222, 226, 232); doc.setFillColor(248, 249, 251); doc.roundedRect(12, y - 5, 186, 12, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`Claim draft ${index + 1}: ${clean(claim.title)}`, 15, y + 2); y += 11;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    for (const fact of [`Platform: ${claim.partner}`, `Order/reference: ${claim.order}`, `Location: ${claim.place}`, `Contract term: ${claim.contract}`, `Reported charge: ${claim.charged}`, `Discrepancy: ${claim.leak}`, `Evidence hash: ${claim.hash}`]) {
      doc.text(clean(fact), 15, y); y += 5;
    }
    y += 2; y = addWrapped(doc, claim.en, 15, y, 180);
  }
  if (input.executions.length) {
    y += 8; if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Execution evidence", 15, y); y += 8; doc.setFontSize(8.5);
    for (const row of input.executions) { y = addWrapped(doc, `${row.time} | ${row.tag} | ${row.detail}`, 15, y, 180, 4.5); y += 1.5; }
  }
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(110, 118, 130);
    doc.text(`PrizeSkout | Evidence package | Page ${page} of ${pageCount}`, 15, 291);
  }
  doc.save(`prizeskout-evidence-${generatedAt.toISOString().slice(0, 10)}.pdf`);
}
