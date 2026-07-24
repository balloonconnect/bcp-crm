import { describe, expect, it } from "vitest";
import { AUTOMATION_TRIGGERS, getTriggerDefinition } from "../triggers";
import { AUTOMATION_ACTIONS, getActionDefinition, isBranchAction } from "../actions";

describe("AUTOMATION_TRIGGERS", () => {
  it("has all 16 triggers named in the brief", () => {
    expect(AUTOMATION_TRIGGERS).toHaveLength(16);
  });

  it("finds a trigger by key", () => {
    expect(getTriggerDefinition("payment_overdue")?.entityType).toBe("Invoice");
  });
});

describe("AUTOMATION_ACTIONS", () => {
  it("has all 11 actions named in the brief", () => {
    expect(AUTOMATION_ACTIONS).toHaveLength(11);
  });

  it("finds an action by key", () => {
    expect(getActionDefinition("send_whatsapp")?.label).toBe("Send WhatsApp");
  });
});

describe("isBranchAction", () => {
  it("identifies condition_branch as the one branching action", () => {
    expect(isBranchAction("condition_branch")).toBe(true);
    expect(isBranchAction("send_email")).toBe(false);
  });
});
