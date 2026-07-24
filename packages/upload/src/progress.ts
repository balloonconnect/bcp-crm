export interface UploadProgressInput {
  totalChunks: number;
  uploadedChunks: number;
  fileSize: number;
  chunkSize: number;
}

export interface UploadProgress {
  percentComplete: number; // 0-100
  uploadedBytes: number;
  remainingBytes: number;
}

/** Progress is derived from chunk counts, not tracked as a separate running byte counter — the two would otherwise need to be kept in sync on every chunk completion, and chunk count is already the authoritative source of truth for "how much of this upload actually landed." */
export function computeUploadProgress(input: UploadProgressInput): UploadProgress {
  const percentComplete = input.totalChunks > 0 ? Math.round((input.uploadedChunks / input.totalChunks) * 100) : 0;
  const uploadedBytes = Math.min(input.fileSize, input.uploadedChunks * input.chunkSize);
  return { percentComplete, uploadedBytes, remainingBytes: input.fileSize - uploadedBytes };
}

export interface QueueSummary {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  activeFiles: number;
  overallPercent: number;
}

export interface SessionForQueueSummary {
  status: string;
  totalChunks: number;
  uploadedChunks: number;
}

/** The queue-level summary a progress bar or "3 of 12 uploaded" indicator reads from — aggregated the same chunk-based way a single file's progress is, just summed across every session in the batch. */
export function summarizeQueue(sessions: SessionForQueueSummary[]): QueueSummary {
  const totalFiles = sessions.length;
  const completedFiles = sessions.filter((s) => s.status === "completed").length;
  const failedFiles = sessions.filter((s) => s.status === "failed").length;
  const activeFiles = sessions.filter((s) => s.status === "uploading" || s.status === "processing").length;

  const totalChunks = sessions.reduce((sum, s) => sum + s.totalChunks, 0);
  const uploadedChunks = sessions.reduce((sum, s) => sum + s.uploadedChunks, 0);
  const overallPercent = totalChunks > 0 ? Math.round((uploadedChunks / totalChunks) * 100) : 0;

  return { totalFiles, completedFiles, failedFiles, activeFiles, overallPercent };
}
