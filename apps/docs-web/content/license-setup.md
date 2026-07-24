# License Setup

For platform deployments that use license keys to activate a studio's
access, separate from (or alongside) subscription billing.

## Issuing a license

1. In Platform Admin, go to **Licenses** → **Issue License**.
2. Select the studio and the license type.
3. The platform generates a unique license key.

[Screenshot: License issuance form with a generated key]

## Activating a license

The studio owner enters their license key during onboarding, or later
from **Settings → License**. Activation is checked against the
license's own status — active, expired, or revoked — every time it
matters, not just once at signup.

## Renewing a license

Renew from Platform Admin before a license's expiry date — a studio
approaching expiry sees a clear warning in their own dashboard well
before anything is actually restricted.

## Revoking a license

If a license needs to be revoked (non-payment, a policy violation),
do this from the studio's own license record — access is restricted
immediately, and this is fully logged in the audit trail.
