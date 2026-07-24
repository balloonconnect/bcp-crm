"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import { studioNameStepSchema } from "@bcp/onboarding";
import { useOnboarding } from "../../../lib/onboarding-context";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StudioNameStep() {
  const { provision } = useOnboarding();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = studioNameStepSchema.safeParse({ name, slug });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setSubmitting(true);
    try {
      await provision(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Studio name</CardTitle>
        <p className="text-sm text-muted-foreground">What should we call your studio? This also sets your studio&apos;s web address.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveFormLayout
            sections={[
              {
                id: "studio-name",
                columns: 1,
                children: (
                  <>
                    <FormField label="Studio name" htmlFor="studio-name" required fullWidth>
                      <Input id="studio-name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </FormField>
                    <FormField label="Studio URL" htmlFor="studio-slug" required hint={`Your studio will be reachable at ${slug || "your-studio"}.bcpstudio.app`} fullWidth>
                      <Input
                        id="studio-slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(slugify(e.target.value));
                        }}
                        required
                      />
                    </FormField>
                  </>
                ),
              },
            ]}
          />

          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-6 w-full sm:w-auto">
            {submitting ? "Creating your studio…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
