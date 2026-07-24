"use client";

import * as React from "react";
import { ResponsiveDialog, FormField, Input, Textarea, Button } from "@bcp/ui";
import { publicApiFetch } from "../../lib/api";

type Step = "contact" | "otp" | "confirm";

export function ApprovalDialog({ token, action, onClose, onDone }: { token: string; action: "accepted" | "rejected" | null; onClose: () => void; onDone: () => void | Promise<void> }) {
  const [step, setStep] = React.useState<Step>("contact");
  const [target, setTarget] = React.useState("");
  const [code, setCode] = React.useState("");
  const [signedByName, setSignedByName] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [otpVerified, setOtpVerified] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (action) {
      setStep("contact");
      setTarget("");
      setCode("");
      setSignedByName("");
      setRejectionReason("");
      setOtpVerified(false);
      setError(null);
    }
  }, [action]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch(`/public/quotations/${token}/otp/request`, { method: "POST", body: JSON.stringify({ target }) });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not send a code — check the email or phone and try again.");
      return;
    }
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch(`/public/quotations/${token}/otp/verify`, { method: "POST", body: JSON.stringify({ target, code }) });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error?.message ?? "That code is incorrect or has expired.");
      return;
    }
    setOtpVerified(true);
    setStep("confirm");
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch(`/public/quotations/${token}/approve`, {
      method: "POST",
      body: JSON.stringify({ action, signedByName: signedByName || undefined, rejectionReason: rejectionReason || undefined, otpVerified }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error?.message ?? "Something went wrong — please try again.");
      return;
    }
    await onDone();
    onClose();
  }

  if (!action) return null;

  return (
    <ResponsiveDialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()} title={action === "accepted" ? "Accept quotation" : "Decline quotation"}>
      {step === "contact" && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">To confirm it&apos;s really you, we&apos;ll send a one-time code to your email or phone on file.</p>
          <FormField label="Email or phone" htmlFor="approval-target" required>
            <Input id="approval-target" value={target} onChange={(e) => setTarget(e.target.value)} required />
          </FormField>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send code"}</Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {target}.</p>
          <FormField label="Code" htmlFor="approval-otp" required>
            <Input id="approval-otp" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
          </FormField>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? "Verifying…" : "Verify"}</Button>
        </form>
      )}

      {step === "confirm" && (
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          {action === "accepted" && (
            <FormField label="Your name" htmlFor="approval-name" hint="Typed as your digital signature on this acceptance.">
              <Input id="approval-name" value={signedByName} onChange={(e) => setSignedByName(e.target.value)} />
            </FormField>
          )}
          {action === "rejected" && (
            <FormField label="Reason (optional)" htmlFor="approval-reason">
              <Textarea id="approval-reason" rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </FormField>
          )}
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : action === "accepted" ? "Confirm acceptance" : "Confirm decline"}
          </Button>
        </form>
      )}
    </ResponsiveDialog>
  );
}
