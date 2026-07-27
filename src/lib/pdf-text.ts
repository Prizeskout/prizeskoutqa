// Client-side PDF text extraction (browser only — never sent to the Worker
// as a binary). Dynamically imported so pdfjs-dist's ~1MB payload only loads
// for merchants who actually use PDF upload, not on every dashboard visit.
// The extracted plain text is what gets POSTed to the server for parsing —
// same wire shape as the CSV upload path, just a different source format.
//
// pdf.js's getTextContent() returns items in content-stream draw order, NOT
// visual reading order — confirmed against a real Snoonu report where a
// table's value row was drawn right-to-left while its label row was drawn
// left-to-right, silently reversing every number. Reconstructing reading
// order from each item's (x,y) position (group into lines by y, sort each
// line left-to-right by x, order lines top-to-bottom) fixed it — verified
// against the real PDF through the actual pdfjs-dist extraction path, not
// guessed.
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(reconstructReadingOrder(content.items));
  }
  return pages.join("\n");
}

/** Preserves page boundaries so contract-clause citations remain reviewable. */
export async function extractPdfTextWithPages(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(`[PAGE ${i}]\n${reconstructReadingOrder(content.items)}`);
  }
  return pages.join("\n\n");
}

export type OcrPageImage = {
  page: number;
  media_type: "image/jpeg" | "image/png";
  data: string;
};

/**
 * Renders image-only PDF pages for server-side vision extraction. Pages are
 * deliberately downscaled and JPEG-compressed to bound request size.
 */
export async function renderPdfPagesForOcr(file: File, maxPages = 15): Promise<{
  pages: OcrPageImage[];
  totalPages: number;
  truncated: boolean;
}> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = Math.min(doc.numPages, maxPages);
  const pages: OcrPageImage[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1600 / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error(`Could not prepare page ${pageNumber} for OCR.`);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    pages.push({
      page: pageNumber,
      media_type: "image/jpeg",
      data: canvas.toDataURL("image/jpeg", 0.78).split(",", 2)[1] ?? "",
    });
    canvas.width = 1;
    canvas.height = 1;
  }
  return { pages, totalPages: doc.numPages, truncated: doc.numPages > pageCount };
}

function reconstructReadingOrder(items: unknown[]): string {
  const Y_TOLERANCE = 1.5; // verified against a real report: separates
    // genuinely distinct rows ~2pt apart while still merging same-row items.
  type Positioned = { str: string; x: number; y: number };
  const withPos: Positioned[] = items
    .filter((it): it is { str: string; transform: number[] } =>
      typeof it === "object" && it !== null && "str" in it && "transform" in it
      && typeof (it as { str: unknown }).str === "string" && (it as { str: string }).str.trim().length > 0)
    .map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));

  const lines: { y: number; items: Positioned[] }[] = [];
  for (const it of withPos) {
    let line = lines.find(l => Math.abs(l.y - it.y) <= Y_TOLERANCE);
    if (!line) { line = { y: it.y, items: [] }; lines.push(line); }
    line.items.push(it);
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);

  return lines.map(l => l.items.map(it => it.str).join(" ")).join("\n");
}
