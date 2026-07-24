"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import { ownerAccountStepSchema } from "@bcp/onboarding";
import { useOnboarding } from "../../../lib/onboarding-context";

export function OwnerAccountStep() {
  const { start } = useOnboarding();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = ownerAccountStepSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setSubmitting(true);
    try {
      await start(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner account</CardTitle>
        <p className="text-sm text-muted-foreground">Create the account that will own this studio. You&apos;ll use this to sign in from now on.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveFormLayout
            sections={[
              {
                id: "owner-account",
                columns: 2,
                children: (
                  <>
                    <FormField label="Your name" htmlFor="owner-name" required fullWidth>
                      <Input id="owner-name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </FormField>
                    <FormField label="Email" htmlFor="owner-email" required fullWidth>
                      <Input id="owner-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </FormField>
                    <FormField label="Password" htmlFor="owner-password" required hint="At least 10 characters, with an uppercase letter and a number." fullWidth>
                      <Input id="owner-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
            {submitting ? "Creating…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
