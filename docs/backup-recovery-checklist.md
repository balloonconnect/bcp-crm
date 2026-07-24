# Backup Recovery Checklist

A step-by-step checklist for actually recovering a studio from an
encrypted backup (Prompt 41). Read this *before* an incident, not
during one.

## Before you start

- [ ] Confirm you have a genuine business need to restore — restoring
      overwrites current live data for the studio; it is not something
      to run experimentally.
- [ ] Confirm `BACKUP_ENCRYPTION_KEY` is set in the environment you're
      running the restore from. Without it, `runRestore()` fails
      immediately and loudly (`BackupNotConfiguredError`) rather than
      silently producing garbage — if you hit this, stop and locate
      the correct key before proceeding, don't work around it.
- [ ] Identify the specific `StudioBackup` row you intend to restore
      from (`GET /backups` for the studio, or
      `GET /platform/backups` for the platform-admin view across every
      studio) — confirm its `status` is `completed` and check
      `requestedAt`/`completedAt` against what you actually need.

## Request and approval

- [ ] A studio owner/admin (or platform admin, for an admin-initiated
      recovery) calls `POST /restores/request` with the backup's ID.
- [ ] **A Platform Admin must approve the request** —
      `POST /platform/restores/:id/decide` with `{ approve: true }`.
      There is no path around this approval gate, by design; see
      [docs/data-deletion-policy.md](data-deletion-policy.md) for why
      this platform holds backup/restore and studio deletion to the
      same standard.
- [ ] If the request should NOT proceed, reject it explicitly with a
      reason (`{ approve: false, rejectedReason: "..." }`) rather than
      leaving it to sit unresolved — a clear rejection is itself part
      of the audit trail.

## What approval actually does today — read this before assuming more

- [ ] Understand the current scope: approval triggers decryption of
      the backup file and verification that it parses cleanly as valid
      JSON. **It does not yet re-insert that data into live tables.**
      This is a deliberate, stated limitation (see
      [docs/import-export-backup.md](import-export-backup.md)) — safely
      reconciling a point-in-time snapshot against a database that's
      kept changing since is a distinct engineering effort this
      platform hasn't built yet, not something silently skipped.
- [ ] If you need the actual data restored into live tables today, this
      requires manual, careful reconciliation by someone with direct
      database access — treat the automated restore job as
      confirmation the backup is valid and readable, not as the full
      recovery.

## After a restore job completes

- [ ] Check the `StudioRestoreJob`'s final `status`. `completed` means
      the backup decrypted and validated successfully. `failed` means
      it didn't — check `errorMessage` before assuming the backup
      itself is intact; a `BackupNotConfiguredError` at this stage
      means the encryption key was wrong or missing, not that the
      backup is corrupt.
- [ ] If you performed manual data reconciliation, verify record counts
      for the studio's core tables (clients, events, invoices) against
      what the backup's own snapshot recorded
      (`snapshotTakenAt`/entity counts in the decrypted JSON) before
      considering the recovery complete.
- [ ] Notify the studio that recovery is complete, what was restored,
      and what (if anything) created between the backup's timestamp
      and now may not be reflected.

## Testing your recovery process before you need it

- [ ] Periodically request a backup, have it approved, and walk through
      decryption/validation on a non-production key/environment —
      confirming the pipeline actually works is the only way to trust
      it will when it matters.
- [ ] Confirm whoever holds Platform Admin access actually knows this
      checklist exists and where to find it — an approval gate is only
      as useful as the person on the other end of it being ready to
      act quickly.
