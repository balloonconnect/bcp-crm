import { describe, expect, it } from "vitest";
import { bookingStatusChangeSchema, bookingUpdateSchema, teamAssignmentSchema } from "../validation";

describe("bookingStatusChangeSchema", () => {
  it("accepts a known status", () => {
    expect(bookingStatusChangeSchema.safeParse({ status: "confirmed" }).success).toBe(true);
  });
  it("rejects an unknown status", () => {
    expect(bookingStatusChangeSchema.safeParse({ status: "bogus" }).success).toBe(false);
  });
});

describe("bookingUpdateSchema", () => {
  it("accepts a partial update", () => {
    expect(bookingUpdateSchema.safeParse({ notes: "Client prefers morning shoots" }).success).toBe(true);
  });
});

describe("teamAssignmentSchema", () => {
  it("requires a valid studioUserId", () => {
    expect(teamAssignmentSchema.safeParse({ studioUserId: "not-a-uuid" }).success).toBe(false);
    expect(teamAssignmentSchema.safeParse({ studioUserId: "00000000-0000-0000-0000-000000000000", role: "Lead photographer" }).success).toBe(true);
  });
});
