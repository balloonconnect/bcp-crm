import { prisma } from "@bcp/database";
import { resolveNextStep, evaluateCondition, isRateLimited, findEntryStep, type ConditionConfig } from "@bcp/automation";
import { assertWithinPlanLimit, recordUsage } from "./plan-limit-enforcement";
import { sendWhatsAppMessage } from "./whatsapp-sender.service";
import { sendEmail } from "./email-sender.service";
import { notifyUser } from "./notifications.service";
import { recordActivity } from "./activity-log.service";

export class AutomationRateLimitedError extends Error {
  readonly code = "AUTOMATION_RATE_LIMITED";
  constructor() {
    super("This automation has run too many times in the last hour and was skipped.");
    this.name = "AutomationRateLimitedError";
  }
}

const MAX_STEPS_PER_RUN = 50; // a hard ceiling independent of cycle detection at enable-time, in case a graph was edited after being enabled

/**
 * Runs one rule for one trigger event. Real (non-test) runs are
 * checked against both the per-rule rate limit
 * (`AutomationRule.maxExecutionsPerHour`) and the studio's platform-wide
 * `maxAutomationRunsPerMonth` usage allowance before a single step
 * executes — a rule that would exceed either never starts, rather than
 * running partway and stopping mid-graph. Test runs skip both checks
 * entirely (a studio verifying a new automation shouldn't spend its
 * real usage allowance or trip its own rate limit) and every action
 * implementation simulates its effect instead of mutating real data.
 */
export async function runRule(studioId: string, ruleId: string, triggerContext: Record<string, unknown>, isTestRun: boolean, actorId: string) {
  const rule = await prisma.automationRule.findFirstOrThrow({ where: { id: ruleId, studioId }, include: { steps: true } });

  if (!isTestRun) {
    if (!rule.isActive) throw new Error("This automation is disabled.");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.automationExecution.count({ where: { ruleId, startedAt: { gte: oneHourAgo }, isTestRun: false } });
    if (isRateLimited(recentCount, rule.maxExecutionsPerHour)) {
      await prisma.automationExecution.create({ data: { ruleId, studioId, status: "rate_limited", triggerContext: triggerContext as never } });
      throw new AutomationRateLimitedError();
    }

    await assertWithinPlanLimit(studioId, "maxAutomationRunsPerMonth");
  }

  const entryStepId = findEntryStep(rule.steps);
  const execution = await prisma.automationExecution.create({ data: { ruleId, studioId, status: "running", isTestRun, triggerContext: triggerContext as never } });

  if (!entryStepId) {
    await prisma.automationExecution.update({ where: { id: execution.id }, data: { status: "failed", errorMessage: "No entry step configured.", completedAt: new Date() } });
    return prisma.automationExecution.findUniqueOrThrow({ where: { id: execution.id } });
  }

  const stepsById = new Map<string, { id: string; actionType: string; actionConfig: unknown; nextStepId: string | null; conditionTrueStepId: string | null; conditionFalseStepId: string | null }>(
    rule.steps.map((s: { id: string; actionType: string; actionConfig: unknown; nextStepId: string | null; conditionTrueStepId: string | null; conditionFalseStepId: string | null }) => [s.id, s]),
  );
  let currentStepId: string | null = entryStepId;
  let stepsRun = 0;
  let context = { ...triggerContext };

  while (currentStepId && stepsRun < MAX_STEPS_PER_RUN) {
    const step = stepsById.get(currentStepId);
    if (!step) break;
    stepsRun += 1;

    const stepResult = await executeStep(studioId, step, context, isTestRun, actorId);
    await prisma.automationStepExecution.create({ data: { executionId: execution.id, stepId: step.id, status: stepResult.succeeded ? "succeeded" : "failed", attemptCount: 1, resultData: stepResult.resultData as never, errorMessage: stepResult.error } });

    if (!stepResult.succeeded) {
      await prisma.automationExecution.update({ where: { id: execution.id }, data: { status: "failed", errorMessage: stepResult.error, completedAt: new Date() } });
      return prisma.automationExecution.findUniqueOrThrow({ where: { id: execution.id } });
    }

    if (stepResult.contextPatch) context = { ...context, ...stepResult.contextPatch };

    const conditionResult = step.actionType === "condition_branch" ? evaluateCondition(step.actionConfig as unknown as ConditionConfig, context) : undefined;
    currentStepId = resolveNextStep(step as never, conditionResult);
  }

  await prisma.automationExecution.update({ where: { id: execution.id }, data: { status: "completed", completedAt: new Date() } });
  if (!isTestRun) {
    await recordUsage(studioId, "maxAutomationRunsPerMonth");
    await recordActivity({ studioId, actorId, action: "automation_rule.executed", resourceType: "AutomationRule", resourceId: ruleId, metadata: { executionId: execution.id } });
  }

  return prisma.automationExecution.findUniqueOrThrow({ where: { id: execution.id } });
}

interface StepResult {
  succeeded: boolean;
  resultData?: Record<string, unknown>;
  contextPatch?: Record<string, unknown>;
  error?: string;
}

/**
 * Every action's write path checks `isTestRun` first and, when true,
 * returns a simulated result describing what *would* have happened —
 * "Test mode" as a real behavior every action honors individually,
 * not a flag the engine only checks once at the top.
 */
async function executeStep(studioId: string, step: { actionType: string; actionConfig: unknown }, context: Record<string, unknown>, isTestRun: boolean, actorId: string): Promise<StepResult> {
  const config = (step.actionConfig ?? {}) as Record<string, unknown>;

  try {
    switch (step.actionType) {
      case "send_whatsapp": {
        const to = String(config.to ?? context.phone ?? "");
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldSendTo: to, body: config.body } };
        await sendWhatsAppMessage(studioId, { to, messageType: "text", body: String(config.body ?? "") }, actorId);
        return { succeeded: true, resultData: { sentTo: to } };
      }
      case "send_email": {
        const to = String(config.to ?? context.email ?? "");
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldSendTo: to, subject: config.subject } };
        await sendEmail(studioId, { to, subject: String(config.subject ?? ""), bodyHtml: String(config.bodyHtml ?? "") }, actorId);
        return { succeeded: true, resultData: { sentTo: to } };
      }
      case "create_task": {
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldCreateTask: config.title } };
        const task = await prisma.task.create({ data: { studioId, title: String(config.title ?? "Automated task"), eventId: context.eventId as string | undefined, assigneeId: config.assigneeId as string | undefined } });
        return { succeeded: true, resultData: { taskId: task.id }, contextPatch: { taskId: task.id } };
      }
      case "assign_user": {
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldAssign: config.userId } };
        if (context.taskId) await prisma.task.update({ where: { id: context.taskId as string }, data: { assigneeId: config.userId as string } });
        return { succeeded: true, resultData: { assignedTo: config.userId } };
      }
      case "update_status": {
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldSetStatus: config.status } };
        if (config.entityType === "Lead" && context.leadId) await prisma.lead.update({ where: { id: context.leadId as string }, data: { status: config.status as never } });
        else if (config.entityType === "Event" && context.eventId) await prisma.event.update({ where: { id: context.eventId as string }, data: { status: config.status as never } });
        return { succeeded: true, resultData: { status: config.status } };
      }
      case "add_tag": {
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldAddTag: config.tag } };
        if (context.leadId) await prisma.lead.update({ where: { id: context.leadId as string }, data: { tags: { push: String(config.tag) } } });
        else if (context.clientId) await prisma.client.update({ where: { id: context.clientId as string }, data: { tags: { push: String(config.tag) } } });
        return { succeeded: true, resultData: { tag: config.tag } };
      }
      case "generate_invoice": {
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldGenerateInvoiceFor: context.clientId } };
        return { succeeded: true, resultData: { note: "Invoice generation from automation requires a quotation reference; not auto-created without one." } };
      }
      case "send_notification": {
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldNotify: config.recipientUserId } };
        if (config.recipientUserId) await notifyUser(studioId, { recipientUserId: String(config.recipientUserId), title: String(config.title ?? "Automation"), body: String(config.body ?? "") }, actorId);
        return { succeeded: true, resultData: { notified: config.recipientUserId } };
      }
      case "call_webhook": {
        const url = String(config.url ?? "");
        if (isTestRun) return { succeeded: true, resultData: { simulated: true, wouldCallWebhook: url } };
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context) });
        return { succeeded: res.ok, resultData: { status: res.status }, error: res.ok ? undefined : `Webhook returned ${res.status}` };
      }
      case "wait": {
        // Automation runs are executed synchronously start-to-finish rather than scheduled — a "wait" step records the requested delay as a no-op rather than actually pausing execution. Real deferred continuation (resuming a run after N minutes) needs a job scheduler this environment doesn't have; an honest limitation, not a silent one.
        return { succeeded: true, resultData: { notedWaitMinutes: config.minutes, note: "Wait is recorded but not actually deferred in this environment — runs execute synchronously." } };
      }
      case "condition_branch": {
        return { succeeded: true, resultData: { evaluated: true } };
      }
      default:
        return { succeeded: false, error: `Unknown action type: ${step.actionType}` };
    }
  } catch (error) {
    return { succeeded: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
