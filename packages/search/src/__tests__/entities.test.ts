import { describe, expect, it } from "vitest";
import { SEARCHABLE_ENTITIES, getEntityDefinition, resolveSearchableEntities } from "../entities";

describe("SEARCHABLE_ENTITIES", () => {
  it("has all 13 entities named in the brief", () => {
    expect(SEARCHABLE_ENTITIES).toHaveLength(13);
  });

  it("finds an entity by key", () => {
    expect(getEntityDefinition("lead")?.label).toBe("Leads");
  });
});

describe("resolveSearchableEntities", () => {
  it("only includes entities the user's permissions grant", () => {
    expect(resolveSearchableEntities(["lead:view", "client:view"])).toEqual(["lead", "client"]);
  });

  it("returns nothing for a user with no relevant permissions", () => {
    expect(resolveSearchableEntities([])).toEqual([]);
  });
});
