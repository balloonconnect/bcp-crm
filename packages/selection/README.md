# @bcp/selection

Pure logic for client album photo selection: OTP access gating,
selection/category limit checks, lock/reopen/submit state transitions,
and CSV/filename export. No database access — `apps/api`'s
`album-selection.service.ts` (studio-side) and
`album-selection-public.service.ts` (client-facing) do the actual
reading/writing and enforce these rules against real data.

## What's here

```
src/
  access.ts             checkAlbumAccess() — OTP only, no password;
                       isPastDeadline(), daysUntilDeadline()
  limits.ts                checkSelectionLimit(), checkCategoryLimit() —
                       checked independently so a client learns which
                       limit stopped them
  lock.ts                     resolvePhase(), canSubmit(),
                       canEditSelection(), canReopen() — a locked
                       album is a real stop, not advisory
  export.ts                      buildExportFilenameList(),
                       buildSelectionCsv() — operate on the original
                       upload's own filename, not the storage key
  validation.ts                     guestIdentifySchema, otpVerifySchema,
                       selectionActionSchema, albumSettingsInputSchema,
                       reminderInputSchema
  index.ts                          barrel export
```

See [docs/client-photo-selection.md](../../docs/client-photo-selection.md)
for the full design — why favorite/select/reject are independent
states, and why submitting *is* locking rather than a separate step.

## Testing

```bash
pnpm --filter @bcp/selection test
pnpm --filter @bcp/selection typecheck
pnpm --filter @bcp/selection lint
```
