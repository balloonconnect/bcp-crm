import { describe, expect, it } from "vitest";
import { QUEUE_DEFINITIONS, getQueueDefinition } from "../registry";

describe("QUEUE_DEFINITIONS", () => {
  it("has all 14 queues named in the brief", () => {
    expect(QUEUE_DEFINITIONS).toHaveLength(14);
  });

  it("finds a queue by key", () => {
    expect(getQueueDefinition("payment-reconciliation")?.maxAttempts).toBe(2);
  });

  it("gives write-heavy/side-effect-sensitive queues a lower retry ceiling than cheap sends", () => {
    const backup = getQueueDefinition("backup")!;
    const email = getQueueDefinition("email")!;
    expect(backup.maxAttempts).toBeLessThan(email.maxAttempts);
  });
});
