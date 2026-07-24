export interface LabExportLineItem {
  orderItemId: string;
  productName: string;
  size: string | null;
  finish: string | null;
  quantity: number;
  originalFileKey: string | null; // "Original download for lab fulfilment" — the true original a print/canvas/frame/acrylic lab needs, resolved from GalleryPhoto.fileKey, never a compressed/watermarked variant
}

/** "Lab export" — a plain CSV a print lab can load directly, one row per order item. Every photo-based line item carries its true original storage key (resolved by the caller from `GalleryPhoto.fileKey`) — a lab producing a physical print from a compressed or watermarked file would be a real quality defect, not a cosmetic one. */
export function buildLabExportCsv(orderNumber: string, items: LabExportLineItem[]): string {
  const header = "Order,Item,Product,Size,Finish,Quantity,OriginalFile";
  const rows = items.map((item) => [orderNumber, item.orderItemId, item.productName, item.size ?? "", item.finish ?? "", item.quantity, item.originalFileKey ?? "MISSING"].join(","));
  return [header, ...rows].join("\n");
}
