import { defineConfig } from "vitest/config";

/**
 * The Testcontainers-backed integration suite — a real Docker daemon
 * is required (spins up genuine Postgres containers per
 * `@bcp/test-utils`'s harness). Run explicitly via
 * `pnpm --filter @bcp/api test:integration`; never part of the
 * default `test` script, which needs to stay fast and Docker-free for
 * everyday development and any CI runner without container support.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/integration/**/*.test.ts"],
    testTimeout: 120_000, // container startup + migration deploy genuinely takes a while
    hookTimeout: 120_000,
  },
});
