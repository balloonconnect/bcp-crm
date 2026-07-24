/**
 * Validates and normalizes an incoming HTTP `Host` header before it's
 * ever used to look up a studio. This is deliberately paranoid: a
 * malformed or maliciously-crafted Host header is a classic vector for
 * cache poisoning, SSRF-adjacent confusion, and auth/reset-link poisoning
 * (an app that builds a password-reset URL from an untrusted Host header
 * can be tricked into emailing a link to an attacker's domain). See
 * docs/custom-domains.md § "Secure hostname middleware" for the full
 * threat model this defends against.
 */

export type HostValidationFailureReason =
  | "missing"
  | "multiple_headers"
  | "userinfo_present"
  | "invalid_characters"
  | "too_long"
  | "invalid_port"
  | "ip_literal_not_allowed"
  | "empty_label"
  | "invalid_label"
  | "too_many_labels";

export type HostValidationResult =
  | { ok: true; hostname: string }
  | { ok: false; reason: HostValidationFailureReason };

const MAX_HOSTNAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;
const MAX_LABELS = 20; // generous ceiling — legitimate hostnames rarely exceed ~5-6 labels

const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_LITERAL_PATTERN = /^\[.*]$/; // Host headers wrap IPv6 literals in brackets, e.g. "[::1]"

// Only lowercase letters, digits, hyphen, and dot survive normalization —
// this is intentionally stricter than the full IDNA/punycode hostname
// grammar. Studios with internationalized domains register the punycode
// (xn--...) form, which is plain ASCII and passes this check normally.
const ALLOWED_CHARACTERS_PATTERN = /^[a-z0-9.-]+$/;
const LABEL_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export interface HostValidationOptions {
  /** Reject bare IP addresses as Host values. Default true — custom domains are always real hostnames. */
  disallowIpLiterals?: boolean;
}

export function validateHostHeader(
  rawHost: string | string[] | undefined,
  options: HostValidationOptions = {},
): HostValidationResult {
  const disallowIpLiterals = options.disallowIpLiterals ?? true;

  // A duplicated Host header (Node/undici normally reject this at the HTTP
  // parser level, but reverse proxies in front of the app don't always) is
  // itself a red flag — different intermediaries may disagree on which
  // value to trust, which is exactly the ambiguity host-header-injection
  // attacks rely on. Fail closed rather than picking one.
  if (Array.isArray(rawHost)) {
    return { ok: false, reason: "multiple_headers" };
  }

  if (!rawHost || rawHost.trim().length === 0) {
    return { ok: false, reason: "missing" };
  }

  let host = rawHost.trim();

  // Reject control characters, whitespace in the middle, and anything
  // outside a conservative printable-ASCII allowlist before doing
  // anything else with the string.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f\s]/.test(host)) {
    return { ok: false, reason: "invalid_characters" };
  }

  // "user:pass@host" — userinfo has no place in a Host header; its
  // presence usually indicates an attempt to confuse a naive parser that
  // treats everything after '@' as the "real" host while a proxy/browser
  // treats everything before it that way instead.
  if (host.includes("@")) {
    return { ok: false, reason: "userinfo_present" };
  }

  // IPv6 literal — bracket-wrapped per RFC 3986, e.g. "[::1]:8080".
  if (IPV6_LITERAL_PATTERN.test(host.split(":").length > 2 ? host.replace(/:\d+$/, "") : host)) {
    if (disallowIpLiterals) return { ok: false, reason: "ip_literal_not_allowed" };
  } else {
    // Strip a trailing ":port" for everything else (IPv4/hostnames).
    const portMatch = /^(.*):(\d+)$/.exec(host);
    if (portMatch) {
      const [, withoutPort, port] = portMatch;
      const portNum = Number(port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        return { ok: false, reason: "invalid_port" };
      }
      host = withoutPort!;
    }
  }

  host = host.toLowerCase();

  if (host.length > MAX_HOSTNAME_LENGTH) {
    return { ok: false, reason: "too_long" };
  }

  if (IPV4_PATTERN.test(host)) {
    if (disallowIpLiterals) return { ok: false, reason: "ip_literal_not_allowed" };
    return { ok: true, hostname: host };
  }

  if (!ALLOWED_CHARACTERS_PATTERN.test(host)) {
    return { ok: false, reason: "invalid_characters" };
  }

  const labels = host.split(".");
  if (labels.length > MAX_LABELS) {
    return { ok: false, reason: "too_many_labels" };
  }

  for (const label of labels) {
    if (label.length === 0) return { ok: false, reason: "empty_label" };
    if (label.length > MAX_LABEL_LENGTH) return { ok: false, reason: "invalid_label" };
    if (!LABEL_PATTERN.test(label)) return { ok: false, reason: "invalid_label" };
  }

  return { ok: true, hostname: host };
}
