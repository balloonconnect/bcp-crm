"use client";

import { SettingsFormStep } from "../settings-form-step";

export function UpiQrStep() {
  return (
    <SettingsFormStep
      stepKey="upi_qr"
      fields={[{ name: "upiId", label: "UPI ID", required: true, hint: "We'll generate a QR code from this for your invoices.", fullWidth: true }]}
    />
  );
}
