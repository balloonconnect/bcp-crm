/**
 * A small, dependency-free CSV parser — handles quoted fields
 * (including embedded commas and escaped quotes via `""`), which a
 * naive `split(",")` would break on. Returns the header row separately
 * from data rows so callers can build "Column mapping" UI directly
 * from `headers` without re-parsing.
 */
export function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = splitCsvLines(content);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]!);
  const rows = lines.slice(1).filter((line) => line.trim().length > 0).map(parseCsvLine);
  return { headers, rows };
}

function splitCsvLines(content: string): string[] {
  // Splits on newlines that aren't inside a quoted field.
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') inQuotes = !inQuotes;
    if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else if (char !== "\r") {
      current += char;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** Turns parsed rows into an array of `{ csvHeader: value }` records, ready for column-mapping to apply against. */
export function rowsToRecords(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));
}
