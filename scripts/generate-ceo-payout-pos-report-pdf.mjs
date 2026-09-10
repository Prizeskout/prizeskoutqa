import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { jsPDF } from "jspdf";

const sourcePath = resolve("docs/PrizeSkout-API-Independent-Strategy.md");
const outputPath = resolve("docs/PrizeSkout-API-Independent-Strategy.pdf");
const source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
doc.setProperties({
  title: "PrizeSkout API-Independent Strategy",
  subject: "PrizeSkout's strategy for automated payout reconciliation without relying on aggregator APIs",
  author: "",
  creator: "",
});
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginX = 50;
const top = 48;
const bottom = 52;
const contentWidth = pageWidth - marginX * 2;
let y = top;
let pageNumber = 1;

const colors = {
  text: [0, 0, 0],
  muted: [75, 75, 75],
  border: [205, 205, 205],
};

function clean(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, " to ")
    .replace(/…/g, "...")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=");
}

function paintPage() {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
}

function footer() {
  doc.setDrawColor(...colors.border);
  doc.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text("PrizeSkout API-Independent Strategy", marginX, pageHeight - 19);
  doc.text(String(pageNumber), pageWidth - marginX, pageHeight - 19, { align: "right" });
}

function newPage() {
  footer();
  doc.addPage();
  pageNumber += 1;
  y = top;
  paintPage();
}

function ensure(height) {
  if (y + height > pageHeight - bottom) newPage();
}

function paragraph(text, options = {}) {
  const {
    indent = 0,
    bullet = "",
    bold = false,
    color = colors.text,
    fontSize = 10.25,
    spaceAfter = 6,
  } = options;
  const lineHeight = fontSize + 4.25;
  const bulletWidth = bullet ? 17 : 0;
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
  const size = level === 1 ? 23 : level === 2 ? 15 : 11.5;
  const before = level === 1 ? 0 : level === 2 ? 15 : 9;
  const after = level === 1 ? 14 : 8;
  const followOn = level === 1 ? 36 : level === 2 ? 45 : 28;
  ensure(before + size + after + followOn);
  y += before;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...colors.text);
  const lines = doc.splitTextToSize(clean(text), contentWidth);
  doc.text(lines, marginX, y);
  y += lines.length * (size + 3) + after;
}

paintPage();

for (const rawLine of source.split("\n")) {
  const line = rawLine.trimEnd();
  if (!line.trim()) {
    y += 3;
    continue;
  }
  if (line === "---") {
    ensure(16);
    doc.setDrawColor(...colors.border);
    doc.line(marginX, y + 3, pageWidth - marginX, y + 3);
    y += 16;
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
    paragraph(item[1], { indent: 5, bullet: "-" });
    continue;
  }
  const isCallout = /^(PrizeSkout should|The recommended|The important|In one sentence|Payout reconciliation|Product cost|The strongest)/i.test(line);
  paragraph(line, { bold: isCallout });
}

footer();
doc.save(outputPath);
console.log(`Created ${outputPath} (${pageNumber} pages)`);
