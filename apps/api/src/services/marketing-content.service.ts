import { prisma } from "@bcp/database";
import { AiClient } from "@bcp/ai";
import { buildGenerationPrompt } from "@bcp/marketing";
import { getEnv } from "@bcp/config";
import { recordActivity } from "./activity-log.service";

export class MarketingRequestNotFoundError extends Error {
  readonly code = "MARKETING_REQUEST_NOT_FOUND";
  constructor() {
    super("Content request not found");
    this.name = "MarketingRequestNotFoundError";
  }
}

export class AiNotConfiguredError extends Error {
  readonly code = "AI_NOT_CONFIGURED";
  constructor() {
    super("AI content generation isn't configured for this environment yet.");
    this.name = "AiNotConfiguredError";
  }
}

let aiClient: AiClient | null | undefined;
function getAiClient(): AiClient | null {
  if (aiClient !== undefined) return aiClient;
  const env = getEnv();
  aiClient = env.ANTHROPIC_API_KEY ? new AiClient({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  return aiClient;
}

const EXAMPLES_PER_GENERATION = 3; // enough few-shot signal without letting one call's prompt balloon

async function getBrandVoiceContext(studioId: string, contentType: string) {
  const [settings, examples] = await Promise.all([
    prisma.marketingBrandVoiceSettings.findUnique({ where: { studioId } }),
    prisma.brandVoiceExample.findMany({ where: { studioId, contentType: contentType as never }, orderBy: { createdAt: "desc" }, take: EXAMPLES_PER_GENERATION }),
  ]);

  return {
    toneDescription: settings?.toneDescription,
    keyPhrases: settings?.keyPhrases ?? [],
    avoidPhrases: settings?.avoidPhrases ?? [],
    examples: examples.map((e: { content: string }) => e.content),
  };
}

export interface GenerateContentInput {
  contentType: string;
  language: string;
  service?: string;
  city?: string;
  targetAudience?: string;
  tone?: string;
  offer?: string;
  platform?: string;
}

/** Generates one piece of content, folding in the studio's own brand voice settings and its most recent saved approved examples for this exact content type — "studio brand voice" as a genuinely improving input, not a static setting. Every request is persisted with its own inputs, independent of whatever the brand voice settings say by the time anyone looks back at it. */
export async function generateContent(studioId: string, input: GenerateContentInput, actorId: string) {
  const client = getAiClient();
  if (!client) throw new AiNotConfiguredError();

  const brandVoice = await getBrandVoiceContext(studioId, input.contentType);
  const prompt = buildGenerationPrompt(input.contentType, input.language, input, brandVoice);
  const generatedContent = await client.complete(prompt, 1024);

  const request = await prisma.marketingContentRequest.create({
    data: { studioId, contentType: input.contentType as never, language: input.language as never, inputs: input as never, generatedContent, createdBy: actorId },
  });

  await recordActivity({ studioId, actorId, action: "marketing_content.generated", resourceType: "MarketingContentRequest", resourceId: request.id, metadata: { contentType: input.contentType } });
  return request;
}

export async function regenerateContent(studioId: string, requestId: string, actorId: string) {
  const existing = await prisma.marketingContentRequest.findFirst({ where: { id: requestId, studioId } });
  if (!existing) throw new MarketingRequestNotFoundError();

  return generateContent(studioId, { contentType: existing.contentType, language: existing.language, ...(existing.inputs as Record<string, string>) }, actorId);
}

export async function listRequests(studioId: string, contentType?: string) {
  return prisma.marketingContentRequest.findMany({ where: { studioId, ...(contentType ? { contentType: contentType as never } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function approveRequest(studioId: string, requestId: string, isApproved: boolean, actorId: string) {
  const existing = await prisma.marketingContentRequest.findFirst({ where: { id: requestId, studioId } });
  if (!existing) throw new MarketingRequestNotFoundError();

  const updated = await prisma.marketingContentRequest.update({ where: { id: requestId }, data: { isApproved } });
  await recordActivity({ studioId, actorId, action: "marketing_content.approval_changed", resourceType: "MarketingContentRequest", resourceId: requestId, metadata: { isApproved } });
  return updated;
}

// ── Brand voice settings ────────────────────────────────────────────

export async function getBrandVoiceSettings(studioId: string) {
  return prisma.marketingBrandVoiceSettings.findUnique({ where: { studioId } });
}

export async function updateBrandVoiceSettings(studioId: string, input: { toneDescription?: string; keyPhrases?: string[]; avoidPhrases?: string[] }, actorId: string) {
  const settings = await prisma.marketingBrandVoiceSettings.upsert({ where: { studioId }, update: input, create: { studioId, ...input } });
  await recordActivity({ studioId, actorId, action: "marketing_brand_voice.updated", resourceType: "Studio", resourceId: studioId });
  return settings;
}

// ── Brand examples ("Allow users to save approved brand examples") ──

export async function listBrandExamples(studioId: string, contentType?: string) {
  return prisma.brandVoiceExample.findMany({ where: { studioId, ...(contentType ? { contentType: contentType as never } : {}) }, orderBy: { createdAt: "desc" } });
}

/** Saving from a generation result marks that request `savedAsBrandExample` and links it via `sourceRequestId`; saving a hand-written example (a studio pasting in a caption they wrote themselves, outside this tool) skips the link entirely — both are equally valid few-shot material going forward. */
export async function saveBrandExample(studioId: string, input: { requestId?: string; contentType?: string; language?: string; content?: string }, actorId: string) {
  if (input.requestId) {
    const request = await prisma.marketingContentRequest.findFirst({ where: { id: input.requestId, studioId } });
    if (!request) throw new MarketingRequestNotFoundError();

    const [example] = await prisma.$transaction([
      prisma.brandVoiceExample.create({ data: { studioId, contentType: request.contentType, language: request.language, content: request.generatedContent, sourceRequestId: request.id, createdBy: actorId } }),
      prisma.marketingContentRequest.update({ where: { id: request.id }, data: { savedAsBrandExample: true } }),
    ]);
    await recordActivity({ studioId, actorId, action: "brand_voice_example.saved", resourceType: "BrandVoiceExample", resourceId: example.id, metadata: { fromRequestId: request.id } });
    return example;
  }

  if (!input.contentType || !input.language || !input.content) throw new Error("contentType, language, and content are required when not saving from a generation request.");
  const example = await prisma.brandVoiceExample.create({ data: { studioId, contentType: input.contentType as never, language: input.language as never, content: input.content, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "brand_voice_example.saved", resourceType: "BrandVoiceExample", resourceId: example.id });
  return example;
}

export async function deleteBrandExample(studioId: string, exampleId: string, actorId: string) {
  const existing = await prisma.brandVoiceExample.findFirst({ where: { id: exampleId, studioId } });
  if (!existing) return;

  await prisma.$transaction([
    prisma.brandVoiceExample.delete({ where: { id: exampleId } }),
    ...(existing.sourceRequestId ? [prisma.marketingContentRequest.update({ where: { id: existing.sourceRequestId }, data: { savedAsBrandExample: false } })] : []),
  ]);
  await recordActivity({ studioId, actorId, action: "brand_voice_example.deleted", resourceType: "BrandVoiceExample", resourceId: exampleId });
}
