# Incident Response Guide

What to do when something goes wrong — a suspected breach, a
cross-tenant data leak, a compromised credential, or an active attack.
This is a practical runbook, not a compliance checklist.

## Severity levels

| Level | Definition | Example |
|---|---|---|
| **SEV1** | Active exploitation, confirmed cross-tenant data exposure, or platform-wide outage caused by an attack | A studio can see another studio's client data; credentials leaked publicly |
| **SEV2** | Suspected but unconfirmed breach, a single account compromised, or a vulnerability discovered with no evidence of exploitation | A suspicious-login alert with signs of actual account takeover; a dependency scan finds a critical CVE in a package this app actually uses |
| **SEV3** | A security-relevant bug with no evidence of exploitation and no direct data exposure | A CORS misconfiguration found during a routine audit (as happened during this platform's own Prompt 43 hardening pass) |

## Immediate response (first 30 minutes) — SEV1/SEV2

1. **Contain, don't yet investigate.** If a specific account is
   compromised: revoke every active session for that account
   (`Session.revokedAt`) and force a password reset. If a specific
   studio's isolation is broken: consider suspending that studio via
   the existing platform-admin studio-suspend capability while the
   root cause is found — suspension is fast and reversible; deletion
   is not.
2. **Preserve evidence before fixing anything.** Export the relevant
   `AuditLog` and `Session` rows for the affected account(s)/studio(s)
   to a location outside the system under investigation. If the
   suspected vector is a code bug, do not deploy a fix until the
   current behavior is captured — you cannot investigate a bug you've
   already patched away.
3. **Rotate any credential that might be involved.** VAPID keys,
   backup encryption keys, OAuth client secrets, database credentials
   — whichever category is plausibly implicated. Rotating a credential
   that turns out to be unrelated costs little; failing to rotate one
   that was compromised costs everything.
4. **Notify internally.** Whoever holds platform-admin access needs to
   know immediately, even before the root cause is understood — a
   SEV1 is an "all hands," not a ticket.

## Investigation

1. **Reconstruct the timeline from `AuditLog` first.** Every studio-
   scoped action is already recorded there; it's append-only, so it
   can't have been tampered with by whatever the incident involves
   (unless the incident *is* direct database access, in which case
   treat the audit log itself as suspect and cross-reference against
   infrastructure-level logs).
2. **Check `Session.ipAddress`/`userAgent` history** for the affected
   account(s) — this is exactly the data `isSuspiciousLogin()` already
   compares against; use it manually here even if the automated check
   didn't fire (it's tuned to avoid false positives, not to catch
   every possible anomaly).
3. **For a suspected cross-tenant leak specifically**, check whether
   the responsible query went through `createTenantClient` — if it
   used the raw, unscoped `prisma` client instead of the tenant-scoped
   wrapper, that is very likely the root cause; see
   [docs/tenant-isolation.md](../packages/database/docs/tenant-isolation.md).
4. **Determine actual scope.** Which studio(s), which records, which
   time window. Resist the urge to assume it's isolated until the
   audit log actually confirms that.

## Remediation

1. Fix the root cause with a test that would have caught it — the
   tenant-isolation completeness test added during this platform's own
   Prompt 43 pass is the model to follow: don't just patch the
   instance, add the check that makes the whole class of bug loud.
2. Deploy the fix, then verify against the preserved evidence from the
   containment step that the same request/action no longer succeeds.
3. Re-enable any suspended studio or account only after the fix is
   confirmed deployed and verified.

## Disclosure

- **Affected studios** get a clear, factual account: what happened,
  what data was or wasn't exposed, what's been done, and what they
  should do (e.g. rotate their own client-facing credentials if
  relevant). Don't minimize; don't speculate beyond what the
  investigation actually established.
- **Regulatory/legal notification requirements** depend on
  jurisdiction and the nature of the data involved — consult legal
  counsel for anything involving confirmed exposure of personal data;
  this guide covers the technical response, not the legal one.

## Post-incident

- Write up what happened, root cause, timeline, and remediation, while
  it's fresh — this becomes the reference the next person facing a
  similar-shaped incident actually reads.
- Add the specific regression test/monitoring that would catch a
  recurrence, not just a general resolution to "be more careful."
