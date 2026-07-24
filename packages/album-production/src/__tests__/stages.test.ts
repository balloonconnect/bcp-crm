import { describe, expect, it } from "vitest";
import { ALBUM_PRODUCTION_STAGES, canTransition, getAllowedNextStages } from "../stages";

describe("ALBUM_PRODUCTION_STAGES", () => {
  it("has exactly the 11 stages named in the brief, in order", () => {
    expect(ALBUM_PRODUCTION_STAGES).toEqual([
      "photos_selected", "designer_assigned", "design_started", "proof_uploaded", "client_review",
      "revision_requested", "approved", "sent_to_print", "printed", "dispatched", "delivered",
    ]);
  });
});

describe("canTransition", () => {
  it("allows the standard forward progression", () => {
    expect(canTransition("photos_selected", "designer_assigned")).toBe(true);
    expect(canTransition("client_review", "approved")).toBe(true);
  });

  it("allows revision_requested to loop back to design_started", () => {
    expect(canTransition("revision_requested", "design_started")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransition("photos_selected", "approved")).toBe(false);
  });

  it("rejects moving backward outside the revision loop", () => {
    expect(canTransition("printed", "design_started")).toBe(false);
  });

  it("delivered has no further transitions", () => {
    expect(getAllowedNextStages("delivered")).toEqual([]);
  });
});
