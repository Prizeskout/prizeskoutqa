// Client-side PDF text extraction (browser only — never sent to the Worker
// as a binary). Dynamically imported so pdfjs-dist's ~1MB payload only loads
// for merchants who actually use PDF upload, not on every dashboard visit.
// The extracted plain text is what gets POSTed to the server for parsing —
// same wire shape as the CSV upload path, just a different source format.
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
    const line = content.items
      .map(item => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(line);
  }
  return pages.join("\n");
}
