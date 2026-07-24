"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button, FormField, Input } from "@bcp/ui";
import { apiGet, apiPost, apiFetch } from "../../../lib/api-client";

interface FamilyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

export function ClientFamilyTab({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = React.useState<FamilyContact[]>([]);
  const [name, setName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await apiGet<FamilyContact[]>(`/clients/${clientId}/family-contacts`);
    if (res.ok && res.data) setContacts(res.data);
  }, [clientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    await apiPost(`/clients/${clientId}/family-contacts`, { name, relationship: relationship || undefined, phone: phone || undefined });
    setName(""); setRelationship(""); setPhone("");
    await load();
    setSubmitting(false);
  }

  async function handleRemove(contactId: string) {
    await apiFetch(`/clients/${clientId}/family-contacts/${contactId}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 rounded-md border border-border p-3">
        <FormField label="Name" htmlFor="fc-name"><Input id="fc-name" value={name} onChange={(e) => setName(e.target.value)} /></FormField>
        <FormField label="Relationship" htmlFor="fc-relationship"><Input id="fc-relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Mother, planner…" /></FormField>
        <FormField label="Phone" htmlFor="fc-phone"><Input id="fc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
        <Button type="button" size="sm" className="col-span-3 justify-self-end" disabled={submitting || !name.trim()} onClick={() => void handleAdd()}>
          Add contact
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {contacts.length === 0 && <p className="py-4 text-sm text-muted-foreground">No family contacts added.</p>}
        {contacts.map((contact) => (
          <li key={contact.id} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{contact.name}</p>
              <p className="text-xs text-muted-foreground">{[contact.relationship, contact.phone].filter(Boolean).join(" · ")}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${contact.name}`} onClick={() => void handleRemove(contact.id)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
