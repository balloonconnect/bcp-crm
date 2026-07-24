"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { CONFIGURABLE_FIELD_KEYS, defaultFieldsConfig, type ConfigurableFieldKey, type FieldVisibility } from "@bcp/enquiry-form";
import { apiPost, apiPatch } from "../../lib/api-client";

export interface EnquiryFormRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  formFieldsConfig: Record<string, FieldVisibility>;
  eventTypes: string[];
  contactMethods: string[];
  consentRequired: boolean;
  consentText: string;
  termsUrl: string | null;
  successMessage: string;
  autoResponseEnabled: boolean;
  autoResponseMessage: string | null;
  isActive: boolean;
}

const FIELD_LABELS: Record<ConfigurableFieldKey, string> = {
  brideName: "Bride's name", groomName: "Groom's name", phone: "Mobile", alternateMobile: "Alternate mobile",
  email: "Email", instagramProfile1: "Instagram 1", instagramProfile2: "Instagram 2", eventType: "Event type",
  eventDate: "Event date", venue: "Venue", city: "City", budget: "Budget", interestedPackage: "Interested package", notes: "Notes",
};

const VISIBILITY_OPTIONS = [
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
  { value: "hidden", label: "Hidden" },
];

const CONTACT_METHODS = ["phone", "email", "whatsapp"];

export function EnquiryFormDialog({ open, onOpenChange, form, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; form?: EnquiryFormRecord | null; onSaved: () => void }) {
  const [slug, setSlug] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [eventTypesText, setEventTypesText] = React.useState("");
  const [contactMethods, setContactMethods] = React.useState<string[]>(["phone", "email"]);
  const [fieldsConfig, setFieldsConfig] = React.useState<Record<string, FieldVisibility>>(defaultFieldsConfig() as Record<string, FieldVisibility>);
  const [consentRequired, setConsentRequired] = React.useState(true);
  const [consentText, setConsentText] = React.useState("I agree to be contacted about my enquiry.");
  const [termsUrl, setTermsUrl] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("Thanks — we've received your enquiry and will be in touch shortly.");
  const [autoResponseEnabled, setAutoResponseEnabled] = React.useState(true);
  const [autoResponseMessage, setAutoResponseMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (form) {
      setSlug(form.slug);
      setTitle(form.title);
      setDescription(form.description ?? "");
      setCoverImageUrl(form.coverImageUrl ?? "");
      setEventTypesText(form.eventTypes.join(", "));
      setContactMethods(form.contactMethods);
      setFieldsConfig({ ...(defaultFieldsConfig() as Record<string, FieldVisibility>), ...form.formFieldsConfig });
      setConsentRequired(form.consentRequired);
      setConsentText(form.consentText);
      setTermsUrl(form.termsUrl ?? "");
      setSuccessMessage(form.successMessage);
      setAutoResponseEnabled(form.autoResponseEnabled);
      setAutoResponseMessage(form.autoResponseMessage ?? "");
    } else {
      setSlug(""); setTitle(""); setDescription(""); setCoverImageUrl(""); setEventTypesText("");
      setContactMethods(["phone", "email"]); setFieldsConfig(defaultFieldsConfig() as Record<string, FieldVisibility>);
      setConsentRequired(true); setConsentText("I agree to be contacted about my enquiry.");
      setTermsUrl(""); setSuccessMessage("Thanks — we've received your enquiry and will be in touch shortly.");
      setAutoResponseEnabled(true); setAutoResponseMessage("");
    }
    setError(null);
  }, [form, open]);

  function toggleContactMethod(method: string) {
    setContactMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      slug, title,
      description: description || undefined,
      coverImageUrl: coverImageUrl || undefined,
      formFieldsConfig: fieldsConfig,
      eventTypes: eventTypesText.split(",").map((t) => t.trim()).filter(Boolean),
      contactMethods,
      consentRequired,
      consentText,
      termsUrl: termsUrl || undefined,
      successMessage,
      autoResponseEnabled,
      autoResponseMessage: autoResponseMessage || undefined,
    };

    const res = form ? await apiPatch(`/enquiry-forms/${form.id}`, payload) : await apiPost("/enquiry-forms", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not save this form");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={form ? "Edit enquiry form" : "New enquiry form"} className="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <ResponsiveFormLayout
          sections={[
            {
              id: "basics",
              title: "Basics",
              columns: 2,
              children: (
                <>
                  <FormField label="Title" htmlFor="ef-title" required fullWidth><Input id="ef-title" value={title} onChange={(e) => setTitle(e.target.value)} required /></FormField>
                  <FormField label="URL slug" htmlFor="ef-slug" required hint="Lowercase letters, numbers, hyphens."><Input id="ef-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required /></FormField>
                  <FormField label="Cover image URL" htmlFor="ef-cover"><Input id="ef-cover" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} /></FormField>
                  <FormField label="Description" htmlFor="ef-description" fullWidth><Textarea id="ef-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                  <FormField label="Event types" htmlFor="ef-event-types" hint="Comma-separated, e.g. Wedding, Maternity, Birthday" fullWidth>
                    <Input id="ef-event-types" value={eventTypesText} onChange={(e) => setEventTypesText(e.target.value)} />
                  </FormField>
                </>
              ),
            },
            {
              id: "fields",
              title: "Form fields",
              columns: 2,
              children: (
                <>
                  {CONFIGURABLE_FIELD_KEYS.map((key) => (
                    <FormField key={key} label={FIELD_LABELS[key]} htmlFor={`ef-field-${key}`}>
                      <Select
                        id={`ef-field-${key}`}
                        value={fieldsConfig[key] ?? "optional"}
                        onChange={(e) => setFieldsConfig((f) => ({ ...f, [key]: e.target.value as FieldVisibility }))}
                        options={VISIBILITY_OPTIONS}
                      />
                    </FormField>
                  ))}
                </>
              ),
            },
            {
              id: "contact",
              title: "Preferred contact method",
              columns: 1,
              children: (
                <div className="flex gap-4">
                  {CONTACT_METHODS.map((method) => (
                    <label key={method} className="flex items-center gap-2 text-sm capitalize">
                      <input type="checkbox" checked={contactMethods.includes(method)} onChange={() => toggleContactMethod(method)} />
                      {method}
                    </label>
                  ))}
                </div>
              ),
            },
            {
              id: "consent",
              title: "Consent & terms",
              columns: 1,
              children: (
                <>
                  <label className="mb-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={consentRequired} onChange={(e) => setConsentRequired(e.target.checked)} />
                    Require consent checkbox
                  </label>
                  <FormField label="Consent text" htmlFor="ef-consent-text" fullWidth><Textarea id="ef-consent-text" rows={2} value={consentText} onChange={(e) => setConsentText(e.target.value)} /></FormField>
                  <FormField label="Terms URL" htmlFor="ef-terms-url" fullWidth><Input id="ef-terms-url" value={termsUrl} onChange={(e) => setTermsUrl(e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "response",
              title: "After submission",
              columns: 1,
              children: (
                <>
                  <FormField label="Success message" htmlFor="ef-success-message" fullWidth><Textarea id="ef-success-message" rows={2} value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} /></FormField>
                  <label className="my-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={autoResponseEnabled} onChange={(e) => setAutoResponseEnabled(e.target.checked)} />
                    Send an automatic email reply to the enquirer
                  </label>
                  {autoResponseEnabled && (
                    <FormField label="Auto-response message" htmlFor="ef-auto-response" fullWidth>
                      <Textarea id="ef-auto-response" rows={2} value={autoResponseMessage} onChange={(e) => setAutoResponseMessage(e.target.value)} placeholder="Thanks for reaching out — we'll be in touch shortly." />
                    </FormField>
                  )}
                </>
              ),
            },
          ]}
        />

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : form ? "Save changes" : "Create form"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
