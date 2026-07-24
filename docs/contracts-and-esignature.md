# Contracts and e-signature

Expands `ClientContract` from the Prompt 12/33 minimal shape into full
contract management — studio-managed templates, a real e-signature
flow (OTP verification, optional witness, IP address, timestamp),
generated PDF certificates, append-only version history, and an
append-only audit trail. Built across `@bcp/contracts` (clause
registry, variable rendering, version numbering, signing-readiness —
all pure), `apps/api`'s template/contract management and public
signing routes, `apps/studio-web`'s template builder and contract
panel, and `apps/client-portal`'s public signing page.

## "Allow each studio to manage its own templates"

`ContractTemplate` is entirely studio-owned — nothing is shared or
platform-provided beyond `@bcp/contracts`' `CONTRACT_CLAUSE_TYPES`
registry, which is just labels for a template-builder UI (payment
terms, cancellation terms, delivery terms, copyright terms, model
release, privacy consent, event details, custom), not content. A
template's `sections` field is an ordered JSON array rather than six
dedicated text columns — real contract text is free-form legal prose a
studio (or its lawyer) writes and reorders, not data that fits a rigid
schema; not every contract needs all six clause types either (a
corporate headshot day is unlikely to need a model release the way a
wedding portrait session would).

## Variables and event details are the same mechanism

`{{variableName}}` placeholders — the same named-variable convention
`EmailTemplate` already established, matching ordinary HTML-templating
norms (deliberately different from WhatsApp's numbered `{{1}}`
syntax, since a contract is composed and read the way an email is, not
sent through a messaging API with positional parameters). "Event
details" (date, venue, package) are simply whichever variables a
studio's own template chooses to reference — not a separately modeled
concept.

## Version history is real, not just a counter

Every time a contract's content changes — generated from a template,
edited by the studio before sending, or regenerated after a client's
revision request — a new `ContractVersion` row is created.
`ClientContract.currentVersionNumber` always points at the latest one;
nothing is ever overwritten, so a studio (or an auditor) can always see
exactly what a client was looking at when they signed, even if the
template itself changed afterward.

## Signing requires genuine OTP verification, and a witness when required

`@bcp/contracts`' `isReadyToFinalize()` is the one gate every signing
attempt passes through: a client typing their name is never sufficient
on its own — `signerOtpVerifiedAt` must be set, and when the contract
calls for one, `witnessSignedAt` must be set too, each captured with
its own independent IP address and timestamp. `apps/api`'s signing
service checks this before ever setting `status: "signed"`.

## PDF certificate, generated automatically

The moment signing completes, a certificate PDF is generated — signer
name, timestamp, IP address, and OTP-verification proof, plus witness
details when applicable — in the same step as signing, not a follow-up
a studio has to remember to trigger separately.

## Audit trail

`ContractAuditLogEntry` is append-only and covers the full lifecycle —
created, sent, viewed, OTP requested/verified, witnessed, signed,
certificate generated, revision requested, voided — independent of
`ContractVersion` (which only tracks *content* changes). This is the
record a studio points to if a signature's validity is ever questioned.

## A naming collision avoided during development

The public signing routes deliberately live at `/contracts/...` and
`/contract-templates/...` — new top-level namespaces — rather than
nested under the pre-existing `/clients/:id/contracts` routes from
Prompt 12, which were left in place unchanged. A static scan across
every registered route confirmed no collisions before this shipped.

## Testing

```bash
pnpm --filter @bcp/contracts test   # rendering, signing readiness, clause types, versioning, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build     # /contracts template builder + management
pnpm --filter @bcp/client-portal build  # /contracts/[token] public signing flow
```
