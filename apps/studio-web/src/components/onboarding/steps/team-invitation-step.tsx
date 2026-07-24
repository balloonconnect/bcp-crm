"use client";

import * as React from "react";
import { Trash2, Plus } from "lucide-react";
import { Button, FormField, Input, Select } from "@bcp/ui";
import { apiPost } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "editor", label: "Editor" },
  { value: "album_designer", label: "Album designer" },
  { value: "accountant", label: "Accountant" },
  { value: "freelancer", label: "Freelancer" },
  { value: "viewer", label: "Viewer" },
];

interface DraftInvite {
  id: string;
  email: string;
  roleKey: string;
}

export function TeamInvitationStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [invites, setInvites] = React.useState<DraftInvite[]>([{ id: crypto.randomUUID(), email: "", roleKey: "manager" }]);

  function updateInvite(id: string, patch: Partial<DraftInvite>) {
    setInvites((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addInvite() {
    setInvites((rows) => [...rows, { id: crypto.randomUUID(), email: "", roleKey: "manager" }]);
  }

  function removeInvite(id: string) {
    setInvites((rows) => rows.filter((row) => row.id !== id));
  }

  async function handleSave() {
    const valid = invites.filter((row) => row.email.trim().length > 0);
    if (valid.length === 0) throw new Error("Add at least one teammate's email, or skip this step for now.");

    for (const invite of valid) {
      const res = await apiPost("/team/invitations", { email: invite.email, roleKey: invite.roleKey });
      if (!res.ok) throw new Error(res.error?.message ?? `Could not invite ${invite.email}`);
    }
    await markStepDone("team_invitation");
  }

  return (
    <StepFrame stepKey="team_invitation" onSaveAndContinue={handleSave} onSkip={() => skipStep("team_invitation")} saveLabel="Send invitations & continue">
      <div className="flex flex-col gap-4">
        {invites.map((invite) => (
          <div key={invite.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField label="Email" htmlFor={`invite-email-${invite.id}`} fullWidth>
              <Input
                id={`invite-email-${invite.id}`}
                type="email"
                value={invite.email}
                onChange={(e) => updateInvite(invite.id, { email: e.target.value })}
                placeholder="teammate@example.com"
              />
            </FormField>
            <FormField label="Role" htmlFor={`invite-role-${invite.id}`}>
              <Select
                id={`invite-role-${invite.id}`}
                value={invite.roleKey}
                onChange={(e) => updateInvite(invite.id, { roleKey: e.target.value })}
                options={ROLE_OPTIONS}
              />
            </FormField>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove invitation" onClick={() => removeInvite(invite.id)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addInvite} className="self-start">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add another
        </Button>
      </div>
    </StepFrame>
  );
}
