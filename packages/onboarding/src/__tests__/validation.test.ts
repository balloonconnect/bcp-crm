import { describe, expect, it } from "vitest";
import {
  ownerAccountStepSchema,
  studioNameStepSchema,
  branchStepSchema,
  gstDetailsStepSchema,
  bankDetailsStepSchema,
  upiQrStepSchema,
  subscriptionStepSchema,
  STEP_SCHEMAS,
} from "../validation";

describe("ownerAccountStepSchema", () => {
  it("accepts a valid owner account", () => {
    const result = ownerAccountStepSchema.safeParse({ name: "Vignesh Kumar", email: "v@example.com", password: "supersecret1" });
    expect(result.success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = ownerAccountStepSchema.safeParse({ name: "V", email: "v@example.com", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("studioNameStepSchema", () => {
  it("rejects an uppercase slug", () => {
    const result = studioNameStepSchema.safeParse({ name: "Balloon Connect", slug: "Balloon-Connect" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid lowercase slug", () => {
    const result = studioNameStepSchema.safeParse({ name: "Balloon Connect", slug: "balloon-connect" });
    expect(result.success).toBe(true);
  });
});

describe("branchStepSchema", () => {
  it("requires only a name", () => {
    expect(branchStepSchema.safeParse({ name: "Main Branch" }).success).toBe(true);
  });
});

describe("gstDetailsStepSchema", () => {
  it("accepts an unregistered studio with no GSTIN", () => {
    expect(gstDetailsStepSchema.safeParse({ registered: false }).success).toBe(true);
  });

  it("validates a well-formed GSTIN", () => {
    const result = gstDetailsStepSchema.safeParse({ registered: true, gstin: "29ABCDE1234F1Z5" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed GSTIN", () => {
    const result = gstDetailsStepSchema.safeParse({ registered: true, gstin: "not-a-gstin" });
    expect(result.success).toBe(false);
  });
});

describe("bankDetailsStepSchema", () => {
  it("validates a well-formed IFSC code", () => {
    const result = bankDetailsStepSchema.safeParse({
      accountHolderName: "Balloon Connect Photography",
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed IFSC code", () => {
    const result = bankDetailsStepSchema.safeParse({
      accountHolderName: "Balloon Connect Photography",
      accountNumber: "1234567890",
      ifscCode: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("upiQrStepSchema", () => {
  it("accepts a well-formed UPI ID", () => {
    expect(upiQrStepSchema.safeParse({ upiId: "studio@okhdfcbank" }).success).toBe(true);
  });

  it("rejects a malformed UPI ID", () => {
    expect(upiQrStepSchema.safeParse({ upiId: "not-a-upi-id" }).success).toBe(false);
  });
});

describe("subscriptionStepSchema", () => {
  it("only accepts the 5 known plan keys", () => {
    expect(subscriptionStepSchema.safeParse({ planKey: "professional" }).success).toBe(true);
    expect(subscriptionStepSchema.safeParse({ planKey: "not-a-plan" }).success).toBe(false);
  });

  it("defaults billing cycle to yearly", () => {
    const result = subscriptionStepSchema.parse({ planKey: "starter" });
    expect(result.billingCycle).toBe("yearly");
  });
});

describe("STEP_SCHEMAS", () => {
  it("has an entry for every step that actually collects input", () => {
    // final_review and storage are review/informational-only, intentionally excluded
    const dataCollectingSteps = 18;
    expect(Object.keys(STEP_SCHEMAS).length).toBe(dataCollectingSteps);
  });
});
