import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import type { verifyWebhookChallenge as VerifyWebhookChallengeFn } from "../services/whatsapp-webhook.service";

const findFirstMock = vi.fn();
vi.mock("@bcp/database", () => ({ prisma: { whatsAppConfig: { findFirst: (...args: unknown[]) => findFirstMock(...args) } } }));

let verifyWebhookChallenge: typeof VerifyWebhookChallengeFn;

beforeAll(async () => {
  // Imported after the mock so the module under test picks up the mocked @bcp/database.
  ({ verifyWebhookChallenge } = await import("../services/whatsapp-webhook.service"));
});

describe("verifyWebhookChallenge", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("echoes the challenge back when the mode is subscribe and the token matches a configured studio", async () => {
    findFirstMock.mockResolvedValue({ id: "config-1" });
    const result = await verifyWebhookChallenge("subscribe", "correct-token", "challenge-abc");
    expect(result).toBe("challenge-abc");
    expect(findFirstMock).toHaveBeenCalledWith({ where: { webhookVerifyToken: "correct-token" } });
  });

  it("rejects when the mode isn't subscribe, without even checking the token", async () => {
    const result = await verifyWebhookChallenge("unsubscribe", "any-token", "challenge-abc");
    expect(result).toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("rejects when no studio's WhatsApp config matches the presented token", async () => {
    findFirstMock.mockResolvedValue(null);
    const result = await verifyWebhookChallenge("subscribe", "wrong-token", "challenge-abc");
    expect(result).toBeNull();
  });
});
