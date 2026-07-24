/**
 * The suggested clause types named in the brief — a registry for the
 * template-builder UI, not a fixed schema. A `ContractTemplate`'s
 * `sections` field can include any of these types, several of them,
 * or a `custom` one a studio writes itself; nothing here forces a
 * template to have all six, since not every contract needs a model
 * release (a corporate headshot day, say, is unlikely to need one the
 * way a wedding portrait session would).
 */
export const CONTRACT_CLAUSE_TYPES = [
  { key: "event_details", label: "Event details" },
  { key: "payment_terms", label: "Payment terms" },
  { key: "cancellation_terms", label: "Cancellation terms" },
  { key: "delivery_terms", label: "Delivery terms" },
  { key: "copyright_terms", label: "Copyright terms" },
  { key: "model_release", label: "Model release" },
  { key: "privacy_consent", label: "Privacy consent" },
  { key: "custom", label: "Custom clause" },
] as const;

export type ContractClauseType = (typeof CONTRACT_CLAUSE_TYPES)[number]["key"];

export interface ContractSection {
  type: ContractClauseType;
  title: string;
  content: string;
}
