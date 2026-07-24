export interface ExistingSpreadVersion {
  spreadNumber: number;
  versionNumber: number;
}

/** "Spread upload" and "Versioning" are the same mechanism — every upload to a given `spreadNumber` gets the next version number for that spread specifically, independent of every other spread's own version count. */
export function resolveNextVersionNumber(existingVersions: ExistingSpreadVersion[], spreadNumber: number): number {
  const versionsForSpread = existingVersions.filter((v) => v.spreadNumber === spreadNumber).map((v) => v.versionNumber);
  return versionsForSpread.length > 0 ? Math.max(...versionsForSpread) + 1 : 1;
}
