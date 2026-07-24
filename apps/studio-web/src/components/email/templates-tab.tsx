"use client";

import * as React from "react";
import { Badge, Button, Input, Textarea } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Template { id: string; name: string; subject: string; bodyHtml: string; variables: string[] }

export function TemplatesTab() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [bodyHtml, setBodyHtml] = React.useState("");
  const [previewVars, setPreviewVars] = React.useState<Record<string, Record<string, string>>>({});
  const [previewResult, setPreviewResult] = React.useState<Record<string, { subject: string; bodyHtml: string }>>({});

  const load = React.useCallback(async () => {
    const res = await apiGet<Template[]>("/email/templates");
    if (res.ok && res.data) setTemplates(res.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) return;
    await apiPost("/email/templates", { name, subject, bodyHtml });
    setName(""); setSubject(""); setBodyHtml("");
    await load();
  }

  async function handlePreview(template: Template) {
    const vars = previewVars[template.id] ?? {};
    const res = await apiPost<{ subject: string; bodyHtml: string }>(`/email/templates/${template.id}/preview`, { variables: vars });
    if (res.ok && res.data) setPreviewResult((prev) => ({ ...prev, [template.id]: res.data! }));
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {templates.map((t) => (
          <li key={t.id} className="rounded-md border border-border p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t.subject}</span>
            </div>
            {t.variables.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {t.variables.map((v) => (
                  <div key={v} className="flex items-center gap-1">
                    <Badge variant="outline">{v}</Badge>
                    <Input
                      placeholder="value"
                      className="h-7 w-28 text-xs"
                      value={previewVars[t.id]?.[v] ?? ""}
                      onChange={(e) => setPreviewVars((prev) => ({ ...prev, [t.id]: { ...prev[t.id], [v]: e.target.value } }))}
                    />
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => void handlePreview(t)}>Preview</Button>
              </div>
            )}
            {previewResult[t.id] && (
              <div className="rounded-md bg-accent p-2 text-sm">
                <p className="font-medium">{previewResult[t.id]!.subject}</p>
                <div dangerouslySetInnerHTML={{ __html: previewResult[t.id]!.bodyHtml }} />
              </div>
            )}
          </li>
        ))}
        {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates added yet.</p>}
      </ul>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold">Add a template</h3>
        <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Subject — use {{variableName}}" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Body HTML — use {{variableName}} for variables" rows={3} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        <Button type="button" size="sm" className="self-start" onClick={() => void handleCreate()}>Add template</Button>
      </div>
    </div>
  );
}
