import type { PartialBrandTheme, BrandTheme } from "./theme-schema";

export interface ThemeVersionRecord {
  version: number;
  snapshot: PartialBrandTheme;
  note?: string | null;
  createdAt: Date;
  createdBy?: string | null;
}

/** The next version number for a studio, given its existing version rows (empty history starts at 1). */
export function nextVersionNumber(existingVersions: { version: number }[]): number {
  if (existingVersions.length === 0) return 1;
  return Math.max(...existingVersions.map((v) => v.version)) + 1;
}

export interface ThemeFieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

/** Field-level diff between two theme snapshots — powers a "what changed in this version" view. */
export function diffThemes(before: PartialBrandTheme, after: PartialBrandTheme): ThemeFieldDiff[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: ThemeFieldDiff[] = [];

  for (const key of keys) {
    const beforeValue = (before as Record<string, unknown>)[key];
    const afterValue = (after as Record<string, unknown>)[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diffs.push({ field: key, before: beforeValue, after: afterValue });
    }
  }

  return diffs;
}

/**
 * Rolling back to a past version doesn't rewrite history — it applies that
 * version's snapshot as the *current* studio brand and lets the normal
 * "every update creates a new version" path record a fresh version on top
 * (see apps/api's branding.service.ts `rollbackToVersion`). This function
 * just answers "what would the new current state be" — the caller
 * persists it and creates the new version row.
 */
export function applyRollback(targetVersion: ThemeVersionRecord): PartialBrandTheme {
  return targetVersion.snapshot;
}

/** Builds the snapshot to persist as a new StudioBrandVersion row from the current full theme. */
export function buildSnapshot(currentTheme: BrandTheme): PartialBrandTheme {
  return { ...currentTheme };
}
