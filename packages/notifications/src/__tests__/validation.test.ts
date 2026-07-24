import { describe, expect, it } from "vitest";
import { notificationPreferenceInputSchema, pushSubscriptionInputSchema, createNotificationInputSchema } from "../validation";

describe("notificationPreferenceInputSchema", () => {
  it("accepts a partial preference update", () => {
    expect(notificationPreferenceInputSchema.safeParse({ whatsappEnabled: true }).success).toBe(true);
  });
});

describe("pushSubscriptionInputSchema", () => {
  it("accepts a valid Web Push subscription", () => {
    const result = pushSubscriptionInputSchema.safeParse({ endpoint: "https://fcm.googleapis.com/abc", p256dhKey: "key1", authKey: "key2" });
    expect(result.success).toBe(true);
  });
});

describe("createNotificationInputSchema", () => {
  it("accepts a minimal notification", () => {
    const result = createNotificationInputSchema.safeParse({ recipientUserId: "00000000-0000-0000-0000-000000000000", channel: "in_app", title: "Task assigned", body: "You have a new task." });
    expect(result.success).toBe(true);
  });
});
