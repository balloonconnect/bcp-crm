"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select, Textarea } from "@bcp/ui";
import { apiPost } from "../../lib/api-client";

const CLAUSE_OPTIONS = [
  { value: "event_details", label: "Event details" },
  { value: "payment_terms", label: "Payment terms" },
  { value: "cancellation_terms", label: "Cancellation terms" },
  { value: "delivery_terms", label: "Delivery terms" },
  { value: "copyright_terms", label: "Copyright terms" },
  { value: "model_release", label: "Model release" },
  { value: "privacy_consent", label: "Privacy consent" },
  { value: "custom", label: "Custom clause" },
];

interface Section { type: string; title: string; content: string }

export function TemplateBuilder({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sections, setSections] = React.useState<Section[]>([{ type: "event_details", title: "Event Details", content: "This agreement covers the event on {{eventDate}} at {{venue}}." }]);

  function addSection() {
    setSections((prev) => [...prev, { type: "custom", title: "", content: "" }]);
  }
  function updateSection(index: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!name.trim() || sections.length === 0) return;
    await apiPost("/contract-templates", { name, category: category || undefined, sections });
    setName(""); setCategory(""); setSections([{ type: "event_details", title: "Event Details", content: "" }]);
    onCreated();
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold">New template</h3>
      <div className="flex gap-2">
        <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Category (e.g. wedding)" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48" />
      </div>

      {sections.map((section, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md bg-accent p-2">
          <div className="flex gap-2">
            <Select value={section.type} onChange={(e) => updateSection(index, { type: e.target.value })} options={CLAUSE_OPTIONS} className="w-48" />
            <Input placeholder="Section title" value={section.title} onChange={(e) => updateSection(index, { title: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeSection(index)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
          <Textarea placeholder="Content — use {{variableName}} for placeholders" rows={2} value={section.content} onChange={(e) => updateSection(index, { content: e.target.value })} />
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addSection}><Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Add section</Button>
        <Button type="button" size="sm" onClick={() => void handleCreate()}>Save template</Button>
      </div>
    </div>
  );
}
