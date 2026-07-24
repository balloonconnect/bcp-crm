import Anthropic from "@anthropic-ai/sdk";

export interface AiConfig {
  apiKey: string;
  model?: string;
}

/** Thin wrapper so features never import @anthropic-ai/sdk directly. */
export class AiClient {
  private client: Anthropic;
  private model: string;

  constructor(config: AiConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? "claude-sonnet-4-6";
  }

  async complete(prompt: string, maxTokens = 1024): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "";
  }

  /** Vision-capable completion — an image plus a text prompt, used for the semantic half of photo analysis (composition, scene, subject prominence) that pixel statistics alone can't judge. `mediaType` must match the actual image bytes; Claude rejects a mismatched declaration. */
  async completeWithImage(prompt: string, imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp", maxTokens = 1024): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "";
  }

  /**
   * Tool-calling primitive for the AI Studio Copilot (Prompt 36) and
   * any future agentic feature. Deliberately a single turn — this
   * function sends messages + tool definitions and returns Claude's
   * raw response (text and/or `tool_use` blocks); it does not execute
   * tools or loop. Tool execution needs studio-scoped business logic
   * (permission checks, `studioId` injection, confirmation gating)
   * that has no business living inside this thin SDK wrapper — the
   * orchestration loop belongs to the caller (`apps/api`'s
   * `copilot.service.ts`), which is also where "never allow
   * cross-tenant AI context" is actually enforced: this method never
   * sees a `studioId` and could not leak one across tenants even if
   * it wanted to.
   */
  async completeWithTools(messages: AiMessage[], tools: AiToolDefinition[], maxTokens = 2048): Promise<AiToolResponse> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: messages as never,
      tools: tools as never,
    });

    const textBlocks = message.content.filter((block): block is { type: "text"; text: string } => block.type === "text");
    const toolUseBlocks = message.content.filter((block): block is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } => block.type === "tool_use");

    return { text: textBlocks.map((b) => b.text).join("\n"), toolCalls: toolUseBlocks.map((b) => ({ id: b.id, name: b.name, input: b.input })), stopReason: message.stop_reason };
  }
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string | AiContentBlock[];
}

export type AiContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface AiToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AiToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiToolResponse {
  text: string;
  toolCalls: AiToolCall[];
  stopReason: string | null;
}
