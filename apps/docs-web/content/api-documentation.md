# API Documentation

For developers building integrations against BCP Studio OS.

## Base URL

All API requests go to your platform's own API domain, e.g.
`https://api.yourplatform.com`.

## Authentication

Every request (other than sign-in and a small number of public
endpoints) requires a Bearer access token:

```
Authorization: Bearer <your-access-token>
```

Obtain one by signing in via `POST /auth/login`, then use
`POST /auth/refresh` to get a new access token before your current one
expires — a refresh token is stored automatically as a secure cookie
by the official web apps, and can be provided directly in the request
body for other clients.

## Response shape

Every response follows the same envelope:

```json
{ "ok": true, "data": { ... } }
```

or, on failure:

```json
{ "ok": false, "error": { "code": "SOME_ERROR_CODE", "message": "A human-readable explanation" } }
```

## Rate limiting

Requests are rate-limited per account and per IP address — a `429`
response means you've hit the limit; the response includes a
`Retry-After` header telling you how long to wait.

## Tenant scoping

Every request is automatically scoped to the studio your access token
belongs to — there's no parameter to request another studio's data,
and attempting to reference another studio's record ID in a request
is rejected outright.

## Key resource areas

| Area | Example endpoints |
|---|---|
| Leads & CRM | `/leads`, `/clients` |
| Quotations & bookings | `/quotations`, `/bookings` |
| Events | `/events` |
| Galleries | `/galleries`, `/gallery-photos` |
| Invoices & payments | `/invoices` |
| Reports | `/reports/run` |
| Automation | `/automation/rules` |
| Search | `/search` |
| Webhooks (inbound) | `/webhooks/whatsapp` |

## Webhooks you can receive

If you've configured [WhatsApp](/docs/whatsapp-setup) or a payment
gateway, this platform receives *inbound* webhooks from those
providers — it doesn't currently offer outbound webhooks to your own
systems for platform events, though the underlying "Webhooks" queue
infrastructure (see the engineering documentation) is designed to
support that as a future addition.

## Full endpoint reference

This platform has over 500 API endpoints across every feature area —
too many to list exhaustively here. The most reliable reference is
the request/response validation built into the API itself: an invalid
request always returns a clear `400` error naming exactly which field
was wrong, and every endpoint's expected input follows the same
consistent JSON-body-with-Zod-validation pattern throughout.
