export type CopilotActionStatus = "draft" | "confirmed" | "executed" | "rejected" | "reversed";

/**
 * "Confirmation for sensitive actions" as an actual state machine, not
 * a UI convention a route could bypass. A write tool's result is
 * always persisted as `draft` first (see `@bcp/copilot`'s
 * `tool-registry.ts` — `kind: "write"`); it can only reach `executed`
 * by first passing through `confirmed`, which requires a human's own
 * explicit action, never something the model itself can set.
 */
const ALLOWED_TRANSITIONS: Record<CopilotActionStatus, CopilotActionStatus[]> = {
  draft: ["confirmed", "rejected"],
  confirmed: ["executed"],
  executed: ["reversed"],
  rejected: [],
  reversed: [],
};

export function canTransitionAction(from: CopilotActionStatus, to: CopilotActionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** "Reversible actions" — only ever offered for an action that both declares itself reversible (a tool-level property) and has actually reached `executed` (nothing to reverse before then). */
export function canReverseAction(status: CopilotActionStatus, isReversible: boolean): boolean {
  return isReversible && status === "executed";
}
