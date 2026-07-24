import { describe, expect, it } from "vitest";
import { leadInputSchema, leadStatusChangeSchema, bulkAssignSchema, bulkStatusSchema } from "../validation";

describe("leadInputSchema", () => {
  it("accepts a minimal lead with just a name", () => {
    expect(leadInputSchema.safeParse({ name: "Ananya" }).success).toBe(true);
  });

  it("accepts a fully populated lead", () => {
    const result = leadInputSchema.safeParse({
      name: "Ananya & Rohit",
      brideName: "Ananya",
      groomName: "Rohit",
      phone: "+919800000001",
      email: "ananya@example.com",
      eventType: "wedding",
      eventDate: new Date().toISOString(),
      budget: 500000,
      priority: "high",
      source: "referral",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(leadInputSchema.safeParse({ name: "X", email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    expect(leadInputSchema.safeParse({ name: "X", priority: "urgent-ish" }).success).toBe(false);
  });
});

describe("leadStatusChangeSchema", () => {
  it("accepts a known pipeline status", () => {
    expect(leadStatusChangeSchema.safeParse({ status: "qualified" }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(leadStatusChangeSchema.safeParse({ status: "quoted" }).success).toBe(false);
  });
});

describe("bulk schemas", () => {
  it("bulkAssignSchema requires at least one lead id", () => {
    expect(bulkAssignSchema.safeParse({ leadIds: [], assignedTo: "00000000-0000-0000-0000-000000000000" }).success).toBe(false);
  });

  it("bulkStatusSchema accepts a valid batch", () => {
    const result = bulkStatusSchema.safeParse({ leadIds: ["00000000-0000-0000-0000-000000000000"], status: "won" });
    expect(result.success).toBe(true);
  });
});
