type TextItem = {str?: unknown; transform?: unknown};

function readingOrder(items: TextItem[]) {
  const positioned = items.flatMap(item => {
    if (typeof item.str !== "string" || !item.str.trim() || !Array.isArray(item.transform)) return [];
    const x = Number(item.transform[4]), y = Number(item.transform[5]);
    return Number.isFinite(x) && Number.isFinite(y) ? [{str: item.str, x, y}] : [];
  });
  const lines: {y: number; items: typeof positioned}[] = [];
  for (const item of positioned) {
    let line = lines.find(candidate => Math.abs(candidate.y - item.y) <= 1.5);
    if (!line) { line = {y: item.y, items: []}; lines.push(line); }
    line.items.push(item);
  }
  lines.sort((a,b) => b.y - a.y);
  for (const line of lines) line.items.sort((a,b) => a.x - b.x);
  return lines.map(line => line.items.map(item => item.str).join(" ")).join("\n");
}

export function assessPdfTextQuality(pages: string[], totalPages = pages.length) {
  const readablePages = pages.filter(page => page.replace(/\s/g, "").length >= 30).length;
  const text = pages.join("\n\n");
  const replacementCharacters = (text.match(/�/g) ?? []).length;
  const coverage = totalPages ? readablePages / totalPages : 0;
  const usable = text.trim().length >= 100 && coverage >= 0.5 && replacementCharacters <= Math.max(5, text.length * 0.01);
  return {usable, readablePages, totalPages, coverage, characterCount: text.length, replacementCharacters};
}

export async function extractPdfTextServer(bytes: Buffer, maxPages = 40) {
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("The file does not contain a valid PDF signature.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({data: new Uint8Array(bytes)});
  const document = await task.promise;
  const totalPages = document.numPages;
  const pageCount = Math.min(totalPages, maxPages), pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(readingOrder(content.items as TextItem[]));
      page.cleanup();
    }
  } finally { await task.destroy(); }
  const quality = assessPdfTextQuality(pages, totalPages);
  return {text: pages.map((page,index) => `[PAGE ${index + 1}]\n${page}`).join("\n\n"), pages, quality, truncated: totalPages > pageCount};
}
