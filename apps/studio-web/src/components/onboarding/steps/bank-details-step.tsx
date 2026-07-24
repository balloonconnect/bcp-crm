"use client";

import { SettingsFormStep } from "../settings-form-step";

export function BankDetailsStep() {
  return (
    <SettingsFormStep
      stepKey="bank_details"
      fields={[
        { name: "accountHolderName", label: "Account holder name", required: true, fullWidth: true },
        { name: "accountNumber", label: "Account number", required: true },
        { name: "ifscCode", label: "IFSC code", required: true, hint: "e.g. HDFC0001234" },
        { name: "bankName", label: "Bank name", fullWidth: true },
      ]}
    />
  );
}
