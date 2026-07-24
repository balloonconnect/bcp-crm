/**
 * These functions take DNS *lookup results* (already resolved by the
 * caller — apps/api's domains.service.ts uses Node's `dns.promises`) and
 * decide whether they satisfy verification. Kept pure and separate from
 * the actual DNS resolution so verification logic is unit-testable
 * without a real network call or a mocked DNS server.
 */

/** `dns.promises.resolveTxt()` returns `string[][]` — each inner array is one TXT record's chunks, concatenated. */
export function verifyTxtRecord(expectedToken: string, txtRecords: string[][]): boolean {
  return txtRecords.some((chunks) => chunks.join("") === expectedToken);
}

/** `dns.promises.resolveCname()` returns the chain of CNAME targets; any hop matching is sufficient. */
export function verifyCnameRecord(expectedTarget: string, cnameRecords: string[]): boolean {
  const normalizedExpected = expectedTarget.toLowerCase().replace(/\.$/, "");
  return cnameRecords.some((record) => record.toLowerCase().replace(/\.$/, "") === normalizedExpected);
}

export type VerificationOutcome =
  | { verified: true }
  | { verified: false; reason: "no_matching_record" | "dns_lookup_failed" };

export interface VerifyDomainInput {
  method: "txt" | "cname";
  expectedValue: string;
  /** `null` means the DNS lookup itself failed (NXDOMAIN, timeout, etc) — distinct from "looked up fine, but no matching record". */
  lookupResult: string[][] | string[] | null;
}

export function evaluateVerification(input: VerifyDomainInput): VerificationOutcome {
  if (input.lookupResult === null) {
    return { verified: false, reason: "dns_lookup_failed" };
  }

  const matched =
    input.method === "txt"
      ? verifyTxtRecord(input.expectedValue, input.lookupResult as string[][])
      : verifyCnameRecord(input.expectedValue, input.lookupResult as string[]);

  return matched ? { verified: true } : { verified: false, reason: "no_matching_record" };
}
