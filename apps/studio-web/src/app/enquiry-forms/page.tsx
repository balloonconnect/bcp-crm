"use client";

import * as React from "react";
import { Plus, Share2, Pencil } from "lucide-react";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, LoadingState, EmptyState } from "@bcp/ui";
import { apiGet, apiPatch } from "../../lib/api-client";
import { EnquiryFormDialog, type EnquiryFormRecord } from "../../components/enquiry-forms/enquiry-form-dialog";
import { ShareFormDialog } from "../../components/enquiry-forms/share-form-dialog";

export default function EnquiryFormsPage() {
  const [forms, setForms] = React.useState<EnquiryFormRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingForm, setEditingForm] = React.useState<EnquiryFormRecord | null>(null);
  const [shareFormId, setShareFormId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<EnquiryFormRecord[]>("/enquiry-forms");
    if (res.ok && res.data) setForms(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(form: EnquiryFormRecord) {
    await apiPatch(`/enquiry-forms/${form.id}`, { isActive: !form.isActive });
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Enquiry forms</h1>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingForm(null);
            setFormDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New form
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading your forms…" />
      ) : forms.length === 0 ? (
        <EmptyState title="No enquiry forms yet" description="Create one to start capturing leads from your website, Instagram bio, or a QR code at your studio." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{form.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">/{form.slug}</p>
                </div>
                <Badge variant={form.isActive ? "success" : "outline"}>{form.isActive ? "Active" : "Inactive"}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShareFormId(form.id)}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Share
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingForm(form);
                      setFormDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void toggleActive(form)}>
                    {form.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EnquiryFormDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} form={editingForm} onSaved={load} />
      <ShareFormDialog formId={shareFormId} open={Boolean(shareFormId)} onOpenChange={(open) => !open && setShareFormId(null)} />
    </main>
  );
}
