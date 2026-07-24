"use client";

import * as React from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState } from "@bcp/ui";
import { SERVICE_CATEGORIES } from "@bcp/catalog";
import { apiGet, apiPost } from "../../lib/api-client";
import { ServiceFormDialog, type ServiceRecord } from "../../components/catalog/service-form-dialog";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function ServicesPage() {
  const [services, setServices] = React.useState<ServiceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceRecord | null>(null);
  const [seeding, setSeeding] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<ServiceRecord[]>("/services?includeInactive=true");
    if (res.ok && res.data) setServices(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleSeedDefaults() {
    setSeeding(true);
    await apiPost("/services/seed-defaults");
    await load();
    setSeeding(false);
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Services</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={seeding} onClick={() => void handleSeedDefaults()}>
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add standard services
          </Button>
          <Button type="button" size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New service
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading services…" />
      ) : services.length === 0 ? (
        <EmptyState title="No services yet" description="Add your own, or start from the 16 standard services most studios offer." />
      ) : (
        <div className="flex flex-col gap-8">
          {SERVICE_CATEGORIES.map((category) => {
            const items = services.filter((s) => s.category === category.key);
            if (items.length === 0) return null;
            return (
              <div key={category.key}>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{category.label}</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => { setEditing(service); setFormOpen(true); }}
                      className="flex flex-col gap-1 rounded-md border border-border p-3 text-left hover:bg-accent"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{service.name}</span>
                        {!service.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatRupees(service.internalPrice)} · {service.unit.replace(/_/g, " ")}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editing} onSaved={load} />
    </main>
  );
}
