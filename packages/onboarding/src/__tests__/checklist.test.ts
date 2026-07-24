import { describe, expect, it } from "vitest";
import { buildSetupChecklist, getOutstandingChecklistItems } from "../checklist";

describe("buildSetupChecklist", () => {
  it("returns all 20 items", () => {
    const checklist = buildSetupChecklist([], []);
    expect(checklist.length).toBe(20);
  });

  it("marks completed steps as done", () => {
    const checklist = buildSetupChecklist(["owner_account"], []);
    const item = checklist.find((i) => i.key === "owner_account")!;
    expect(item.status).toBe("done");
  });

  it("marks skipped steps as skipped", () => {
    const checklist = buildSetupChecklist([], ["logo"]);
    const item = checklist.find((i) => i.key === "logo")!;
    expect(item.status).toBe("skipped");
  });

  it("marks untouched steps as pending", () => {
    const checklist = buildSetupChecklist([], []);
    const item = checklist.find((i) => i.key === "subscription")!;
    expect(item.status).toBe("pending");
  });
});

describe("getOutstandingChecklistItems", () => {
  it("excludes done items", () => {
    const outstanding = getOutstandingChecklistItems(["owner_account"], []);
    expect(outstanding.find((i) => i.key === "owner_account")).toBeUndefined();
  });

  it("includes skipped and pending items", () => {
    const outstanding = getOutstandingChecklistItems(["owner_account"], ["logo"]);
    expect(outstanding.find((i) => i.key === "logo")?.status).toBe("skipped");
    expect(outstanding.find((i) => i.key === "subscription")?.status).toBe("pending");
  });
});
