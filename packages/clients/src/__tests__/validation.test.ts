import { describe, expect, it } from "vitest";
import { clientInputSchema, familyContactSchema, feedbackSchema } from "../validation";

describe("clientInputSchema", () => {
  it("accepts a minimal client with just a name", () => {
    expect(clientInputSchema.safeParse({ name: "Ananya" }).success).toBe(true);
  });

  it("validates a well-formed GSTIN", () => {
    expect(clientInputSchema.safeParse({ name: "X", gstin: "29ABCDE1234F1Z5" }).success).toBe(true);
  });

  it("rejects a malformed GSTIN", () => {
    expect(clientInputSchema.safeParse({ name: "X", gstin: "not-a-gstin" }).success).toBe(false);
  });
});

describe("familyContactSchema", () => {
  it("requires only a name", () => {
    expect(familyContactSchema.safeParse({ name: "Priya's mother" }).success).toBe(true);
  });
});

describe("feedbackSchema", () => {
  it("accepts a rating from 1 to 5", () => {
    expect(feedbackSchema.safeParse({ rating: 5 }).success).toBe(true);
  });

  it("rejects a rating out of range", () => {
    expect(feedbackSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(feedbackSchema.safeParse({ rating: 0 }).success).toBe(false);
  });
});
