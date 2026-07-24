export interface DefaultWorkflowStage {
  key: string;
  label: string;
  order: number;
}

/**
 * The 17-stage default workflow named in the brief — seeded as the
 * studio's starting `WorkflowTemplate` + its `TaskTemplate`s the same
 * "one-click starting point, not a fixture" way `@bcp/catalog`'s
 * `DEFAULT_SERVICES` seeds a studio's service catalog. Every seeded
 * `TaskTemplate` becomes a completely normal, editable row afterward —
 * a studio can rename, reorder, delete, or add stages freely, and
 * define entirely different stage lists per event type (see
 * `WorkflowTemplate.eventType`).
 */
export const DEFAULT_WORKFLOW_STAGES: DefaultWorkflowStage[] = [
  { key: "enquiry", label: "Enquiry", order: 1 },
  { key: "follow_up", label: "Follow-up", order: 2 },
  { key: "quotation", label: "Quotation", order: 3 },
  { key: "booking", label: "Booking", order: 4 },
  { key: "advance_payment", label: "Advance payment", order: 5 },
  { key: "pre_shoot_planning", label: "Pre-shoot planning", order: 6 },
  { key: "shoot", label: "Shoot", order: 7 },
  { key: "backup", label: "Backup", order: 8 },
  { key: "culling", label: "Culling", order: 9 },
  { key: "editing", label: "Editing", order: 10 },
  { key: "client_selection", label: "Client selection", order: 11 },
  { key: "album_design", label: "Album design", order: 12 },
  { key: "album_approval", label: "Album approval", order: 13 },
  { key: "printing", label: "Printing", order: 14 },
  { key: "gallery_delivery", label: "Gallery delivery", order: 15 },
  { key: "final_payment", label: "Final payment", order: 16 },
  { key: "completion", label: "Completion", order: 17 },
];

export function getDefaultStageLabel(key: string): string {
  return DEFAULT_WORKFLOW_STAGES.find((s) => s.key === key)?.label ?? key;
}
