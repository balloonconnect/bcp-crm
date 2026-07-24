export const AUTOMATION_ACTIONS = [
  { key: "send_whatsapp", label: "Send WhatsApp", isTerminal: false },
  { key: "send_email", label: "Send email", isTerminal: false },
  { key: "create_task", label: "Create task", isTerminal: false },
  { key: "assign_user", label: "Assign user", isTerminal: false },
  { key: "update_status", label: "Update status", isTerminal: false },
  { key: "add_tag", label: "Add tag", isTerminal: false },
  { key: "generate_invoice", label: "Generate invoice", isTerminal: false },
  { key: "send_notification", label: "Send notification", isTerminal: false },
  { key: "call_webhook", label: "Call webhook", isTerminal: false },
  { key: "wait", label: "Wait", isTerminal: false },
  { key: "condition_branch", label: "Condition branch", isTerminal: false, isBranch: true },
] as const;

export type AutomationActionKey = (typeof AUTOMATION_ACTIONS)[number]["key"];

export function getActionDefinition(key: string) {
  return AUTOMATION_ACTIONS.find((a) => a.key === key);
}

export function isBranchAction(key: string): boolean {
  return key === "condition_branch";
}
