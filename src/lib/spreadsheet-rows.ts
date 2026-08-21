export type SpreadsheetCell = unknown;

const cellText = (value: SpreadsheetCell) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
};

const csvCell = (value: SpreadsheetCell) => {
  const text = cellText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function spreadsheetRowsToCsv(rows: ReadonlyArray<ReadonlyArray<SpreadsheetCell>>) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
