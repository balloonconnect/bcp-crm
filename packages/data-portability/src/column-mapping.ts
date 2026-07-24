/** Applies a studio's chosen `{ csvHeader: entityField }` mapping to one raw CSV record, producing a record keyed by entity field names — the shape validation and the actual import write both expect. Unmapped entity fields are simply absent, not blank strings, so "required but missing" and "required but empty" stay distinguishable downstream. */
export function applyColumnMapping(rawRecord: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [csvHeader, entityField] of Object.entries(mapping)) {
    if (rawRecord[csvHeader] !== undefined) mapped[entityField] = rawRecord[csvHeader];
  }
  return mapped;
}

/** A first-pass automatic mapping suggestion — matches a CSV header to an entity field when they're equal case-insensitively (ignoring spaces/underscores), so a studio only has to manually map the columns that don't already line up. */
export function suggestColumnMapping(csvHeaders: string[], entityFields: { key: string; label: string }[]): Record<string, string> {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
  const mapping: Record<string, string> = {};

  for (const header of csvHeaders) {
    const match = entityFields.find((f) => normalize(f.key) === normalize(header) || normalize(f.label) === normalize(header));
    if (match) mapping[header] = match.key;
  }
  return mapping;
}
