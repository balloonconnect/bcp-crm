import { z } from "zod";

/**
 * The Lead fields a studio can choose to show on its public form —
 * deliberately a subset of the full Lead field set
 * (packages/leads/src/validation.ts): things like `assignedTo`,
 * `priority`, `winProbability`, and `lostReason` are internal CRM
 * concepts a public enquirer has no business setting, so they're not
 * offered here at all rather than being toggle-off-able.
 */
export const CONFIGURABLE_FIELD_KEYS = [
  "brideName",
  "groomName",
  "phone",
  "alternateMobile",
  "email",
  "instagramProfile1",
  "instagramProfile2",
  "eventType",
  "eventDate",
  "venue",
  "city",
  "budget",
  "interestedPackage",
  "notes",
] as const;

export type ConfigurableFieldKey = (typeof CONFIGURABLE_FIELD_KEYS)[number];
export type FieldVisibility = "required" | "optional" | "hidden";

export type FormFieldsConfig = Partial<Record<ConfigurableFieldKey, FieldVisibility>>;

export const formFieldsConfigSchema: z.ZodType<FormFieldsConfig> = z.record(
  z.enum(CONFIGURABLE_FIELD_KEYS as unknown as [ConfigurableFieldKey, ...ConfigurableFieldKey[]]),
  z.enum(["required", "optional", "hidden"]),
);

/** `name` is always collected and always required — every other field defaults to optional unless a studio configures otherwise. */
export function defaultFieldsConfig(): FormFieldsConfig {
  return Object.fromEntries(CONFIGURABLE_FIELD_KEYS.map((key) => [key, "optional"])) as FormFieldsConfig;
}

export function getFieldVisibility(config: FormFieldsConfig, key: ConfigurableFieldKey): FieldVisibility {
  return config[key] ?? "optional";
}

export function getRequiredFieldKeys(config: FormFieldsConfig): ConfigurableFieldKey[] {
  return CONFIGURABLE_FIELD_KEYS.filter((key) => getFieldVisibility(config, key) === "required");
}

export function getVisibleFieldKeys(config: FormFieldsConfig): ConfigurableFieldKey[] {
  return CONFIGURABLE_FIELD_KEYS.filter((key) => getFieldVisibility(config, key) !== "hidden");
}
