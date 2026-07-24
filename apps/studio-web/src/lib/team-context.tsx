"use client";

import * as React from "react";
import { apiGet } from "./api-client";

export interface TeamProfile {
  salaryAmount: number | null;
  freelancerRateAmount: number | null;
  freelancerRateUnit: string | null;
  paymentTerms: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
}

export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  employmentType: string | null;
  availabilityStatus: string;
  skills: string[];
  roles: { studioRole: { key: string; name: string } }[];
  teamProfile: TeamProfile | null;
}

export interface TeamMemberDetail extends TeamMemberSummary {
  teamDocuments: { id: string; name: string; documentType: string; expiresAt: string | null; createdAt: string }[];
  teamEquipment: { id: string; equipment: { id: string; name: string }; assignedAt: string }[];
  eventAssignments: { event: { id: string; title: string; scheduledAt: string; status: string } }[];
}

interface TeamContextValue {
  members: TeamMemberSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TeamContext = React.createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = React.useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<TeamMemberSummary[]>("/team-members");
    if (res.ok && res.data) {
      setMembers(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load the team");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return <TeamContext.Provider value={{ members, loading, error, refetch }}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const ctx = React.useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within a <TeamProvider>");
  return ctx;
}

export function formatRupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "—";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}
