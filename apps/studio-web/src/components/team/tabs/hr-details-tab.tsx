"use client";

import * as React from "react";
import { FormField, Input, Select, Button } from "@bcp/ui";
import { apiPatch } from "../../../lib/api-client";
import type { TeamMemberDetail } from "../../../lib/team-context";

const EMPLOYMENT_OPTIONS = [{ value: "employee", label: "Employee" }, { value: "freelancer", label: "Freelancer" }];
const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" }, { value: "busy", label: "Busy" }, { value: "on_leave", label: "On leave" }, { value: "unavailable", label: "Unavailable" },
];
const RATE_UNIT_OPTIONS = [{ value: "per_day", label: "Per day" }, { value: "per_event", label: "Per event" }, { value: "per_hour", label: "Per hour" }];

export function HrDetailsTab({ member, onSaved }: { member: TeamMemberDetail; onSaved: () => void }) {
  const isFreelancer = member.employmentType === "freelancer";

  const [employmentType, setEmploymentType] = React.useState(member.employmentType ?? "employee");
  const [availabilityStatus, setAvailabilityStatus] = React.useState(member.availabilityStatus);
  const [skillsText, setSkillsText] = React.useState(member.skills.join(", "));
  const [salaryAmount, setSalaryAmount] = React.useState(member.teamProfile?.salaryAmount ? String(member.teamProfile.salaryAmount / 100) : "");
  const [freelancerRateAmount, setFreelancerRateAmount] = React.useState(member.teamProfile?.freelancerRateAmount ? String(member.teamProfile.freelancerRateAmount / 100) : "");
  const [freelancerRateUnit, setFreelancerRateUnit] = React.useState(member.teamProfile?.freelancerRateUnit ?? "per_event");
  const [paymentTerms, setPaymentTerms] = React.useState(member.teamProfile?.paymentTerms ?? "");
  const [bankAccountName, setBankAccountName] = React.useState(member.teamProfile?.bankAccountName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = React.useState(member.teamProfile?.bankAccountNumber ?? "");
  const [bankIfscCode, setBankIfscCode] = React.useState(member.teamProfile?.bankIfscCode ?? "");
  const [bankName, setBankName] = React.useState(member.teamProfile?.bankName ?? "");
  const [emergencyContactName, setEmergencyContactName] = React.useState(member.teamProfile?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState(member.teamProfile?.emergencyContactPhone ?? "");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = React.useState(member.teamProfile?.emergencyContactRelationship ?? "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    await apiPatch(`/team-members/${member.id}/profile`, {
      employmentType,
      availabilityStatus,
      skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      salaryAmount: salaryAmount ? Math.round(Number(salaryAmount) * 100) : undefined,
      freelancerRateAmount: freelancerRateAmount ? Math.round(Number(freelancerRateAmount) * 100) : undefined,
      freelancerRateUnit: isFreelancer ? freelancerRateUnit : undefined,
      paymentTerms: paymentTerms || undefined,
      bankAccountName: bankAccountName || undefined,
      bankAccountNumber: bankAccountNumber || undefined,
      bankIfscCode: bankIfscCode || undefined,
      bankName: bankName || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
      emergencyContactRelationship: emergencyContactRelationship || undefined,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Employment type" htmlFor="hr-employment"><Select id="hr-employment" value={employmentType} onChange={(e) => setEmploymentType(e.target.value as never)} options={EMPLOYMENT_OPTIONS} /></FormField>
        <FormField label="Availability" htmlFor="hr-availability"><Select id="hr-availability" value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value as never)} options={AVAILABILITY_OPTIONS} /></FormField>
        <FormField label="Skills" htmlFor="hr-skills" hint="Comma-separated" fullWidth><Input id="hr-skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} /></FormField>
      </div>

      {!isFreelancer ? (
        <FormField label="Monthly salary (₹)" htmlFor="hr-salary"><Input id="hr-salary" type="number" min="0" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} /></FormField>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Freelancer rate (₹)" htmlFor="hr-rate"><Input id="hr-rate" type="number" min="0" value={freelancerRateAmount} onChange={(e) => setFreelancerRateAmount(e.target.value)} /></FormField>
          <FormField label="Rate unit" htmlFor="hr-rate-unit"><Select id="hr-rate-unit" value={freelancerRateUnit} onChange={(e) => setFreelancerRateUnit(e.target.value)} options={RATE_UNIT_OPTIONS} /></FormField>
        </div>
      )}
      <FormField label="Payment terms" htmlFor="hr-terms"><Input id="hr-terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 15 after delivery" /></FormField>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Bank details</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Account holder name" htmlFor="hr-bank-name"><Input id="hr-bank-name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} /></FormField>
          <FormField label="Bank" htmlFor="hr-bank"><Input id="hr-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} /></FormField>
          <FormField label="Account number" htmlFor="hr-account-number"><Input id="hr-account-number" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} /></FormField>
          <FormField label="IFSC code" htmlFor="hr-ifsc"><Input id="hr-ifsc" value={bankIfscCode} onChange={(e) => setBankIfscCode(e.target.value)} /></FormField>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Emergency contact</h3>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Name" htmlFor="hr-emergency-name"><Input id="hr-emergency-name" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} /></FormField>
          <FormField label="Phone" htmlFor="hr-emergency-phone"><Input id="hr-emergency-phone" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} /></FormField>
          <FormField label="Relationship" htmlFor="hr-emergency-relationship"><Input id="hr-emergency-relationship" value={emergencyContactRelationship} onChange={(e) => setEmergencyContactRelationship(e.target.value)} /></FormField>
        </div>
      </div>

      <Button type="button" size="sm" className="self-start" disabled={saving} onClick={() => void handleSave()}>{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}
