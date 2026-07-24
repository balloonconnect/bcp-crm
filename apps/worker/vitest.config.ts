import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true, // this app's actual logic is tested in @bcp/queue; these files are thin BullMQ/Redis wrappers needing live infra to test meaningfully
  },
});
