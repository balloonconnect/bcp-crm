"use client";

import * as React from "react";
import { Plus, Sparkles, ChevronDown, ChevronRight, Star } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";
import { WorkflowTemplateFormDialog } from "../../components/workflows/workflow-template-form-dialog";
import { TaskTemplateFormDialog } from "../../components/workflows/task-template-form-dialog";

interface TaskTemplateRecord {
  id: string;
  stageKey: string;
  name: string;
  priority: string;
  isApprovalStep: boolean;
  slaHours: number | null;
  defaultDueOffsetDays: number | null;
}
interface WorkflowTemplateRecord {
  id: string;
  name: string;
  eventType: string | null;
  isDefault: boolean;
  isActive: boolean;
  tasks: TaskTemplateRecord[];
}

export default function WorkflowsPage() {
  const [templates, setTemplates] = React.useState<WorkflowTemplateRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = React.useState(false);
  const [taskFormTemplateId, setTaskFormTemplateId] = React.useState<string | null>(null);
  const [seeding, setSeeding] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<WorkflowTemplateRecord[]>("/workflow-templates?includeInactive=true");
    if (res.ok && res.data) setTemplates(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleSeedDefault() {
    setSeeding(true);
    await apiPost("/workflow-templates/seed-default");
    await load();
    setSeeding(false);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Workflows</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={seeding} onClick={() => void handleSeedDefault()}>
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Seed default workflow
          </Button>
          <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New workflow
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading workflows…" />
      ) : templates.length === 0 ? (
        <EmptyState title="No workflows yet" description="Seed the 17-stage default workflow, or build a custom one from scratch." />
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template) => {
            const isOpen = expanded.has(template.id);
            return (
              <div key={template.id} className="rounded-lg border border-border">
                <button type="button" onClick={() => toggleExpanded(template.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                    <span className="font-medium">{template.name}</span>
                    {template.isDefault && <Badge variant="success"><Star className="mr-1 h-3 w-3" aria-hidden="true" />Default</Badge>}
                    {template.eventType && <Badge variant="outline">{template.eventType}</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{template.tasks.length} tasks</span>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-4">
                    <ul className="mb-3 flex flex-col divide-y divide-border">
                      {template.tasks.map((task) => (
                        <li key={task.id} className="flex items-center justify-between py-2 text-sm">
                          <span>{task.name}</span>
                          <div className="flex items-center gap-2">
                            {task.isApprovalStep && <Badge variant="outline">Approval</Badge>}
                            {task.slaHours && <Badge variant="outline">{task.slaHours}h SLA</Badge>}
                            <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                          </div>
                        </li>
                      ))}
                      {template.tasks.length === 0 && <p className="py-2 text-xs text-muted-foreground">No tasks in this workflow yet.</p>}
                    </ul>
                    <Button type="button" variant="outline" size="sm" onClick={() => setTaskFormTemplateId(template.id)}>
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Add task
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <WorkflowTemplateFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <TaskTemplateFormDialog workflowTemplateId={taskFormTemplateId} open={Boolean(taskFormTemplateId)} onOpenChange={(open) => !open && setTaskFormTemplateId(null)} onSaved={load} />
    </main>
  );
}
