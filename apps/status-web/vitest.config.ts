import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true, // no component/unit tests exist yet for this app — build/typecheck/lint are its real coverage today; this keeps `pnpm test` from false-alarming on that absence
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
