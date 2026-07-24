"use client";

import * as React from "react";
import { Badge, ResponsiveDataView, LoadingState, EmptyState, type DataColumn } from "@bcp/ui";
import { TeamProvider, useTeam, type TeamMemberSummary } from "../../lib/team-context";
import { TeamDetailDialog } from "../../components/team/team-detail-dialog";

const AVAILABILITY_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  available: "success", busy: "warning", on_leave: "outline", unavailable: "destructive",
};

function TeamPageBody() {
  const { members, loading, error } = useTeam();
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const columns: DataColumn<TeamMemberSummary>[] = [
    { id: "name", header: "Name", cell: (row) => row.name, isPrimary: true },
    { id: "roles", header: "Role", cell: (row) => row.roles.map((r) => r.studioRole.name).join(", ") || "—", hideBelow: "sm" },
    { id: "employment", header: "Type", cell: (row) => <span className="capitalize">{row.employmentType ?? "—"}</span>, hideBelow: "md" },
    { id: "skills", header: "Skills", cell: (row) => row.skills.slice(0, 3).join(", ") || "—", hideBelow: "lg" },
    { id: "availability", header: "Availability", cell: (row) => <Badge variant={AVAILABILITY_VARIANT[row.availabilityStatus] ?? "outline"} className="capitalize">{row.availabilityStatus.replace(/_/g, " ")}</Badge> },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8" data-tour="settings-nav">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite new team members from Studio Settings — this is where their HR profile, attendance, and performance live.</p>
      </div>

      {error && <p role="alert" className="mb-4 text-sm font-medium text-destructive">{error}</p>}

      {loading ? (
        <LoadingState label="Loading your team…" />
      ) : members.length === 0 ? (
        <EmptyState title="No team members yet" description="Invite your team from Studio Settings to start tracking attendance, workload, and performance." />
      ) : (
        <ResponsiveDataView columns={columns} rows={members} getRowId={(row) => row.id} onRowClick={(row) => setDetailId(row.id)} />
      )}

      <TeamDetailDialog studioUserId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} />
    </main>
  );
}

export default function TeamPage() {
  return (
    <TeamProvider>
      <TeamPageBody />
    </TeamProvider>
  );
}
