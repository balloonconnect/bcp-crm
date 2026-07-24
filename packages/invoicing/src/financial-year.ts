/** India's financial year runs April 1 – March 31. A date in Jan–Mar belongs to the FY that started the previous April. Returned as "2026-27" — the conventional short form GST documents use. */
export function resolveFinancialYear(date: Date): string {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1; // getMonth() is 0-indexed; 3 = April
  const nextYearShort = String((year + 1) % 100).padStart(2, "0");
  return `${year}-${nextYearShort}`;
}
