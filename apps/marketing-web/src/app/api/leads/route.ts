import { NextResponse } from "next/server";
import { z } from "zod";
import { EmailClient } from "@bcp/email";

export const runtime = "nodejs";

const leadSchema = z.object({
  type: z.enum(["contact", "demo_request"]),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  studioName: z.string().max(160).optional(),
  message: z.string().max(2000).optional(),
  preferredTime: z.string().max(200).optional(), // demo requests only
  // Simple, dependency-free spam trap: a hidden field real visitors never fill.
  website: z.string().max(0).optional(),
});

function buildEmailBody(input: z.infer<typeof leadSchema>): string {
  const rows = [
    ["Type", input.type === "demo_request" ? "Demo request" : "Contact form"],
    ["Name", input.name],
    ["Email", input.email],
    ["Phone", input.phone ?? "—"],
    ["Studio name", input.studioName ?? "—"],
    ["Preferred time", input.preferredTime ?? "—"],
    ["Message", input.message ?? "—"],
  ];
  return `<table>${rows.map(([label, value]) => `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`).join("")}</table>`;
}

/**
 * Lead capture for the Contact and Book Demo forms — validates, rejects
 * obvious bots via a honeypot field, and emails the sales inbox through
 * the shared `@bcp/email` client (same SMTP/Mailpit setup every other
 * app in the monorepo uses). No CRM `Lead` model exists yet in this
 * phase (see packages/onboarding/docs/onboarding.md's "Client model"
 * note for the same reasoning) — this is intentionally a notification
 * pipeline, not a stored pipeline; wiring it into a real Leads module is
 * a later phase once that CRM surface exists.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "Malformed request body" } }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } }, { status: 422 });
  }

  if (parsed.data.website) {
    // Honeypot tripped — pretend success so the bot doesn't learn anything, but don't send an email.
    return NextResponse.json({ ok: true, data: null });
  }

  const notifyTo = process.env.LEADS_NOTIFICATION_EMAIL ?? "sales@bcpstudio.app";

  try {
    const client = new EmailClient({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.EMAIL_FROM ?? "BCP Studio OS <hello@bcpstudio.app>",
    });

    await client.send({
      to: notifyTo,
      subject: parsed.data.type === "demo_request" ? `New demo request — ${parsed.data.name}` : `New contact form message — ${parsed.data.name}`,
      html: buildEmailBody(parsed.data),
    });
  } catch (error) {
    console.error("Failed to send lead notification email:", error);
    return NextResponse.json({ ok: false, error: { code: "EMAIL_SEND_FAILED", message: "Could not submit right now — please try again shortly." } }, { status: 502 });
  }

  return NextResponse.json({ ok: true, data: null });
}
