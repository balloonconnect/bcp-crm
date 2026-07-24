export interface ClientSummaryInput {
  name: string;
  completedEventsCount: number;
  upcomingEventsCount: number;
  lifetimeValue: number; // paise
  outstandingAmount: number; // paise
  relationshipScore: number;
  lastCommunicationDaysAgo: number | null;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/** A one-paragraph, template-generated summary — deliberately plain sentences built from real numbers, not a language model call, so it's exact and free to compute on every page load. See scoring.ts's file-level note on why this is a heuristic in this phase. */
export function buildClientSummary(input: ClientSummaryInput): string {
  const parts: string[] = [];

  parts.push(
    input.completedEventsCount > 0
      ? `${input.name} has booked ${input.completedEventsCount} completed shoot${input.completedEventsCount === 1 ? "" : "s"} with a lifetime value of ${formatRupees(input.lifetimeValue)}.`
      : `${input.name} hasn't completed a shoot yet.`,
  );

  if (input.upcomingEventsCount > 0) {
    parts.push(`${input.upcomingEventsCount} upcoming event${input.upcomingEventsCount === 1 ? " is" : "s are"} scheduled.`);
  }

  if (input.outstandingAmount > 0) {
    parts.push(`${formatRupees(input.outstandingAmount)} is currently outstanding.`);
  }

  if (input.lastCommunicationDaysAgo !== null) {
    parts.push(`Last contacted ${input.lastCommunicationDaysAgo} day${input.lastCommunicationDaysAgo === 1 ? "" : "s"} ago.`);
  }

  parts.push(`Relationship score: ${input.relationshipScore}/100.`);

  return parts.join(" ");
}

export interface NextActionInput {
  hasOverdueInvoice: boolean;
  hasPendingQuotation: boolean;
  upcomingEventInNext7Days: boolean;
  galleryPendingDelivery: boolean;
  lastCommunicationDaysAgo: number | null;
}

export interface NextActionResult {
  action: string;
  priority: "high" | "medium" | "low";
}

/** Priority-ordered rules, first match wins — money and imminent shoots outrank a general "haven't spoken in a while" nudge. */
export function recommendNextAction(input: NextActionInput): NextActionResult {
  if (input.hasOverdueInvoice) return { action: "Follow up on the overdue balance.", priority: "high" };
  if (input.upcomingEventInNext7Days) return { action: "Confirm final details ahead of the upcoming shoot.", priority: "high" };
  if (input.hasPendingQuotation) return { action: "Follow up on the quotation sent.", priority: "medium" };
  if (input.galleryPendingDelivery) return { action: "Deliver the finished gallery.", priority: "medium" };
  if (input.lastCommunicationDaysAgo !== null && input.lastCommunicationDaysAgo > 60) {
    return { action: "It's been a while — check in.", priority: "low" };
  }
  return { action: "No action needed right now.", priority: "low" };
}
