import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { InMemoryThemeCache, themeCacheKey } from "../cache";
import { resolveTheme } from "../resolve-theme";

describe("themeCacheKey", () => {
  it("keys by studio alone when no branch is given", () => {
    expect(themeCacheKey("studio-1")).toBe("studio:studio-1");
  });

  it("keys by studio and branch when a branch is given", () => {
    expect(themeCacheKey("studio-1", "branch-1")).toBe("studio:studio-1:branch:branch-1");
  });
});

describe("InMemoryThemeCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns null for a miss", async () => {
    const cache = new InMemoryThemeCache();
    expect(await cache.get("missing")).toBeNull();
  });

  it("returns a cached value before it expires", async () => {
    const cache = new InMemoryThemeCache();
    const resolved = resolveTheme({});
    await cache.set("k1", resolved, 60);
    expect(await cache.get("k1")).toEqual(resolved);
  });

  it("expires entries after the TTL", async () => {
    const cache = new InMemoryThemeCache();
    const resolved = resolveTheme({});
    await cache.set("k1", resolved, 10);
    vi.advanceTimersByTime(11_000);
    expect(await cache.get("k1")).toBeNull();
  });

  it("invalidate removes a single key", async () => {
    const cache = new InMemoryThemeCache();
    await cache.set("k1", resolveTheme({}), 60);
    await cache.invalidate("k1");
    expect(await cache.get("k1")).toBeNull();
  });

  it("invalidatePrefix removes every matching key", async () => {
    const cache = new InMemoryThemeCache();
    await cache.set("studio:s1", resolveTheme({}), 60);
    await cache.set("studio:s1:branch:b1", resolveTheme({}), 60);
    await cache.set("studio:s2", resolveTheme({}), 60);
    await cache.invalidatePrefix("studio:s1");
    expect(await cache.get("studio:s1")).toBeNull();
    expect(await cache.get("studio:s1:branch:b1")).toBeNull();
    expect(await cache.get("studio:s2")).not.toBeNull();
  });
});
