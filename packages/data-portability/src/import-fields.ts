export interface ImportFieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date" | "email" | "phone";
}

/**
 * "Column mapping" needs to know what it's mapping *to* — one field
 * registry per importable entity, each field flagged required or
 * optional so "Validation" has a concrete rule to check a mapped row
 * against, independent of whatever a source CSV happened to name its
 * own columns.
 */
export const IMPORT_FIELD_DEFINITIONS: Record<string, ImportFieldDefinition[]> = {
  leads: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "phone", label: "Phone", required: true, type: "phone" },
    { key: "email", label: "Email", required: false, type: "email" },
    { key: "eventType", label: "Event Type", required: false, type: "string" },
    { key: "source", label: "Source", required: false, type: "string" },
  ],
  clients: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "phone", label: "Phone", required: true, type: "phone" },
    { key: "email", label: "Email", required: false, type: "email" },
  ],
  packages: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "eventType", label: "Event Type", required: true, type: "string" },
    { key: "price", label: "Price", required: true, type: "number" },
  ],
  services: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "price", label: "Price", required: true, type: "number" },
  ],
  payments: [
    { key: "amount", label: "Amount", required: true, type: "number" },
    { key: "method", label: "Method", required: true, type: "string" },
    { key: "paidAt", label: "Paid Date", required: false, type: "date" },
    { key: "invoiceNumber", label: "Invoice Number", required: true, type: "string" },
  ],
  vendors: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "phone", label: "Phone", required: false, type: "phone" },
    { key: "category", label: "Category", required: false, type: "string" },
  ],
  equipment: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "category", label: "Category", required: false, type: "string" },
    { key: "serialNumber", label: "Serial Number", required: false, type: "string" },
  ],
  gallery_metadata: [
    { key: "galleryTitle", label: "Gallery Title", required: true, type: "string" },
    { key: "photoFileName", label: "Photo File Name", required: true, type: "string" },
    { key: "category", label: "Category", required: false, type: "string" },
  ],
};

export function getImportFields(entityType: string): ImportFieldDefinition[] {
  return IMPORT_FIELD_DEFINITIONS[entityType] ?? [];
}
