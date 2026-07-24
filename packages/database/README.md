# @bcp/database

Prisma schema, migrations, seed data, and the tenant-scoped Prisma client
for BCP Studio OS's platform + multi-tenant data model.

## What's here

```
prisma/
  schema.prisma                              185 models: platform RBAC,
                                              studio identity/RBAC, billing
                                              & licensing, audit/ops, auth
                                              extensions, branding, domains,
                                              onboarding, studio CRM, lead
                                              management, enquiry forms,
                                              client CRM, services/packages,
                                              quotation management, booking
                                              management, event/calendar
                                              management, task/workflow
                                              engine, team/attendance/
                                              freelancers, equipment
                                              management, vendors/expenses/
                                              profit, invoice/receipt/
                                              payments, WhatsApp
                                              integration, email &
                                              notifications, photo
                                              gallery, bulk photo
                                              upload, AI face
                                              recognition, AI photo
                                              intelligence, AI culling
                                              & albums, client photo
                                              selection, album design
                                              & 3D e-album, client
                                              portal, contracts &
                                              e-signature, print
                                              products & commerce,
                                              AI Studio Copilot,
                                              AI Marketing Studio,
                                              Automation Builder,
                                              Reports & Analytics,
                                              Global Search, Import/
                                              Export/Backup, PWA (Notes),
                                              Security Hardening
                                              (Studio Deletion),
                                              Testing, Monitoring &
                                              Observability
  migrations/
    20260710000000_init/                     full initial schema
    20260710000100_partial_unique_indexes/    conditional-uniqueness indexes
    20260710000200_auth_extensions/            verification tokens, 2FA,
                                              lockout, OAuth linking
    20260710000300_branding_engine/             full StudioBrand field set,
                                              branch overrides, versioning
    20260710000400_custom_domains/               domain purposes, TXT/CNAME
                                              verification, SSL, retries
    20260710000500_platform_admin/                platform settings,
                                              announcements, support
                                              requests, payments
    20260710000600_subscription_licensing/         plan limits JSON, license
                                              grace period, activation
                                              device metadata
    20260710000700_onboarding/                       onboarding sessions,
                                              minimal Client model
    20260710000800_studio_crm_dashboard/               leads, events,
                                              quotations, invoices,
                                              payments, galleries, albums,
                                              expenses, dashboard layout
    20260710000900_lead_management/                     9-stage pipeline
                                              (safe enum data remap),
                                              full lead field set,
                                              notes/attachments/comms
    20260710001000_enquiry_form/                          public enquiry
                                              forms, submission audit
                                              trail with UTM/consent
    20260710001100_client_crm/                              full client
                                              profile, family contacts,
                                              contracts, print orders,
                                              deliveries, feedback
    20260710001200_services_and_packages/                     services,
                                              packages, add-ons, payment
                                              schedule items
    20260710001300_quotation_management/                        line
                                              items, discount/GST,
                                              revisions, view/approval
                                              audit, OTP access codes
    20260710001400_booking_management/                            the
                                              Booking spine, line items,
                                              team assignment, payment
                                              milestones
    20260710001500_event_calendar_management/                       full
                                              shoot-day detail, equipment
                                              catalog, per-event
                                              services, shot lists,
                                              intra-day schedules
    20260710001600_task_workflow_engine/                               workflow
                                              templates, task templates,
                                              workflow instances, tasks
                                              with checklists/comments/
                                              attachments
    20260710001700_team_attendance_freelancers/                          employment
                                              type/skills/availability,
                                              HR profile, documents,
                                              attendance, leave,
                                              performance, freelancer
                                              payments
    20260710001800_equipment_management/                                   full
                                              asset register, QR token,
                                              maintenance/repair/rental
                                              history, damage reports,
                                              checkout log
    20260710001900_vendors_expenses_profit/                                  vendor
                                              register, cost centres,
                                              purchase orders, vendor
                                              bills, full expense
                                              expansion
    20260710002000_invoice_receipt_payments/                                 document
                                              type/branch/FY numbering,
                                              CGST/SGST/IGST, discount,
                                              installments, Receipt/
                                              CreditNote/RefundReceipt,
                                              new payment methods
    20260710002100_whatsapp_integration/                                     per-studio
                                              Cloud API config,
                                              approved templates,
                                              message log with
                                              delivery tracking, opt-in/
                                              opt-out
    20260710002200_email_and_notifications/                                  per-studio
                                              email provider config,
                                              template registry,
                                              delivery/bounce
                                              tracking, notification
                                              preferences, push
                                              subscriptions
    20260710002300_photo_gallery/                                            unique
                                              link/QR, password/OTP,
                                              expiry, download
                                              controls, watermark,
                                              guest sessions,
                                              favorites/comments,
                                              download tracking
    20260710002400_bulk_photo_upload/                                          UploadSession/
                                              UploadChunk (multipart
                                              upload state), GalleryPhoto
                                              preview/checksum/EXIF/
                                              blur-placeholder columns
    20260710002500_ai_face_recognition/                                        FaceCollection
                                              (one per gallery),
                                              FaceIndexEntry,
                                              FaceSearchSession/Match,
                                              FaceConsentLog
    20260710002600_ai_photo_intelligence/                                      PhotoAnalysis
                                              (blur/exposure/noise/faces/
                                              composition/quality),
                                              PhotoAnalysisReviewLog
                                              (approve/reject/undo/bulk),
                                              DuplicateGroup/Member
    20260710002700_ai_culling_and_album_suggestions/                            CullingSession
                                              (preset + priority
                                              weights), CullingRecommendation,
                                              AlbumSuggestion/Photo
                                              (sequence/cover)
    20260710002800_client_photo_selection/                                     Album
                                              expansion (secure link,
                                              OTP, limits, deadline,
                                              lock/reopen), AlbumCategoryLimit,
                                              AlbumSelectionItem/History,
                                              AlbumAccessSession
    20260710002900_album_design_and_ealbum/                                    AlbumProductionStage
                                              (11 stages), AlbumSpread
                                              (versioned), AlbumSpreadComment/
                                              Approval, AlbumRevisionRequest,
                                              PrintOrder expansion (specs/
                                              lab/courier), EAlbumAccessSession
    20260710003000_client_portal/                                              ClientPortalSession
                                              (OTP login, scoped to
                                              the whole client
                                              relationship), ClientSupportRequest/
                                              Reply, ClientContract.signedByName
    20260710003100_contracts_and_esignature/                                   ContractTemplate
                                              (studio-owned, JSON
                                              sections), ContractVersion
                                              (append-only), ContractAuditLogEntry,
                                              ClientContract expansion
                                              (OTP/witness/IP/certificate)
    20260710003200_print_products_and_commerce/                                Product/Variant
                                              (9 categories), EventProductPricing,
                                              Coupon, CommerceOrder/Item/
                                              Payment, PlatformCommerceSettings
                                              (commission, 0 by default)
    20260710003300_ai_studio_copilot/                                          CopilotConversation/
                                              Message (source references),
                                              CopilotAction (draft/confirmed/
                                              executed/reversed), CopilotAuditLogEntry
    20260710003400_ai_marketing_studio/                                        MarketingBrandVoiceSettings,
                                              MarketingContentRequest
                                              (13 types x 5 languages),
                                              BrandVoiceExample
    20260710003500_automation_builder/                                         AutomationRule
                                              (16 triggers), AutomationStep
                                              (step graph, 11 actions),
                                              AutomationExecution/
                                              StepExecution (retry/failure)
    20260710003600_reports_and_analytics/                                      SavedReport
                                              (22 report types, filters
                                              snapshotted), ScheduledReport
                                              (daily/weekly/monthly)
    20260710003700_global_search/                                              RecentSearch,
                                              SavedSearch (both scoped
                                              per user, not just studio)
    20260710003800_import_export_backup/                                       ImportJob/Error
                                              (8 types, column mapping),
                                              ExportJob (10 types),
                                              StudioBackup/RestoreJob
                                              (Platform Admin approval)
    20260710003900_notes/                                                      Note (polymorphic,
                                              append-only — built for
                                              the PWA offline note queue)
    20260710004000_account_studio_deletion/                                    StudioDeletionRequest
                                              (Platform Admin approval,
                                              same gate as backup/restore)
    20260710004100_monitoring_observability/                                   ServiceHealthCheck,
                                              AlertRule/TriggeredAlert,
                                              Incident/IncidentUpdate
                                              (all platform-wide)
  seed.ts                                    idempotent seed: platform
                                              catalog, subscription plans,
                                              one demo studio end-to-end
src/
  client.ts            singleton PrismaClient (dev hot-reload safe)
  tenant-client.ts      createTenantClient(prisma, studioId) — auto-scoped
                        Prisma Client Extension, see tenant-isolation.md
  tenant-scope.ts        pure scoping logic behind tenant-client.ts,
                        unit-tested independently of the Prisma runtime
  __tests__/            vitest suite for tenant-scope.ts
docs/
  er-diagram.md          Mermaid ER diagrams, grouped by schema section
  tenant-isolation.md    how isolation is enforced, lifecycle states,
                        one-year licenses, users-in-multiple-studios
  database-conventions.md  naming, typing, soft-delete, and every other
                          schema-wide rule this file follows
```

## Quick start

```bash
pnpm db:generate     # prisma generate
pnpm db:migrate       # prisma migrate dev (applies every migration above)
pnpm --filter @bcp/database db:seed
pnpm db:studio         # browse the seeded data
```

See the root [docs/setup.md](../../docs/setup.md) for the full local
environment walkthrough (Postgres via Docker Compose, `.env` setup, etc).

> **Sandboxed build note:** this schema and its migrations were authored
> and reviewed in an environment without network access to
> `binaries.prisma.sh`, so `prisma generate`/`prisma migrate dev` could not
> be run here to auto-verify them — the migration SQL was hand-written to
> exactly match `schema.prisma` instead. The first time this runs
> somewhere with normal network access, see
> [docs/database-conventions.md](./docs/database-conventions.md) §
> "Migrations" for how to confirm they haven't drifted before trusting
> `prisma migrate dev` for anything further.

## The tenant-scoped client

Don't query studio-scoped models with the raw `PrismaClient` from
application code — use `createTenantClient`:

```ts
import { prisma, createTenantClient } from "@bcp/database";

const db = createTenantClient(prisma, session.studioId);
const users = await db.studioUser.findMany(); // studioId filter automatic
```

Full rationale, the enforcement layers this is one part of, and how
cross-tenant bugs get caught (`CrossTenantAccessError`) are in
[docs/tenant-isolation.md](./docs/tenant-isolation.md).



`StudioDomain` now also carries the full custom-domain management field
set (purpose, verification method/attempts/retry scheduling, SSL status,
activation) — see
[packages/domains/docs/custom-domains.md](../domains/docs/custom-domains.md).
`StudioBrand`/`BranchBrand`/`StudioBrandVersion` carry the full white-label
branding field set — see
[packages/branding/docs/branding.md](../branding/docs/branding.md).
