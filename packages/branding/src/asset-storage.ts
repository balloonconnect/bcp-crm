export type BrandAssetKind =
  | "logo"
  | "logo_light"
  | "logo_dark"
  | "favicon"
  | "login_background"
  | "email_header_image"
  | "watermark";

interface AssetConstraint {
  maxBytes: number;
  allowedMimeTypes: string[];
}

/**
 * Per-asset-kind limits. Favicons and logos stay small (they're rendered
 * at icon/header size); login backgrounds and email header images allow
 * more room since they're full-bleed imagery.
 */
const CONSTRAINTS: Record<BrandAssetKind, AssetConstraint> = {
  logo: { maxBytes: 2 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/svg+xml", "image/webp"] },
  logo_light: { maxBytes: 2 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/svg+xml", "image/webp"] },
  logo_dark: { maxBytes: 2 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/svg+xml", "image/webp"] },
  favicon: { maxBytes: 512 * 1024, allowedMimeTypes: ["image/png", "image/x-icon", "image/svg+xml"] },
  login_background: { maxBytes: 8 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] },
  email_header_image: { maxBytes: 2 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] },
  watermark: { maxBytes: 2 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/webp"] }, // PNG/WebP only — needs alpha transparency
};

export interface AssetValidationInput {
  kind: BrandAssetKind;
  mimeType: string;
  sizeBytes: number;
}

export type AssetValidationResult =
  | { ok: true }
  | { ok: false; reason: "file_too_large" | "unsupported_type" };

export function validateBrandAsset(input: AssetValidationInput): AssetValidationResult {
  const constraint = CONSTRAINTS[input.kind];
  if (!constraint.allowedMimeTypes.includes(input.mimeType)) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (input.sizeBytes > constraint.maxBytes) {
    return { ok: false, reason: "file_too_large" };
  }
  return { ok: true };
}

/**
 * Storage key convention: `branding/{studioId}/{kind}/{timestamp}.{ext}` —
 * timestamped rather than a fixed filename so replacing a logo doesn't
 * invalidate anything still referencing the old URL (e.g. a cached page,
 * an already-sent email) until the theme is next resolved and the new URL
 * takes over. Old objects are cleaned up by a periodic job, not deleted
 * synchronously on replace.
 */
export function brandAssetStorageKey(studioId: string, kind: BrandAssetKind, extension: string): string {
  const ts = Date.now();
  const cleanExt = extension.replace(/^\./, "");
  return `branding/${studioId}/${kind}/${ts}.${cleanExt}`;
}

export function extensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/x-icon": "ico",
  };
  return map[mimeType] ?? "bin";
}
