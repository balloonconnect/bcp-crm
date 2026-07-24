export interface DocumentNumberInput {
  prefix: string; // "INV", "RCPT", "CN", "RFD"
  financialYear: string; // "2026-27"
  branchCode?: string; // short branch identifier, when branch numbering is in use
  sequence: number; // 1-based count of documents of this type already issued in this FY (+ branch, if used)
  padWidth?: number; // defaults to 4
}

/**
 * Builds a document number honoring both "branch numbering" and
 * "financial-year numbering" from the brief: `INV/MUM/2026-27/0001`
 * when a branch code is given, `INV/2026-27/0001` otherwise. The
 * *sequence* itself is a plain count — same "count existing documents
 * of this type" approach `nextQuotationNumber`/`nextBookingNumber`/
 * `nextPoNumber` already use in `apps/api` — this function only
 * formats that count into the compliant string; it doesn't own the
 * counting itself, which has to happen against the database.
 */
export function buildDocumentNumber(input: DocumentNumberInput): string {
  const padded = String(input.sequence).padStart(input.padWidth ?? 4, "0");
  const parts = input.branchCode ? [input.prefix, input.branchCode, input.financialYear, padded] : [input.prefix, input.financialYear, padded];
  return parts.join("/");
}
