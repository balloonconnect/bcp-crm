import { z } from "zod";

/**
 * Central environment schema for BCP Studio OS.
 * Every app should import `getEnv()` rather than reading `process.env` directly,
 * so misconfiguration fails fast at boot instead of deep inside a request.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Comma-separated list of the platform's own known frontend origins (studio-web, client-portal,
  // gallery-web, platform-admin, marketing-web, etc). A studio's own verified custom domain is
  // additionally allowed dynamically — see apps/api's cors-origin.ts — never via a wildcard.
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004"),
  CSRF_SECRET: z.string().optional(), // signs the CSRF double-submit token for cookie-authenticated routes; falls back to a per-process random secret when unset (see csrf.ts) so the app never runs with a predictable one

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().min(1),

  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),

  BACKUP_ENCRYPTION_KEY: z.string().optional(), // 32-byte key (base64 or hex) for AES-256-GCM full-studio backup encryption; backups are unavailable, not silently unencrypted, when unset

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(), // a mailto: or https: contact URL, required by the Web Push protocol

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),

  TWO_FACTOR_ENCRYPTION_KEY: z.string().optional(),

  // Custom domain routing — see @bcp/domains docs/custom-domains.md
  DOMAIN_CNAME_TARGET: z.string().default("domains.bcpstudio.os"),
  DOMAIN_APEX_IPS: z.string().default("203.0.113.10,203.0.113.11"), // comma-separated
  PLATFORM_HOSTNAMES: z.string().default("localhost,bcpstudio.os"), // comma-separated; suffix-matched

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  LICENSE_SIGNING_PRIVATE_KEY: z.string().optional(),
  LICENSE_SIGNING_PUBLIC_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Parses and validates process.env once per process, caching the result.
 * Throws a readable error listing every missing/invalid variable.
 */
export function getEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** For tests: reset the memoized env so a fresh parse happens next call. */
export function __resetEnvCacheForTests(): void {
  cached = undefined;
}
