"use client";

import { SettingsFormStep } from "../settings-form-step";

export function BusinessInfoStep() {
  return (
    <SettingsFormStep
      stepKey="business_info"
      fields={[
        { name: "legalBusinessName", label: "Legal business name", fullWidth: true },
        { name: "addressLine1", label: "Address line 1", fullWidth: true },
        { name: "addressLine2", label: "Address line 2", fullWidth: true },
        { name: "city", label: "City" },
        { name: "state", label: "State" },
        { name: "postalCode", label: "Postal code" },
      ]}
      extraValues={{ country: "IN" }}
    />
  );
}
