"use client";

import * as React from "react";
import { X, Camera, Upload, RotateCcw, AlertTriangle, ScanFace } from "lucide-react";
import { publicImageUrl } from "../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Step = "privacy" | "mode" | "capture" | "checking" | "warning" | "searching" | "results" | "no_match" | "error";

interface QualityResult {
  multipleFacesWarning: boolean;
  lowLightWarning: boolean;
  noFaceDetected: boolean;
}

interface MatchPhoto {
  id: string;
  galleryPhoto: { id: string; thumbnailKey: string | null; previewKey: string | null };
}

interface SearchResult {
  session: { id: string; status: string };
  matches: MatchPhoto[];
}

/**
 * The full guest flow from the brief: privacy notice → accept → mode
 * select → capture → quality check → results — implemented as one
 * step-machine component since each step's data (the captured blob,
 * the session ID for manual correction) needs to flow straight into
 * the next without round-tripping through a parent.
 */
export function FaceSearchFlow({ token, guestToken, onClose, onOpenPhoto }: { token: string; guestToken: string; onClose: () => void; onOpenPhoto: (photoId: string) => void }) {
  const [step, setStep] = React.useState<Step>("privacy");
  const [mode, setMode] = React.useState<"live_scan" | "selfie_upload" | null>(null);
  const [capturedBlob, setCapturedBlob] = React.useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = React.useState<string | null>(null);
  const [quality, setQuality] = React.useState<QualityResult | null>(null);
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAcceptPrivacy() {
    await fetch(`${API_URL}/public/galleries/${token}/face-search/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestToken, consentText: "I agree to a temporary face scan of myself being compared against this gallery's photos to find ones I appear in. My scan is not stored." }),
    });
    setStep("mode");
  }

  async function startCamera() {
    setMode("live_scan");
    setStep("capture");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrorMessage("Couldn't access the camera. Try uploading a selfie instead.");
      setStep("error");
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) setBlobAndCheck(blob);
    }, "image/jpeg", 0.9);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setMode("selfie_upload");
    const file = e.target.files?.[0];
    if (file) void setBlobAndCheck(file);
  }

  async function setBlobAndCheck(blob: Blob) {
    setCapturedBlob(blob);
    setCapturedUrl(URL.createObjectURL(blob));
    setStep("checking");

    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    const res = await fetch(`${API_URL}/public/galleries/${token}/face-search/check-quality`, { method: "POST", body: formData });
    const json = (await res.json()) as { ok: boolean; data?: QualityResult };

    if (!json.ok || !json.data) {
      setErrorMessage("Couldn't process that image. Try again.");
      setStep("error");
      return;
    }

    setQuality(json.data);
    const hasWarning = json.data.noFaceDetected || json.data.multipleFacesWarning || json.data.lowLightWarning;
    if (hasWarning) setStep("warning");
    else void runSearch(blob, false);
  }

  async function runSearch(blob: Blob, proceedDespiteWarning: boolean) {
    setStep("searching");
    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    formData.append("guestToken", guestToken);
    formData.append("mode", mode ?? "selfie_upload");
    formData.append("proceedDespiteWarning", String(proceedDespiteWarning));

    const res = await fetch(`${API_URL}/public/galleries/${token}/face-search`, { method: "POST", body: formData });
    const json = (await res.json()) as { ok: boolean; data?: SearchResult; error?: { message: string } };

    if (!json.ok || !json.data) {
      setErrorMessage(json.error?.message ?? "Search failed. Please try again.");
      setStep("error");
      return;
    }

    setResult(json.data);
    setStep(json.data.matches.length > 0 ? "results" : "no_match");
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setQuality(null);
    if (mode === "live_scan") void startCamera();
    else {
      setStep("mode");
      setMode(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="flex items-center gap-1.5 text-sm font-medium"><ScanFace className="h-4 w-4" aria-hidden="true" />Find my photos</span>
        <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6">
        {step === "privacy" && (
          <div className="max-w-sm text-center">
            <h2 className="mb-2 font-display text-lg">Before we scan your face</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              We&apos;ll compare a temporary photo of your face against this gallery&apos;s photos to find the ones you&apos;re in. Your scan is processed for this search only and is never saved.
            </p>
            <button type="button" onClick={() => void handleAcceptPrivacy()} className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">I agree — continue</button>
          </div>
        )}

        {step === "mode" && (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => void startCamera()} className="flex items-center gap-3 rounded-md border border-border px-4 py-3 text-sm">
              <Camera className="h-5 w-5" aria-hidden="true" /> Live camera scan
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 rounded-md border border-border px-4 py-3 text-sm">
              <Upload className="h-5 w-5" aria-hidden="true" /> Upload a selfie
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileSelect} />
          </div>
        )}

        {step === "capture" && mode === "live_scan" && (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- live self-facing camera preview, no audio/captions applicable */}
            <video ref={videoRef} autoPlay playsInline muted className="h-64 w-64 rounded-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <button type="button" onClick={captureFrame} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">Capture</button>
          </div>
        )}

        {(step === "checking" || step === "searching") && (
          <div className="flex flex-col items-center gap-3">
            {capturedUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob: URL preview of the just-captured frame, never a remote/optimizable asset
              <img src={capturedUrl} alt="Your capture" className="h-32 w-32 rounded-full object-cover opacity-70" />
            )}
            <p className="text-sm text-muted-foreground">{step === "checking" ? "Checking your photo…" : "Searching the gallery…"}</p>
          </div>
        )}

        {step === "warning" && quality && (
          <div className="max-w-sm text-center">
            {capturedUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob: URL preview
              <img src={capturedUrl} alt="Your capture" className="mx-auto mb-3 h-32 w-32 rounded-full object-cover" />
            )}
            <p className="mb-3 flex items-center justify-center gap-1.5 text-sm font-medium text-warning"><AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {quality.noFaceDetected ? "We couldn't find a face in that photo." : quality.multipleFacesWarning ? "We see more than one face — results may be less accurate." : "This photo looks a bit dark — results may be less accurate."}
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleRetake} className="rounded-md border border-border px-4 py-2 text-sm"><RotateCcw className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />Retake</button>
              {!quality.noFaceDetected && (
                <button type="button" onClick={() => capturedBlob && void runSearch(capturedBlob, true)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">Search anyway</button>
              )}
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="max-w-sm text-center">
            <p className="mb-3 text-sm text-destructive">{errorMessage}</p>
            <button type="button" onClick={() => setStep("mode")} className="rounded-md border border-border px-4 py-2 text-sm">Try again</button>
          </div>
        )}

        {step === "no_match" && (
          <div className="max-w-sm text-center">
            <p className="mb-3 text-sm text-muted-foreground">We couldn&apos;t find you in this gallery yet — more photos may be added later.</p>
            <button type="button" onClick={handleRetake} className="rounded-md border border-border px-4 py-2 text-sm"><RotateCcw className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />Try again</button>
          </div>
        )}

        {step === "results" && result && (
          <div className="w-full max-w-2xl">
            <p className="mb-3 text-center text-sm text-muted-foreground">Found you in {result.matches.length} photo{result.matches.length === 1 ? "" : "s"}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {result.matches.map((m) => (
                <button key={m.id} type="button" onClick={() => onOpenPhoto(m.galleryPhoto.id)} className="aspect-square overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private signed-URL storage image */}
                  <img src={publicImageUrl(token, m.galleryPhoto.id, guestToken, "view")} alt="Matched photo" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <button type="button" onClick={handleRetake} className="mx-auto mt-4 block rounded-md border border-border px-4 py-2 text-sm"><RotateCcw className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />Search again</button>
          </div>
        )}
      </div>
    </div>
  );
}
