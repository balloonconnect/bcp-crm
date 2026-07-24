# @bcp/team

Pure logic for team, attendance & freelancer management: the mapping
from the brief's 8 team "types" onto existing employment-type/role
concepts, workload and performance computation, leave-overlap checking,
and validation. Like `@bcp/workflow` and `@bcp/events`, no database
access — `apps/api` gathers real task/event/attendance data and hands it
to these functions.

## What's here

```
src/
  team-types.ts    TEAM_TYPE_TO_ROLE_KEY — maps Photographer/
                   Videographer/Editor/Designer/Salesperson/Accountant
                   onto existing @bcp/permissions StudioRoleKeys;
                   EMPLOYMENT_TYPES for Employee/Freelancer
  workload.ts       computeWorkloadSummary() — active/overdue tasks,
                   upcoming events, computed live, never stored
  performance.ts     computeTaskCompletionSummary(),
                   computeAttendanceRate()
  leave.ts           leaveRangesOverlap(), findOverlappingLeave()
  validation.ts       teamProfileInputSchema, attendanceInputSchema,
                   leaveRequestInputSchema, freelancerPaymentInputSchema, etc.
  index.ts            barrel export
```

See [docs/team-attendance-freelancers.md](../../docs/team-attendance-freelancers.md)
for the full design — why HR data sits in a separate table from
`StudioUser`, and how event conflict warnings reuse `@bcp/events`
directly rather than reimplementing conflict detection.

## Testing

```bash
pnpm --filter @bcp/team test
pnpm --filter @bcp/team typecheck
pnpm --filter @bcp/team lint
```
