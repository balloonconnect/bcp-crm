# @bcp/data-portability

Pure logic for import/export/backup: a dependency-free CSV parser, a
per-entity import field registry, column-mapping suggestion, row
validation, duplicate-handling resolution, the export-type registry,
and the backup/restore approval state machine. No database or storage
access — `apps/api`'s `import-jobs.service.ts`, `export-jobs.service.ts`,
and `backup-restore.service.ts` do the actual reading/writing and
handle encryption.

## What's here

```
src/
  csv-parsing.ts              parseCsv() — handles quoted fields,
                             embedded commas, escaped quotes;
                             rowsToRecords()
  import-fields.ts                IMPORT_FIELD_DEFINITIONS — one
                             registry per importable entity (all 8
                             named in the brief), each field flagged
                             required/optional and typed
  column-mapping.ts                   applyColumnMapping(),
                             suggestColumnMapping() (auto-matches
                             headers that already line up)
  validation-rules.ts                     validateRow() — collects
                             every problem in a row, not just the first
  duplicate-detection.ts                      resolveDuplicateAction()
                             — insert/update/skip, independent of how
                             a duplicate is actually detected
  export-registry.ts                              EXPORT_ENTITY_TYPES
                             — all 10 named in the brief
  backup-approval.ts                                  canApprove(),
                             canProcess() — the Platform Admin
                             approval state machine
  validation.ts                                          zod schemas
                             for every import/export/backup request
  index.ts                                                  barrel
                             export
```

See [docs/import-export-backup.md](../../docs/import-export-backup.md)
for the full design — especially how Platform Admin approval is
enforced structurally, not just by convention, and the honestly-scoped
gap in restore (verifies and completes the approval workflow, but
doesn't yet re-insert data into live tables).

## Testing

```bash
pnpm --filter @bcp/data-portability test
pnpm --filter @bcp/data-portability typecheck
pnpm --filter @bcp/data-portability lint
```
