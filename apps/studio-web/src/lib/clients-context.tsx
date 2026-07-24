"use client";

import * as React from "react";
import { apiGet } from "./api-client";

export interface ClientRecord {
  id: string;
  name: string;
  brideName: string | null;
  groomName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  instagramProfile1: string | null;
  instagramProfile2: string | null;
  facebookProfile: string | null;
  billingAddressLine1: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  shippingSameAsBilling: boolean;
  shippingAddressLine1: string | null;
  shippingCity: string | null;
  gstin: string | null;
  gstLegalName: string | null;
  anniversaryDate: string | null;
  brideBirthday: string | null;
  groomBirthday: string | null;
  tags: string[];
  referredById: string | null;
  referralNotes: string | null;
  source: string | null;
  portalAccessEnabled: boolean;
  createdAt: string;
}

interface ClientsContextValue {
  clients: ClientRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ClientsContext = React.createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = React.useState<ClientRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<ClientRecord[]>("/clients");
    if (res.ok && res.data) {
      setClients(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load clients");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return <ClientsContext.Provider value={{ clients, loading, error, refetch }}>{children}</ClientsContext.Provider>;
}

export function useClients(): ClientsContextValue {
  const ctx = React.useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used within a <ClientsProvider>");
  return ctx;
}

export function formatRupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "—";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}
