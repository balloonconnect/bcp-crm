"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@bcp/ui";
import { ClientsProvider, useClients, type ClientRecord } from "../../lib/clients-context";
import { ClientsTableView } from "../../components/clients/clients-table-view";
import { ClientFormDialog } from "../../components/clients/client-form-dialog";
import { ClientDetailDialog } from "../../components/clients/client-detail-dialog";

function ClientsPageBody() {
  const { error } = useClients();
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailClient, setDetailClient] = React.useState<ClientRecord | null>(null);
  const [editClient, setEditClient] = React.useState<ClientRecord | null>(null);

  function handleEdit() {
    setEditClient(detailClient);
    setDetailClient(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Clients</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add client
        </Button>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <ClientsTableView onOpenClient={setDetailClient} />

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ClientFormDialog open={Boolean(editClient)} onOpenChange={(open) => !open && setEditClient(null)} client={editClient} />
      <ClientDetailDialog client={detailClient} open={Boolean(detailClient)} onOpenChange={(open) => !open && setDetailClient(null)} onEdit={handleEdit} />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <ClientsProvider>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <ClientsPageBody />
      </main>
    </ClientsProvider>
  );
}
