import type { ImportFieldDefinition } from "./import-fields";

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s-]{6,}$/;

/** "Validation" against one mapped row — every required field present and non-empty, every typed field (email/phone/number/date) actually parseable as that type. Collects every problem in the row rather than stopping at the first, so a studio sees everything wrong with a row in one pass instead of fixing and re-uploading repeatedly. */
export function validateRow(row: Record<string, string>, fields: ImportFieldDefinition[]): RowValidationResult {
  const errors: string[] = [];

  for (const field of fields) {
    const value = row[field.key];
    if (field.required && (!value || value.trim().length === 0)) {
      errors.push(`${field.label} is required`);
      continue;
    }
    if (!value) continue;

    if (field.type === "email" && !EMAIL_PATTERN.test(value)) errors.push(`${field.label} is not a valid email`);
    if (field.type === "phone" && !PHONE_PATTERN.test(value)) errors.push(`${field.label} is not a valid phone number`);
    if (field.type === "number" && Number.isNaN(Number(value))) errors.push(`${field.label} must be a number`);
    if (field.type === "date" && Number.isNaN(Date.parse(value))) errors.push(`${field.label} is not a valid date`);
  }

  return { valid: errors.length === 0, errors };
}
