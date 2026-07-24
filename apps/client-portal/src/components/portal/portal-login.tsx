"use client";

import * as React from "react";
import { publicApiFetch } from "../../lib/api";
import { storePortalSessionToken } from "../../lib/portal-session";

export function PortalLogin({ studioSlug, studioName, onLoggedIn }: { studioSlug: string; studioName: string; onLoggedIn: () => void }) {
  const [email, setEmail] = React.useState("");
  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch<{ sessionToken: string }>(`/portal/${studioSlug}/login/request`, { method: "POST", body: JSON.stringify({ email }) });
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setError(res.error?.message ?? "We couldn't find an account with that email.");
      return;
    }
    setSessionToken(res.data.sessionToken);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;
    setSubmitting(true);
    setError(null);
    const res = await publicApiFetch(`/portal/login/verify`, { method: "POST", body: JSON.stringify({ sessionToken, code }) });
    setSubmitting(false);
    if (!res.ok) {
      setError("Incorrect or expired code.");
      return;
    }
    storePortalSessionToken(studioSlug, sessionToken);
    onLoggedIn();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-display text-xl">{studioName} client portal</h1>
      {!sessionToken ? (
        <form onSubmit={handleRequestOtp} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-sm text-muted-foreground">Enter your email to receive a login code.</p>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-base" required autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting} className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">{submitting ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent you.</p>
          <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-center text-base tracking-widest" autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting} className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">{submitting ? "Verifying…" : "Log in"}</button>
        </form>
      )}
    </div>
  );
}
