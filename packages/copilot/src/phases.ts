export const COPILOT_BUILD_PHASES = [
  { phase: 1, name: "Read-only Copilot", description: "Answers questions using only read tools — nothing is ever created, changed, or sent." },
  { phase: 2, name: "Draft actions", description: "Can propose a draft action (a quotation, a reminder) for a human to review — never executes anything on its own." },
  { phase: 3, name: "Confirmed actions", description: "A human can confirm a proposed draft, and the copilot then executes it for real." },
  { phase: 4, name: "Automation suggestions", description: "The copilot can proactively surface suggestions (e.g. \"3 clients haven't selected photos in 2 weeks\") without being asked — still never auto-executes anything." },
] as const;

export type CopilotBuildPhase = 1 | 2 | 3 | 4;

/** Phase 4 ("Automation suggestions") never grants a new tool capability by itself — it only changes *when* the copilot speaks (proactively vs. only in response to a query). Tool access for phases 1-3 is exactly what `getToolsForPhase()` in `tool-registry.ts` already resolves; a studio at phase 4 still uses the phase-3 tool set. */
export function toolPhaseFor(buildPhase: CopilotBuildPhase): 1 | 2 | 3 {
  return buildPhase === 4 ? 3 : buildPhase;
}
