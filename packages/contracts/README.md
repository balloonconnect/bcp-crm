# @bcp/contracts

Pure logic for contract templates and e-signature: the suggested
clause-type registry, named-variable rendering (matching `@bcp/email`'s
convention), version numbering, and — the real integrity guarantee of
this feature — `isReadyToFinalize()`, which requires genuine OTP
verification (and a separate witness signature, when required) before
a contract can ever be finalized. No database access — `apps/api`'s
`contract-templates.service.ts`, `contracts.service.ts`, and
`contract-signing-public.service.ts` do the actual reading/writing and
generate the PDF certificate.

## What's here

```
src/
  clauses.ts              CONTRACT_CLAUSE_TYPES — suggested section
                         types (payment/cancellation/delivery/
                         copyright/model-release/privacy-consent/
                         event-details/custom), not a fixed schema
  rendering.ts                renderContractVariables(), extractContractVariables(),
                         renderContractSections(), extractAllSectionVariables()
  versioning.ts                  resolveNextVersionNumber()
  signing.ts                        isReadyToFinalize() — OTP required,
                         witness required only when the contract
                         calls for one; canRequestOtp()
  validation.ts                        contractTemplateInputSchema,
                         createContractSchema, updateContractContentSchema,
                         otpVerifySchema, witnessSignSchema, clientSignSchema
  index.ts                                barrel export
```

See [docs/contracts-and-esignature.md](../../docs/contracts-and-esignature.md)
for the full design — why templates use an ordered JSON `sections`
array instead of six dedicated clause columns, and how version history
and the audit trail are deliberately two separate, both append-only,
records.

## Testing

```bash
pnpm --filter @bcp/contracts test
pnpm --filter @bcp/contracts typecheck
pnpm --filter @bcp/contracts lint
```
