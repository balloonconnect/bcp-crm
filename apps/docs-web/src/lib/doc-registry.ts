export interface DocEntry {
  slug: string;
  title: string;
  category: string;
}

/** The 25 documents named in the brief, grouped for the sidebar. Each `slug` maps directly to `content/<slug>.md`. */
export const DOC_REGISTRY: DocEntry[] = [
  // Getting started
  { slug: "product-overview", title: "Product Overview", category: "Getting Started" },
  { slug: "architecture", title: "Architecture", category: "Getting Started" },
  { slug: "database", title: "Database", category: "Getting Started" },
  { slug: "local-setup", title: "Local Setup", category: "Getting Started" },
  { slug: "production-deployment", title: "Production Deployment", category: "Getting Started" },
  { slug: "environment-variables", title: "Environment Variables", category: "Getting Started" },

  // Guides by role
  { slug: "platform-admin-guide", title: "Platform Admin Guide", category: "Guides" },
  { slug: "studio-owner-guide", title: "Studio Owner Guide", category: "Guides" },
  { slug: "team-guide", title: "Team Guide", category: "Guides" },
  { slug: "client-guide", title: "Client Guide", category: "Guides" },

  // Feature guides
  { slug: "gallery-guide", title: "Gallery Guide", category: "Feature Guides" },
  { slug: "enquiry-form-guide", title: "Enquiry Form Guide", category: "Feature Guides" },
  { slug: "quotation-guide", title: "Quotation Guide", category: "Feature Guides" },
  { slug: "billing-guide", title: "Billing Guide", category: "Feature Guides" },

  // Integration setup
  { slug: "whatsapp-setup", title: "WhatsApp Setup", category: "Integration Setup" },
  { slug: "email-setup", title: "Email Setup", category: "Integration Setup" },
  { slug: "payment-setup", title: "Payment Setup", category: "Integration Setup" },
  { slug: "aws-rekognition-setup", title: "AWS Rekognition Setup", category: "Integration Setup" },
  { slug: "storage-setup", title: "Storage Setup", category: "Integration Setup" },
  { slug: "custom-domain-setup", title: "Custom Domain Setup", category: "Integration Setup" },
  { slug: "subscription-setup", title: "Subscription Setup", category: "Integration Setup" },
  { slug: "license-setup", title: "License Setup", category: "Integration Setup" },

  // Operations
  { slug: "backup-and-restore", title: "Backup and Restore", category: "Operations" },
  { slug: "security", title: "Security", category: "Operations" },

  // Reference
  { slug: "api-documentation", title: "API Documentation", category: "Reference" },
  { slug: "troubleshooting", title: "Troubleshooting", category: "Reference" },
];

export function getDocEntry(slug: string): DocEntry | undefined {
  return DOC_REGISTRY.find((d) => d.slug === slug);
}

export function groupDocsByCategory(): Record<string, DocEntry[]> {
  const grouped: Record<string, DocEntry[]> = {};
  for (const doc of DOC_REGISTRY) {
    grouped[doc.category] = grouped[doc.category] ?? [];
    grouped[doc.category]!.push(doc);
  }
  return grouped;
}
