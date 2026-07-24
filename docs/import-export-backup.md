# Import, Export and Backup

CSV import (column mapping, validation, preview, duplicate handling,
per-row error reports, retry) across 8 entity types, CSV export
across 10 types including complete studio data, and encrypted
full-studio backup/restore gated behind explicit Platform Admin
approval. Built across `@bcp/data-portability` (CSV parsing, field
registries, column-mapping suggestion, validation, duplicate
resolution, the approval state machine — all pure) and `apps/api`'s
`import-jobs.service.ts`, `export-jobs.service.ts`, and
`backup-restore.service.ts`.

## Column mapping and validation

A real, dependency-free CSV parser (`parseCsv()`) handles quoted
fields, embedded commas, and escaped quotes correctly. Each
importable entity has its own field registry
(`IMPORT_FIELD_DEFINITIONS`) that "Column mapping" maps a source CSV's
headers onto — `suggestColumnMapping()` auto-matches headers that
already line up (case/spacing-insensitive), so a studio only has to
manually map what doesn't. "Validation" (`validateRow()`) collects
every problem in a row rather than stopping at the first, so a studio
sees everything wrong with a row in one pass.

## Preview, then a real write pass, with a genuine error report

Preview runs every row through mapping and validation without writing
anything. Processing writes for real — a failing row is recorded as an
`ImportJobError` and the job continues rather than aborting, finishing
as `completed`, `partially_completed`, or `failed` depending on the
outcome mix. "Retry" re-runs only the previously-failed rows through
the exact same path; a row that succeeds this time is removed from the
error count rather than double-counted.

## Duplicate handling is one function, independent of detection

`resolveDuplicateAction()` decides insert/update/skip given whether a
match was found and which strategy the studio chose — kept separate
from *how* a duplicate is detected (a per-entity key lookup, e.g.
matching a lead by phone number), so the decision logic itself is
provider-agnostic and fully testable without a database.

## Export, including "complete studio data" as the same pipeline

All 10 export types share one `{ columns, rows }` shape and one CSV
builder (reusing `@bcp/reports`' `buildReportCsv()` rather than a
second implementation). "Complete studio data" isn't special-cased —
it runs every other export type in sequence and bundles the results
into one file. Every generated export's download link expires after 7
days rather than staying valid forever.

## Encrypted backup and restore — Platform Admin approval is structural

AES-256-GCM (an authenticated cipher — a tampered or corrupted backup
fails to decrypt loudly, never silently restores garbage), with the
encryption key coming only from a dedicated environment variable;
backups are unavailable, not silently unencrypted, when it's unset.
`StudioBackup.approvedBy` and `StudioRestoreJob.approvedBy` are
documented and routed exclusively through `requirePlatformPermission`
— there is no function in `backup-restore.service.ts`, or anywhere
else, that accepts a `StudioUser` ID for either field. A studio can
request; only a platform admin can approve, reject, or trigger the
actual run.

## An honestly-scoped gap: restore verifies, but doesn't yet re-insert

Restore decrypts the backup, verifies it parses cleanly, and completes
the full two-step approval workflow for real — but stops short of
writing the snapshot back into live tables. Safely reconciling a
point-in-time snapshot against whatever's changed since (foreign keys,
uniqueness conflicts) is a genuinely separate engineering effort this
pass doesn't take on, stated plainly in the code rather than faked
with a destructive wipe-and-reload.

## Testing

```bash
pnpm --filter @bcp/data-portability test   # CSV parsing, column mapping, validation, duplicate resolution, approval state machine
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build    # /data-tools — import wizard, export triggers, backup/restore requests
pnpm --filter @bcp/platform-admin build  # /backups — the platform admin approval screen
```
