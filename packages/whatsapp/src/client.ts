export interface WhatsAppConfig {
  apiUrl: string;
  accessToken: string;
  phoneNumberId: string;
}

export interface SendTextMessageInput {
  to: string;
  body: string;
}

export interface SendTemplateMessageInput {
  to: string;
  templateName: string;
  language: string;
  variables?: string[]; // positional {{1}}, {{2}}, ... values
}

export interface SendMediaMessageInput {
  to: string;
  mediaUrl: string;
  caption?: string;
  filename?: string; // documents only
}

export interface SendResult {
  id: string; // Meta's wamid
}

/**
 * A thin wrapper over the Cloud API's /messages endpoint — text and
 * template were already covered before this phase; image/document send
 * are new here. All four share the same request/response shape Meta
 * defines, just a different `type` field and payload key.
 */
export class WhatsAppClient {
  constructor(private config: WhatsAppConfig) {}

  private async post(body: Record<string, unknown>): Promise<SendResult> {
    const res = await fetch(`${this.config.apiUrl}/${this.config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });

    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);

    const json = (await res.json()) as { messages: { id: string }[] };
    return { id: json.messages[0]?.id ?? "" };
  }

  async sendText(input: SendTextMessageInput): Promise<SendResult> {
    return this.post({ to: input.to, type: "text", text: { body: input.body } });
  }

  async sendTemplate(input: SendTemplateMessageInput): Promise<SendResult> {
    return this.post({
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language },
        components: input.variables?.length ? [{ type: "body", parameters: input.variables.map((text) => ({ type: "text", text })) }] : undefined,
      },
    });
  }

  async sendImage(input: SendMediaMessageInput): Promise<SendResult> {
    return this.post({ to: input.to, type: "image", image: { link: input.mediaUrl, caption: input.caption } });
  }

  async sendDocument(input: SendMediaMessageInput): Promise<SendResult> {
    return this.post({ to: input.to, type: "document", document: { link: input.mediaUrl, caption: input.caption, filename: input.filename } });
  }
}
