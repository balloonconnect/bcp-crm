export const PRODUCT_CATEGORIES = [
  { key: "softcopy", label: "Softcopy" },
  { key: "print", label: "Print" },
  { key: "album", label: "Album" },
  { key: "frame", label: "Frame" },
  { key: "canvas", label: "Canvas" },
  { key: "acrylic", label: "Acrylic" },
  { key: "calendar", label: "Calendar" },
  { key: "photo_book", label: "Photo book" },
  { key: "gift", label: "Gift" },
] as const;

export type ProductCategoryKey = (typeof PRODUCT_CATEGORIES)[number]["key"];
