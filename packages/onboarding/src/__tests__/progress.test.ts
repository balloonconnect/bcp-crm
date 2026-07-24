import { describe, expect, it } from "vitest";
import { computeProgress, canSkipStep, assertCanSkipStep, RequiredStepCannotBeSkippedError } from "../progress";

describe("computeProgress", () => {
  it("is 0% with nothing done", () => {
    const progress = computeProgress([], []);
    expect(progress.percentComplete).toBe(0);
    expect(progress.nextStep).toBe("owner_account");
    expect(progress.isComplete).toBe(false);
  });

  it("counts skipped optional steps toward percent complete", () => {
    const progress = computeProgress(["owner_account", "studio_name"], ["business_info"]);
    expect(progress.completedCount).toBe(2);
    expect(progress.skippedCount).toBe(1);
    expect(progress.percentComplete).toBe(15); // 3/20 = 15%
  });

  it("reports outstanding required steps", () => {
    const progress = computeProgress(["owner_account", "studio_name"], []);
    expect(progress.outstandingRequiredSteps).toContain("branch");
    expect(progress.outstandingRequiredSteps).toContain("subscription");
    expect(progress.outstandingRequiredSteps).not.toContain("owner_account");
  });

  it("is complete only once every required step is completed and all 20 accounted for", () => {
    const allStepKeys = [
      "owner_account", "studio_name", "business_info", "branch", "logo", "brand_colors",
      "gst_details", "bank_details", "upi_qr", "email_setup", "whatsapp_setup", "team_invitation",
      "services", "packages", "customer_import", "storage", "payment_gateway", "custom_domain",
      "subscription", "final_review",
    ];
    const required = ["owner_account", "studio_name", "branch", "subscription", "final_review"];
    const optional = allStepKeys.filter((k) => !required.includes(k));

    const progress = computeProgress(required, optional);
    expect(progress.isComplete).toBe(true);
    expect(progress.percentComplete).toBe(100);
  });
});

describe("canSkipStep / assertCanSkipStep", () => {
  it("allows skipping an optional step", () => {
    expect(canSkipStep("logo")).toBe(true);
    expect(() => assertCanSkipStep("logo")).not.toThrow();
  });

  it("disallows skipping a required step", () => {
    expect(canSkipStep("owner_account")).toBe(false);
    expect(() => assertCanSkipStep("owner_account")).toThrow(RequiredStepCannotBeSkippedError);
  });
});
