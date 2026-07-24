"use client";

import * as React from "react";
import { ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useClients, type ClientRecord } from "../../lib/clients-context";

export function ClientsTableView({ onOpenClient }: { onOpenClient: (client: ClientRecord) => void }) {
  const { clients, loading } = useClients();

  const columns: DataColumn<ClientRecord>[] = [
    { id: "name", header: "Name", cell: (row) => row.name, isPrimary: true },
    { id: "couple", header: "Couple", cell: (row) => [row.brideName, row.groomName].filter(Boolean).join(" & ") || "—", hideBelow: "sm" },
    { id: "phone", header: "Mobile", cell: (row) => row.phone ?? "—", hideBelow: "md" },
    { id: "email", header: "Email", cell: (row) => row.email ?? "—", hideBelow: "lg" },
    {
      id: "tags",
      header: "Tags",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      ),
      hideBelow: "lg",
    },
    { id: "portal", header: "Portal", cell: (row) => <Badge variant={row.portalAccessEnabled ? "success" : "outline"}>{row.portalAccessEnabled ? "Enabled" : "Off"}</Badge>, hideBelow: "xl" },
  ];

  return (
    <ResponsiveDataView
      columns={columns}
      rows={clients}
      getRowId={(row) => row.id}
      onRowClick={onOpenClient}
      isLoading={loading}
      emptyState={<p className="py-12 text-center text-sm text-muted-foreground">No clients yet — add one or convert a lead.</p>}
    />
  );
}
