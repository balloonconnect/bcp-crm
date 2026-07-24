"use client";

import * as React from "react";
import { Trash2, Undo2 } from "lucide-react";
import { Badge, Button, Input, Select } from "@bcp/ui";
import { apiGet, apiFetch, apiPost } from "../../../lib/api-client";

interface Document { id: string; name: string; documentType: string; expiresAt: string | null; createdAt: string }
interface EquipmentAssignment { id: string; equipment: { id: string; name: string }; assignedAt: string }
interface EquipmentOption { id: string; name: string }

const DOC_TYPE_OPTIONS = [{ value: "contract", label: "Contract" }, { value: "id_proof", label: "ID proof" }, { value: "certification", label: "Certification" }, { value: "other", label: "Other" }];

export function DocumentsEquipmentTab({ studioUserId }: { studioUserId: string }) {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [equipmentAssignments, setEquipmentAssignments] = React.useState<EquipmentAssignment[]>([]);
  const [equipmentOptions, setEquipmentOptions] = React.useState<EquipmentOption[]>([]);
  const [docName, setDocName] = React.useState("");
  const [docType, setDocType] = React.useState("other");
  const [selectedEquipmentId, setSelectedEquipmentId] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await apiGet<{ teamDocuments: Document[]; teamEquipment: EquipmentAssignment[] }>(`/team-members/${studioUserId}`);
    if (res.ok && res.data) {
      setDocuments(res.data.teamDocuments);
      setEquipmentAssignments(res.data.teamEquipment);
    }
  }, [studioUserId]);

  React.useEffect(() => {
    void load();
    void apiGet<EquipmentOption[]>("/equipment").then((res) => res.ok && setEquipmentOptions(res.data ?? []));
  }, [load]);

  async function handleAddDocument() {
    if (!docName.trim()) return;
    // File upload isn't wired to real storage in this UI pass — fileKey is a placeholder referencing the document name, consistent with how other document-adjacent features in this app note the same limitation.
    await apiPost(`/team-members/${studioUserId}/documents`, { name: docName, documentType: docType, fileKey: `placeholder/${docName}` });
    setDocName("");
    await load();
  }

  async function handleRemoveDocument(id: string) {
    await apiFetch(`/team-documents/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleAssignEquipment() {
    if (!selectedEquipmentId) return;
    await apiPost(`/team-members/${studioUserId}/equipment`, { equipmentId: selectedEquipmentId });
    setSelectedEquipmentId("");
    await load();
  }

  async function handleReturnEquipment(assignmentId: string) {
    await apiPost(`/team-equipment/${assignmentId}/return`);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Documents</h3>
        <ul className="mb-2 flex flex-col divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between py-2 text-sm">
              <span>{doc.name} <Badge variant="outline" className="ml-1 capitalize">{doc.documentType.replace(/_/g, " ")}</Badge>{doc.expiresAt && <span className="ml-2 text-xs text-muted-foreground">Expires {new Date(doc.expiresAt).toLocaleDateString("en-IN")}</span>}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleRemoveDocument(doc.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </li>
          ))}
          {documents.length === 0 && <p className="py-2 text-xs text-muted-foreground">No documents on file.</p>}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Document name" value={docName} onChange={(e) => setDocName(e.target.value)} />
          <Select value={docType} onChange={(e) => setDocType(e.target.value)} options={DOC_TYPE_OPTIONS} className="w-40" />
          <Button type="button" size="sm" onClick={() => void handleAddDocument()}>Add</Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Assigned equipment</h3>
        <ul className="mb-2 flex flex-col divide-y divide-border">
          {equipmentAssignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span>{a.equipment.name} <span className="text-xs text-muted-foreground">since {new Date(a.assignedAt).toLocaleDateString("en-IN")}</span></span>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleReturnEquipment(a.id)}><Undo2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Return</Button>
            </li>
          ))}
          {equipmentAssignments.length === 0 && <p className="py-2 text-xs text-muted-foreground">No equipment currently checked out.</p>}
        </ul>
        <div className="flex gap-2">
          <Select value={selectedEquipmentId} onChange={(e) => setSelectedEquipmentId(e.target.value)} options={[{ value: "", label: "Select equipment" }, ...equipmentOptions.map((e) => ({ value: e.id, label: e.name }))]} />
          <Button type="button" size="sm" disabled={!selectedEquipmentId} onClick={() => void handleAssignEquipment()}>Assign</Button>
        </div>
      </div>
    </div>
  );
}
