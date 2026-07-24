# Entity-Relationship Diagram

Source of truth is always `prisma/schema.prisma` — this diagram is a
human-readable view of it, grouped into the same four sections as the
schema file itself. Regenerate mentally (or with `prisma-erd-generator`
once the engine is reachable) whenever the schema changes materially.

## Platform (no studioId — not tenant data)

```mermaid
erDiagram
    PlatformUser ||--o{ PlatformUserRole : "has"
    PlatformRole ||--o{ PlatformUserRole : "granted via"
    PlatformPermission }o..o{ PlatformRole : "keys referenced by permissions[]"

    PlatformUser {
        uuid id PK
        string email UK
        string passwordHash
        string name
        enum status
        datetime deletedAt
    }
    PlatformRole {
        uuid id PK
        string key UK
        string name
        bool isSystem
        string_array permissions
    }
    PlatformPermission {
        uuid id PK
        string key UK
        string label
        string category
    }
    PlatformUserRole {
        uuid id PK
        uuid platformUserId FK
        uuid platformRoleId FK
    }
```

## Studio — identity & structure

```mermaid
erDiagram
    Studio ||--o| StudioBrand : "has"
    Studio ||--o{ StudioDomain : "has"
    Studio ||--o{ StudioBranch : "has"
    Studio ||--o{ StudioSetting : "has"
    Studio ||--o{ StudioUser : "has"
    Studio ||--o{ StudioRole : "has"
    Studio ||--o{ Invitation : "has"
    StudioBranch ||--o{ StudioUser : "home branch of"
    StudioUser ||--o{ StudioUserRole : "has"
    StudioRole ||--o{ StudioUserRole : "granted via"
    StudioRole ||--o{ Invitation : "invited with"
    StudioPermission }o..o{ StudioRole : "keys referenced by permissions[]"

    Studio {
        uuid id PK
        string slug UK
        string name
        enum status
        datetime trialEndsAt
        datetime graceEndsAt
        datetime deletedAt
    }
    StudioBrand {
        uuid id PK
        uuid studioId FK "unique"
        string primaryColor
        string accentColor
    }
    StudioDomain {
        uuid id PK
        uuid studioId FK
        string domain UK
        bool isPrimary
    }
    StudioBranch {
        uuid id PK
        uuid studioId FK
        string name
        string code
        bool isPrimary
        bool isActive
        datetime deletedAt
    }
    StudioSetting {
        uuid id PK
        uuid studioId FK
        string key
        json value
    }
    StudioUser {
        uuid id PK
        uuid studioId FK
        uuid branchId FK
        string email
        enum status
        datetime deletedAt
    }
    StudioRole {
        uuid id PK
        uuid studioId FK
        string key
        bool isSystem
        string_array permissions
        datetime deletedAt
    }
    StudioPermission {
        uuid id PK
        string key UK
        string category
    }
    StudioUserRole {
        uuid id PK
        uuid studioUserId FK
        uuid studioRoleId FK
    }
    Invitation {
        uuid id PK
        uuid studioId FK
        string email
        uuid roleId FK
        enum status
        string token UK
    }
```

## Billing, licensing & limits

```mermaid
erDiagram
    Studio ||--o{ Subscription : "subscribes via"
    SubscriptionPlan ||--o{ Subscription : "plan for"
    Studio ||--o{ LicenseKey : "issued to"
    Subscription ||--o{ LicenseKey : "backs"
    LicenseKey ||--o{ Activation : "activated as"
    Studio ||--o{ Activation : "has"
    Studio ||--o{ UsageRecord : "meters"
    Studio ||--o{ FeatureFlag : "overrides"

    SubscriptionPlan {
        uuid id PK
        string key UK
        int priceMonthly
        int priceYearly
        int maxUsers
        json features
    }
    Subscription {
        uuid id PK
        uuid studioId FK
        uuid planId FK
        enum status
        enum billingCycle
        datetime startsAt
        datetime endsAt
    }
    LicenseKey {
        uuid id PK
        uuid studioId FK
        uuid subscriptionId FK
        string key UK
        enum status
        datetime issuedAt
        datetime expiresAt
        int maxActivations
    }
    Activation {
        uuid id PK
        uuid licenseKeyId FK
        uuid studioId FK
        string fingerprint
        enum status
    }
    UsageRecord {
        uuid id PK
        uuid studioId FK
        string metric
        decimal value
        datetime periodStart
        datetime periodEnd
    }
    FeatureFlag {
        uuid id PK
        uuid studioId FK "nullable = global default"
        string key
        bool enabled
    }
```

## Audit, sessions & operations

```mermaid
erDiagram
    Studio ||--o{ AuditLog : "scopes"
    Studio ||--o{ LoginHistory : "scopes"
    Studio ||--o{ Session : "scopes"
    Studio ||--o{ ApiKey : "issues"
    Studio ||--o{ WebhookEndpoint : "configures"
    Studio ||--o{ Notification : "sends"
    StudioUser ||--o{ Notification : "receives"
    Studio ||--o{ JobRecord : "runs"

    AuditLog {
        uuid id PK
        uuid studioId FK "nullable"
        enum actorType
        uuid actorId
        string action
        string resourceType
        datetime createdAt "immutable"
    }
    LoginHistory {
        uuid id PK
        uuid studioId FK "nullable"
        enum actorType
        uuid actorId
        bool success
    }
    Session {
        uuid id PK
        uuid studioId FK "nullable"
        enum actorType
        uuid actorId
        string refreshTokenHash UK
        datetime expiresAt
    }
    ApiKey {
        uuid id PK
        uuid studioId FK
        string keyPrefix
        string hashedKey UK
        string_array scopes
    }
    WebhookEndpoint {
        uuid id PK
        uuid studioId FK
        string url
        string_array events
        datetime deletedAt
    }
    Notification {
        uuid id PK
        uuid studioId FK
        uuid recipientUserId FK
        enum channel
        enum status
    }
    JobRecord {
        uuid id PK
        uuid studioId FK "nullable"
        string queue
        enum status
        int attempts
    }
```

## Reading the diagrams

- `||--o{` = one-to-many, `||--o|` = one-to-one (optional on the many side),
  `}o..o{` = a soft/logical relationship (here: permission keys stored in a
  `permissions: String[]` array rather than a normalized join table — see
  [database-conventions.md](./database-conventions.md) § "Roles &
  permissions" for why).
- `FK "nullable"` marks the small set of intentionally-nullable `studioId`
  columns (platform-wide rows) — see
  [tenant-isolation.md](./tenant-isolation.md) § "Where studioId is
  nullable, and why".
