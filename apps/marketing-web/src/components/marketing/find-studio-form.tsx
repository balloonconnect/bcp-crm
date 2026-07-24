"use client";

import * as React from "react";
import { FormField, Input, Button } from "@bcp/ui";

/**
 * Login is tenant-scoped by design (see apps/api's `/auth/login`, which
 * resolves `studioId` from the request's verified hostname) — there's no
 * single global login form to embed on a shared marketing domain. This
 * mirrors the "find your workspace" pattern other multi-tenant products
 * use: enter your studio's address, get sent to sign in there.
 */
export function FindStudioForm() {
  const [slug, setSlug] = React.useState("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.bcpstudio.app";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    const target = appUrl.startsWith("http://localhost") ? appUrl : appUrl.replace("https://", `https://${slug.trim()}.`);
    window.location.href = target;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Your studio's web address" htmlFor="studio-slug-login" hint="e.g. balloon-connect — the name you chose when setting up your studio.">
        <Input id="studio-slug-login" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="your-studio" required />
      </FormField>
      <Button type="submit" size="lg" className="bg-safelight text-ink hover:bg-safelight/90">
        Continue to sign in
      </Button>
    </form>
  );
}
