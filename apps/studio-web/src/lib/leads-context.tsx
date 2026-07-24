"use client";

import * as React from "react";
import { apiGet, apiPost, apiPatch } from "./api-client";

export interface LeadRecord {
  id: string;
  name: string;
  brideName: string | null;
  groomName: string | null;
  phone: string | null;
  alternateMobile: string | null;
  email: string | null;
  instagramProfile1: string | null;
  instagramProfile2: string | null;
  eventType: string | null;
  eventDate: string | null;
  venue: string | null;
  city: string | null;
  source: string;
  budget: number | null;
  interestedPackage: string | null;
  notes: string | null;
  assignedTo: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  followUpAt: string | null;
  expectedValue: number | null;
  winProbability: number | null;
  lostReason: string | null;
  createdAt: string;
}

interface LeadsContextValue {
  leads: LeadRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
}

const LeadsContext = React.createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = React.useState<LeadRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const refetch = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<LeadRecord[]>("/leads");
    if (res.ok && res.data) {
      setLeads(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load leads");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const value: LeadsContextValue = {
    leads,
    loading,
    error,
    refetch,
    selectedIds,
    toggleSelected,
    clearSelection: () => setSelectedIds(new Set()),
  };

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const ctx = React.useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within a <LeadsProvider>");
  return ctx;
}

export function formatRupees(paise: number | null): string {
  if (paise === null) return "—";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export async function createLead(input: Record<string, unknown>) {
  return apiPost("/leads", input);
}
export async function updateLead(id: string, input: Record<string, unknown>) {
  return apiPatch(`/leads/${id}`, input);
}
export async function changeLeadStatus(id: string, status: string, lostReason?: string) {
  return apiPatch(`/leads/${id}/status`, { status, lostReason });
}
