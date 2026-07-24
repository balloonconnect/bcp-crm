import { prisma } from "@bcp/database";
import {
  resolveTheme,
  brandThemeSchema,
  partialBrandThemeSchema,
  validateThemeContrast,
  InMemoryThemeCache,
  themeCacheKey,
  DEFAULT_THEME_CACHE_TTL_SECONDS,
  nextVersionNumber,
  buildSnapshot,
  applyRollback,
  validateBrandAsset,
  brandAssetStorageKey,
  extensionForMimeType,
  type BrandTheme,
  type PartialBrandTheme,
  type ResolvedTheme,
  type BrandAssetKind,
} from "@bcp/branding";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";

// Process-local cache — see @bcp/branding/cache.ts for the interface this
// implements and how to swap in a Redis-backed one for multi-instance
// deployments without touching any calling code below.
const themeCache = new InMemoryThemeCache();

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    bucket: env.S3_BUCKET,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  return storageClient;
}

function toPartialTheme(brand: Record<string, unknown> | null): PartialBrandTheme {
  if (!brand) return {};
  // Prisma returns `null` for unset nullable columns; the theme schema
  // treats "unset" as `undefined` so resolution's merge logic (which
  // checks `!== undefined`) correctly falls through to the next layer
  // instead of overwriting with `null`.
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(brand)) {
    if (value !== null && value !== undefined) cleaned[key] = value;
  }
  return partialBrandThemeSchema.parse(cleaned);
}

/** Resolves the effective theme for a studio (+ optional branch), cached. */
export async function getResolvedTheme(studioId: string, branchId?: string | null): Promise<ResolvedTheme> {
  const cacheKey = themeCacheKey(studioId, branchId);
  const cached = await themeCache.get(cacheKey);
  if (cached) return cached;

  const [studioBrand, branchBrand] = await Promise.all([
    prisma.studioBrand.findUnique({ where: { studioId } }),
    branchId ? prisma.branchBrand.findUnique({ where: { branchId } }) : Promise.resolve(null),
  ]);

  const resolved = resolveTheme({
    studioOverride: toPartialTheme(studioBrand),
    branchOverride: branchBrand ? partialBrandThemeSchema.parse(branchBrand.overrides) : undefined,
  });

  await themeCache.set(cacheKey, resolved, DEFAULT_THEME_CACHE_TTL_SECONDS);
  return resolved;
}

export interface UpdateBrandResult {
  theme: BrandTheme;
  version: number;
  contrastWarnings: ReturnType<typeof validateThemeContrast>["failures"];
}

/**
 * Updates a studio's brand: validates the merged theme, records a
 * before/after version snapshot (theme history), invalidates the cache,
 * and returns any contrast warnings (non-blocking — see
 * @bcp/branding/contrast.ts's docstring on why these don't hard-fail).
 */
export async function updateStudioBrand(
  studioId: string,
  updates: PartialBrandTheme,
  actorId: string,
  note?: string,
): Promise<UpdateBrandResult> {
  const existing = await prisma.studioBrand.upsert({
    where: { studioId },
    update: {},
    create: { studioId },
  });

  const currentPartial = toPartialTheme(existing);
  const merged = brandThemeSchema.parse({ ...currentPartial, ...updates });
  const contrastResult = validateThemeContrast(merged);

  const existingVersions = await prisma.studioBrandVersion.findMany({
    where: { studioId },
    select: { version: true },
  });
  const version = nextVersionNumber(existingVersions);

  await prisma.$transaction([
    prisma.studioBrand.update({
      where: { studioId },
      data: { ...updates, updatedBy: actorId } as never,
    }),
    prisma.studioBrandVersion.create({
      data: { studioId, version, snapshot: buildSnapshot(merged) as never, note, createdBy: actorId },
    }),
  ]);

  await themeCache.invalidatePrefix(`studio:${studioId}`);

  return { theme: merged, version, contrastWarnings: contrastResult.failures };
}

export async function listBrandVersions(studioId: string) {
  return prisma.studioBrandVersion.findMany({
    where: { studioId },
    orderBy: { version: "desc" },
  });
}

export class VersionNotFoundError extends Error {
  readonly code = "VERSION_NOT_FOUND";
  constructor() {
    super("Theme version not found");
    this.name = "VersionNotFoundError";
  }
}

/** Rolls back to a past version — applies its snapshot as current and records a *new* version on top (history is append-only). */
export async function rollbackToVersion(studioId: string, targetVersion: number, actorId: string): Promise<UpdateBrandResult> {
  const record = await prisma.studioBrandVersion.findUnique({
    where: { studioId_version: { studioId, version: targetVersion } },
  });
  if (!record) throw new VersionNotFoundError();

  const snapshot = applyRollback({
    version: record.version,
    snapshot: record.snapshot as PartialBrandTheme,
    createdAt: record.createdAt,
  });

  return updateStudioBrand(studioId, snapshot, actorId, `Rolled back to version ${targetVersion}`);
}

/** Sets/replaces a branch's theme override delta. */
export async function updateBranchBrand(
  studioId: string,
  branchId: string,
  overrides: PartialBrandTheme,
  actorId: string,
): Promise<void> {
  const merged = partialBrandThemeSchema.parse(overrides);

  await prisma.branchBrand.upsert({
    where: { branchId },
    update: { overrides: merged as never, updatedBy: actorId },
    create: { studioId, branchId, overrides: merged as never, updatedBy: actorId },
  });

  await themeCache.invalidate(themeCacheKey(studioId, branchId));
}

export class AssetValidationFailedError extends Error {
  readonly code = "ASSET_VALIDATION_FAILED";
  constructor(public readonly reason: string) {
    super(`Asset validation failed: ${reason}`);
    this.name = "AssetValidationFailedError";
  }
}

/** Uploads a brand asset (logo, favicon, watermark, …) and returns its public URL — does not itself update StudioBrand. */
export async function uploadBrandAsset(input: {
  studioId: string;
  kind: BrandAssetKind;
  mimeType: string;
  sizeBytes: number;
  body: Buffer;
}): Promise<{ url: string }> {
  const validation = validateBrandAsset({ kind: input.kind, mimeType: input.mimeType, sizeBytes: input.sizeBytes });
  if (!validation.ok) throw new AssetValidationFailedError(validation.reason);

  const key = brandAssetStorageKey(input.studioId, input.kind, extensionForMimeType(input.mimeType));
  await getStorageClient().put(key, input.body, input.mimeType);

  const env = getEnv();
  // MinIO/S3 path-style URL — apps/api can swap this for a CDN URL builder
  // without changing the upload flow above.
  const url = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
  return { url };
}
