import { describe, expect, it } from "vitest";
import { buildRecentSearchList } from "../recent-searches";
import { searchQuerySchema, saveSearchSchema } from "../validation";

describe("buildRecentSearchList", () => {
  it("adds a new query to the front", () => {
    expect(buildRecentSearchList(["old"], "new")).toEqual(["new", "old"]);
  });

  it("deduplicates a repeated query, moving it to the front", () => {
    expect(buildRecentSearchList(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  it("caps the list at 10 entries", () => {
    const existing = Array.from({ length: 10 }, (_, i) => `query-${i}`);
    expect(buildRecentSearchList(existing, "new-query")).toHaveLength(10);
  });
});

describe("searchQuerySchema", () => {
  it("accepts a plain query", () => {
    expect(searchQuerySchema.safeParse({ query: "Sharma" }).success).toBe(true);
  });

  it("rejects an empty query", () => {
    expect(searchQuerySchema.safeParse({ query: "" }).success).toBe(false);
  });
});

describe("saveSearchSchema", () => {
  it("accepts a named saved search scoped to entity types", () => {
    expect(saveSearchSchema.safeParse({ name: "Overdue clients", query: "overdue", entityTypes: ["invoice", "client"] }).success).toBe(true);
  });
});
