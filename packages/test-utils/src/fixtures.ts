import { randomUUID } from "node:crypto";

/** A fresh, valid-shaped UUID per call — used throughout the test suites below wherever a test needs "some studio" or "some client" without caring about its specific identity, only that two different fixtures never accidentally collide. */
export function fixtureId(): string {
  return randomUUID();
}

export interface StudioAuthContextFixture {
  actorId: string;
  actorType: "studio_user";
  studioId: string;
  sessionId: string;
}

/** The shape `request.auth` takes once a Bearer token has been verified — used by route-level tests that call a handler directly rather than through a full HTTP round-trip, so a test can assert authorization logic without needing a real signed JWT. */
export function buildStudioAuthContext(overrides: Partial<StudioAuthContextFixture> = {}): StudioAuthContextFixture {
  return { actorId: fixtureId(), actorType: "studio_user", studioId: fixtureId(), sessionId: fixtureId(), ...overrides };
}

export interface PlatformAuthContextFixture {
  actorId: string;
  actorType: "platform_user";
  sessionId: string;
}

export function buildPlatformAuthContext(overrides: Partial<PlatformAuthContextFixture> = {}): PlatformAuthContextFixture {
  return { actorId: fixtureId(), actorType: "platform_user", sessionId: fixtureId(), ...overrides };
}
