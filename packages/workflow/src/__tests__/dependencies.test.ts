import { describe, expect, it } from "vitest";
import { isTaskUnblocked, detectDependencyCycle } from "../dependencies";

describe("isTaskUnblocked", () => {
  it("treats a task with no dependencies as unblocked", () => {
    const task = { id: "a", status: "pending", dependsOnTaskIds: [] };
    expect(isTaskUnblocked(task, new Map())).toBe(true);
  });

  it("is blocked while any dependency is not completed", () => {
    const dep = { id: "b", status: "in_progress", dependsOnTaskIds: [] };
    const task = { id: "a", status: "pending", dependsOnTaskIds: ["b"] };
    expect(isTaskUnblocked(task, new Map([["b", dep]]))).toBe(false);
  });

  it("is unblocked once every dependency is completed", () => {
    const dep1 = { id: "b", status: "completed", dependsOnTaskIds: [] };
    const dep2 = { id: "c", status: "completed", dependsOnTaskIds: [] };
    const task = { id: "a", status: "pending", dependsOnTaskIds: ["b", "c"] };
    expect(isTaskUnblocked(task, new Map([["b", dep1], ["c", dep2]]))).toBe(true);
  });

  it("does not treat a cancelled dependency as satisfying the dependency", () => {
    const dep = { id: "b", status: "cancelled", dependsOnTaskIds: [] };
    const task = { id: "a", status: "pending", dependsOnTaskIds: ["b"] };
    expect(isTaskUnblocked(task, new Map([["b", dep]]))).toBe(false);
  });
});

describe("detectDependencyCycle", () => {
  it("finds no cycle in a linear chain", () => {
    const templates = [
      { id: "a", dependsOnTaskTemplateIds: [] },
      { id: "b", dependsOnTaskTemplateIds: ["a"] },
      { id: "c", dependsOnTaskTemplateIds: ["b"] },
    ];
    expect(detectDependencyCycle(templates).hasCycle).toBe(false);
  });

  it("detects a direct two-node cycle", () => {
    const templates = [
      { id: "a", dependsOnTaskTemplateIds: ["b"] },
      { id: "b", dependsOnTaskTemplateIds: ["a"] },
    ];
    expect(detectDependencyCycle(templates).hasCycle).toBe(true);
  });

  it("detects an indirect three-node cycle", () => {
    const templates = [
      { id: "a", dependsOnTaskTemplateIds: ["b"] },
      { id: "b", dependsOnTaskTemplateIds: ["c"] },
      { id: "c", dependsOnTaskTemplateIds: ["a"] },
    ];
    expect(detectDependencyCycle(templates).hasCycle).toBe(true);
  });

  it("does not flag a diamond dependency shape as a cycle", () => {
    const templates = [
      { id: "a", dependsOnTaskTemplateIds: [] },
      { id: "b", dependsOnTaskTemplateIds: ["a"] },
      { id: "c", dependsOnTaskTemplateIds: ["a"] },
      { id: "d", dependsOnTaskTemplateIds: ["b", "c"] },
    ];
    expect(detectDependencyCycle(templates).hasCycle).toBe(false);
  });
});
