export type DomainPurpose = "studio_crm" | "client_portal" | "gallery" | "enquiry_form" | "root_website";

export type DomainStatus = "pending" | "verifying" | "verified" | "active" | "failed" | "suspended";

export type DomainVerificationMethod = "txt" | "cname";

export type DomainSslStatus = "none" | "pending" | "issued" | "failed" | "expired";

export const DOMAIN_PURPOSES: DomainPurpose[] = [
  "studio_crm",
  "client_portal",
  "gallery",
  "enquiry_form",
  "root_website",
];

export const DOMAIN_PURPOSE_LABELS: Record<DomainPurpose, string> = {
  studio_crm: "Studio CRM",
  client_portal: "Client Portal",
  gallery: "Public Gallery",
  enquiry_form: "Public Enquiry Form",
  root_website: "White-label Root Website",
};
