# @bcp/domains

Custom domain management engine: secure Host-header validation, DNS
instruction generation, TXT/CNAME ownership verification, progressive
verification retries, SSL status modeling, and the suspension/subscription
access-policy checks the hostname middleware applies.

See [docs/custom-domains.md](./docs/custom-domains.md) for the full
design — domain lifecycle, the five domain purposes, apex-domain
detection, and a step-by-step walkthrough of everything the secure
hostname middleware does. Provider setup guides:
[Cloudflare](./docs/setup-guides/cloudflare.md) ·
[Vercel](./docs/setup-guides/vercel.md) ·
[Nginx](./docs/setup-guides/nginx.md) ·
[AWS Route 53](./docs/setup-guides/route53.md).

## Structure

```
src/
  types.ts             DomainPurpose / DomainStatus / verification & SSL status types
  host-validation.ts     validateHostHeader() — host-header attack prevention
  dns-instructions.ts      generateDnsInstructions(), isApexDomain()
  verification.ts           evaluateVerification() — pure TXT/CNAME match logic
  retry-policy.ts            evaluateRetry() — progressive backoff schedule
  ssl-status.ts                needsSslRenewal(), canActivate()
  access-policy.ts              checkStudioSuspension(), checkSubscriptionRestriction()
```

Every module here is pure logic with no database or network dependency —
the actual DNS lookups, Prisma calls, and HTTP wiring live in
`apps/api/src/services/domains.service.ts` and
`apps/api/src/plugins/hostname-middleware.ts`.

## Quick start

```ts
import { validateHostHeader, generateDnsInstructions, evaluateVerification } from "@bcp/domains";

const validation = validateHostHeader(request.headers.host);
if (!validation.ok) { /* reject */ }

const instructions = generateDnsInstructions(domain, verificationToken, platformConfig);

const outcome = evaluateVerification({ method: "txt", expectedValue: token, lookupResult });
```
