# Task & workflow engine

A customizable, per-event-type workflow system — built across
`@bcp/workflow` (default stage registry, dependency-cycle detection,
SLA/escalation resolution, recurrence math, validation) and
`apps/api`/`apps/studio-web`'s `/workflows` and `/tasks` pages.

## Templates vs. instances

Two distinct layers, deliberately kept separate:

- **`WorkflowTemplate`** + **`TaskTemplate`** — the reusable blueprint a
  studio designs once. `WorkflowTemplate.eventType` (free text, matching
  `Event.eventType`'s convention) is how *"allow workflow customization
  by event type"* actually works: a studio can define one template per
  event type (a 17-stage Wedding workflow, a lean 6-stage Birthday one)
  plus a single `isDefault` template (`eventType = null`) as the
  fallback.
- **`WorkflowInstance`** + **`Task`** — created every time a template is
  *applied* to a real booking or event. Every `Task` is a snapshot of
  its `TaskTemplate` at the moment of application (title, priority, SLA,
  checklist items all copied over), so editing a template afterward
  never rewrites tasks already in flight — the same snapshot discipline
  every other template→instance relationship in this codebase follows
  (Package→Quotation, Quotation→Booking).

## The 17-stage default workflow

`@bcp/workflow`'s `DEFAULT_WORKFLOW_STAGES` — Enquiry through Completion
— is seed data (`POST /workflow-templates/seed-default`), not a
fixture: seeding creates one `WorkflowTemplate` marked `isDefault` and
17 `TaskTemplate` rows wired as a linear dependency chain (each stage
depends on the one before it), so the seeded workflow is immediately
usable as an ordered pipeline, not just a flat task list. Every row is
completely normal and editable afterward.

## Applying a workflow

`POST /workflow-instances/apply` resolves which template to use
(explicit `workflowTemplateId`, or by matching the target event's
`eventType`, or the studio's default) and instantiates every task in
one pass:

- **Due dates** resolve from `TaskTemplate.defaultDueOffsetDays` relative
  to the event's `scheduledAt` (negative = before the shoot).
- **Assignees** resolve from `TaskTemplate.defaultAssigneeRole` by
  finding a `StudioUser` holding that `StudioRole` — a best-effort
  match, not a hard reference; an unmatched role just leaves the task
  unassigned rather than failing the whole application.
- **Dependencies** are translated from template-id references to real
  task-id references in a second pass, since a template can depend on
  another template that comes later in `order`.
- **Checklist items** on the template are copied onto each instantiated
  task's own `TaskChecklistItem` rows.

## Dependencies

`Task.dependsOnTaskIds` (and `TaskTemplate.dependsOnTaskTemplateIds`)
are plain arrays, not a join table — a dependency list is read as "the
full prerequisite set for this one task," never queried from the
reverse direction at a scale that would need a relational join.
`@bcp/workflow`'s `isTaskUnblocked()` is checked before a task can move
to `in_progress` or `completed` (a cancelled prerequisite does **not**
count as satisfying a dependency — work that was cancelled rather than
done shouldn't silently unblock what came after it), and
`detectDependencyCycle()` is checked at template-authoring time so a
studio can't accidentally create a template where two tasks depend on
each other and neither can ever unblock.

## SLA tracking & escalation

`Task.slaDeadline` is resolved once at creation
(`resolveSlaDeadline()`), then `resolveSlaStatus()`/`shouldEscalate()`
are evaluated **on every read** (`GET /tasks`, `GET /tasks/:id`) rather
than depending on a scheduled job — the same pattern
`bookings.service.ts` uses for payment-milestone overdue status. A task
past its deadline and not yet escalated gets `escalatedAt` set and its
assignee emailed; escalation fires once per task, not repeatedly on
every subsequent read.

## Recurring tasks

A recurring task (`isRecurring` + `recurrenceFrequency` +
`recurrenceInterval`) spawns its next occurrence the moment it's marked
`completed` — a fresh `Task` with the same shape and a due date computed
via calendar arithmetic (`computeNextOccurrence()`, so a monthly task
due on the 31st behaves the way a person expects across shorter months,
not by drifting via a fixed millisecond offset), rather than the
completed task rescheduling itself in place. This keeps history a clean
one-task-per-occurrence record.

## Approval steps, comments, attachments

`Task.isApprovalStep` + `approvalStatus` (`not_required` by default,
`pending` when the flag is set) gate a task on an explicit
approve/reject decision (`POST /tasks/:id/approval`) rather than a
plain status change — approving auto-completes the task, rejecting
leaves it exactly where it was for someone to address. Comments
(`TaskComment`) and attachments (`TaskAttachment`, pointing at a
`@bcp/storage` object the same `fileKey` convention as
`LeadAttachment`/`ClientContract` uses) are flat per-task logs, no
threading.

## Testing

```bash
pnpm --filter @bcp/workflow test   # default stages, dependency cycles, SLA/escalation, recurrence
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /workflows and /tasks
```
