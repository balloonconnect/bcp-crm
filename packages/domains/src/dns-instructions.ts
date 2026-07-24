export interface PlatformDomainConfig {
  /** Where CNAME/ALIAS records should point traffic — e.g. "domains.bcpstudio.os". */
  cnameTarget: string;
  /** A-record targets for apex domains, which can't use CNAME per DNS spec (RFC 1034 §3.6.2). */
  apexIpAddresses: string[];
  /** Subdomain label the TXT ownership-verification record is published under. Default "_bcp-verify". */
  verificationLabel?: string;
}

export interface DnsRecordInstruction {
  type: "TXT" | "CNAME" | "A" | "ALIAS";
  /** Record name relative to the zone — "@" for the apex itself. */
  name: string;
  value: string;
  ttlSeconds: number;
  note: string;
}

export interface DnsInstructions {
  domain: string;
  isApex: boolean;
  verificationRecord: DnsRecordInstruction;
  routingRecords: DnsRecordInstruction[];
}

/** An apex/root domain has exactly one label before the public suffix — "example.com", not "www.example.com". This is a simplification (doesn't consult the Public Suffix List for multi-part TLDs like "co.uk") documented in docs/custom-domains.md § "Apex domain detection". */
export function isApexDomain(domain: string): boolean {
  return domain.split(".").length === 2;
}

/**
 * Builds the exact DNS records a studio needs to add, given their domain
 * and a verification token already issued for it (see verification.ts /
 * the DomainRecord.verificationToken field). Ownership verification
 * always uses a TXT record — even for domains that will ultimately route
 * traffic via CNAME — so ownership is proven *before* any traffic-routing
 * record is required to exist, avoiding a chicken-and-egg setup order.
 */
export function generateDnsInstructions(
  domain: string,
  verificationToken: string,
  platformConfig: PlatformDomainConfig,
): DnsInstructions {
  const apex = isApexDomain(domain);
  const verificationLabel = platformConfig.verificationLabel ?? "_bcp-verify";

  const verificationRecord: DnsRecordInstruction = {
    type: "TXT",
    name: `${verificationLabel}.${domain}`,
    value: verificationToken,
    ttlSeconds: 300,
    note: "Proves you control this domain. Safe to remove once verification succeeds.",
  };

  const routingRecords: DnsRecordInstruction[] = apex
    ? platformConfig.apexIpAddresses.map((ip, i) => ({
        type: "A",
        name: "@",
        value: ip,
        ttlSeconds: 3600,
        note:
          platformConfig.apexIpAddresses.length > 1
            ? `A record ${i + 1} of ${platformConfig.apexIpAddresses.length} — add all of them for redundancy. Some providers (Cloudflare, Route 53) offer an ALIAS/ANAME record instead — prefer that single record if available.`
            : "Points your root domain directly at BCP Studio OS.",
      }))
    : [
        {
          type: "CNAME",
          name: domain.split(".").slice(0, -2).join(".") || "@",
          value: platformConfig.cnameTarget,
          ttlSeconds: 3600,
          note: "Points this subdomain at BCP Studio OS.",
        },
      ];

  return { domain, isApex: apex, verificationRecord, routingRecords };
}
