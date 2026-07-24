/** The 4 email providers named in the brief. `platform_smtp` needs no studio-supplied credentials at all (the platform's own shared sender); the other three each need their own field set on `EmailConfig` — this registry exists for the settings UI to know which fields to show per provider, not to enforce anything at the logic layer. */
export const EMAIL_PROVIDERS = [
  { key: "platform_smtp", label: "Platform SMTP (default)", requiresCredentials: false },
  { key: "studio_smtp", label: "Studio SMTP", requiresCredentials: true },
  { key: "ses", label: "Amazon SES", requiresCredentials: true },
  { key: "resend", label: "Resend", requiresCredentials: true },
] as const;

export type EmailProviderKey = (typeof EMAIL_PROVIDERS)[number]["key"];
