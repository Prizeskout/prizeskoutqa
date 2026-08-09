// Converts an uploaded XLSX/XLS file into the same CSV-text shape the
// server's CSV parsers already accept — no new column-detection logic needed,
// the existing sniffing in payout-csv-parser.ts / payout-statement-parser.ts
// handles it verbatim once it's plain CSV text. Client-side only, mirrors
// pdf-text.ts's placement (extraction happens in the browser, only text is
// POSTed to the Worker).
//
// Only the first sheet is read. Unverified against a real merchant XLSX
// export (none exists yet) — if a real one turns out to need a different
// sheet or a multi-sheet merge, that's a fix to make once we've seen one,
// not something to guess at now.
export async function extractXlsxAsCsv(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Spreadsheet files must be 5 MB or smaller.");
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", sheetRows: 10_001, dense: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("That spreadsheet doesn't have any sheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  if (csv.split(/\r?\n/).length > 10_000) throw new Error("Spreadsheet files must contain 10,000 rows or fewer.");
  return csv;
}
