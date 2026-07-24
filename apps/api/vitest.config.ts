import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Testcontainers-based integration tests (src/__tests__/integration/**) need a real
    // Docker-backed Postgres and run under a separate config/script — see vitest.integration.config.ts
    // and the "test:integration" script — so the everyday fast unit-test run never depends on Docker.
    exclude: ["**/node_modules/**", "src/__tests__/integration/**"],
  },
});
