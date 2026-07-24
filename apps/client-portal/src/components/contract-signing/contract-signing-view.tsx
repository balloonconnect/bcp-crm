"use client";

import * as React from "react";
import { publicApiFetch } from "../../lib/api";

interface ContractView {
  title: string;
  status: string;
  witnessRequired: boolean;
  bodyHtml: string;
  currentVersionNumber: number;
}

type Step = "loading" | "review" | "otp_request" | "otp_verify" | "witness" | "sign" | "done" | "error";

/**
 * The full public signing flow: view → request OTP → verify → (if the
 * template calls for one) a witness signs separately → the client
 * types their name to sign. Every step here is exactly what
 * `@bcp/contracts`' `isReadyToFinalize()` requires server-side before
 * a signature is actually accepted — this UI can't shortcut past OTP
 * verification or a required witness, since the server enforces the
 * same order independently.
 */
export function ContractSigningView({ token }: { token: string }) {
  const [contract, setContract] = React.useState<ContractView | null>(null);
  const [step, setStep] = React.useState<Step>("loading");
  const [code, setCode] = React.useState("");
  const [witnessName, setWitnessName] = React.useState("");
  const [signedByName, setSignedByName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [certificateReady, setCertificateReady] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await publicApiFetch<ContractView>(`/public/contracts/${token}`);
    if (res.ok && res.data) {
      setContract(res.data);
      setStep(res.data.status === "signed" ? "done" : "review");
    } else {
      setStep("error");
    }
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleRequestOtp() {
    setError(null);
    const res = await publicApiFetch(`/public/contracts/${token}/request-otp`, { method: "POST" });
    if (!res.ok) {
      setError("Couldn't send a code. Please try again.");
      return;
    }
    setStep("otp_verify");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await publicApiFetch(`/public/contracts/${token}/verify-otp`, { method: "POST", body: JSON.stringify({ code }) });
    if (!res.ok) {
      setError("Incorrect or expired code.");
      return;
    }
    setStep(contract?.witnessRequired ? "witness" : "sign");
  }

  async function handleWitness(e: React.FormEvent) {
    e.preventDefault();
    if (!witnessName.trim()) return;
    await publicApiFetch(`/public/contracts/${token}/witness`, { method: "POST", body: JSON.stringify({ witnessName }) });
    setStep("sign");
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!signedByName.trim()) return;
    setError(null);
    const res = await publicApiFetch<{ signed: boolean }>(`/public/contracts/${token}/sign`, { method: "POST", body: JSON.stringify({ signedByName }) });
    if (!res.ok) {
      setError(res.error?.message ?? "Couldn't complete signing.");
      return;
    }
    setCertificateReady(true);
    setStep("done");
  }

  if (step === "loading") return null;
  if (step === "error" || !contract) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-display text-xl">Contract not found</h1>
        <p className="text-sm text-muted-foreground">This link may be incorrect.</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-display text-xl">Thank you</h1>
        <p className="text-sm text-muted-foreground">{contract.title} has been signed{certificateReady ? " — a signing certificate has been generated" : ""}.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="font-display text-xl">{contract.title}</h1>

      {step === "review" && (
        <>
          <div className="prose max-w-none rounded-md border border-border p-4 text-sm" dangerouslySetInnerHTML={{ __html: contract.bodyHtml }} />
          <button type="button" onClick={() => void handleRequestOtp()} className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">Continue to sign</button>
        </>
      )}

      {step === "otp_verify" && (
        <form onSubmit={handleVerifyOtp} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent to your email.</p>
          <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-center text-base tracking-widest" autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Verify</button>
        </form>
      )}

      {step === "witness" && (
        <form onSubmit={handleWitness} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-sm text-muted-foreground">This contract requires a witness. Please have them type their full name below.</p>
          <input placeholder="Witness full name" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-base" autoFocus />
          <button type="submit" className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Continue</button>
        </form>
      )}

      {step === "sign" && (
        <form onSubmit={handleSign} className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-sm text-muted-foreground">Type your full name to sign this contract.</p>
          <input placeholder="Your full name" value={signedByName} onChange={(e) => setSignedByName(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-base" autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Sign contract</button>
        </form>
      )}

    </div>
  );
}
