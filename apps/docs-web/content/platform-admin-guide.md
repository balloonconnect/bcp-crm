# Platform Admin Guide

For whoever operates BCP Studio OS itself — onboarding studios,
managing subscriptions, and keeping the platform healthy.

## Signing in

1. Go to your Platform Admin URL and sign in with your platform admin
   credentials.
2. If two-factor authentication is enabled on your account, enter your
   code.

[Screenshot: Platform Admin login screen]

## Onboarding a new studio

1. From the dashboard, go to **Studios** → **New Studio**.
2. Enter the studio's name, owner contact details, and choose a
   subscription plan.
3. Choose whether to send the studio owner an invitation email
   immediately or generate a link to share yourself.
4. The studio is created immediately and can start using the
   platform once its owner completes their own setup.

[Screenshot: New studio creation form]

## Managing subscriptions and licenses

- **Subscriptions** shows every studio's plan, billing status, and
  renewal date. See [Subscription Setup](/docs/subscription-setup).
- **Licenses** shows license keys issued to studios and their
  activation status. See [License Setup](/docs/license-setup).

## Monitoring platform health

The **Health** page shows the live status of every service the
platform depends on — database, storage, background job processing,
AI features, WhatsApp, and payments. A service showing anything other
than "Operational" is worth investigating immediately.

[Screenshot: Platform health dashboard showing all services green]

You can also configure **alert rules** here — for example, being
notified if the database is unhealthy for more than a few minutes —
and review **incident history**, the same history your public status
page shows to everyone.

## Approving backups and restores

Studio backup and restore requests require your explicit approval
before anything happens — see [Backup and Restore](/docs/backup-and-restore)
for the full request-and-approval flow.

## Reviewing audit logs

Every meaningful action across the platform is recorded. Use
**Audit Logs** to investigate anything unusual — who did what, and
when.

## Suspending a studio

If a studio needs to be suspended (non-payment, a policy violation,
or at the studio's own request), go to that studio's page and choose
**Suspend**. This is reversible — the studio's data is untouched, it
simply can't be accessed until reinstated.
