import { describe, expect, it } from "vitest";
import { TEAM_TYPE_TO_ROLE_KEY, FUNCTIONAL_TEAM_TYPES, EMPLOYMENT_TYPES } from "../team-types";

describe("TEAM_TYPE_TO_ROLE_KEY", () => {
  it("maps all 6 functional types named in the brief", () => {
    expect(FUNCTIONAL_TEAM_TYPES.sort()).toEqual(["Accountant", "Designer", "Editor", "Photographer", "Salesperson", "Videographer"].sort());
  });

  it("maps Designer to the existing album_designer role", () => {
    expect(TEAM_TYPE_TO_ROLE_KEY.Designer).toBe("album_designer");
  });

  it("maps Salesperson to the existing sales role", () => {
    expect(TEAM_TYPE_TO_ROLE_KEY.Salesperson).toBe("sales");
  });
});

describe("EMPLOYMENT_TYPES", () => {
  it("has exactly employee and freelancer", () => {
    expect(EMPLOYMENT_TYPES).toEqual(["employee", "freelancer"]);
  });
});
