import { execSync } from "node:child_process";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

/**
 * "Use Testcontainers where appropriate" — this is that harness: a
 * real, ephemeral Postgres instance for tests that genuinely need
 * real relational behavior a mocked Prisma client can't faithfully
 * stand in for — tenant isolation at the SQL level, unique
 * constraints, cascade deletes, transaction rollback. Everything
 * *else* (pure business logic, request validation, permission
 * checks) is unit-tested with plain Vitest and no container at all,
 * since spinning up Postgres for a test that doesn't touch the
 * database would just be slow ceremony.
 *
 * Requires a Docker daemon — this sandbox has none (no container
 * runtime has been available anywhere in this project's build), so
 * these tests are written correctly and are ready to run in any CI
 * environment or local machine with Docker, but were not executed as
 * part of this build. Every test file using this harness says so in
 * its own header rather than silently assuming it ran.
 */
export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  databaseUrl: string;
  teardown: () => Promise<void>;
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").withDatabase("bcp_test").withUsername("test").withPassword("test").start();

  const databaseUrl = container.getConnectionUri();

  // Applies every migration this platform has accumulated, the same way a real
  // deployment would — not a hand-rolled schema shortcut that could drift from
  // what's actually shipped.
  execSync("pnpm --filter @bcp/database exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  return {
    container,
    databaseUrl,
    teardown: async () => {
      await container.stop();
    },
  };
}
