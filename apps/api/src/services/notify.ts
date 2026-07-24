import { EmailClient } from "@bcp/email";
import { getEnv } from "@bcp/config";
import { logger } from "@bcp/logger";

const log = logger.child({ service: "api", module: "notify" });

let client: EmailClient | null = null;

function getClient(): EmailClient {
  if (client) return client;
  const env = getEnv();
  client = new EmailClient({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.EMAIL_FROM,
  });
  return client;
}

/**
 * Sends an auth-flow email (verification link, password reset, OTP code).
 * In local dev this lands in Mailpit (http://localhost:8025) since
 * SMTP_HOST/PORT point there by default — nothing studio-specific about
 * this helper, it just centralizes "how does the API send an email."
 */
export async function sendAuthEmail(input: { to: string; subject: string; html: string }): Promise<void> {
  try {
    await getClient().send({ to: input.to, subject: input.subject, html: input.html });
  } catch (err) {
    // Auth flows must not fail the request just because email delivery had
    // a hiccup — the token/code is already persisted and still valid; log
    // loudly so it's visible in ops, but let the caller's response proceed.
    log.error({ err, to: input.to }, "failed to send auth email");
  }
}
