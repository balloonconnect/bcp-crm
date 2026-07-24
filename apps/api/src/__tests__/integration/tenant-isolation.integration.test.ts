/**
 * "Tenant isolation" and "Database" tests, run against a *real*
 * Postgres instance via Testcontainers (`@bcp/test-utils`) rather than
 * a mocked Prisma client — this is exactly the kind of test that
 * belongs in a real container: it verifies actual SQL behavior
 * (`createTenantClient`'s `$extends` middleware genuinely rejecting a
 * cross-tenant query at the database layer), not just that a pure
 * function returns the right boolean.
 *
 * Requires a Docker daemon. This sandbox has none — no container
 * runtime has been available anywhere in this project's build — so
 * this file is written correctly and is ready to run in any CI
 * environment or local machine with Docker (`docker compose up` /
 * a Docker-enabled runner), but has not been executed as part of this
 * build. Run it with:
 *
 *   pnpm --filter @bcp/api test:integration
 *
 * which is a separate script from the fast, always-run `test` script
 * specifically so CI can choose whether to spend the time spinning up
 * a real database.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { startTestDatabase, type TestDatabase } from "@bcp/test-utils";
import { PrismaClient } from "@bcp/database";
import { createTenantClient, CrossTenantAccessError } from "@bcp/database";

describe("tenant isolation (real Postgres)", () => {
  let db: TestDatabase;
  let rawClient: PrismaClient;
  let studioAId: string;
  let studioBId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    rawClient = new PrismaClient({ datasources: { db: { url: db.databaseUrl } } });

    const studioA = await rawClient.studio.create({ data: { name: "Studio A", slug: "studio-a" } });
    const studioB = await rawClient.studio.create({ data: { name: "Studio B", slug: "studio-b" } });
    studioAId = studioA.id;
    studioBId = studioB.id;
  }, 120_000);

  afterAll(async () => {
    await rawClient.$disconnect();
    await db.teardown();
  });

  it("a tenant-scoped client only ever reads its own studio's data, even when no filter is given", async () => {
    await rawClient.lead.create({ data: { studioId: studioAId, name: "Studio A Lead", phone: "+911111111111" } });
    await rawClient.lead.create({ data: { studioId: studioBId, name: "Studio B Lead", phone: "+922222222222" } });

    const scopedToA = createTenantClient(rawClient, studioAId);
    const leads = await scopedToA.lead.findMany({});

    expect(leads).toHaveLength(1);
    expect(leads[0]!.name).toBe("Studio A Lead");
  });

  it("throws CrossTenantAccessError when asked to read a specific record belonging to a different studio", async () => {
    const leadInB = await rawClient.lead.create({ data: { studioId: studioBId, name: "Another B Lead", phone: "+923333333333" } });

    const scopedToA = createTenantClient(rawClient, studioAId);
    await expect(scopedToA.lead.findFirst({ where: { id: leadInB.id, studioId: studioBId } })).rejects.toThrow(CrossTenantAccessError);
  });

  it("throws CrossTenantAccessError on a create attempting to write into a different studio", async () => {
    const scopedToA = createTenantClient(rawClient, studioAId);
    await expect(scopedToA.lead.create({ data: { studioId: studioBId, name: "Smuggled Lead", phone: "+924444444444" } })).rejects.toThrow(CrossTenantAccessError);
  });
});
