import { writeFileSync, readFileSync } from "node:fs";

// jsPDF in node only needs window-ish globals if it uses html() — for our text+rect calls it works fine.
import { jsPDF } from "jspdf";
const origSave = jsPDF.prototype.save;
jsPDF.prototype.save = function (filename: string) {
  const out = this.output("arraybuffer") as ArrayBuffer;
  writeFileSync(`/dev-server/.pdfqa/${filename}`, Buffer.from(out));
  return this;
};

const mod = await import("/dev-server/src/components/dashboard/competitors/exportPatternsPdf.ts");

const src = readFileSync(
  "/dev-server/src/components/dashboard/competitors/BehaviorPatterns.tsx",
  "utf8",
);
const m = src.match(/const PATTERNS: Pattern\[\] = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error("Could not find PATTERNS array");
const PATTERNS = (new Function(`return ${m[1]};`))();
console.log("Loaded", PATTERNS.length, "patterns");

await mod.exportPatternsPdf(PATTERNS);
console.log("PDF written");
