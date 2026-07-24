# Data Deletion Policy

How this platform handles account deletion, studio deletion, and the
data retention obligations that sit alongside both.

## Account deletion — "erase the person, not the history"

A signed-in studio user can request their own account's deletion via
`POST /account/delete`. This is a soft-delete (`StudioUser.deletedAt`),
never a hard row removal, for a deliberate reason: this platform's data
model has this person referenced from records the studio has a
legitimate, ongoing need to retain — invoices they issued, tasks they
completed, contracts they signed, the audit trail of actions they
took. Hard-deleting the row would either dangle those references or
require cascading deletes into financial and legal records no studio
should lose because one team member left.

What actually changes on deletion:

- **Personally identifying fields are overwritten**: name becomes
  "Deleted User," email becomes a non-reachable placeholder
  (`deleted-user-<id>@deleted.invalid`), phone is cleared.
- **Authentication is permanently disabled**: the password hash and
  2FA secret are cleared outright, and every active session for the
  account is revoked immediately. This account can never be signed
  into again, regardless of what happens to the row itself.
- **Everything else — the history — stays**: past invoices, completed
  tasks, audit log entries, and notes remain exactly as they were,
  now pointing at an anonymized identity rather than a dangling or
  cascaded-away one.

This is the same principle most data-protection regimes' right to
erasure already builds in an exception for: a controller's legitimate
need to retain financial and legal records isn't overridden by an
individual's deletion request, but everything that isn't needed for
that purpose should stop identifying them.

## Studio deletion — Platform Admin approval required

Deleting an entire studio is the single most destructive action this
platform supports, and it is deliberately not a self-service action a
studio can complete on its own:

1. A studio owner/admin **requests** deletion
   (`POST /studio-deletion-requests`), optionally with a reason.
2. The request sits at `pending_approval` until a **Platform Admin**
   explicitly decides — approve or reject
   (`POST /platform/studio-deletion-requests/:id/decide`). There is no
   code path anywhere in this platform where a `StudioUser`, no matter
   how senior within their own studio, can approve their own studio's
   deletion. This mirrors the exact same approval gate Prompt 41 built
   for encrypted backup and restore — the two most destructive
   categories of action in the platform share one discipline.
3. On approval, the studio is marked deleted
   (`Studio.deletedAt`) and every active session across the entire
   studio is revoked immediately — the studio disappears from every
   studio-facing surface and can no longer be signed into, the moment
   approval lands.

### What "deletion" means today, stated honestly

Approval triggers immediate, real consequences: the studio can no
longer be accessed, by anyone, and it no longer appears anywhere a
studio-facing user would see it. What approval does **not** yet
trigger is the physical purge of that studio's rows from the database.
A studio's data is large, deeply cross-referenced, and in places
subject to its own independent retention obligations (signed
contracts, financial records other parties may need to reference,
audit trails). Building a hard-delete pipeline that walks every one of
this platform's 180 models in the correct dependency order, respecting
whichever categories have their own retention requirement, is a
distinct operational project — this pass delivers the request/approval
workflow and immediate access revocation as genuinely real and
enforced; the physical purge is a deliberately separate, scheduled
follow-up step, not something silently skipped or falsely claimed as
done.

**Operational recommendation:** run the physical purge as a manual,
logged, platform-admin-executed step no sooner than 30 days after
approval (giving time to catch an approval made in error), against a
studio whose `deletedAt` has been set and whose sessions have been
revoked for that entire window with zero access attempts.

## Retention exceptions

Regardless of any deletion request, this platform retains:

- **Financial records** (invoices, payments) for whatever period
  applicable tax/accounting law requires in the studio's own
  jurisdiction — a studio's own responsibility to configure correctly
  for where they operate.
- **Audit log entries**, since they are the mechanism by which any
  future incident (see the Incident Response Guide) can actually be
  investigated — deleting the audit trail alongside the data it
  describes would defeat its purpose.
- **Signed contracts and their certificates**, which typically carry
  their own independent legal retention requirement distinct from the
  studio's own data lifecycle.

## Data export before deletion

A user or studio considering deletion should export their data first:
`GET /account/export` for personal data, or Prompt 41's studio-wide
export (`complete_studio_data`) for everything the studio holds.
Neither export is automatically triggered by a deletion request — it's
the requester's own responsibility to export first if they want a
copy, the same way this works everywhere else this platform offers
both a deletion and an export capability.
