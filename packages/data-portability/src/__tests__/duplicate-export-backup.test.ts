import { describe, expect, it } from "vitest";
import { resolveDuplicateAction } from "../duplicate-detection";
import { EXPORT_ENTITY_TYPES, getExportEntityDefinition } from "../export-registry";
import { canApprove, canProcess } from "../backup-approval";

describe("resolveDuplicateAction", () => {
  it("inserts when no existing record was found, regardless of strategy", () => {
    expect(resolveDuplicateAction(false, "skip")).toBe("insert");
  });

  it("skips a duplicate when the strategy is skip", () => {
    expect(resolveDuplicateAction(true, "skip")).toBe("skip");
  });

  it("updates a duplicate when the strategy is overwrite", () => {
    expect(resolveDuplicateAction(true, "overwrite")).toBe("update");
  });

  it("still inserts a new row for create_new even when a duplicate exists", () => {
    expect(resolveDuplicateAction(true, "create_new")).toBe("insert");
  });
});

describe("EXPORT_ENTITY_TYPES", () => {
  it("has all 10 export types named in the brief", () => {
    expect(EXPORT_ENTITY_TYPES).toHaveLength(10);
  });

  it("includes complete studio data", () => {
    expect(getExportEntityDefinition("complete_studio_data")?.label).toBe("Complete studio data");
  });
});

describe("canApprove / canProcess", () => {
  it("allows approval while requested or pending_approval", () => {
    expect(canApprove("requested")).toBe(true);
    expect(canApprove("pending_approval")).toBe(true);
    expect(canApprove("approved")).toBe(false);
  });

  it("only allows processing once approved", () => {
    expect(canProcess("approved")).toBe(true);
    expect(canProcess("requested")).toBe(false);
  });
});
