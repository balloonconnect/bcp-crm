export interface ConditionConfig {
  field: string; // dot-path into the trigger context, e.g. "invoice.daysOverdue"
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string | number | boolean;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

/** Evaluates one `condition_branch` step's config against the trigger context — the same simple field/operator/value shape a studio owner (not a developer) can fill in through the visual editor, not a scripting language. */
export function evaluateCondition(config: ConditionConfig, context: Record<string, unknown>): boolean {
  const actual = getPath(context, config.field);

  switch (config.operator) {
    case "equals":
      return actual === config.value;
    case "not_equals":
      return actual !== config.value;
    case "greater_than":
      return typeof actual === "number" && typeof config.value === "number" && actual > config.value;
    case "less_than":
      return typeof actual === "number" && typeof config.value === "number" && actual < config.value;
    case "contains":
      return typeof actual === "string" && typeof config.value === "string" && actual.includes(config.value);
    default:
      return false;
  }
}
