"use client";

import * as React from "react";
import { publicApiFetch } from "../../lib/api";

type AccessResult = "granted" | "expired" | "needs_password" | "needs_otp";

export function AccessGate({ token, guestToken, initialResult, onGranted }: { token: string; guestToken: string; initialResult: AccessResult; onGranted: () => void }) {
  const [result, setResult] = React.useState<AccessResult>(initialResult);
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (result === "granted") {
    onGranted();
    return null;
  }

  if (result === "expired") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-display text-xl">This gallery link has expired</h1>
        <p className="text-sm text-muted-foreground">Please contact the studio for a new link.</p>
      </div>
    );
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch(`/public/galleries/${token}/verify-password`, { method: "POST", body: JSON.stringify({ guestToken, password }) });
    setSubmitting(false);
    if (!res.ok) {
      setError("Incorrect password.");
      return;
    }
    setResult("granted");
  }

  async function handleRequestOtp() {
    if (email) await publicApiFetch(`/public/galleries/${token}/session`, { method: "POST", body: JSON.stringify({ guestToken, guestEmail: email }) });
    await publicApiFetch(`/public/galleries/${token}/request-otp`, { method: "POST", body: JSON.stringify({ guestToken }) });
    setOtpSent(true);
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch(`/public/galleries/${token}/verify-otp`, { method: "POST", body: JSON.stringify({ guestToken, code }) });
    setSubmitting(false);
    if (!res.ok) {
      setError("Incorrect or expired code.");
      return;
    }
    setResult("granted");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-display text-xl">This gallery is protected</h1>

      {result === "needs_password" && (
        <form onSubmit={handlePasswordSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting} className="h-10 rounded-md bg-brand text-sm font-medium text-brand-foreground">{submitting ? "Checking…" : "Continue"}</button>
        </form>
      )}

      {result === "needs_otp" && !otpSent && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <button type="button" onClick={() => void handleRequestOtp()} className="h-10 rounded-md bg-brand text-sm font-medium text-brand-foreground">Send code</button>
        </div>
      )}

      {result === "needs_otp" && otpSent && (
        <form onSubmit={handleOtpSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent you.</p>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-center text-sm tracking-widest" autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting} className="h-10 rounded-md bg-brand text-sm font-medium text-brand-foreground">{submitting ? "Checking…" : "Verify"}</button>
        </form>
      )}
    </div>
  );
}
