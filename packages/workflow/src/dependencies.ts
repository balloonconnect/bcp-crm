export interface TaskForDependencyCheck {
  id: string;
  status: string;
  dependsOnTaskIds: string[];
}

/** A task is unblocked once every task it depends on is completed (or there's nothing to depend on) — cancelled prerequisites don't count as satisfying a dependency, since work that was cancelled rather than done shouldn't silently unblock what came after it. */
export function isTaskUnblocked(task: TaskForDependencyCheck, allTasksById: Map<string, TaskForDependencyCheck>): boolean {
  if (task.dependsOnTaskIds.length === 0) return true;
  return task.dependsOnTaskIds.every((depId) => allTasksById.get(depId)?.status === "completed");
}

export interface TaskTemplateForCycleCheck {
  id: string;
  dependsOnTaskTemplateIds: string[];
}

/**
 * Detects a dependency cycle among task templates *before* they're
 * saved — a workflow template where task A depends on B which depends
 * back on A would leave every task in it permanently blocked, so this
 * is checked at template-authoring time rather than discovered later
 * when instantiated tasks never unblock. Standard DFS with a
 * recursion-stack for cycle detection.
 */
export function detectDependencyCycle(templates: TaskTemplateForCycleCheck[]): { hasCycle: boolean; cycleTaskIds: string[] } {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    if (inStack.has(id)) return [...stack.slice(stack.indexOf(id)), id];
    if (visited.has(id)) return null;

    visited.add(id);
    inStack.add(id);
    stack.push(id);

    const template = byId.get(id);
    if (template) {
      for (const depId of template.dependsOnTaskTemplateIds) {
        const cycle = visit(depId);
        if (cycle) return cycle;
      }
    }

    inStack.delete(id);
    stack.pop();
    return null;
  }

  for (const template of templates) {
    const cycle = visit(template.id);
    if (cycle) return { hasCycle: true, cycleTaskIds: cycle };
  }

  return { hasCycle: false, cycleTaskIds: [] };
}
