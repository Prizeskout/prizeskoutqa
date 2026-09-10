export const CANONICAL_UPLOAD_FIELDS = [
  "order_id",
  "date",
  "gross_amount",
  "commission",
  "commission_rate",
  "net_payout",
  "item",
] as const;
export type UploadField = (typeof CANONICAL_UPLOAD_FIELDS)[number];

const cells = (line: string) => {
  const out: string[] = [],
    pattern = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)))
    out.push((match[1] ?? "").replace(/^"|"$/g, "").replace(/""/g, '"').trim());
  return out;
};
const csv = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
export function csvHeaders(text: string) {
  return cells(text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "");
}
export function parseColumnMapping(input: string, headers: string[]) {
  const normalized = new Map(headers.map((header) => [header.trim().toLowerCase(), header])),
    mapping = {} as Partial<Record<UploadField, string>>;
  for (const pair of input.split(",")) {
    const split = pair.indexOf("=");
    if (split < 1) continue;
    const canonical = pair.slice(0, split).trim() as UploadField,
      source = pair.slice(split + 1).trim(),
      actual = normalized.get(source.toLowerCase());
    if (CANONICAL_UPLOAD_FIELDS.includes(canonical) && actual) mapping[canonical] = actual;
  }
  if (!mapping.date || !mapping.gross_amount)
    throw new Error("Map at least date and gross_amount using canonical=source header pairs.");
  return mapping;
}
export function remapCsvHeader(text: string, mapping: Partial<Record<UploadField, string>>) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/),
    headers = cells(lines[0] ?? ""),
    sourceToCanonical = new Map(
      Object.entries(mapping).map(([canonical, source]) => [
        source!.trim().toLowerCase(),
        canonical,
      ]),
    );
  lines[0] = headers
    .map((header) => csv(sourceToCanonical.get(header.trim().toLowerCase()) ?? header))
    .join(",");
  return lines.join("\n");
}
