import { describe, expect, it } from "vitest";
import { buildClientSummary, recommendNextAction } from "../ai";

describe("buildClientSummary", () => {
  it("mentions lifetime value and event count when there are completed events", () => {
    const summary = buildClientSummary({ name: "Priya", completedEventsCount: 2, upcomingEventsCount: 0, lifetimeValue: 500000, outstandingAmount: 0, relationshipScore: 80, lastCommunicationDaysAgo: 3 });
    expect(summary).toContain("2 completed shoots");
    expect(summary).toContain("₹5,000");
  });

  it("mentions no shoots yet for a brand-new client", () => {
    const summary = buildClientSummary({ name: "Rohit", completedEventsCount: 0, upcomingEventsCount: 0, lifetimeValue: 0, outstandingAmount: 0, relationshipScore: 50, lastCommunicationDaysAgo: null });
    expect(summary).toContain("hasn't completed a shoot yet");
  });

  it("mentions outstanding balance when present", () => {
    const summary = buildClientSummary({ name: "Ananya", completedEventsCount: 1, upcomingEventsCount: 0, lifetimeValue: 100000, outstandingAmount: 50000, relationshipScore: 60, lastCommunicationDaysAgo: 1 });
    expect(summary).toContain("outstanding");
  });
});

describe("recommendNextAction", () => {
  it("prioritizes an overdue invoice above everything else", () => {
    const result = recommendNextAction({ hasOverdueInvoice: true, hasPendingQuotation: true, upcomingEventInNext7Days: true, galleryPendingDelivery: true, lastCommunicationDaysAgo: 100 });
    expect(result.priority).toBe("high");
    expect(result.action).toContain("overdue");
  });

  it("prioritizes an imminent shoot over a pending quotation", () => {
    const result = recommendNextAction({ hasOverdueInvoice: false, hasPendingQuotation: true, upcomingEventInNext7Days: true, galleryPendingDelivery: false, lastCommunicationDaysAgo: null });
    expect(result.action).toContain("upcoming shoot");
  });

  it("suggests nothing urgent when everything is quiet and recent", () => {
    const result = recommendNextAction({ hasOverdueInvoice: false, hasPendingQuotation: false, upcomingEventInNext7Days: false, galleryPendingDelivery: false, lastCommunicationDaysAgo: 5 });
    expect(result.priority).toBe("low");
  });

  it("suggests checking in after a long silence", () => {
    const result = recommendNextAction({ hasOverdueInvoice: false, hasPendingQuotation: false, upcomingEventInNext7Days: false, galleryPendingDelivery: false, lastCommunicationDaysAgo: 90 });
    expect(result.action).toContain("check in");
  });
});
