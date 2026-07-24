import type { ResolvedTheme } from "./resolve-theme";

/**
 * Resolving a theme means reading a StudioBrand row and possibly a
 * BranchBrand row on every request — cheap, but every request. This cache
 * sits in front of that resolution so a hot studio's theme isn't
 * re-fetched from Postgres on every page load.
 *
 * The interface is intentionally minimal so apps/api can swap this
 * in-memory implementation for a Redis-backed one (using the `ioredis`
 * client already available via @bcp/config's REDIS_URL) without touching
 * any calling code — see docs/branding.md § "Theme caching" for the
 * production wiring.
 */
export interface ThemeCache {
  get(key: string): Promise<ResolvedTheme | null>;
  set(key: string, value: ResolvedTheme, ttlSeconds: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  /** Invalidate every cache entry for a studio (e.g. all its branch-scoped keys) when the studio theme itself changes. */
  invalidatePrefix(prefix: string): Promise<void>;
}

/** `studio:<id>` for the studio-wide theme, `studio:<id>:branch:<id>` for a branch-scoped resolution. */
export function themeCacheKey(studioId: string, branchId?: string | null): string {
  return branchId ? `studio:${studioId}:branch:${branchId}` : `studio:${studioId}`;
}

interface CacheEntry {
  value: ResolvedTheme;
  expiresAt: number;
}

/** Default implementation — fine for a single API instance or local dev; swap for Redis once running multiple instances. */
export class InMemoryThemeCache implements ThemeCache {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<ResolvedTheme | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: ResolvedTheme, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async invalidate(key: string): Promise<void> {
    this.store.delete(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Test/debug helper — not part of the ThemeCache interface. */
  size(): number {
    return this.store.size;
  }
}

export const DEFAULT_THEME_CACHE_TTL_SECONDS = 300; // 5 minutes
