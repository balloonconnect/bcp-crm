"use client";

import * as React from "react";
import { Badge, Button, Input, Select, Textarea } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Template { id: string; name: string; category: string; language: string; bodyText: string; variableCount: number; status: string }

const CATEGORY_OPTIONS = [{ value: "utility", label: "Utility" }, { value: "marketing", label: "Marketing" }, { value: "authentication", label: "Authentication" }];
const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { pending: "warning", approved: "success", rejected: "destructive" };

export function TemplatesTab() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("utility");
  const [bodyText, setBodyText] = React.useState("");
  const [previewVars, setPreviewVars] = React.useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    const res = await apiGet<Template[]>("/whatsapp/templates");
    if (res.ok && res.data) setTemplates(res.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim() || !bodyText.trim()) return;
    await apiPost("/whatsapp/templates", { name, category, bodyText });
    setName(""); setBodyText("");
    await load();
  }

  async function handlePreview(template: Template) {
    const varsText = previewVars[template.id] ?? "";
    const variables = varsText.split(",").map((v) => v.trim());
    const res = await apiPost<{ preview: string }>(`/whatsapp/templates/${template.id}/preview`, { variables });
    if (res.ok && res.data) setPreviewResult((prev) => ({ ...prev, [template.id]: res.data!.preview }));
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {templates.map((t) => (
          <li key={t.id} className="rounded-md border border-border p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{t.name}</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="capitalize">{t.category}</Badge>
                <Badge variant={STATUS_VARIANT[t.status] ?? "outline"} className="capitalize">{t.status}</Badge>
              </div>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">{t.bodyText}</p>
            {t.variableCount > 0 && (
              <div className="flex gap-2">
                <Input
                  placeholder={`${t.variableCount} value(s), comma-separated`}
                  value={previewVars[t.id] ?? ""}
                  onChange={(e) => setPreviewVars((prev) => ({ ...prev, [t.id]: e.target.value }))}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => void handlePreview(t)}>Preview</Button>
              </div>
            )}
            {previewResult[t.id] && <p className="mt-2 rounded-md bg-accent p-2 text-sm">{previewResult[t.id]}</p>}
          </li>
        ))}
        {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates added yet.</p>}
      </ul>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold">Add a template</h3>
        <div className="flex gap-2">
          <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} className="w-40" />
        </div>
        <Textarea placeholder="Body text — use {{1}}, {{2}} for variables" rows={2} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        <Button type="button" size="sm" className="self-start" onClick={() => void handleCreate()}>Add template</Button>
      </div>
    </div>
  );
}
