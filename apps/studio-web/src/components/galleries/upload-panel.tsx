"use client";

import * as React from "react";
import { UploadCloud, Pause, Play, RotateCcw, X, Camera, FolderUp, AlertCircle } from "lucide-react";
import { Button } from "@bcp/ui";
import { useUploadQueue, type QueueItem } from "../../lib/use-upload-queue";

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  pending: "Queued", uploading: "Uploading", paused: "Paused", processing: "Processing…", completed: "Done", failed: "Failed", needs_file: "Reselect to resume",
};

export function UploadPanel({ galleryId, onPhotoAdded }: { galleryId: string; onPhotoAdded: () => void }) {
  const { items, wifiOnly, setWifiOnly, addFiles, pause, resume, retry, remove, reattachFile } = useUploadQueue(galleryId);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const reattachInputRef = React.useRef<HTMLInputElement>(null);
  const [reattachTarget, setReattachTarget] = React.useState<string | null>(null);

  const prevCompletedCount = React.useRef(0);
  React.useEffect(() => {
    const completedCount = items.filter((i) => i.status === "completed").length;
    if (completedCount > prevCompletedCount.current) onPhotoAdded();
    prevCompletedCount.current = completedCount;
  }, [items, onPhotoAdded]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (files.length) void addFiles(files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? [...e.target.files].filter((f) => f.type.startsWith("image/")) : [];
    if (files.length) void addFiles(files);
    e.target.value = "";
  }

  function handleReattach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && reattachTarget) void reattachFile(reattachTarget, file);
    setReattachTarget(null);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragging ? "border-brand bg-brand/5" : "border-border"}`}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Drag and drop photos here, or</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Choose files</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}><FolderUp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Choose folder</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}><Camera className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Camera</Button>
        </div>
        <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={wifiOnly} onChange={(e) => setWifiOnly(e.target.checked)} />
          Upload on Wi-Fi only
        </label>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
      {/* @ts-expect-error -- webkitdirectory isn't in the DOM lib typings but is broadly supported for folder selection */}
      <input ref={folderInputRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleFileSelect} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input ref={reattachInputRef} type="file" accept="image/*" className="hidden" onChange={handleReattach} />

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li key={item.sessionId} className="flex items-center gap-3 p-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{item.fileName}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-brand transition-all" style={{ width: `${item.totalChunks > 0 ? Math.round((item.uploadedChunks / item.totalChunks) * 100) : 0}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {STATUS_LABEL[item.status]}
                  {item.failureReason && <span className="ml-1 flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" aria-hidden="true" />{item.failureReason}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {item.status === "uploading" && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => pause(item.sessionId)}><Pause className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                )}
                {item.status === "paused" && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void resume(item.sessionId)}><Play className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                )}
                {item.status === "failed" && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void retry(item.sessionId)}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                )}
                {item.status === "needs_file" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReattachTarget(item.sessionId);
                      reattachInputRef.current?.click();
                    }}
                  >
                    Reselect
                  </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void remove(item.sessionId)}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
