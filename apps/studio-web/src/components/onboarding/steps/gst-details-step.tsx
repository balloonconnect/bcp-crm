"use client";

import { SettingsFormStep } from "../settings-form-step";

export function GstDetailsStep() {
  return (
    <SettingsFormStep
      stepKey="gst_details"
      fields={[
        { name: "gstin", label: "GSTIN", hint: "Leave blank if you're not GST-registered.", fullWidth: true },
        { name: "legalName", label: "Legal name on GST registration", fullWidth: true },
      ]}
      extraValues={{ registered: true }}
    />
  );
}
