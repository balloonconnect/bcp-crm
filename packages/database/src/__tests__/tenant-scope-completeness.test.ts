import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TENANT_SCOPED_MODELS } from "../tenant-scope";

/**
 * "Tenant-isolation tests" — the one test that actually protects the
 * allowlist itself. `TENANT_SCOPED_MODELS` is hand-maintained (see
 * tenant-scope.ts) precisely so a new model's tenant scoping is a
 * deliberate decision, not an accident — but a hand-maintained list
 * is only as good as remembering to update it every time a model with
 * its own `studioId` is added. This test parses the real schema and
 * fails loudly the moment those two ever drift apart, across every
 * model this platform has accumulated.
 */
describe("TENANT_SCOPED_MODELS completeness", () => {
  const schemaPath = join(__dirname, "../../prisma/schema.prisma");
  const schema = readFileSync(schemaPath, "utf-8");

  const modelPattern = /^model (\w+) \{([\s\S]*?)^\}/gm;
  const modelsWithOwnStudioId: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = modelPattern.exec(schema)) !== null) {
    const [, modelName, body] = match;
    // Only a model's *own* studioId field counts — not merely mentioning "Studio" in a relation name or comment.
    if (/^\s*studioId\s+String/m.test(body!)) {
      const camelCase = modelName!.charAt(0).toLowerCase() + modelName!.slice(1);
      modelsWithOwnStudioId.push(camelCase);
    }
  }

  it("finds at least the models already known to carry studioId", () => {
    // A sanity check on the parser itself — if this drops to near-zero, the regex broke, not the schema.
    expect(modelsWithOwnStudioId.length).toBeGreaterThan(100);
  });

  it("every schema model with its own studioId field is in TENANT_SCOPED_MODELS", () => {
    const missing = modelsWithOwnStudioId.filter((m) => !(TENANT_SCOPED_MODELS as readonly string[]).includes(m));
    expect(missing).toEqual([]);
  });

  it("has no entries for models that no longer exist in the schema", () => {
    const allModelNames = new Set<string>();
    const nameOnlyPattern = /^model (\w+) \{/gm;
    let nameMatch: RegExpExecArray | null;
    while ((nameMatch = nameOnlyPattern.exec(schema)) !== null) {
      const camelCase = nameMatch[1]!.charAt(0).toLowerCase() + nameMatch[1]!.slice(1);
      allModelNames.add(camelCase);
    }
    const stale = (TENANT_SCOPED_MODELS as readonly string[]).filter((m) => !allModelNames.has(m));
    expect(stale).toEqual([]);
  });
});
