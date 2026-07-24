/**
 * Single source of truth for marketing copy — every page pulls from
 * here rather than hardcoding feature names, plan prices, or nav labels
 * in multiple places. Keeps the site's claims consistent (e.g. the same
 * 11 key sections named the same way everywhere they appear).
 */

export const SITE = {
  name: "BCP Studio OS",
  tagline: "Run Your Entire Photography Studio From One Platform.",
  description:
    "The white-label CRM, AI photo intelligence, client gallery, and album selection platform built for photography studios — with zero commission and your own domain.",
  supportEmail: "hello@bcpstudio.app",
};

export interface NavLink {
  label: string;
  href: string;
}

export const PRIMARY_NAV: NavLink[] = [
  { label: "Features", href: "/features" },
  { label: "AI Features", href: "/ai-features" },
  { label: "CRM", href: "/crm" },
  { label: "Gallery", href: "/gallery" },
  { label: "Pricing", href: "/pricing" },
  { label: "White Label", href: "/white-label" },
];

export const FOOTER_NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "AI Features", href: "/ai-features" },
      { label: "CRM", href: "/crm" },
      { label: "Photo Delivery", href: "/photo-delivery" },
      { label: "Gallery", href: "/gallery" },
      { label: "Album Selection", href: "/album-selection" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "White Label", href: "/white-label" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Book a demo", href: "/book-demo" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Refund policy", href: "/refund-policy" },
    ],
  },
];

export interface KeySection {
  slug: string;
  frameNumber: string; // contact-sheet frame label, e.g. "04A"
  name: string;
  tagline: string;
  description: string;
  specTag: string; // small mono "exposure" tag, e.g. "F/1.4 · REAL-TIME"
  /** The product page this section is detailed on — several sections share a page (e.g. AI Face Search and AI Photo Intelligence both live on /ai-features). */
  pageHref: string;
}

/** The 11 key sections named in the brief — every product page draws from this list rather than restating feature names with different wording. */
export const KEY_SECTIONS: KeySection[] = [
  {
    slug: "crm",
    frameNumber: "01A",
    name: "Complete Studio CRM",
    tagline: "Leads, bookings, and shoots in one pipeline.",
    description:
      "Track every enquiry from first message to delivered album — leads, quotations, bookings, shoot schedules, and payments in a single connected pipeline instead of scattered spreadsheets.",
    specTag: "F/2.8 · PIPELINE",
      pageHref: "/crm",
  },
  {
    slug: "ai-face-search",
    frameNumber: "02A",
    name: "AI Face Search",
    tagline: "Clients find their photos by face, not folder.",
    description:
      "Guests search a gallery of thousands of event photos for the ones they're actually in, in seconds — no more scrolling through hundreds of frames to find themselves.",
    specTag: "ISO 400 · AI",
      pageHref: "/ai-features",
  },
  {
    slug: "ai-photo-intelligence",
    frameNumber: "03A",
    name: "AI Photo Intelligence",
    tagline: "Auto-tagging, culling, and quality scoring.",
    description:
      "Automatic tagging by scene and moment, duplicate and blink detection, and quality scoring speed up culling thousands of shoot frames down to the best ones.",
    specTag: "1/250 · AUTO-CULL",
      pageHref: "/ai-features",
  },
  {
    slug: "quotations-invoices",
    frameNumber: "04A",
    name: "Quotations and Invoices",
    tagline: "GST-ready quotes clients can accept online.",
    description:
      "Branded, GST-ready quotations clients can review and accept online, converting straight into a booking — with invoices and UPI QR codes generated automatically.",
    specTag: "F/4 · GST-READY",
      pageHref: "/crm",
  },
  {
    slug: "event-management",
    frameNumber: "05A",
    name: "Event Management",
    tagline: "Every shoot day, scheduled and staffed.",
    description:
      "Shoot schedules, shot lists, team assignments, and equipment checklists for every event — maternity, baby, birthday, housewarming, or wedding — in one calendar.",
    specTag: "1/125 · SCHEDULING",
      pageHref: "/crm",
  },
  {
    slug: "client-gallery",
    frameNumber: "06A",
    name: "Client Gallery",
    tagline: "A branded gallery clients actually enjoy.",
    description:
      "Fast, watermarked, mobile-friendly galleries under your own brand — with favoriting, commenting, and direct social sharing built in.",
    specTag: "F/2 · DELIVERY",
      pageHref: "/gallery",
  },
  {
    slug: "album-selection",
    frameNumber: "07A",
    name: "Album Selection",
    tagline: "Clients pick their favorites, you get sign-off.",
    description:
      "Clients shortlist and arrange their favorite frames into an album online, with page-count and extra-sheet pricing calculated automatically before you go to print.",
    specTag: "F/5.6 · SELECTION",
      pageHref: "/album-selection",
  },
  {
    slug: "whatsapp-automation",
    frameNumber: "08A",
    name: "WhatsApp Automation",
    tagline: "Reminders and updates, sent automatically.",
    description:
      "Booking confirmations, payment reminders, shoot-day check-ins, and gallery-ready notifications sent automatically over WhatsApp Business — the channel your clients already check.",
    specTag: "1/500 · AUTOMATED",
      pageHref: "/features",
  },
  {
    slug: "white-label-domains",
    frameNumber: "09A",
    name: "White-label Custom Domains",
    tagline: "Your brand, your domain, not ours.",
    description:
      "Run your CRM, client portal, and galleries on your own domain with your own logo and colors — clients never see BCP Studio OS.",
    specTag: "F/8 · YOUR BRAND",
      pageHref: "/white-label",
  },
  {
    slug: "zero-commission",
    frameNumber: "10A",
    name: "Zero Commission",
    tagline: "You keep 100% of what you earn.",
    description:
      "A flat subscription, never a cut of your bookings. What a client pays you is what you keep — we don't sit in the middle of your payments.",
    specTag: "F/1.4 · 100% YOURS",
      pageHref: "/pricing",
  },
  {
    slug: "multi-branch",
    frameNumber: "11A",
    name: "Multi-branch Management",
    tagline: "One account, every branch, one view.",
    description:
      "Run multiple studio locations from a single account, with per-branch calendars, teams, and reporting rolled up into one owner's-eye view.",
    specTag: "F/11 · MULTI-SITE",
      pageHref: "/features",
  },
];

export function getKeySection(slug: string): KeySection {
  const section = KEY_SECTIONS.find((s) => s.slug === slug);
  if (!section) throw new Error(`Unknown key section: "${slug}"`);
  return section;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const GENERAL_FAQS: FaqItem[] = [
  {
    question: "Do you take a commission on my bookings?",
    answer:
      "No. BCP Studio OS is a flat monthly or yearly subscription. Whatever a client pays you for a shoot is entirely yours — we never sit in the payment flow or take a cut.",
  },
  {
    question: "Can I use my own domain and branding?",
    answer:
      "Yes, on every paid plan. Your CRM, client portal, and galleries can run on your own domain with your logo, colors, and email sender identity — clients never see the BCP Studio OS name.",
  },
  {
    question: "How does AI face search work for clients?",
    answer:
      "After a shoot's photos are uploaded, guests open your gallery, take or upload a selfie, and the gallery instantly filters to the frames they appear in — no manual tagging required.",
  },
  {
    question: "Can I manage more than one studio location?",
    answer:
      "Yes. Multi-branch management is included from the Professional plan up — each branch gets its own calendar and team, rolled up into one account-level view for you.",
  },
  {
    question: "Is GST invoicing supported?",
    answer:
      "Yes. Add your GSTIN once in setup and every quotation and invoice generated from the platform is GST-ready automatically, with UPI QR codes for easy client payment.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "You can export your client list, bookings, and galleries at any time. If you cancel, your account moves to a 30-day read-only window before data is removed — see our refund policy for details.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Every new studio starts on a 14-day trial of the Starter plan automatically when you sign up — no credit card required to begin setup.",
  },
];

export interface TestimonialPlaceholder {
  quotePlaceholder: string;
  namePlaceholder: string;
  rolePlaceholder: string;
}

/**
 * Deliberately unfilled — this is a template for real studio quotes to
 * be dropped in later, not fabricated praise. Each entry documents what
 * kind of studio the slot is reserved for, so whoever fills them in
 * knows what mix to collect (different shoot specialties, different
 * studio sizes).
 */
export const TESTIMONIAL_PLACEHOLDERS: TestimonialPlaceholder[] = [
  { quotePlaceholder: "Quote pending — maternity & baby studio, single location", namePlaceholder: "Studio owner name", rolePlaceholder: "Owner, [Studio name]" },
  { quotePlaceholder: "Quote pending — multi-branch event photography studio", namePlaceholder: "Studio owner name", rolePlaceholder: "Founder, [Studio name]" },
  { quotePlaceholder: "Quote pending — wedding & birthday photography studio", namePlaceholder: "Studio owner name", rolePlaceholder: "Owner, [Studio name]" },
];

export const TRUST_STATS: { value: string; label: string }[] = [
  { value: "0%", label: "commission on bookings" },
  { value: "14-day", label: "free trial, no card required" },
  { value: "5 min", label: "average guided setup to first branch" },
];
