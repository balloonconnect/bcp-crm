import pino from "pino";
import { NEVER_LOG_PATHS } from "@bcp/observability";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Shared root logger. Services should call `logger.child({ service: "api" })`
 * to tag output rather than instantiating their own pino instance.
 *
 * "Never log" is enforced here, once, for every logger this platform
 * creates — `redact` replaces a matching field's value with
 * `"[Redacted]"` rather than omitting the key entirely, so a redacted
 * log line still shows *that* a password/OTP/token/secret/signed-URL
 * field was present, which matters for debugging, without ever
 * printing the value itself. A service can't opt out of this by
 * forgetting to redact locally, because the root logger never passes
 * a matching field through in the first place.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
    : undefined,
  base: { env: process.env.NODE_ENV },
  redact: { paths: [...NEVER_LOG_PATHS], censor: "[Redacted]" },
});

export type Logger = typeof logger;
