export type QuickActionKey =
  | "add_lead"
  | "add_client"
  | "create_quotation"
  | "record_payment"
  | "create_event"
  | "upload_gallery"
  | "send_reminder"
  | "create_invoice";

export interface QuickActionDefinition {
  key: QuickActionKey;
  label: string;
  description: string;
}

/** The 8 quick actions shown on the dashboard — one registry both the desktop action bar and the mobile action sheet render from. */
export const QUICK_ACTIONS: QuickActionDefinition[] = [
  { key: "add_lead", label: "Add lead", description: "Log a new enquiry." },
  { key: "add_client", label: "Add client", description: "Add a client directly, without going through a lead." },
  { key: "create_quotation", label: "Create quotation", description: "Draft a quotation for a lead or client." },
  { key: "record_payment", label: "Record payment", description: "Log a payment against an existing invoice." },
  { key: "create_event", label: "Create event", description: "Schedule a shoot." },
  { key: "upload_gallery", label: "Upload gallery", description: "Start a gallery for a completed shoot." },
  { key: "send_reminder", label: "Send reminder", description: "Send a payment or follow-up reminder to a client." },
  { key: "create_invoice", label: "Create invoice", description: "Generate an invoice for a client or event." },
];

export const QUICK_ACTION_KEYS: QuickActionKey[] = QUICK_ACTIONS.map((a) => a.key);
