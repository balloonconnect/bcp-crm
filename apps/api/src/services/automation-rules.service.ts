import { prisma } from "@bcp/database";
import { findEntryStep, detectCycle } from "@bcp/automation";
import { recordActivity } from "./activity-log.service";

export class AutomationRuleNotFoundError extends Error {
  readonly code = "AUTOMATION_RULE_NOT_FOUND";
  constructor() {
    super("Automation rule not found");
    this.name = "AutomationRuleNotFoundError";
  }
}

export class AutomationStepNotFoundError extends Error {
  readonly code = "AUTOMATION_STEP_NOT_FOUND";
  constructor() {
    super("Automation step not found");
    this.name = "AutomationStepNotFoundError";
  }
}

export class InvalidAutomationGraphError extends Error {
  readonly code = "INVALID_AUTOMATION_GRAPH";
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "InvalidAutomationGraphError";
  }
}

export async function listRules(studioId: string, filter?: { triggerType?: string; isActive?: boolean }) {
  return prisma.automationRule.findMany({ where: { studioId, ...(filter?.triggerType ? { triggerType: filter.triggerType as never } : {}), ...(filter?.isActive !== undefined ? { isActive: filter.isActive } : {}) }, orderBy: { createdAt: "desc" } });
}

export async function getRule(studioId: string, ruleId: string) {
  const rule = await prisma.automationRule.findFirst({ where: { id: ruleId, studioId }, include: { steps: true } });
  if (!rule) throw new AutomationRuleNotFoundError();
  return rule;
}

export async function createRule(studioId: string, input: { name: string; description?: string; triggerType: string; triggerConfig?: Record<string, unknown>; maxExecutionsPerHour?: number }, actorId: string) {
  const rule = await prisma.automationRule.create({ data: { studioId, name: input.name, description: input.description, triggerType: input.triggerType as never, triggerConfig: input.triggerConfig, maxExecutionsPerHour: input.maxExecutionsPerHour, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "automation_rule.created", resourceType: "AutomationRule", resourceId: rule.id, metadata: { name: rule.name, triggerType: rule.triggerType } });
  return rule;
}

export async function updateRule(studioId: string, ruleId: string, input: Partial<{ name: string; description: string; triggerType: string; triggerConfig: Record<string, unknown>; maxExecutionsPerHour: number }>, actorId: string) {
  await getRule(studioId, ruleId);
  await prisma.automationRule.update({ where: { id: ruleId }, data: { ...input, triggerType: input.triggerType as never } });
  await recordActivity({ studioId, actorId, action: "automation_rule.updated", resourceType: "AutomationRule", resourceId: ruleId });
  return getRule(studioId, ruleId);
}

export async function deleteRule(studioId: string, ruleId: string, actorId: string) {
  await getRule(studioId, ruleId);
  await prisma.automationRule.delete({ where: { id: ruleId } });
  await recordActivity({ studioId, actorId, action: "automation_rule.deleted", resourceType: "AutomationRule", resourceId: ruleId });
}

/** "Enable and disable" — a rule is inert (never fires, regardless of matching triggers) until this is set true. Enabling validates the step graph first — a single entry point, no cycle — so a studio can't accidentally turn on a broken automation. */
export async function setRuleActive(studioId: string, ruleId: string, isActive: boolean, actorId: string) {
  const rule = await getRule(studioId, ruleId);

  if (isActive) {
    const entryStepId = findEntryStep(rule.steps);
    if (!entryStepId) throw new InvalidAutomationGraphError("This automation needs exactly one starting step before it can be enabled.");
    if (detectCycle(rule.steps as never, entryStepId)) throw new InvalidAutomationGraphError("This automation's steps form a loop — fix the graph before enabling it.");
  }

  await prisma.automationRule.update({ where: { id: ruleId }, data: { isActive } });
  await recordActivity({ studioId, actorId, action: isActive ? "automation_rule.enabled" : "automation_rule.disabled", resourceType: "AutomationRule", resourceId: ruleId });
  return getRule(studioId, ruleId);
}

// ── Steps ("Visual workflow editor" persistence) ─────────────────────

export async function createStep(studioId: string, ruleId: string, input: { actionType: string; actionConfig?: Record<string, unknown>; positionX?: number; positionY?: number; isEntryPoint?: boolean }, actorId: string) {
  await getRule(studioId, ruleId);

  if (input.isEntryPoint) {
    const existingEntry = await prisma.automationStep.findFirst({ where: { ruleId, isEntryPoint: true } });
    if (existingEntry) await prisma.automationStep.update({ where: { id: existingEntry.id }, data: { isEntryPoint: false } });
  }

  const step = await prisma.automationStep.create({ data: { ruleId, actionType: input.actionType as never, actionConfig: input.actionConfig, positionX: input.positionX, positionY: input.positionY, isEntryPoint: input.isEntryPoint ?? false } });
  await recordActivity({ studioId, actorId, action: "automation_step.created", resourceType: "AutomationRule", resourceId: ruleId, metadata: { stepId: step.id, actionType: step.actionType } });
  return step;
}

export async function updateStep(studioId: string, ruleId: string, stepId: string, input: Partial<{ actionType: string; actionConfig: Record<string, unknown>; positionX: number; positionY: number; nextStepId: string; conditionTrueStepId: string; conditionFalseStepId: string; isEntryPoint: boolean }>, actorId: string) {
  await getRule(studioId, ruleId);
  const existing = await prisma.automationStep.findFirst({ where: { id: stepId, ruleId } });
  if (!existing) throw new AutomationStepNotFoundError();

  if (input.isEntryPoint) {
    const existingEntry = await prisma.automationStep.findFirst({ where: { ruleId, isEntryPoint: true, id: { not: stepId } } });
    if (existingEntry) await prisma.automationStep.update({ where: { id: existingEntry.id }, data: { isEntryPoint: false } });
  }

  const updated = await prisma.automationStep.update({ where: { id: stepId }, data: { ...input, actionType: input.actionType as never } });
  await recordActivity({ studioId, actorId, action: "automation_step.updated", resourceType: "AutomationRule", resourceId: ruleId, metadata: { stepId } });
  return updated;
}

export async function deleteStep(studioId: string, ruleId: string, stepId: string, actorId: string) {
  await getRule(studioId, ruleId);
  await prisma.automationStep.deleteMany({ where: { id: stepId, ruleId } });
  await recordActivity({ studioId, actorId, action: "automation_step.deleted", resourceType: "AutomationRule", resourceId: ruleId, metadata: { stepId } });
}

// ── Execution history ────────────────────────────────────────────────

export async function listExecutions(studioId: string, ruleId?: string) {
  return prisma.automationExecution.findMany({ where: { studioId, ...(ruleId ? { ruleId } : {}) }, orderBy: { startedAt: "desc" }, take: 100 });
}

export async function getExecution(studioId: string, executionId: string) {
  const execution = await prisma.automationExecution.findFirst({ where: { id: executionId, studioId }, include: { stepExecutions: { orderBy: { executedAt: "asc" } } } });
  if (!execution) throw new Error("Execution not found");
  return execution;
}
