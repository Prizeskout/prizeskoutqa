import { writeFileSync } from "node:fs";

// Stub browser globals jsPDF uses
(globalThis as any).window = globalThis;
(globalThis as any).navigator = { userAgent: "node" };
(globalThis as any).btoa = (s: string) => Buffer.from(s, "binary").toString("base64");
(globalThis as any).atob = (s: string) => Buffer.from(s, "base64").toString("binary");

// Patch the .save call to write to disk instead of triggering a download
import { jsPDF } from "jspdf";
const origSave = jsPDF.prototype.save;
jsPDF.prototype.save = function (filename: string) {
  const out = this.output("arraybuffer") as ArrayBuffer;
  writeFileSync(`/tmp/pdfqa/${filename}`, Buffer.from(out));
  return this;
};

// Import the actual exporter
const mod = await import("/dev-server/src/components/dashboard/competitors/exportPatternsPdf.ts");

// Re-derive PATTERNS by importing the component module's data via raw read
import { readFileSync } from "node:fs";
const src = readFileSync(
  "/dev-server/src/components/dashboard/competitors/BehaviorPatterns.tsx",
  "utf8",
);
// crude extract: locate `const PATTERNS: Pattern[] = [` ... `];`
const m = src.match(/const PATTERNS: Pattern\[\] = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error("Could not find PATTERNS array");
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const PATTERNS = (new Function(`return ${m[1]};`))();
console.log("Loaded", PATTERNS.length, "patterns");

await mod.exportPatternsPdf(PATTERNS);
console.log("PDF written to /tmp/pdfqa/prizeskout-behavior-patterns.pdf");
