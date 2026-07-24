export interface CsvColumn {
  key: string;
  header: string;
}

/** A generic tabular CSV builder every report shares — one function rather than a bespoke exporter per report type, since every report ultimately reduces to rows of named columns. Values containing a comma, quote, or newline are quoted and escaped per standard CSV rules. */
export function buildReportCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const dataRows = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  return [header, ...dataRows].join("\n");
}
