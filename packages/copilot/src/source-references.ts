export interface SourceReference {
  type: string; // e.g. "Event", "Invoice", "Client"
  id: string;
  label?: string;
}

/** "Source references" — deduplicated so a read answer that touched the same record through two tool calls doesn't cite it twice. */
export function dedupeSourceReferences(references: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  const result: SourceReference[] = [];
  for (const ref of references) {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }
  return result;
}
