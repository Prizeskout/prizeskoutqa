import { readFile, writeFile } from "node:fs/promises";

const marker = "/* 2026 visual refinement:";
const stylesheet = await readFile("src/components/landing/ImmersiveEconomicTwinLanding.css", "utf8");
const markerIndex = stylesheet.indexOf(marker);
if (markerIndex < 0) throw new Error("Landing refinement block was not found.");
const refinement = stylesheet.slice(markerIndex);

for (const target of process.argv.slice(2)) {
  let html = await readFile(target, "utf8");
  const styles = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)];
  if (!styles.length) throw new Error(`No stylesheet found in ${target}`);

  const combined = styles
    .map((match) => {
      const index = match[1].indexOf(marker);
      return index < 0 ? match[1] : match[1].slice(0, index);
    })
    .concat(refinement)
    .join("\n")
    .replace(/[ \t]+$/gm, "");

  let keptFirst = false;
  html = html.replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, () => {
    if (keptFirst) return "";
    keptFirst = true;
    return `<style id="prizeskout-consolidated-styles">${combined}</style>`;
  });

  await writeFile(target, html.replace(/[ \t]+$/gm, ""), "utf8");
  process.stdout.write(`${target}\n`);
}
