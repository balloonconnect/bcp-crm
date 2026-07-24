/** A plain sequential order number — "ORD-0001" — the same "count existing, then format" convention every other numbered document in this codebase (Quotation, Booking, PurchaseOrder, Invoice) already uses. */
export function buildOrderNumber(sequence: number): string {
  return `ORD-${String(sequence).padStart(5, "0")}`;
}
