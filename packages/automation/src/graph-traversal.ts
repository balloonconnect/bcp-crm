export interface StepNode {
  id: string;
  actionType: string;
  nextStepId: string | null;
  conditionTrueStepId: string | null;
  conditionFalseStepId: string | null;
}

/** Resolves which step runs after the current one — a `condition_branch` step picks between its two branch pointers based on the condition's own result; every other action type has exactly one successor (`nextStepId`), or none (the graph ends). */
export function resolveNextStep(current: StepNode, conditionResult?: boolean): string | null {
  if (current.actionType === "condition_branch") {
    return conditionResult ? current.conditionTrueStepId : current.conditionFalseStepId;
  }
  return current.nextStepId;
}

/** Finds the one step flagged as the graph's entry point — the visual editor requires exactly one, since an automation with zero or multiple starting points has no well-defined execution order. */
export function findEntryStep(steps: { id: string; isEntryPoint: boolean }[]): string | null {
  const entryPoints = steps.filter((s) => s.isEntryPoint);
  return entryPoints.length === 1 ? entryPoints[0]!.id : null;
}

/** A studio's visual graph can accidentally contain a cycle (step A's next points back to an earlier step) — walked here with a visited-set so the execution engine can refuse to run a cyclic graph rather than looping forever. */
export function detectCycle(steps: StepNode[], startId: string): boolean {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  let current: string | null = startId;

  while (current) {
    if (visited.has(current)) return true;
    visited.add(current);
    const node = byId.get(current);
    if (!node) break;
    // Cycle detection walks the "true"/default branch only — a fast, sufficient check for the common case; a full DAG cycle check across both branches is unnecessary complexity for what's meant to stay a simple, studio-editable graph.
    current = node.actionType === "condition_branch" ? node.conditionTrueStepId : node.nextStepId;
  }
  return false;
}
