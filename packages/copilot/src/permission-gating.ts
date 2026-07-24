import { getToolDefinition } from "./tool-registry";

export type ToolAccessResult = { allowed: true } | { allowed: false; reason: "tool_not_found" | "permission_denied" | "phase_locked" };

/**
 * "Permission validation" — the actual gate every tool call passes
 * through before it runs. Checked against the *acting user's own*
 * granted permissions (`@bcp/permissions`, resolved by the caller from
 * their role), never a blanket "the copilot can do anything a studio
 * account can do." A studio user with no `invoice:view` permission
 * gets the exact same "permission denied" from the copilot they'd get
 * clicking into the invoices page directly — the copilot is not a
 * privilege-escalation path.
 */
export function checkToolAccess(toolName: string, grantedPermissions: string[], currentBuildPhase: 1 | 2 | 3 | 4): ToolAccessResult {
  const tool = getToolDefinition(toolName);
  if (!tool) return { allowed: false, reason: "tool_not_found" };

  const effectiveToolPhase = currentBuildPhase === 4 ? 3 : currentBuildPhase;
  if (tool.buildPhase > effectiveToolPhase) return { allowed: false, reason: "phase_locked" };

  if (!grantedPermissions.includes(tool.requiredPermission)) return { allowed: false, reason: "permission_denied" };

  return { allowed: true };
}
