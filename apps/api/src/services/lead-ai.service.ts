import { prisma } from "@bcp/database";
import { computeLeadScore, predictBudget, suggestPackage, type LeadStatus, type LeadPriority } from "@bcp/leads";
import { getStudioSetting } from "./studio-settings.service";

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getLeadScore(studioId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, studioId, deletedAt: null } });
  if (!lead) return null;

  const lastCommunication = await prisma.leadCommunication.findFirst({ where: { studioId, leadId }, orderBy: { occurredAt: "desc" } });

  return computeLeadScore({
    status: lead.status as LeadStatus,
    priority: lead.priority as LeadPriority,
    source: lead.source,
    hasPhone: Boolean(lead.phone),
    hasEmail: Boolean(lead.email),
    hasBudget: Boolean(lead.budget),
    hasEventDate: Boolean(lead.eventDate),
    daysSinceLastContact: daysSince(lastCommunication?.occurredAt ?? null),
  });
}

export async function getBudgetPrediction(studioId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, studioId, deletedAt: null } });
  if (!lead) return null;

  // "Won" is the closed-and-successful stage; only those leads' figures
  // are a fair signal for what a *converting* enquiry typically spends.
  const wonLeads = await prisma.lead.findMany({
    where: { studioId, status: "won", deletedAt: null, OR: [{ expectedValue: { not: null } }, { budget: { not: null } }] },
    select: { eventType: true, expectedValue: true, budget: true },
    take: 200,
  });

  const historical = wonLeads
    .map((l: { eventType: string | null; expectedValue: number | null; budget: number | null }) => ({ eventType: l.eventType, amount: l.expectedValue ?? l.budget ?? 0 }))
    .filter((l: { amount: number }) => l.amount > 0);

  return predictBudget(lead.eventType, historical);
}

export async function getPackageSuggestion(studioId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, studioId, deletedAt: null } });
  if (!lead) return null;

  const packagesSetting = await getStudioSetting(studioId, "packages");
  const packages = ((packagesSetting?.value as { packages?: { name: string; price: number }[] } | undefined)?.packages ?? []).map((p) => ({
    name: p.name,
    price: p.price,
  }));

  return suggestPackage(lead.expectedValue ?? lead.budget ?? null, packages);
}
