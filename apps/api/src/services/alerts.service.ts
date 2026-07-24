import { prisma } from "@bcp/database";
import { evaluateAlertCondition } from "@bcp/observability";
import { logger } from "@bcp/logger";

const log = logger.child({ service: "api", module: "alerts" });

async function recordPlatformActivity(actorId: string, action: string, resourceType: string, resourceId: string) {
  await prisma.auditLog.create({ data: { actorType: "platform_user", actorId, action, resourceType, resourceId } });
}

export async function listAlertRules() {
  return prisma.alertRule.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createAlertRule(input: { name: string; service: string; triggerStatus: string; consecutiveFailuresRequired?: number; notifyEmails?: string[] }, actorId: string) {
  const rule = await prisma.alertRule.create({ data: { name: input.name, service: input.service as never, triggerStatus: input.triggerStatus as never, consecutiveFailuresRequired: input.consecutiveFailuresRequired, notifyEmails: input.notifyEmails ?? [], createdBy: actorId } });
  await recordPlatformActivity(actorId, "alert_rule.created", "AlertRule", rule.id);
  return rule;
}

export async function updateAlertRule(id: string, input: Partial<{ name: string; isActive: boolean; consecutiveFailuresRequired: number; notifyEmails: string[] }>, actorId: string) {
  const rule = await prisma.alertRule.update({ where: { id }, data: input });
  await recordPlatformActivity(actorId, "alert_rule.updated", "AlertRule", id);
  return rule;
}

export async function deleteAlertRule(id: string, actorId: string) {
  await prisma.alertRule.delete({ where: { id } });
  await recordPlatformActivity(actorId, "alert_rule.deleted", "AlertRule", id);
}

/**
 * Evaluates every active `AlertRule` against the most recent health
 * checks for its own service — called right after each health-check
 * cycle (`runAllHealthChecks()`). A rule already actively firing
 * (an unresolved `TriggeredAlert`) is never re-triggered while the
 * underlying problem is ongoing; once its condition stops being met,
 * the open alert is marked resolved. This is what keeps "Failure
 * alerts" (Prompt 44's own instinct, reused here) from becoming one
 * new alert per health-check cycle for the same, still-unresolved
 * problem.
 */
export async function evaluateAlertRules(): Promise<void> {
  const rules = await prisma.alertRule.findMany({ where: { isActive: true } });

  for (const rule of rules) {
    const recentChecks = await prisma.serviceHealthCheck.findMany({ where: { service: rule.service }, orderBy: { checkedAt: "desc" }, take: Math.max(rule.consecutiveFailuresRequired, 1) });
    const conditionMet = evaluateAlertCondition(recentChecks.map((c: { status: string; checkedAt: Date }) => ({ status: c.status as never, checkedAt: c.checkedAt })), rule.triggerStatus, rule.consecutiveFailuresRequired);

    const openAlert = await prisma.triggeredAlert.findFirst({ where: { alertRuleId: rule.id, resolvedAt: null } });

    if (conditionMet && !openAlert) {
      await prisma.triggeredAlert.create({ data: { alertRuleId: rule.id } });
      log.warn({ rule: rule.name, service: rule.service, notifyEmails: rule.notifyEmails }, "alert rule triggered");
      // A real deployment would dispatch to rule.notifyEmails here (via @bcp/email, the same channel
      // every other platform notification in this codebase already uses) — logged for now so the
      // firing itself is never silently lost even before that wiring lands.
    } else if (!conditionMet && openAlert) {
      await prisma.triggeredAlert.update({ where: { id: openAlert.id }, data: { resolvedAt: new Date() } });
      log.info({ rule: rule.name, service: rule.service }, "alert rule condition resolved");
    }
  }
}

export async function listTriggeredAlerts(activeOnly = false) {
  return prisma.triggeredAlert.findMany({ where: activeOnly ? { resolvedAt: null } : {}, include: { alertRule: { select: { name: true, service: true } } }, orderBy: { triggeredAt: "desc" }, take: 100 });
}
