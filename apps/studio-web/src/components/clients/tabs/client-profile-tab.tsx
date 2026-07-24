"use client";

import * as React from "react";
import { Button } from "@bcp/ui";
import { apiPost } from "../../../lib/api-client";
import { useClients, type ClientRecord } from "../../../lib/clients-context";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function ClientProfileTab({ client, onEdit }: { client: ClientRecord; onEdit: () => void }) {
  const { refetch } = useClients();
  const [busy, setBusy] = React.useState(false);

  async function togglePortalAccess() {
    setBusy(true);
    await apiPost(`/clients/${client.id}/portal-access/${client.portalAccessEnabled ? "disable" : "enable"}`);
    await refetch();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void togglePortalAccess()}>
          {client.portalAccessEnabled ? "Disable portal access" : "Enable portal access"}
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Bride's name" value={client.brideName} />
        <Field label="Groom's name" value={client.groomName} />
        <Field label="Mobile" value={client.phone} />
        <Field label="Email" value={client.email} />
        <Field label="Instagram" value={client.instagramProfile1} />
        <Field label="Facebook" value={client.facebookProfile} />
        <Field label="Billing address" value={[client.billingAddressLine1, client.billingCity, client.billingState, client.billingPostalCode].filter(Boolean).join(", ")} />
        <Field label="Shipping address" value={client.shippingSameAsBilling ? "Same as billing" : [client.shippingAddressLine1, client.shippingCity].filter(Boolean).join(", ")} />
        <Field label="GSTIN" value={client.gstin} />
        <Field label="GST legal name" value={client.gstLegalName} />
        <Field label="Anniversary" value={client.anniversaryDate ? new Date(client.anniversaryDate).toLocaleDateString("en-IN") : null} />
        <Field label="Bride's birthday" value={client.brideBirthday ? new Date(client.brideBirthday).toLocaleDateString("en-IN") : null} />
        <Field label="Groom's birthday" value={client.groomBirthday ? new Date(client.groomBirthday).toLocaleDateString("en-IN") : null} />
        <Field label="Source" value={client.source} />
        <Field label="Referral notes" value={client.referralNotes} />
        <Field label="Portal access" value={client.portalAccessEnabled ? "Enabled" : "Not enabled"} />
      </dl>

      {client.tags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground">Tags</p>
          <p className="mt-1 text-sm">{client.tags.join(", ")}</p>
        </div>
      )}

      {client.notes && (
        <div>
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{client.notes}</p>
        </div>
      )}
    </div>
  );
}
