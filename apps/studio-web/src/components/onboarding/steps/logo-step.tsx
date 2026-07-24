"use client";

import * as React from "react";
import { FormField } from "@bcp/ui";
import { apiFetch, apiPatch } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function LogoStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSave() {
    if (!file) throw new Error("Choose a logo file first, or skip this step for now.");
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await apiFetch<{ url: string }>("/branding/assets?kind=logo", { method: "POST", body: formData });
    if (!uploadRes.ok || !uploadRes.data) throw new Error(uploadRes.error?.message ?? "Could not upload your logo");

    const themeRes = await apiPatch("/branding/theme", { logoUrl: uploadRes.data.url });
    if (!themeRes.ok) throw new Error(themeRes.error?.message ?? "Logo uploaded, but couldn't apply it — try again from Brand settings later.");

    await markStepDone("logo");
  }

  return (
    <StepFrame stepKey="logo" onSaveAndContinue={handleSave} onSkip={() => skipStep("logo")}>
      <FormField label="Logo" htmlFor="logo-file" hint="PNG or SVG with a transparent background works best." fullWidth>
        <input id="logo-file" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" onChange={handleFileChange} className="text-sm" />
      </FormField>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote/optimizable image
        <img src={previewUrl} alt="Logo preview" className="h-20 w-auto rounded border border-border object-contain p-2" />
      )}
    </StepFrame>
  );
}
