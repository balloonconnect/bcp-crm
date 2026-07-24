"use client";

import * as React from "react";
import { FormField, Input, Textarea, Button } from "@bcp/ui";

export interface LeadFormProps {
  type: "contact" | "demo_request";
  submitLabel: string;
  showPreferredTime?: boolean;
  showMessage?: boolean;
}

/** Shared implementation behind both the Contact and Book Demo pages — same validated fields, same submit handling against `/api/leads`, different copy and which optional fields show. */
export function LeadForm({ type, submitLabel, showPreferredTime, showMessage = true }: LeadFormProps) {
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      type,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      studioName: String(form.get("studioName") ?? "") || undefined,
      message: String(form.get("message") ?? "") || undefined,
      preferredTime: String(form.get("preferredTime") ?? "") || undefined,
      website: String(form.get("website") ?? ""), // honeypot
    };

    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = (await res.json()) as { ok: boolean; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? "Something went wrong");
      setStatus("success");
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-md border border-safelight/40 bg-charcoal p-6 text-paper">
        <p className="font-display text-lg">Thanks — we&apos;ve got it.</p>
        <p className="mt-2 text-sm text-ink-faint">
          {type === "demo_request" ? "We'll email you shortly to confirm a time." : "Our team will get back to you within one business day."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Honeypot — hidden from real visitors via CSS, not `display:none` or `type=hidden`, so basic bots that skip such fields still fill it. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FormField label="Full name" htmlFor="lead-name" required>
        <Input id="lead-name" name="name" required maxLength={120} />
      </FormField>
      <FormField label="Email" htmlFor="lead-email" required>
        <Input id="lead-email" name="email" type="email" required />
      </FormField>
      <FormField label="Phone" htmlFor="lead-phone" hint="Optional — include if you'd like a call back.">
        <Input id="lead-phone" name="phone" type="tel" />
      </FormField>
      <FormField label="Studio name" htmlFor="lead-studio-name" hint="Optional, if you already have one.">
        <Input id="lead-studio-name" name="studioName" maxLength={160} />
      </FormField>
      {showPreferredTime && (
        <FormField label="Preferred time for a call" htmlFor="lead-preferred-time" hint="Time zone, day, and a couple of slots that work for you.">
          <Input id="lead-preferred-time" name="preferredTime" maxLength={200} />
        </FormField>
      )}
      {showMessage && (
        <FormField label="Message" htmlFor="lead-message" fullWidth>
          <Textarea id="lead-message" name="message" rows={4} maxLength={2000} />
        </FormField>
      )}

      {status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"} size="lg" className="bg-safelight text-ink hover:bg-safelight/90">
        {status === "submitting" ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
