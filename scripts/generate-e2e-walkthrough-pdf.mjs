import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { jsPDF } from "jspdf";

const sourcePath = resolve("docs/END_TO_END_TEST_WALKTHROUGH.md");
const outputPath = resolve("docs/PrizeSkout-End-to-End-Test-Walkthrough.pdf");
const source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginX = 50;
const top = 52;
const bottom = 50;
const contentWidth = pageWidth - marginX * 2;
let y = top;
let pageNumber = 1;

const colors = {
  navy: [9, 25, 54],
  orange: [247, 103, 24],
  muted: [82, 96, 117],
  pale: [248, 249, 252],
  border: [220, 226, 235],
};

function clean(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/â€”/g, "—")
    .replace(/â†’/g, "→");
}

function footer() {
  doc.setDrawColor(...colors.border);
  doc.line(marginX, pageHeight - 35, pageWidth - marginX, pageHeight - 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text("PrizeSkout - Complete Product Walkthrough", marginX, pageHeight - 20);
  doc.text(String(pageNumber), pageWidth - marginX, pageHeight - 20, { align: "right" });
}

function newPage() {
  footer();
  doc.addPage();
  pageNumber += 1;
  y = top;
}

function ensure(height) {
  if (y + height > pageHeight - bottom) newPage();
}

function paragraph(text, options = {}) {
  const { indent = 0, bullet = "", bold = false, color = colors.navy, spaceAfter = 6 } = options;
  const fontSize = 10.5;
  const lineHeight = 15;
  const bulletWidth = bullet ? 15 : 0;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(clean(text), contentWidth - indent - bulletWidth);
  ensure(lines.length * lineHeight + spaceAfter);
  if (bullet) {
    doc.setFont("helvetica", "bold");
    doc.text(bullet, marginX + indent, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
  }
  doc.text(lines, marginX + indent + bulletWidth, y);
  y += lines.length * lineHeight + spaceAfter;
}

function heading(text, level) {
  const size = level === 1 ? 22 : level === 2 ? 15 : 12;
  const before = level === 1 ? 0 : level === 2 ? 15 : 10;
  const after = level === 1 ? 16 : 8;
  // Keep a heading with at least the first few lines that follow it. This is
  // especially important when the PDF is being used as a live speaking guide.
  const followOnSpace = level === 1 ? 30 : level === 2 ? 48 : 30;
  ensure(before + size + after + followOnSpace);
  y += before;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...(level === 1 ? colors.orange : colors.navy));
  const lines = doc.splitTextToSize(clean(text), contentWidth);
  doc.text(lines, marginX, y);
  y += lines.length * (size + 3) + after;
  if (level === 2) {
    doc.setDrawColor(...colors.orange);
    doc.setLineWidth(1.5);
    doc.line(marginX, y - 4, marginX + 42, y - 4);
  }
}

doc.setFillColor(...colors.pale);
doc.rect(0, 0, pageWidth, pageHeight, "F");
doc.setFillColor(...colors.orange);
doc.rect(0, 0, 12, pageHeight, "F");

for (const rawLine of source.split("\n")) {
  const line = rawLine.trimEnd();
  if (!line.trim()) {
    y += 4;
    continue;
  }
  if (line === "---") {
    ensure(18);
    doc.setDrawColor(...colors.border);
    doc.line(marginX, y + 4, pageWidth - marginX, y + 4);
    y += 18;
    continue;
  }
  if (line.startsWith("### ")) {
    heading(line.slice(4), 3);
    continue;
  }
  if (line.startsWith("## ")) {
    heading(line.slice(3), 2);
    continue;
  }
  if (line.startsWith("# ")) {
    heading(line.slice(2), 1);
    continue;
  }
  const numbered = line.match(/^(\d+)\.\s+(.*)$/);
  if (numbered) {
    paragraph(numbered[2], { indent: 5, bullet: `${numbered[1]}.` });
    continue;
  }
  const item = line.match(/^[-*]\s+(.*)$/);
  if (item) {
    paragraph(item[1], { indent: 5, bullet: "•" });
    continue;
  }
  paragraph(line, { bold: /^(Expected result|Result|Important|Proceed|Only perform)/i.test(line) });
}

footer();
doc.save(outputPath);
console.log(`Created ${outputPath} (${pageNumber} pages)`);
