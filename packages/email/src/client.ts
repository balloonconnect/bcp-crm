import nodemailer, { type Transporter } from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  messageId: string;
}

export class EmailClient {
  private transporter: Transporter;
  private from: string;

  constructor(config: EmailConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const result = await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });
    return { messageId: result.messageId };
  }
}
