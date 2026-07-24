import { describe, expect, it } from "vitest";
import { NOTIFICATION_CHANNELS, DEFAULT_CHANNEL_PREFERENCES, isChannelEnabled, resolveEnabledChannels } from "../channels";

describe("NOTIFICATION_CHANNELS", () => {
  it("has exactly the 5 channels named in the brief", () => {
    expect(NOTIFICATION_CHANNELS).toEqual(["in_app", "email", "whatsapp", "browser_push", "pwa_push"]);
  });
});

describe("DEFAULT_CHANNEL_PREFERENCES", () => {
  it("enables in-app and email by default, others off", () => {
    expect(DEFAULT_CHANNEL_PREFERENCES.inAppEnabled).toBe(true);
    expect(DEFAULT_CHANNEL_PREFERENCES.emailEnabled).toBe(true);
    expect(DEFAULT_CHANNEL_PREFERENCES.whatsappEnabled).toBe(false);
    expect(DEFAULT_CHANNEL_PREFERENCES.browserPushEnabled).toBe(false);
    expect(DEFAULT_CHANNEL_PREFERENCES.pwaPushEnabled).toBe(false);
  });
});

describe("isChannelEnabled", () => {
  it("reads the right preference field per channel", () => {
    const prefs = { ...DEFAULT_CHANNEL_PREFERENCES, whatsappEnabled: true };
    expect(isChannelEnabled(prefs, "whatsapp")).toBe(true);
    expect(isChannelEnabled(prefs, "browser_push")).toBe(false);
  });
});

describe("resolveEnabledChannels", () => {
  it("always includes in_app regardless of preference", () => {
    const prefs = { inAppEnabled: false, emailEnabled: false, whatsappEnabled: false, browserPushEnabled: false, pwaPushEnabled: false };
    expect(resolveEnabledChannels(prefs, ["in_app", "email"])).toEqual(["in_app"]);
  });

  it("filters out disabled channels", () => {
    const prefs = { ...DEFAULT_CHANNEL_PREFERENCES, whatsappEnabled: false };
    expect(resolveEnabledChannels(prefs, ["in_app", "email", "whatsapp"])).toEqual(["in_app", "email"]);
  });

  it("includes an enabled optional channel", () => {
    const prefs = { ...DEFAULT_CHANNEL_PREFERENCES, browserPushEnabled: true };
    expect(resolveEnabledChannels(prefs, ["in_app", "browser_push"])).toEqual(["in_app", "browser_push"]);
  });
});
