# @bcp/enquiry-form

Pure logic for the public enquiry form: which `Lead` fields a studio can
expose and require, config/submission validation, spam heuristics, UTM
parsing, and public-link/embed builders. Like `@bcp/leads` and
`@bcp/dashboard`, no database access — `apps/api`, `apps/studio-web`
(the form builder), and `apps/client-portal` (the public page) all
import from here.

## What's here

```
src/
  field-config.ts    CONFIGURABLE_FIELD_KEYS, FormFieldsConfig,
                      defaultFieldsConfig(), getRequiredFieldKeys(), etc.
  validation.ts       enquiryFormConfigSchema (studio-side builder),
                      submissionEnvelopeSchema, validateSubmissionPayload()
  spam.ts             checkForSpam() — honeypot / fill-time / IP-velocity
                      heuristic, pure and independently testable
  utm.ts              parseUtmParams()
  links.ts            buildPublicFormUrl(), buildEmbedCode()
  index.ts            barrel export
```

See [docs/enquiry-form.md](../../docs/enquiry-form.md) for the full
design — why the public page lives in `apps/client-portal`, the
submission pipeline order, and what's a deliberate v1 simplification
(no third-party CAPTCHA service, "notify studio" means owner/admin
roles).

## Testing

```bash
pnpm --filter @bcp/enquiry-form test
pnpm --filter @bcp/enquiry-form typecheck
pnpm --filter @bcp/enquiry-form lint
```
