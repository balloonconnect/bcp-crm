import { describe, expect, it } from "vitest";
import { canApproveFullAlbum, countUnapprovedSpreads } from "../approval";

describe("canApproveFullAlbum", () => {
  it("allows full approval once every spread is approved", () => {
    const spreads = [{ spreadNumber: 1, status: "approved" }, { spreadNumber: 2, status: "approved" }];
    expect(canApproveFullAlbum(spreads)).toBe(true);
  });

  it("blocks full approval while any spread is unapproved", () => {
    const spreads = [{ spreadNumber: 1, status: "approved" }, { spreadNumber: 2, status: "revision_requested" }];
    expect(canApproveFullAlbum(spreads)).toBe(false);
  });

  it("blocks full approval when there are no spreads at all", () => {
    expect(canApproveFullAlbum([])).toBe(false);
  });
});

describe("countUnapprovedSpreads", () => {
  it("counts spreads not yet approved", () => {
    const spreads = [{ spreadNumber: 1, status: "approved" }, { spreadNumber: 2, status: "draft" }, { spreadNumber: 3, status: "proof" }];
    expect(countUnapprovedSpreads(spreads)).toBe(2);
  });
});
