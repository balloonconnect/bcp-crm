import { describe, expect, it } from "vitest";
import { workflowTemplateInputSchema, taskTemplateInputSchema, taskInputSchema, taskStatusChangeSchema, taskApprovalSchema } from "../validation";

describe("workflowTemplateInputSchema", () => {
  it("accepts a minimal template", () => {
    expect(workflowTemplateInputSchema.safeParse({ name: "Wedding Workflow" }).success).toBe(true);
  });

  it("accepts an event-type-scoped template", () => {
    expect(workflowTemplateInputSchema.safeParse({ name: "Birthday Workflow", eventType: "Birthday" }).success).toBe(true);
  });
});

describe("taskTemplateInputSchema", () => {
  it("accepts a minimal task template", () => {
    expect(taskTemplateInputSchema.safeParse({ stageKey: "shoot", name: "Shoot day" }).success).toBe(true);
  });

  it("accepts a recurring task template", () => {
    const result = taskTemplateInputSchema.safeParse({ stageKey: "backup", name: "Weekly backup check", isRecurring: true, recurrenceFrequency: "weekly", recurrenceInterval: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown priority", () => {
    expect(taskTemplateInputSchema.safeParse({ stageKey: "shoot", name: "X", priority: "urgent-ish" }).success).toBe(false);
  });
});

describe("taskInputSchema", () => {
  it("accepts a minimal ad-hoc task", () => {
    expect(taskInputSchema.safeParse({ title: "Call the client" }).success).toBe(true);
  });
});

describe("taskStatusChangeSchema / taskApprovalSchema", () => {
  it("accepts a known status", () => {
    expect(taskStatusChangeSchema.safeParse({ status: "in_progress" }).success).toBe(true);
  });
  it("rejects an unknown status", () => {
    expect(taskStatusChangeSchema.safeParse({ status: "bogus" }).success).toBe(false);
  });
  it("accepts an approval decision", () => {
    expect(taskApprovalSchema.safeParse({ decision: "approved" }).success).toBe(true);
  });
});
