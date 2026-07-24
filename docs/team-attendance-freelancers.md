# Team, attendance & freelancers

Full HR profiles, attendance/leave tracking, computed workload and
performance, and freelancer payment tracking — built across `@bcp/team`
(type registry, workload/performance computation, leave-overlap checks,
validation) and `apps/api`/`apps/studio-web`'s `/team` page.

## The 8 "types" map onto what already exists

The brief's types split into two axes that were already modeled
separately, on purpose — see `@bcp/team`'s `team-types.ts`:

- **Employee / Freelancer** is `StudioUser.employmentType`, a genuinely
  new field — it describes a person's relationship to the studio,
  independent of what they do.
- **Photographer / Videographer / Editor / Designer / Salesperson /
  Accountant** are the `StudioRoleKey`s `@bcp/permissions` has defined
  since the auth phase (Designer → `album_designer`, Salesperson →
  `sales`) — the functional role that actually drives permissions.
  `TEAM_TYPE_TO_ROLE_KEY` exists only so the team UI can label those
  existing roles with the brief's exact wording, not to introduce a
  second, parallel classification that would drift from the real RBAC
  roles doing the permission work.

## Fields

`StudioUser` gained `employmentType`, `skills`, and
`availabilityStatus` directly (lightweight, frequently-read fields).
Everything heavier and more sensitive — salary, freelancer rate,
payment terms, bank details, emergency contact — lives in a separate
one-to-one `TeamMemberProfile`, so a plain "who's on the team" list
never has to pull that data along with it. Documents
(`TeamDocument`, pointing at a `@bcp/storage` object, with an optional
`expiresAt` for certifications that lapse) and equipment custody
(`TeamEquipmentAssignment` — distinct from `EventEquipment`, which
books a piece of equipment for one shoot's duration; this tracks
longer-term "who's responsible for this camera generally") round out
the profile. Branch is the existing `StudioUser.branchId`; event
assignments are the existing `EventAssignment`/`BookingTeamAssignment`
models from Prompts 11 and 17 — nothing new needed there.

## Attendance, leave, workload, performance

- **Attendance** (`AttendanceRecord`, one row per person per calendar
  day) and **leave** (`LeaveRequest`, pending/approved/rejected) are
  real, stored records.
- **Workload** and **task completion** are *never* stored — they're
  computed live from real `Task`/`Event` data on every request
  (`@bcp/team`'s `computeWorkloadSummary()`/
  `computeTaskCompletionSummary()`), the same reasoning every other
  computed metric in this codebase follows (margins, relationship
  scores): a stored count would drift the moment a task's status
  changes elsewhere.
- **Performance** is split the same way client relationship data is:
  quantitative numbers computed live, plus `PerformanceNote` for the
  qualitative judgment a manager adds on top (a rating and free text
  tied to a period label — not a structured review-template system).
- **Leave overlap**: `@bcp/team`'s `leaveRangesOverlap()` blocks
  submitting a new leave request that overlaps an existing pending or
  approved one for the same person (touching boundaries count as
  overlapping, matching how a person reads a leave calendar).

## Event conflict warnings

Not reimplemented — a team member's conflict warnings call straight
into `@bcp/events`' conflict detection from Prompt 18
(`detectTeamConflicts()`/`detectTravelConflicts()`), just scoped to one
person's whole upcoming schedule instead of a single candidate event.
Prompt 18 built the detection; this phase is the second consumer of it.

## Freelancer payment tracking

`FreelancerPayment` is the mirror image of `ClientPayment` — money
going *out* to a freelancer rather than coming *in* from a client — kept
as its own model rather than overloading `Invoice`, which is
specifically about money owed by clients. A simple pending/paid
aggregate (`getFreelancerPaymentSummary()`) gives a studio the "what do
I still owe this person" answer at a glance.

## Testing

```bash
pnpm --filter @bcp/team test   # type mapping, workload, performance, leave overlap
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /team
```
