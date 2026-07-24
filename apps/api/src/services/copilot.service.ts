import { prisma } from "@bcp/database";
import { AiClient, type AiMessage } from "@bcp/ai";
import { COPILOT_TOOLS, checkToolAccess, dedupeSourceReferences, canTransitionAction, canReverseAction, type SourceReference } from "@bcp/copilot";
import * as tools from "./copilot-tools.service";
import { getEnv } from "@bcp/config";

export class CopilotConversationNotFoundError extends Error {
  readonly code = "COPILOT_CONVERSATION_NOT_FOUND";
  constructor() {
    super("Conversation not found");
    this.name = "CopilotConversationNotFoundError";
  }
}

export class CopilotActionNotFoundError extends Error {
  readonly code = "COPILOT_ACTION_NOT_FOUND";
  constructor() {
    super("Action not found");
    this.name = "CopilotActionNotFoundError";
  }
}

export class ToolNotAllowedError extends Error {
  readonly code = "COPILOT_TOOL_NOT_ALLOWED";
  constructor(public readonly reason: string) {
    super(`The copilot can't do that: ${reason.replace(/_/g, " ")}.`);
    this.name = "ToolNotAllowedError";
  }
}

let aiClient: AiClient | null = null;
function getAiClient(): AiClient | null {
  if (aiClient) return aiClient;
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY) return null;
  aiClient = new AiClient({ apiKey: env.ANTHROPIC_API_KEY });
  return aiClient;
}

async function logAudit(studioId: string, userId: string, conversationId: string, action: string, meta?: { toolName?: string; metadata?: Record<string, unknown> }) {
  await prisma.copilotAuditLogEntry.create({ data: { studioId, userId, conversationId, action: action as never, toolName: meta?.toolName, metadata: meta?.metadata } });
}

const TOOL_EXECUTORS: Record<string, (studioId: string, input: never) => Promise<tools.ToolResult>> = {
  list_events: tools.listEvents as never,
  list_overdue_invoices: tools.listOverdueInvoices as never,
  list_pending_album_selections: tools.listPendingAlbumSelections as never,
  get_client_summary: tools.getClientSummary as never,
  get_editor_workload: tools.getEditorWorkload as never,
  forecast_revenue: tools.forecastRevenue as never,
  list_low_profit_events: tools.listLowProfitEvents as never,
  suggest_package: tools.suggestPackage as never,
};

export async function listConversations(studioId: string, userId: string) {
  return prisma.copilotConversation.findMany({ where: { studioId, userId }, orderBy: { lastMessageAt: "desc" } });
}

export async function getConversation(studioId: string, conversationId: string) {
  const conversation = await prisma.copilotConversation.findFirst({ where: { id: conversationId, studioId }, include: { messages: { orderBy: { createdAt: "asc" } }, actions: { orderBy: { createdAt: "desc" } } } });
  if (!conversation) throw new CopilotConversationNotFoundError();
  return conversation;
}

/**
 * The full request/response loop for one user message. Build phase
 * and granted permissions are resolved once, up front, from the
 * *caller's own* context — every tool call this turn makes is checked
 * against them via `checkToolAccess()`; the model has no way to
 * escalate past what the acting user could already do by clicking
 * around the app themselves. Write tools never execute inline: a
 * `tool_use` for one creates a `draft` `CopilotAction` and the loop
 * stops there, handing the draft back for a human to review — Build
 * Phases 2 and 3 in action, not just documented as intended behavior.
 */
export async function sendMessage(studioId: string, userId: string, input: { conversationId?: string; content: string; grantedPermissions: string[]; buildPhase: 1 | 2 | 3 | 4 }) {
  const client = getAiClient();
  if (!client) throw new Error("The AI Studio Copilot isn't configured for this environment yet.");

  const conversation = input.conversationId
    ? await prisma.copilotConversation.findFirst({ where: { id: input.conversationId, studioId } })
    : await prisma.copilotConversation.create({ data: { studioId, userId, title: input.content.slice(0, 80) } });
  if (!conversation) throw new CopilotConversationNotFoundError();

  await logAudit(studioId, userId, conversation.id, "query_received");

  const priorMessages = await prisma.copilotMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, take: 20 });
  await prisma.copilotMessage.create({ data: { conversationId: conversation.id, role: "user", content: input.content } });

  const availableTools = COPILOT_TOOLS.filter((t) => checkToolAccess(t.name, input.grantedPermissions, input.buildPhase).allowed);
  const aiMessages: AiMessage[] = [
    ...priorMessages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: input.content },
  ];

  const systemContext = `You are the AI Studio Copilot for a photography studio management platform. Answer using the tools provided. Only use tools — never invent data. Today's date is ${new Date().toISOString().slice(0, 10)}.`;
  const messagesWithSystemContext: AiMessage[] = aiMessages.length > 0 ? [{ role: "user", content: `${systemContext}\n\n${aiMessages[0]!.content as string}` }, ...aiMessages.slice(1)] : aiMessages;
  const response = await client.completeWithTools(messagesWithSystemContext, availableTools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })));

  let finalText = response.text;
  const sourceReferences: SourceReference[] = [];
  let draftAction: Awaited<ReturnType<typeof prisma.copilotAction.create>> | null = null;

  for (const call of response.toolCalls) {
    const access = checkToolAccess(call.name, input.grantedPermissions, input.buildPhase);
    if (!access.allowed) {
      await logAudit(studioId, userId, conversation.id, "permission_denied", { toolName: call.name });
      finalText += `\n\n(I can't do that: ${access.reason.replace(/_/g, " ")}.)`;
      continue;
    }

    await logAudit(studioId, userId, conversation.id, "tool_called", { toolName: call.name, metadata: call.input });
    const toolDef = availableTools.find((t) => t.name === call.name)!;

    if (toolDef.kind === "read") {
      const executor = TOOL_EXECUTORS[call.name];
      if (!executor) continue;
      const result = await executor(studioId, call.input as never);
      sourceReferences.push(...result.sourceReferences);

      const followUp = await client.completeWithTools(
        [{ role: "user", content: `${systemContext}\n\n${input.content}` }, { role: "assistant", content: [{ type: "tool_use", id: call.id, name: call.name, input: call.input }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(result.data).slice(0, 8000) }] }],
        [],
      );
      finalText = followUp.text || finalText;
    } else {
      draftAction = await prisma.copilotAction.create({
        data: { conversationId: conversation.id, actionType: call.name, status: "draft", payload: call.input as never, isReversible: toolDef.isReversible },
      });
      await logAudit(studioId, userId, conversation.id, "action_proposed", { toolName: call.name, metadata: { actionId: draftAction.id } });
      finalText += `\n\nI've drafted this action for your review — nothing has been done yet.`;
    }
  }

  const dedupedRefs = dedupeSourceReferences(sourceReferences);
  const assistantMessage = await prisma.copilotMessage.create({
    data: { conversationId: conversation.id, role: "assistant", content: finalText, toolCalls: response.toolCalls as never, sourceReferences: dedupedRefs as never },
  });

  if (draftAction) await prisma.copilotAction.update({ where: { id: draftAction.id }, data: { messageId: assistantMessage.id } });
  await prisma.copilotConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  return { conversationId: conversation.id, message: assistantMessage, draftActionId: draftAction?.id ?? null };
}

// ── Action confirm/reject/reverse (Build Phase 3) ───────────────────

export async function confirmAction(studioId: string, userId: string, actionId: string) {
  const action = await prisma.copilotAction.findFirst({ where: { id: actionId, conversation: { studioId } } });
  if (!action) throw new CopilotActionNotFoundError();
  if (!canTransitionAction(action.status, "confirmed")) throw new Error(`Can't confirm an action in status "${action.status}".`);

  await prisma.copilotAction.update({ where: { id: actionId }, data: { status: "confirmed", confirmedBy: userId, confirmedAt: new Date() } });
  await logAudit(studioId, userId, action.conversationId, "action_confirmed", { toolName: action.actionType, metadata: { actionId } });

  return executeAction(studioId, userId, actionId);
}

export async function rejectAction(studioId: string, userId: string, actionId: string) {
  const action = await prisma.copilotAction.findFirst({ where: { id: actionId, conversation: { studioId } } });
  if (!action) throw new CopilotActionNotFoundError();
  if (!canTransitionAction(action.status, "rejected")) throw new Error(`Can't reject an action in status "${action.status}".`);

  const updated = await prisma.copilotAction.update({ where: { id: actionId }, data: { status: "rejected" } });
  await logAudit(studioId, userId, action.conversationId, "action_rejected", { toolName: action.actionType, metadata: { actionId } });
  return updated;
}

async function executeAction(studioId: string, userId: string, actionId: string) {
  const action = await prisma.copilotAction.findFirstOrThrow({ where: { id: actionId } });
  const payload = action.payload as Record<string, unknown>;
  let resultData: Record<string, unknown> = {};
  let reversalData: Record<string, unknown> | undefined;

  if (action.actionType === "create_quotation") {
    const quotation = await prisma.quotation.create({ data: { studioId, clientId: payload.clientId as string, quotationNumber: `Q-DRAFT-${Date.now()}`, status: "draft", subtotal: 0, totalAmount: 0, createdBy: userId } });
    resultData = { quotationId: quotation.id };
    reversalData = { quotationId: quotation.id };
  } else if (action.actionType === "draft_payment_reminder") {
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { id: payload.invoiceId as string, studioId } });
    resultData = { invoiceId: invoice.id, draftText: `Hi, this is a reminder that invoice ${invoice.invoiceNumber} for ₹${(invoice.totalAmount / 100).toLocaleString("en-IN")} is outstanding. Please let us know if you have any questions.` };
  } else if (action.actionType === "create_shot_list") {
    const descriptions = ["Bride getting ready", "Groom getting ready", "Ceremony entrance", "Vows", "Ring exchange", "First kiss", "Family portraits", "Reception entrance", "First dance", "Cake cutting"];
    const created = await prisma.eventShotListItem.createMany({ data: descriptions.map((description, order) => ({ eventId: payload.eventId as string, description, order })) });
    resultData = { eventId: payload.eventId, itemsCreated: created.count };
    reversalData = { eventId: payload.eventId, descriptions };
  }

  const updated = await prisma.copilotAction.update({ where: { id: actionId }, data: { status: "executed", executedAt: new Date(), resultData: resultData as never, reversalData: reversalData as never } });
  await logAudit(studioId, userId, action.conversationId, "action_executed", { toolName: action.actionType, metadata: { actionId, resultData } });
  return updated;
}

export async function reverseAction(studioId: string, userId: string, actionId: string) {
  const action = await prisma.copilotAction.findFirst({ where: { id: actionId, conversation: { studioId } } });
  if (!action) throw new CopilotActionNotFoundError();
  if (!canReverseAction(action.status, action.isReversible)) throw new Error("This action can't be reversed.");

  const reversalData = action.reversalData as Record<string, unknown> | null;
  if (action.actionType === "create_quotation" && reversalData?.quotationId) {
    await prisma.quotation.update({ where: { id: reversalData.quotationId as string }, data: { status: "rejected" } });
  } else if (action.actionType === "create_shot_list" && reversalData?.eventId) {
    await prisma.eventShotListItem.deleteMany({ where: { eventId: reversalData.eventId as string, description: { in: reversalData.descriptions as string[] } } });
  }

  const updated = await prisma.copilotAction.update({ where: { id: actionId }, data: { status: "reversed", reversedAt: new Date() } });
  await logAudit(studioId, userId, action.conversationId, "action_reversed", { toolName: action.actionType, metadata: { actionId } });
  return updated;
}

export async function getAuditLog(studioId: string, conversationId?: string) {
  return prisma.copilotAuditLogEntry.findMany({ where: { studioId, ...(conversationId ? { conversationId } : {}) }, orderBy: { createdAt: "desc" }, take: 200 });
}
