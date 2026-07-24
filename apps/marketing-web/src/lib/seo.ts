import type { Metadata } from "next";
import { SITE } from "./content";

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://bcpstudio.app";
}

export interface PageSeoInput {
  title: string;
  description: string;
  path: string; // e.g. "/pricing"
  /** Set false for pages that shouldn't be indexed (e.g. thank-you states rendered client-side aren't routes here, but kept for completeness). */
  index?: boolean;
}

/**
 * Every page builds its `<head>` metadata through this one function —
 * title template, canonical URL, and Open Graph/Twitter tags are always
 * derived the same way instead of being assembled by hand per page.
 */
export function buildMetadata({ title, description, path, index = true }: PageSeoInput): Metadata {
  const url = `${siteUrl()}${path}`;

  return {
    title: `${title} — ${SITE.name}`,
    description,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: `${title} — ${SITE.name}`,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE.name}`,
      description,
    },
  };
}

/** Structured data (schema.org) — rendered as a `<script type="application/ld+json">` via the `JsonLd` component. Kept as plain builder functions so pages compose only the schemas relevant to them. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: siteUrl(),
    description: SITE.description,
    email: SITE.supportEmail,
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SITE.description,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: "999",
      highPrice: "5999",
      offerCount: "4",
    },
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl()}${item.path}`,
    })),
  };
}
