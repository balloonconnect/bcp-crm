import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "../tokens";

describe("signAccessToken / verifyAccessToken", () => {
  const secret = "test-secret-at-least-32-bytes-long!!";

  it("round-trips the claims", async () => {
    const claims = {
      sub: "user-1",
      actorType: "studio_user" as const,
      studioId: "studio-1",
      sessionId: "session-1",
    };
    const token = await signAccessToken(claims, secret, "15m");
    const decoded = await verifyAccessToken(token, secret);
    expect(decoded.sub).toBe(claims.sub);
    expect(decoded.actorType).toBe(claims.actorType);
    expect(decoded.studioId).toBe(claims.studioId);
    expect(decoded.sessionId).toBe(claims.sessionId);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken(
      { sub: "u1", actorType: "platform_user", studioId: null, sessionId: "s1" },
      secret,
      "15m",
    );
    await expect(verifyAccessToken(token, "a-completely-different-secret!!")).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signAccessToken(
      { sub: "u1", actorType: "platform_user", studioId: null, sessionId: "s1" },
      secret,
      "-1s",
    );
    await expect(verifyAccessToken(token, secret)).rejects.toThrow();
  });
});
