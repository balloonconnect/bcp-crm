import { describe, expect, it } from "vitest";
import { EMAIL_PROVIDERS } from "../providers";
import { emailConfigInputSchema, sendEmailInputSchema } from "../validation";

describe("EMAIL_PROVIDERS", () => {
  it("has exactly the 4 providers named in the brief", () => {
    expect(EMAIL_PROVIDERS.map((p) => p.key)).toEqual(["platform_smtp", "studio_smtp", "ses", "resend"]);
  });

  it("marks platform_smtp as not requiring credentials", () => {
    expect(EMAIL_PROVIDERS.find((p) => p.key === "platform_smtp")?.requiresCredentials).toBe(false);
  });
});

describe("emailConfigInputSchema", () => {
  it("accepts a Resend config", () => {
    expect(emailConfigInputSchema.safeParse({ provider: "resend", resendApiKey: "re_123", fromAddress: "hello@studio.com" }).success).toBe(true);
  });
});

describe("sendEmailInputSchema", () => {
  it("accepts a template-based send", () => {
    const result = sendEmailInputSchema.safeParse({ to: "client@example.com", templateId: "00000000-0000-0000-0000-000000000000", variables: { clientName: "Asha" } });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    expect(sendEmailInputSchema.safeParse({ to: "not-an-email" }).success).toBe(false);
  });
});
