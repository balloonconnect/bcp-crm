export interface DuplicateCandidateInput {
  phone?: string | null;
  alternateMobile?: string | null;
  email?: string | null;
  instagramProfile1?: string | null;
  instagramProfile2?: string | null;
}

export interface ExistingLeadForMatching extends DuplicateCandidateInput {
  id: string;
  name: string;
}

export interface DuplicateMatch {
  lead: ExistingLeadForMatching;
  matchedOn: ("phone" | "email" | "instagram")[];
  confidence: "high" | "medium";
}

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  // Compare the last 10 digits so +91 98765 43210, 98765 43210, and
  // 09876543210 are all recognized as the same number regardless of
  // country-code or leading-zero formatting differences.
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

function normalizeEmail(value?: string | null): string | null {
  return value ? value.trim().toLowerCase() : null;
}

function normalizeInstagram(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
}

/**
 * Pure matching logic — `apps/api`'s duplicate-detection service fetches
 * candidate leads (a studio-scoped query on phone/email overlap) and
 * hands them here for the actual comparison, so the matching rules are
 * testable without a database. A phone or email match alone is "high"
 * confidence (people don't commonly share those); an Instagram-only
 * match is "medium" (shared/managed accounts happen more often for
 * event pages).
 */
export function findDuplicates(candidate: DuplicateCandidateInput, existingLeads: ExistingLeadForMatching[]): DuplicateMatch[] {
  const candidatePhones = [normalizePhone(candidate.phone), normalizePhone(candidate.alternateMobile)].filter(Boolean);
  const candidateEmail = normalizeEmail(candidate.email);
  const candidateHandles = [normalizeInstagram(candidate.instagramProfile1), normalizeInstagram(candidate.instagramProfile2)].filter(Boolean);

  const matches: DuplicateMatch[] = [];

  for (const lead of existingLeads) {
    const leadPhones = [normalizePhone(lead.phone), normalizePhone(lead.alternateMobile)].filter(Boolean);
    const leadEmail = normalizeEmail(lead.email);
    const leadHandles = [normalizeInstagram(lead.instagramProfile1), normalizeInstagram(lead.instagramProfile2)].filter(Boolean);

    const matchedOn: DuplicateMatch["matchedOn"] = [];
    if (candidatePhones.some((p) => leadPhones.includes(p))) matchedOn.push("phone");
    if (candidateEmail && leadEmail === candidateEmail) matchedOn.push("email");
    if (candidateHandles.some((h) => leadHandles.includes(h))) matchedOn.push("instagram");

    if (matchedOn.length === 0) continue;

    const confidence: DuplicateMatch["confidence"] = matchedOn.includes("phone") || matchedOn.includes("email") ? "high" : "medium";
    matches.push({ lead, matchedOn, confidence });
  }

  // High-confidence matches first.
  return matches.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === "high" ? -1 : 1));
}
