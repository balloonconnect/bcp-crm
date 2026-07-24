"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { CONFIGURABLE_FIELD_KEYS, getFieldVisibility, type ConfigurableFieldKey, type FormFieldsConfig } from "@bcp/enquiry-form";
import { publicApiFetch } from "../../lib/api";

export interface PublicFormData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  formFieldsConfig: Record<string, string>;
  eventTypes: string[];
  contactMethods: string[];
  consentRequired: boolean;
  consentText: string;
  termsUrl: string | null;
  termsText: string | null;
}

const FIELD_LABELS: Record<ConfigurableFieldKey, string> = {
  brideName: "Bride's name",
  groomName: "Groom's name",
  phone: "Mobile number",
  alternateMobile: "Alternate mobile",
  email: "Email",
  instagramProfile1: "Instagram profile",
  instagramProfile2: "Instagram profile (second)",
  eventType: "Event type",
  eventDate: "Event date",
  venue: "Venue",
  city: "City",
  budget: "Budget (₹)",
  interestedPackage: "Package you're interested in",
  notes: "Anything else we should know?",
};

function inputTypeFor(key: ConfigurableFieldKey): string {
  if (key === "email") return "email";
  if (key === "eventDate") return "date";
  if (key === "budget") return "number";
  return "text";
}

export function PublicEnquiryForm({ form, studioSlug, studioName }: { form: PublicFormData; studioSlug: string; studioName: string | null }) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [preferredContact, setPreferredContact] = React.useState(form.contactMethods[0] ?? "phone");
  const [consentGiven, setConsentGiven] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const renderedAtRef = React.useRef(Date.now());

  const fieldsConfig = form.formFieldsConfig as FormFieldsConfig;
  const visibleFields = CONFIGURABLE_FIELD_KEYS.filter((key) => getFieldVisibility(fieldsConfig, key) !== "hidden");

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const searchParams = new URLSearchParams(window.location.search);
    const utm = {
      source: searchParams.get("utm_source") ?? undefined,
      medium: searchParams.get("utm_medium") ?? undefined,
      campaign: searchParams.get("utm_campaign") ?? undefined,
      term: searchParams.get("utm_term") ?? undefined,
      content: searchParams.get("utm_content") ?? undefined,
    };

    const payload: Record<string, unknown> = { name: values.name, preferredContactMethod: preferredContact };
    for (const key of visibleFields) {
      if (values[key]) payload[key] = key === "budget" ? Number(values[key]) : values[key];
    }

    try {
      const res = await publicApiFetch<{ successMessage: string }>(`/public/enquiry-forms/${form.slug}/submit?studioSlug=${encodeURIComponent(studioSlug)}`, {
        method: "POST",
        body: JSON.stringify({
          payload,
          consentGiven,
          utm,
          referrer: document.referrer || undefined,
          website: String(formData.get("website") ?? ""), // honeypot
          renderedAt: renderedAtRef.current,
        }),
      });

      if (!res.ok) {
        setErrorMessage(res.error?.errors?.join(" ") ?? res.error?.message ?? "Something went wrong — please try again.");
        setStatus("error");
        return;
      }

      setSuccessMessage(res.data?.successMessage ?? "Thanks — we've received your enquiry.");
      setStatus("success");
    } catch {
      setErrorMessage("Something went wrong — please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <h1 className="font-display text-xl">Thank you</h1>
          <p className="text-muted-foreground">{successMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {form.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a studio-hosted brand image, not something Next's image optimizer needs to touch
        <img src={form.coverImageUrl} alt="" className="h-40 w-full rounded-t-lg object-cover" />
      )}
      <CardHeader>
        {studioName && <p className="text-xs uppercase tracking-wide text-muted-foreground">{studioName}</p>}
        <CardTitle>{form.title}</CardTitle>
        {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Honeypot — hidden from real visitors via layout, not display:none, so bots that skip such fields still get caught. */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="website">Leave this field blank</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <FormField label="Name" htmlFor="pf-name" required>
            <Input id="pf-name" value={values.name ?? ""} onChange={(e) => setValue("name", e.target.value)} required />
          </FormField>

          {visibleFields.map((key) => {
            const required = getFieldVisibility(fieldsConfig, key) === "required";
            if (key === "eventType" && form.eventTypes.length > 0) {
              return (
                <FormField key={key} label={FIELD_LABELS[key]} htmlFor={`pf-${key}`} required={required}>
                  <Select
                    id={`pf-${key}`}
                    value={values[key] ?? ""}
                    onChange={(e) => setValue(key, e.target.value)}
                    options={[{ value: "", label: "Select an event type" }, ...form.eventTypes.map((t) => ({ value: t, label: t }))]}
                    required={required}
                  />
                </FormField>
              );
            }
            if (key === "notes") {
              return (
                <FormField key={key} label={FIELD_LABELS[key]} htmlFor={`pf-${key}`} required={required} fullWidth>
                  <Textarea id={`pf-${key}`} rows={3} value={values[key] ?? ""} onChange={(e) => setValue(key, e.target.value)} required={required} />
                </FormField>
              );
            }
            return (
              <FormField key={key} label={FIELD_LABELS[key]} htmlFor={`pf-${key}`} required={required}>
                <Input id={`pf-${key}`} type={inputTypeFor(key)} value={values[key] ?? ""} onChange={(e) => setValue(key, e.target.value)} required={required} />
              </FormField>
            );
          })}

          {form.contactMethods.length > 1 && (
            <FormField label="Preferred contact method" htmlFor="pf-contact-method">
              <Select
                id="pf-contact-method"
                value={preferredContact}
                onChange={(e) => setPreferredContact(e.target.value)}
                options={form.contactMethods.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
              />
            </FormField>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} required={form.consentRequired} />
            <span>
              {form.consentText}
              {form.termsUrl && (
                <>
                  {" "}
                  <a href={form.termsUrl} target="_blank" rel="noreferrer" className="underline">
                    View terms
                  </a>
                </>
              )}
            </span>
          </label>

          {errorMessage && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={status === "submitting"} className="w-full">
            {status === "submitting" ? "Sending…" : "Submit enquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
